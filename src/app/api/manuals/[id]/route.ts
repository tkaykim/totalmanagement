import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('manuals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.bu_code !== undefined) updateData.bu_code = body.bu_code;

    const { data, error } = await supabase
      .from('manuals')
      .update(updateData)
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

    const { error } = await supabase.from('manuals').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
















