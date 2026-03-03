import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyBugReportResolved } from '@/lib/notification-sender';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    const { data, error } = await supabase
      .from('bug_reports')
      .update(updateData)
      .eq('id', parseInt(id))
      .select(`
        *,
        reporter:app_users!bug_reports_reporter_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating bug report:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (body.status === 'resolved' && data?.reporter_id && data.title) {
      notifyBugReportResolved(
        data.reporter_id as string,
        data.title as string,
        data.id as number
      ).catch((err) => console.error('Bug report resolved notification failed:', err));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PATCH /api/bug-reports/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
