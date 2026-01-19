import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateMonthlyStats } from '@/features/attendance/lib/workTimeCalculator';
import { canViewAllAttendance } from '@/features/attendance/lib/permissions';
import type { AttendanceLog, AppUser } from '@/types/database';

export interface TeamMemberStats {
  user_id: string;
  user_name: string;
  bu_code: string | null;
  position: string | null;
  totalWorkDays: number;
  totalWorkMinutes: number;
  averageWorkMinutes: number;
  lateCount: number;
  earlyLeaveCount: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser, error: profileError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !currentUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // admin + HEAD 권한 체크
    if (!canViewAllAttendance(currentUser as AppUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const buCode = searchParams.get('bu_code') || null;

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const startDate = monthStart.toISOString().split('T')[0];
    const endDate = monthEnd.toISOString().split('T')[0];

    // 사용자 목록 조회 (파트너가 아닌 내부 직원만)
    let usersQuery = supabase
      .from('app_users')
      .select('id, name, bu_code, position')
      .is('partner_id', null);

    if (buCode && buCode !== 'all') {
      usersQuery = usersQuery.eq('bu_code', buCode);
    }

    const { data: users, error: usersError } = await usersQuery.order('name');
    if (usersError) throw usersError;

    // 해당 월의 모든 출퇴근 로그 조회
    const { data: allLogs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('*')
      .gte('work_date', startDate)
      .lte('work_date', endDate);

    if (logsError) throw logsError;

    // 사용자별 통계 계산
    const teamStats: TeamMemberStats[] = users?.map((u) => {
      const userLogs = (allLogs || []).filter((log) => log.user_id === u.id) as AttendanceLog[];
      const stats = calculateMonthlyStats(userLogs, year, month);

      return {
        user_id: u.id,
        user_name: u.name || '이름 없음',
        bu_code: u.bu_code,
        position: u.position,
        totalWorkDays: stats.totalWorkDays,
        totalWorkMinutes: stats.totalWorkMinutes,
        averageWorkMinutes: stats.averageWorkMinutes,
        lateCount: stats.lateCount,
        earlyLeaveCount: stats.earlyLeaveCount,
      };
    }) || [];

    // 근무시간 기준 정렬 (많은 순)
    teamStats.sort((a, b) => b.totalWorkMinutes - a.totalWorkMinutes);

    return NextResponse.json({
      year,
      month,
      stats: teamStats,
    });
  } catch (error: any) {
    console.error('Get team stats error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
