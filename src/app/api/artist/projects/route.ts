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

    const currentUser = await getCurrentArtistUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 아티스트 역할이거나 partner_id가 있는 사용자만 접근 가능
    if (currentUser.role !== 'artist' && !currentUser.partner_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 1. 분배 파트너로 지정되고 공개된 프로젝트 조회 (partner_id가 있는 경우)
    let sharePartnerProjects: any[] = [];
    if (currentUser.partner_id) {
      const { data: partnerProjects, error: partnerError } = await supabase
        .from('projects')
        .select('*, share_partner:partners!share_partner_id(id, display_name)')
        .eq('share_partner_id', currentUser.partner_id)
        .eq('visible_to_partner', true)
        .order('created_at', { ascending: false });

      if (partnerError) throw partnerError;
      sharePartnerProjects = (partnerProjects || []).map((p: any) => ({
        ...p,
        connection_type: 'share_partner',
      }));
    }

    // 2. 기존 로직: PM이거나, 참여자이거나, 할일이 할당된 프로젝트
    const { data: allProjects, error: allError } = await supabase
      .from('projects')
      .select('*')
      .not('pm_id', 'is', null)
      .order('created_at', { ascending: false });

    if (allError) throw allError;

    // 본인에게 할당된 할일이 있는 프로젝트 ID 조회
    const { data: assignedTasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('project_id')
      .eq('assignee_id', currentUser.id);

    if (tasksError) throw tasksError;

    const assignedProjectIds = new Set(
      (assignedTasks || []).map((t: any) => t.project_id)
    );

    // 분배 파트너 프로젝트 ID 세트 (중복 제외용)
    const sharePartnerProjectIds = new Set(
      sharePartnerProjects.map((p: any) => p.id)
    );

    // 프로젝트 필터링: PM이거나, 참여자이거나, 할일이 할당된 프로젝트
    const filteredProjects = (allProjects || []).filter((project: any) => {
      // 이미 분배 파트너로 포함된 프로젝트는 제외
      if (sharePartnerProjectIds.has(project.id)) {
        return false;
      }

      // 1. 본인이 PM인 경우
      if (project.pm_id === currentUser.id) {
        return true;
      }

      // 2. 본인이 참여자인 경우
      const participants = project.participants || [];
      const isParticipant = participants.some((p: any) => p.user_id === currentUser.id);
      if (isParticipant) {
        return true;
      }

      // 3. 본인에게 할당된 할일이 있는 프로젝트인 경우
      if (assignedProjectIds.has(project.id)) {
        return true;
      }

      return false;
    });

    // connection_type 추가
    const projectsWithType = filteredProjects.map((p: any) => {
      let connectionType = 'assigned'; // 할일 할당
      if (p.pm_id === currentUser.id) {
        connectionType = 'pm';
      } else if ((p.participants || []).some((part: any) => part.user_id === currentUser.id)) {
        connectionType = 'participant';
      }
      return { ...p, connection_type: connectionType };
    });

    // 분배 파트너 프로젝트와 일반 프로젝트 합치기
    let projects = [...sharePartnerProjects, ...projectsWithType];

    // status 필터 적용
    if (status) {
      projects = projects.filter((p: any) => p.status === status);
    }

    // 상태별 분류 정보 추가
    const result = {
      projects,
      summary: {
        proposal: projects.filter((p: any) => 
          ['준비중', '기획중'].includes(p.status)
        ).length,
        in_progress: projects.filter((p: any) => 
          ['진행중', '운영중'].includes(p.status)
        ).length,
        completed: projects.filter((p: any) => 
          p.status === '완료'
        ).length,
        total: projects.length,
      }
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Artist projects API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
