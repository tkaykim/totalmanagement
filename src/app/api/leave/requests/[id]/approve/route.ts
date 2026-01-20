import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLeaveTypeFromRequestType } from '@/features/leave/types';
import { notifyLeaveRequestApproved } from '@/lib/notification-sender';

export async function POST(
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

    // 권한 체크
    const { data: currentUser } = await supabase
      .from('app_users')
      .select('role, bu_code')
      .eq('id', user.id)
      .single();

    if (!currentUser || !['admin', 'leader'].includes(currentUser.role)) {
      return NextResponse.json({ error: '승인 권한이 없습니다.' }, { status: 403 });
    }

    // 휴가 신청 조회
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select(`
        *,
        requester:app_users!leave_requests_requester_id_fkey(id, name, bu_code)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: '휴가 신청을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json({ error: '이미 처리된 신청입니다.' }, { status: 400 });
    }

    // Leader는 같은 BU만 승인 가능
    if (currentUser.role === 'leader') {
      const requesterBuCode = (leaveRequest.requester as { bu_code?: string })?.bu_code;
      if (requesterBuCode !== currentUser.bu_code) {
        return NextResponse.json({ error: '같은 사업부의 신청만 승인할 수 있습니다.' }, { status: 403 });
      }
    }

    // 휴가 신청 승인
    const { data: updatedRequest, error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        approver_id: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Leave request approve error:', updateError);
      return NextResponse.json({ error: '휴가 승인에 실패했습니다.' }, { status: 500 });
    }

    // 휴가 잔여일수 차감
    const balanceType = getLeaveTypeFromRequestType(leaveRequest.leave_type);
    const currentYear = new Date(leaveRequest.start_date).getFullYear();

    const { data: balance } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', leaveRequest.requester_id)
      .eq('leave_type', balanceType)
      .eq('year', currentYear)
      .single();

    if (balance) {
      await supabase
        .from('leave_balances')
        .update({
          used_days: Number(balance.used_days) + Number(leaveRequest.days_used),
        })
        .eq('id', balance.id);
    }

    // 출퇴근 기록에 휴가 상태 반영 (배치 처리로 최적화)
    const isFullDayLeave = leaveRequest.leave_type === 'annual' || 
                           leaveRequest.leave_type === 'compensatory' || 
                           leaveRequest.leave_type === 'special';
    
    if (isFullDayLeave) {
      const startDate = new Date(leaveRequest.start_date);
      const endDate = new Date(leaveRequest.end_date);
      const current = new Date(startDate);
      const workDates: string[] = [];

      // 주말 제외한 근무일 수집
      while (current <= endDate) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workDates.push(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
      }

      if (workDates.length > 0) {
        // 기존 출퇴근 기록 일괄 조회
        const { data: existingLogs } = await supabase
          .from('attendance_logs')
          .select('id, work_date')
          .eq('user_id', leaveRequest.requester_id)
          .in('work_date', workDates);

        const existingDates = new Set(existingLogs?.map(log => log.work_date) || []);
        const existingLogIds = existingLogs?.map(log => log.id) || [];

        // 기존 기록 일괄 업데이트
        if (existingLogIds.length > 0) {
          await supabase
            .from('attendance_logs')
            .update({
              status: 'vacation',
              is_modified: true,
              modification_reason: `휴가 승인 (${leaveRequest.leave_type})`,
            })
            .in('id', existingLogIds);
        }

        // 새 기록 일괄 생성
        const newLogs = workDates
          .filter(date => !existingDates.has(date))
          .map(workDate => ({
            user_id: leaveRequest.requester_id,
            work_date: workDate,
            status: 'vacation' as const,
            is_modified: true,
            modification_reason: `휴가 승인 (${leaveRequest.leave_type})`,
          }));

        if (newLogs.length > 0) {
          await supabase.from('attendance_logs').insert(newLogs);
        }
      }
    }

    // 신청자에게 승인 알림 전송
    await notifyLeaveRequestApproved(
      leaveRequest.requester_id,
      leaveRequest.leave_type,
      leaveRequest.start_date,
      id
    ).catch(console.error);

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Leave request approve error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
