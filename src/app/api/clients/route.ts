import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';

// 하위 호환성을 위해 client_company 대신 partner_company 사용 (partner_type='client' 필터링)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;

    let query = supabase
      .from('partner_company')
      .select('*')
      .eq('partner_type', 'client')
      .order('created_at', { ascending: false });

    if (bu) {
      query = query.eq('bu_code', bu);
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

    // 빈 문자열을 null로 변환하는 헬퍼 함수
    const toNullIfEmpty = (value: any) => (value === '' || value === null || value === undefined ? null : value);

    const { data, error } = await supabase
      .from('partner_company')
      .insert({
        bu_code: body.bu_code,
        company_name_en: toNullIfEmpty(body.company_name_en),
        company_name_ko: toNullIfEmpty(body.company_name_ko),
        industry: toNullIfEmpty(body.industry),
        business_registration_number: toNullIfEmpty(body.business_registration_number),
        representative_name: toNullIfEmpty(body.representative_name),
        partner_type: 'client', // 클라이언트로 고정
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






