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

    const { data: log, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('work_date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const isCheckedIn = !!log?.check_in_at;
    const isCheckedOut = !!log?.check_out_at;
    const workTimeMinutes = log 
      ? calculateWorkTimeMinutes(log.check_in_at, log.check_out_at)
      : null;

    return NextResponse.json({
      isCheckedIn,
      isCheckedOut,
      checkInAt: log?.check_in_at || null,
      checkOutAt: log?.check_out_at || null,
      workDate: today,
      status: log?.status || 'absent',
      workTimeMinutes: workTimeMinutes || 0,
    });
  } catch (error: any) {
    console.error('Get status error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

