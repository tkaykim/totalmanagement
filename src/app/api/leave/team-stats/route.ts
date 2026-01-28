import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 권한 체크
    const { data: currentUser } = await supabase
      .from('app_users')
      .select('role, bu_code')
      .eq('id', user.id)
      .single();

    if (!currentUser || !['admin', 'leader'].includes(currentUser.role)) {
      return NextResponse.json({ error: '조회 권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const buCode = searchParams.get('bu_code');
    const year = searchParams.get('year') 
      ? parseInt(searchParams.get('year')!) 
      : new Date().getFullYear();

    // 사용자 목록 조회
    let usersQuery = supabase
      .from('app_users')
      .select('id, name, bu_code, position, hire_date')
      .neq('role', 'artist');

    if (currentUser.role === 'leader') {
      usersQuery = usersQuery.eq('bu_code', currentUser.bu_code);
    } else if (buCode) {
      usersQuery = usersQuery.eq('bu_code', buCode);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      console.error('Users fetch error:', usersError);
      return NextResponse.json({ error: '사용자 목록 조회에 실패했습니다.' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json([]);
    }

    const userIds = users.map(u => u.id);

    const [balancesRes, grantsRes, requestsRes] = await Promise.all([
      supabase.from('leave_balances').select('*').in('user_id', userIds).eq('year', year),
      supabase.from('leave_grants').select('user_id, leave_type, grant_type, days, reason').in('user_id', userIds).eq('year', year),
      supabase
        .from('leave_requests')
        .select('requester_id, leave_type, days_used, status, start_date')
        .in('requester_id', userIds)
        .eq('status', 'approved')
        .gte('start_date', `${year}-01-01`)
        .lte('start_date', `${year}-12-31`),
    ]);

    const allBalances = balancesRes.data ?? [];
    const allGrants = grantsRes.data ?? [];
    const allRequests = requestsRes.data ?? [];

    const balanceMap = new Map<string, typeof allBalances>();
    for (const b of allBalances) {
      const list = balanceMap.get(b.user_id) ?? [];
      list.push(b);
      balanceMap.set(b.user_id, list);
    }

    const grantMap = new Map<string, { regular: number; reward: number; other: number }>();
    for (const g of allGrants) {
      const days = Number(g.days);
      let cur = grantMap.get(g.user_id);
      if (!cur) {
        cur = { regular: 0, reward: 0, other: 0 };
        grantMap.set(g.user_id, cur);
      }
      if (g.grant_type === 'auto_yearly' || g.grant_type === 'auto_monthly') {
        cur.regular += days;
      } else if (g.grant_type === 'manual' && g.reason && String(g.reason).includes('포상')) {
        cur.reward += days;
      } else {
        cur.other += days;
      }
    }

    const usageMap = new Map<string, { annual: number; monthly: number; compensatory: number; special: number }>();
    for (const r of allRequests) {
      const days = Number(r.days_used);
      let cur = usageMap.get(r.requester_id);
      if (!cur) {
        cur = { annual: 0, monthly: 0, compensatory: 0, special: 0 };
        usageMap.set(r.requester_id, cur);
      }
      if (r.leave_type === 'annual' || r.leave_type === 'half_am' || r.leave_type === 'half_pm') {
        cur.annual += days;
      } else if (r.leave_type === 'compensatory') {
        cur.compensatory += days;
      } else if (r.leave_type === 'special') {
        cur.special += days;
      }
    }

    const stats = users.map(u => {
      const balances = balanceMap.get(u.id) ?? [];
      const annual = balances.find(b => b.leave_type === 'annual');
      const compensatory = balances.find(b => b.leave_type === 'compensatory');
      const special = balances.find(b => b.leave_type === 'special');
      const grants = grantMap.get(u.id) ?? { regular: 0, reward: 0, other: 0 };
      const usage = usageMap.get(u.id) ?? { annual: 0, monthly: 0, compensatory: 0, special: 0 };

      const annualTotal = annual ? Number(annual.total_days) : 0;
      const annualUsed = annual ? Number(annual.used_days) : 0;
      const compTotal = compensatory ? Number(compensatory.total_days) : 0;
      const compUsed = compensatory ? Number(compensatory.used_days) : 0;
      const specialTotal = special ? Number(special.total_days) : 0;
      const specialUsed = special ? Number(special.used_days) : 0;

      const totalGenerated = annualTotal + compTotal + specialTotal;
      const totalRemaining = (annualTotal - annualUsed) + (compTotal - compUsed) + (specialTotal - specialUsed);

      return {
        user_id: u.id,
        user_name: u.name,
        bu_code: u.bu_code,
        position: u.position,
        hire_date: u.hire_date,
        annual_total: annualTotal,
        annual_used: annualUsed,
        annual_remaining: annualTotal - annualUsed,
        compensatory_total: compTotal,
        compensatory_used: compUsed,
        compensatory_remaining: compTotal - compUsed,
        special_total: specialTotal,
        special_used: specialUsed,
        special_remaining: specialTotal - specialUsed,
        total_generated: totalGenerated,
        total_remaining: totalRemaining,
        grant_regular: grants.regular,
        grant_reward: grants.reward,
        grant_other: grants.other,
        usage_annual: usage.annual,
        usage_monthly: usage.monthly,
        usage_compensatory: usage.compensatory,
        usage_special: usage.special,
      };
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Team leave stats error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
