/**
 * 변경 기록 공용 도우미 (spec R17·R18·R19·R32).
 *
 * 서버 라우트(`api/financial-entries/[id]/changes`, `api/users/[id]/changes`)와
 * 화면 컴포넌트(`ChangeLogList`)가 같이 쓴다. 'use client'를 붙이지 않은 순수 모듈이다.
 */

import { getBuName } from '@/lib/business-units';
import type { ChangeLogSource } from '@/types/database';

export type ChangeLogKind = 'financial-entry' | 'user';

/** API가 돌려주는 기록 한 행. DB 행에 변경자 이름을 붙인 형태다. */
export interface ChangeLogItem {
  id: number;
  action: 'insert' | 'update';
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  source: ChangeLogSource;
  changed_at: string;
}

export interface ChangeLogResponse {
  changes: ChangeLogItem[];
  enabled: boolean;
}

type RawChange = Omit<ChangeLogItem, 'changed_by_name'> & Record<string, unknown>;

// ============================================
// 정렬·이름 붙이기 (서버)
// ============================================

/** 최신순. 같은 시각이면 id가 큰 것(나중에 쓴 것)이 먼저다. 원본 배열은 바꾸지 않는다. */
export function sortNewestFirst<T extends { id: number; changed_at: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const ta = Date.parse(a.changed_at);
    const tb = Date.parse(b.changed_at);
    if (ta !== tb) return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    return Number(b.id) - Number(a.id);
  });
}

/** 기록에 나오는 변경자 id(중복·null 제외) */
export function collectChangerIds(rows: readonly { changed_by: string | null }[]): string[] {
  return Array.from(new Set(rows.map((r) => r.changed_by).filter((v): v is string => !!v)));
}

/** DB 기록 행을 응답 형태로 바꾼다. 최신순 정렬 + 변경자 이름. */
export function toChangeLogItems(
  rows: readonly RawChange[],
  names: ReadonlyMap<string, string>
): ChangeLogItem[] {
  return sortNewestFirst(rows).map((r) => ({
    id: r.id,
    action: r.action,
    field: r.field,
    old_value: r.old_value ?? null,
    new_value: r.new_value ?? null,
    changed_by: r.changed_by ?? null,
    changed_by_name: r.changed_by ? names.get(r.changed_by) ?? null : null,
    source: r.source,
    changed_at: r.changed_at,
  }));
}

/** 서비스 권한 클라이언트 중 이름 조회에 쓰는 부분만 (가짜 클라이언트로 시험하기 쉽게) */
type NameLookupClient = {
  from: (table: 'app_users') => {
    select: (columns: string) => {
      in: (
        column: string,
        values: string[]
      ) => PromiseLike<{ data: { id: string; name: string | null }[] | null; error: unknown }>;
    };
  };
};

/** 변경자 id → 이름 (app_users). 조회 실패 시 빈 맵(이름 없이 표시). */
export async function loadChangerNames(client: NameLookupClient, ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  const { data, error } = await client.from('app_users').select('id, name').in('id', ids);
  if (error || !data) return names;
  for (const row of data) {
    if (row.name) names.set(row.id, row.name);
  }
  return names;
}

// ============================================
// 표시용 라벨 (화면)
// ============================================

const FINANCE_FIELD_LABELS: Record<string, string> = {
  amount: '금액',
  actual_amount: '실지급액',
  status: '상태',
  bu_code: '사업부',
  '*': '신규 등록',
};

const USER_FIELD_LABELS: Record<string, string> = {
  role: '역할',
  bu_code: '사업부',
  status: '재직 상태',
};

const FINANCE_STATUS_LABELS: Record<string, string> = {
  planned: '예정',
  paid: '완료',
  canceled: '취소',
};

const USER_STATUS_LABELS: Record<string, string> = {
  active: '재직',
  pending: '승인 대기',
  rejected: '거절',
  retired: '퇴사',
  dormant: '휴면',
};

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  leader: '리더',
  manager: '매니저',
  member: '멤버',
  viewer: '뷰어',
  artist: '아티스트',
};

export function getChangeFieldLabel(kind: ChangeLogKind, field: string): string {
  const map = kind === 'user' ? USER_FIELD_LABELS : FINANCE_FIELD_LABELS;
  return map[field] ?? field;
}

export function getChangeSourceLabel(source: string): string {
  return source === 'erp' ? 'ERP' : '외부 시스템';
}

function formatAmount(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `${n.toLocaleString('ko-KR')}원`;
}

/** 칸 값 하나를 사람이 읽는 말로. null·빈 값은 '-' */
export function formatChangeValue(kind: ChangeLogKind, field: string, value: string | null): string {
  if (value === null || value === undefined || value === '' || value === 'null') return '-';
  switch (field) {
    case 'amount':
    case 'actual_amount':
      return formatAmount(value);
    case 'bu_code':
      return getBuName(value) || value;
    case 'status':
      return (kind === 'user' ? USER_STATUS_LABELS : FINANCE_STATUS_LABELS)[value] ?? value;
    case 'role':
      return ROLE_LABELS[value] ?? value;
    default:
      return value;
  }
}

/**
 * 신규 등록('*') 행의 new_value(`kind=.. status=.. bu_code=.. amount=.. actual_amount=..`)를 읽기 쉽게 바꾼다.
 * 형식이 다르면 원문을 그대로 돌려준다.
 */
export function formatInsertSummary(value: string | null): string {
  if (!value) return '-';
  const pairs = value.split(/\s+/).map((p) => p.split('='));
  if (pairs.some((p) => p.length !== 2)) return value;
  const parts: string[] = [];
  for (const [key, raw] of pairs) {
    if (key === 'kind') {
      parts.push(raw === 'revenue' ? '매출' : raw === 'expense' ? '지출' : raw);
      continue;
    }
    const label = FINANCE_FIELD_LABELS[key];
    if (!label) continue;
    parts.push(`${label} ${formatChangeValue('financial-entry', key, raw)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : value;
}

const KST_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** 기록 시각을 한국 시간(KST)으로. 예: `2026. 09. 24. 18:05` */
export function formatChangedAtKst(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return KST_FORMAT.format(d);
}

export function getChangeLogUrl(kind: ChangeLogKind, id: string | number): string {
  const encoded = encodeURIComponent(String(id));
  return kind === 'user' ? `/api/users/${encoded}/changes` : `/api/financial-entries/${encoded}/changes`;
}
