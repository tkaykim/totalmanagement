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
      .select('*')
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
    const {
      project_id,
      expense_amount,
      expense_store_name,
      expense_date,
      card_alias,
    } = body as {
      project_id: number;
      expense_amount: number;
      expense_store_name: string;
      expense_date: string;
      card_alias?: string;
    };

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const supabase = await createPureClient();

    const { data: project } = await supabase
      .from('projects')
      .select('id, name, bu_code')
      .eq('id', project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: existingLink } = await supabase
      .from('gowid_expense_project_link')
      .select('id, financial_entry_id, project_id')
      .eq('gowid_expense_id', Number(expenseId))
      .maybeSingle();

    const financialEntryName = `[법인카드] ${expense_store_name || '카드결제'}`;
    const financialDate = expense_date
      ? `${expense_date.slice(0, 4)}-${expense_date.slice(4, 6)}-${expense_date.slice(6, 8)}`
      : new Date().toISOString().slice(0, 10);
    const financialMemo = card_alias
      ? `Gowid 법인카드 자동연동 (${card_alias})`
      : 'Gowid 법인카드 자동연동';

    let financialEntryId: number | null = null;

    if (existingLink?.financial_entry_id) {
      if (existingLink.project_id === project_id) {
        const { data: updated } = await supabase
          .from('financial_entries')
          .update({
            name: financialEntryName,
            amount: expense_amount || 0,
            occurred_at: financialDate,
            memo: financialMemo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLink.financial_entry_id)
          .select('id')
          .single();
        financialEntryId = updated?.id ?? existingLink.financial_entry_id;
      } else {
        await supabase
          .from('financial_entries')
          .delete()
          .eq('id', existingLink.financial_entry_id);

        const { data: newEntry } = await supabase
          .from('financial_entries')
          .insert({
            project_id,
            bu_code: project.bu_code,
            kind: 'expense',
            category: '법인카드',
            name: financialEntryName,
            amount: expense_amount || 0,
            occurred_at: financialDate,
            status: 'paid',
            memo: financialMemo,
            created_by: ctx.userId,
          })
          .select('id')
          .single();
        financialEntryId = newEntry?.id ?? null;
      }
    } else {
      const { data: newEntry } = await supabase
        .from('financial_entries')
        .insert({
          project_id,
          bu_code: project.bu_code,
          kind: 'expense',
          category: '법인카드',
          name: financialEntryName,
          amount: expense_amount || 0,
          occurred_at: financialDate,
          status: 'paid',
          memo: financialMemo,
          created_by: ctx.userId,
        })
        .select('id')
        .single();
      financialEntryId = newEntry?.id ?? null;
    }

    const { data: linkData, error: linkError } = await supabase
      .from('gowid_expense_project_link')
      .upsert(
        {
          gowid_expense_id: Number(expenseId),
          project_id,
          linked_by: ctx.userId,
          financial_entry_id: financialEntryId,
          expense_amount: expense_amount || null,
          expense_store_name: expense_store_name || null,
          expense_date: financialDate,
        },
        { onConflict: 'gowid_expense_id' }
      )
      .select()
      .single();

    if (linkError) throw linkError;

    return NextResponse.json({ data: linkData });
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

    const { data: existingLink } = await supabase
      .from('gowid_expense_project_link')
      .select('id, financial_entry_id')
      .eq('gowid_expense_id', Number(expenseId))
      .maybeSingle();

    if (existingLink?.financial_entry_id) {
      await supabase
        .from('financial_entries')
        .delete()
        .eq('id', existingLink.financial_entry_id);
    }

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
