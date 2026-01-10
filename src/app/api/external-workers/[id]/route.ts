import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

// partners 테이블에서 entity_type이 'person'인 항목 조회/수정/삭제
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
      name: data.display_name,
      email: data.email,
      phone: data.phone,
      bu_code: data.owner_bu_code,
      is_active: data.is_active,
      specialties: data.tags || [],
      notes: data.metadata?.notes || null,
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

    const updateData: Record<string, any> = {};
    if (body.bu_code !== undefined) updateData.owner_bu_code = body.bu_code;
    if (body.name !== undefined) {
      updateData.display_name = body.name;
      updateData.name_ko = body.name;
    }
    if (body.phone !== undefined) updateData.phone = toNullIfEmpty(body.phone);
    if (body.email !== undefined) updateData.email = toNullIfEmpty(body.email);
    if (body.specialties !== undefined) updateData.tags = body.specialties || [];
    if (body.notes !== undefined) {
      updateData.metadata = body.notes ? { notes: body.notes } : null;
    }
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

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
      name: data.display_name,
      email: data.email,
      phone: data.phone,
      bu_code: data.owner_bu_code,
      is_active: data.is_active,
      specialties: data.tags || [],
      notes: data.metadata?.notes || null,
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

    // 실제 삭제 대신 soft delete (is_active = false)
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
