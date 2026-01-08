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

    // artist_id가 없거나 role이 artist가 아니면 오류
    if (!currentUser.artist_id || currentUser.role !== 'artist') {
      return NextResponse.json({ error: 'User is not an artist' }, { status: 403 });
    }

    // 아티스트 정보 조회
    const { data: artist, error: artistError } = await pureSupabase
      .from('artists')
      .select('*')
      .eq('id', currentUser.artist_id)
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // 아티스트와 관련된 프로젝트 조회
    // 1. artist_id로 직접 연결된 프로젝트
    // 2. pm_name이 아티스트 이름과 일치하는 프로젝트
    // 3. participants에서 user_id가 현재 사용자 ID인 프로젝트
    const { data: allProjects, error: projectsError } = await pureSupabase
      .from('projects')
      .select('*')
      .eq('bu_code', 'GRIGO')
      .order('created_at', { ascending: false });

    if (projectsError) throw projectsError;

    // 프로젝트 필터링
    const relatedProjects = (allProjects || []).filter((project: any) => {
      // 1. artist_id로 연결
      if (project.artist_id === currentUser.artist_id) {
        return true;
      }

      // 2. pm_name으로 연결
      if (project.pm_name === artist.name) {
        return true;
      }

      // 3. participants에서 user_id로 연결
      if (project.participants && Array.isArray(project.participants)) {
        const isParticipant = project.participants.some((participant: any) => {
          return participant.user_id === user.id;
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

    // 프로젝트 ID 목록
    const projectIds = relatedProjects.map((p: any) => p.id);

    // 정산 정보 조회
    let financialEntries: any[] = [];
    if (projectIds.length > 0) {
      const { data: financials, error: financialError } = await pureSupabase
        .from('financial_entries')
        .select('*')
        .in('project_id', projectIds)
        .order('occurred_at', { ascending: false });

      if (!financialError && financials) {
        financialEntries = financials;
      }
    }

    // 정산 요약 계산
    const revenue = financialEntries
      .filter((f) => f.kind === 'revenue')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    const expense = financialEntries
      .filter((f) => f.kind === 'expense')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    const profit = revenue - expense;

    // 프로젝트별 정산 요약
    const financialByProject = projectIds.map((projectId: number) => {
      const project = relatedProjects.find((p: any) => p.id === projectId);
      const projectFinancials = financialEntries.filter((f) => f.project_id === projectId);
      const projectRevenue = projectFinancials
        .filter((f) => f.kind === 'revenue')
        .reduce((sum, f) => sum + (f.amount || 0), 0);
      const projectExpense = projectFinancials
        .filter((f) => f.kind === 'expense')
        .reduce((sum, f) => sum + (f.amount || 0), 0);
      const projectProfit = projectRevenue - projectExpense;

      return {
        projectId,
        projectName: project?.name || '',
        revenue: projectRevenue,
        expense: projectExpense,
        profit: projectProfit,
      };
    });

    return NextResponse.json({
      artist,
      projects: relatedProjects,
      financialSummary: {
        totalRevenue: revenue,
        totalExpense: expense,
        totalProfit: profit,
        byProject: financialByProject,
      },
      financialEntries,
    });
  } catch (error) {
    console.error('Error fetching artist profile:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}







