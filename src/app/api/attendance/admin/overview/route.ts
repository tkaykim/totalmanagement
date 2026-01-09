import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canViewAllAttendance } from '@/features/attendance/lib/permissions';
import type { AppUser } from '@/types/database';
import { format } from 'date-fns';

export type DisplayWorkStatus = 'OFF_WORK' | 'WORKING' | 'CHECKED_OUT' | 'AWAY' | 'OVERTIME';

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

    if (!canViewAllAttendance(currentUser as AppUser)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const dateParam = searchParams.get('date');
    const buCodeParam = searchParams.get('bu_code');
    const targetDate = dateParam || format(new Date(), 'yyyy-MM-dd');
    const isToday = targetDate === format(new Date(), 'yyyy-MM-dd');

    const { data: allUsers, error: usersError } = await supabase
      .from('app_users')
      .select('id, name, email, role, bu_code, position')
      .neq('role', 'artist')
      .order('bu_code')
      .order('name');

    if (usersError) throw usersError;

    const filteredUsers = buCodeParam
      ? allUsers?.filter((u) => u.bu_code === buCodeParam)
      : allUsers;

    const { data: todayLogs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('work_date', targetDate);

    if (logsError) throw logsError;

    // 오늘인 경우에만 실시간 상태 조회
    let workStatusByUserId: Record<string, string> = {};
    if (isToday) {
      const { data: workStatuses, error: statusError } = await supabase
        .from('user_work_status')
        .select('user_id, status');

      if (!statusError && workStatuses) {
        workStatuses.forEach((ws) => {
          workStatusByUserId[ws.user_id] = ws.status;
        });
      }
    }

    const logsByUserId: Record<string, any[]> = {};
    todayLogs?.forEach((log) => {
      if (!logsByUserId[log.user_id]) {
        logsByUserId[log.user_id] = [];
      }
      logsByUserId[log.user_id].push(log);
    });

    const overview = filteredUsers?.map((u) => {
      const userLogs = logsByUserId[u.id] || [];
      const hasCheckedIn = userLogs.some((l) => l.check_in_at);
      const hasCheckedOut = userLogs.every((l) => l.check_out_at) && userLogs.length > 0;
      const isOvertime = userLogs.some((l) => l.is_overtime);
      const realtimeStatus = workStatusByUserId[u.id];

      let firstCheckIn: string | null = null;
      let lastCheckOut: string | null = null;

      userLogs.forEach((log) => {
        if (log.check_in_at) {
          if (!firstCheckIn || log.check_in_at < firstCheckIn) {
            firstCheckIn = log.check_in_at;
          }
        }
        if (log.check_out_at) {
          if (!lastCheckOut || log.check_out_at > lastCheckOut) {
            lastCheckOut = log.check_out_at;
          }
        }
      });

      // 상태 결정 로직:
      // 1. 출근 데이터 없음 → 미출근 (OFF_WORK)
      // 2. 출근+퇴근 완료 → 퇴근 (CHECKED_OUT)
      // 3. 출근 중 + 실시간 상태가 BREAK/MEETING → 자리비움 (AWAY)
      // 4. 출근 중 + is_overtime → 연장근무중 (OVERTIME)
      // 5. 출근 중 → 근무중 (WORKING)
      let displayStatus: DisplayWorkStatus = 'OFF_WORK';
      
      if (!hasCheckedIn) {
        displayStatus = 'OFF_WORK';
      } else if (hasCheckedOut) {
        displayStatus = 'CHECKED_OUT';
      } else if (isToday && (realtimeStatus === 'BREAK' || realtimeStatus === 'MEETING')) {
        displayStatus = 'AWAY';
      } else if (isOvertime && !hasCheckedOut) {
        displayStatus = 'OVERTIME';
      } else {
        displayStatus = 'WORKING';
      }

      return {
        user_id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        bu_code: u.bu_code,
        position: u.position,
        display_status: displayStatus,
        realtime_status: realtimeStatus || null,
        first_check_in: firstCheckIn,
        last_check_out: lastCheckOut,
        is_overtime: isOvertime,
        logs_count: userLogs.length,
      };
    });

    const stats = {
      total: overview?.length || 0,
      working: overview?.filter((o) => o.display_status === 'WORKING').length || 0,
      checked_out: overview?.filter((o) => o.display_status === 'CHECKED_OUT').length || 0,
      off_work: overview?.filter((o) => o.display_status === 'OFF_WORK').length || 0,
      away: overview?.filter((o) => o.display_status === 'AWAY').length || 0,
      overtime: overview?.filter((o) => o.display_status === 'OVERTIME').length || 0,
    };

    return NextResponse.json({
      date: targetDate,
      is_today: isToday,
      stats,
      users: overview,
    });
  } catch (error: any) {
    console.error('Admin overview error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
