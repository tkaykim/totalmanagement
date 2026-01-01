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
    if (body.nickname_ko !== undefined) updateData.nickname_ko = body.nickname_ko;
    if (body.nickname_en !== undefined) updateData.nickname_en = body.nickname_en;
    if (body.real_name !== undefined) updateData.real_name = body.real_name;
    if (body.photo !== undefined) updateData.photo = body.photo;
    if (body.team_name !== undefined) updateData.team_name = body.team_name;
    if (body.company !== undefined) updateData.company = body.company;
    if (body.nationality !== undefined) updateData.nationality = body.nationality;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.contact !== undefined) updateData.contact = body.contact;
    if (body.bank_copy !== undefined) updateData.bank_copy = body.bank_copy;
    if (body.bank_name !== undefined) updateData.bank_name = body.bank_name;
    if (body.account_number !== undefined) updateData.account_number = body.account_number;
    if (body.id_document_type !== undefined) updateData.id_document_type = body.id_document_type;
    if (body.id_document_file !== undefined) updateData.id_document_file = body.id_document_file;
    if (body.note !== undefined) updateData.note = body.note;

    const { data, error } = await supabase
      .from('dancers')
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

    const { error } = await supabase.from('dancers').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

