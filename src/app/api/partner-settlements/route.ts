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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const partnerId = searchParams.get('partnerId');

    let query = supabase
      .from('partner_settlements')
      .select(`
        *,
        partner:partners!partner_id(id, display_name),
        partner_settlement_projects(
          *,
          project:projects!project_id(id, name)
        )
      `)
      .order('created_at', { ascending: false });

    if (partnerId) {
      query = query.eq('partner_id', partnerId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Failed to get settlements:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'superadmin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { partner_id, period_start, period_end, project_ids, memo } = body;

    if (!partner_id || !period_start || !period_end || !project_ids?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 프로젝트별 재무 데이터 조회
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, share_rate')
      .in('id', project_ids)
      .eq('share_partner_id', partner_id);

    if (!projects || projects.length === 0) {
      return NextResponse.json(
        { error: 'No valid projects found' },
        { status: 400 }
      );
    }

    // 재무 데이터 조회
    const { data: finances } = await supabase
      .from('financial_entries')
      .select('project_id, kind, amount')
      .in('project_id', project_ids)
      .neq('status', 'canceled');

    // 프로젝트별 재무 계산
    const financeMap: Record<string, { revenue: number; expense: number }> = {};
    (finances || []).forEach((f: any) => {
      if (!financeMap[f.project_id]) {
        financeMap[f.project_id] = { revenue: 0, expense: 0 };
      }
      if (f.kind === 'revenue') {
        financeMap[f.project_id].revenue += f.amount;
      } else if (f.kind === 'expense') {
        financeMap[f.project_id].expense += f.amount;
      }
    });

    // 프로젝트별 정산 데이터 계산
    const projectSettlements = projects.map((p: any) => {
      const revenue = financeMap[p.id]?.revenue || 0;
      const expense = financeMap[p.id]?.expense || 0;
      const netProfit = revenue - expense;
      const shareRate = p.share_rate || 0;
      const partnerAmount = Math.round(netProfit * (shareRate / 100));
      const companyAmount = netProfit - partnerAmount;

      return {
        project_id: p.id,
        project_name: p.name,
        revenue,
        expense,
        net_profit: netProfit,
        share_rate: shareRate,
        partner_amount: partnerAmount,
        company_amount: companyAmount,
      };
    });

    // 총합 계산
    const totals = projectSettlements.reduce(
      (acc, p) => ({
        revenue: acc.revenue + p.revenue,
        expense: acc.expense + p.expense,
        netProfit: acc.netProfit + p.net_profit,
        partnerAmount: acc.partnerAmount + p.partner_amount,
        companyAmount: acc.companyAmount + p.company_amount,
      }),
      { revenue: 0, expense: 0, netProfit: 0, partnerAmount: 0, companyAmount: 0 }
    );

    // 정산서 생성
    const { data: settlement, error: settlementError } = await supabase
      .from('partner_settlements')
      .insert({
        partner_id,
        period_start,
        period_end,
        status: 'draft',
        total_revenue: totals.revenue,
        total_expense: totals.expense,
        net_profit: totals.netProfit,
        partner_amount: totals.partnerAmount,
        company_amount: totals.companyAmount,
        memo,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (settlementError) throw settlementError;

    // 정산 프로젝트 생성
    const projectInserts = projectSettlements.map((p) => ({
      settlement_id: settlement.id,
      project_id: p.project_id,
      revenue: p.revenue,
      expense: p.expense,
      net_profit: p.net_profit,
      share_rate: p.share_rate,
      partner_amount: p.partner_amount,
      company_amount: p.company_amount,
    }));

    const { error: projectsError } = await supabase
      .from('partner_settlement_projects')
      .insert(projectInserts);

    if (projectsError) throw projectsError;

    // 생성된 정산서 조회 (연관 데이터 포함)
    const { data: fullSettlement } = await supabase
      .from('partner_settlements')
      .select(`
        *,
        partner:partners!partner_id(id, display_name),
        partner_settlement_projects(
          *,
          project:projects!project_id(id, name)
        )
      `)
      .eq('id', settlement.id)
      .single();

    return NextResponse.json({ data: fullSettlement });
  } catch (error: any) {
    console.error('Failed to create settlement:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
