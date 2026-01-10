'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('bu_code, role')
      .eq('id', user.id)
      .single();

    // Only leader or admin can reject
    if (!['leader', 'admin'].includes(appUser?.role || '')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get the request
    const { data: accessRequest, error: requestError } = await supabase
      .from('partner_access_requests')
      .select('*, partner:partners(owner_bu_code)')
      .eq('id', id)
      .single();

    if (requestError) throw requestError;
    if (!accessRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check permission - only owner BU or admin can reject
    const isHeadAdmin = appUser?.role === 'admin' && appUser?.bu_code === 'HEAD';
    if (!isHeadAdmin && appUser?.role !== 'admin' && accessRequest.partner?.owner_bu_code !== appUser?.bu_code) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('partner_access_requests')
      .update({
        status: 'rejected',
        processed_by: user.id,
        processed_at: new Date().toISOString(),
        rejection_reason: body.reason || null,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reject access request:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
