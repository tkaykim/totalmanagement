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

    if (targetUserId) {
      if (!canViewAllAttendance(currentUser as AppUser)) {
        const { data: targetUser } = await supabase
          .from('app_users')
          .select('bu_code')
          .eq('id', targetUserId)
          .single();

        if (!canViewTeamAttendance(currentUser as AppUser, targetUser?.bu_code || null)) {
          if (targetUserId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        }
      }
      query = query.eq('user_id', targetUserId);
    } else {
      if (!canViewAllAttendance(currentUser as AppUser)) {
        query = query.eq('user_id', user.id);
      }
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

