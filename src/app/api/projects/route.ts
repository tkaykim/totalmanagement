import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;

    let query = supabase.from('projects').select('*').order('created_at', { ascending: false });

    if (bu) {
      query = query.eq('bu_code', bu);
    }

    const { data: projects, error } = await query;

    if (error) throw error;

    // participants JSONB 컬럼이 이미 포함되어 있으므로 별도 조회 불필요
    // 각 프로젝트의 participants가 null이면 빈 배열로 초기화
    if (projects) {
      projects.forEach((project: any) => {
        if (!project.participants) {
          project.participants = [];
        }
      });
    }

    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const { createClient } = await import('@/lib/supabase/server');
    const authSupabase = await createClient();
    const body = await request.json();

    // 현재 로그인한 사용자 정보 가져오기
    const { data: { user } } = await authSupabase.auth.getUser();
    const userId = user?.id || null;

    // insert 객체 생성 (undefined인 필드는 제외)
    const insertData: any = {
      bu_code: body.bu_code,
      name: body.name,
      category: body.category || '',
      status: body.status || '준비중',
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      created_by: userId || body.created_by || null,
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


