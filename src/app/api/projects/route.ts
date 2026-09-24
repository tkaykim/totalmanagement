import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';
import { canCreateProject, canViewProject } from '@/lib/permissions';
import { isBuCode } from '@/lib/business-units';
import { createActivityLog } from '@/lib/activity-logger';
import { notifyProjectPMAssigned, notifyProjectParticipantAdded } from '@/lib/notification-sender';
import { fetchAllRows, toPermProject } from '@/app/api/projects/_lib/access';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Totals = {
  revenue: number;
  expense: number;
  internal_revenue: number;
  internal_expense: number;
};

/**
 * GET /api/projects
 * - 보기 범위(R7·R8): 관리자·모든 리더는 전체, 일반 직원은 `canViewProject`.
 * - `includeShare=true`면 프로젝트별 매출·지출 합계를 붙인다(R9·R26).
 *   - 보이는 프로젝트의 행만 합한다(보이는 프로젝트의 행은 모두 보인다, R9).
 *   - `bu` 탭(사업부 관리손익)은 내부배부 행을 포함하고, '전체'는 내부배부를 뺀다.
 *   - 취소(`canceled`) 행은 뺀다.
 *   - `internal_revenue`·`internal_expense`에 내부배부 합계를 따로 준다.
 * - 1,000행 절단 없이 끝까지 읽는다.
 */
export async function GET(request: NextRequest) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const supabase: any = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const buParam = searchParams.get('bu');
    const bu = isBuCode(buParam) ? buParam : null;
    const includeShare = searchParams.get('includeShare') === 'true';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const creatorJoin = 'creator:app_users!projects_created_by_fkey(name)';
    const selectQuery = includeShare
      ? `*, ${creatorJoin}, share_partner:partners!share_partner_id(id, display_name)`
      : `*, ${creatorJoin}`;

    const allProjects = await fetchAllRows<any>(() => {
      let q = supabase
        .from('projects')
        .select(selectQuery)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      if (bu) q = q.eq('bu_code', bu);
      return q;
    });

    const projects = allProjects.filter((p) => {
      if (!p.participants) p.participants = [];
      return canViewProject(appUser, toPermProject(p));
    });

    if (!includeShare) {
      return NextResponse.json(projects);
    }

    const totals = new Map<string, Totals>();
    if (projects.length > 0) {
      const visibleIds = new Set(projects.map((p) => String(p.id)));
      const entries = await fetchAllRows<any>(() => {
        let q = supabase
          .from('financial_entries')
          .select('id, project_id, kind, amount, entry_scope, status')
          .not('project_id', 'is', null)
          .neq('status', 'canceled')
          .order('id', { ascending: true });
        if (startDate) q = q.gte('occurred_at', startDate);
        if (endDate) q = q.lte('occurred_at', endDate);
        return q;
      });

      for (const f of entries) {
        const key = String(f.project_id);
        if (!visibleIds.has(key)) continue;
        const isInternal = f.entry_scope === 'internal_allocation';
        if (isInternal && !bu) continue; // '전체'는 회사 손익(내부배부 제외, R26)
        const t = totals.get(key) ?? { revenue: 0, expense: 0, internal_revenue: 0, internal_expense: 0 };
        const amount = Number(f.amount) || 0;
        if (f.kind === 'revenue') {
          t.revenue += amount;
          if (isInternal) t.internal_revenue += amount;
        } else if (f.kind === 'expense') {
          t.expense += amount;
          if (isInternal) t.internal_expense += amount;
        }
        totals.set(key, t);
      }
    }

    const data = projects.map((p) => {
      const t = totals.get(String(p.id));
      return {
        ...p,
        total_revenue: t?.revenue ?? 0,
        total_expense: t?.expense ?? 0,
        internal_revenue: t?.internal_revenue ?? 0,
        internal_expense: t?.internal_expense ?? 0,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/projects
 * - 리더는 자기 사업부 프로젝트만 만든다(R10).
 * - 허용 컬럼만 받는다. `created_by`는 로그인 사용자.
 */
export async function POST(request: NextRequest) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const supabase: any = await createPureClient();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    if (!isBuCode(body.bu_code)) {
      return NextResponse.json({ error: '사업부(bu_code) 값이 올바르지 않습니다.' }, { status: 400 });
    }
    for (const key of ['brand_bu_code', 'delivery_bu_code', 'artist_management_bu_code'] as const) {
      if (body[key] != null && body[key] !== '' && !isBuCode(body[key])) {
        return NextResponse.json({ error: `${key} 값이 올바르지 않습니다.` }, { status: 400 });
      }
    }

    if (!canCreateProject(appUser, body.bu_code)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const insertData: Record<string, unknown> = {
      bu_code: body.bu_code,
      brand_bu_code: body.brand_bu_code || body.bu_code,
      delivery_bu_code: body.delivery_bu_code || body.bu_code,
      artist_management_bu_code: body.artist_management_bu_code || null,
      name: body.name,
      category: body.category || '',
      status: body.status || '준비중',
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      created_by: appUser.id,
      participants: Array.isArray(body.participants) ? body.participants : [],
    };
    if (body.description !== undefined) insertData.description = body.description || null;
    if (body.channel_id !== undefined && body.channel_id !== null) insertData.channel_id = body.channel_id;
    if (body.partner_id !== undefined && body.partner_id !== null) insertData.partner_id = body.partner_id;
    if (body.pm_id !== undefined && body.pm_id !== null) insertData.pm_id = body.pm_id;

    const { data: project, error } = await supabase.from('projects').insert(insertData).select().single();

    if (error) {
      console.error('Project creation error:', error);
      throw error;
    }

    if (!project.participants) project.participants = [];

    await createActivityLog({
      userId: appUser.id,
      actionType: 'project_created',
      entityType: 'project',
      entityId: String(project.id),
      entityTitle: project.name,
      metadata: { bu_code: project.bu_code, status: project.status },
    });

    if (body.pm_id && body.pm_id !== appUser.id) {
      await notifyProjectPMAssigned(body.pm_id, project.name, String(project.id), appUser.name);
    }

    if (Array.isArray(body.participants)) {
      const participantIds = body.participants
        .map((p: any) => p?.user_id)
        .filter((id: string) => id && id !== appUser.id && id !== body.pm_id);
      for (const participantId of participantIds) {
        await notifyProjectParticipantAdded(participantId, project.name, String(project.id), appUser.name);
      }
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
