import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/push-sender';
import { isFirebaseAdminReady } from '@/lib/firebase-admin';

/**
 * Push 알림 테스트 API
 * 
 * POST /api/push/test
 * body: { userId?: string, title?: string, message?: string }
 * 
 * userId를 지정하지 않으면 현재 로그인한 사용자에게 전송
 * admin 권한만 사용 가능
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

    // Firebase 설정 확인
    if (!isFirebaseAdminReady()) {
      return NextResponse.json(
        {
          error: 'Firebase Admin SDK가 설정되지 않았습니다.',
          hint: 'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY 환경변수를 확인하세요.',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const targetUserId = body.userId || user.id;
    const title = body.title || 'Push 테스트';
    const message = body.message || '이것은 Push 알림 테스트입니다. 정상적으로 수신되었다면 성공!';

    // Push 전송
    const result = await sendPushToUser(targetUserId, {
      title,
      body: message,
      data: {
        type: 'info',
        action_url: '/',
        test: 'true',
      },
    });

    return NextResponse.json({
      success: result.success,
      targetUserId,
      result,
    });
  } catch (error: any) {
    console.error('Push test error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * Push 상태 확인 API
 * 
 * GET /api/push/test
 * Firebase 설정 상태 및 현재 사용자의 Push 토큰 확인
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Firebase 설정 상태
    const firebaseReady = isFirebaseAdminReady();

    // 현재 사용자의 Push 토큰
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('id, token, platform, is_active, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const activeTokens = tokens?.filter(t => t.is_active) || [];

    return NextResponse.json({
      firebaseConfigured: firebaseReady,
      userId: user.id,
      totalTokens: tokens?.length || 0,
      activeTokens: activeTokens.length,
      tokens: tokens?.map(t => ({
        id: t.id,
        platform: t.platform,
        isActive: t.is_active,
        tokenPreview: t.token.substring(0, 20) + '...',
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
    });
  } catch (error: any) {
    console.error('Push status check error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
