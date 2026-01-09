import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { calculateWorkTimeMinutes } from '@/features/attendance/lib/workTimeCalculator';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    // 같은 날짜의 모든 출근 기록 조회 (최신순)
    const { data: logs, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('work_date', today)
      .order('check_in_at', { ascending: false });

    if (error) {
      throw error;
    }

    // 가장 최근 출근 기록 확인
    const latestLog = logs && logs.length > 0 ? logs[0] : null;

    const isCheckedIn = !!latestLog?.check_in_at;
    const isCheckedOut = !!latestLog?.check_out_at;
    const workTimeMinutes = latestLog 
      ? calculateWorkTimeMinutes(latestLog.check_in_at, latestLog.check_out_at)
      : null;

    return NextResponse.json({
      isCheckedIn,
      isCheckedOut,
      checkInAt: latestLog?.check_in_at || null,
      checkOutAt: latestLog?.check_out_at || null,
      workDate: today,
      status: latestLog?.status || 'absent',
      workTimeMinutes: workTimeMinutes || 0,
      hasCheckedOut: !!latestLog?.check_out_at,
    });
  } catch (error: any) {
    console.error('Get status error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

