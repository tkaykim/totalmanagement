import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu');

    let query = supabase
      .from('artists')
      .select('*')
      .order('created_at', { ascending: false });

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
  try {
    const supabase = await createPureClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('artists')
      .insert({
        bu_code: body.bu_code,
        name: body.name,
        nationality: body.nationality || null,
        visa_type: body.visa_type || null,
        contract_start: body.contract_start,
        contract_end: body.contract_end,
        visa_start: body.visa_start || null,
        visa_end: body.visa_end || null,
        role: body.role || null,
        status: body.status || 'Active',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


