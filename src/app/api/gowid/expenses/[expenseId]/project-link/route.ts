import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { isGuardFailure, requireActiveStaff } from '@/lib/auth-guard';
import { isAuditV2Enabled } from '@/lib/feature-flags';
import {
  canCreateFinance,
  canEditFinance,
  canMoveFinanceBu,
  canTransitionFinance,
  canViewProject,
  type BuCode,
  type FinancialEntry,
  type Project,
} from '@/lib/permissions';
import type { FinancialStatus } from '@/types/database';
import { getAuthContext, requireAuth, canAccessCorporateCard, unauthorizedResponse, forbiddenResponse } from '../../../_lib/gowid-client';

/**
 * 법인카드 사용 내역 ↔ 프로젝트 연결 (spec R16, 결정: `paid` 매출·지출은 지우지 않는다).
 *
 * - 연결(새 지출 행 + 연결표 행): 법인카드 권한 + `canCreateFinance`(리더는 자기 사업부 행만, R10)
 * - 같은 프로젝트 재연결: 기존 지출 행 내용 갱신(`canEditFinance`)
 * - 이동: 지출 행을 지우지 않고 `project_id`·`bu_code`만 새 프로젝트 기준으로 바꾸고, 연결표의 `project_id`도 바꾼다.
 * - 해제: 지출 행은 `canceled`로 바꾸고, 연결표 행만 삭제한다(연결표는 돈 기록이 아니다).
 * - 해제 후 재연결: 새 지출 행 + 새 연결표 행. 취소된 옛 행은 그대로 남는다.
 * - 이동·해제 권한: R12의 `paid`→`canceled` 권한자(등록자·행 사업부 리더·관리자) = `canTransitionFinance`
 *   - 이동은 추가로 옮길 프로젝트를 볼 수 있어야 하고(`canViewProject`), 사업부가 바뀌면 R13(`canMoveFinanceBu`:
 *     관리자·원래 사업부 리더)도 통과해야 한다. 같은 사업부 이동은 R16 + 보기 권한만 본다.
 * - 지출 행 없이 남은 연결표 행의 해제는 법인카드 권한만 본다(연결표는 돈 기록이 아니다, 기존 동작 유지).
 * - `updated_by`는 `ERP_AUDIT_V2` 스위치가 켜졌을 때만 쓴다(R32).
 * - 이 라우트는 `financial_entries`에 delete를 부르지 않는다(DB 봉인이 `paid`·`canceled` 삭제를 거부한다).
 *
 * 응답 모양: GET `{ data }`, POST `{ data: 연결표 행 }`, DELETE `{ success: true }` — 기존과 같다.
 * 추가된 응답: 권한 부족 403 `{ error: 'Forbidden' }`, 재직 아님 403, DB 오류 500.
 */

type RouteParams = { params: Promise<{ expenseId: string }> };

const PROJECT_COLUMNS = 'id, name, bu_code, pm_id, participants, created_by';
const ENTRY_COLUMNS = 'id, project_id, bu_code, created_by, kind, status';

type ProjectRow = {
  id: number;
  name: string | null;
  bu_code: BuCode;
  pm_id: string | null;
  participants: unknown;
  created_by: string | null;
};

type EntryRow = {
  id: number;
  project_id: number | null;
  bu_code: BuCode;
  created_by: string | null;
  kind: 'revenue' | 'expense';
  status: FinancialStatus | null;
};

/** participants(JSONB)는 id 문자열 배열이거나 `{ user_id }` 객체 배열이다. */
function participantIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => (typeof p === 'string' ? p : (p as { user_id?: unknown } | null)?.user_id))
    .filter((id): id is string => typeof id === 'string');
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    bu_code: row.bu_code,
    pm_id: row.pm_id,
    participants: participantIds(row.participants),
    created_by: row.created_by,
  };
}

function toEntry(row: EntryRow): FinancialEntry {
  return {
    id: row.id,
    project_id: row.project_id,
    bu_code: row.bu_code,
    created_by: row.created_by,
    kind: row.kind,
    status: row.status ?? undefined,
  };
}

