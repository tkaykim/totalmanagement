import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const clientCompanyId = searchParams.get('client_company_id');

    let query = supabase.from('client_worker').select('*').order('created_at', { ascending: false });

    if (clientCompanyId) {
      query = query.eq('client_company_id', clientCompanyId);
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

    const toNullIfEmpty = (value: any) => (value === '' || value === null || value === undefined ? null : value);

    const { data, error } = await supabase
      .from('client_worker')
      .insert({
        client_company_id: toNullIfEmpty(body.client_company_id),
        name_en: toNullIfEmpty(body.name_en),
        name_ko: toNullIfEmpty(body.name_ko),
        phone: toNullIfEmpty(body.phone),
        email: toNullIfEmpty(body.email),
        business_card_file: toNullIfEmpty(body.business_card_file),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

