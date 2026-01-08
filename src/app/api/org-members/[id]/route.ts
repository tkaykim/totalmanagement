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
    if (body.title !== undefined) updateData.title = body.title || null;
    if (body.bu_code !== undefined) updateData.bu_code = body.bu_code || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.is_leader !== undefined) updateData.is_leader = body.is_leader;
    if (body.user_id !== undefined) updateData.user_id = body.user_id || null;
    if (body.org_unit_id !== undefined) updateData.org_unit_id = body.org_unit_id || null;

    const { data, error } = await supabase
      .from('org_members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // org_members 테이블이 존재하지 않는 경우
      return NextResponse.json(
        { error: 'org_members 테이블이 존재하지 않습니다. 이 기능을 사용하려면 테이블을 생성해야 합니다.' },
        { status: 400 }
      );
    }

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

    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('id', id);

    if (error) {
      // org_members 테이블이 존재하지 않는 경우
      return NextResponse.json(
        { error: 'org_members 테이블이 존재하지 않습니다. 이 기능을 사용하려면 테이블을 생성해야 합니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

