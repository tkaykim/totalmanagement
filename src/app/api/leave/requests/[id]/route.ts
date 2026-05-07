import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import { getLeaveTypeFromRequestType } from '@/features/leave/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        requester:app_users!leave_requests_requester_id_fkey(id, name, bu_code, position),
        approver:app_users!leave_requests_approver_id_fkey(id, name)
      `)
      .eq('id', id)
      .single();

    if (error || !leaveRequest) {
      return NextResponse.json({ error: '휴가 신청을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json(leaveRequest);
  } catch (error) {
    console.error('Leave request fetch error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 현재 사용자 역할 조회
    const { data: currentUser } = await supabase
      .from('app_users')
      .select('role, bu_code')
      .eq('id', user.id)
      .single();

    const isAdmin = currentUser?.role === 'admin';

    // 휴가 신청 조회
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: '휴가 신청을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 관리자가 아닌 경우 기존 제한 적용
    if (!isAdmin) {
      if (leaveRequest.requester_id !== user.id) {
        return NextResponse.json({ error: '본인의 신청만 취소할 수 있습니다.' }, { status: 403 });
      }

      if (leaveRequest.status !== 'pending') {
        return NextResponse.json({ error: '대기 중인 신청만 취소할 수 있습니다.' }, { status: 400 });
      }
    }

    // 권한 체크 후 service role 클라이언트로 우회 처리
    // (leave_requests에 DELETE 정책이 없고, leave_balances는 HEAD admin만 변경 가능하므로
    //  RLS를 그대로 두면 update/delete가 조용히 실패함)
    const adminClient = await createPureClient();

    // 승인된 신청을 삭제하는 경우 잔여일수 복구
    if (leaveRequest.status === 'approved') {
      const balanceType = getLeaveTypeFromRequestType(leaveRequest.leave_type);
      const requestYear = new Date(leaveRequest.start_date).getFullYear();

      const { data: balance, error: balanceFetchError } = await adminClient
        .from('leave_balances')
        .select('id, used_days')
        .eq('user_id', leaveRequest.requester_id)
        .eq('leave_type', balanceType)
        .eq('year', requestYear)
        .maybeSingle();

      if (balanceFetchError) {
        console.error('Leave balance fetch error:', balanceFetchError);
        return NextResponse.json({ error: '잔여일수 조회에 실패했습니다.' }, { status: 500 });
      }

      if (balance) {
        const restoredUsedDays = Math.max(0, Number(balance.used_days) - Number(leaveRequest.days_used));
        const { error: balanceUpdateError } = await adminClient
          .from('leave_balances')
          .update({ used_days: restoredUsedDays })
          .eq('id', balance.id);

        if (balanceUpdateError) {
          console.error('Leave balance restore error:', balanceUpdateError);
          return NextResponse.json({ error: '잔여일수 복구에 실패했습니다.' }, { status: 500 });
        }
      }

      // 출퇴근 기록에서 휴가 상태 복구
      const isFullDayLeave = ['annual', 'compensatory', 'special'].includes(leaveRequest.leave_type);
      if (isFullDayLeave) {
        const startDate = new Date(leaveRequest.start_date);
        const endDate = new Date(leaveRequest.end_date);
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
          // 휴가로 인해 생성된 출퇴근 기록 삭제 (vacation 상태인 것만)
          const { error: attendanceDeleteError } = await adminClient
            .from('attendance_logs')
            .delete()
            .eq('user_id', leaveRequest.requester_id)
            .eq('status', 'vacation')
            .in('work_date', workDates);

          if (attendanceDeleteError) {
            console.error('Attendance log cleanup error:', attendanceDeleteError);
          }
        }
      }
    }

    const { error: deleteError, count: deletedCount } = await adminClient
      .from('leave_requests')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (deleteError) {
      console.error('Leave request delete error:', deleteError);
      return NextResponse.json({ error: '휴가 신청 취소에 실패했습니다.' }, { status: 500 });
    }

    if (!deletedCount) {
      return NextResponse.json({ error: '휴가 신청 삭제 대상이 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave request delete error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
