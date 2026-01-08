import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;
    const partnerCompanyId = searchParams.get('partner_company_id');
    const workerType = searchParams.get('worker_type');

    let query = supabase
      .from('partner_worker')
      .select('*')
      .order('created_at', { ascending: false });

    if (bu) {
      query = query.eq('bu_code', bu);
    }

    if (partnerCompanyId) {
      query = query.eq('partner_company_id', partnerCompanyId);
    }

    if (workerType) {
      query = query.eq('worker_type', workerType);
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

    const toNullIfEmpty = (value: any) =>
      value === '' || value === null || value === undefined ? null : value;

    const { data, error } = await supabase
      .from('partner_worker')
      .insert({
        partner_company_id: toNullIfEmpty(body.partner_company_id),
        bu_code: body.bu_code,
        name_en: toNullIfEmpty(body.name_en),
        name_ko: toNullIfEmpty(body.name_ko),
        name: toNullIfEmpty(body.name),
        worker_type: body.worker_type || 'employee',
        phone: toNullIfEmpty(body.phone),
        email: toNullIfEmpty(body.email),
        specialties: body.specialties || [],
        notes: toNullIfEmpty(body.notes),
        business_card_file: toNullIfEmpty(body.business_card_file),
        is_active: body.is_active !== undefined ? body.is_active : true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}



