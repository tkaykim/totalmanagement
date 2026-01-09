import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';
import { 
  canAccessTask, 
  canCreateTask, 
  type AppUser, 
  type Task as PermTask,
  type Project as PermProject 
} from '@/lib/permissions';

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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;
    const projectId = searchParams.get('project_id');

    // 현재 사용자 정보 가져오기
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase.from('project_tasks').select('*').order('due_date', { ascending: true });

    if (bu) {
      query = query.eq('bu_code', bu);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: tasks, error } = await query;

    if (error) throw error;

    // admin은 전체 접근
    if (currentUser.role === 'admin') {
      return NextResponse.json(tasks);
    }

    // 프로젝트 정보 가져오기 (권한 체크용)
    const projectIds = [...new Set(tasks?.map((t: any) => t.project_id) || [])];
    const { data: projects } = await supabase
      .from('projects')
      .select('id, bu_code, pm_id, participants')
      .in('id', projectIds);

    const projectMap = new Map(
      projects?.map((p: any) => [p.id, {
        id: p.id,
        bu_code: p.bu_code,
        pm_id: p.pm_id,
        participants: p.participants || [],
      }]) || []
    );

    // 권한에 따라 필터링
    const filteredTasks = tasks?.filter((task: any) => {
      const project = projectMap.get(task.project_id);
      if (!project) return false;

      const permTask: PermTask = {
        id: task.id,
        project_id: task.project_id,
        bu_code: task.bu_code,
        assignee_id: task.assignee_id,
        created_by: task.created_by,
      };

      return canAccessTask(currentUser, permTask, project as PermProject);
    }) || [];

    return NextResponse.json(filteredTasks);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();

    // 현재 사용자 정보 가져오기
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 프로젝트 정보 가져오기
    const { data: project } = await supabase
      .from('projects')
      .select('id, bu_code, pm_id, participants')
      .eq('id', body.project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const permProject: PermProject = {
      id: project.id,
      bu_code: project.bu_code,
      pm_id: project.pm_id,
      participants: project.participants || [],
    };

    // 할일 생성 권한 체크
    if (!canCreateTask(currentUser, permProject)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('project_tasks')
      .insert({
        project_id: body.project_id,
        bu_code: body.bu_code,
        title: body.title,
        assignee_id: body.assignee_id,
        assignee: body.assignee,
        due_date: body.due_date,
        status: body.status || 'todo',
        priority: body.priority || 'medium',
        tag: body.tag,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
