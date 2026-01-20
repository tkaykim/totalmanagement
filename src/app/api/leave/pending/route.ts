import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 권한 체크
    const { data: currentUser } = await supabase
      .from('app_users')
      .select('role, bu_code')
      .eq('id', user.id)
      .single();

    if (!currentUser || !['admin', 'leader'].includes(currentUser.role)) {
      return NextResponse.json({ error: '승인 권한이 없습니다.' }, { status: 403 });
    }

    const pendingItems: Array<{
      id: string;
      type: 'leave' | 'compensatory';
      requester_id: string;
      requester_name: string;
      requester_bu_code: string | null;
      request_type: string;
      start_date?: string;
      end_date?: string;
      days: number;
      reason: string;
      created_at: string;
    }> = [];

    // 휴가 사용 신청 조회
    let leaveQuery = supabase
      .from('leave_requests')
      .select(`
        *,
        requester:app_users!leave_requests_requester_id_fkey(id, name, bu_code)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    // Leader는 같은 BU만 조회
    if (currentUser.role === 'leader') {
      const { data: buUsers } = await supabase
        .from('app_users')
        .select('id')
        .eq('bu_code', currentUser.bu_code);

      if (buUsers && buUsers.length > 0) {
        leaveQuery = leaveQuery.in('requester_id', buUsers.map(u => u.id));
      }
    }

    const { data: leaveRequests } = await leaveQuery;

    if (leaveRequests) {
      for (const req of leaveRequests) {
        const requester = req.requester as { id: string; name: string; bu_code: string | null } | null;
        pendingItems.push({
          id: req.id,
          type: 'leave',
          requester_id: req.requester_id,
          requester_name: requester?.name || 'Unknown',
          requester_bu_code: requester?.bu_code || null,
          request_type: req.leave_type,
          start_date: req.start_date,
          end_date: req.end_date,
          days: Number(req.days_used),
          reason: req.reason,
          created_at: req.created_at,
        });
      }
    }

    // 대체휴무 생성 신청은 HEAD admin만 조회
    if (currentUser.role === 'admin' && currentUser.bu_code === 'HEAD') {
      const { data: compRequests } = await supabase
        .from('compensatory_requests')
        .select(`
          *,
          requester:app_users!compensatory_requests_requester_id_fkey(id, name, bu_code)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (compRequests) {
        for (const req of compRequests) {
          const requester = req.requester as { id: string; name: string; bu_code: string | null } | null;
          pendingItems.push({
            id: req.id,
            type: 'compensatory',
            requester_id: req.requester_id,
            requester_name: requester?.name || 'Unknown',
            requester_bu_code: requester?.bu_code || null,
            request_type: 'compensatory_create',
            days: Number(req.days),
            reason: req.reason,
            created_at: req.created_at,
          });
        }
      }
    }

    // 생성일 기준 정렬
    pendingItems.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return NextResponse.json(pendingItems);
  } catch (error) {
    console.error('Pending approvals error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
