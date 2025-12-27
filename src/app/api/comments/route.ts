import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CommentEntityType } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entity_type') as CommentEntityType | null;
    const entityId = searchParams.get('entity_id');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entity_type and entity_id are required' },
        { status: 400 }
      );
    }

    if (entityType !== 'task' && entityType !== 'project') {
      return NextResponse.json(
        { error: 'entity_type must be "task" or "project"' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appUser = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (appUser.error || !appUser.data) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { entity_type, entity_id, content, mentioned_user_ids } = body;

    if (!entity_type || !entity_id || !content) {
      return NextResponse.json(
        { error: 'entity_type, entity_id, and content are required' },
        { status: 400 }
      );
    }

    if (entity_type !== 'task' && entity_type !== 'project') {
      return NextResponse.json(
        { error: 'entity_type must be "task" or "project"' },
        { status: 400 }
      );
    }

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

    const mentionedIds = Array.isArray(mentioned_user_ids) ? mentioned_user_ids : [];

    const { data, error } = await supabase
      .from('comments')
      .insert({
        entity_type,
        entity_id: Number(entity_id),
        content: content.trim(),
        author_id: user.id,
        author_name: appUser.data.name,
        mentioned_user_ids: mentionedIds,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}



