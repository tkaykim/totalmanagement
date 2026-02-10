import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { 
  canAccessTaskTemplate, 
  canEditTaskTemplate, 
  canDeleteTaskTemplate, 
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAccessTaskTemplate(currentUser)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: template, error: fetchError } = await supabase
      .from('task_templates')
      .select('bu_code')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (!canEditTaskTemplate(currentUser, template)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.template_type !== undefined) updateData.template_type = body.template_type;
    if (body.options_schema !== undefined) updateData.options_schema = body.options_schema;
    if (body.tasks !== undefined) updateData.tasks = body.tasks;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await supabase
      .from('task_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: template, error: fetchError } = await supabase
      .from('task_templates')
      .select('bu_code')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (!canDeleteTaskTemplate(currentUser, template)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
