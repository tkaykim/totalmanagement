import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { getAuthContext, requireAuth, canAccessCorporateCard, unauthorizedResponse, forbiddenResponse } from '../_lib/gowid-client';

export async function GET() {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (!canAccessCorporateCard(ctx)) return forbiddenResponse();

    const supabase = await createPureClient();
    const { data, error } = await supabase
      .from('gowid_cards')
      .select('*')
      .order('gowid_alias', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Gowid cards GET error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (ctx.role !== 'admin') return forbiddenResponse();

    const body = await request.json();
    const { gowid_alias, short_card_number, card_number, card_user_name, card_name, card_type, erp_alias, notes } = body;

    if (!gowid_alias) {
      return NextResponse.json({ error: 'gowid_alias is required' }, { status: 400 });
    }

    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('gowid_cards')
      .upsert(
        {
          gowid_alias,
          short_card_number: short_card_number || null,
          card_number: card_number || null,
          card_user_name: card_user_name || null,
          card_name: card_name || null,
          card_type: card_type || null,
          erp_alias: erp_alias || null,
          notes: notes || null,
          created_by: ctx.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'gowid_alias' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Gowid cards POST error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (ctx.role !== 'admin') return forbiddenResponse();

    const body = await request.json();
    const { id, erp_alias, notes, card_user_name } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = await createPureClient();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (erp_alias !== undefined) updateData.erp_alias = erp_alias || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (card_user_name !== undefined) updateData.card_user_name = card_user_name || null;

    const { data, error } = await supabase
      .from('gowid_cards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Gowid cards PUT error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (ctx.role !== 'admin') return forbiddenResponse();

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = await createPureClient();
    const { error } = await supabase
      .from('gowid_cards')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Gowid cards DELETE error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
