import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { kstToUTCISOString } from '@/lib/timezone.server';

export async function GET(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date'); // YYYY-MM-DD 형식 (KST 기준)
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false });

    // 단일 날짜 필터 (KST 기준으로 변환)
    if (date) {
      // KST 날짜의 시작과 끝을 UTC로 변환
      const startUTC = kstToUTCISOString(date, '00:00:00');
      const endUTC = kstToUTCISOString(date, '23:59:59');
      
      query = query
        .gte('occurred_at', startUTC)
        .lte('occurred_at', endUTC);
    }
    // 날짜 범위 필터 (KST 기준으로 변환)
    else if (startDate && endDate) {
      const startUTC = kstToUTCISOString(startDate, '00:00:00');
      const endUTC = kstToUTCISOString(endDate, '23:59:59');
      
      query = query
        .gte('occurred_at', startUTC)
        .lte('occurred_at', endUTC);
    }

    const { data, error } = await query.limit(100);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Get activity logs error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
