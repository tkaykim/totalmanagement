import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: allComments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      throw commentsError;
    }

    if (!allComments) {
      return NextResponse.json([]);
    }

    const comments = allComments.filter((comment) => {
      const mentionedIds = comment.mentioned_user_ids;
      if (!Array.isArray(mentionedIds)) return false;
      return mentionedIds.includes(user.id);
    });

    const { data: reads, error: readsError } = await supabase
      .from('comment_mentions_reads')
      .select('comment_id, read_at')
      .eq('user_id', user.id);

    if (readsError) {
      console.error('Error fetching reads:', readsError);
      throw readsError;
    }

    const readMap = new Map((reads || []).map((r) => [r.comment_id, r.read_at]));

    const commentsWithReadStatus = comments.map((comment) => ({
      ...comment,
      is_read: readMap.has(comment.id),
      read_at: readMap.get(comment.id) || null,
    }));

    return NextResponse.json(commentsWithReadStatus);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

