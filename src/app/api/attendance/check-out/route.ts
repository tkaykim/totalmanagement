import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTodayKST, getNowKSTISO } from '@/lib/timezone.server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = getTodayKST();
    const now = getNowKSTISO();

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

    if (!existingLogs || existingLogs.length === 0) {
      return NextResponse.json(
        { error: '출근 기록이 없습니다. 먼저 출근해주세요.' },
        { status: 400 }
      );
    }

    // 가장 최근 출근 기록 중 퇴근 기록이 없는 것 찾기
    const activeLog = existingLogs.find(log => log.check_in_at && !log.check_out_at);

    if (!activeLog) {
      return NextResponse.json(
        { error: '이미 퇴근 처리되었습니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('attendance_logs')
      .update({
        check_out_at: now,
      })
      .eq('id', activeLog.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Check-out error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

