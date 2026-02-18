import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotificationForUsers } from '@/lib/notification-sender';
import { getPushScenarioById } from '@/features/push-test/constants/push-scenarios';

/**
 * 시나리오별 푸시 테스트 발송 API
 * POST /api/push/scenario
 * body: { scenarioId: string, targetUserId?: string }
 * - targetUserId 없으면 현재 로그인 사용자에게 발송
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const { scenarioId, targetUserId } = body;

    if (!scenarioId || typeof scenarioId !== 'string') {
      return NextResponse.json(
        { error: 'scenarioId는 필수입니다.' },
        { status: 400 }
      );
    }

    const scenario = getPushScenarioById(scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: `알 수 없는 시나리오: ${scenarioId}` },
        { status: 400 }
      );
    }

    const recipientUserId = targetUserId && targetUserId.trim() ? targetUserId.trim() : user.id;

    const notificationData = {
      title: scenario.title,
      message: scenario.body,
      type: 'info' as const,
      entityType: 'scenario_test',
      actionUrl: scenario.actionUrl,
    };

    const results = await createNotificationForUsers([recipientUserId], notificationData);

    return NextResponse.json({
      success: true,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      targetUserId: recipientUserId,
      targetAudience: scenario.targetAudience,
      results,
    });
  } catch (error: unknown) {
    console.error('Push scenario error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * 시나리오 목록 조회 (관리자 확인용)
 * GET /api/push/scenario
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!appUser || appUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin 권한이 필요합니다.' }, { status: 403 });
    }

    const { PUSH_SCENARIOS } = await import('@/features/push-test/constants/push-scenarios');

    return NextResponse.json({
      scenarios: PUSH_SCENARIOS.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        targetAudience: s.targetAudience,
        title: s.title,
        body: s.body,
        actionUrl: s.actionUrl,
        category: s.category,
      })),
    });
  } catch (error: unknown) {
    console.error('Push scenario list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
