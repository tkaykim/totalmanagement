import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { createActivityLog } from '@/lib/activity-logger';
import { isGuardFailure, requireActiveStaff } from '@/lib/auth-guard';
import { isAuditV2Enabled } from '@/lib/feature-flags';
import {
  canCreateFinance,
  canViewProject,
  isValidDateString,
  validateFinanceDates,
  validateFinanceScope,
  type BuCode,
} from '@/lib/permissions';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import {
  isBuCode,
  isEntryVisible,
  isFinancialKind,
  isFinancialStatusValue,
  loadPermProject,
  loadVisibleProjectIds,
  normalizePaidAtInput,
  pickFinanceColumns,
  seesAllFinance,
} from './_lib/finance-access';

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * GET: 매출·지출 목록 (R9)
 * - 관리자·모든 리더: 전체
 * - 일반 직원: 볼 수 있는 프로젝트에 붙은 모든 행 + 본인 등록 행
 * - 1,000행 절단 없이 `range`로 끝까지 읽는다.
 * 응답: 행 배열(기존과 같다).
 */
export async function GET(request: NextRequest) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu');
    const projectId = searchParams.get('project_id');
    const kind = searchParams.get('kind');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const rows = await fetchAllRows<Record<string, unknown>>((from, to) => {
      let query = supabase
        .from('financial_entries')
        .select('*')
        .order('occurred_at', { ascending: false })
        .order('id', { ascending: false });
      if (bu) query = query.eq('bu_code', bu);
      if (projectId) query = query.eq('project_id', projectId);
      if (kind) query = query.eq('kind', kind);
      if (startDate && endDate) query = query.gte('occurred_at', startDate).lte('occurred_at', endDate);
      return query.range(from, to);
    });

    if (seesAllFinance(appUser)) {
      return NextResponse.json(rows);
    }

    const visibleProjectIds = await loadVisibleProjectIds(supabase, appUser);
    return NextResponse.json(rows.filter((row) => isEntryVisible(appUser, row, visibleProjectIds)));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST: 매출·지출 등록 (R4·R11·R13·R14)
 * - 허용 칸만 받는다. `created_by`는 로그인 사용자.
 * - 볼 수 없는 프로젝트 → 404, 권한 없음 → 403, 입력 오류 → 400.
 * - `updated_by`는 `ERP_AUDIT_V2`가 켜졌을 때만 쓴다(R32).
 */
export async function POST(request: NextRequest) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const body = await request.json().catch(() => null);
    const input = pickFinanceColumns(body);
    const supabase = await createPureClient();

    if (input.project_id === undefined || input.project_id === null || input.project_id === '') {
      return bad(400, '프로젝트(project_id)가 필요합니다.');
    }
    const project = await loadPermProject(supabase, input.project_id);
    if (!project || !canViewProject(appUser, project)) {
      return bad(404, '프로젝트를 찾을 수 없습니다.');
    }

    const buCode = (input.bu_code ?? project.bu_code) as BuCode;
    if (!isBuCode(buCode)) return bad(400, '사업부(bu_code) 값이 올바르지 않습니다.');
    if (!isFinancialKind(input.kind)) return bad(400, '구분(kind)은 revenue 또는 expense여야 합니다.');
    const status = input.status ?? 'planned';
    if (!isFinancialStatusValue(status)) return bad(400, '상태(status) 값이 올바르지 않습니다.');
    if (typeof input.name !== 'string' || !input.name.trim()) return bad(400, '항목명(name)이 필요합니다.');
    if (!isValidDateString(input.occurred_at)) return bad(400, '발생일(occurred_at)은 YYYY-MM-DD 형식으로 필요합니다.');
    const amount = Number(input.amount);
    if (input.amount === null || input.amount === undefined || input.amount === '' || !Number.isFinite(amount)) {
      return bad(400, '금액(amount)이 올바르지 않습니다.');
    }

    if (!canCreateFinance(appUser, project, buCode)) {
      return bad(403, 'Forbidden');
    }

    const entryScope = (input.entry_scope ?? 'external') as 'external' | 'internal_allocation';
    const counterparty = entryScope === 'internal_allocation' ? ((input.counterparty_bu_code as BuCode | null) ?? null) : null;
    const scopeError = validateFinanceScope({ entry_scope: entryScope, bu_code: buCode, counterparty_bu_code: counterparty });
    if (scopeError) return bad(400, scopeError);

    const dates = validateFinanceDates({
      status,
      due_date: input.due_date as string | null | undefined,
      paid_at: normalizePaidAtInput(input.paid_at) as string | null | undefined,
    });
    if (!dates.ok) return bad(400, (dates as { error: string }).error);

    const insertRow: Record<string, unknown> = {
      project_id: input.project_id,
      bu_code: buCode,
      entry_scope: entryScope,
      counterparty_bu_code: counterparty,
      kind: input.kind,
      category: input.category,
      name: input.name,
      amount,
      occurred_at: input.occurred_at,
      due_date: dates.due_date ?? null,
      paid_at: dates.paid_at ?? null,
      status,
      memo: input.memo ?? null,
      partner_id: input.partner_id || null,
      payment_method: input.payment_method || null,
      actual_amount: input.actual_amount ?? null,
      created_by: appUser.id,
    };
    if (isAuditV2Enabled()) insertRow.updated_by = appUser.id;

    const { data, error } = await supabase.from('financial_entries').insert(insertRow).select().single();
    if (error) throw error;

    await createActivityLog({
      userId: appUser.id,
      actionType: 'financial_created',
      entityType: 'financial_entry',
      entityId: String(data.id),
      entityTitle: data.name,
      metadata: {
        kind: input.kind,
        category: input.category,
        amount,
        project_id: input.project_id,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
