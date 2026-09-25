/**
 * 매출·지출 화면 도우미 (spec R12·R14·R15·R26, 15절)
 *
 * - 버튼 표시 판정은 `src/lib/permissions.ts`의 함수를 부른다. 여기서 역할 규칙을 새로 쓰지 않는다.
 *   화면 판정은 버튼 표시용이고, 실제 경계는 서버 라우트다.
 * - 기한(`due_date`)·입금일(`paid_at`) 입력 규칙과 보낼 값 계산
 * - 손익 합계: 사업부 탭 = 관리손익(내부배부 포함), 전체 = 회사 손익(내부배부 제외)
 * - 서버 `{ error }` 응답을 사용자에게 보여 줄 한국어 문구로 바꾼다.
 *
 * React·브라우저 API에 의존하지 않는다(단위 테스트 대상).
 */

import {
  canDeleteFinance,
  canEditFinance,
  canMoveFinanceBu,
  canTransitionFinance,
  canViewFinanceChanges,
  isValidDateString,
  type AppUser as PermAppUser,
  type FinancialEntry as PermFinancialEntry,
} from '@/lib/permissions';
import { BU_CODES, isBuCode } from '@/lib/business-units';
import { utcToKSTDate } from '@/lib/timezone';
import type { FinancialEntry as DbFinancialEntry } from '@/types/database';
import type { BU, FinancialEntry, FinancialEntryStatus } from './types';
import { dbFinancialToFrontend } from './utils';

// ============================================
// 화면용 행
// ============================================

/** 화면 행 + 권한·날짜 판정에 필요한 칸(등록자, 입금일) */
export type FinanceEntryView = FinancialEntry & {
  created_by?: string | null;
  /** DB timestamptz 그대로 */
  paid_at?: string | null;
};

/** DB 행 → 화면 행. `dbFinancialToFrontend`가 빼먹는 기한·입금일·등록자를 함께 싣는다. */
export function toFinanceEntryView(row: DbFinancialEntry): FinanceEntryView {
  return {
    ...dbFinancialToFrontend(row),
    due_date: row.due_date ?? null,
    paid_at: row.paid_at ?? null,
    created_by: row.created_by ?? null,
  };
}

/** 로그인 사용자 프로필(app_users 행) → 권한 판정용 사용자. 없으면 null(모든 버튼 숨김). */
export function toPermUser(
  profile: { id?: string | null; role?: string | null; bu_code?: string | null; status?: string | null; name?: string | null } | null | undefined
): PermAppUser | null {
  if (!profile?.id || !profile.role) return null;
  return {
    id: profile.id,
    role: profile.role as PermAppUser['role'],
    bu_code: isBuCode(profile.bu_code) ? profile.bu_code : null,
    status: (profile.status ?? null) as PermAppUser['status'],
    name: profile.name ?? undefined,
  };
}

function toPermEntry(entry: FinanceEntryView): PermFinancialEntry {
  return {
    id: entry.id,
    project_id: entry.projectId || null,
    bu_code: entry.bu,
    created_by: entry.created_by ?? null,
    kind: entry.type,
    status: entry.status,
    entry_scope: entry.entry_scope,
    counterparty_bu_code: entry.counterparty_bu ?? null,
    due_date: entry.due_date ?? null,
    paid_at: entry.paid_at ?? null,
  };
}

// ============================================
// 버튼 표시 (R11·R12·R13·R18)
// ============================================

export type FinanceEntryActions = {
  /** 내용 수정(금액·항목·지급방식·거래처·메모·기한·날짜)과 저장 */
  canEdit: boolean;
  /** planned → paid (완료 처리) */
  canComplete: boolean;
  /** planned → canceled (수정 권한자), paid → canceled (등록자·행 사업부 리더·관리자) */
  canCancel: boolean;
  /** paid → planned (되돌리기, 관리자만) */
  canRevert: boolean;
  /** canceled → planned (되살리기, 관리자만) */
  canRestoreToPlanned: boolean;
  /** canceled → paid (되살리기, 관리자만) */
  canRestoreToPaid: boolean;
  /** planned 행만 삭제 */
  canDelete: boolean;
  /** 행 사업부 이동(관리자·원래 사업부 리더) */
  canMoveBu: boolean;
  /** 변경 기록 보기 */
  canViewChanges: boolean;
};

