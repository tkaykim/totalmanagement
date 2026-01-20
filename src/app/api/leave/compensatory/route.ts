import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get('requester_id');
    const status = searchParams.get('status');

    // 현재 사용자 정보 조회
    const { data: currentUser } = await supabase
      .from('app_users')
      .select('role, bu_code')
      .eq('id', user.id)
      .single();

    let query = supabase
      .from('compensatory_requests')
      .select(`
        *,
        requester:app_users!compensatory_requests_requester_id_fkey(id, name, bu_code),
        approver:app_users!compensatory_requests_approver_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false });

    // 권한에 따른 필터링
    if (requesterId) {
      query = query.eq('requester_id', requesterId);
    } else if (currentUser?.role === 'admin' && currentUser?.bu_code === 'HEAD') {
      // HEAD admin은 전체 조회 가능
    } else {
      // 일반 사용자는 본인 것만
      query = query.eq('requester_id', user.id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Compensatory requests fetch error:', error);
      return NextResponse.json({ error: '대체휴무 신청 목록 조회에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Compensatory requests error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { days = 1, reason, work_date } = body;

    if (!reason) {
      return NextResponse.json({ error: '대체휴무 생성 사유를 입력해주세요.' }, { status: 400 });
    }

    // 대체휴무 생성 신청
    const { data: compRequest, error } = await supabase
      .from('compensatory_requests')
      .insert({
        requester_id: user.id,
        days,
        reason,
        work_date: work_date || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Compensatory request create error:', error);
      return NextResponse.json({ error: '대체휴무 생성 신청에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(compRequest);
  } catch (error) {
    console.error('Compensatory request create error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
