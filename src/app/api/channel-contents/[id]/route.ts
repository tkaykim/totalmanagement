import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('channel_contents')
      .update({
        title: body.title,
        stage: body.stage,
        assignee_id: body.assignee_id,
        assignee_name: body.assignee_name,
        upload_date: body.upload_date,
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

    const { error } = await supabase.from('channel_contents').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}




