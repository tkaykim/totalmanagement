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

    const { data: existingLog, error: checkError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('work_date', today)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingLog && existingLog.check_in_at) {
      return NextResponse.json(
        { error: '이미 출근 처리되었습니다.' },
        { status: 400 }
      );
    }

    const logData: any = {
      user_id: user.id,
      work_date: today,
      check_in_at: now,
      status: 'present',
      is_modified: false,
      is_verified_location: false,
    };

    let result;
    if (existingLog) {
      const { data, error } = await supabase
        .from('attendance_logs')
        .update(logData)
        .eq('id', existingLog.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('attendance_logs')
        .insert(logData)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

