import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU, FinancialKind } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;
    const projectId = searchParams.get('project_id');
    const kind = searchParams.get('kind') as FinancialKind | null;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

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

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();

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
        created_by: body.created_by,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


