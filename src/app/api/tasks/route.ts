import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;
    const projectId = searchParams.get('project_id');

    let query = supabase.from('project_tasks').select('*').order('due_date', { ascending: true });

    if (bu) {
      query = query.eq('bu_code', bu);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
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
      .from('project_tasks')
      .insert({
        project_id: body.project_id,
        bu_code: body.bu_code,
        title: body.title,
        assignee_id: body.assignee_id,
        assignee: body.assignee,
        due_date: body.due_date,
        status: body.status || 'todo',
        created_by: body.created_by,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


