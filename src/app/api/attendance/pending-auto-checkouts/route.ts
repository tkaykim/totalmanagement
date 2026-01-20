import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 사용자의 미확인 강제 퇴근 이력 조회 API
 * 로그인 직후 확인하여 모달로 표시하기 위함
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 강제 퇴근 처리되었지만 사용자가 아직 확인하지 않은 기록 조회
    const { data: autoCheckoutLogs, error } = await supabase
      .from('attendance_logs')
      .select('id, work_date, check_in_at, check_out_at')
      .eq('user_id', user.id)
      .eq('is_auto_checkout', true)
      .eq('user_confirmed', false)
      .order('work_date', { ascending: false })
      .limit(30);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      logs: autoCheckoutLogs || [],
      count: autoCheckoutLogs?.length || 0,
    });
  } catch (error: any) {
    console.error('Get pending auto checkouts error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
