import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createPureClient();

    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!appUser || appUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: mappings, error } = await supabase
      .from('gowid_user_mapping')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    const mappingUserIds = mappings?.map(m => m.erp_user_id) ?? [];
    let erpUsers: { id: string; name: string; bu_code: string }[] = [];
    if (mappingUserIds.length > 0) {
      const { data: users } = await supabase
        .from('app_users')
        .select('id, name, bu_code')
        .in('id', mappingUserIds);
      erpUsers = users ?? [];
    }

    const enriched = mappings?.map(m => ({
      ...m,
      erp_user_name: erpUsers.find(u => u.id === m.erp_user_id)?.name ?? '',
      erp_user_bu_code: erpUsers.find(u => u.id === m.erp_user_id)?.bu_code ?? '',
    }));

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error('Gowid mapping GET error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createPureClient();

    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!appUser || appUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { erp_user_id, gowid_user_id, gowid_user_name, gowid_email, gowid_card_alias } = body;

    const { data, error } = await supabase
      .from('gowid_user_mapping')
      .upsert(
        { erp_user_id, gowid_user_id, gowid_user_name, gowid_email, gowid_card_alias, updated_at: new Date().toISOString() },
        { onConflict: 'erp_user_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Gowid mapping POST error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createPureClient();

    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!appUser || appUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await request.json();

    const { error } = await supabase
      .from('gowid_user_mapping')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gowid mapping DELETE error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
