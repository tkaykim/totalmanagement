import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { getAuthContext, requireAuth, canAccessCorporateCard, unauthorizedResponse, forbiddenResponse } from '../../../_lib/gowid-client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (!canAccessCorporateCard(ctx)) return forbiddenResponse();

    const { expenseId } = await params;
    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('gowid_expense_project_link')
      .select(`
        id,
        gowid_expense_id,
        project_id,
        linked_by,
        created_at
      `)
      .eq('gowid_expense_id', Number(expenseId))
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ data: null });
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, name, bu_code')
      .eq('id', data.project_id)
      .single();

    const { data: linker } = await supabase
      .from('app_users')
      .select('name')
      .eq('id', data.linked_by)
      .single();

    return NextResponse.json({
      data: {
        ...data,
        project_name: project?.name ?? null,
        project_bu: project?.bu_code ?? null,
        linked_by_name: linker?.name ?? null,
      },
    });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Project link GET error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (!canAccessCorporateCard(ctx)) return forbiddenResponse();

    const { expenseId } = await params;
    const body = await request.json();
    const { project_id } = body as { project_id: number };

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('gowid_expense_project_link')
      .upsert(
        {
          gowid_expense_id: Number(expenseId),
          project_id,
          linked_by: ctx.userId,
        },
        { onConflict: 'gowid_expense_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Project link POST error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (!canAccessCorporateCard(ctx)) return forbiddenResponse();

    const { expenseId } = await params;
    const supabase = await createPureClient();

    const { error } = await supabase
      .from('gowid_expense_project_link')
      .delete()
      .eq('gowid_expense_id', Number(expenseId));

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Project link DELETE error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
