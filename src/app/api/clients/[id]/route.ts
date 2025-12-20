import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    // 빈 문자열을 null로 변환하는 헬퍼 함수
    const toNullIfEmpty = (value: any) => (value === '' || value === null || value === undefined ? null : value);

    const { data, error } = await supabase
      .from('clients')
      .update({
        name: body.name,
        industry: toNullIfEmpty(body.industry),
        contact_person: toNullIfEmpty(body.contact_person),
        phone: toNullIfEmpty(body.phone),
        email: toNullIfEmpty(body.email),
        address: toNullIfEmpty(body.address),
        status: body.status,
        last_meeting_date: toNullIfEmpty(body.last_meeting_date),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { error } = await supabase.from('clients').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


