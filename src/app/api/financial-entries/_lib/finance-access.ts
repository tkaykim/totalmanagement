/**
 * 매출·지출 API 공통 도우미 (spec R4·R9·R11~R14·R32, 15절).
 *
 * - 권한 판정은 `src/lib/permissions.ts` 함수만 부른다. 여기서 역할 조건을 새로 짜지 않는다.
 * - 서비스 권한 키 클라이언트는 `requireActiveStaff()`를 통과한 뒤에만 넘겨받는다.
 * - PostgREST는 `range` 없이 1,000행에서 자르므로 목록·합계는 `fetchAllRows`로 끝까지 읽는다.
 */

import type { createPureClient } from '@/lib/supabase/server';
import {
  canViewFinanceEntry,
  canViewProject,
  type AppUser,
  type FinancialEntry as PermFinancialEntry,
  type Project as PermProject,
} from '@/lib/permissions';
import { isBuCode } from '@/lib/business-units';

export type ServiceDb = Awaited<ReturnType<typeof createPureClient>>;

/** PostgREST 한 번 조회 상한 */
export const PAGE_SIZE = 1000;

/** 권한 판정에 필요한 프로젝트 칸 */
export const PROJECT_PERM_COLUMNS = 'id, bu_code, pm_id, created_by, participants';

type RangeQuery = PromiseLike<{ data: unknown[] | null; error: unknown }>;

/**
 * 1,000행 절단 없이 끝까지 읽는다.
 * @param build 매 페이지마다 새 쿼리를 만들어 `.range(from, to)`를 붙여 돌려준다(정렬은 호출자가 고정).
 */
export async function fetchAllRows<T>(build: (from: number, to: number) => RangeQuery): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

/** projects 행 → 권한 판정용 모양. participants는 `[{ user_id }]` 또는 `[id]` 둘 다 받는다. */
export function toPermProject(row: Record<string, unknown>): PermProject {
  const raw = Array.isArray(row.participants) ? (row.participants as unknown[]) : [];
  const participants = raw
    .map((p) => (typeof p === 'string' ? p : (p as { user_id?: unknown } | null)?.user_id))
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  return {
    id: row.id as string | number,
    bu_code: row.bu_code as PermProject['bu_code'],
    pm_id: (row.pm_id as string | null) ?? null,
    participants,
    created_by: (row.created_by as string | null) ?? null,
  };
}

/** financial_entries 행 → 권한 판정용 모양 */
export function toPermEntry(row: Record<string, unknown>): PermFinancialEntry {
  return {
    id: row.id as string | number,
    project_id: (row.project_id as string | number | null) ?? null,
    bu_code: row.bu_code as PermFinancialEntry['bu_code'],
    created_by: (row.created_by as string | null) ?? null,
    kind: row.kind as PermFinancialEntry['kind'],
    status: row.status as PermFinancialEntry['status'],
    entry_scope: (row.entry_scope as PermFinancialEntry['entry_scope']) ?? 'external',
    counterparty_bu_code: (row.counterparty_bu_code as PermFinancialEntry['counterparty_bu_code']) ?? null,
    due_date: (row.due_date as string | null) ?? null,
    paid_at: (row.paid_at as string | null) ?? null,
  };
}

/** 관리자·모든 리더는 전사를 본다(R7). 나머지는 R9 필터가 필요하다. */
export function seesAllFinance(user: AppUser): boolean {
  return user.role === 'admin' || user.role === 'leader';
}

/** 프로젝트 한 건(권한 칸). 없으면 null. */
export async function loadPermProject(db: ServiceDb, projectId: unknown): Promise<PermProject | null> {
  if (projectId === null || projectId === undefined || projectId === '') return null;
  const { data, error } = await db
    .from('projects')
    .select(PROJECT_PERM_COLUMNS)
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data ? toPermProject(data as Record<string, unknown>) : null;
}

/**
 * 일반 직원이 볼 수 있는 프로젝트 id 집합 (R8). 전 프로젝트를 페이지로 읽어 `canViewProject`로 거른다.
 * `.in('project_id', [...수백 개])`는 URL 길이를 넘으므로 쓰지 않는다.
 */
export async function loadVisibleProjectIds(db: ServiceDb, user: AppUser): Promise<Set<string>> {
  const rows = await fetchAllRows<Record<string, unknown>>((from, to) =>
    db.from('projects').select(PROJECT_PERM_COLUMNS).order('id', { ascending: true }).range(from, to)
  );
  const ids = new Set<string>();
  for (const row of rows) {
    const project = toPermProject(row);
    if (canViewProject(user, project)) ids.add(String(project.id));
  }
  return ids;
}

/** 행 보기 판정(R9) — 프로젝트 보기 여부를 이미 아는 경우 */
export function isEntryVisible(
  user: AppUser,
  row: Record<string, unknown>,
  visibleProjectIds: Set<string> | null
): boolean {
  if (seesAllFinance(user)) return canViewFinanceEntry(user, toPermEntry(row), null);
  const entry = toPermEntry(row);
  if (entry.created_by && entry.created_by === user.id) return canViewFinanceEntry(user, entry, null);
  return entry.project_id !== null && !!visibleProjectIds?.has(String(entry.project_id));
}

/**
 * id로 행 하나를 권한과 함께 읽는다. 없거나 볼 수 없으면 null(라우트는 404, 존재 여부를 숨긴다 — 15절).
 */
export async function loadVisibleEntry(
  db: ServiceDb,
  user: AppUser,
  id: string
): Promise<{ row: Record<string, unknown>; entry: PermFinancialEntry; project: PermProject | null } | null> {
  const { data, error } = await db.from('financial_entries').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const entry = toPermEntry(row);
  const project = entry.project_id !== null ? await loadPermProject(db, entry.project_id) : null;
  if (!canViewFinanceEntry(user, entry, project)) return null;
  return { row, entry, project };
}

// ============================================
// 입력 정리 (R4 허용 컬럼, R14 날짜)
// ============================================

/** 등록·수정에서 받는 칸. 그 외(`id`, `created_by`, `created_at`, `updated_by`, `payment_ref` 등)는 무시한다. */
export const FINANCE_WRITABLE_COLUMNS = [
  'project_id',
  'bu_code',
  'entry_scope',
  'counterparty_bu_code',
  'kind',
  'category',
  'name',
  'amount',
  'occurred_at',
  'due_date',
  'paid_at',
  'status',
  'memo',
  'partner_id',
  'payment_method',
  'actual_amount',
] as const;

export type FinanceWritableColumn = (typeof FINANCE_WRITABLE_COLUMNS)[number];

export function pickFinanceColumns(body: unknown): Partial<Record<FinanceWritableColumn, unknown>> {
  const out: Partial<Record<FinanceWritableColumn, unknown>> = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return out;
  const src = body as Record<string, unknown>;
  for (const key of FINANCE_WRITABLE_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(src, key)) out[key] = src[key];
  }
  return out;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * `paid_at` 입력을 `YYYY-MM-DD`로 맞춘다.
 * 화면이 저장된 timestamptz 값을 그대로 돌려보내는 경우 한국 날짜로 바꾼다. 그 밖의 값은 그대로 둔다(검증은 permissions).
 */
export function normalizePaidAtInput(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) return value;
    return new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);
  }
  return value;
}

export function isFinancialKind(value: unknown): value is 'revenue' | 'expense' {
  return value === 'revenue' || value === 'expense';
}

export function isFinancialStatusValue(value: unknown): value is 'planned' | 'paid' | 'canceled' {
  return value === 'planned' || value === 'paid' || value === 'canceled';
}

export { isBuCode };
