import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { notifyDueSoonSummary, type DueSoonTaskItem } from '@/lib/notification-sender';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';

const DUE_SOON_SUMMARY_TITLE = '할일 마감이 임박했습니다';

/**
 * 마감 임박 할일 요약 알림 발송 API
 * Cron Job으로 하루에 한 번 호출하여, 마감 N일 전 할일을 담당자별로 묶어
 * 사용자당 하나의 요약 알림만 발송 (n개의 할일이 마감임박 + 제목 나열)
 *
 * GET /api/notifications/due-soon
 * Query params:
 *   - days: 마감까지 남은 일수 (기본값: 1)
 *   - key: API 보안 키 (환경변수 CRON_SECRET과 비교)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cronSecret = searchParams.get('key');

    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const daysAhead = parseInt(searchParams.get('days') || '1');
    const supabase = await createPureClient();

    const targetDate = addDays(new Date(), daysAhead);
    const targetDateStr = format(targetDate, 'yyyy-MM-dd');

    const { data: tasks, error } = await supabase
      .from('project_tasks')
      .select(`
        id,
        title,
        due_date,
        assignee_id,
        project_id,
        projects!project_tasks_project_id_fkey ( name )
      `)
      .eq('due_date', targetDateStr)
      .neq('status', 'done')
      .not('assignee_id', 'is', null);

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        message: '마감 임박 할일이 없습니다.',
        date: targetDateStr,
        count: 0,
      });
    }

    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();

    const { data: existingSummary } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('title', DUE_SOON_SUMMARY_TITLE)
      .eq('entity_id', 'due-soon-summary')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    const alreadyNotifiedUserIds = new Set(
      existingSummary?.map((n) => n.user_id) || []
    );

    const byAssignee = new Map<string, DueSoonTaskItem[]>();
    for (const task of tasks) {
      const assigneeId = task.assignee_id!;
      const projectName = (task as { projects?: { name?: string } }).projects?.name;
      const list = byAssignee.get(assigneeId) ?? [];
      list.push({ title: task.title, projectName: projectName ?? undefined });
      byAssignee.set(assigneeId, list);
    }

    let sentCount = 0;
    const results: { assigneeId: string; taskCount: number; success: boolean }[] = [];

    for (const [assigneeId, assigneeTasks] of byAssignee) {
      if (alreadyNotifiedUserIds.has(assigneeId)) continue;

      const result = await notifyDueSoonSummary(assigneeId, assigneeTasks);
      results.push({
        assigneeId,
        taskCount: assigneeTasks.length,
        success: result.success ?? false,
      });
      if (result.success) sentCount++;
    }

    return NextResponse.json({
      message: '마감 임박 요약 알림 발송 완료',
      date: targetDateStr,
      totalTasks: tasks.length,
      sentCount,
      results,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Due soon notification error:', error);
    return NextResponse.json(
      { error: err?.message || String(error) },
      { status: 500 }
    );
  }
}
