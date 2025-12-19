import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createPureClient();

    const { data: units, error: unitsError } = await supabase
      .from('org_units')
      .select('*')
      .order('sort_order', { ascending: true });

    if (unitsError) throw unitsError;

    const { data: members, error: membersError } = await supabase
      .from('org_members')
      .select('*')
      .order('is_leader', { ascending: false });

    if (membersError) throw membersError;

    const result = units?.map((unit) => ({
      ...unit,
      members: members?.filter((m) => m.org_unit_id === unit.id) || [],
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('org_members')
      .insert({
        org_unit_id: body.org_unit_id,
        name: body.name,
        title: body.title,
        bu_code: body.bu_code || null,
        phone: body.phone || null,
        email: body.email || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
        is_leader: body.is_leader || false,
        user_id: body.user_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


