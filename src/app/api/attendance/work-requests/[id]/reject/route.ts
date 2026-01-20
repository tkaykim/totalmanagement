import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import { canApproveRequest } from '@/features/attendance/lib/permissions';
import { notifyWorkRequestRejected } from '@/lib/notification-sender';
import type { AppUser } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id } = await params;
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser, error: profileError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !currentUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { data: workRequest, error: fetchError } = await supabase
      .from('work_requests')
      .select(`
        *,
        requester:app_users!work_requests_requester_id_fkey(id, name, bu_code)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Work request not found' }, { status: 404 });
      }
      throw fetchError;
    }

    if (workRequest.status !== 'pending') {
      return NextResponse.json(
        { error: '이미 처리된 신청입니다.' },
        { status: 400 }
      );
    }

    const requesterBuCode = (workRequest.requester as any)?.bu_code;
    if (!canApproveRequest(currentUser as AppUser, requesterBuCode)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rejection_reason } = body;

    if (!rejection_reason || rejection_reason.trim() === '') {
      return NextResponse.json(
        { error: '반려 사유를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Service role client로 RLS 우회하여 업데이트
    const adminClient = await createPureClient();
    const { error: updateError } = await adminClient
      .from('work_requests')
      .update({
        status: 'rejected',
        approver_id: user.id,
        rejection_reason: rejection_reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 업데이트 후 별도로 조회
    const { data: updatedRequest, error: fetchUpdatedError } = await adminClient
      .from('work_requests')
      .select(`
        *,
        requester:app_users!work_requests_requester_id_fkey(id, name, bu_code)
      `)
      .eq('id', id)
      .single();

    if (fetchUpdatedError) throw fetchUpdatedError;

    // 신청자에게 거절 알림 전송
    await notifyWorkRequestRejected(
      workRequest.requester_id,
      workRequest.request_type,
      workRequest.start_date,
      id,
      rejection_reason.trim()
    ).catch(console.error);

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error('Reject work request error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

