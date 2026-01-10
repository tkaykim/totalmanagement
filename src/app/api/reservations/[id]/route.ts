import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const id = params.id;
    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        reserver:app_users!reserver_id(id, name, email, bu_code),
        project:projects!project_id(id, name),
        task:project_tasks!task_id(id, title)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const id = params.id;
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pureClient = await createPureClient();
    
    const { data: existingReservation } = await pureClient
      .from('reservations')
      .select('reserver_id')
      .eq('id', id)
      .single();

    if (!existingReservation) {
      return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    const isOwner = existingReservation.reserver_id === user.id;
    const isAdmin = appUser?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: '본인의 예약만 수정할 수 있습니다.' }, { status: 403 });
    }

    const body = await request.json();

    const { data, error } = await pureClient
      .from('reservations')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        reserver:app_users!reserver_id(id, name, email, bu_code),
        project:projects!project_id(id, name),
        task:project_tasks!task_id(id, title)
      `)
      .single();

    if (error) {
      if (error.message.includes('중복 예약')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const id = params.id;
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pureClient = await createPureClient();
    
    const { data: existingReservation } = await pureClient
      .from('reservations')
      .select('reserver_id')
      .eq('id', id)
      .single();

    if (!existingReservation) {
      return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    const isOwner = existingReservation.reserver_id === user.id;
    const isAdmin = appUser?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: '본인의 예약만 취소할 수 있습니다.' }, { status: 403 });
    }

    const { data, error } = await pureClient
      .from('reservations')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