const NO_ACTIONS: FinanceEntryActions = {
  canEdit: false,
  canComplete: false,
  canCancel: false,
  canRevert: false,
  canRestoreToPlanned: false,
  canRestoreToPaid: false,
  canDelete: false,
  canMoveBu: false,
  canViewChanges: false,
};

/** 역할·행에 따라 보여 줄 버튼. 사용자 정보가 없으면 전부 숨긴다. */
export function getFinanceEntryActions(
  user: PermAppUser | null | undefined,
  entry: FinanceEntryView
): FinanceEntryActions {
  if (!user) return NO_ACTIONS;
  const perm = toPermEntry(entry);
  const from = entry.status;
  const can = (to: FinancialEntryStatus) => from !== to && canTransitionFinance(user, perm, from, to);
  const otherBu = BU_CODES.find((code) => code !== entry.bu);
  return {
    canEdit: canEditFinance(user, perm),
    canComplete: from === 'planned' && can('paid'),
    canCancel: (from === 'planned' || from === 'paid') && can('canceled'),
    canRevert: from === 'paid' && can('planned'),
    canRestoreToPlanned: from === 'canceled' && can('planned'),
    canRestoreToPaid: from === 'canceled' && can('paid'),
    canDelete: canDeleteFinance(user, perm),
    canMoveBu: !!otherBu && canMoveFinanceBu(user, perm, otherBu),
    canViewChanges: canViewFinanceChanges(user, perm),
  };
}

export type FinanceTransitionKey = 'complete' | 'cancel' | 'revert' | 'restorePlanned' | 'restorePaid';

export const FINANCE_TRANSITIONS: ReadonlyArray<{
  key: FinanceTransitionKey;
  label: string;
  to: FinancialEntryStatus;
  flag: keyof FinanceEntryActions;
}> = [
  { key: 'complete', label: '완료 처리', to: 'paid', flag: 'canComplete' },
  { key: 'cancel', label: '취소', to: 'canceled', flag: 'canCancel' },
  { key: 'revert', label: '되돌리기(예정으로)', to: 'planned', flag: 'canRevert' },
  { key: 'restorePlanned', label: '되살리기(예정)', to: 'planned', flag: 'canRestoreToPlanned' },
  { key: 'restorePaid', label: '되살리기(완료)', to: 'paid', flag: 'canRestoreToPaid' },
];

/** 이 사용자·행에 보여 줄 상태 변경 버튼 목록 */
export function getAvailableTransitions(actions: FinanceEntryActions) {
  return FINANCE_TRANSITIONS.filter((t) => actions[t.flag]);
}

export const FINANCE_STATUS_LABELS: Record<FinancialEntryStatus, string> = {
  planned: '예정',
  paid: '완료',
  canceled: '취소',
};

// ============================================
// 기한·입금일 (R14)
// ============================================

/** 저장된 `paid_at`(timestamptz) → 한국 날짜 `YYYY-MM-DD`. 비었거나 읽을 수 없으면 ''. */
export function paidAtToKstDate(paidAt: string | null | undefined): string {
  if (!paidAt) return '';
  if (isValidDateString(paidAt)) return paidAt;
  const ms = Date.parse(paidAt);
  if (Number.isNaN(ms)) return '';
  return utcToKSTDate(new Date(ms));
}

/** 입금·지급일 입력 기본값: 저장된 값이 있으면 그 한국 날짜, 없으면 오늘(한국 날짜) */
export function defaultPaidAtDate(existingPaidAt: string | null | undefined, todayKst: string): string {
  return paidAtToKstDate(existingPaidAt) || todayKst;
}

export type FinanceDateFormInput = {
  /** 수정 전 상태. 새 행이면 null */
  originalStatus: FinancialEntryStatus | null;
  /** 저장할 상태 */
  status: FinancialEntryStatus;
  /** 기한 입력(YYYY-MM-DD 또는 '') */
  dueDate: string;
  /** 입금·지급일 입력(YYYY-MM-DD 또는 '') */
  paidAtDate: string;
};

