import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { canEditProject, canDeleteProject, type AppUser, type Project as PermProject } from '@/lib/permissions';
import { createActivityLog, createProjectStatusChangeLog } from '@/lib/activity-logger';
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

async function getProject(supabase: any, id: string): Promise<PermProject | null> {
  const { data: project } = await supabase
    .from('projects')
    .select('id, bu_code, pm_id, participants, created_by')
    .eq('id', id)
    .single();
  
  if (!project) return null;
  
  // participants에서 user_id만 추출 (객체 배열인 경우)
  const participantIds = (project.participants || [])
    .map((p: any) => p.user_id)
    .filter((id: any): id is string => !!id);
  
  return {
    id: project.id,
    bu_code: project.bu_code,
    pm_id: project.pm_id,
    participants: participantIds,
    created_by: project.created_by,
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

    // 프로젝트 정보 가져오기 (이전 상태 저장)
    const project = await getProject(supabase, id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 이전 상태 저장 (활동 로그용)
    const { data: oldProject } = await supabase
      .from('projects')
      .select('name, status')
      .eq('id', id)
      .single();

    // 수정 권한 체크
    if (!canEditProject(currentUser, project)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // 유효한 컬럼만 업데이트 (존재하지 않는 컬럼 제외)
    const validColumns = [
      'bu_code', 'name', 'category', 'status', 'start_date', 'end_date',
      'description', 'channel_id', 'pm_id', 'partner_id', 'participants'
    ];
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    Object.keys(body).forEach((key) => {
      if (body[key] !== undefined && validColumns.includes(key)) {
        updateData[key] = body[key];
      }
    });

    const { data: updatedProject, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Project update error:', error);
      throw error;
    }

    // participants가 null이면 빈 배열로 초기화
    if (!updatedProject.participants) {
      updatedProject.participants = [];
    }

    // 활동 로그 기록
    if (body.status && oldProject?.status !== body.status) {
      // 상태 변경 로그
      await createProjectStatusChangeLog(
        currentUser.id,
        id,
        updatedProject.name,
        oldProject?.status || '',
        body.status
      );
    } else {
      // 일반 수정 로그
      await createActivityLog({
        userId: currentUser.id,
        actionType: 'project_updated',
        entityType: 'project',
        entityId: id,
        entityTitle: updatedProject.name,
        metadata: { updated_fields: Object.keys(body) },
      });
    }

    // PM이 변경된 경우 새 PM에게 알림 전송 (누가 지정했는지 포함)
    if (body.pm_id && body.pm_id !== project.pm_id && body.pm_id !== currentUser.id) {
      await notifyProjectPMAssigned(body.pm_id, updatedProject.name, id, currentUser.name);
    }

    // 참여자가 추가된 경우 알림 전송 (누가 추가했는지 포함)
    if (body.participants && Array.isArray(body.participants)) {
      const newParticipantIds = body.participants
        .map((p: any) => p.user_id)
        .filter((pid: string) => pid && !project.participants.includes(pid) && pid !== currentUser.id && pid !== body.pm_id);
      
      for (const participantId of newParticipantIds) {
        await createNotification({
          userId: participantId,
          title: '프로젝트에 참여하게 되었습니다',
          message: `${currentUser.name}님이 "${updatedProject.name}" 프로젝트에 참여자로 추가했습니다.`,
          type: 'info',
          entityType: 'project',
          entityId: id,
          actionUrl: '/?view=projects',
        });
      }
    }

    return NextResponse.json(updatedProject);
  } catch (error: any) {
    console.error('Failed to update project:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
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

    // 프로젝트 정보 가져오기
    const project = await getProject(supabase, id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 삭제 권한 체크
    if (!canDeleteProject(currentUser, project)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
