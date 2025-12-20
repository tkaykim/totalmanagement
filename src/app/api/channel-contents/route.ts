import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channel_id');

    let query = supabase
      .from('channel_contents')
      .select('*')
      .order('upload_date', { ascending: true });

    if (channelId) {
      query = query.eq('channel_id', channelId);
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
      .from('channel_contents')
      .insert({
        channel_id: body.channel_id,
        title: body.title,
        stage: body.stage || 'planning',
        assignee_id: body.assignee_id,
        assignee_name: body.assignee_name,
        upload_date: body.upload_date,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


