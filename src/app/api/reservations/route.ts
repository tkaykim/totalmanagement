import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const resourceType = searchParams.get('resource_type');
    const resourceId = searchParams.get('resource_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const status = searchParams.get('status');

    let query = supabase
      .from('reservations')
      .select(`
        *,
        reserver:app_users!reserver_id(id, name, email, bu_code),
        project:projects!project_id(id, name),
        task:project_tasks!task_id(id, title)
      `)
      .order('start_time', { ascending: true });

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    if (resourceId) {
      query = query.eq('resource_id', resourceId);
    }

    if (startDate) {
      query = query.gte('start_time', startDate);
    }

    if (endDate) {
      query = query.lte('end_time', endDate);
    }

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.eq('status', 'active');
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
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('id, bu_code, name')
      .eq('id', user.id)
      .single();

    if (!appUser) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!appUser.bu_code) {
      return NextResponse.json({ error: '소속 사업부가 지정된 사용자만 예약할 수 있습니다.' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.resource_type || !body.resource_id || !body.start_time || !body.end_time || !body.title) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
    }

    const pureClient = await createPureClient();
    const { data, error } = await pureClient
      .from('reservations')
      .insert({
        resource_type: body.resource_type,
        resource_id: body.resource_id,
        reserver_id: appUser.id,
        project_id: body.project_id || null,
        task_id: body.task_id || null,
        title: body.title,
        start_time: body.start_time,
        end_time: body.end_time,
        quantity: body.quantity || 1,
        notes: body.notes,
        status: 'active',
      })
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
