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
import { createActivityLog, createTaskAssignedLog } from '@/lib/activity-logger';

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

    // BU 필터가 있어도 본인에게 할당된 할일은 항상 포함되도록 함
    // 1. BU 필터가 있는 경우: 해당 BU의 할일 조회
    // 2. 본인에게 할당된 할일 조회 (BU와 무관)
    // 두 결과를 병합하여 중복 제거
    
    let tasks: any[] = [];
    
    if (bu) {
      // BU 필터가 있는 경우: 해당 BU 할일 + 본인 할당 할일을 병합
      let buQuery = supabase.from('project_tasks').select('*');
      buQuery = buQuery.eq('bu_code', bu);
      if (projectId) {
        buQuery = buQuery.eq('project_id', projectId);
      }
      
      const { data: buTasks, error: buError } = await buQuery;
      if (buError) throw buError;
      
      // 본인에게 할당된 할일 조회 (다른 BU 포함)
      let assignedQuery = supabase.from('project_tasks').select('*');
      assignedQuery = assignedQuery.eq('assignee_id', currentUser.id);
      if (projectId) {
        assignedQuery = assignedQuery.eq('project_id', projectId);
      }
      
      const { data: assignedTasks, error: assignedError } = await assignedQuery;
      if (assignedError) throw assignedError;
      
      // 병합 및 중복 제거
      const taskMap = new Map<number, any>();
      (buTasks || []).forEach((t: any) => taskMap.set(t.id, t));
      (assignedTasks || []).forEach((t: any) => taskMap.set(t.id, t));
      tasks = Array.from(taskMap.values());
    } else if (projectId) {
      // 프로젝트 ID만 있는 경우
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      tasks = data || [];
    } else {
      // 필터 없는 경우: 전체 조회
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*');
      if (error) throw error;
      tasks = data || [];
    }
    
    // 정렬
    tasks.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

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
      projects?.map((p: any) => {
        // participants에서 user_id만 추출 (객체 배열인 경우)
        const participantIds = (p.participants || [])
          .map((participant: any) => participant.user_id)
          .filter((id: any): id is string => !!id);
        
        return [p.id, {
          id: p.id,
          bu_code: p.bu_code,
          pm_id: p.pm_id,
          participants: participantIds,
        }];
      }) || []
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

    // participants에서 user_id만 추출 (객체 배열인 경우)
    const participantIds = (project.participants || [])
      .map((participant: any) => participant.user_id)
      .filter((id: any): id is string => !!id);

    const permProject: PermProject = {
      id: project.id,
      bu_code: project.bu_code,
      pm_id: project.pm_id,
      participants: participantIds,
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

    // 활동 로그 기록 - 생성자
    await createActivityLog({
      userId: currentUser.id,
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

    // 담당자가 생성자와 다르면 담당자에게도 활동 로그 기록
    if (body.assignee_id && body.assignee_id !== currentUser.id) {
      await createTaskAssignedLog(
        body.assignee_id,
        String(data.id),
        data.title,
        currentUser.id
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
