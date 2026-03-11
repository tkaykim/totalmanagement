import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/leave/logs
 * 휴가 생성·소진 로그 조회 (HEAD 본사 admin 전용)
 * - 생성: leave_grants (월간/연간 자동, 관리자 수동, 대체휴무 승인)
 * - 소진: 승인된 leave_requests (신청 승인, 관리자 대리 소진)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from('app_users')
      .select('role, bu_code')
      .eq('id', user.id)
      .single();

    if (
      !currentUser ||
      currentUser.role !== 'admin' ||
      currentUser.bu_code !== 'HEAD'
    ) {
      return NextResponse.json(
        { error: '생성·소진 로그는 본사 관리자만 조회할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    if (Number.isNaN(year)) {
      return NextResponse.json({ error: '유효하지 않은 연도입니다.' }, { status: 400 });
    }

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const [grantsResult, usagesResult] = await Promise.all([
      supabase
        .from('leave_grants')
        .select(`
          id,
          user_id,
          leave_type,
          days,
          grant_type,
          reason,
          granted_by,
          year,
          granted_at,
          created_at,
          recipient:app_users!leave_grants_user_id_fkey(id, name),
          granter:app_users!leave_grants_granted_by_fkey(id, name)
        `)
        .eq('year', year)
        .order('granted_at', { ascending: false }),
      supabase
        .from('leave_requests')
        .select(`
          id,
          requester_id,
          leave_type,
          start_date,
          end_date,
          days_used,
          reason,
          status,
          approved_at,
          created_at,
          requester:app_users!leave_requests_requester_id_fkey(id, name, bu_code),
          approver:app_users!leave_requests_approver_id_fkey(id, name)
        `)
        .eq('status', 'approved')
        .gte('start_date', yearStart)
        .lte('end_date', yearEnd)
        .order('approved_at', { ascending: false }),
    ]);

    if (grantsResult.error) {
      console.error('Leave logs grants error:', grantsResult.error);
      return NextResponse.json(
        { error: '휴가 생성 로그 조회에 실패했습니다.' },
        { status: 500 }
      );
    }
    if (usagesResult.error) {
      console.error('Leave logs usages error:', usagesResult.error);
      return NextResponse.json(
        { error: '휴가 소진 로그 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      grants: grantsResult.data ?? [],
      usages: usagesResult.data ?? [],
    });
  } catch (error) {
    console.error('Leave logs error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
