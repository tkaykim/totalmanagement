import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';

async function checkAdminRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: appUser } = await supabase
    .from('app_users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!appUser || appUser.role !== 'admin') {
    return { error: '관리자만 장비를 수정/삭제할 수 있습니다.', status: 403 };
  }

  return null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authError = await checkAdminRole();
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('equipment')
      .update({
        name: body.name,
        category: body.category,
        quantity: body.quantity,
        serial_number: body.serial_number,
        status: body.status,
        location: body.location,
        borrower_id: body.borrower_id,
        borrower_name: body.borrower_name,
        return_date: body.return_date,
        notes: body.notes,
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
    const authError = await checkAdminRole();
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const supabase = await createPureClient();
    const { id } = await params;

    const { error } = await supabase.from('equipment').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
















