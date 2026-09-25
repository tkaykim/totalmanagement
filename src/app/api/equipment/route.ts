import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;

  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;

    let query = supabase.from('equipment').select('*').order('created_at', { ascending: false });

    if (bu) {
      query = query.eq('bu_code', bu);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!appUser || appUser.role !== 'admin') {
      return NextResponse.json({ error: '관리자만 장비를 추가할 수 있습니다.' }, { status: 403 });
    }

    const body = await request.json();

    const pureClient = await createPureClient();
    const { data, error } = await pureClient
      .from('equipment')
      .insert({
        bu_code: body.bu_code,
        name: body.name,
        category: body.category,
        quantity: body.quantity || 1,
        serial_number: body.serial_number,
        status: body.status || 'available',
        location: body.location,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
















