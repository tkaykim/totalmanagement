import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 사용자의 강제 퇴근 이력 조회 API
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: autoCheckoutLogs, error } = await supabase
      .from('attendance_logs')
      .select('id, work_date, check_in_at, check_out_at')
      .eq('user_id', user.id)
      .eq('is_auto_checkout', true)
      .order('work_date', { ascending: false })
      .limit(30);

    if (error) {
      throw error;
    }

    return NextResponse.json(autoCheckoutLogs || []);
  } catch (error: any) {
    console.error('Get auto checkout history error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
