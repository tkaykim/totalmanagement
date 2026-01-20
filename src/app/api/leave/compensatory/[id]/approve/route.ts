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

    // HEAD admin만 대체휴무 생성 승인 가능
    const { data: currentUser } = await supabase
      .from('app_users')
      .select('role, bu_code')
      .eq('id', user.id)
      .single();

    if (!currentUser || currentUser.role !== 'admin' || currentUser.bu_code !== 'HEAD') {
      return NextResponse.json({ error: '대체휴무 생성 승인 권한이 없습니다.' }, { status: 403 });
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

    const currentYear = new Date().getFullYear();

    // 대체휴무 신청 승인
    const { data: updatedRequest, error: updateError } = await supabase
      .from('compensatory_requests')
      .update({
        status: 'approved',
        approver_id: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Compensatory request approve error:', updateError);
      return NextResponse.json({ error: '대체휴무 승인에 실패했습니다.' }, { status: 500 });
    }

    // 휴가 잔여일수에 대체휴무 추가
    const { data: balance } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', compRequest.requester_id)
      .eq('leave_type', 'compensatory')
      .eq('year', currentYear)
      .single();

    if (balance) {
      await supabase
        .from('leave_balances')
        .update({
          total_days: Number(balance.total_days) + Number(compRequest.days),
        })
        .eq('id', balance.id);
    } else {
      await supabase
        .from('leave_balances')
        .insert({
          user_id: compRequest.requester_id,
          leave_type: 'compensatory',
          total_days: compRequest.days,
          used_days: 0,
          year: currentYear,
        });
    }

    // 휴가 부여 이력 기록
    await supabase
      .from('leave_grants')
      .insert({
        user_id: compRequest.requester_id,
        leave_type: 'compensatory',
        days: compRequest.days,
        grant_type: 'compensatory_approved',
        reason: compRequest.reason,
        granted_by: user.id,
        year: currentYear,
      });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Compensatory request approve error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
