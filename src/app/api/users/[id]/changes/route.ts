import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';
import { isAuditV2Enabled } from '@/lib/feature-flags';
import { canViewUserChanges } from '@/lib/permissions';
import {
  collectChangerIds,
  loadChangerNames,
  toChangeLogItems,
} from '@/features/erp/change-log';

/**
 * 직원 역할·사업부·재직 상태 변경 기록 조회 (spec R19·R32)
 *
 * - 가드: 비로그인 401, 비재직 403
 * - 스위치 꺼짐: 200 `{ changes: [], enabled: false }`
 * - 관리자 아님: 403
 * - 없는 직원: 404
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

  if (!canViewUserChanges(appUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const supabase = await createPureClient();

    const { data: target, error: targetError } = await supabase
      .from('app_users')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (targetError) {
      return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
    }
    if (!target) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: rows, error: changesError } = await supabase
      .from('app_user_changes')
      .select('id, user_id, action, field, old_value, new_value, changed_by, source, changed_at')
      .eq('user_id', id)
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
