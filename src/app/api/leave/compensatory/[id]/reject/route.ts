import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // HEAD admin만 대체휴무 생성 반려 가능
    const { data: currentUser } = await supabase
      .from('app_users')
      .select('role, bu_code')
      .eq('id', user.id)
      .single();

    if (!currentUser || currentUser.role !== 'admin' || currentUser.bu_code !== 'HEAD') {
      return NextResponse.json({ error: '대체휴무 생성 반려 권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { rejection_reason } = body;

    if (!rejection_reason) {
      return NextResponse.json({ error: '반려 사유를 입력해주세요.' }, { status: 400 });
    }

    // 대체휴무 신청 조회
    const { data: compRequest, error: fetchError } = await supabase
      .from('compensatory_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !compRequest) {
      return NextResponse.json({ error: '대체휴무 신청을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (compRequest.status !== 'pending') {
      return NextResponse.json({ error: '이미 처리된 신청입니다.' }, { status: 400 });
    }

    // 대체휴무 신청 반려
    const { data: updatedRequest, error: updateError } = await supabase
      .from('compensatory_requests')
      .update({
        status: 'rejected',
        approver_id: user.id,
        rejection_reason,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Compensatory request reject error:', updateError);
      return NextResponse.json({ error: '대체휴무 반려에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Compensatory request reject error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
