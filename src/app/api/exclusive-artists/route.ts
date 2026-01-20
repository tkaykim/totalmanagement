'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GRIGO Entertainment partner ID - 전속 아티스트의 소속 회사
const GRIGO_PARTNER_ID = 8;

// 아티스트 카테고리 ID들 (dancer, artist, celebrity)
const ARTIST_CATEGORY_IDS = [1, 3, 4];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const search = searchParams.get('search');
    const visaStatus = searchParams.get('visa_status');
    const contractStatus = searchParams.get('contract_status');

    // 권한 체크 - GRIGO 또는 HEAD 사업부만 접근 가능
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('bu_code, role')
      .eq('id', user.id)
      .single();

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const allowedBuCodes = ['GRIGO', 'HEAD'];
    if (!allowedBuCodes.includes(appUser.bu_code)) {
      return NextResponse.json({ error: 'Access denied. Only GRIGO and HEAD can access.' }, { status: 403 });
    }

    // GRIGO Entertainment 소속 파트너 조회 (partner_relations에서 parent가 GRIGO인 것들)
    const { data: relations, error: relationsError } = await supabase
      .from('partner_relations')
      .select(`
        id,
        relation_type,
        role_description,
        start_date,
        end_date,
        is_active,
        child_partner:partners!partner_relations_child_partner_id_fkey(
          id,
          display_name,
          name_ko,
          name_en,
          nationality,
          entity_type,
          metadata,
          is_active,
          partner_category_mappings(
            partner_categories(id, name, name_ko)
          )
        )
      `)
      .eq('parent_partner_id', GRIGO_PARTNER_ID)
      .eq('is_active', true);

    if (relationsError) throw relationsError;

    // 데이터 가공
    let artists = (relations || [])
      .filter((r: any) => r.child_partner && r.child_partner.is_active)
      .map((r: any) => {
        const partner = r.child_partner;
        const categories = partner.partner_category_mappings
          ?.map((m: any) => m.partner_categories?.name_ko || m.partner_categories?.name)
          .filter(Boolean) || [];

        return {
          id: partner.id,
          display_name: partner.display_name,
          name_ko: partner.name_ko,
          name_en: partner.name_en,
          nationality: partner.nationality,
          entity_type: partner.entity_type,
          categories,
          metadata: partner.metadata || {},
          relation_id: r.id,
          relation_type: r.relation_type,
          role_description: r.role_description,
          relation_start_date: r.start_date,
          relation_end_date: r.end_date,
          is_active: r.is_active,
        };
      });

    // 검색 필터
    if (search) {
      const searchLower = search.toLowerCase();
      artists = artists.filter((a: any) =>
        a.display_name?.toLowerCase().includes(searchLower) ||
        a.name_ko?.toLowerCase().includes(searchLower) ||
        a.nationality?.toLowerCase().includes(searchLower)
      );
    }

    // 비자 상태 필터
    if (visaStatus && visaStatus !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      artists = artists.filter((a: any) => {
        const visaEnd = a.metadata.visa_end ? new Date(a.metadata.visa_end) : null;
        if (!visaEnd) return false;
        
        const daysLeft = Math.floor((visaEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (visaStatus === 'expiring_soon') {
          return daysLeft > 0 && daysLeft <= 90;
        } else if (visaStatus === 'expired') {
          return daysLeft <= 0;
        }
        return true;
      });
    }

    // 계약 상태 필터
    if (contractStatus && contractStatus !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      artists = artists.filter((a: any) => {
        const contractEnd = a.metadata.contract_end ? new Date(a.metadata.contract_end) : null;
        if (!contractEnd) return false;
        
        const daysLeft = Math.floor((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (contractStatus === 'active') {
          return daysLeft > 0;
        } else if (contractStatus === 'expiring_soon') {
          return daysLeft > 0 && daysLeft <= 90;
        } else if (contractStatus === 'expired') {
          return daysLeft <= 0;
        }
        return true;
      });
    }

    return NextResponse.json(artists);
  } catch (error) {
    console.error('Failed to fetch exclusive artists:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // 권한 체크
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('bu_code, role')
      .eq('id', user.id)
      .single();

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const allowedBuCodes = ['GRIGO', 'HEAD'];
    if (!allowedBuCodes.includes(appUser.bu_code)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const toNullIfEmpty = (value: any) =>
      value === '' || value === null || value === undefined ? null : value;

    // 1. 파트너 생성
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .insert({
        display_name: body.display_name,
        name_ko: toNullIfEmpty(body.name_ko),
        name_en: toNullIfEmpty(body.name_en),
        nationality: toNullIfEmpty(body.nationality),
        entity_type: body.entity_type || 'person',
        metadata: body.metadata || {},
        owner_bu_code: 'GRIGO',
        security_level: 'internal',
        sharing_policy: 'bu_shared',
        created_by: user.id,
        is_active: true,
        tags: ['전속아티스트'],
      })
      .select()
      .single();

    if (partnerError) throw partnerError;

    // 2. GRIGO BU access 생성
    await supabase.from('partner_bu_access').insert({
      partner_id: partner.id,
      bu_code: 'GRIGO',
      access_level: 'owner',
      granted_by: user.id,
    });

    // HEAD도 접근 가능하게
    await supabase.from('partner_bu_access').insert({
      partner_id: partner.id,
      bu_code: 'HEAD',
      access_level: 'full',
      granted_by: user.id,
    });

    // 3. 카테고리 매핑 (기본적으로 artist 카테고리 추가)
    const categoryIds = body.category_ids?.length > 0 ? body.category_ids : [3]; // artist
    const categoryMappings = categoryIds.map((categoryId: number) => ({
      partner_id: partner.id,
      category_id: categoryId,
    }));
    await supabase.from('partner_category_mappings').insert(categoryMappings);

    // 4. GRIGO Entertainment와의 관계 생성
    const { error: relationError } = await supabase
      .from('partner_relations')
      .insert({
        parent_partner_id: GRIGO_PARTNER_ID,
        child_partner_id: partner.id,
        relation_type: body.relation_type || 'member',
        role_description: toNullIfEmpty(body.role_description),
        start_date: toNullIfEmpty(body.relation_start_date),
        end_date: toNullIfEmpty(body.relation_end_date),
        is_active: true,
      });

    if (relationError) throw relationError;

    return NextResponse.json(partner);
  } catch (error) {
    console.error('Failed to create exclusive artist:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
