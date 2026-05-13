import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import type { AppUser } from '@/lib/permissions';

async function getCurrentUser(): Promise<AppUser | null> {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return null;

  const supabase = await createPureClient();
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, role, bu_code, name, position')
    .eq('id', user.id)
    .single();

  return appUser as AppUser | null;
}

/** financial_entries에서 매출/지출 합계를 집계 (paid + planned 모두 포함) */
async function aggregateActualFinance(projectId: number): Promise<{
  actual_revenue: number;
  actual_expense: number;
}> {
  const supabase = await createPureClient();
  const { data, error } = await supabase
    .from('financial_entries')
    .select('kind, amount, status')
    .eq('project_id', projectId)
    .neq('status', 'canceled');

  if (error) throw error;

  let actual_revenue = 0;
  let actual_expense = 0;
  for (const entry of (data ?? []) as { kind: string; amount: number | null }[]) {
    const amount = Number(entry.amount ?? 0);
    if (entry.kind === 'revenue') actual_revenue += amount;
    else if (entry.kind === 'expense') actual_expense += amount;
  }
  return { actual_revenue, actual_expense };
}

/** GET: 프로젝트의 P&L 보고서 조회. 보고서가 없으면 null 반환하되, 자동 집계된 매출/지출은 함께 제공 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    const [{ data: report, error: reportError }, aggregated] = await Promise.all([
      supabase
        .from('project_pnl_reports_with_profit')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle(),
      aggregateActualFinance(projectId),
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
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PnlReportPayload;

    // 프로젝트의 bu_code를 가져와 보고서에 함께 저장
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, bu_code')
      .eq('id', projectId)
      .single();
    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

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
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
