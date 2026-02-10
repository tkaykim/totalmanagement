import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotification, createNotificationForUsers } from '@/lib/notification-sender';

/**
 * Push + 인앱 알림 통합 전송 API
 * admin 전용 - 특정 사용자 또는 전체에게 알림 전송
 * 
 * POST /api/push/send
 * body: {
 *   targetUserIds?: string[];  // 특정 사용자들 (없으면 전체)
 *   title: string;
 *   message: string;
 *   type?: 'info' | 'success' | 'warning' | 'error';
 *   actionUrl?: string;
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
    const { targetUserIds, title, message, type, actionUrl } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: '제목(title)과 메시지(message)는 필수입니다.' },
        { status: 400 }
      );
    }

    const notificationData = {
      title,
      message,
      type: type || 'info' as const,
      entityType: 'admin_push',
      actionUrl: actionUrl || '/',
    };

    if (targetUserIds && targetUserIds.length > 0) {
      // 특정 사용자들에게 전송
      const results = await createNotificationForUsers(targetUserIds, notificationData);
      return NextResponse.json({
        success: true,
        targetCount: targetUserIds.length,
        results,
      });
    } else {
      // 전체 사용자에게 전송
      const { data: allUsers } = await supabase
        .from('app_users')
        .select('id');

      const allUserIds = allUsers?.map(u => u.id) || [];
      const results = await createNotificationForUsers(allUserIds, notificationData);

      return NextResponse.json({
        success: true,
        targetCount: allUserIds.length,
        results,
      });
    }
  } catch (error: any) {
    console.error('Push send error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