/** 이동·해제 권한: 지금 상태 → `canceled` 전이 권한(R12, R16). */
function canMoveOrUnlink(appUser: Parameters<typeof canTransitionFinance>[0], entry: EntryRow): boolean {
  const from: FinancialStatus = entry.status ?? 'paid';
  return canTransitionFinance(appUser, toEntry(entry), from, 'canceled');
}

/** 공통 가드: 재직 직원(R1) → 법인카드 권한. 실패면 응답을 돌려준다. */
async function guard() {
  const staff = await requireActiveStaff();
  if (isGuardFailure(staff)) return { failure: staff } as const;
  const ctx = requireAuth(await getAuthContext());
  if (!canAccessCorporateCard(ctx)) return { failure: forbiddenResponse() } as const;
  return { appUser: staff.appUser, ctx } as const;
}

function auditFields(userId: string): { updated_by?: string } {
  return isAuditV2Enabled() ? { updated_by: userId } : {};
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const g = await guard();
    if ('failure' in g) return g.failure;

    const { expenseId } = await params;
    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('gowid_expense_project_link')
      .select('*')
      .eq('gowid_expense_id', Number(expenseId))
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ data: null });
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, name, bu_code')
      .eq('id', data.project_id)
      .single();

    const { data: linker } = await supabase
      .from('app_users')
      .select('name')
      .eq('id', data.linked_by)
      .single();

    return NextResponse.json({
      data: {
        ...data,
        project_name: project?.name ?? null,
        project_bu: project?.bu_code ?? null,
        linked_by_name: linker?.name ?? null,
      },
    });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Project link GET error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const g = await guard();
    if ('failure' in g) return g.failure;
    const { appUser } = g;
    const userId = appUser.id;

    const { expenseId } = await params;
    const gowidExpenseId = Number(expenseId);
    const body = await request.json();
    const {
      project_id,
      expense_amount,
      expense_store_name,
      expense_date,
      card_alias,
    } = body as {
      project_id: number;
      expense_amount: number;
      expense_store_name: string;
      expense_date: string;
      card_alias?: string;
    };

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const supabase = await createPureClient();

    const { data: projectRow } = await supabase
      .from('projects')
      .select(PROJECT_COLUMNS)
      .eq('id', project_id)
      .maybeSingle();

    if (!projectRow) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const project = projectRow as unknown as ProjectRow;

    const { data: existingLink, error: linkLookupError } = await supabase
      .from('gowid_expense_project_link')
      .select('id, financial_entry_id, project_id')
      .eq('gowid_expense_id', gowidExpenseId)
      .maybeSingle();
    if (linkLookupError) throw linkLookupError;

    let existingEntry: EntryRow | null = null;
    if (existingLink?.financial_entry_id) {
      const { data: entryRow, error: entryError } = await supabase
        .from('financial_entries')
        .select(ENTRY_COLUMNS)
        .eq('id', existingLink.financial_entry_id)
        .maybeSingle();
      if (entryError) throw entryError;
      existingEntry = (entryRow as unknown as EntryRow | null) ?? null;
    }

    const financialEntryName = `[법인카드] ${expense_store_name || '카드결제'}`;
    const financialDate = expense_date
      ? `${expense_date.slice(0, 4)}-${expense_date.slice(4, 6)}-${expense_date.slice(6, 8)}`
      : new Date().toISOString().slice(0, 10);
    const financialMemo = card_alias
      ? `Gowid 법인카드 자동연동 (${card_alias})`
      : 'Gowid 법인카드 자동연동';

    const linkFields = {
      linked_by: userId,
      expense_amount: expense_amount || null,
      expense_store_name: expense_store_name || null,
      expense_date: financialDate,
    };

    if (existingLink && existingEntry) {
      const now = new Date().toISOString();

      if (existingEntry.project_id === project_id) {
        // 같은 프로젝트 재연결: 내용만 갱신
        if (!canEditFinance(appUser, toEntry(existingEntry))) return forbiddenResponse();
        const { error: updateError } = await supabase
          .from('financial_entries')
          .update({
            name: financialEntryName,
            amount: expense_amount || 0,
            occurred_at: financialDate,
            memo: financialMemo,
            updated_at: now,
            ...auditFields(userId),
          })
          .eq('id', existingEntry.id);
        if (updateError) throw updateError;
      } else {
        // 이동: 지출 행을 지우지 않고 프로젝트·사업부만 바꾼다
        // R16(→canceled 권한) + 옮길 프로젝트를 볼 수 있어야 함 + 사업부가 바뀌면 R13(관리자·원래 사업부 리더)
        if (!canMoveOrUnlink(appUser, existingEntry)) return forbiddenResponse();
        if (!canViewProject(appUser, toProject(project))) return forbiddenResponse();
        if (
          project.bu_code !== existingEntry.bu_code &&
          !canMoveFinanceBu(appUser, toEntry(existingEntry), project.bu_code)
        ) {
          return forbiddenResponse();
        }
        const { error: moveError } = await supabase
          .from('financial_entries')
          .update({
            project_id,
            bu_code: project.bu_code,
            updated_at: now,
            ...auditFields(userId),
          })
          .eq('id', existingEntry.id);
        if (moveError) throw moveError;
      }

      const { data: linkData, error: linkError } = await supabase
        .from('gowid_expense_project_link')
        .update({ project_id, financial_entry_id: existingEntry.id, ...linkFields })
        .eq('gowid_expense_id', gowidExpenseId)
        .select()
        .single();
      if (linkError) throw linkError;

      return NextResponse.json({ data: linkData });
    }

    // 새 연결(최초 연결, 해제 후 재연결, 지출 행이 사라진 옛 연결표 행)
    if (!canCreateFinance(appUser, toProject(project))) return forbiddenResponse();

    const { data: newEntry, error: insertError } = await supabase
      .from('financial_entries')
      .insert({
        project_id,
        bu_code: project.bu_code,
        kind: 'expense',
        category: '법인카드',
        name: financialEntryName,
        amount: expense_amount || 0,
        occurred_at: financialDate,
        status: 'paid',
        memo: financialMemo,
        created_by: userId,
        ...auditFields(userId),
      })
      .select('id')
      .single();
    if (insertError) throw insertError;

    const { data: linkData, error: linkError } = await supabase
      .from('gowid_expense_project_link')
      .upsert(
        {
          gowid_expense_id: gowidExpenseId,
          project_id,
          financial_entry_id: newEntry?.id ?? null,
          ...linkFields,
        },
        { onConflict: 'gowid_expense_id' }
      )
      .select()
      .single();

    if (linkError) throw linkError;

    return NextResponse.json({ data: linkData });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Project link POST error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const g = await guard();
    if ('failure' in g) return g.failure;
    const { appUser } = g;

    const { expenseId } = await params;
    const gowidExpenseId = Number(expenseId);
    const supabase = await createPureClient();

    const { data: existingLink, error: linkLookupError } = await supabase
      .from('gowid_expense_project_link')
      .select('id, financial_entry_id')
      .eq('gowid_expense_id', gowidExpenseId)
      .maybeSingle();
    if (linkLookupError) throw linkLookupError;

    if (existingLink?.financial_entry_id) {
      const { data: entryRow, error: entryError } = await supabase
        .from('financial_entries')
        .select(ENTRY_COLUMNS)
        .eq('id', existingLink.financial_entry_id)
        .maybeSingle();
      if (entryError) throw entryError;
      const entry = entryRow as unknown as EntryRow | null;

      if (entry) {
        if (!canMoveOrUnlink(appUser, entry)) return forbiddenResponse();
        if (entry.status !== 'canceled') {
          // 해제: 지우지 않고 취소 처리
          const { error: cancelError } = await supabase
            .from('financial_entries')
            .update({
              status: 'canceled',
              updated_at: new Date().toISOString(),
              ...auditFields(appUser.id),
            })
            .eq('id', entry.id);
          if (cancelError) throw cancelError;
        }
      }
    }

    // 연결표 행만 삭제한다(돈 기록이 아니다)
    const { error } = await supabase
      .from('gowid_expense_project_link')
      .delete()
      .eq('gowid_expense_id', gowidExpenseId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Project link DELETE error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
