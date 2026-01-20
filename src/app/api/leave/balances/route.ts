import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || user.id;
    const year = searchParams.get('year') 
      ? parseInt(searchParams.get('year')!) 
      : new Date().getFullYear();
    const isSummary = searchParams.get('summary') === 'true';

    // 본인이 아닌 경우 권한 체크
    if (userId !== user.id) {
      const { data: currentUser } = await supabase
        .from('app_users')
        .select('role, bu_code')
        .eq('id', user.id)
        .single();

      if (!currentUser || !['admin', 'leader'].includes(currentUser.role)) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
      }
    }

    const { data: balances, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year);

    if (error) {
      console.error('Leave balances fetch error:', error);
      return NextResponse.json({ error: '휴가 잔여일수 조회에 실패했습니다.' }, { status: 500 });
    }

    if (isSummary) {
      const summary = {
        annual: { total: 0, used: 0, remaining: 0 },
        compensatory: { total: 0, used: 0, remaining: 0 },
        special: { total: 0, used: 0, remaining: 0 },
      };

      for (const balance of balances || []) {
        const type = balance.leave_type as keyof typeof summary;
        if (summary[type]) {
          summary[type].total = Number(balance.total_days);
          summary[type].used = Number(balance.used_days);
          summary[type].remaining = Number(balance.total_days) - Number(balance.used_days);
        }
      }

      return NextResponse.json(summary);
    }

    return NextResponse.json(balances);
  } catch (error) {
    console.error('Leave balances error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
