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

function resolvePmByName(
  users: { id: string; name: string; bu_code: string | null; role?: string }[],
  pmName: string | undefined,
  buCode: BuCode
): string | null {
  if (pmName && pmName.trim()) {
    const name = pmName.trim();
    const sameBu = users.filter(
      (u) => u.bu_code === buCode && u.name && u.name.trim() === name
    );
    if (sameBu.length > 0) return sameBu[0].id;
    const anyMatch = users.find((u) => u.name && u.name.trim() === name);
    if (anyMatch) return anyMatch.id;
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
  const n = name.trim();
  const u = users.find((x) => x.name && x.name.trim() === n);
  return u?.id ?? null;
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

    const prompt = `당신은 회사 ERP(프로젝트·할일·재무) 어시스턴트입니다.
사용자 지시를 아래 action 중 하나로 분류하고, 해당 필드만 채우세요.

action 종류:
- create_project: 프로젝트 생성 (단체복/굿즈→MODOO, 댄스/안무→GRIGO|REACT). 필드: bu_code, name, category, pm_name
- project_status: 프로젝트 상황/현황 질의. 필드: project_name_or_keyword (검색 키워드)
- create_task: 할일 추가. 필드: project_name_or_keyword, task_title, due_date (YYYY-MM-DD), assignee_name?, priority? (high|medium|low)
- update_task: 할일 수정(상태/담당자/기한). 필드: project_name_or_keyword, task_title (할일 제목 일부), status? (todo|in_progress|done), assignee_name?, due_date?
- delete_task: 할일 삭제. 필드: project_name_or_keyword, task_title (할일 제목 일부)
- financial_status: 재무 현황 질의. 필드: project_name_or_keyword
- create_financial: 매출/지출 등록. 필드: project_name_or_keyword, kind ("revenue"|"expense"), category, name (항목명), amount (숫자), occurred_at? (YYYY-MM-DD), memo?
- none: 위에 해당 없음. 필드: message (한국어 답변만)

JSON 하나만 출력. 사용하지 않는 필드는 null.
{"action":"create_project"|"project_status"|"create_task"|"update_task"|"delete_task"|"financial_status"|"create_financial"|"none","project_name_or_keyword":string|null,"task_title":string|null,"bu_code":string|null,"name":string|null,"category":string|null,"pm_name":string|null,"due_date":string|null,"assignee_name":string|null,"priority":string|null,"status":string|null,"kind":string|null,"amount":number|null,"occurred_at":string|null,"memo":string|null,"message":string}

사업부: ${JSON.stringify(buList)}
담당자(이름): ${JSON.stringify([...new Set(userList.map((u: any) => u.name))].slice(0, 40))}
프로젝트(이름으로 검색용): ${JSON.stringify(projectListForPrompt.map((p: any) => p.name).slice(0, 30))}

사용자 지시: "${instruction}"`;

    const rawResponse = await generateContent(prompt);
    const parsed = parseJsonFromGemini(rawResponse);

    const action = parsed?.action as string | undefined;
    const projectKeyword = (parsed?.project_name_or_keyword as string)?.trim();

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
      const statusPrompt = `아래는 DB에서 조회한 실제 프로젝트·할일 데이터입니다. 사용자 질문에 맞춰 한국어로 요약해서 답하세요. (상황, 진행률, 밀린 일, 담당자 등)
데이터:
${JSON.stringify(payload, null, 2)}

사용자 질문: "${instruction}"

한국어로 짧고 명확하게 답변만 하세요.`;
      const statusMessage = await generateContent(statusPrompt);
      return NextResponse.json({ message: statusMessage, created: null });
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
      const finPrompt = `아래는 DB에서 조회한 프로젝트별 재무(매출/지출) 데이터입니다. 사용자 질문에 맞춰 한국어로 요약하세요.
데이터: ${JSON.stringify(payload, null, 2)}

사용자 질문: "${instruction}"

한국어로 짧고 명확하게 답변만 하세요.`;
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
      const assigneeName = (parsed?.assignee_name as string)?.trim();
      const assigneeId = resolveUserByName(userList, assigneeName || undefined);
      const priority = (parsed?.priority as string) === 'high' || (parsed?.priority as string) === 'low'
        ? (parsed.priority as string)
        : 'medium';
      const { data: task, error: taskErr } = await supabase
        .from('project_tasks')
        .insert({
          project_id: proj.id,
          bu_code: proj.bu_code,
          title: taskTitle,
          due_date: dueDate,
          assignee_id: assigneeId,
          assignee: assigneeName || null,
          status: 'todo',
          priority,
          created_by: authUser.id,
        })
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

    const message =
      (parsed?.message as string) ||
      (action === 'none' ? rawResponse : '처리되었습니다.');

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

    const insertData: Record<string, unknown> = {
      bu_code: buCode,
      name,
      category: category || '기타',
      status: '준비중',
      created_by: authUser.id,
      participants: [],
    };
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
