import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';

interface ArtistUser {
  id: string;
  role: string;
  bu_code: string | null;
  name: string;
  partner_id: number | null;
}

async function getCurrentArtistUser(): Promise<ArtistUser | null> {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return null;

  const supabase = await createPureClient();
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, role, bu_code, name, partner_id')
    .eq('id', user.id)
    .single();

  return appUser as ArtistUser | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const projectId = searchParams.get('project_id');

    const currentUser = await getCurrentArtistUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 아티스트 역할이거나 partner_id가 있는 사용자만 접근 가능
    if (currentUser.role !== 'artist' && !currentUser.partner_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 1. 본인이 PM인 프로젝트 조회 (PM이 지정된 프로젝트만)
    const { data: pmProjects, error: pmError } = await supabase
      .from('projects')
      .select('id')
      .eq('pm_id', currentUser.id)
      .not('pm_id', 'is', null);

    if (pmError) throw pmError;

    const pmProjectIds = (pmProjects || []).map((p: any) => p.id);

    // 2. 본인이 PM인 프로젝트의 모든 할일 조회
    let pmTasksQuery = supabase
      .from('project_tasks')
      .select(`
        *,
        projects:project_id (
          id,
          name,
          status,
          partner_id,
          pm_id
        )
      `)
      .order('due_date', { ascending: true });

    if (pmProjectIds.length > 0) {
      pmTasksQuery = pmTasksQuery.in('project_id', pmProjectIds);
    } else {
      // PM인 프로젝트가 없으면 빈 결과
      pmTasksQuery = pmTasksQuery.eq('project_id', -1);
    }

    if (status) {
      pmTasksQuery = pmTasksQuery.eq('status', status);
    }

    if (projectId) {
      pmTasksQuery = pmTasksQuery.eq('project_id', projectId);
    }

    const { data: pmTasks, error: pmTasksError } = await pmTasksQuery;

    if (pmTasksError) throw pmTasksError;

    // 3. 본인에게 할당된 할일 조회 (PM 프로젝트가 아닌 경우)
    let assignedTasksQuery = supabase
      .from('project_tasks')
      .select(`
        *,
        projects:project_id (
          id,
          name,
          status,
          partner_id,
          pm_id
        )
      `)
      .eq('assignee_id', currentUser.id)
      .order('due_date', { ascending: true });

    // PM인 프로젝트는 제외 (중복 방지)
    if (pmProjectIds.length > 0) {
      assignedTasksQuery = assignedTasksQuery.not('project_id', 'in', `(${pmProjectIds.join(',')})`);
    }

    if (status) {
      assignedTasksQuery = assignedTasksQuery.eq('status', status);
    }

    if (projectId) {
      assignedTasksQuery = assignedTasksQuery.eq('project_id', projectId);
    }

    const { data: assignedTasks, error: assignedError } = await assignedTasksQuery;

    if (assignedError) throw assignedError;

    // PM 프로젝트의 할일 + 본인 할당 할일 병합 (중복 제거)
    const taskMap = new Map<number, any>();
    
    (pmTasks || []).forEach((t: any) => {
      taskMap.set(t.id, { ...t, access_type: 'pm' });
    });
    
    (assignedTasks || []).forEach((t: any) => {
      if (!taskMap.has(t.id)) {
        taskMap.set(t.id, { ...t, access_type: 'assigned' });
      }
    });

    const allTasks = Array.from(taskMap.values());

    // 상태별 그룹핑
    const groupedTasks = {
      todo: allTasks.filter((t: any) => t.status === 'todo'),
      in_progress: allTasks.filter((t: any) => t.status === 'in_progress'),
      done: allTasks.filter((t: any) => t.status === 'done'),
    };

    const result = {
      tasks: allTasks,
      grouped: groupedTasks,
      summary: {
        todo: groupedTasks.todo.length,
        in_progress: groupedTasks.in_progress.length,
        done: groupedTasks.done.length,
        total: allTasks.length,
        pending: groupedTasks.todo.length + groupedTasks.in_progress.length,
      }
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Artist tasks API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();
    const { taskId, status } = body;

    const currentUser = await getCurrentArtistUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 할일 조회
    const { data: task } = await supabase
      .from('project_tasks')
      .select(`
        *,
        projects:project_id (
          id,
          pm_id
        )
      `)
      .eq('id', taskId)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 권한 확인: 본인에게 할당되었거나, 본인이 해당 프로젝트의 PM인 경우
    const isAssignee = task.assignee_id === currentUser.id;
    const isPM = task.projects?.pm_id === currentUser.id;

    if (!isAssignee && !isPM) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 상태 업데이트
    const { data: updatedTask, error } = await supabase
      .from('project_tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Artist task update error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
