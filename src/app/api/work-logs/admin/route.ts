import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { getTodayKST } from '@/lib/timezone.server';

/**
 * 관리자 전용: 날짜별 전체 사용자 업무일지 제출 현황 조회
 * - admin 역할만 접근 가능
 * - 모든 사용자 목록 + 해당 날짜에 업무일지를 제출했는지 여부 반환
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
    const date = searchParams.get('date') || getTodayKST();

    // 모든 활성 사용자 목록 조회
    const { data: allUsers, error: usersError } = await supabase
      .from('app_users')
      .select('id, name, email, role, bu_code, position')
      .neq('role', 'artist')
      .order('name');

    if (usersError) throw usersError;

    // 해당 날짜의 업무일지 전체 조회
    const { data: workLogs, error: logsError } = await supabase
      .from('daily_work_logs')
      .select('id, user_id, log_date, summary, notes, tomorrow_plan, created_at, updated_at')
      .eq('log_date', date);

    if (logsError) throw logsError;

    // 사용자별 업무일지 매핑
    const logsByUserId = new Map(
      (workLogs || []).map(log => [log.user_id, log])
    );

    // 사용자별 제출 현황 데이터 생성
    const usersWithStatus = (allUsers || []).map(u => ({
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        bu_code: u.bu_code,
        position: u.position,
      },
      has_submitted: logsByUserId.has(u.id),
      work_log: logsByUserId.get(u.id) || null,
    }));

    return NextResponse.json({
      date,
      total_users: usersWithStatus.length,
      submitted_count: usersWithStatus.filter(u => u.has_submitted).length,
      users: usersWithStatus,
    });
  } catch (error) {
    console.error('Admin get work logs error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
