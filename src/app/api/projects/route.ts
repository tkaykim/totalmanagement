import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;

    let query = supabase.from('projects').select('*').order('created_at', { ascending: false });

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
    const { createClient } = await import('@/lib/supabase/server');
    const authSupabase = await createClient();
    const body = await request.json();

    // 현재 로그인한 사용자 정보 가져오기
    const { data: { user } } = await authSupabase.auth.getUser();
    const userId = user?.id || null;

    const { data, error } = await supabase
      .from('projects')
      .insert({
        bu_code: body.bu_code,
        name: body.name,
        category: body.category,
        status: body.status || '준비중',
        start_date: body.start_date,
        end_date: body.end_date,
        client_id: body.client_id,
        created_by: userId || body.created_by || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


