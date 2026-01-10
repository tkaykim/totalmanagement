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
      .select('bu_code')
      .eq('id', user.id)
      .single();

    if (!appUser?.bu_code) {
      return NextResponse.json({ error: 'User BU not found' }, { status: 400 });
    }

    // Check if already has pending request
    const { data: existingRequest } = await supabase
      .from('partner_access_requests')
      .select('id, status')
      .eq('partner_id', id)
      .eq('requester_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json({ 
        error: 'You already have a pending request for this partner',
        request_id: existingRequest.id 
      }, { status: 400 });
    }

    // Create access request
    const { data: accessRequest, error } = await supabase
      .from('partner_access_requests')
      .insert({
        partner_id: parseInt(id),
        requester_id: user.id,
        requester_bu_code: appUser.bu_code,
        requested_access_level: body.access_level || 'view',
        reason: body.reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(accessRequest);
  } catch (error) {
    console.error('Failed to create access request:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's request status for this partner
    const { data: request_data, error } = await supabase
      .from('partner_access_requests')
      .select('id, status, reason, created_at, processed_at, rejection_reason')
      .eq('partner_id', id)
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json(request_data || null);
  } catch (error) {
    console.error('Failed to fetch access request:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
