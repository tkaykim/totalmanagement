import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { notifyTaskOverdue } from '@/lib/notification-sender';
import { format, startOfDay, endOfDay } from 'date-fns';

const OVERDUE_TITLE = '할일 마감이 지났습니다';

/**
 * 마감일 경과(overdue) 할일 알림 발송 API
 * Cron으로 매일 오전 10시(KST) 호출하여, 마감일이 지난 미완료 할일에 대해
 * 담당자와 프로젝트 PM에게 알림 발송 (완료 처리 또는 마감일 조정 안내)
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

    const { data: tasks, error } = await supabase
      .from('project_tasks')
      .select(
        `
        id,
        title,
        due_date,
        assignee_id,
        project_id,
        projects!project_tasks_project_id_fkey (
          name,
          pm_id
        )
      `
      )
      .lt('due_date', todayStr)
      .neq('status', 'done');

    if (error) {
      throw error;
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        message: '마감일 경과 할일이 없습니다.',
        date: todayStr,
        count: 0,
      });
    }

    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();

    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('entity_id')
      .eq('title', OVERDUE_TITLE)
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    const alreadyNotifiedTaskIds = new Set(
      existingNotifications?.map((n) => n.entity_id) || []
    );

    let sentCount = 0;
    const results: { taskId: string; userId: string; success: boolean }[] = [];

    for (const task of tasks) {
      if (alreadyNotifiedTaskIds.has(String(task.id))) {
        continue;
      }

      const project = (task as any).projects;
      const projectName = project?.name || '프로젝트';
      const pmId = project?.pm_id ?? null;
      const assigneeId = task.assignee_id ?? null;
      const dueDateStr = format(new Date(task.due_date), 'yyyy-MM-dd');
      const taskIdStr = String(task.id);

      const recipientIds = new Set<string>();
      if (assigneeId) recipientIds.add(assigneeId);
      if (pmId) recipientIds.add(pmId);

      for (const userId of recipientIds) {
        const result = await notifyTaskOverdue(
          userId,
          task.title,
          dueDateStr,
          taskIdStr,
          projectName
        );
        results.push({
          taskId: taskIdStr,
          userId,
          success: result.success,
        });
        if (result.success) sentCount++;
      }
    }

    return NextResponse.json({
      message: '마감일 경과 알림 발송 완료',
      date: todayStr,
      totalTasks: tasks.length,
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
