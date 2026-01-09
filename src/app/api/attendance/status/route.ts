import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTodayKST } from '@/lib/timezone.server';
import { calculateWorkTimeMinutes } from '@/features/attendance/lib/workTimeCalculator';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = getTodayKST();

    // 1. 먼저 날짜와 상관없이 미완료된(퇴근하지 않은) 활성 출근 기록 확인
    // 자정이 지나서도 근무 중인 케이스를 처리하기 위함
    const { data: activeLog, error: activeError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .is('check_out_at', null)
      .not('check_in_at', 'is', null)
      .order('check_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeError) {
      throw activeError;
    }

    // 활성 근무 기록이 있으면 해당 기록 기준으로 상태 반환
    if (activeLog) {
      const workTimeMinutes = calculateWorkTimeMinutes(activeLog.check_in_at, activeLog.check_out_at);
      
      return NextResponse.json({
        isCheckedIn: true,
        isCheckedOut: false,
        checkInAt: activeLog.check_in_at,
        checkOutAt: null,
        workDate: activeLog.work_date,
        status: activeLog.status || 'present',
        workTimeMinutes: workTimeMinutes || 0,
        hasCheckedOut: false,
        isOvernightWork: activeLog.work_date !== today,
      });
    }

    // 2. 활성 근무 기록이 없으면 오늘 날짜의 기록 조회 (최신순)
    const { data: todayLogs, error: todayError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('work_date', today)
      .order('check_in_at', { ascending: false });

    if (todayError) {
      throw todayError;
    }

    // 오늘의 가장 최근 출근 기록 확인
    const latestTodayLog = todayLogs && todayLogs.length > 0 ? todayLogs[0] : null;

    const isCheckedIn = !!latestTodayLog?.check_in_at;
    const isCheckedOut = !!latestTodayLog?.check_out_at;
    const workTimeMinutes = latestTodayLog 
      ? calculateWorkTimeMinutes(latestTodayLog.check_in_at, latestTodayLog.check_out_at)
      : null;

    return NextResponse.json({
      isCheckedIn,
      isCheckedOut,
      checkInAt: latestTodayLog?.check_in_at || null,
      checkOutAt: latestTodayLog?.check_out_at || null,
      workDate: today,
      status: latestTodayLog?.status || 'absent',
      workTimeMinutes: workTimeMinutes || 0,
      hasCheckedOut: !!latestTodayLog?.check_out_at,
      isOvernightWork: false,
    });
  } catch (error: any) {
    console.error('Get status error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

