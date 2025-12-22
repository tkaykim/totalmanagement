import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    const toNullIfEmpty = (value: any) => (value === '' || value === null || value === undefined ? null : value);

    const { data, error } = await supabase
      .from('client_worker')
      .update({
        client_company_id: toNullIfEmpty(body.client_company_id),
        name_en: toNullIfEmpty(body.name_en),
        name_ko: toNullIfEmpty(body.name_ko),
        phone: toNullIfEmpty(body.phone),
        email: toNullIfEmpty(body.email),
        business_card_file: toNullIfEmpty(body.business_card_file),
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

    const { error } = await supabase.from('client_worker').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

