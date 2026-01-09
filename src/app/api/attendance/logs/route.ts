import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import { canViewAllAttendance, canViewTeamAttendance } from '@/features/attendance/lib/permissions';
import type { AppUser } from '@/types/database';

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

    const targetUserId = searchParams.get('user_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase.from('attendance_logs').select('*');

    // user_id가 명시적으로 전달되면 해당 사용자의 로그 조회 (권한 체크)
    // user_id가 없으면 항상 본인 로그만 조회 (admin 포함)
    if (targetUserId) {
      // 다른 사용자의 로그를 조회하려면 권한 필요
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
      query = query.eq('user_id', targetUserId);
    } else {
      // user_id가 없으면 항상 본인 로그만 반환 (권한과 무관)
      query = query.eq('user_id', user.id);
    }

    if (startDate) {
      query = query.gte('work_date', startDate);
    }

    if (endDate) {
      query = query.lte('work_date', endDate);
    }

    query = query.order('work_date', { ascending: false });

    const { data: logs, error } = await query;

    if (error) throw error;

    return NextResponse.json(logs || []);
  } catch (error: any) {
    console.error('Get logs error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

