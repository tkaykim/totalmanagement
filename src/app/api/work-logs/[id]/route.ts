import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    // 본인의 일지만 수정 가능
    const { data: existing } = await supabase
      .from('daily_work_logs')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Work log not found' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('daily_work_logs')
      .update({
        summary: body.summary,
        notes: body.notes,
        tomorrow_plan: body.tomorrow_plan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Update work log error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const { id } = await params;

    // 본인의 일지만 삭제 가능
    const { data: existing } = await supabase
      .from('daily_work_logs')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Work log not found' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { error } = await supabase
      .from('daily_work_logs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete work log error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
