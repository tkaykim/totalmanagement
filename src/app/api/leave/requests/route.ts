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
    const { leave_type, start_date, end_date, reason, admin_proxy, target_user_id } = body;

    if (!leave_type || !start_date || !end_date || !reason) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    // 관리자 대리 신청 처리
    const isAdminProxy = admin_proxy === true && !!target_user_id;
    let actualRequesterId = user.id;

    if (isAdminProxy) {
      // 권한 체크: admin만 대리 신청 가능
      const { data: currentUser } = await supabase
        .from('app_users')
        .select('role, bu_code')
        .eq('id', user.id)
        .single();

      if (!currentUser || currentUser.role !== 'admin') {
        return NextResponse.json({ error: '관리자만 대리 휴가 소진이 가능합니다.' }, { status: 403 });
      }

      actualRequesterId = target_user_id;
    }

    // 사용 일수 계산
    const daysUsed = calculateDaysUsed(
      leave_type,
      new Date(start_date),
      new Date(end_date)
    );

    // 잔여 휴가 확인
    const balanceType = getLeaveTypeFromRequestType(leave_type);
    const currentYear = new Date(start_date).getFullYear();

    const { data: balance } = await supabase
      .from('leave_balances')
      .select('id, total_days, used_days')
      .eq('user_id', actualRequesterId)
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
      .eq('id', actualRequesterId)
      .single();

    // 관리자 대리 신청이면 즉시 승인 상태로 생성
    const requestStatus = isAdminProxy ? 'approved' : 'pending';
    const approverData = isAdminProxy ? {
      approver_id: user.id,
      approved_at: new Date().toISOString(),
    } : {};

    // 휴가 신청 생성
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        requester_id: actualRequesterId,
        leave_type,
        start_date,
        end_date,
        days_used: daysUsed,
        reason: isAdminProxy ? `[관리자 대리 소진] ${reason}` : reason,
        status: requestStatus,
        ...approverData,
      })
      .select()
      .single();

    if (error) {
      console.error('Leave request create error:', error);
      return NextResponse.json({ error: '휴가 신청에 실패했습니다.' }, { status: 500 });
    }

    // 관리자 대리 소진이면 즉시 잔여일수 차감
    if (isAdminProxy && balance) {
      await supabase
        .from('leave_balances')
        .update({
          used_days: Number(balance.used_days) + daysUsed,
        })
        .eq('id', balance.id);

      // 출퇴근 기록에 휴가 상태 반영
      const isFullDayLeave = ['annual', 'compensatory', 'special'].includes(leave_type);
      if (isFullDayLeave) {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const current = new Date(startDate);
        const workDates: string[] = [];

        while (current <= endDate) {
          const dayOfWeek = current.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workDates.push(current.toISOString().split('T')[0]);
          }
          current.setDate(current.getDate() + 1);
        }

        if (workDates.length > 0) {
          const { data: existingLogs } = await supabase
            .from('attendance_logs')
            .select('id, work_date')
            .eq('user_id', actualRequesterId)
            .in('work_date', workDates);

          const existingDates = new Set(existingLogs?.map(log => log.work_date) || []);
          const existingLogIds = existingLogs?.map(log => log.id) || [];

          if (existingLogIds.length > 0) {
            await supabase
              .from('attendance_logs')
              .update({
                status: 'vacation',
                is_modified: true,
                modification_reason: `관리자 대리 휴가 소진 (${leave_type})`,
              })
              .in('id', existingLogIds);
          }

          const newLogs = workDates
            .filter(date => !existingDates.has(date))
            .map(workDate => ({
              user_id: actualRequesterId,
              work_date: workDate,
              status: 'vacation' as const,
              is_modified: true,
              modification_reason: `관리자 대리 휴가 소진 (${leave_type})`,
            }));

          if (newLogs.length > 0) {
            await supabase.from('attendance_logs').insert(newLogs);
          }
        }
      }
    }

    // 일반 신청이면 관리자에게 알림 전송
    if (!isAdminProxy) {
      await notifyLeaveRequestCreated(
        requester?.name || '사용자',
        leave_type,
        start_date,
        end_date,
        leaveRequest.id
      );
    }

    return NextResponse.json(leaveRequest);
  } catch (error) {
    console.error('Leave request create error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
