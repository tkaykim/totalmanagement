import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateMonthlyStats } from '@/features/attendance/lib/workTimeCalculator';
import { canViewAllAttendance, canViewTeamAttendance } from '@/features/attendance/lib/permissions';
import type { AttendanceLog, AppUser } from '@/types/database';

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

    const targetUserId = searchParams.get('user_id') || user.id;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    if (targetUserId !== user.id) {
      if (!canViewAllAttendance(currentUser as AppUser)) {
        const { data: targetUser } = await supabase
          .from('app_users')
          .select('bu_code')
          .eq('id', targetUserId)
          .single();

        if (!canViewTeamAttendance(currentUser as AppUser, targetUser?.bu_code || null)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const startDate = monthStart.toISOString().split('T')[0];
    const endDate = monthEnd.toISOString().split('T')[0];

    const { data: logs, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', targetUserId)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date', { ascending: true });

    if (error) throw error;

    const stats = calculateMonthlyStats(logs as AttendanceLog[], year, month);

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

