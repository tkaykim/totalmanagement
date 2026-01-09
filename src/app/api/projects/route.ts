import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';
import { canAccessProject, canCreateProject, type AppUser, type Project as PermProject } from '@/lib/permissions';

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

    // 현재 사용자 정보 가져오기
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase.from('projects').select('*').order('created_at', { ascending: false });

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

    // admin은 전체 접근
    if (currentUser.role === 'admin') {
      return NextResponse.json(projects);
    }

    // 권한에 따라 필터링
    const filteredProjects = projects?.filter((project: any) => {
      const permProject: PermProject = {
        id: project.id,
        bu_code: project.bu_code,
        pm_id: project.pm_id,
        participants: project.participants || [],
        created_by: project.created_by,
      };
      return canAccessProject(currentUser, permProject);
    }) || [];

    return NextResponse.json(filteredProjects);
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

    // partner_company_id가 있으면 추가
    if (body.partner_company_id !== undefined && body.partner_company_id !== null) {
      insertData.partner_company_id = body.partner_company_id;
    }

    // partner_worker_id가 있으면 추가
    if (body.partner_worker_id !== undefined && body.partner_worker_id !== null) {
      insertData.partner_worker_id = body.partner_worker_id;
    }

    // artist_id가 있으면 추가
    if (body.artist_id !== undefined && body.artist_id !== null) {
      insertData.artist_id = body.artist_id;
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

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
