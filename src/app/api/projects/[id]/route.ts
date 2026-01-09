import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { canEditProject, canDeleteProject, type AppUser, type Project as PermProject } from '@/lib/permissions';

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
  
  return {
    id: project.id,
    bu_code: project.bu_code,
    pm_id: project.pm_id,
    participants: project.participants || [],
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

    // 프로젝트 정보 가져오기
    const project = await getProject(supabase, id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 수정 권한 체크
    if (!canEditProject(currentUser, project)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // undefined 필드는 제외하고 update 객체 생성
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    Object.keys(body).forEach((key) => {
      if (body[key] !== undefined) {
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
