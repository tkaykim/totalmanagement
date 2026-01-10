'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const status = searchParams.get('status') || 'pending';

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

    // Only leader or admin can view access requests
    if (!['leader', 'admin'].includes(appUser?.role || '')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Build query - get requests for partners owned by user's BU
    let query = supabase
      .from('partner_access_requests')
      .select(`
        *,
        partner:partners(id, display_name, entity_type, owner_bu_code),
        requester:app_users!partner_access_requests_requester_id_fkey(id, name, bu_code)
      `)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Non-HEAD-admin can only see requests for their BU's partners
    const isHeadAdmin = appUser?.role === 'admin' && appUser?.bu_code === 'HEAD';
    if (!isHeadAdmin && appUser?.role !== 'admin') {
      query = query.eq('partner.owner_bu_code', appUser?.bu_code);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter out null partners (in case of join issues)
    const filteredData = (data || []).filter((r: any) => r.partner !== null);

    // For non-HEAD-admin, filter to only show requests for their BU's partners
    let finalData = filteredData;
    if (!isHeadAdmin && appUser?.role !== 'admin') {
      finalData = filteredData.filter((r: any) => 
        r.partner?.owner_bu_code === appUser?.bu_code
      );
    }

    return NextResponse.json(finalData);
  } catch (error) {
    console.error('Failed to fetch access requests:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
