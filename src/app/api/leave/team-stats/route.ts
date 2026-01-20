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

    // 모든 사용자의 휴가 잔여일수를 일괄 조회 (N+1 문제 해결)
    const userIds = users.map(u => u.id);
    const { data: allBalances } = await supabase
      .from('leave_balances')
      .select('*')
      .in('user_id', userIds)
      .eq('year', year);

    // 사용자별 잔여일수 맵 생성
    const balanceMap = new Map<string, typeof allBalances>();
    for (const balance of allBalances || []) {
      const existing = balanceMap.get(balance.user_id) || [];
      existing.push(balance);
      balanceMap.set(balance.user_id, existing);
    }

    const stats = users.map(u => {
      const balances = balanceMap.get(u.id) || [];
      const annual = balances.find(b => b.leave_type === 'annual');
      const compensatory = balances.find(b => b.leave_type === 'compensatory');
      const special = balances.find(b => b.leave_type === 'special');

      return {
        user_id: u.id,
        user_name: u.name,
        bu_code: u.bu_code,
        position: u.position,
        hire_date: u.hire_date,
        annual_total: annual ? Number(annual.total_days) : 0,
        annual_used: annual ? Number(annual.used_days) : 0,
        annual_remaining: annual ? Number(annual.total_days) - Number(annual.used_days) : 0,
        compensatory_total: compensatory ? Number(compensatory.total_days) : 0,
        compensatory_used: compensatory ? Number(compensatory.used_days) : 0,
        compensatory_remaining: compensatory ? Number(compensatory.total_days) - Number(compensatory.used_days) : 0,
        special_total: special ? Number(special.total_days) : 0,
        special_used: special ? Number(special.used_days) : 0,
        special_remaining: special ? Number(special.total_days) - Number(special.used_days) : 0,
      };
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Team leave stats error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
