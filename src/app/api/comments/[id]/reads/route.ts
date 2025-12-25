import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: reads, error: readsError } = await supabase
      .from('comment_mentions_reads')
      .select('id, read_at, user_id')
      .eq('comment_id', id)
      .order('read_at', { ascending: false });

    if (readsError) throw readsError;

    if (!reads || reads.length === 0) {
      return NextResponse.json([]);
    }

    const userIds = reads.map((r) => r.user_id);
    const { data: users, error: usersError } = await supabase
      .from('app_users')
      .select('id, name, email')
      .in('id', userIds);

    if (usersError) throw usersError;

    const userMap = new Map(users?.map((u) => [u.id, u]) || []);

    const result = reads.map((read) => ({
      id: read.id,
      read_at: read.read_at,
      user_id: read.user_id,
      user: userMap.get(read.user_id) || null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

