import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';

// partners 테이블에서 entity_type이 'person'인 항목 조회 (외부 인력)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;

    let query = supabase
      .from('partners')
      .select('*')
      .eq('entity_type', 'person')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (bu) {
      query = query.eq('owner_bu_code', bu);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 하위 호환성을 위해 필드 매핑
    const mappedData = data?.map(item => ({
      id: item.id,
      name: item.display_name,
      email: item.email,
      phone: item.phone,
      bu_code: item.owner_bu_code,
      is_active: item.is_active,
      specialties: item.tags || [],
      notes: item.metadata?.notes || null,
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
        display_name: body.name,
        name_ko: body.name,
        entity_type: 'person',
        owner_bu_code: body.bu_code,
        phone: toNullIfEmpty(body.phone),
        email: toNullIfEmpty(body.email),
        tags: body.specialties || [],
        metadata: body.notes ? { notes: body.notes } : null,
        is_active: body.is_active !== undefined ? body.is_active : true,
        security_level: 'bu_only',
        sharing_policy: 'owner_only',
      })
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












