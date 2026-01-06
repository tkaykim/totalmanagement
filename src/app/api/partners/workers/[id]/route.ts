import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('partner_worker')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
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

    const { data, error } = await supabase
      .from('partner_worker')
      .update({
        partner_company_id: toNullIfEmpty(body.partner_company_id),
        bu_code: body.bu_code,
        name_en: toNullIfEmpty(body.name_en),
        name_ko: toNullIfEmpty(body.name_ko),
        name: toNullIfEmpty(body.name),
        worker_type: body.worker_type,
        phone: toNullIfEmpty(body.phone),
        email: toNullIfEmpty(body.email),
        specialties: body.specialties,
        notes: toNullIfEmpty(body.notes),
        business_card_file: toNullIfEmpty(body.business_card_file),
        is_active: body.is_active,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { error } = await supabase.from('partner_worker').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

