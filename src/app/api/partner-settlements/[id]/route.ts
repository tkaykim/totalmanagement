import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import type { AppUser } from '@/lib/permissions';

async function getCurrentUser(): Promise<AppUser | null> {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return null;

  const supabase = await createPureClient();
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, role, bu_code, name, position')
    .eq('id', user.id)
    .single();

  return appUser as AppUser | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('partner_settlements')
      .select(`
        *,
        partner:partners!partner_id(id, display_name),
        partner_settlement_projects(
          *,
          project:projects!project_id(id, name)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Failed to get settlement:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
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

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'superadmin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if ('status' in body) {
      updateData.status = body.status;
      if (body.status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
      } else if (body.status === 'paid') {
        updateData.paid_at = new Date().toISOString();
      }
    }

    if ('memo' in body) {
      updateData.memo = body.memo;
    }

    const { data, error } = await supabase
      .from('partner_settlements')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        partner:partners!partner_id(id, display_name),
        partner_settlement_projects(
          *,
          project:projects!project_id(id, name)
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Failed to update settlement:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'superadmin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // draft 상태만 삭제 가능
    const { data: settlement } = await supabase
      .from('partner_settlements')
      .select('status')
      .eq('id', id)
      .single();

    if (settlement?.status !== 'draft') {
      return NextResponse.json(
        { error: '작성중 상태의 정산서만 삭제할 수 있습니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('partner_settlements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete settlement:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
