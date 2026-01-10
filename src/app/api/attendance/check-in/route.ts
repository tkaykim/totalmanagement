import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTodayKST, getNowKSTISO } from '@/lib/timezone.server';
import { createActivityLog } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = getTodayKST();
    const now = getNowKSTISO();

    // 먼저 날짜와 상관없이 미완료된(퇴근하지 않은) 출근 기록이 있는지 확인
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

    // 미완료 출근 기록이 있으면 이미 출근 처리된 것으로 간주
    if (activeLog) {
      return NextResponse.json(
        { error: '이미 출근 처리되었습니다. (진행 중인 근무가 있습니다)' },
        { status: 400 }
      );
    }

    // 오늘 날짜의 출근 기록 조회 (최신순) - 연장근무 판단용
    const { data: todayLogs, error: checkError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('work_date', today)
      .order('check_in_at', { ascending: false });

    if (checkError) {
      throw checkError;
    }

    // 오늘 이미 출퇴근 완료된 기록이 있으면 연장근무로 처리
    const completedTodayLog = todayLogs?.find(log => log.check_in_at && log.check_out_at);
    const isOvertime = !!completedTodayLog;

    // 새로운 출근 기록 생성
    const logData: any = {
      user_id: user.id,
      work_date: today,
      check_in_at: now,
      status: 'present',
      is_modified: false,
      is_verified_location: false,
      is_overtime: isOvertime,
    };

    const { data, error } = await supabase
      .from('attendance_logs')
      .insert(logData)
      .select()
      .single();
    
    if (error) throw error;

    // 활동 로그 기록
    await createActivityLog({
      userId: user.id,
      actionType: 'check_in',
      entityType: 'attendance',
      entityId: data.id,
      entityTitle: isOvertime ? '연장근무 출근' : '출근',
      metadata: { 
        check_in_at: now,
        is_overtime: isOvertime,
      },
    });
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

