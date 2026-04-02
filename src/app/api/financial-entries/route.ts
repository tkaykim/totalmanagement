import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import type { BU, FinancialKind } from '@/types/database';
import { createActivityLog } from '@/lib/activity-logger';

async function getCurrentUserId(): Promise<string | null> {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return null;

  const supabase = await createPureClient();
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id')
    .eq('id', user.id)
    .single();

  return appUser?.id ?? null;
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

    const userId = await getCurrentUserId();
    if (!userId) {
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

    return NextResponse.json(entries);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    await createActivityLog({
      userId,
      actionType: 'financial_created',
      entityType: 'financial_entry',
      entityId: String(data.id),
      entityTitle: data.name,
      metadata: { 
        kind: body.kind,
        category: body.category,
        amount: body.amount,
        project_id: body.project_id,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
