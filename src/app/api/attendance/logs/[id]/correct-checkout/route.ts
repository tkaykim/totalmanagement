import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toKSTISOString } from '@/lib/timezone.server';
import { createActivityLog } from '@/lib/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 사용자가 자신의 자동 퇴근 기록을 수정하는 API
 * - 자신의 기록만 수정 가능
 * - 자동 퇴근 처리된 기록만 수정 가능
 * - 수정 후 user_confirmed를 true로 변경
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 해당 출근 기록 조회
    const { data: existingLog, error: logError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (logError || !existingLog) {
      return NextResponse.json({ error: '출근 기록을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 자신의 기록인지 확인
    if (existingLog.user_id !== user.id) {
      return NextResponse.json({ error: '자신의 기록만 수정할 수 있습니다.' }, { status: 403 });
    }

    // 자동 퇴근 처리된 기록인지 확인
    if (!existingLog.is_auto_checkout) {
      return NextResponse.json({ error: '자동 퇴근 처리된 기록만 수정할 수 있습니다.' }, { status: 400 });
    }

    const body = await request.json();
    const { check_out_time, skip_correction } = body;

    // skip_correction이 true이면 확인만 하고 시간은 수정하지 않음
    if (skip_correction) {
      const { data: updatedLog, error: updateError } = await supabase
        .from('attendance_logs')
        .update({
          user_confirmed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({
        ...updatedLog,
        message: '확인 처리되었습니다.',
      });
    }

    // 퇴근 시간 입력 시
    if (!check_out_time) {
      return NextResponse.json({ error: '퇴근 시간을 입력해주세요.' }, { status: 400 });
    }

    const newCheckOutAt = toKSTISOString(existingLog.work_date, check_out_time);
    const originalCheckOutAt = existingLog.check_out_at;

    const { data: updatedLog, error: updateError } = await supabase
      .from('attendance_logs')
      .update({
        check_out_at: newCheckOutAt,
        is_modified: true,
        user_confirmed: true,
        modification_reason: `사용자 직접 수정 (원래 자동 퇴근: ${originalCheckOutAt})`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 활동 로그 기록
    await createActivityLog({
      userId: user.id,
      actionType: 'attendance_corrected',
      entityType: 'attendance',
      entityId: id,
      entityTitle: '퇴근 시간 정정',
      metadata: {
        work_date: existingLog.work_date,
        original_check_out_at: originalCheckOutAt,
        new_check_out_at: newCheckOutAt,
        correction_type: 'user_self_correction',
      },
    });

    return NextResponse.json({
      ...updatedLog,
      message: '퇴근 시간이 수정되었습니다.',
    });
  } catch (error: any) {
    console.error('Correct checkout error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
