import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import type { BU, FinancialKind } from '@/types/database';
import { 
  canAccessFinance, 
  canCreateFinance,
  type AppUser, 
  type FinancialEntry as PermFinancialEntry,
  type Project as PermProject 
} from '@/lib/permissions';

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
    const kind = searchParams.get('kind') as FinancialKind | null;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // 현재 사용자 정보 가져오기
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase.from('financial_entries').select('*').order('occurred_at', { ascending: false });

    if (bu) {
      query = query.eq('bu_code', bu);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (kind) {
      query = query.eq('kind', kind);
    }
    if (startDate && endDate) {
      query = query.gte('occurred_at', startDate).lte('occurred_at', endDate);
    }

    const { data: entries, error } = await query;

    if (error) throw error;

    // admin은 전체 접근
    if (currentUser.role === 'admin') {
      return NextResponse.json(entries);
    }

    // 프로젝트 정보 가져오기 (권한 체크용)
    const projectIds = [...new Set(entries?.map((e: any) => e.project_id) || [])];
    const { data: projects } = await supabase
      .from('projects')
      .select('id, bu_code, pm_id, participants')
      .in('id', projectIds);

    const projectMap = new Map(
      projects?.map((p: any) => [p.id, {
        id: p.id,
        bu_code: p.bu_code,
        pm_id: p.pm_id,
        participants: p.participants || [],
      }]) || []
    );

    // 권한에 따라 필터링
    const filteredEntries = entries?.filter((entry: any) => {
      const project = projectMap.get(entry.project_id);
      if (!project) return false;

      const permEntry: PermFinancialEntry = {
        id: entry.id,
        project_id: entry.project_id,
        bu_code: entry.bu_code,
        created_by: entry.created_by,
        kind: entry.kind,
      };

      return canAccessFinance(currentUser, permEntry, project as PermProject);
    }) || [];

    return NextResponse.json(filteredEntries);
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

    const permProject: PermProject = {
      id: project.id,
      bu_code: project.bu_code,
      pm_id: project.pm_id,
      participants: project.participants || [],
    };

    // 재무 항목 생성 권한 체크
    if (!canCreateFinance(currentUser, permProject)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('financial_entries')
      .insert({
        project_id: body.project_id,
        bu_code: body.bu_code,
        kind: body.kind,
        category: body.category,
        name: body.name,
        amount: body.amount,
        occurred_at: body.occurred_at,
        status: body.status || 'planned',
        memo: body.memo,
        partner_id: body.partner_id || null,
        payment_method: body.payment_method || null,
        actual_amount: body.actual_amount || null,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
