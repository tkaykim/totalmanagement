import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';

async function getCurrentUserId(): Promise<string | null> {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('Artist notifications GET error:', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }

    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    const notifications = (rows ?? []).map((n: { id: number; user_id: string; type: string; title: string; message?: string | null; read?: boolean; data?: unknown; created_at: string; [k: string]: unknown }) => {
      const { read, message, ...rest } = n;
      return {
        ...rest,
        is_read: read ?? false,
        body: message ?? null,
        data: n.data ?? {},
      };
    });

    return NextResponse.json({
      notifications,
      unread_count: unreadCount ?? 0,
    });
  } catch (err) {
    console.error('Artist notifications API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids : [body?.id].filter(Boolean);
    const markAll = body?.mark_all === true;

    const supabase = await createPureClient();

    if (markAll) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Artist notifications PATCH (mark all) error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: 'ids or mark_all required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .in('id', ids);

    if (error) {
      console.error('Artist notifications PATCH error:', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Artist notifications API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
