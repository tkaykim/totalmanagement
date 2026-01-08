import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canViewAllAttendance, canViewTeamAttendance } from '@/features/attendance/lib/permissions';
import type { AppUser } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
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

    const { data: request, error } = await supabase
      .from('work_requests')
      .select(`
        *,
        requester:app_users!work_requests_requester_id_fkey(id, name, bu_code),
        approver:app_users!work_requests_approver_id_fkey(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Work request not found' }, { status: 404 });
      }
      throw error;
    }

    if (request.requester_id !== user.id && !canViewAllAttendance(currentUser as AppUser)) {
      const requesterBuCode = (request.requester as any)?.bu_code;
      if (!canViewTeamAttendance(currentUser as AppUser, requesterBuCode)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(request);
  } catch (error: any) {
    console.error('Get work request error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

