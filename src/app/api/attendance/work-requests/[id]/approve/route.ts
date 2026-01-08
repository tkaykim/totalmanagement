import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canApproveRequest } from '@/features/attendance/lib/permissions';
import type { AppUser } from '@/types/database';

export async function POST(
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

    const { data: workRequest, error: fetchError } = await supabase
      .from('work_requests')
      .select(`
        *,
        requester:app_users!work_requests_requester_id_fkey(id, name, bu_code)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Work request not found' }, { status: 404 });
      }
      throw fetchError;
    }

    if (workRequest.status !== 'pending') {
      return NextResponse.json(
        { error: '이미 처리된 신청입니다.' },
        { status: 400 }
      );
    }

    const requesterBuCode = (workRequest.requester as any)?.bu_code;
    if (!canApproveRequest(currentUser as AppUser, requesterBuCode)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('work_requests')
      .update({
        status: 'approved',
        approver_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        requester:app_users!work_requests_requester_id_fkey(id, name, bu_code),
        approver:app_users!work_requests_approver_id_fkey(id, name)
      `)
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error('Approve work request error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

