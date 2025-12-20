import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;

    let query = supabase.from('channels').select('*').order('created_at', { ascending: false });

    if (bu) {
      query = query.eq('bu_code', bu);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('channels')
      .insert({
        bu_code: body.bu_code,
        name: body.name,
        url: body.url,
        subscribers_count: body.subscribers_count,
        total_views: body.total_views,
        status: body.status || 'active',
        manager_id: body.manager_id,
        manager_name: body.manager_name,
        next_upload_date: body.next_upload_date,
        recent_video: body.recent_video,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


