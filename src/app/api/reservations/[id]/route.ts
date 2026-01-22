import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';
import { notifyReservationUpdated, notifyReservationCancelled } from '@/lib/notification-sender';

type RouteContext = { params: Promise<{ id: string }> };

async function getResourceName(pureClient: any, resourceType: string, resourceId: number): Promise<string> {
  if (resourceType === 'meeting_room') {
    const { data } = await pureClient.from('meeting_rooms').select('name').eq('id', resourceId).single();
    return data?.name || '회의실';
  } else if (resourceType === 'equipment') {
    const { data } = await pureClient.from('equipment').select('name').eq('id', resourceId).single();
    return data?.name || '장비';
  } else if (resourceType === 'vehicle') {
    const { data } = await pureClient.from('vehicles').select('name').eq('id', resourceId).single();
    return data?.name || '차량';
  }
  return '예약 항목';
}

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
      .select('reserver_id, resource_type, resource_id, start_time, end_time')
      .eq('id', id)
      .single();

    if (!existingReservation) {
      return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('id, role, name')
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

    // 리소스 이름 조회 및 알림 전송
    const resourceName = await getResourceName(pureClient, data.resource_type, data.resource_id);
    const reserverName = (data as any).reserver?.name || appUser?.name || '사용자';
    
    await notifyReservationUpdated(
      data.resource_type,
      resourceName,
      reserverName,
      data.start_time,
      data.end_time,
      id,
      user.id
    );

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
      .select('reserver_id, resource_type, resource_id, start_time')
      .eq('id', id)
      .single();

    if (!existingReservation) {
      return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('id, role, name')
      .eq('id', user.id)
      .single();

    // 예약자 이름 조회
    const { data: reserver } = await pureClient
      .from('app_users')
      .select('name')
      .eq('id', existingReservation.reserver_id)
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

    // 리소스 이름 조회 및 알림 전송
    const resourceName = await getResourceName(pureClient, existingReservation.resource_type, existingReservation.resource_id);
    const reserverName = reserver?.name || '사용자';
    
    await notifyReservationCancelled(
      existingReservation.resource_type,
      resourceName,
      reserverName,
      existingReservation.start_time,
      id,
      user.id
    );

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
