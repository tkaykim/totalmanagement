import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.nationality !== undefined) updateData.nationality = body.nationality;
    if (body.visa_type !== undefined) updateData.visa_type = body.visa_type;
    if (body.contract_start !== undefined) updateData.contract_start = body.contract_start;
    if (body.contract_end !== undefined) updateData.contract_end = body.contract_end;
    if (body.visa_start !== undefined) updateData.visa_start = body.visa_start;
    if (body.visa_end !== undefined) updateData.visa_end = body.visa_end;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.status !== undefined) updateData.status = body.status;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('artists')
      .update(updateData)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { error } = await supabase.from('artists').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

