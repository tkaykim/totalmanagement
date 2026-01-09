import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNowKSTISO } from '@/lib/timezone.server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = getNowKSTISO();

    // 날짜와 상관없이 미완료된(퇴근하지 않은) 출근 기록 조회
    // 자정이 지나서도 근무 중인 케이스를 처리하기 위함
    const { data: activeLog, error: checkError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .is('check_out_at', null)
      .not('check_in_at', 'is', null)
      .order('check_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (!activeLog) {
      return NextResponse.json(
        { error: '퇴근할 출근 기록이 없습니다. 이미 퇴근 처리되었거나 출근 기록이 없습니다.' },
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

