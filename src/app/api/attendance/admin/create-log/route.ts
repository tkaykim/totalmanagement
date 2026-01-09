import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canModifyAttendance } from '@/features/attendance/lib/permissions';
import { toKSTISOString } from '@/lib/timezone.server';
import type { AppUser } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
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

    const body = await request.json();
    const { user_id, work_date, check_in_time, check_out_time } = body;

    if (!user_id || !work_date) {
      return NextResponse.json(
        { error: '사용자 ID와 근무일은 필수입니다.' },
        { status: 400 }
      );
    }

    if (!check_in_time && !check_out_time) {
      return NextResponse.json(
        { error: '출근 또는 퇴근 시각 중 하나 이상 입력해주세요.' },
        { status: 400 }
      );
    }

    // 대상 사용자 조회
    const { data: targetUser, error: targetError } = await supabase
      .from('app_users')
      .select('id, name, bu_code')
      .eq('id', user_id)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: '대상 사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 체크
    if (!canModifyAttendance(currentUser as AppUser, user_id, targetUser.bu_code)) {
      return NextResponse.json({ error: 'Forbidden: 수정 권한이 없습니다.' }, { status: 403 });
    }

    // 출퇴근 기록 생성
    const insertData: Record<string, any> = {
      user_id,
      work_date,
      status: 'present',
      is_modified: true,
      modification_reason: `관리자 등록 (${currentUser.name || currentUser.email})`,
      is_verified_location: false,
      is_overtime: false,
    };

    if (check_in_time) {
      insertData.check_in_at = toKSTISOString(work_date, check_in_time);
    }

    if (check_out_time) {
      insertData.check_out_at = toKSTISOString(work_date, check_out_time);
    }

    const { data: newLog, error: insertError } = await supabase
      .from('attendance_logs')
      .insert(insertData)
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(newLog);
  } catch (error: any) {
    console.error('Create attendance log error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