/** 화면 검증. 문제가 없으면 null, 있으면 한국어 문구. 서버 규칙(R14)과 같은 조건이다. */
export function validateFinanceDateForm(input: FinanceDateFormInput): string | null {
  if (input.dueDate && !isValidDateString(input.dueDate)) return '기한은 YYYY-MM-DD 형식이어야 합니다.';
  if (input.paidAtDate && !isValidDateString(input.paidAtDate)) return '입금·지급일은 YYYY-MM-DD 형식이어야 합니다.';
  if (input.status === 'planned' && !input.dueDate) {
    return '예정 상태는 기한을 입력해야 합니다.';
  }
  if (input.status === 'paid' && input.originalStatus !== 'paid' && !input.paidAtDate) {
    return '완료로 저장하려면 입금·지급일을 입력해야 합니다.';
  }
  return null;
}

/** 기한 입력칸을 필수로 표시할지 */
export function isDueDateRequired(status: FinancialEntryStatus): boolean {
  return status === 'planned';
}

/** 입금·지급일 입력칸을 보일지 (완료로 저장할 때만) */
export function isPaidAtVisible(status: FinancialEntryStatus): boolean {
  return status === 'paid';
}

/**
 * 서버에 보낼 날짜 칸.
 * - 새 행: `due_date`는 값이 있으면 보낸다. `paid`면 `paid_at`을 보낸다.
 * - 수정: 바뀐 칸만 보낸다. 기한 없는 옛 `paid`·`canceled` 행을 그대로 저장해도 기한을 요구하지 않는다.
 *   `paid_at`은 `paid`로 저장할 때만, 새로 완료되거나 날짜를 바꿨을 때 보낸다.
 * 날짜는 `YYYY-MM-DD`로 보내고, 서버가 한국 자정 timestamp로 저장한다.
 */
export function buildFinanceDateFields(
  input: FinanceDateFormInput & {
    original?: { due_date?: string | null; paid_at?: string | null } | null;
  }
): { due_date?: string | null; paid_at?: string } {
  const out: { due_date?: string | null; paid_at?: string } = {};
  const isCreate = input.originalStatus === null || !input.original;

  if (isCreate) {
    if (input.dueDate) out.due_date = input.dueDate;
    if (input.status === 'paid' && input.paidAtDate) out.paid_at = input.paidAtDate;
    return out;
  }

  const originalDue = input.original?.due_date ?? '';
  if (input.dueDate !== originalDue) out.due_date = input.dueDate || null;

  if (input.status === 'paid' && input.paidAtDate) {
    const originalPaid = paidAtToKstDate(input.original?.paid_at);
    if (input.originalStatus !== 'paid' || input.paidAtDate !== originalPaid) {
      out.paid_at = input.paidAtDate;
    }
  }
  return out;
}

// ============================================
// 손익 (R26)
// ============================================

export type PnlSummary = {
  revenue: number;
  expense: number;
  profit: number;
  /** 합계에 들어간(사업부 탭) 또는 빠진(전체 탭) 내부배부 금액 */
  internalRevenue: number;
  internalExpense: number;
  /** true = 내부배부를 합계에 포함(사업부 관리손익) */
  includesInternal: boolean;
};

type PnlEntry = Pick<FinancialEntry, 'type' | 'amount' | 'status' | 'entry_scope' | 'bu'>;

export function isInternalAllocation(entry: Pick<FinancialEntry, 'entry_scope'>): boolean {
  return entry.entry_scope === 'internal_allocation';
}

/**
 * 탭별 행 목록.
 * - '전체': 모든 행(내부배부 행도 목록에는 보이고 "내부" 표시가 붙는다)
 * - 사업부: 행 사업부(`bu_code`)가 그 사업부인 행. 매출·지출의 책임은 행 사업부다(R10·14절).
 */
