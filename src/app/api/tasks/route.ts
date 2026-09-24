import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';
import { canCreateTask, canViewProject, canViewTask, type Task as PermTask, type Project as PermProject } from '@/lib/permissions';
import { isBuCode } from '@/lib/business-units';
import { createActivityLog, createTaskAssignedLog } from '@/lib/activity-logger';
import { notifyTaskAssigned } from '@/lib/notification-sender';
import { loadPermProject, PERM_PROJECT_COLUMNS, toPermProject } from '@/app/api/projects/_lib/access';
import { fetchAllRows } from '@/lib/supabase/fetch-all';

/* eslint-disable @typescript-eslint/no-explicit-any */

const TASK_SELECT = '*, creator:app_users!project_tasks_created_by_fkey(name)';

/**
 * GET /api/tasks
 * - 보기 범위(R7·R8): 관리자·리더 전체, 일반 직원은 볼 수 있는 프로젝트의 할일 + 본인 배정 할일(`canViewTask`).
 * - `bu`가 있으면 그 사업부 할일 + 본인 배정 할일(다른 사업부 포함)을 준다(기존 동작).
 * - 1,000행 절단 없이 끝까지 읽는다.
 */
export async function GET(request: NextRequest) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const supabase: any = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const buParam = searchParams.get('bu');
    const bu = isBuCode(buParam) ? buParam : null;
    const projectId = searchParams.get('project_id');

    const base = () => {
      let q = supabase.from('project_tasks').select(TASK_SELECT).order('id', { ascending: true });
      if (projectId) q = q.eq('project_id', projectId);
      return q;
    };

    let tasks: any[];
    if (bu) {
      const [buTasks, assignedTasks] = await Promise.all([
        fetchAllRows<any>((from, to) => base().eq('bu_code', bu).range(from, to)),
        fetchAllRows<any>((from, to) => base().eq('assignee_id', appUser.id).range(from, to)),
      ]);
      const taskMap = new Map<string, any>();
      buTasks.forEach((t) => taskMap.set(String(t.id), t));
      assignedTasks.forEach((t) => taskMap.set(String(t.id), t));
      tasks = Array.from(taskMap.values());
    } else {
      tasks = await fetchAllRows<any>((from, to) => base().range(from, to));
    }

    // 보기 판정용 프로젝트: id 수백 개를 `.in()`에 넣지 않고 끝까지 읽어 맵으로 쓴다(URL 길이 한도)
    const projectMap = new Map<string, PermProject>();
    if (tasks.length > 0) {
      const projects = projectId
        ? (await supabase.from('projects').select(PERM_PROJECT_COLUMNS).eq('id', projectId)).data ?? []
        : await fetchAllRows<any>((from, to) =>
            supabase.from('projects').select(PERM_PROJECT_COLUMNS).order('id', { ascending: true }).range(from, to)
          );
      for (const p of projects) projectMap.set(String(p.id), toPermProject(p));
    }

    const visible = tasks.filter((task) => {
      const project = projectMap.get(String(task.project_id));
      if (!project) return false;
      const permTask: PermTask = {
        id: task.id,
        project_id: task.project_id,
        bu_code: task.bu_code,
        assignee_id: task.assignee_id,
        created_by: task.created_by,
      };
      return canViewTask(appUser, permTask, project);
    });

    visible.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    return NextResponse.json(visible);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/tasks
 * - 할일 사업부는 프로젝트 사업부다(본문 `bu_code` 무시, R5).
 * - 리더는 자기 사업부 프로젝트에만 만든다(R10, `canCreateTask`).
 */
export async function POST(request: NextRequest) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const supabase: any = await createPureClient();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || body.project_id == null) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const loaded = await loadPermProject(supabase, body.project_id, 'name');
    // 볼 수 없는 프로젝트는 존재 여부를 알리지 않는다(spec 15절)
    if (!loaded || !canViewProject(appUser, loaded.perm)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const permProject = loaded.perm;

    if (!canCreateTask(appUser, permProject)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const taskStatus = body.status || 'todo';
    const statusDb = taskStatus === 'on-hold' ? 'on_hold' : taskStatus;

    const { data, error } = await supabase
      .from('project_tasks')
      .insert({
        project_id: body.project_id,
        bu_code: permProject.bu_code,
        title: body.title,
        description: body.description,
        assignee_id: body.assignee_id,
        assignee: body.assignee,
        due_date: body.due_date,
        status: statusDb,
        priority: body.priority || 'medium',
        tag: body.tag,
        manual_id: body.manual_id ?? null,
        created_by: appUser.id,
      })
      .select()
      .single();

    if (error) throw error;

    await createActivityLog({
      userId: appUser.id,
      actionType: 'task_created',
      entityType: 'task',
      entityId: String(data.id),
      entityTitle: data.title,
      metadata: {
        project_id: body.project_id,
        assignee_id: body.assignee_id,
        priority: body.priority || 'medium',
      },
    });

    if (body.assignee_id && body.assignee_id !== appUser.id) {
      await createTaskAssignedLog(body.assignee_id, String(data.id), data.title, appUser.id);
      await notifyTaskAssigned(body.assignee_id, data.title, loaded.row.name, String(data.id), appUser.name);
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
