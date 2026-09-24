import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';
import {
  canCreateTask,
  canEditTask,
  canDeleteTask,
  canOnlyUpdateTaskStatus,
  canViewTask,
  type Task as PermTask,
  type Project as PermProject,
} from '@/lib/permissions';
import { createTaskStatusChangeLog } from '@/lib/activity-logger';
import { notifyTaskAssigned, notifyTaskStatusChange } from '@/lib/notification-sender';
import { loadPermProject, pickAllowed } from '@/app/api/projects/_lib/access';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * PATCH 허용 컬럼 (R4). `bu_code`는 받지 않는다 — 할일 사업부는 소속 프로젝트가 정한다(R5).
 * `id`, `created_by`, `created_at`, `updated_at` 등은 무시한다.
 */
const TASK_PATCH_COLUMNS = [
  'project_id', 'title', 'description', 'assignee_id', 'assignee',
  'due_date', 'status', 'priority', 'tag', 'manual_id',
] as const;

async function loadTaskContext(supabase: any, taskId: string) {
  const { data: task, error } = await supabase
    .from('project_tasks')
    .select('id, project_id, bu_code, assignee_id, created_by, title, status')
    .eq('id', taskId)
    .maybeSingle();
  if (error) throw error;
  if (!task) return null;

  const loaded = await loadPermProject(supabase, task.project_id, 'name');
  if (!loaded) return null;

  return {
    task: {
      id: task.id,
      project_id: task.project_id,
      bu_code: task.bu_code,
      assignee_id: task.assignee_id,
      created_by: task.created_by,
    } as PermTask,
    project: loaded.perm as PermProject,
    projectName: loaded.row.name as string | undefined,
    oldStatus: task.status as string | undefined,
    oldTitle: task.title as string | undefined,
    oldAssigneeId: task.assignee_id as string | null,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const supabase: any = await createPureClient();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const ctx = await loadTaskContext(supabase, id);
    if (!ctx || !canViewTask(appUser, ctx.task, ctx.project)) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const { task, project, projectName, oldStatus, oldTitle, oldAssigneeId } = ctx;

    if (!canEditTask(appUser, task, project)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const picked = pickAllowed(body, TASK_PATCH_COLUMNS);

    // 배정자(상태만 수정 가능)는 status 외 칸을 바꿀 수 없다. 사업부 칸은 원래 무시하므로 판정에서 뺀다.
    if (canOnlyUpdateTaskStatus(appUser, task, project)) {
      const disallowed = Object.keys(body).filter((f) => f !== 'status' && f !== 'bu_code');
      if (disallowed.length > 0) {
        return NextResponse.json({ error: 'You can only update task status' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {
      ...picked,
      updated_at: new Date().toISOString(),
    };

    // 다른 프로젝트로 이동: 새 프로젝트 사업부를 쓴다(R5). 리더는 새 프로젝트도 자기 사업부여야 한다(R10).
    let targetProjectName = projectName;
    if ('project_id' in picked && String(picked.project_id) !== String(task.project_id)) {
      const target = picked.project_id == null ? null : await loadPermProject(supabase, picked.project_id as any, 'name');
      if (!target) {
        return NextResponse.json({ error: '옮길 프로젝트를 찾을 수 없습니다.' }, { status: 400 });
      }
      if (!canCreateTask(appUser, target.perm)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
      updateData.project_id = target.perm.id;
      updateData.bu_code = target.perm.bu_code;
      targetProjectName = target.row.name;
    } else {
      delete updateData.project_id;
    }

    if (picked.status !== undefined) {
      updateData.status = picked.status === 'on-hold' ? 'on_hold' : picked.status;
    }

    const { data, error } = await supabase
      .from('project_tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const newStatus = picked.status as string | undefined;
    if (newStatus && oldStatus !== newStatus) {
      createTaskStatusChangeLog(appUser.id, id, data.title || oldTitle || '', oldStatus || '', newStatus).catch(
        console.error
      );

      const statusRecipientIds: string[] = [];
      if (data.assignee_id) statusRecipientIds.push(data.assignee_id);
      if (data.created_by) statusRecipientIds.push(data.created_by);
      if (project.pm_id) statusRecipientIds.push(project.pm_id);
      const { data: taskCommentRows } = await supabase
        .from('comments')
        .select('author_id')
        .eq('entity_type', 'task')
        .eq('entity_id', Number(id));
      const taskCommenterIds = [...new Set((taskCommentRows || []).map((r: { author_id: string }) => r.author_id))];
      taskCommenterIds.forEach((uid) => {
        if (uid && !statusRecipientIds.includes(uid as string)) statusRecipientIds.push(uid as string);
      });
      if (statusRecipientIds.length > 0) {
        notifyTaskStatusChange(
          statusRecipientIds,
          data.title || oldTitle || '',
          targetProjectName || '',
          id,
          oldStatus || '',
          newStatus,
          appUser.name,
          appUser.id
        ).catch(console.error);
      }
    }

    const newAssignee = picked.assignee_id as string | undefined;
    if (newAssignee && newAssignee !== oldAssigneeId && newAssignee !== appUser.id) {
      notifyTaskAssigned(newAssignee, data.title || oldTitle || '', targetProjectName || '', id, appUser.name).catch(
        console.error
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const supabase: any = await createPureClient();
    const { id } = await params;

    const ctx = await loadTaskContext(supabase, id);
    if (!ctx || !canViewTask(appUser, ctx.task, ctx.project)) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!canDeleteTask(appUser, ctx.task, ctx.project)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { error } = await supabase.from('project_tasks').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
