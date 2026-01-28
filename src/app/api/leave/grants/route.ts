import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLeaveGrantedLog } from '@/lib/activity-logger';

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

    const { data: grants, error } = await supabase
      .from('leave_grants')
      .select(`
        *,
        granter:app_users!leave_grants_granted_by_fkey(id, name)
      `)
      .eq('user_id', userId)
      .eq('year', year)
      .order('granted_at', { ascending: false });

    if (error) {
      console.error('Leave grants fetch error:', error);
      return NextResponse.json({ error: '휴가 부여 이력 조회에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(grants);
  } catch (error) {
    console.error('Leave grants error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // HEAD admin만 휴가 부여 가능
    const { data: currentUser } = await supabase
      .from('app_users')
      .select('role, bu_code, name')
      .eq('id', user.id)
      .single();

    if (!currentUser || currentUser.role !== 'admin' || currentUser.bu_code !== 'HEAD') {
      return NextResponse.json({ error: '휴가 부여 권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, leave_type, days, reason } = body;

    if (!user_id || !leave_type || !days || !reason) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();

    // 휴가 부여 이력 기록
    const { data: grant, error: grantError } = await supabase
      .from('leave_grants')
      .insert({
        user_id,
        leave_type,
        days,
        grant_type: 'manual',
        reason,
        granted_by: user.id,
        year: currentYear,
      })
      .select()
      .single();

    if (grantError) {
      console.error('Leave grant create error:', grantError);
      return NextResponse.json({ error: '휴가 부여에 실패했습니다.' }, { status: 500 });
    }

    await createLeaveGrantedLog(
      user_id,
      grant.id,
      user.id,
      currentUser.name ?? '관리자',
      leave_type,
      Number(days),
      reason
    );

    // 휴가 잔여일수 업데이트
    const { data: balance } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', user_id)
      .eq('leave_type', leave_type)
      .eq('year', currentYear)
      .single();

    if (balance) {
      await supabase
        .from('leave_balances')
        .update({
          total_days: Number(balance.total_days) + Number(days),
        })
        .eq('id', balance.id);
    } else {
      await supabase
        .from('leave_balances')
        .insert({
          user_id,
          leave_type,
          total_days: days,
          used_days: 0,
          year: currentYear,
        });
    }

    return NextResponse.json(grant);
  } catch (error) {
    console.error('Leave grant create error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
