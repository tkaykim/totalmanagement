import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
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

    const body = await request.json();
    const { content, mentioned_user_ids } = body;

    const existingComment = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', id)
      .single();

    if (existingComment.error || !existingComment.data) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (existingComment.data.author_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Only author can edit' }, { status: 403 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json(
          { error: 'content must be a non-empty string' },
          { status: 400 }
        );
      }
      if (content.length > 5000) {
        return NextResponse.json(
          { error: 'content must be less than 5000 characters' },
          { status: 400 }
        );
      }
      updateData.content = content.trim();
    }

    if (mentioned_user_ids !== undefined) {
      updateData.mentioned_user_ids = Array.isArray(mentioned_user_ids) ? mentioned_user_ids : [];
    }

    const { data, error } = await supabase
      .from('comments')
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

export async function DELETE(
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

    const existingComment = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', id)
      .single();

    if (existingComment.error || !existingComment.data) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (existingComment.data.author_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Only author can delete' }, { status: 403 });
    }

    const { error } = await supabase.from('comments').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}









