import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { type AppUser } from '@/lib/permissions';

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
      .from('projects')
      .select(`
        id,
        name,
        share_partner_id,
        share_rate,
        visible_to_partner,
        share_partner:partners!share_partner_id(id, display_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Failed to get share settings:', error);
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

    // 관리자 또는 최고관리자만 분배 설정 가능
    if (!['admin', 'superadmin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if ('share_partner_id' in body) {
      updateData.share_partner_id = body.share_partner_id;
    }
    if ('share_rate' in body) {
      updateData.share_rate = body.share_rate;
    }
    if ('visible_to_partner' in body) {
      updateData.visible_to_partner = body.visible_to_partner;
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        name,
        share_partner_id,
        share_rate,
        visible_to_partner,
        share_partner:partners!share_partner_id(id, display_name)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Failed to update share settings:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
