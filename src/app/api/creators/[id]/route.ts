import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { CreatorType, CreatorStatus } from '@/types/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    // 타입 검증 (제공된 경우)
    if (body.type) {
      const validTypes: CreatorType[] = ['creator', 'celebrity', 'influencer'];
      if (!validTypes.includes(body.type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // 상태 검증 (제공된 경우)
    if (body.status) {
      const validStatuses: CreatorStatus[] = ['active', 'inactive', 'archived'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // 업데이트할 필드만 포함
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.bu_code !== undefined) updateData.bu_code = body.bu_code;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.platform !== undefined) updateData.platform = body.platform || null;
    if (body.channel_id !== undefined) updateData.channel_id = body.channel_id || null;
    if (body.subscribers_count !== undefined) updateData.subscribers_count = body.subscribers_count || null;
    if (body.engagement_rate !== undefined) updateData.engagement_rate = body.engagement_rate || null;
    if (body.contact_person !== undefined) updateData.contact_person = body.contact_person || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.agency !== undefined) updateData.agency = body.agency || null;
    if (body.fee_range !== undefined) updateData.fee_range = body.fee_range || null;
    if (body.specialties !== undefined) updateData.specialties = body.specialties || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes || null;

    const { data, error } = await supabase
      .from('creators')
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

    const { error } = await supabase.from('creators').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

