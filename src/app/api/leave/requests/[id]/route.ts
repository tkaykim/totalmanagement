import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // 본인의 대기 중인 신청만 취소 가능
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: '휴가 신청을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (leaveRequest.requester_id !== user.id) {
      return NextResponse.json({ error: '본인의 신청만 취소할 수 있습니다.' }, { status: 403 });
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json({ error: '대기 중인 신청만 취소할 수 있습니다.' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Leave request delete error:', deleteError);
      return NextResponse.json({ error: '휴가 신청 취소에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave request delete error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
