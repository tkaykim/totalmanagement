import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { subDays, format } from 'date-fns';
import { canAccessTaskTemplate, canCreateTask, type AppUser, type Project as PermProject } from '@/lib/permissions';
import { createActivityLog } from '@/lib/activity-logger';
import { notifyTaskAssigned } from '@/lib/notification-sender';

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();
    const { template_id, project_id, options, base_date } = body;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAccessTaskTemplate(currentUser)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { data: template, error: templateError } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError) throw templateError;
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, bu_code, pm_id, participants, end_date')
      .eq('id', project_id)
      .single();

    if (projectError) throw projectError;
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const participantIds = (project.participants || [])
      .map((participant: any) => participant.user_id)
      .filter((id: any): id is string => !!id);

    const permProject: PermProject = {
      id: project.id,
      bu_code: project.bu_code,
      pm_id: project.pm_id,
      participants: participantIds,
    };

    if (!canCreateTask(currentUser, permProject)) {
      return NextResponse.json({ error: 'Permission denied to create tasks in this project' }, { status: 403 });
    }

    const baseDate = base_date ? new Date(base_date) : new Date(project.end_date || new Date());
    const tasks = template.tasks || [];
    const createdTasks = [];

    for (const taskDef of tasks) {
      const dueDate = subDays(baseDate, taskDef.days_before || 0);
      const dueDateStr = format(dueDate, 'yyyy-MM-dd');

      const { data: task, error: taskError } = await supabase
        .from('project_tasks')
        .insert({
          project_id: project_id,
          bu_code: project.bu_code,
          title: taskDef.title,
          assignee_id: undefined,
          assignee: undefined,
          due_date: dueDateStr,
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
        },
      });
    }

    return NextResponse.json({ tasks: createdTasks, count: createdTasks.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
