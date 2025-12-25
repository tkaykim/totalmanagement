import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
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

    const comment = await supabase
      .from('comments')
      .select('mentioned_user_ids')
      .eq('id', id)
      .single();

    if (comment.error || !comment.data) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const mentionedIds = comment.data.mentioned_user_ids || [];
    if (!Array.isArray(mentionedIds)) {
      console.error('mentioned_user_ids is not an array:', mentionedIds);
      return NextResponse.json(
        { error: 'Invalid mentioned_user_ids format' },
        { status: 400 }
      );
    }

    const isMentioned = mentionedIds.some((id) => String(id) === String(user.id));
    if (!isMentioned) {
      return NextResponse.json(
        { error: 'You are not mentioned in this comment' },
        { status: 403 }
      );
    }

    const { data: existingRead, error: checkError } = await supabase
      .from('comment_mentions_reads')
      .select('id')
      .eq('comment_id', Number(id))
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing read:', checkError);
      throw checkError;
    }

    let result;
    if (existingRead) {
      const { data, error } = await supabase
        .from('comment_mentions_reads')
        .update({
          read_at: new Date().toISOString(),
        })
        .eq('id', existingRead.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('comment_mentions_reads')
        .insert({
          comment_id: Number(id),
          user_id: user.id,
          read_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting read record:', error);
        throw error;
      }
      result = data;
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

