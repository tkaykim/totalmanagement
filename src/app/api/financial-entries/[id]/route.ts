import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { 
  canEditFinance, 
  canDeleteFinance,
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

async function getFinanceWithProject(supabase: any, entryId: string) {
  const { data: entry } = await supabase
    .from('financial_entries')
    .select('id, project_id, bu_code, created_by, kind')
    .eq('id', entryId)
    .single();

  if (!entry) return null;

  const { data: project } = await supabase
    .from('projects')
    .select('id, bu_code, pm_id, participants')
    .eq('id', entry.project_id)
    .single();

  if (!project) return null;

  return {
    entry: {
      id: entry.id,
      project_id: entry.project_id,
      bu_code: entry.bu_code,
      created_by: entry.created_by,
      kind: entry.kind,
    } as PermFinancialEntry,
    project: {
      id: project.id,
      bu_code: project.bu_code,
      pm_id: project.pm_id,
      participants: project.participants || [],
    } as PermProject,
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

    // 재무 항목 및 프로젝트 정보 가져오기
    const financeData = await getFinanceWithProject(supabase, id);
    if (!financeData) {
      return NextResponse.json({ error: 'Financial entry not found' }, { status: 404 });
    }

    const { entry, project } = financeData;

    // 수정 권한 체크
    if (!canEditFinance(currentUser, entry, project)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('financial_entries')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
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

    // 재무 항목 및 프로젝트 정보 가져오기
    const financeData = await getFinanceWithProject(supabase, id);
    if (!financeData) {
      return NextResponse.json({ error: 'Financial entry not found' }, { status: 404 });
    }

    const { entry, project } = financeData;

    // 삭제 권한 체크
    if (!canDeleteFinance(currentUser, entry, project)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { error } = await supabase.from('financial_entries').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
