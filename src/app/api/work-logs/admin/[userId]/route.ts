import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { getTodayKST } from '@/lib/timezone.server';

/**
 * 관리자 전용: 특정 사용자의 업무일지 조회
 * - admin 역할만 접근 가능
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || getTodayKST();

    // 대상 사용자 정보
    const { data: targetUser, error: userError } = await supabase
      .from('app_users')
      .select('id, name, email, role, bu_code, position')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 해당 사용자의 업무일지
    const { data: workLog, error: logError } = await supabase
      .from('daily_work_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', date)
      .maybeSingle();

    if (logError) throw logError;

    return NextResponse.json({
      user: targetUser,
      work_log: workLog,
      date,
    });
  } catch (error) {
    console.error('Admin get user work log error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
