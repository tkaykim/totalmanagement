'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GRIGO_PARTNER_ID = 8;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const partnerId = parseInt(id, 10);

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

    // 파트너 조회
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select(`
        *,
        partner_category_mappings(
          partner_categories(id, name, name_ko)
        ),
        partner_relations!partner_relations_child_partner_id_fkey(
          id,
          parent_partner_id,
          relation_type,
          role_description,
          start_date,
          end_date,
          is_active
        )
      `)
      .eq('id', partnerId)
      .single();

    if (partnerError) throw partnerError;

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // GRIGO 소속인지 확인
    const grigoRelation = partner.partner_relations?.find(
      (r: any) => r.parent_partner_id === GRIGO_PARTNER_ID && r.is_active
    );

    if (!grigoRelation) {
      return NextResponse.json({ error: 'Not an exclusive artist' }, { status: 404 });
    }

    const categories = partner.partner_category_mappings
      ?.map((m: any) => m.partner_categories?.name_ko || m.partner_categories?.name)
      .filter(Boolean) || [];

    const result = {
      id: partner.id,
      display_name: partner.display_name,
      name_ko: partner.name_ko,
      name_en: partner.name_en,
      nationality: partner.nationality,
      entity_type: partner.entity_type,
      categories,
      metadata: partner.metadata || {},
      relation_id: grigoRelation.id,
      relation_type: grigoRelation.relation_type,
      role_description: grigoRelation.role_description,
      relation_start_date: grigoRelation.start_date,
      relation_end_date: grigoRelation.end_date,
      is_active: grigoRelation.is_active,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch exclusive artist:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const partnerId = parseInt(id, 10);
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

    // 파트너 업데이트
    const updateData: any = {};
    
    if (body.display_name !== undefined) updateData.display_name = body.display_name;
    if (body.name_ko !== undefined) updateData.name_ko = toNullIfEmpty(body.name_ko);
    if (body.name_en !== undefined) updateData.name_en = toNullIfEmpty(body.name_en);
    if (body.nationality !== undefined) updateData.nationality = toNullIfEmpty(body.nationality);
    if (body.entity_type !== undefined) updateData.entity_type = body.entity_type;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    
    updateData.updated_at = new Date().toISOString();

    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .update(updateData)
      .eq('id', partnerId)
      .select()
      .single();

    if (partnerError) throw partnerError;

    // 관계 정보 업데이트 (필요시)
    if (body.relation_type || body.role_description || body.relation_start_date || body.relation_end_date) {
      const relationUpdate: any = {};
      if (body.relation_type) relationUpdate.relation_type = body.relation_type;
      if (body.role_description !== undefined) relationUpdate.role_description = toNullIfEmpty(body.role_description);
      if (body.relation_start_date !== undefined) relationUpdate.start_date = toNullIfEmpty(body.relation_start_date);
      if (body.relation_end_date !== undefined) relationUpdate.end_date = toNullIfEmpty(body.relation_end_date);

      await supabase
        .from('partner_relations')
        .update(relationUpdate)
        .eq('parent_partner_id', GRIGO_PARTNER_ID)
        .eq('child_partner_id', partnerId);
    }

    return NextResponse.json(partner);
  } catch (error) {
    console.error('Failed to update exclusive artist:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const partnerId = parseInt(id, 10);

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

    // 관계만 비활성화 (파트너 자체는 삭제하지 않음)
    const { error: relationError } = await supabase
      .from('partner_relations')
      .update({ is_active: false })
      .eq('parent_partner_id', GRIGO_PARTNER_ID)
      .eq('child_partner_id', partnerId);

    if (relationError) throw relationError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove exclusive artist:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
