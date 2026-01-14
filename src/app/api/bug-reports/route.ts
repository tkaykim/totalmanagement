import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
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

    const isAdmin = appUser?.role === 'admin' || appUser?.role === 'leader';

    let query = supabase
      .from('bug_reports')
      .select(`
        *,
        reporter:app_users!bug_reports_reporter_id_fkey(id, name, email)
      `)
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('reporter_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bug reports:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/bug-reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, situation, description, improvement_request } = body;

    if (!title || !situation) {
      return NextResponse.json(
        { error: '버그 제목과 발생 상황은 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('bug_reports')
      .insert({
        reporter_id: user.id,
        title,
        situation,
        description: description || null,
        improvement_request: improvement_request || null,
        status: 'pending',
      })
      .select(`
        *,
        reporter:app_users!bug_reports_reporter_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error creating bug report:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/bug-reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
