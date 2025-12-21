import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;

    let query = supabase.from('clients').select('*').order('created_at', { ascending: false });

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
      .from('clients')
      .insert({
        bu_code: body.bu_code,
        name: body.name,
        industry: toNullIfEmpty(body.industry),
        contact_person: toNullIfEmpty(body.contact_person),
        phone: toNullIfEmpty(body.phone),
        email: toNullIfEmpty(body.email),
        address: toNullIfEmpty(body.address),
        status: body.status || 'active',
        last_meeting_date: toNullIfEmpty(body.last_meeting_date),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}





