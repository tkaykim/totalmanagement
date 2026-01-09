import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date().toISOString();

    // 같은 날짜의 모든 출근 기록 조회 (최신순)
    const { data: existingLogs, error: checkError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('work_date', today)
      .order('check_in_at', { ascending: false });

    if (checkError) {
      throw checkError;
    }

    // 가장 최근 출근 기록 확인
    const latestLog = existingLogs && existingLogs.length > 0 ? existingLogs[0] : null;

    // 이미 출근 기록이 있고 퇴근 기록도 있는 경우 = 연장근무
    if (latestLog && latestLog.check_in_at && latestLog.check_out_at) {
      // 연장근무로 새 출근 기록 생성
      const logData: any = {
        user_id: user.id,
        work_date: today,
        check_in_at: now,
        status: 'present',
        is_modified: false,
        is_verified_location: false,
        is_overtime: true,
      };

      const { data, error } = await supabase
        .from('attendance_logs')
        .insert(logData)
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json(data);
    }

    // 이미 출근 기록이 있고 퇴근 기록이 없는 경우
    if (latestLog && latestLog.check_in_at && !latestLog.check_out_at) {
      return NextResponse.json(
        { error: '이미 출근 처리되었습니다.' },
        { status: 400 }
      );
    }

    // 새로운 출근 기록 생성
    const logData: any = {
      user_id: user.id,
      work_date: today,
      check_in_at: now,
      status: 'present',
      is_modified: false,
      is_verified_location: false,
      is_overtime: false,
    };

    const { data, error } = await supabase
      .from('attendance_logs')
      .insert(logData)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

