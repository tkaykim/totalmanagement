import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';
import { canAccessTaskTemplate, canCreateTask, canViewProject } from '@/lib/permissions';
import { loadPermProject } from '@/app/api/projects/_lib/access';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface GenerateTaskItem {
  title: string;
  due_date: string;
  priority: string;
  assignee_role?: string;
  assignee_id?: string;
  assignee?: string;
  manual_id?: number | null;
}

/**
 * POST /api/task-templates/generate — 템플릿으로 할일 일괄 생성.
 * - 재직 확인 → 프로젝트 보기 범위(404) → `canCreateTask`(R10: 리더는 자기 사업부 프로젝트만, 403).
 * - 할일 사업부는 프로젝트 사업부다(본문 값 무시). `created_by`는 로그인 사용자.
 */
export async function POST(request: NextRequest) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const supabase: any = await createPureClient();
    const body = await request.json().catch(() => null);
    const { template_id, project_id, tasks: taskList } = (body ?? {}) as {
      template_id: number;
      project_id: number;
      tasks: GenerateTaskItem[];
    };

    if (!canAccessTaskTemplate(appUser)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    if (!Array.isArray(taskList) || taskList.length === 0) {
      return NextResponse.json({ error: 'No tasks to create' }, { status: 400 });
    }
    if (project_id == null) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const loaded = await loadPermProject(supabase, project_id, 'name');
    if (!loaded || !canViewProject(appUser, loaded.perm)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!canCreateTask(appUser, loaded.perm)) {
      return NextResponse.json({ error: 'Permission denied to create tasks in this project' }, { status: 403 });
    }

    const taskRows = taskList.map((taskDef) => ({
      project_id: loaded.perm.id,
      bu_code: loaded.perm.bu_code,
      title: taskDef.title,
      due_date: taskDef.due_date,
      status: 'todo',
      priority: taskDef.priority || 'medium',
      manual_id: taskDef.manual_id || null,
      created_by: appUser.id,
      assignee_id: taskDef.assignee_id || null,
      assignee: taskDef.assignee || null,
    }));

    const { data: createdTasks, error: insertError } = await supabase
      .from('project_tasks')
      .insert(taskRows)
      .select();

    if (insertError) throw insertError;
    if (!createdTasks || createdTasks.length === 0) {
      return NextResponse.json({ tasks: [], count: 0 });
    }

    const occurredAt = new Date().toISOString();
    const activityRows = createdTasks.map((task: any, idx: number) => ({
      user_id: appUser.id,
      action_type: 'task_created' as const,
      entity_type: 'task' as const,
      entity_id: String(task.id),
      entity_title: task.title,
      metadata: {
        project_id: project_id,
        template_id: template_id,
        priority: taskList[idx]?.priority || 'medium',
        assignee_role: taskList[idx]?.assignee_role || null,
      },
      occurred_at: occurredAt,
    }));

    const { error: logError } = await supabase.from('activity_logs').insert(activityRows);

    if (logError) {
      console.error('Failed to create activity logs (batch):', logError);
    }

    return NextResponse.json({ tasks: createdTasks, count: createdTasks.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
