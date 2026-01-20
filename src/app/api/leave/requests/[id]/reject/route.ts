import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyLeaveRequestRejected } from '@/lib/notification-sender';

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
      return NextResponse.json({ error: '반려 권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { rejection_reason } = body;

    if (!rejection_reason) {
      return NextResponse.json({ error: '반려 사유를 입력해주세요.' }, { status: 400 });
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

    // Leader는 같은 BU만 반려 가능
    if (currentUser.role === 'leader') {
      const requesterBuCode = (leaveRequest.requester as { bu_code?: string })?.bu_code;
      if (requesterBuCode !== currentUser.bu_code) {
        return NextResponse.json({ error: '같은 사업부의 신청만 반려할 수 있습니다.' }, { status: 403 });
      }
    }

    // 휴가 신청 반려
    const { data: updatedRequest, error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        approver_id: user.id,
        rejection_reason,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Leave request reject error:', updateError);
      return NextResponse.json({ error: '휴가 반려에 실패했습니다.' }, { status: 500 });
    }

    // 신청자에게 거절 알림 전송
    await notifyLeaveRequestRejected(
      leaveRequest.requester_id,
      leaveRequest.leave_type,
      leaveRequest.start_date,
      id,
      rejection_reason
    ).catch(console.error);

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Leave request reject error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
