import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import { canApproveRequest } from '@/features/attendance/lib/permissions';
import { toKSTISOString } from '@/lib/timezone.server';
import type { AppUser } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
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

    // Service role client로 RLS 우회하여 업데이트
    const adminClient = await createPureClient();
    const { error: updateError } = await adminClient
      .from('work_requests')
      .update({
        status: 'approved',
        approver_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 정정 신청(attendance_correction)인 경우 attendance_logs에 반영
    if (workRequest.request_type === 'attendance_correction') {
      await applyAttendanceCorrection(adminClient, workRequest);
    }

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

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error('Approve work request error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * 정정 신청 승인 시 attendance_logs에 반영
 * work_requests의 start_time/end_time은 KST로 입력된 값이므로,
 * KST → timestamptz 변환하여 저장
 */
async function applyAttendanceCorrection(
  adminClient: Awaited<ReturnType<typeof createPureClient>>,
  workRequest: any
) {
  const { requester_id, start_date, start_time, end_time, id: requestId } = workRequest;
  
  // 해당 날짜의 기존 출근 기록 조회 (is_overtime이 false인 기본 레코드)
  const { data: existingLogs, error: fetchError } = await adminClient
    .from('attendance_logs')
    .select('*')
    .eq('user_id', requester_id)
    .eq('work_date', start_date)
    .eq('is_overtime', false)
    .order('check_in_at', { ascending: true })
    .limit(1);

  if (fetchError) {
    console.error('Error fetching existing logs:', fetchError);
    throw fetchError;
  }

  // KST 시간을 timestamptz로 변환
  const checkInAt = start_time ? toKSTISOString(start_date, start_time) : null;
  const checkOutAt = end_time ? toKSTISOString(start_date, end_time) : null;

  if (existingLogs && existingLogs.length > 0) {
    // 기존 레코드 업데이트
    const existingLog = existingLogs[0];
    const updateData: any = {
      is_modified: true,
      modification_reason: `정정 신청 승인 (Request ID: ${requestId})`,
      updated_at: new Date().toISOString(),
      is_auto_checkout: false, // 정정 신청 승인 시 강제 퇴근 플래그 해제
    };

    if (checkInAt) {
      updateData.check_in_at = checkInAt;
    }
    if (checkOutAt) {
      updateData.check_out_at = checkOutAt;
    }

    const { error: updateError } = await adminClient
      .from('attendance_logs')
      .update(updateData)
      .eq('id', existingLog.id);

    if (updateError) {
      console.error('Error updating attendance log:', updateError);
      throw updateError;
    }
  } else {
    // 새 레코드 생성
    const insertData: any = {
      user_id: requester_id,
      work_date: start_date,
      status: 'present',
      is_modified: true,
      modification_reason: `정정 신청 승인 (Request ID: ${requestId})`,
      is_verified_location: false,
      is_overtime: false,
    };

    if (checkInAt) {
      insertData.check_in_at = checkInAt;
    }
    if (checkOutAt) {
      insertData.check_out_at = checkOutAt;
    }

    const { error: insertError } = await adminClient
      .from('attendance_logs')
      .insert(insertData);

    if (insertError) {
      console.error('Error inserting attendance log:', insertError);
      throw insertError;
    }
  }
}

