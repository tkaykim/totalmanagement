import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const pureSupabase = await createPureClient();

    // 현재 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 사용자 프로필 가져오기
    const { data: currentUser, error: profileError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !currentUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const userId = user.id;
    const userName = currentUser.name;

    // 1. 본인이 PM이거나 Participants인 프로젝트 조회
    const { data: allProjects, error: projectsError } = await pureSupabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectsError) throw projectsError;

    // 프로젝트 필터링: PM이거나 participants에 포함된 경우
    const relatedProjects = (allProjects || []).filter((project: any) => {
      // PM인 경우 (pm_name이 본인 이름과 일치하거나, participants에서 is_pm이 true인 경우)
      if (project.pm_name === userName) {
        return true;
      }

      // Participants에 포함된 경우
      if (project.participants && Array.isArray(project.participants)) {
        const isParticipant = project.participants.some((participant: any) => {
          // user_id가 본인인 경우
          if (participant.user_id === userId) {
            return true;
          }
          // is_pm이 true이고 user_id가 본인인 경우
          if (participant.is_pm === true && participant.user_id === userId) {
            return true;
          }
          return false;
        });
        if (isParticipant) {
          return true;
        }
      }

      return false;
    });

    // participants가 null이면 빈 배열로 초기화
    relatedProjects.forEach((project: any) => {
      if (!project.participants) {
        project.participants = [];
      }
    });

    // 2. 본인이 assignee_id인 할일 조회
    const { data: relatedTasks, error: tasksError } = await pureSupabase
      .from('project_tasks')
      .select('*')
      .eq('assignee_id', userId)
      .order('due_date', { ascending: true });

    if (tasksError) throw tasksError;

    // 3. 관련 프로젝트 ID 목록 추출
    const relatedProjectIds = relatedProjects.map((p: any) => p.id);

    // 4. 관련 프로젝트의 모든 할일 조회 (본인이 assignee가 아니더라도)
    let allRelatedTasks = relatedTasks || [];

    if (relatedProjectIds.length > 0) {
      const { data: projectTasks, error: projectTasksError } = await pureSupabase
        .from('project_tasks')
        .select('*')
        .in('project_id', relatedProjectIds)
        .order('due_date', { ascending: true });

      if (projectTasksError) throw projectTasksError;

      // 중복 제거 (본인이 assignee인 할일과 프로젝트의 할일 중복 제거)
      const taskIds = new Set(allRelatedTasks.map((t: any) => t.id));
      (projectTasks || []).forEach((task: any) => {
        if (!taskIds.has(task.id)) {
          allRelatedTasks.push(task);
        }
      });
    }

    return NextResponse.json({
      projects: relatedProjects,
      tasks: allRelatedTasks,
      user: currentUser,
    });
  } catch (error) {
    console.error('Error fetching my works:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

