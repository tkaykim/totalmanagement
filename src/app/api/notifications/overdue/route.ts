import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { notifyOverdueSummary } from '@/lib/notification-sender';
import { format, startOfDay, endOfDay } from 'date-fns';

const OVERDUE_SUMMARY_TITLE = '마감이 지난 할일·프로젝트가 있습니다';

/**
 * 마감일 경과(overdue) 할일·프로젝트 요약 알림 발송 API
 * Cron으로 매일 오전 10시(KST) 호출하여, 마감일이 지난 미완료 할일/프로젝트에 대해
 * 담당자·PM당 하나의 요약 알림만 발송 (알림 최소화)
 *
 * GET /api/notifications/overdue
 * Query params:
 *   - key: API 보안 키 (환경변수 CRON_SECRET과 비교)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cronSecret = searchParams.get('key');

    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();

    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select(
        `
        id,
        assignee_id,
        project_id,
        projects!project_tasks_project_id_fkey ( pm_id )
      `
      )
      .lt('due_date', todayStr)
      .neq('status', 'done');

    if (tasksError) throw tasksError;

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, pm_id')
      .lt('end_date', todayStr)
      .neq('status', '완료')
      .not('pm_id', 'is', null);

    if (projectsError) throw projectsError;

    const overdueTaskCount = tasks?.length ?? 0;
    const overdueProjectCount = projects?.length ?? 0;

    if (overdueTaskCount === 0 && overdueProjectCount === 0) {
      return NextResponse.json({
        message: '마감일 경과 할일·프로젝트가 없습니다.',
        date: todayStr,
        overdueTaskCount: 0,
        overdueProjectCount: 0,
        sentCount: 0,
      });
    }

    const userTaskCount = new Map<string, number>();
    const userProjectCount = new Map<string, number>();

    for (const task of tasks ?? []) {
      const project = (task as unknown as { projects?: { pm_id: string | null } }).projects;
      const pmId = project?.pm_id ?? null;
      const assigneeId = task.assignee_id ?? null;
      if (assigneeId) {
        userTaskCount.set(assigneeId, (userTaskCount.get(assigneeId) ?? 0) + 1);
      }
      if (pmId) {
        userTaskCount.set(pmId, (userTaskCount.get(pmId) ?? 0) + 1);
      }
    }

    for (const project of projects ?? []) {
      const pmId = project.pm_id;
      if (pmId) {
        userProjectCount.set(pmId, (userProjectCount.get(pmId) ?? 0) + 1);
      }
    }

    const allUserIds = new Set<string>();
    userTaskCount.forEach((_, id) => allUserIds.add(id));
    userProjectCount.forEach((_, id) => allUserIds.add(id));

    const { data: existingSummary } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('title', OVERDUE_SUMMARY_TITLE)
      .eq('entity_id', 'overdue-summary')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    const alreadyNotifiedUserIds = new Set(
      existingSummary?.map((n) => n.user_id) || []
    );

    let sentCount = 0;
    const results: { userId: string; taskCount: number; projectCount: number; success: boolean }[] = [];

    for (const userId of allUserIds) {
      if (alreadyNotifiedUserIds.has(userId)) continue;

      const taskCount = userTaskCount.get(userId) ?? 0;
      const projectCount = userProjectCount.get(userId) ?? 0;
      if (taskCount === 0 && projectCount === 0) continue;

      const result = await notifyOverdueSummary(userId, taskCount, projectCount);
      results.push({ userId, taskCount, projectCount, success: result.success ?? false });
      if (result.success) sentCount++;
    }

    return NextResponse.json({
      message: '마감 경과 요약 알림 발송 완료',
      date: todayStr,
      overdueTaskCount,
      overdueProjectCount,
      sentCount,
      results,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Overdue notification error:', error);
    return NextResponse.json(
      { error: err?.message || String(error) },
      { status: 500 }
    );
  }
}
