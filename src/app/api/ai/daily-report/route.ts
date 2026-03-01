import { NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import { generateContent, isAllowedEmail } from '@/lib/ai/gemini';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();
    if (!user?.email || !isAllowedEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 503 }
      );
    }

    const supabase = await createPureClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: projects } = await supabase
      .from('projects')
      .select('id, bu_code, name, status, start_date, end_date');
    const { data: tasks } = await supabase
      .from('project_tasks')
      .select('id, project_id, bu_code, title, due_date, status, assignee_id');
    const { data: users } = await supabase
      .from('app_users')
      .select('id, name, bu_code');
    const { data: bus } = await supabase
      .from('business_units')
      .select('code, name');

    const projectList = projects ?? [];
    const taskList = tasks ?? [];
    const userList = users ?? [];
    const buList = bus ?? [];

    const buNames: Record<string, string> = Object.fromEntries(
      buList.map((b: { code: string; name: string }) => [b.code, b.name])
    );
    const userNameById: Record<string, string> = Object.fromEntries(
      userList.map((u: { id: string; name: string }) => [u.id, u.name])
    );

    const statusCountByBu: Record<string, Record<string, number>> = {};
    projectList.forEach((p: { bu_code: string; status: string }) => {
      if (!statusCountByBu[p.bu_code]) statusCountByBu[p.bu_code] = {};
      statusCountByBu[p.bu_code][p.status] =
        (statusCountByBu[p.bu_code][p.status] ?? 0) + 1;
    });

    const overdueTasks = taskList.filter(
      (t: { status: string; due_date: string }) =>
        t.status !== 'done' && t.due_date < today
    );
    const overdueByAssignee: Record<string, number> = {};
    overdueTasks.forEach((t: { assignee_id: string | null }) => {
      const id = t.assignee_id ?? '_unassigned';
      overdueByAssignee[id] = (overdueByAssignee[id] ?? 0) + 1;
    });

    const activeByAssignee: Record<string, number> = {};
    taskList
      .filter(
        (t: { status: string }) => t.status === 'todo' || t.status === 'in_progress'
      )
      .forEach((t: { assignee_id: string | null }) => {
        const id = t.assignee_id ?? '_unassigned';
        activeByAssignee[id] = (activeByAssignee[id] ?? 0) + 1;
      });

    const summary = {
      date: today,
      businessUnits: buNames,
      projectCountByBuAndStatus: statusCountByBu,
      overdueTaskCount: overdueTasks.length,
      overdueTasksSample: overdueTasks.slice(0, 15).map((t: any) => ({
        title: t.title,
        bu_code: t.bu_code,
        due_date: t.due_date,
        assignee: t.assignee_id ? userNameById[t.assignee_id] : null,
      })),
      overdueByAssignee: Object.entries(overdueByAssignee).map(([id, cnt]) => ({
        name: id === '_unassigned' ? '미배정' : userNameById[id] ?? id,
        count: cnt,
      })),
      activeTaskCountByAssignee: Object.entries(activeByAssignee)
        .map(([id, cnt]) => ({
          name: id === '_unassigned' ? '미배정' : userNameById[id] ?? id,
          count: cnt,
        }))
        .sort((a, b) => b.count - a.count),
    };

    const prompt = `당신은 회사 ERP 운영을 돕는 어시스턴트입니다. 아래 JSON은 오늘 기준 프로젝트·할일·담당자 현황 요약입니다.
이 데이터를 바탕으로 "오늘 업무 파악 보고"를 한국어로 작성해 주세요. 다음을 포함하세요:
1. 사업부별 진행 중인 프로젝트 수와 상태
2. 기한이 지난 할일(밀린 일)이 몇 건인지, 누가 많이 밀리고 있는지
3. 담당자별로 진행 중 업무가 많은 사람(바쁜 사람)과 적은 사람(여유 있는 사람)
4. 한 줄 정도의 종합 코멘트나 제안

JSON 데이터:
${JSON.stringify(summary, null, 2)}

보고서만 출력하고, 다른 설명은 하지 마세요.`;

    const report = await generateContent(prompt);
    return NextResponse.json({ report });
  } catch (err) {
    console.error('AI daily-report error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
}
