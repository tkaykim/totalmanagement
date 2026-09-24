import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { isGuardFailure, requireActiveStaff } from '@/lib/auth-guard';
import { isAuditV2Enabled } from '@/lib/feature-flags';
import {
  canCreateFinance,
  canDeleteFinance,
  canEditFinance,
  canMoveFinanceBu,
  canTransitionFinance,
  isValidDateString,
  validateFinanceDates,
  validateFinanceScope,
  type BuCode,
} from '@/lib/permissions';
import type { FinancialStatus } from '@/types/database';
import {
  isBuCode,
  isFinancialKind,
  isFinancialStatusValue,
  loadPermProject,
  loadVisibleEntry,
  normalizePaidAtInput,
  pickFinanceColumns,
} from '../_lib/finance-access';

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

const NOT_FOUND = '매출·지출 항목을 찾을 수 없습니다.';

/**
 * PATCH: 매출·지출 수정 (R4·R11~R14)
 * - 볼 수 없는 행 → 404(존재를 숨긴다), 권한 없음 → 403, 입력 오류 → 400.
 * - 허용 칸만 반영한다. `created_by`·`id`·`created_at`·`updated_by` 등은 무시.
 * - 상태 전이는 R12, 사업부 이동은 R13, 기한·입금일은 R14(`paid`·`canceled` 행은 기한 없이 저장 가능).
 * - `updated_by`는 `ERP_AUDIT_V2`가 켜졌을 때만 쓴다(R32).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const { id } = await params;
    const supabase = await createPureClient();
    const loaded = await loadVisibleEntry(supabase, appUser, id);
    if (!loaded) return bad(404, NOT_FOUND);
    const { row: existing, entry } = loaded;

    if (!canEditFinance(appUser, entry)) return bad(403, 'Forbidden');

    const body = await request.json().catch(() => null);
    const input = pickFinanceColumns(body);

    // 상태 전이 (R12)
    const fromStatus = entry.status as FinancialStatus;
    const nextStatus = input.status === undefined ? fromStatus : input.status;
    if (!isFinancialStatusValue(nextStatus)) return bad(400, '상태(status) 값이 올바르지 않습니다.');
    if (nextStatus !== fromStatus && !canTransitionFinance(appUser, entry, fromStatus, nextStatus)) {
      return bad(403, 'Forbidden');
    }

    // 사업부 이동 (R13)
    const nextBu = (input.bu_code === undefined ? entry.bu_code : input.bu_code) as BuCode;
    if (!isBuCode(nextBu)) return bad(400, '사업부(bu_code) 값이 올바르지 않습니다.');
    if (nextBu !== entry.bu_code && !canMoveFinanceBu(appUser, entry, nextBu)) {
      return bad(403, 'Forbidden');
    }

    // 프로젝트 변경: 새 프로젝트에 이 행을 등록할 수 있어야 한다(R11)
    const projectChanged =
      input.project_id !== undefined && String(input.project_id ?? '') !== String(existing.project_id ?? '');
    if (projectChanged) {
      const nextProject = await loadPermProject(supabase, input.project_id);
      if (!nextProject) return bad(400, '프로젝트를 찾을 수 없습니다.');
      if (!canCreateFinance(appUser, nextProject, nextBu)) return bad(403, 'Forbidden');
    }

    if (input.kind !== undefined && !isFinancialKind(input.kind)) {
      return bad(400, '구분(kind)은 revenue 또는 expense여야 합니다.');
    }
    if (input.occurred_at !== undefined && !isValidDateString(input.occurred_at)) {
      return bad(400, '발생일(occurred_at)은 YYYY-MM-DD 형식이어야 합니다.');
    }
    let amount: number | undefined;
    if (input.amount !== undefined) {
      amount = Number(input.amount);
      if (input.amount === null || input.amount === '' || !Number.isFinite(amount)) {
        return bad(400, '금액(amount)이 올바르지 않습니다.');
      }
    }

    // 거래 범위 (R13)
    const scopeTouched =
      input.entry_scope !== undefined || input.counterparty_bu_code !== undefined || input.bu_code !== undefined;
    const nextScope = (input.entry_scope ?? existing.entry_scope ?? 'external') as 'external' | 'internal_allocation';
    const nextCounterparty =
      nextScope === 'internal_allocation'
        ? ((input.counterparty_bu_code !== undefined ? input.counterparty_bu_code : existing.counterparty_bu_code) as
            | BuCode
            | null) ?? null
        : null;
    if (scopeTouched) {
      const scopeError = validateFinanceScope({
        entry_scope: nextScope,
        bu_code: nextBu,
        counterparty_bu_code: nextCounterparty,
      });
      if (scopeError) return bad(400, scopeError);
    }

    // 기한·입금일 (R14)
    const dates = validateFinanceDates(
      {
        status: nextStatus,
        due_date: input.due_date as string | null | undefined,
        paid_at: normalizePaidAtInput(input.paid_at) as string | null | undefined,
      },
      {
        status: fromStatus,
        due_date: (existing.due_date as string | null) ?? null,
        paid_at: (existing.paid_at as string | null) ?? null,
      }
    );
    if (!dates.ok) return bad(400, (dates as { error: string }).error);

    const update: Record<string, unknown> = {};
    for (const key of ['project_id', 'kind', 'category', 'name', 'occurred_at', 'memo', 'partner_id', 'payment_method', 'actual_amount'] as const) {
      if (input[key] !== undefined) update[key] = input[key];
    }
    if (amount !== undefined) update.amount = amount;
    if (input.status !== undefined) update.status = nextStatus;
    if (input.bu_code !== undefined) update.bu_code = nextBu;
    if (scopeTouched) {
      update.entry_scope = nextScope;
      update.counterparty_bu_code = nextCounterparty;
    }
    if (dates.due_date !== undefined) update.due_date = dates.due_date;
    if (dates.paid_at !== undefined) update.paid_at = dates.paid_at;
    update.updated_at = new Date().toISOString();
    if (isAuditV2Enabled()) update.updated_by = appUser.id;

    const { data, error } = await supabase.from('financial_entries').update(update).eq('id', id).select().single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE: `planned` 행만, 수정 권한자만 (R11).
 * `paid`·`canceled` 행은 누구든 409 `{ error }`(DB 트리거도 거부한다).
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const { id } = await params;
    const supabase = await createPureClient();
    const loaded = await loadVisibleEntry(supabase, appUser, id);
    if (!loaded) return bad(404, NOT_FOUND);
    const { entry } = loaded;

    if (entry.status !== 'planned') {
      return bad(409, '완료(paid)·취소(canceled)된 매출·지출은 삭제할 수 없습니다. 잘못 확정한 건은 취소로 바꾸세요.');
    }
    if (!canDeleteFinance(appUser, entry)) return bad(403, 'Forbidden');

    const { error } = await supabase.from('financial_entries').delete().eq('id', id).eq('status', 'planned');
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
