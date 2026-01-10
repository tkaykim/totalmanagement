import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';

// partners 테이블에서 entity_type이 'organization'이고 client 카테고리인 항목 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;

    let query = supabase
      .from('partners')
      .select(`
        *,
        partner_category_mappings!inner(
          partner_categories!inner(name)
        )
      `)
      .eq('entity_type', 'organization')
      .eq('partner_category_mappings.partner_categories.name', 'client')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (bu) {
      query = query.eq('owner_bu_code', bu);
    }

    const { data, error } = await query;

    if (error) {
      // 조인 에러 시 간단한 쿼리로 fallback
      const fallbackQuery = supabase
        .from('partners')
        .select('*')
        .eq('entity_type', 'organization')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (bu) {
        fallbackQuery.eq('owner_bu_code', bu);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) throw fallbackError;

      // 하위 호환성을 위해 필드 매핑
      const mappedData = fallbackData?.map(item => ({
        id: item.id,
        bu_code: item.owner_bu_code,
        company_name_ko: item.name_ko || item.display_name,
        company_name_en: item.name_en,
        industry: item.metadata?.industry || null,
        representative_name: item.metadata?.representative_name || null,
        status: item.is_active ? 'active' : 'inactive',
        created_at: item.created_at,
        updated_at: item.updated_at,
      })) || [];

      return NextResponse.json(mappedData);
    }

    // 하위 호환성을 위해 필드 매핑
    const mappedData = data?.map(item => ({
      id: item.id,
      bu_code: item.owner_bu_code,
      company_name_ko: item.name_ko || item.display_name,
      company_name_en: item.name_en,
      industry: item.metadata?.industry || null,
      representative_name: item.metadata?.representative_name || null,
      status: item.is_active ? 'active' : 'inactive',
      created_at: item.created_at,
      updated_at: item.updated_at,
    })) || [];

    return NextResponse.json(mappedData);
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
      .from('partners')
      .insert({
        display_name: body.company_name_ko || body.company_name_en || 'Unnamed',
        name_ko: toNullIfEmpty(body.company_name_ko),
        name_en: toNullIfEmpty(body.company_name_en),
        entity_type: 'organization',
        owner_bu_code: body.bu_code,
        metadata: {
          industry: toNullIfEmpty(body.industry),
          business_registration_number: toNullIfEmpty(body.business_registration_number),
          representative_name: toNullIfEmpty(body.representative_name),
          last_meeting_date: toNullIfEmpty(body.last_meeting_date),
          business_registration_file: toNullIfEmpty(body.business_registration_file),
        },
        is_active: body.status !== 'inactive',
        security_level: 'bu_only',
        sharing_policy: 'owner_only',
      })
      .select()
      .single();

    if (error) throw error;

    // client 카테고리 매핑 추가
    await supabase
      .from('partner_category_mappings')
      .insert({
        partner_id: data.id,
        category_id: 11, // client category id
      });

    // 하위 호환성을 위해 필드 매핑
    const mappedData = {
      id: data.id,
      bu_code: data.owner_bu_code,
      company_name_ko: data.name_ko || data.display_name,
      company_name_en: data.name_en,
      industry: data.metadata?.industry || null,
      representative_name: data.metadata?.representative_name || null,
      status: data.is_active ? 'active' : 'inactive',
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return NextResponse.json(mappedData);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
