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

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '출근 기록이 없습니다. 먼저 출근해주세요.' },
          { status: 400 }
        );
      }
      throw checkError;
    }

    if (!existingLog.check_in_at) {
      return NextResponse.json(
        { error: '출근 기록이 없습니다. 먼저 출근해주세요.' },
        { status: 400 }
      );
    }

    if (existingLog.check_out_at) {
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
      .eq('id', existingLog.id)
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

