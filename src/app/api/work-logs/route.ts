import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { getTodayKST } from '@/lib/timezone.server';

export async function GET(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || getTodayKST();

    const { data, error } = await supabase
      .from('daily_work_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', date)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get work log error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const body = await request.json();
    const logDate = body.log_date || getTodayKST();

    // 이미 존재하는 일지가 있는지 확인
    const { data: existing } = await supabase
      .from('daily_work_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('log_date', logDate)
      .maybeSingle();

    if (existing) {
      // 이미 존재하면 업데이트
      const { data, error } = await supabase
        .from('daily_work_logs')
        .update({
          summary: body.summary,
          notes: body.notes,
          tomorrow_plan: body.tomorrow_plan,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // 새로 생성
    const { data, error } = await supabase
      .from('daily_work_logs')
      .insert({
        user_id: user.id,
        log_date: logDate,
        summary: body.summary || null,
        notes: body.notes || null,
        tomorrow_plan: body.tomorrow_plan || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Create work log error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
