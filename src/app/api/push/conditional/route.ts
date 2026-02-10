import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotificationForUsers } from '@/lib/notification-sender';

/**
 * 조건부 Push 알림 전송 API
 * admin 전용 - 역할/사업부 기준으로 필터링하여 알림 전송
 * 
 * POST /api/push/conditional
 * body: {
 *   title: string;
 *   message: string;
 *   type?: 'info' | 'success' | 'warning' | 'error';
 *   actionUrl?: string;
 *   conditions: {
 *     roles?: string[];     // 필터링할 역할 목록
 *     buCodes?: string[];   // 필터링할 사업부 코드 목록
 *   };
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // admin 권한 확인
    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!appUser || appUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, message, type, actionUrl, conditions } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: '제목(title)과 메시지(message)는 필수입니다.' },
        { status: 400 }
      );
    }

    if (!conditions || (!conditions.roles?.length && !conditions.buCodes?.length)) {
      return NextResponse.json(
        { error: '최소 하나의 조건(역할 또는 사업부)을 지정해야 합니다.' },
        { status: 400 }
      );
    }

    // 조건에 맞는 사용자 조회
    let query = supabase.from('app_users').select('id, name, role, bu_code');

    if (conditions.roles && conditions.roles.length > 0) {
      query = query.in('role', conditions.roles);
    }

    if (conditions.buCodes && conditions.buCodes.length > 0) {
      query = query.in('bu_code', conditions.buCodes);
    }

    const { data: matchedUsers, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json(
        { error: '사용자 조회 실패: ' + queryError.message },
        { status: 500 }
      );
    }

    if (!matchedUsers || matchedUsers.length === 0) {
      return NextResponse.json({
        success: true,
        targetCount: 0,
        message: '조건에 맞는 사용자가 없습니다.',
        matchedUsers: [],
      });
    }

    const targetUserIds = matchedUsers.map(u => u.id);

    const notificationData = {
      title,
      message,
      type: type || ('info' as const),
      entityType: 'admin_push',
      actionUrl: actionUrl || '/',
    };

    const results = await createNotificationForUsers(targetUserIds, notificationData);

    return NextResponse.json({
      success: true,
      targetCount: targetUserIds.length,
      matchedUsers: matchedUsers.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        bu_code: u.bu_code,
      })),
      conditions,
      results,
    });
  } catch (error: unknown) {
    console.error('Conditional push error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
