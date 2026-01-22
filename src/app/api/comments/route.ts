import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import type { CommentEntityType } from '@/types/database';
import { notifyProjectComment, notifyTaskComment, notifyCommentMention } from '@/lib/notification-sender';

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

    const pureClient = await createPureClient();

    // 댓글 알림 전송
    if (entity_type === 'project') {
      // 프로젝트 댓글: PM과 참여자들에게 알림
      const { data: project } = await pureClient
        .from('projects')
        .select('name, pm_id, participants')
        .eq('id', entity_id)
        .single();

      if (project) {
        const targetUserIds: string[] = [];
        
        // PM 추가
        if (project.pm_id) {
          targetUserIds.push(project.pm_id);
        }
        
        // 참여자들 추가
        if (project.participants && Array.isArray(project.participants)) {
          project.participants.forEach((p: any) => {
            if (p.user_id && !targetUserIds.includes(p.user_id)) {
              targetUserIds.push(p.user_id);
            }
          });
        }

        // 댓글 작성자 본인 제외하고 알림 전송
        await notifyProjectComment(
          targetUserIds,
          appUser.data.name,
          project.name,
          String(data.id),
          user.id
        );
      }
    } else if (entity_type === 'task') {
      // 할일 댓글: 담당자에게 알림
      const { data: task } = await pureClient
        .from('project_tasks')
        .select('title, assignee_id, project_id')
        .eq('id', entity_id)
        .single();

      if (task && task.assignee_id && task.assignee_id !== user.id) {
        // 프로젝트명 조회
        const { data: project } = await pureClient
          .from('projects')
          .select('name')
          .eq('id', task.project_id)
          .single();

        await notifyTaskComment(
          task.assignee_id,
          appUser.data.name,
          task.title,
          project?.name || '프로젝트',
          String(data.id)
        );
      }
    }

    // 멘션된 사용자들에게 알림 (댓글 작성자 제외)
    if (mentionedIds.length > 0) {
      const entityTitle = entity_type === 'project' 
        ? (await pureClient.from('projects').select('name').eq('id', entity_id).single()).data?.name || '프로젝트'
        : (await pureClient.from('project_tasks').select('title').eq('id', entity_id).single()).data?.title || '할일';

      for (const mentionedUserId of mentionedIds) {
        if (mentionedUserId !== user.id) {
          await notifyCommentMention(
            mentionedUserId,
            appUser.data.name,
            entity_type as 'task' | 'project',
            entityTitle,
            String(data.id)
          );
        }
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}











