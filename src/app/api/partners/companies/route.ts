import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;
    const partnerType = searchParams.get('partner_type');

    let query = supabase
      .from('partner_company')
      .select('*')
      .order('created_at', { ascending: false });

    if (bu) {
      query = query.eq('bu_code', bu);
    }

    if (partnerType) {
      query = query.eq('partner_type', partnerType);
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
      .from('partner_company')
      .insert({
        bu_code: body.bu_code,
        company_name_en: toNullIfEmpty(body.company_name_en),
        company_name_ko: toNullIfEmpty(body.company_name_ko),
        industry: toNullIfEmpty(body.industry),
        business_registration_number: toNullIfEmpty(body.business_registration_number),
        representative_name: toNullIfEmpty(body.representative_name),
        partner_type: body.partner_type || 'client',
        status: body.status || 'active',
        last_meeting_date: toNullIfEmpty(body.last_meeting_date),
        business_registration_file: toNullIfEmpty(body.business_registration_file),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}



