import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { kstToUTCISOString } from '@/lib/timezone.server';

/**
 * 관리자 전용: 특정 사용자의 활동 로그 조회
 * - admin 역할만 접근 가능
 * - userId 파라미터 필수
 */
export async function GET(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();

    // 관리자 권한 확인
    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!appUser || appUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false });

    if (date) {
      const startUTC = kstToUTCISOString(date, '00:00:00');
      const endUTC = kstToUTCISOString(date, '23:59:59');
      query = query
        .gte('occurred_at', startUTC)
        .lte('occurred_at', endUTC);
    }

    const { data, error } = await query.limit(100);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Admin get activity logs error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
