import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';
import { canAccessProject, canCreateProject, type AppUser, type Project as PermProject } from '@/lib/permissions';
import { createActivityLog } from '@/lib/activity-logger';
import { notifyProjectPMAssigned, createNotification } from '@/lib/notification-sender';

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
    const includeShare = searchParams.get('includeShare') === 'true';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 현재 사용자 정보 가져오기
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 분배 설정 포함 시 파트너 정보도 조회
    const selectQuery = includeShare
      ? `*, share_partner:partners!share_partner_id(id, display_name)`
      : '*';

    let query = supabase.from('projects').select(selectQuery).order('created_at', { ascending: false });

    if (bu) {
      query = query.eq('bu_code', bu);
    }

    const { data: projects, error } = await query;

    if (error) throw error;

    // participants JSONB 컬럼 초기화
    if (projects) {
      projects.forEach((project: any) => {
        if (!project.participants) {
          project.participants = [];
        }
      });
    }

    // 분배 설정 포함 시 재무 데이터도 조회
    let projectsWithFinance = projects;
    if (includeShare && projects && projects.length > 0) {
      const projectIds = projects.map((p: any) => p.id);
      
      // 재무 데이터 조회 (기간 필터 적용)
      let financeQuery = supabase
        .from('financial_entries')
        .select('project_id, kind, amount')
        .in('project_id', projectIds)
        .neq('status', 'canceled');
      
      if (startDate) {
        financeQuery = financeQuery.gte('occurred_at', startDate);
      }
      if (endDate) {
        financeQuery = financeQuery.lte('occurred_at', endDate);
      }
      
      const { data: finances } = await financeQuery;

      // 프로젝트별 매출/지출 합계 계산
      const financeMap: Record<string, { revenue: number; expense: number }> = {};
      (finances || []).forEach((f: any) => {
        if (!financeMap[f.project_id]) {
          financeMap[f.project_id] = { revenue: 0, expense: 0 };
        }
        if (f.kind === 'revenue') {
          financeMap[f.project_id].revenue += f.amount;
        } else if (f.kind === 'expense') {
          financeMap[f.project_id].expense += f.amount;
        }
      });

      // 프로젝트에 재무 데이터 추가
      projectsWithFinance = projects.map((p: any) => ({
        ...p,
        total_revenue: financeMap[p.id]?.revenue || 0,
        total_expense: financeMap[p.id]?.expense || 0,
      }));
    }

    // admin/superadmin은 전체 접근
    if (['admin', 'superadmin'].includes(currentUser.role)) {
      return NextResponse.json(includeShare ? { data: projectsWithFinance } : projectsWithFinance);
    }

    // 권한에 따라 필터링
    const filteredProjects = projectsWithFinance?.filter((project: any) => {
      // participants에서 user_id만 추출 (객체 배열인 경우)
      const participantIds = (project.participants || [])
        .map((p: any) => p.user_id)
        .filter((id: any): id is string => !!id);
      
      const permProject: PermProject = {
        id: project.id,
        bu_code: project.bu_code,
        pm_id: project.pm_id,
        participants: participantIds,
        created_by: project.created_by,
      };
      return canAccessProject(currentUser, permProject);
    }) || [];

    return NextResponse.json(includeShare ? { data: filteredProjects } : filteredProjects);
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

    // 프로젝트 생성 권한 체크
    if (!canCreateProject(currentUser)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // insert 객체 생성 (undefined인 필드는 제외)
    const insertData: any = {
      bu_code: body.bu_code,
      name: body.name,
      category: body.category || '',
      status: body.status || '준비중',
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      created_by: currentUser.id,
    };

    // description이 있으면 추가
    if (body.description !== undefined) {
      insertData.description = body.description || null;
    }

    // channel_id가 있으면 추가
    if (body.channel_id !== undefined && body.channel_id !== null) {
      insertData.channel_id = body.channel_id;
    }

    // partner_id가 있으면 추가 (partner_company_id, partner_worker_id 대신 partner_id 사용)
    if (body.partner_id !== undefined && body.partner_id !== null) {
      insertData.partner_id = body.partner_id;
    }

    // pm_id가 있으면 추가
    if (body.pm_id !== undefined && body.pm_id !== null) {
      insertData.pm_id = body.pm_id;
    }

    // participants JSONB 컬럼 추가
    if (body.participants && Array.isArray(body.participants)) {
      insertData.participants = body.participants;
    } else {
      insertData.participants = [];
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Project creation error:', error);
      throw error;
    }

    // participants가 null이면 빈 배열로 초기화
    if (!project.participants) {
      project.participants = [];
    }

    // 활동 로그 기록
    await createActivityLog({
      userId: currentUser.id,
      actionType: 'project_created',
      entityType: 'project',
      entityId: String(project.id),
      entityTitle: project.name,
      metadata: { bu_code: project.bu_code, status: project.status },
    });

    // PM이 본인이 아닌 경우 PM에게 알림 전송 (누가 지정했는지 포함)
    if (body.pm_id && body.pm_id !== currentUser.id) {
      await notifyProjectPMAssigned(body.pm_id, project.name, String(project.id), currentUser.name);
    }

    // 참여자들에게 알림 전송 (본인 제외, 누가 추가했는지 포함)
    if (body.participants && Array.isArray(body.participants)) {
      const participantIds = body.participants
        .map((p: any) => p.user_id)
        .filter((id: string) => id && id !== currentUser.id && id !== body.pm_id);
      
      for (const participantId of participantIds) {
        await createNotification({
          userId: participantId,
          title: '프로젝트에 참여하게 되었습니다',
          message: `${currentUser.name}님이 "${project.name}" 프로젝트에 참여자로 추가했습니다.`,
          type: 'info',
          entityType: 'project',
          entityId: String(project.id),
          actionUrl: '/?view=projects',
        });
      }
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
