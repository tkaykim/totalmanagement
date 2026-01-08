import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canViewAllAttendance, canViewTeamAttendance, canApproveRequest } from '@/features/attendance/lib/permissions';
import type { AppUser, WorkRequestType } from '@/types/database';

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

    const status = searchParams.get('status');
    const requesterId = searchParams.get('requester_id');

    let query = supabase
      .from('work_requests')
      .select(`
        *,
        requester:app_users!work_requests_requester_id_fkey(id, name, bu_code)
      `);

    if (requesterId) {
      if (requesterId !== user.id && !canViewAllAttendance(currentUser as AppUser)) {
        const { data: targetUser } = await supabase
          .from('app_users')
          .select('bu_code')
          .eq('id', requesterId)
          .single();

        if (!canViewTeamAttendance(currentUser as AppUser, targetUser?.bu_code || null)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
      query = query.eq('requester_id', requesterId);
    } else {
      if (!canViewAllAttendance(currentUser as AppUser)) {
        query = query.eq('requester_id', user.id);
      }
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data: requests, error } = await query;

    if (error) throw error;

    return NextResponse.json(requests || []);
  } catch (error: any) {
    console.error('Get work requests error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
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

    const {
      request_type,
      start_date,
      end_date,
      start_time,
      end_time,
      reason,
    } = body;

    if (!request_type || !start_date || !end_date || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: request_type, start_date, end_date, reason' },
        { status: 400 }
      );
    }

    const requestData: any = {
      requester_id: user.id,
      request_type: request_type as WorkRequestType,
      start_date,
      end_date,
      reason,
      status: 'pending',
    };

    if (start_time) {
      requestData.start_time = start_time;
    }

    if (end_time) {
      requestData.end_time = end_time;
    }

    const { data, error } = await supabase
      .from('work_requests')
      .insert(requestData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Create work request error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

