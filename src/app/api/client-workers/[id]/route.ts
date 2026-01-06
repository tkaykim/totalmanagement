import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

// 하위 호환성을 위해 client_worker 대신 partner_worker 사용
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
      .eq('worker_type', 'employee')
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

    const partnerCompanyId = body.client_company_id || body.partner_company_id;

    const { data, error } = await supabase
      .from('partner_worker')
      .update({
        partner_company_id: toNullIfEmpty(partnerCompanyId),
        name_en: toNullIfEmpty(body.name_en),
        name_ko: toNullIfEmpty(body.name_ko),
        phone: toNullIfEmpty(body.phone),
        email: toNullIfEmpty(body.email),
        business_card_file: toNullIfEmpty(body.business_card_file),
      })
      .eq('id', id)
      .eq('worker_type', 'employee')
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

    const { error } = await supabase
      .from('partner_worker')
      .delete()
      .eq('id', id)
      .eq('worker_type', 'employee');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
