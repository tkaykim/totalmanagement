import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { notifyTaskDueSoon } from '@/lib/notification-sender';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';

/**
 * 마감 임박 할일 알림 발송 API
 * Cron Job으로 하루에 한 번 호출하여 마감 1일 전 할일에 대해 알림 발송
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
    
    // 보안 키 검증 (설정된 경우에만)
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const daysAhead = parseInt(searchParams.get('days') || '1');
    const supabase = await createPureClient();

    // 마감일이 N일 후인 할일 조회 (미완료 상태만)
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
        projects!project_tasks_project_id_fkey (
          name
        )
      `)
      .eq('due_date', targetDateStr)
      .neq('status', 'done')
      .not('assignee_id', 'is', null);

    if (error) {
      throw error;
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ 
        message: '마감 임박 할일이 없습니다.',
        date: targetDateStr,
        count: 0 
      });
    }

    // 이미 오늘 같은 할일에 대해 알림을 보냈는지 확인 (중복 방지)
    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();

    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('entity_id')
      .eq('title', '할일 마감이 임박했습니다')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    const alreadyNotifiedTaskIds = new Set(
      existingNotifications?.map(n => n.entity_id) || []
    );

    // 알림 발송
    let sentCount = 0;
    const results: { taskId: string; assigneeId: string; success: boolean }[] = [];

    for (const task of tasks) {
      // 이미 오늘 알림을 보낸 할일은 건너뜀
      if (alreadyNotifiedTaskIds.has(String(task.id))) {
        continue;
      }

      const projectName = (task as any).projects?.name || '프로젝트';
      
      const result = await notifyTaskDueSoon(
        task.assignee_id!,
        task.title,
        format(new Date(task.due_date), 'yyyy-MM-dd'),
        String(task.id)
      );

      results.push({
        taskId: String(task.id),
        assigneeId: task.assignee_id!,
        success: result.success,
      });

      if (result.success) {
        sentCount++;
      }
    }

    return NextResponse.json({
      message: `마감 임박 알림 발송 완료`,
      date: targetDateStr,
      totalTasks: tasks.length,
      sentCount,
      results,
    });
  } catch (error: any) {
    console.error('Due soon notification error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
