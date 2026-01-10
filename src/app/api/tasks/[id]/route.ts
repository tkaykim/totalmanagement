import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { 
  canEditTask, 
  canDeleteTask, 
  canOnlyUpdateTaskStatus,
  type AppUser, 
  type Task as PermTask,
  type Project as PermProject 
} from '@/lib/permissions';
import { createTaskStatusChangeLog } from '@/lib/activity-logger';

async function getCurrentUser(): Promise<AppUser | null> {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return null;

  const supabase = await createPureClient();
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, role, bu_code, name, position')
    .eq('id', user.id)
    .single();

  return appUser as AppUser | null;
}

async function getTaskWithProject(supabase: any, taskId: string) {
  const { data: task } = await supabase
    .from('project_tasks')
    .select('id, project_id, bu_code, assignee_id, created_by')
    .eq('id', taskId)
    .single();

  if (!task) return null;

  const { data: project } = await supabase
    .from('projects')
    .select('id, bu_code, pm_id, participants')
    .eq('id', task.project_id)
    .single();

  if (!project) return null;

  return {
    task: {
      id: task.id,
      project_id: task.project_id,
      bu_code: task.bu_code,
      assignee_id: task.assignee_id,
      created_by: task.created_by,
    } as PermTask,
    project: {
      id: project.id,
      bu_code: project.bu_code,
      pm_id: project.pm_id,
      participants: project.participants || [],
    } as PermProject,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    // 현재 사용자 정보 가져오기
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 할일 및 프로젝트 정보 가져오기
    const taskData = await getTaskWithProject(supabase, id);
    if (!taskData) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const { task, project } = taskData;

    // 이전 상태 저장 (활동 로그용)
    const { data: oldTask } = await supabase
      .from('project_tasks')
      .select('title, status')
      .eq('id', id)
      .single();

    // 수정 권한 체크
    if (!canEditTask(currentUser, task, project)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // 상태만 수정 가능한 경우 체크
    if (canOnlyUpdateTaskStatus(currentUser, task, project)) {
      // status 외의 필드가 있으면 거부
      const allowedFields = ['status'];
      const requestedFields = Object.keys(body);
      const hasDisallowedFields = requestedFields.some(f => !allowedFields.includes(f));
      
      if (hasDisallowedFields) {
        return NextResponse.json({ error: 'You can only update task status' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('project_tasks')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 상태가 변경된 경우 활동 로그 기록
    if (body.status && oldTask?.status !== body.status) {
      await createTaskStatusChangeLog(
        currentUser.id,
        id,
        data.title || oldTask?.title || '',
        oldTask?.status || '',
        body.status
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    // 현재 사용자 정보 가져오기
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 할일 및 프로젝트 정보 가져오기
    const taskData = await getTaskWithProject(supabase, id);
    if (!taskData) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const { task, project } = taskData;

    // 삭제 권한 체크
    if (!canDeleteTask(currentUser, task, project)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { error } = await supabase.from('project_tasks').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
