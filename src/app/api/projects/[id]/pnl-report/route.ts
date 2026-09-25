import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { isGuardFailure, requireActiveStaff } from '@/lib/auth-guard';
import { canEditProject, canViewProject, type AppUser, type Project } from '@/lib/permissions';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import {
  isEntryVisible,
  loadPermProject,
  seesAllFinance,
  type ServiceDb,
} from '@/app/api/financial-entries/_lib/finance-access';

type Aggregated = {
  /** 외부 거래(entry_scope='external') 매출 합 — 회사 손익 */
  actual_revenue: number;
  /** 외부 거래 지출 합 */
  actual_expense: number;
  /** 내부배부(entry_scope='internal_allocation') 매출 합 — 외부 손익과 따로 보여 준다(R26) */
  internal_revenue: number;
  /** 내부배부 지출 합 */
  internal_expense: number;
};

/**
 * 프로젝트 매출·지출 합계 (paid + planned, canceled 제외).
 * - 보기 범위(R9): 이 함수는 프로젝트를 볼 수 있는 사용자에게만 불린다. 그 경우 프로젝트의 모든 행이 보인다.
 *   (일반 직원 판정은 `isEntryVisible`로 한 번 더 거른다.)
 * - 외부 손익과 내부배부 합계를 나눈다(R26).
 * - 1,000행 절단 없이 `range`로 끝까지 읽는다.
 */
async function aggregateActualFinance(
  supabase: ServiceDb,
  user: AppUser,
  projectId: number
): Promise<Aggregated> {
  const rows = await fetchAllRows<Record<string, unknown>>((from, to) =>
    supabase
      .from('financial_entries')
      .select('id, project_id, bu_code, created_by, kind, amount, status, entry_scope')
      .eq('project_id', projectId)
      .neq('status', 'canceled')
      .order('id', { ascending: true })
      .range(from, to)
  );

  const visibleProjectIds = seesAllFinance(user) ? null : new Set([String(projectId)]);

  const result: Aggregated = { actual_revenue: 0, actual_expense: 0, internal_revenue: 0, internal_expense: 0 };
  for (const row of rows) {
    if (!isEntryVisible(user, row, visibleProjectIds)) continue;
    const amount = Number(row.amount ?? 0);
    if (row.entry_scope === 'internal_allocation') {
      if (row.kind === 'revenue') result.internal_revenue += amount;
      else if (row.kind === 'expense') result.internal_expense += amount;
    } else if (row.kind === 'revenue') {
      result.actual_revenue += amount;
    } else if (row.kind === 'expense') {
      result.actual_expense += amount;
    }
  }
  return result;
}

/** 볼 수 있는 프로젝트를 읽는다. 없거나 못 보면 null(404, 존재를 숨긴다). */
async function loadViewableProject(supabase: ServiceDb, user: AppUser, projectId: number): Promise<Project | null> {
  const project = await loadPermProject(supabase, projectId);
  if (!project || !canViewProject(user, project)) return null;
  return project;
}

/** GET: 프로젝트의 P&L 보고서 조회. 보고서가 없으면 null 반환하되, 자동 집계된 매출/지출은 함께 제공 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    const project = await loadViewableProject(supabase, appUser, projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const [{ data: report, error: reportError }, aggregated] = await Promise.all([
      supabase
        .from('project_pnl_reports_with_profit')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle(),
      aggregateActualFinance(supabase, appUser, projectId),
    ]);

    if (reportError) throw reportError;

    return NextResponse.json({
      data: report,
      aggregated,
    });
  } catch (error: any) {
    console.error('Failed to get pnl report:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 },
    );
  }
}

interface PnlReportPayload {
  target_revenue?: number;
  target_expense?: number;
  actual_revenue?: number;
  actual_expense?: number;
  highlights?: string | null;
  improvements?: string | null;
  additional_notes?: string | null;
  status?: 'draft' | 'finalized';
}

/** PUT: 프로젝트의 P&L 보고서를 upsert (project_id UNIQUE 활용) */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser: currentUser } = guard;

  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    // 프로젝트의 bu_code를 가져와 보고서에 함께 저장. 못 보면 404, 수정 권한 없으면 403(R10).
    const project = await loadViewableProject(supabase, currentUser, projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (!canEditProject(currentUser, project)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as PnlReportPayload;

    const isFinalize = body.status === 'finalized';

    const upsertPayload = {
      project_id: projectId,
      bu_code: project.bu_code,
      target_revenue: body.target_revenue ?? 0,
      target_expense: body.target_expense ?? 0,
      actual_revenue: body.actual_revenue ?? 0,
      actual_expense: body.actual_expense ?? 0,
      highlights: body.highlights ?? null,
      improvements: body.improvements ?? null,
      additional_notes: body.additional_notes ?? null,
      status: body.status ?? 'draft',
      finalized_at: isFinalize ? new Date().toISOString() : null,
      author_id: currentUser.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('project_pnl_reports')
      .upsert(upsertPayload, { onConflict: 'project_id' })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Failed to upsert pnl report:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 },
    );
  }
}

/** DELETE: 프로젝트의 P&L 보고서 삭제 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser: currentUser } = guard;

  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    const project = await loadViewableProject(supabase, currentUser, projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (!canEditProject(currentUser, project)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('project_pnl_reports')
      .delete()
      .eq('project_id', projectId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete pnl report:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 },
    );
  }
}
