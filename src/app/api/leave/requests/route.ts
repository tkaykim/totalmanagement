import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateDaysUsed } from '@/features/leave/lib/leave-calculator';
import { getLeaveTypeFromRequestType } from '@/features/leave/types';
import { notifyLeaveRequestCreated } from '@/lib/notification-sender';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get('requester_id');
    const status = searchParams.get('status');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    // 현재 사용자 정보 조회
    const { data: currentUser } = await supabase
      .from('app_users')
      .select('role, bu_code')
      .eq('id', user.id)
      .single();

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        requester:app_users!leave_requests_requester_id_fkey(id, name, bu_code, position),
        approver:app_users!leave_requests_approver_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false });

    // 권한에 따른 필터링
    if (requesterId) {
      query = query.eq('requester_id', requesterId);
    } else if (currentUser?.role === 'admin') {
      // admin은 전체 조회 가능
    } else if (currentUser?.role === 'leader') {
      // leader는 같은 BU만 조회
      const { data: buUsers } = await supabase
        .from('app_users')
        .select('id')
        .eq('bu_code', currentUser.bu_code);
      
      if (buUsers && buUsers.length > 0) {
        query = query.in('requester_id', buUsers.map(u => u.id));
      }
    } else {
      // 일반 사용자는 본인 것만
      query = query.eq('requester_id', user.id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (year) {
      const yearNum = parseInt(year);
      query = query.gte('start_date', `${yearNum}-01-01`)
                   .lte('end_date', `${yearNum}-12-31`);
    }

    if (month && year) {
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const startOfMonth = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
      const endOfMonth = new Date(yearNum, monthNum, 0).toISOString().split('T')[0];
      query = query.gte('start_date', startOfMonth)
                   .lte('start_date', endOfMonth);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Leave requests fetch error:', error);
      return NextResponse.json({ error: '휴가 신청 목록 조회에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Leave requests error:', error);
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

    const body = await request.json();
    const { leave_type, start_date, end_date, reason } = body;

    if (!leave_type || !start_date || !end_date || !reason) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    // 사용 일수 계산
    const daysUsed = calculateDaysUsed(
      leave_type,
      new Date(start_date),
      new Date(end_date)
    );

    // 잔여 휴가 확인
    const balanceType = getLeaveTypeFromRequestType(leave_type);
    const currentYear = new Date().getFullYear();

    const { data: balance } = await supabase
      .from('leave_balances')
      .select('total_days, used_days')
      .eq('user_id', user.id)
      .eq('leave_type', balanceType)
      .eq('year', currentYear)
      .single();

    const remaining = balance 
      ? Number(balance.total_days) - Number(balance.used_days) 
      : 0;

    if (daysUsed > remaining) {
      return NextResponse.json({ 
        error: `잔여 휴가가 부족합니다. (잔여: ${remaining}일, 신청: ${daysUsed}일)` 
      }, { status: 400 });
    }

    // 신청자 이름 조회
    const { data: requester } = await supabase
      .from('app_users')
      .select('name')
      .eq('id', user.id)
      .single();

    // 휴가 신청 생성
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        requester_id: user.id,
        leave_type,
        start_date,
        end_date,
        days_used: daysUsed,
        reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Leave request create error:', error);
      return NextResponse.json({ error: '휴가 신청에 실패했습니다.' }, { status: 500 });
    }

    // 관리자들에게 알림 전송
    await notifyLeaveRequestCreated(
      requester?.name || '사용자',
      leave_type,
      start_date,
      end_date,
      leaveRequest.id
    );

    return NextResponse.json(leaveRequest);
  } catch (error) {
    console.error('Leave request create error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
