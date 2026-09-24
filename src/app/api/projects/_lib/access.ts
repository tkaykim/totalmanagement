/**
 * 프로젝트·할일 라우트 공통 도우미 (T5).
 *
 * - 서비스 권한 키 클라이언트(`createPureClient`)로 읽은 행을 권한 판정용 모양으로 바꾼다.
 * - PostgREST 1,000행 절단을 피하려고 `range`로 끝까지 읽는다(docs/engineering-notes.md).
 * - 권한 판정 자체는 `src/lib/permissions.ts`만 쓴다. 여기서 역할 조건을 새로 짜지 않는다.
 */

import type { Project as PermProject } from '@/lib/permissions';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const PAGE_SIZE = 1000;

/** 권한 판정에 필요한 프로젝트 칸 */
export const PERM_PROJECT_COLUMNS = 'id, bu_code, pm_id, participants, created_by';

/**
 * 1,000행 절단 없이 모든 행을 읽는다.
 * `build()`는 매 페이지마다 새 쿼리를 만들어야 한다(정렬 포함 권장).
 */
export async function fetchAllRows<T = any>(
  build: () => any,
  pageSize: number = PAGE_SIZE
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

/** `participants` JSONB(객체 배열)에서 내부 직원 id만 뽑는다 */
export function participantUserIds(participants: unknown): string[] {
  if (!Array.isArray(participants)) return [];
  return participants
    .map((p: any) => (p && typeof p === 'object' ? p.user_id : typeof p === 'string' ? p : null))
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);
}

export function toPermProject(row: any): PermProject {
  return {
    id: row.id,
    bu_code: row.bu_code,
    pm_id: row.pm_id ?? null,
    participants: participantUserIds(row.participants),
    created_by: row.created_by ?? null,
  };
}

/** 프로젝트 한 건을 권한 판정 모양으로 읽는다. 없으면 null. */
export async function loadPermProject(
  supabase: any,
  id: string | number,
  extraColumns = ''
): Promise<{ perm: PermProject; row: any } | null> {
  const columns = extraColumns ? `${PERM_PROJECT_COLUMNS}, ${extraColumns}` : PERM_PROJECT_COLUMNS;
  const { data, error } = await supabase.from('projects').select(columns).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { perm: toPermProject(data), row: data };
}

/** 허용 컬럼만 골라 낸다(undefined는 건너뛴다). */
export function pickAllowed(body: unknown, allowed: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return out;
  for (const key of allowed) {
    const value = (body as Record<string, unknown>)[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export const PROJECT_DELETE_BLOCKED_MESSAGE = '재무 기록이 있는 프로젝트는 삭제할 수 없습니다. 보류로 바꾸세요';
