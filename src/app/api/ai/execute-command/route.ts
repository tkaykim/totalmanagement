import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import { generateContent, isAllowedEmail } from '@/lib/ai/gemini';
import { createActivityLog } from '@/lib/activity-logger';
import { notifyProjectPMAssigned } from '@/lib/notification-sender';

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

    const prompt = `당신은 회사 ERP(프로젝트·할일 관리) 어시스턴트입니다.
사용자 지시를 다음 중 하나로 분류하세요.

1) "프로젝트 생성" 요청 (예: OO 프로젝트 만들어, 단체복 프로젝트 추가해) → action: "create_project", bu_code/name/category/pm_name 채움
2) "프로젝트 상황/현황" 질의 (예: OO 프로젝트 상황 어때? / OO 현황 알려줘 / OO 어떻게 되어가?) → action: "project_status", project_name_or_keyword: 프로젝트 이름 또는 검색할 키워드(한두 단어)
3) 그 외 → action: "none", message에만 한국어 답변

응답은 반드시 아래 JSON 하나만 출력하세요.
{"action":"create_project"|"project_status"|"none","project_name_or_keyword":string|null,"bu_code":...,"name":...,"category":...,"pm_name":...,"message":string}

create_project일 때: 단체복/굿즈/유니폼→bu_code "MODOO", 댄스/안무/채널→"GRIGO"|"REACT". name은 프로젝트명, category 한두 단어, pm_name 지정 시 이름만.
project_status일 때: project_name_or_keyword에 검색할 프로젝트명 또는 키워드만 (예: "인천대", "단체복", "FLAVA").
사업부: ${JSON.stringify(buList)}
담당자: ${JSON.stringify(userList.slice(0, 40).map((u) => u.name))}

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
