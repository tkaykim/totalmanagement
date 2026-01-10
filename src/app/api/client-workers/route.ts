import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

// partners 테이블에서 entity_type이 'person'인 항목 중 조직에 속한 담당자 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const clientCompanyId = searchParams.get('client_company_id');

    // partner_relations 테이블을 통해 조직에 속한 개인 조회
    let query = supabase
      .from('partners')
      .select('*')
      .eq('entity_type', 'person')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // 하위 호환성을 위해 필드 매핑
    const mappedData = data?.map(item => ({
      id: item.id,
      bu_code: item.owner_bu_code,
      name_ko: item.name_ko || item.display_name,
      name_en: item.name_en,
      phone: item.phone,
      email: item.email,
      partner_company_id: item.metadata?.partner_company_id || null,
      is_active: item.is_active,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })) || [];

    // clientCompanyId가 지정된 경우 필터링 (metadata에서)
    const filteredData = clientCompanyId
      ? mappedData.filter(item => String(item.partner_company_id) === clientCompanyId)
      : mappedData;

    return NextResponse.json(filteredData);
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
        .from('partners')
        .select('owner_bu_code')
        .eq('id', partnerCompanyId)
        .single();
      buCode = company?.owner_bu_code;
    }

    if (!buCode) {
      return NextResponse.json({ error: 'bu_code is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('partners')
      .insert({
        display_name: body.name_ko || body.name_en || 'Unnamed',
        name_ko: toNullIfEmpty(body.name_ko),
        name_en: toNullIfEmpty(body.name_en),
        entity_type: 'person',
        owner_bu_code: buCode,
        phone: toNullIfEmpty(body.phone),
        email: toNullIfEmpty(body.email),
        metadata: {
          partner_company_id: toNullIfEmpty(partnerCompanyId),
          business_card_file: toNullIfEmpty(body.business_card_file),
        },
        is_active: true,
        security_level: 'bu_only',
        sharing_policy: 'owner_only',
      })
      .select()
      .single();

    if (error) throw error;

    // 하위 호환성을 위해 필드 매핑
    const mappedData = {
      id: data.id,
      bu_code: data.owner_bu_code,
      name_ko: data.name_ko || data.display_name,
      name_en: data.name_en,
      phone: data.phone,
      email: data.email,
      partner_company_id: data.metadata?.partner_company_id || null,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return NextResponse.json(mappedData);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
