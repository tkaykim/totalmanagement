import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('channels')
      .update({
        name: body.name,
        url: body.url,
        subscribers_count: body.subscribers_count,
        total_views: body.total_views,
        status: body.status,
        manager_id: body.manager_id,
        manager_name: body.manager_name,
        next_upload_date: body.next_upload_date,
        recent_video: body.recent_video,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { error } = await supabase.from('channels').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


