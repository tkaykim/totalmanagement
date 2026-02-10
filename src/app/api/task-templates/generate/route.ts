import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { canAccessTaskTemplate, canCreateTask, type AppUser, type Project as PermProject } from '@/lib/permissions';
import { createActivityLog } from '@/lib/activity-logger';

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

interface GenerateTaskItem {
  title: string;
  due_date: string;
  priority: string;
  assignee_role?: string;
  manual_id?: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();
    const { template_id, project_id, tasks: taskList } = body as {
      template_id: number;
      project_id: number;
      tasks: GenerateTaskItem[];
    };

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAccessTaskTemplate(currentUser)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    if (!taskList || taskList.length === 0) {
      return NextResponse.json({ error: 'No tasks to create' }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, bu_code, pm_id, participants')
      .eq('id', project_id)
      .single();

    if (projectError) throw projectError;
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const participantIds = (project.participants || [])
      .map((participant: { user_id?: string }) => participant.user_id)
      .filter((id: string | undefined): id is string => !!id);

    const permProject: PermProject = {
      id: project.id,
      bu_code: project.bu_code,
      pm_id: project.pm_id,
      participants: participantIds,
    };

    if (!canCreateTask(currentUser, permProject)) {
      return NextResponse.json({ error: 'Permission denied to create tasks in this project' }, { status: 403 });
    }

    const createdTasks = [];

    for (const taskDef of taskList) {
      const { data: task, error: taskError } = await supabase
        .from('project_tasks')
        .insert({
          project_id: project_id,
          bu_code: project.bu_code,
          title: taskDef.title,
          due_date: taskDef.due_date,
          status: 'todo',
          priority: taskDef.priority || 'medium',
          manual_id: taskDef.manual_id || null,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (taskError) throw taskError;
      createdTasks.push(task);

      await createActivityLog({
        userId: currentUser.id,
        actionType: 'task_created',
        entityType: 'task',
        entityId: String(task.id),
        entityTitle: task.title,
        metadata: {
          project_id: project_id,
          template_id: template_id,
          priority: taskDef.priority || 'medium',
          assignee_role: taskDef.assignee_role || null,
        },
      });
    }

    return NextResponse.json({ tasks: createdTasks, count: createdTasks.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
