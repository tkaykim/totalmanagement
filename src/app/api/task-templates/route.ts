import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';
import { 
  canAccessTaskTemplate, 
  canCreateTaskTemplate, 
  type AppUser 
} from '@/lib/permissions';

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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAccessTaskTemplate(currentUser)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    let query = supabase.from('task_templates').select('*');
    
    if (bu) {
      query = query.eq('bu_code', bu);
    }
    
    query = query.eq('is_active', true).order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.bu_code) {
      return NextResponse.json({ error: 'User must have bu_code' }, { status: 400 });
    }

    if (!canCreateTaskTemplate(currentUser, body.bu_code)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('task_templates')
      .insert({
        bu_code: body.bu_code,
        name: body.name,
        description: body.description,
        template_type: body.template_type,
        options_schema: body.options_schema,
        tasks: body.tasks,
        author_id: currentUser.id,
        is_active: body.is_active !== undefined ? body.is_active : true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
