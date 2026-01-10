import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

// partners 테이블에서 person 타입 조회/수정/삭제
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', id)
      .eq('entity_type', 'person')
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
      business_card_file: data.metadata?.business_card_file || null,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return NextResponse.json(mappedData);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    const toNullIfEmpty = (value: any) =>
      value === '' || value === null || value === undefined ? null : value;

    const partnerCompanyId = body.client_company_id || body.partner_company_id;

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name_ko !== undefined) {
      updateData.name_ko = toNullIfEmpty(body.name_ko);
      updateData.display_name = body.name_ko || body.name_en || 'Unnamed';
    }
    if (body.name_en !== undefined) updateData.name_en = toNullIfEmpty(body.name_en);
    if (body.phone !== undefined) updateData.phone = toNullIfEmpty(body.phone);
    if (body.email !== undefined) updateData.email = toNullIfEmpty(body.email);

    // metadata 업데이트
    const { data: current } = await supabase
      .from('partners')
      .select('metadata')
      .eq('id', id)
      .single();

    const metadata = { ...(current?.metadata || {}) };
    if (partnerCompanyId !== undefined) metadata.partner_company_id = toNullIfEmpty(partnerCompanyId);
    if (body.business_card_file !== undefined) metadata.business_card_file = toNullIfEmpty(body.business_card_file);
    updateData.metadata = metadata;

    const { data, error } = await supabase
      .from('partners')
      .update(updateData)
      .eq('id', id)
      .eq('entity_type', 'person')
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    // soft delete
    const { error } = await supabase
      .from('partners')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('entity_type', 'person');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