export function filterEntriesForTab<T extends Pick<FinancialEntry, 'bu'>>(entries: T[], tab: BU | 'ALL'): T[] {
  if (tab === 'ALL') return entries;
  return entries.filter((e) => e.bu === tab);
}

/**
 * 손익 합계. `canceled`는 빼고 `amount`로 더한다.
 * - '전체'(회사 손익): 내부배부 제외
 * - 사업부(관리손익): 그 사업부 행 전부, 내부배부 포함
 * `entries`는 매출·지출이 섞여 있어도 된다.
 */
export function summarizePnl(entries: PnlEntry[], tab: BU | 'ALL'): PnlSummary {
  const includesInternal = tab !== 'ALL';
  const rows = filterEntriesForTab(entries, tab).filter((e) => e.status !== 'canceled');
  let revenue = 0;
  let expense = 0;
  let internalRevenue = 0;
  let internalExpense = 0;
  for (const e of rows) {
    const amount = Number(e.amount) || 0;
    const internal = isInternalAllocation(e);
    if (e.type === 'revenue') {
      if (internal) internalRevenue += amount;
      if (!internal || includesInternal) revenue += amount;
    } else {
      if (internal) internalExpense += amount;
      if (!internal || includesInternal) expense += amount;
    }
  }
  return { revenue, expense, profit: revenue - expense, internalRevenue, internalExpense, includesInternal };
}

/** 프로젝트 상세: 외부 손익과 내부배부 합계를 나눠 계산한다(취소 제외). */
export function summarizeProjectPnl(entries: Array<Pick<FinancialEntry, 'type' | 'amount' | 'status' | 'entry_scope'>>) {
  let externalRevenue = 0;
  let externalExpense = 0;
  let internalRevenue = 0;
  let internalExpense = 0;
  for (const e of entries) {
    if (e.status === 'canceled') continue;
    const amount = Number(e.amount) || 0;
    const internal = isInternalAllocation(e);
    if (e.type === 'revenue') {
      if (internal) internalRevenue += amount;
      else externalRevenue += amount;
    } else if (internal) internalExpense += amount;
    else externalExpense += amount;
  }
  return {
    externalRevenue,
    externalExpense,
    externalProfit: externalRevenue - externalExpense,
    internalRevenue,
    internalExpense,
    internalNet: internalRevenue - internalExpense,
  };
}

// ============================================
// 서버 오류 문구
// ============================================

/** 서버 응답 상태와 본문으로 사용자에게 보일 한국어 문구를 만든다. */
export function apiErrorMessage(status: number, body: unknown, fallback = '요청을 처리하지 못했습니다.'): string {
  const raw =
    body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
      ? ((body as { error: string }).error || '').trim()
      : '';
  const hasKorean = /[가-힣]/.test(raw);

  if (status === 401) return hasKorean ? raw : '로그인이 필요합니다. 다시 로그인해 주세요.';
  if (status === 403) return hasKorean ? raw : '권한이 없습니다. 이 작업은 담당자·사업부 리더·관리자만 할 수 있습니다.';
  if (status === 404) return hasKorean ? raw : '대상을 찾을 수 없습니다. 삭제되었거나 볼 권한이 없습니다.';
  if (status >= 500) return hasKorean ? raw : '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  if (raw && hasKorean) return raw;
  if (status === 400) return raw ? `입력값을 확인해 주세요. (${raw})` : '입력값을 확인해 주세요.';
  if (status === 409) return raw ? `처리할 수 없는 상태입니다. (${raw})` : '처리할 수 없는 상태입니다.';
  return raw || fallback;
}

/** 서버 오류. `message`는 사용자에게 바로 보여 줄 한국어 문구다. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** fetch 응답(실패)에서 `ApiError`를 만든다. 본문이 JSON이 아니어도 동작한다. */
export async function toApiError(res: Response, fallback?: string): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return new ApiError(res.status, apiErrorMessage(res.status, body, fallback));
}

/** catch한 오류 → 화면 문구 */
export function errorToMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message) return error.message;
  if (error instanceof Error && /[가-힣]/.test(error.message)) return error.message;
  return fallback;
}
