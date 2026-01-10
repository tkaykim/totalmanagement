import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

// partners 테이블에서 organization 타입 조회/수정/삭제
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
      .eq('entity_type', 'organization')
      .single();

    if (error) throw error;

    // 하위 호환성을 위해 필드 매핑
    const mappedData = {
      id: data.id,
      bu_code: data.owner_bu_code,
      company_name_ko: data.name_ko || data.display_name,
      company_name_en: data.name_en,
      industry: data.metadata?.industry || null,
      representative_name: data.metadata?.representative_name || null,
      business_registration_number: data.metadata?.business_registration_number || null,
      last_meeting_date: data.metadata?.last_meeting_date || null,
      business_registration_file: data.metadata?.business_registration_file || null,
      status: data.is_active ? 'active' : 'inactive',
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

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.bu_code !== undefined) updateData.owner_bu_code = body.bu_code;
    if (body.company_name_ko !== undefined) {
      updateData.name_ko = toNullIfEmpty(body.company_name_ko);
      updateData.display_name = body.company_name_ko || body.company_name_en || 'Unnamed';
    }
    if (body.company_name_en !== undefined) updateData.name_en = toNullIfEmpty(body.company_name_en);
    if (body.status !== undefined) updateData.is_active = body.status !== 'inactive';

    // metadata 업데이트
    const { data: current } = await supabase
      .from('partners')
      .select('metadata')
      .eq('id', id)
      .single();

    const metadata = { ...(current?.metadata || {}) };
    if (body.industry !== undefined) metadata.industry = toNullIfEmpty(body.industry);
    if (body.business_registration_number !== undefined) metadata.business_registration_number = toNullIfEmpty(body.business_registration_number);
    if (body.representative_name !== undefined) metadata.representative_name = toNullIfEmpty(body.representative_name);
    if (body.last_meeting_date !== undefined) metadata.last_meeting_date = toNullIfEmpty(body.last_meeting_date);
    if (body.business_registration_file !== undefined) metadata.business_registration_file = toNullIfEmpty(body.business_registration_file);
    updateData.metadata = metadata;

    const { data, error } = await supabase
      .from('partners')
      .update(updateData)
      .eq('id', id)
      .eq('entity_type', 'organization')
      .select()
      .single();

    if (error) throw error;

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
      .eq('entity_type', 'organization');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
