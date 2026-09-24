import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';
import { isAuditV2Enabled } from '@/lib/feature-flags';
import {
  canViewFinanceChanges,
  canViewFinanceEntry,
  type FinancialEntry,
  type Project,
} from '@/lib/permissions';
import { PROJECT_PERM_COLUMNS, toPermProject } from '../../_lib/finance-access';
import {
  collectChangerIds,
  loadChangerNames,
  toChangeLogItems,
} from '@/features/erp/change-log';

/**
 * 매출·지출 변경 기록 조회 (spec R17·R18·R32)
 *
 * - 가드: 비로그인 401, 비재직 403
 * - 스위치 꺼짐: 200 `{ changes: [], enabled: false }`
 * - 행 없음·볼 수 없는 행: 404
 * - 볼 수 있지만 기록 권한 없음(관리자·행 사업부 리더·등록자 아님): 403
 * - 성공: 200 `{ changes, enabled: true }` (최신순, 변경자 이름 포함)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  if (!isAuditV2Enabled()) {
    return NextResponse.json({ changes: [], enabled: false });
  }

  const { id } = await params;
  const entryId = Number(id);
  if (!Number.isSafeInteger(entryId) || entryId <= 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const supabase = await createPureClient();

    const { data: entryRow, error: entryError } = await supabase
      .from('financial_entries')
      .select('id, project_id, bu_code, created_by, kind, status')
      .eq('id', entryId)
      .maybeSingle();
    if (entryError) {
      return NextResponse.json({ error: 'Failed to load entry' }, { status: 500 });
    }
    if (!entryRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const entry = entryRow as unknown as FinancialEntry;

    let project: Project | null = null;
    if (entry.project_id !== null && entry.project_id !== undefined) {
      const { data: projectRow, error: projectError } = await supabase
        .from('projects')
        .select(PROJECT_PERM_COLUMNS)
        .eq('id', entry.project_id)
        .maybeSingle();
      if (projectError) {
        return NextResponse.json({ error: 'Failed to load project' }, { status: 500 });
      }
      if (projectRow) {
        // participants는 `[{ user_id }]`·`[id]` 두 모양을 모두 받는다(공통 변환)
        project = toPermProject(projectRow as Record<string, unknown>);
      }
    }

    if (!canViewFinanceEntry(appUser, entry, project)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!canViewFinanceChanges(appUser, entry)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: rows, error: changesError } = await supabase
      .from('financial_entry_changes')
      .select('id, entry_id, action, field, old_value, new_value, changed_by, source, changed_at')
      .eq('entry_id', entryId)
      .order('changed_at', { ascending: false })
      .order('id', { ascending: false });
    if (changesError) {
      return NextResponse.json({ error: 'Failed to load changes' }, { status: 500 });
    }

    const list = (rows ?? []) as Parameters<typeof toChangeLogItems>[0];
    const names = await loadChangerNames(supabase as unknown as Parameters<typeof loadChangerNames>[0], collectChangerIds(list));
    return NextResponse.json({ changes: toChangeLogItems(list, names), enabled: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
