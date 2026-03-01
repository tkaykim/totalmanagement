import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import { generateContent, isAllowedEmail } from '@/lib/ai/gemini';
import { createActivityLog, createTaskAssignedLog } from '@/lib/activity-logger';
import { notifyProjectPMAssigned, notifyTaskAssigned } from '@/lib/notification-sender';

export const dynamic = 'force-dynamic';

const BU_CODES = ['GRIGO', 'FLOW', 'REACT', 'MODOO', 'AST', 'HEAD'] as const;

type BuCode = (typeof BU_CODES)[number];

function parseJsonFromGemini(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  let toParse = trimmed;
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) toParse = jsonMatch[1].trim();
  else {
    const brace = trimmed.indexOf('{');
    if (brace >= 0) {
      const last = trimmed.lastIndexOf('}');
      if (last > brace) toParse = trimmed.slice(brace, last + 1);
    }
  }
  try {
    return JSON.parse(toParse) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeName(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function resolvePmByName(
  users: { id: string; name: string; bu_code: string | null; role?: string }[],
  pmName: string | undefined,
  buCode: BuCode
): string | null {
  if (pmName && pmName.trim()) {
    const name = normalizeName(pmName);
    const exactSameBu = users.filter(
      (u) => u.bu_code === buCode && u.name && normalizeName(u.name) === name
    );
    if (exactSameBu.length > 0) return exactSameBu[0].id;
    const exactAny = users.find((u) => u.name && normalizeName(u.name) === name);
    if (exactAny) return exactAny.id;
    const partialSameBu = users.find(
      (u) =>
        u.bu_code === buCode &&
        u.name &&
        (normalizeName(u.name).includes(name) || name.includes(normalizeName(u.name)))
    );
    if (partialSameBu) return partialSameBu.id;
    const partialAny = users.find(
      (u) =>
        u.name &&
        (normalizeName(u.name).includes(name) || name.includes(normalizeName(u.name)))
    );
    if (partialAny) return partialAny.id;
  }
  const buUsers = users.filter((u) => u.bu_code === buCode);
  const leader = buUsers.find((u) => u.role === 'leader');
  if (leader) return leader.id;
  const manager = buUsers.find((u) => u.role === 'manager');
  if (manager) return manager.id;
  if (buUsers.length > 0) return buUsers[0].id;
  return null;
}

function resolveUserByName(
  users: { id: string; name: string }[],
  name: string | undefined
): string | null {
  if (!name || !name.trim()) return null;
  const n = normalizeName(name);
  const exact = users.find((x) => x.name && normalizeName(x.name) === n);
  if (exact) return exact.id;
  const partial = users.find(
    (x) =>
      x.name &&
      (normalizeName(x.name).includes(n) || n.includes(normalizeName(x.name)))
  );
  return partial?.id ?? null;
}

function buildPlanMessage(action: string, parsed: Record<string, unknown>): string {
  const a = action;
  const p = parsed;
  if (a === 'create_project') {
    const lines = [
      '이렇게 생성할까요?',
      `· 사업부(BU): ${p.bu_code}`,
      `· 프로젝트명: ${p.name}`,
      ...(p.project_description ? [`· 프로젝트 설명: ${String(p.project_description).slice(0, 80)}${String(p.project_description).length > 80 ? '…' : ''}`] : []),
      `· 카테고리: ${p.category || '기타'}`,
      ...(p.pm_name ? [`· PM: ${p.pm_name}`] : ['· PM: 미지정']),
    ];
    return `[진행 예정] 프로젝트 생성\n${lines.join('\n')}\n\n확인 후 "실행"을 눌러 주세요.`;
  }
  if (a === 'create_task') {
    const lines = [
      '이렇게 할일을 추가할까요?',
      `· 프로젝트: ${p.project_name_or_keyword}`,
      `· 할일명: ${p.task_title}`,
      ...(p.task_description ? [`· 할일 설명: ${String(p.task_description).slice(0, 80)}${String(p.task_description).length > 80 ? '…' : ''}`] : []),
      `· 마감: ${p.due_date}`,
      ...(p.assignee_name ? [`· 담당자: ${p.assignee_name}`] : ['· 담당자: 미지정']),
    ];
    return `[진행 예정] 할일 추가\n${lines.join('\n')}\n\n확인 후 "실행"을 눌러 주세요.`;
  }
  if (a === 'update_task') {
    return `[진행 예정] 할일 수정: 프로젝트 "${p.project_name_or_keyword}"의 "${p.task_title}" (${[p.status && `상태→${p.status}`, p.assignee_name && `담당→${p.assignee_name}`, p.due_date && `마감→${p.due_date}`].filter(Boolean).join(', ') || '수정'}). 확인 후 "실행"을 눌러 주세요.`;
  }
  if (a === 'delete_task') {
    return `[진행 예정] 할일 삭제: 프로젝트 "${p.project_name_or_keyword}"의 "${p.task_title}". 확인 후 "실행"을 눌러 주세요.`;
  }
  if (a === 'create_financial') {
    return `[진행 예정] 재무 등록: 프로젝트 "${p.project_name_or_keyword}"에 ${p.kind === 'revenue' ? '매출' : '지출'} "${p.name}" ${Number(p.amount)?.toLocaleString()}원 (${p.occurred_at || '오늘'}). 확인 후 "실행"을 눌러 주세요.`;
  }
  return `[진행 예정] ${action}. 확인 후 "실행"을 눌러 주세요.`;
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const {
      data: { user: authUser },
    } = await authSupabase.auth.getUser();
    if (!authUser?.email || !isAllowedEmail(authUser.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const instruction =
      typeof body?.instruction === 'string' ? body.instruction.trim() : '';
    if (!instruction) {
      return NextResponse.json(
        { error: 'instruction is required' },
        { status: 400 }
      );
    }
    /** true일 때만 DB 반영(생성/수정/삭제) 실행. false면 파악 결과만 반환 */
    const shouldExecute = body?.execute === true;
    /** 실행 시 프론트에서 넘긴 계획(plan)이 있으면 Gemini 재호출 없이 이걸로 실행 */
    const submittedPlan = body?.plan && typeof body.plan === 'object' ? (body.plan as Record<string, unknown>) : null;

    /** 대화 기록(맥락 유지). 최근 N개만 사용 */
    const MAX_HISTORY = 20;
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    const historyMessages = rawMessages
      .slice(-MAX_HISTORY)
      .filter((m: unknown) => m && typeof (m as any).role === 'string' && typeof (m as any).content === 'string')
      .map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', content: String(m.content).trim() }))
      .filter((m) => m.content.length > 0);
    const conversationContext =
      historyMessages.length > 0
        ? `이전 대화 (맥락 유지용):\n${historyMessages.map((m) => `[${m.role === 'user' ? '사용자' : '어시스턴트'}]: ${m.content}`).join('\n')}\n\n위 대화를 참고하여 아래 "현재 사용자 지시"를 처리하세요.\n\n`
        : '';

    const supabase = await createPureClient();
    const { data: users } = await supabase
      .from('app_users')
      .select('id, name, bu_code, role');
    const { data: bus } = await supabase
      .from('business_units')
      .select('code, name');

    const userList = (users ?? []).map((u: any) => ({
      name: u.name,
      id: u.id,
      bu_code: u.bu_code,
      role: u.role,
    }));
    const buList = (bus ?? []).map((b: any) => ({ code: b.code, name: b.name }));

    const { data: projectsForPrompt } = await supabase
      .from('projects')
      .select('id, name, bu_code')
      .in('status', ['준비중', '진행중', '기획중'])
      .limit(50);
    const projectListForPrompt = (projectsForPrompt ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      bu_code: p.bu_code,
    }));

    const prompt = `${conversationContext}당신은 회사 ERP(프로젝트·할일·재무) 어시스턴트입니다.
사용자 지시를 아래 action 중 하나로 분류하고, 해당 필드만 채우세요.
중요: "PM은 OO", "담당 OO", "OO에게" 등 인명이 나오면 pm_name 또는 assignee_name에 넣으세요. 사용자가 프로젝트나 할일의 목적·내용을 자연어로 설명하면 project_description 또는 task_description에 요약해서 넣으세요.

action 종류:
- create_project: 프로젝트만 생성. 필드: bu_code, name, category, project_description? (프로젝트 설명), pm_name (지정 시 반드시 채움)
- create_project_and_task: 프로젝트 생성 + 그 프로젝트에 할일 한 건 추가. 필드: bu_code, name, category, project_description?, pm_name, task_title, task_description? (할일 설명), due_date (YYYY-MM-DD), assignee_name?, priority?
- project_status: 프로젝트 상황/현황 질의. 필드: project_name_or_keyword
- create_task: 기존 프로젝트에 할일 추가. 필드: project_name_or_keyword, task_title, task_description? (할일 설명), due_date (YYYY-MM-DD), assignee_name?, priority?
- update_task: 할일 수정. 필드: project_name_or_keyword, task_title, status?, assignee_name?, due_date?
- delete_task: 할일 삭제. 필드: project_name_or_keyword, task_title
- financial_status: 재무 현황 질의. 필드: project_name_or_keyword
- create_financial: 매출/지출 등록. 필드: project_name_or_keyword, kind, category, name, amount, occurred_at?, memo?
- person_busy: "OOO 바빠?", "OOO 상황 어때?" 등 특정 인물의 업무 부하·바쁨 질의. 필드: person_name (대상 인물 이름)
- none: 위에 해당 없음. 필드: message

JSON 하나만 출력. 사용하지 않는 필드는 null.
{"action":"create_project"|"create_project_and_task"|"project_status"|"create_task"|"update_task"|"delete_task"|"financial_status"|"create_financial"|"person_busy"|"none","project_name_or_keyword":string|null,"task_title":string|null,"bu_code":string|null,"name":string|null,"category":string|null,"project_description":string|null,"task_description":string|null,"pm_name":string|null,"due_date":string|null,"assignee_name":string|null,"priority":string|null,"status":string|null,"kind":string|null,"amount":number|null,"occurred_at":string|null,"memo":string|null,"person_name":string|null,"message":string}

사업부: ${JSON.stringify(buList)}
담당자(이름): ${JSON.stringify([...new Set(userList.map((u: any) => u.name))].slice(0, 40))}
프로젝트(이름으로 검색용): ${JSON.stringify(projectListForPrompt.map((p: any) => p.name).slice(0, 30))}

현재 사용자 지시: "${instruction}"`;

    let parsed: Record<string, unknown> | null;
    let action: string | undefined;
    let projectKeyword: string | undefined;

    if (shouldExecute && submittedPlan?.action && typeof submittedPlan.action === 'string') {
      parsed = submittedPlan;
      action = submittedPlan.action;
      projectKeyword = (submittedPlan.project_name_or_keyword as string)?.trim() ?? undefined;
    } else {
      const rawResponse = await generateContent(prompt);
      parsed = parseJsonFromGemini(rawResponse);
      action = parsed?.action as string | undefined;
      projectKeyword = (parsed?.project_name_or_keyword as string)?.trim();
    }

    if (action === 'project_status' && projectKeyword) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, bu_code, status, start_date, end_date, pm_id')
        .ilike('name', `%${projectKeyword}%`)
        .limit(10);
      const projList = projects ?? [];
      const projectIds = projList.map((p: any) => p.id);
      const userNameById = Object.fromEntries(
        userList.map((u: any) => [u.id, u.name])
      );
      let tasksByProject: Record<number, any[]> = {};
      if (projectIds.length > 0) {
        const { data: tasks } = await supabase
          .from('project_tasks')
          .select('id, project_id, title, status, due_date, assignee_id')
          .in('project_id', projectIds);
        const taskList = tasks ?? [];
        taskList.forEach((t: any) => {
          if (!tasksByProject[t.project_id]) tasksByProject[t.project_id] = [];
          tasksByProject[t.project_id].push({
            ...t,
            assignee_name: t.assignee_id ? userNameById[t.assignee_id] : null,
          });
        });
      }
      const today = new Date().toISOString().slice(0, 10);
      const payload = projList.map((p: any) => ({
        ...p,
        pm_name: p.pm_id ? userNameById[p.pm_id] : null,
        tasks: (tasksByProject[p.id] ?? []).map((t: any) => ({
          title: t.title,
          status: t.status,
          due_date: t.due_date,
          assignee_name: t.assignee_name,
          overdue: t.status !== 'done' && t.due_date < today,
        })),
      }));
      const statusPrompt = `${conversationContext}아래는 DB에서 조회한 실제 프로젝트·할일 데이터입니다.
${historyMessages.length > 0 ? '이전 대화 맥락을 반영하여 ' : ''}현재 상태를 분석하고, 문제나 지연이 있으면 해소 방안을 제안하세요. (상황, 진행률, 밀린 일, 담당자, 리스크 등)
데이터:
${JSON.stringify(payload, null, 2)}

현재 사용자 질문: "${instruction}"

한국어로 분석·제안을 포함해 충분히 서술하세요.`;
      const statusMessage = await generateContent(statusPrompt);
      return NextResponse.json({ message: statusMessage, created: null });
    }

    if (action === 'person_busy') {
      const personName = (parsed?.person_name as string)?.trim();
      if (!personName) {
        return NextResponse.json({
          message: '누구에 대한 바쁨/상황인지 인물 이름이 필요합니다. 예: "김동현 바빠?"',
          created: null,
        });
      }
      const userId = resolveUserByName(userList, personName);
      if (!userId) {
        return NextResponse.json({
          message: `"${personName}"(님)을(를) 담당자 목록에서 찾지 못했습니다. 정확한 이름으로 다시 질문해 주세요.`,
          created: null,
        });
      }
      const userNameById = Object.fromEntries(
        userList.map((u: any) => [u.id, u.name])
      );
      const targetName = userNameById[userId] ?? personName;

      const { data: projectsAsPm } = await supabase
        .from('projects')
        .select('id, name, bu_code, status, start_date, end_date')
        .eq('pm_id', userId)
        .in('status', ['준비중', '진행중', '기획중']);
      const pmProjects = projectsAsPm ?? [];

      const { data: allProjectsForParticipant } = await supabase
        .from('projects')
        .select('id, name, bu_code, status, participants')
        .in('status', ['준비중', '진행중', '기획중']);
      const asParticipant = (allProjectsForParticipant ?? []).filter((p: any) => {
        const parts = p.participants ?? [];
        const ids = parts.map((x: any) => (typeof x === 'string' ? x : x?.user_id)).filter(Boolean);
        return ids.includes(userId);
      });

      const { data: assignedTasks } = await supabase
        .from('project_tasks')
        .select('id, project_id, title, status, due_date, priority')
        .eq('assignee_id', userId)
        .order('due_date', { ascending: true });
      const tasks = assignedTasks ?? [];
      const projectIds = [...new Set(tasks.map((t: any) => t.project_id))];
      let projectNames: Record<number, string> = {};
      if (projectIds.length > 0) {
        const { data: projRows } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);
        (projRows ?? []).forEach((r: any) => {
          projectNames[r.id] = r.name;
        });
      }
      const today = new Date().toISOString().slice(0, 10);
      const tasksWithProject = tasks.map((t: any) => ({
        title: t.title,
        status: t.status,
        due_date: t.due_date,
        project_name: projectNames[t.project_id] ?? '',
        overdue: t.status !== 'done' && t.due_date && t.due_date < today,
      }));
      const overdueCount = tasksWithProject.filter((t: any) => t.overdue).length;
      const todoCount = tasks.filter((t: any) => t.status === 'todo').length;
      const inProgressCount = tasks.filter((t: any) => t.status === 'in_progress').length;
      const doneCount = tasks.filter((t: any) => t.status === 'done').length;

      const payload = {
        person_name: targetName,
        person_id: userId,
        projects_as_pm: pmProjects.map((p: any) => ({
          name: p.name,
          bu_code: p.bu_code,
          status: p.status,
          start_date: p.start_date,
          end_date: p.end_date,
        })),
        projects_as_participant: asParticipant.map((p: any) => ({
          name: p.name,
          bu_code: p.bu_code,
          status: p.status,
        })),
        tasks_assigned: tasksWithProject,
        summary: {
          pm_count: pmProjects.length,
          participant_count: asParticipant.length,
          task_total: tasks.length,
          task_todo: todoCount,
          task_in_progress: inProgressCount,
          task_done: doneCount,
          overdue_count: overdueCount,
        },
      };

      const busyPrompt = `${conversationContext}아래는 DB에서 조회한 실제 데이터입니다. "지금 OOO 바빠?", "OOO 상황 어때?" 등에 대해 프로젝트(PM/참여)와 할일(담당) 상태를 종합해 답하세요.
${historyMessages.length > 0 ? '이전 대화 맥락을 반영하여 ' : ''}바쁨 정도, 부하 원인, 필요 시 조정 제안을 포함해 서술하세요.
데이터:
${JSON.stringify(payload, null, 2)}

현재 사용자 질문: "${instruction}"

한국어로 분석·제안을 포함해 충분히 서술하세요.`;
      const busyMessage = await generateContent(busyPrompt);
      return NextResponse.json({ message: busyMessage, created: null });
    }

    if (action === 'financial_status' && projectKeyword) {
      const { data: projs } = await supabase
        .from('projects')
        .select('id, name, bu_code')
        .ilike('name', `%${projectKeyword}%`)
        .limit(10);
      const pList = projs ?? [];
      const pIds = pList.map((p: any) => p.id);
      if (pIds.length === 0) {
        return NextResponse.json({
          message: `"${projectKeyword}"에 해당하는 프로젝트를 찾지 못했습니다.`,
          created: null,
        });
      }
      const { data: entries } = await supabase
        .from('financial_entries')
        .select('id, project_id, kind, category, name, amount, occurred_at, status')
        .in('project_id', pIds)
        .order('occurred_at', { ascending: false });
      const byProject: Record<number, any[]> = {};
      (entries ?? []).forEach((e: any) => {
        if (!byProject[e.project_id]) byProject[e.project_id] = [];
        byProject[e.project_id].push(e);
      });
      const payload = pList.map((p: any) => ({
        project: p,
        entries: byProject[p.id] ?? [],
      }));
      const finPrompt = `${conversationContext}아래는 DB에서 조회한 프로젝트별 재무(매출/지출) 데이터입니다.
${historyMessages.length > 0 ? '이전 대화 맥락을 반영하여 ' : ''}현황을 분석하고 필요 시 인사이트나 제안을 포함하세요.
데이터: ${JSON.stringify(payload, null, 2)}

현재 사용자 질문: "${instruction}"

한국어로 분석·제안을 포함해 충분히 서술하세요.`;
      const finMessage = await generateContent(finPrompt);
      return NextResponse.json({ message: finMessage, created: null });
    }

    if (action === 'create_task' && projectKeyword) {
      const taskTitle = (parsed?.task_title as string)?.trim();
      const dueDate = (parsed?.due_date as string)?.trim();
      if (!taskTitle || !dueDate) {
        return NextResponse.json({
          message: '할일 제목과 마감일(due_date)이 필요합니다.',
          created: null,
        });
      }
      const { data: proj } = await supabase
        .from('projects')
        .select('id, name, bu_code')
        .ilike('name', `%${projectKeyword}%`)
        .limit(1)
        .single();
      if (!proj) {
        return NextResponse.json({
          message: `"${projectKeyword}" 프로젝트를 찾지 못했습니다.`,
          created: null,
        });
      }
      const taskDescription = (parsed?.task_description as string)?.trim() || null;
      const planPriority = (parsed?.priority as string) === 'high' || (parsed?.priority as string) === 'low'
        ? (parsed.priority as string)
        : 'medium';
      if (!shouldExecute) {
        const planPayload = { ...parsed, project_name_or_keyword: projectKeyword, task_title: taskTitle, task_description: taskDescription, due_date: dueDate, assignee_name: (parsed?.assignee_name as string)?.trim() ?? null };
        return NextResponse.json({
          message: buildPlanMessage('create_task', planPayload),
          plan: { action: 'create_task', project_name_or_keyword: projectKeyword, task_title: taskTitle, task_description: taskDescription, due_date: dueDate, assignee_name: (parsed?.assignee_name as string)?.trim() ?? null, priority: planPriority },
          executed: false,
        });
      }
      const assigneeName = (parsed?.assignee_name as string)?.trim();
      const assigneeId = resolveUserByName(userList, assigneeName || undefined);
      const priority = (parsed?.priority as string) === 'high' || (parsed?.priority as string) === 'low'
        ? (parsed.priority as string)
        : 'medium';
      const taskInsertPayload: Record<string, unknown> = {
        project_id: proj.id,
        bu_code: proj.bu_code,
        title: taskTitle,
        due_date: dueDate,
        assignee_id: assigneeId,
        assignee: assigneeName || null,
        status: 'todo',
        priority,
        created_by: authUser.id,
      };
      if (taskDescription) taskInsertPayload.description = taskDescription;
      const { data: task, error: taskErr } = await supabase
        .from('project_tasks')
        .insert(taskInsertPayload)
        .select('id, title, project_id')
        .single();
      if (taskErr) {
        return NextResponse.json({
          message: `할일 생성 실패: ${taskErr.message}`,
          created: null,
        }, { status: 500 });
      }
      await createActivityLog({
        userId: authUser.id,
        actionType: 'task_created',
        entityType: 'task',
        entityId: String(task.id),
        entityTitle: task.title,
        metadata: { project_id: proj.id, source: 'ai_command' },
      });
      if (assigneeId && assigneeId !== authUser.id) {
        const creatorName = userList.find((u: any) => u.id === authUser.id)?.name;
        await createTaskAssignedLog(assigneeId, String(task.id), task.title, authUser.id);
        await notifyTaskAssigned(assigneeId, task.title, proj.name, String(task.id), creatorName);
      }
      return NextResponse.json({
        message: `"${task.title}" 할일을 [${proj.name}]에 추가했습니다.${assigneeId ? ' 담당자 지정됨.' : ''}`,
        created: { task_id: task.id, title: task.title, project_name: proj.name },
      });
    }

    if (action === 'update_task' && projectKeyword) {
      const taskTitle = (parsed?.task_title as string)?.trim();
      if (!taskTitle) {
        return NextResponse.json({ message: '수정할 할일 제목(일부)이 필요합니다.', created: null });
      }
      const { data: projs } = await supabase
        .from('projects')
        .select('id, name')
        .ilike('name', `%${projectKeyword}%`)
        .limit(5);
      const projIds = (projs ?? []).map((p: any) => p.id);
      if (projIds.length === 0) {
        return NextResponse.json({ message: `"${projectKeyword}" 프로젝트를 찾지 못했습니다.`, created: null });
      }
      const { data: tasks } = await supabase
        .from('project_tasks')
        .select('id, title, project_id')
        .in('project_id', projIds)
        .ilike('title', `%${taskTitle}%`)
        .limit(5);
      const taskList = tasks ?? [];
      if (taskList.length === 0) {
        return NextResponse.json({ message: `"${taskTitle}" 할일을 찾지 못했습니다.`, created: null });
      }
      const target = taskList[0];
      const projName = projs?.find((p: any) => p.id === target.project_id)?.name ?? '';
      if (!shouldExecute) {
        return NextResponse.json({
          message: buildPlanMessage('update_task', { ...parsed, project_name_or_keyword: projectKeyword, task_title: taskTitle }),
          plan: { action: 'update_task', project_name_or_keyword: projectKeyword, task_title: taskTitle, task_id: target.id, status: parsed?.status, assignee_name: parsed?.assignee_name, due_date: parsed?.due_date },
          executed: false,
        });
      }
      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      const newStatus = parsed?.status as string | undefined;
      if (newStatus && ['todo', 'in_progress', 'done'].includes(newStatus)) {
        updatePayload.status = newStatus;
      }
      const newAssigneeName = (parsed?.assignee_name as string)?.trim();
      let newAssigneeId: string | null = null;
      if (newAssigneeName) {
        const aid = resolveUserByName(userList, newAssigneeName);
        if (aid) {
          updatePayload.assignee_id = aid;
          newAssigneeId = aid;
        }
      }
      const newDue = (parsed?.due_date as string)?.trim();
      if (newDue) updatePayload.due_date = newDue;
      const { data: updated, error: upErr } = await supabase
        .from('project_tasks')
        .update(updatePayload)
        .eq('id', target.id)
        .select()
        .single();
      if (upErr) {
        return NextResponse.json({ message: `할일 수정 실패: ${upErr.message}`, created: null }, { status: 500 });
      }
      if (newAssigneeId && newAssigneeId !== authUser.id) {
        const creatorName = userList.find((u: any) => u.id === authUser.id)?.name;
        await notifyTaskAssigned(newAssigneeId, updated.title, projName, String(updated.id), creatorName);
      }
      return NextResponse.json({
        message: `"${updated.title}" 할일을 수정했습니다.`,
        created: { task_id: updated.id, title: updated.title },
      });
    }

    if (action === 'delete_task' && projectKeyword) {
      const taskTitle = (parsed?.task_title as string)?.trim();
      if (!taskTitle) {
        return NextResponse.json({ message: '삭제할 할일 제목(일부)이 필요합니다.', created: null });
      }
      const { data: projs } = await supabase
        .from('projects')
        .select('id')
        .ilike('name', `%${projectKeyword}%`)
        .limit(5);
      const projIds = (projs ?? []).map((p: any) => p.id);
      if (projIds.length === 0) {
        return NextResponse.json({ message: `"${projectKeyword}" 프로젝트를 찾지 못했습니다.`, created: null });
      }
      const { data: tasks } = await supabase
        .from('project_tasks')
        .select('id, title')
        .in('project_id', projIds)
        .ilike('title', `%${taskTitle}%`)
        .limit(5);
      const taskList = tasks ?? [];
      if (taskList.length === 0) {
        return NextResponse.json({ message: `"${taskTitle}" 할일을 찾지 못했습니다.`, created: null });
      }
      const target = taskList[0];
      if (!shouldExecute) {
        return NextResponse.json({
          message: buildPlanMessage('delete_task', { ...parsed, project_name_or_keyword: projectKeyword, task_title: taskTitle }),
          plan: { action: 'delete_task', project_name_or_keyword: projectKeyword, task_title: taskTitle, task_id: target.id },
          executed: false,
        });
      }
      const { error: delErr } = await supabase.from('project_tasks').delete().eq('id', target.id);
      if (delErr) {
        return NextResponse.json({ message: `할일 삭제 실패: ${delErr.message}`, created: null }, { status: 500 });
      }
      return NextResponse.json({
        message: `"${target.title}" 할일을 삭제했습니다.`,
        created: null,
      });
    }

    if (action === 'create_financial' && projectKeyword) {
      const kind = parsed?.kind as string;
      const name = (parsed?.name as string)?.trim();
      const amount = typeof parsed?.amount === 'number' ? parsed.amount : parseInt(String(parsed?.amount ?? '0'), 10);
      const category = (parsed?.category as string)?.trim() || '기타';
      if (!name || !amount || amount <= 0 || (kind !== 'revenue' && kind !== 'expense')) {
        return NextResponse.json({
          message: '재무 등록에는 kind(revenue/expense), name(항목명), amount(금액), category가 필요합니다.',
          created: null,
        });
      }
      const { data: proj } = await supabase
        .from('projects')
        .select('id, name, bu_code')
        .ilike('name', `%${projectKeyword}%`)
        .limit(1)
        .single();
      if (!proj) {
        return NextResponse.json({
          message: `"${projectKeyword}" 프로젝트를 찾지 못했습니다.`,
          created: null,
        });
      }
      const occurredAt = (parsed?.occurred_at as string)?.trim() || new Date().toISOString().slice(0, 10);
      const memo = (parsed?.memo as string)?.trim() || null;
      if (!shouldExecute) {
        return NextResponse.json({
          message: buildPlanMessage('create_financial', { ...parsed, project_name_or_keyword: projectKeyword, occurred_at: occurredAt }),
          plan: { action: 'create_financial', project_name_or_keyword: projectKeyword, kind, name, amount, category, occurred_at: occurredAt, memo },
          executed: false,
        });
      }
      const { data: entry, error: finErr } = await supabase
        .from('financial_entries')
        .insert({
          project_id: proj.id,
          bu_code: proj.bu_code,
          kind,
          category,
          name,
          amount,
          occurred_at: occurredAt,
          status: 'planned',
          memo,
          created_by: authUser.id,
        })
        .select('id, name, kind, amount, occurred_at')
        .single();
      if (finErr) {
        return NextResponse.json({ message: `재무 등록 실패: ${finErr.message}`, created: null }, { status: 500 });
      }
      await createActivityLog({
        userId: authUser.id,
        actionType: 'financial_created',
        entityType: 'financial_entry',
        entityId: String(entry.id),
        entityTitle: entry.name,
        metadata: { kind, project_id: proj.id, source: 'ai_command' },
      });
      return NextResponse.json({
        message: `[${proj.name}]에 ${kind === 'revenue' ? '매출' : '지출'} "${entry.name}" ${amount.toLocaleString()}원을 등록했습니다.`,
        created: { financial_id: entry.id, name: entry.name, kind: entry.kind, amount: entry.amount },
      });
    }

    if (action === 'create_project_and_task') {
      const buCodeRaw = parsed?.bu_code;
      const projName = (parsed?.name as string)?.trim();
      const taskTitle = (parsed?.task_title as string)?.trim();
      const dueDate = (parsed?.due_date as string)?.trim();
      if (!buCodeRaw || !projName || !taskTitle || !dueDate) {
        return NextResponse.json({
          message: 'create_project_and_task에는 bu_code, name, task_title, due_date가 필요합니다.',
          created: null,
        });
      }
      const buCode = String(buCodeRaw).toUpperCase() as BuCode;
      if (!BU_CODES.includes(buCode)) {
        return NextResponse.json({
          message: `사업부 코드가 올바르지 않습니다: ${buCode}`,
          created: null,
        });
      }
      const category = (parsed?.category && String(parsed.category).trim()) || '기타';
      const projectDescription = (parsed?.project_description as string)?.trim() || null;
      const taskDescription = (parsed?.task_description as string)?.trim() || null;
      const pmName = (parsed?.pm_name && String(parsed.pm_name).trim()) || undefined;
      const assigneeName = (parsed?.assignee_name as string)?.trim() || undefined;
      const priority = (parsed?.priority as string) === 'high' || (parsed?.priority as string) === 'low'
        ? (parsed.priority as string)
        : 'medium';

      if (!shouldExecute) {
        const lines = [
          '이렇게 생성할까요?',
          '【프로젝트】',
          `· 사업부(BU): ${buCode}`,
          `· 프로젝트명: ${projName}`,
          ...(projectDescription ? [`· 프로젝트 설명: ${projectDescription.slice(0, 80)}${projectDescription.length > 80 ? '…' : ''}`] : []),
          `· 카테고리: ${category}`,
          ...(pmName ? [`· PM: ${pmName}`] : ['· PM: 미지정']),
          '【할일】',
          `· 할일명: ${taskTitle}`,
          ...(taskDescription ? [`· 할일 설명: ${taskDescription.slice(0, 80)}${taskDescription.length > 80 ? '…' : ''}`] : []),
          `· 마감: ${dueDate}`,
          ...(assigneeName ? [`· 담당자: ${assigneeName}`] : ['· 담당자: 미지정']),
        ];
        const planMsg = `[진행 예정] 프로젝트 + 할일 생성\n${lines.join('\n')}\n\n확인 후 "실행"을 눌러 주세요.`;
        return NextResponse.json({
          message: planMsg,
          plan: {
            action: 'create_project_and_task',
            bu_code: buCode,
            name: projName,
            category,
            project_description: projectDescription,
            pm_name: pmName ?? null,
            task_title: taskTitle,
            task_description: taskDescription,
            due_date: dueDate,
            assignee_name: assigneeName ?? null,
            priority,
          },
          executed: false,
        });
      }

      const pmId = resolvePmByName(
        userList as { id: string; name: string; bu_code: string | null; role?: string }[],
        pmName,
        buCode
      );
      const assigneeId = resolveUserByName(userList, assigneeName);

      const insertData: Record<string, unknown> = {
        bu_code: buCode,
        name: projName,
        category,
        status: '준비중',
        created_by: authUser.id,
        participants: [],
      };
      if (projectDescription) insertData.description = projectDescription;
      if (pmId) insertData.pm_id = pmId;

      const { data: project, error: projErr } = await supabase
        .from('projects')
        .insert(insertData)
        .select('id, name, bu_code, pm_id')
        .single();

      if (projErr) {
        console.error('AI create_project_and_task project insert error:', projErr);
        return NextResponse.json(
          { message: `프로젝트 생성 실패: ${projErr.message}`, created: null },
          { status: 500 }
        );
      }

      await createActivityLog({
        userId: authUser.id,
        actionType: 'project_created',
        entityType: 'project',
        entityId: String(project.id),
        entityTitle: project.name,
        metadata: { bu_code: project.bu_code, status: '준비중', source: 'ai_command' },
      });
      const creatorName = userList.find((u: any) => u.id === authUser.id)?.name;
      if (pmId && pmId !== authUser.id) {
        await notifyProjectPMAssigned(pmId, project.name, String(project.id), creatorName);
      }

      const taskInsertPayload: Record<string, unknown> = {
        project_id: project.id,
        bu_code: project.bu_code,
        title: taskTitle,
        due_date: dueDate,
        assignee_id: assigneeId,
        assignee: assigneeName || null,
        status: 'todo',
        priority,
        created_by: authUser.id,
      };
      if (taskDescription) taskInsertPayload.description = taskDescription;
      const { data: task, error: taskErr } = await supabase
        .from('project_tasks')
        .insert(taskInsertPayload)
        .select('id, title, project_id')
        .single();

      if (taskErr) {
        return NextResponse.json({
          message: `프로젝트는 생성됐으나 할일 추가 실패: ${taskErr.message}`,
          created: { project_id: project.id, name: project.name, bu_code: project.bu_code, pm_id: project.pm_id ?? null },
        }, { status: 500 });
      }

      await createActivityLog({
        userId: authUser.id,
        actionType: 'task_created',
        entityType: 'task',
        entityId: String(task.id),
        entityTitle: task.title,
        metadata: { project_id: project.id, source: 'ai_command' },
      });
      if (assigneeId && assigneeId !== authUser.id) {
        await createTaskAssignedLog(assigneeId, String(task.id), task.title, authUser.id);
        await notifyTaskAssigned(assigneeId, task.title, project.name, String(task.id), creatorName);
      }

      const msgParts = [`"${project.name}" 프로젝트를 생성했습니다.`];
      if (pmId) msgParts.push('PM 지정됨.');
      msgParts.push(`"${task.title}" 할일을 추가했습니다.`);
      if (assigneeId) msgParts.push('담당자 지정됨.');

      return NextResponse.json({
        message: msgParts.join(' '),
        created: {
          project_id: project.id,
          name: project.name,
          bu_code: project.bu_code,
          pm_id: project.pm_id ?? null,
          task_id: task.id,
          title: task.title,
          project_name: project.name,
        },
      });
    }

    const message = (parsed?.message as string) || '처리되었습니다.';

    if (action !== 'create_project' || !parsed?.bu_code || !parsed?.name) {
      return NextResponse.json({ message, created: null });
    }

    const buCode = String(parsed.bu_code).toUpperCase() as BuCode;
    if (!BU_CODES.includes(buCode)) {
      return NextResponse.json({
        message: `사업부 코드가 올바르지 않습니다: ${buCode}`,
        created: null,
      });
    }

    const name = String(parsed.name).trim();
    const category = (parsed.category && String(parsed.category).trim()) || '';
    const projectDescription = (parsed.project_description as string)?.trim() || null;
    const pmName = (parsed.pm_name && String(parsed.pm_name).trim()) || undefined;

    const pmId = resolvePmByName(
      userList as {
        id: string;
        name: string;
        bu_code: string | null;
        role?: string;
      }[],
      pmName,
      buCode
    );

    if (!shouldExecute) {
      const planPayload = { ...parsed, bu_code: buCode, name, category: category || '기타', project_description: projectDescription, pm_name: pmName ?? null };
      return NextResponse.json({
        message: buildPlanMessage('create_project', planPayload),
        plan: { action: 'create_project', bu_code: buCode, name, category: category || '기타', project_description: projectDescription, pm_name: pmName ?? null },
        executed: false,
      });
    }

    const insertData: Record<string, unknown> = {
      bu_code: buCode,
      name,
      category: category || '기타',
      status: '준비중',
      created_by: authUser.id,
      participants: [],
    };
    if (projectDescription) insertData.description = projectDescription;
    if (pmId) insertData.pm_id = pmId;

    const { data: project, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select('id, name, bu_code, pm_id')
      .single();

    if (error) {
      console.error('AI create_project insert error:', error);
      return NextResponse.json(
        { message: `프로젝트 생성 실패: ${error.message}`, created: null },
        { status: 500 }
      );
    }

    await createActivityLog({
      userId: authUser.id,
      actionType: 'project_created',
      entityType: 'project',
      entityId: String(project.id),
      entityTitle: project.name,
      metadata: { bu_code: project.bu_code, status: '준비중', source: 'ai_command' },
    });

    const creatorName = userList.find((u: any) => u.id === authUser.id)?.name;
    if (pmId && pmId !== authUser.id) {
      await notifyProjectPMAssigned(
        pmId,
        project.name,
        String(project.id),
        creatorName
      );
    }

    const createdMessage = pmId
      ? `"${project.name}" 프로젝트를 ${buCode}(으)로 생성했고, PM을 지정했습니다.`
      : `"${project.name}" 프로젝트를 ${buCode}(으)로 생성했습니다. (PM 미지정)`;

    return NextResponse.json({
      message: createdMessage,
      created: {
        project_id: project.id,
        name: project.name,
        bu_code: project.bu_code,
        pm_id: project.pm_id ?? null,
      },
    });
  } catch (err) {
    console.error('AI execute-command error:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to process instruction',
      },
      { status: 500 }
    );
  }
}
