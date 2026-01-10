import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date'); // YYYY-MM-DD 형식
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false });

    // 단일 날짜 필터
    if (date) {
      query = query
        .gte('occurred_at', `${date}T00:00:00`)
        .lt('occurred_at', `${date}T23:59:59.999`);
    }
    // 날짜 범위 필터
    else if (startDate && endDate) {
      query = query
        .gte('occurred_at', `${startDate}T00:00:00`)
        .lt('occurred_at', `${endDate}T23:59:59.999`);
    }

    const { data, error } = await query.limit(100);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Get activity logs error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
