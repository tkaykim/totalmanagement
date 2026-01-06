import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

// 하위 호환성을 위해 client_worker 대신 partner_worker 사용 (worker_type='employee' 필터링)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const clientCompanyId = searchParams.get('client_company_id');

    let query = supabase
      .from('partner_worker')
      .select('*')
      .eq('worker_type', 'employee')
      .order('created_at', { ascending: false });

    if (clientCompanyId) {
      query = query.eq('partner_company_id', clientCompanyId);
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

    // client_company_id를 partner_company_id로 매핑
    const partnerCompanyId = body.client_company_id || body.partner_company_id;

    // bu_code 가져오기
    let buCode = body.bu_code;
    if (!buCode && partnerCompanyId) {
      const { data: company } = await supabase
        .from('partner_company')
        .select('bu_code')
        .eq('id', partnerCompanyId)
        .single();
      buCode = company?.bu_code;
    }

    if (!buCode) {
      return NextResponse.json({ error: 'bu_code is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('partner_worker')
      .insert({
        partner_company_id: toNullIfEmpty(partnerCompanyId),
        bu_code: buCode,
        name_en: toNullIfEmpty(body.name_en),
        name_ko: toNullIfEmpty(body.name_ko),
        worker_type: 'employee',
        phone: toNullIfEmpty(body.phone),
        email: toNullIfEmpty(body.email),
        business_card_file: toNullIfEmpty(body.business_card_file),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

