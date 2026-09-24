/**
 * 역할 기반 권한 판정 — 이 파일이 역할·사업부·재직 판정의 한 곳 정의다.
 * 라우트·화면에 역할 조건을 따로 쓰지 말고 여기에 함수를 추가한다.
 *
 * 규칙 원문: `docs/business-rules.md`(프로젝트·할일·매출지출 권한, 상태 전이, 기한·입금일, 가입 승인),
 * `docs/security.md`(권한 표, 재직 판정). 주석의 R 번호는 전사 통합 1차 규칙 번호다.
 *
 * 사람 구분
 * - 재직 직원: `status='active'`이고 `bu_code`가 있는 사람(역할은 admin·leader·manager·member)
 * - 관리자(admin): 전사 보기·쓰기
 * - 사업부 리더(leader): 전사 보기(R7), 쓰기는 자기 사업부만(R10)
 * - 일반 직원(manager·member): 자기 프로젝트 범위(R8·R9)
 * - 차단 대상: 비재직(pending·rejected·retired·dormant 등)·사업부 없음·비로그인·외부인 역할(viewer·artist)
 *
 * 재직 판정 두 가지
 * - 새 판정 함수(canView*, canCreateFinance, canEditFinance 등 재무·기록·사람 판정)는
 *   `status==='active'`를 반드시 요구한다(status가 없으면 거부). 서버는 `requireActiveStaff()`가 준
 *   `appUser`(status 포함)를 넘긴다.
 * - 기존 이름의 프로젝트·할일·메뉴 판정은 status를 아직 넘기지 않는 기존 호출부가 있어,
 *   status가 **명시적으로** active가 아닐 때만 거부한다(`isExplicitlyBlocked`).
 *   서버 경로의 재직 확인은 공통 가드(`src/lib/auth-guard.ts`)가 맡는다.
 */

import { isBuCode, type BuCode } from './business-units';
import type { AppUserStatus, FinancialStatus, FinancialEntryScope } from '@/types/database';

export type { BuCode } from './business-units';
export type { AppUserStatus } from '@/types/database';

export type Role = 'admin' | 'leader' | 'manager' | 'member' | 'viewer' | 'artist';

/** 회사 직원 역할. viewer·artist는 enum에만 남은 외부인 역할이다(누구에게도 새로 주지 않는다). */
export const STAFF_ROLES: readonly Role[] = ['admin', 'leader', 'manager', 'member'];

export interface AppUser {
  id: string;
  role: Role;
  bu_code: BuCode | null;
  /** app_users.status(text). 새 판정 함수는 'active'만 통과시킨다. */
  status?: AppUserStatus | null;
  name?: string;
  position?: string;
}

export interface Project {
  id: string | number;
  bu_code: BuCode;
  pm_id: string | null;
  participants: string[];
  created_by?: string | null;
}

export interface Task {
  id: string | number;
  project_id: string | number;
  bu_code: BuCode;
  assignee_id: string | null;
  created_by?: string | null;
}

export interface FinancialEntry {
  id: string | number;
  /** 실 DB는 nullable(프로젝트 미연결 행) */
  project_id: string | number | null;
  /** 행의 사업부. 매출·지출 쓰기 권한은 프로젝트가 아니라 이 값으로 판정한다(R10). */
  bu_code: BuCode;
  created_by: string | null;
  kind: 'revenue' | 'expense';
  status?: FinancialStatus;
  entry_scope?: FinancialEntryScope;
  counterparty_bu_code?: BuCode | null;
  due_date?: string | null;
  paid_at?: string | null;
}

// ============================================
// 재직·역할 판정 (R1)
// ============================================

function isStaffRole(role: Role | string | null | undefined): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

/**
 * 재직 직원: status='active' + 사업부(7개 중 하나) + 직원 역할.
 * status가 비어 있으면 재직으로 보지 않는다.
 */
export function isActiveStaff(user: AppUser | null | undefined): user is AppUser {
  if (!user) return false;
  if (user.status !== 'active') return false;
  if (!isBuCode(user.bu_code)) return false;
  return isStaffRole(user.role);
}

/**
 * 기존 이름 함수용: status가 명시적으로 active가 아니면 차단.
 * status를 넘기지 않는 기존 호출부(화면·옛 라우트)는 그대로 동작한다.
 */
function isExplicitlyBlocked(user: AppUser): boolean {
  if (user.status !== undefined && user.status !== 'active') return true;
  return false;
}

function isActiveAdmin(user: AppUser | null | undefined): boolean {
  return isActiveStaff(user) && user.role === 'admin';
}

/** 본사 관리자: HEAD 소속 재직 관리자. 가입 승인·거절 권한(R21). */
export function isHeadAdmin(user: AppUser | null | undefined): boolean {
  return isActiveAdmin(user) && user!.bu_code === 'HEAD';
}

function isPm(user: AppUser, project: Project): boolean {
  return !!project.pm_id && project.pm_id === user.id;
}

function isParticipant(user: AppUser, project: Project): boolean {
  return !!project.participants?.includes(user.id);
}

// ============================================
// 프로젝트 권한
// ============================================

/**
 * 프로젝트 접근(열람) 권한 — 일반 직원 기준 규칙(R8). 기존 호출부 호환용.
 * - 생성자, PM, 참여자
 * - manager: PM이 지정된 같은 사업부 프로젝트
 * - leader: 본인 BU + PM + 참여자 (R7의 전사 보기는 `canViewProject`를 쓴다)
 */
export function canAccessProject(user: AppUser, project: Project): boolean {
  if (isExplicitlyBlocked(user)) return false;
  if (user.role === 'admin') return true;

  if (project.created_by === user.id) return true;

  if (user.role === 'leader') {
    if (project.bu_code === user.bu_code) return true;
    if (isPm(user, project)) return true;
    if (isParticipant(user, project)) return true;
  }

  const hasPm = !!project.pm_id;

  if (user.role === 'manager') {
    if (isPm(user, project)) return true;
    if (isParticipant(user, project)) return true;
    if (hasPm && project.bu_code === user.bu_code) return true;
  }

  if (user.role === 'member') {
    if (isPm(user, project)) return true;
    if (isParticipant(user, project)) return true;
  }

  return false;
}

/**
 * 프로젝트 보기 (R7·R8)
 * - 관리자·모든 리더: 7개 사업부 전체
 * - 일반 직원: `canAccessProject` 규칙
 */
export function canViewProject(user: AppUser | null | undefined, project: Project): boolean {
  if (!isActiveStaff(user)) return false;
  if (user.role === 'admin' || user.role === 'leader') return true;
  return canAccessProject(user, project);
}

/**
 * 프로젝트 기본 정보(제목, 설명)만 볼 수 있는 권한
 * - 본인에게 할일이 할당된 경우 해당 프로젝트 기본 정보 열람 가능 (R8)
 */
export function canViewProjectBasicInfo(
  user: AppUser,
  project: Project,
  hasAssignedTasks: boolean
): boolean {
  if (isExplicitlyBlocked(user)) return false;
  if (canAccessProject(user, project)) return true;
  if (hasAssignedTasks) return true;
  return false;
}

/**
 * 프로젝트 생성 권한
 * - 직원 역할만. 리더는 자기 사업부 프로젝트만 만든다(R10) — `buCode`를 넘기면 확인한다.
 */
export function canCreateProject(user: AppUser, buCode?: BuCode | null): boolean {
  if (isExplicitlyBlocked(user)) return false;
  if (!isStaffRole(user.role)) return false;
  if (user.role === 'leader' && buCode != null && buCode !== user.bu_code) return false;
  return true;
}

/**
 * 프로젝트 수정 권한 (R10)
 * - admin: 전체
 * - leader: 자기 사업부 프로젝트만(생성자·PM이어도 다른 사업부는 보기만)
 * - manager·member: 생성자 또는 PM(기존 규칙)
 */
export function canEditProject(user: AppUser, project: Project): boolean {
  if (isExplicitlyBlocked(user)) return false;
  if (user.role === 'admin') return true;

  if (user.role === 'leader') {
    return !!user.bu_code && project.bu_code === user.bu_code;
  }

  if (user.role === 'manager' || user.role === 'member') {
    if (project.created_by === user.id) return true;
    if (isPm(user, project)) return true;
  }

  return false;
}

/**
 * 프로젝트 삭제 권한 (재무 행이 붙은 프로젝트의 삭제 차단 R15는 라우트·DB가 맡는다)
 */
export function canDeleteProject(user: AppUser, project: Project): boolean {
  return canEditProject(user, project);
}

// ============================================
// 할일 권한
// ============================================

/**
 * 할일 접근(열람) 권한 체크 — 기존 호출부 호환용(일반 직원 규칙).
 */
export function canAccessTask(user: AppUser, task: Task, project: Project): boolean {
  if (isExplicitlyBlocked(user)) return false;
  if (user.role === 'admin') return true;

  if (user.role === 'leader') {
    if (project.bu_code === user.bu_code) return true;
    if (task.assignee_id === user.id) return true;
  }

  if (user.role === 'manager' || user.role === 'member') {
    if (isPm(user, project)) return true;
    if (isParticipant(user, project)) return true;
    if (task.assignee_id === user.id) return true;
  }

  if (task.assignee_id === user.id) return true;

  return false;
}

/**
 * 할일 보기 (R7·R8): 관리자·리더는 전체, 일반 직원은 볼 수 있는 프로젝트의 할일 + 본인 배정 할일
 */
export function canViewTask(user: AppUser | null | undefined, task: Task, project: Project): boolean {
  if (!isActiveStaff(user)) return false;
  if (canViewProject(user, project)) return true;
  return !!task.assignee_id && task.assignee_id === user.id;
}

/**
 * 할일 생성 권한 (R10: 리더는 소속 프로젝트 사업부가 자기 사업부일 때만)
 */
export function canCreateTask(user: AppUser, project: Project): boolean {
  if (isExplicitlyBlocked(user)) return false;
  if (user.role === 'admin') return true;

  if (user.role === 'leader') return !!user.bu_code && project.bu_code === user.bu_code;

  if (user.role === 'manager' || user.role === 'member') {
    if (isPm(user, project)) return true;
    if (isParticipant(user, project)) return true;
  }

  return false;
}

/**
 * 할일 수정 권한 (R10)
 * - admin: 전체
 * - leader: 소속 프로젝트가 자기 사업부일 때만(다른 사업부는 배정돼 있어도 보기만)
 * - manager: PM·참여자·본인 배정 / member: PM·본인 배정 (기존 규칙)
 */
export function canEditTask(user: AppUser, task: Task, project: Project): boolean {
  if (isExplicitlyBlocked(user)) return false;
  if (user.role === 'admin') return true;

  if (user.role === 'leader') return !!user.bu_code && project.bu_code === user.bu_code;

  if (user.role === 'manager') {
    if (isPm(user, project)) return true;
    if (isParticipant(user, project)) return true;
    if (task.assignee_id === user.id) return true;
  }

  if (user.role === 'member') {
    if (isPm(user, project)) return true;
    if (task.assignee_id === user.id) return true;
  }

  return false;
}

/**
 * 할일 상태만 수정 가능한지 체크 (제목 등은 수정 불가)
 */
export function canOnlyUpdateTaskStatus(user: AppUser, task: Task, project: Project): boolean {
  if (user.role === 'admin') return false;
  if (user.role === 'leader' && project.bu_code === user.bu_code) return false;
  if (user.role === 'manager' && isPm(user, project)) return false;

  if (task.assignee_id === user.id) return true;

  return false;
}

/**
 * 할일 삭제 권한 (R10)
 */
export function canDeleteTask(user: AppUser, task: Task, project: Project): boolean {
  if (isExplicitlyBlocked(user)) return false;
  if (user.role === 'admin') return true;

  if (user.role === 'leader') return !!user.bu_code && project.bu_code === user.bu_code;

  if (user.role === 'manager' || user.role === 'member') {
    if (isPm(user, project)) return true;
    if (isParticipant(user, project)) return true;
  }

  return false;
}

// ============================================
// 재무(매출/지출) 권한 — R9·R10·R11·R12·R13·R14
// ============================================

/**
 * 매출·지출 행 보기 (R7·R9)
 * - 관리자·리더: 전체
 * - 일반 직원: 볼 수 있는 프로젝트에 붙은 **모든** 행(행 사업부 무관) + 본인이 등록한 행
 */
export function canViewFinanceEntry(
  user: AppUser | null | undefined,
  entry: FinancialEntry,
  project: Project | null | undefined
): boolean {
  if (!isActiveStaff(user)) return false;
  if (user.role === 'admin' || user.role === 'leader') return true;
  if (entry.created_by && entry.created_by === user.id) return true;
  if (project && canViewProject(user, project)) return true;
  return false;
}

/** @deprecated `canViewFinanceEntry`를 쓴다. 같은 판정이다. */
export function canAccessFinance(
  user: AppUser,
  entry: FinancialEntry,
  project: Project | null
): boolean {
  return canViewFinanceEntry(user, entry, project);
}

/**
 * 순익 조회 권한 체크
 * PM인 경우 계정 ROLE과 관계없이 해당 프로젝트의 매출/지출(순익) 조회 가능
 */
export function canViewNetProfit(user: AppUser, project: Project): boolean {
  if (isExplicitlyBlocked(user)) return false;
  if (user.role === 'admin') return true;
  if (isPm(user, project)) return true;
  if (user.role === 'leader') return true; // R7: 리더는 전사 매출·지출을 본다
  return false;
}

/**
 * 매출·지출 등록 (R10·R11)
 * - 관리자: 가능
 * - 리더: 행 사업부가 자기 사업부일 때만(프로젝트 사업부 무관)
 * - 일반 직원: 볼 수 있는 프로젝트에 등록 가능
 * @param rowBuCode 새 행의 사업부. 비우면 프로젝트 사업부(기본값).
 */
export function canCreateFinance(
  user: AppUser | null | undefined,
  project: Project,
  rowBuCode?: BuCode | null
): boolean {
  if (!isActiveStaff(user)) return false;
  const rowBu = rowBuCode ?? project.bu_code;
  if (!isBuCode(rowBu)) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'leader') return rowBu === user.bu_code;
  return canViewProject(user, project);
}

/**
 * 매출·지출 내용 수정 (R10·R11)
 * - 관리자: 전체
 * - 등록자 없는 옛 행: 관리자만
 * - 리더: 행 사업부가 자기 사업부인 행(다른 사업부 행은 본인 등록이어도 보기만)
 * - 일반 직원: 본인 등록 행
 * 세 번째 인자(프로젝트)는 기존 시그니처 호환용이며 판정에 쓰지 않는다.
 */
export function canEditFinance(
  user: AppUser | null | undefined,
  entry: FinancialEntry,
  _project?: Project | null
): boolean {
  if (!isActiveStaff(user)) return false;
  if (user.role === 'admin') return true;
  if (!entry.created_by) return false;
  if (user.role === 'leader') return entry.bu_code === user.bu_code;
  return entry.created_by === user.id;
}

/**
 * 매출·지출 삭제 (R11): `planned` 행만, 수정 권한자만. `paid`·`canceled`는 관리자도 불가.
 */
export function canDeleteFinance(
  user: AppUser | null | undefined,
  entry: FinancialEntry,
  project?: Project | null
): boolean {
  if (entry.status !== 'planned') return false;
  return canEditFinance(user, entry, project);
}

const FINANCIAL_STATUSES: readonly FinancialStatus[] = ['planned', 'paid', 'canceled'];

function isFinancialStatus(value: unknown): value is FinancialStatus {
  return typeof value === 'string' && (FINANCIAL_STATUSES as readonly string[]).includes(value);
}

/**
 * 매출·지출 상태 전이 (R12)
 * | 전이 | 누가 |
 * | planned→paid, planned→canceled | 수정 권한자 |
 * | paid→canceled | 등록자·행 사업부 리더·관리자(= 수정 권한자) |
 * | paid→planned | 관리자만 |
 * | canceled→planned·paid | 관리자만 |
 * 상태가 그대로면 수정 권한과 같다. `paid_at` 필수는 `validateFinanceDates`가 본다.
 */
export function canTransitionFinance(
  user: AppUser | null | undefined,
  entry: FinancialEntry,
  from: FinancialStatus,
  to: FinancialStatus
): boolean {
  if (!isFinancialStatus(from) || !isFinancialStatus(to)) return false;
  if (!isActiveStaff(user)) return false;
  if (from === to) return canEditFinance(user, entry);

  if (from === 'planned') return canEditFinance(user, entry); // → paid | canceled
  if (from === 'paid' && to === 'canceled') return canEditFinance(user, entry);
  // paid→planned, canceled→planned, canceled→paid
  return user.role === 'admin';
}

/**
 * 매출·지출 행의 사업부 이동 (R13): 관리자와 **원래** 사업부의 리더만.
 * 같은 사업부 값이면 이동이 아니므로 수정 권한과 같다.
 */
export function canMoveFinanceBu(
  user: AppUser | null | undefined,
  entry: FinancialEntry,
  toBuCode: BuCode
): boolean {
  if (!isActiveStaff(user)) return false;
  if (!isBuCode(toBuCode)) return false;
  if (toBuCode === entry.bu_code) return canEditFinance(user, entry);
  if (user.role === 'admin') return true;
  return user.role === 'leader' && entry.bu_code === user.bu_code;
}

/**
 * 거래 범위 검증 (R13): 내부배부 행은 상대 사업부가 필수이고 행 사업부와 달라야 한다.
 * @returns 오류 문구(400용) 또는 null
 */
export function validateFinanceScope(input: {
  entry_scope?: FinancialEntryScope | null;
  bu_code: BuCode;
  counterparty_bu_code?: BuCode | null;
}): string | null {
  const scope = input.entry_scope ?? 'external';
  if (scope !== 'external' && scope !== 'internal_allocation') {
    return '거래 범위(entry_scope) 값이 올바르지 않습니다.';
  }
  if (scope === 'external') return null;
  if (!input.counterparty_bu_code) return '내부배부 행은 상대 사업부가 필요합니다.';
  if (!isBuCode(input.counterparty_bu_code)) return '상대 사업부 값이 올바르지 않습니다.';
  if (input.counterparty_bu_code === input.bu_code) return '내부배부의 상대 사업부는 행 사업부와 달라야 합니다.';
  return null;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` 형식이면서 실제 달력 날짜인지 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return d <= daysInMonth;
}

/** 입금·지급일(`YYYY-MM-DD`)을 `paid_at`(timestamptz) 저장값으로: 한국 자정 */
export function toPaidAtTimestamp(date: string): string {
  return `${date}T00:00:00+09:00`;
}

export type FinanceDatesInput = {
  /** 저장 후 상태 */
  status: FinancialStatus;
  /** undefined = 보내지 않음(기존 값 유지), null·'' = 비움, 문자열 = `YYYY-MM-DD` */
  due_date?: string | null;
  /** undefined = 보내지 않음(기존 값 유지), null·'' = 비움, 문자열 = `YYYY-MM-DD` */
  paid_at?: string | null;
};

export type FinanceDatesExisting = {
  status?: FinancialStatus | null;
  due_date?: string | null;
  /** DB에 저장된 timestamptz 값 그대로 */
  paid_at?: string | null;
};

export type FinanceDatesResult =
  | {
      ok: true;
      /** 저장할 값. undefined면 update에 넣지 않는다. */
      due_date: string | null | undefined;
      paid_at: string | null | undefined;
    }
  | { ok: false; error: string };

function normalizeDateInput(value: string | null | undefined): { kind: 'absent' } | { kind: 'cleared' } | { kind: 'value'; value: string } | { kind: 'invalid' } {
  if (value === undefined) return { kind: 'absent' };
  if (value === null || value === '') return { kind: 'cleared' };
  if (!isValidDateString(value)) return { kind: 'invalid' };
  return { kind: 'value', value };
}

/**
 * 기한·입금일 검증 (R14, ERP 로그인 경로 전용 — DB는 강제하지 않는다)
 * - `planned` 행은 저장 후 `due_date`가 있어야 한다.
 * - 새 행을 `paid`로 저장하거나 다른 상태에서 `paid`로 바꿀 때 `paid_at`이 있어야 한다.
 * - 이미 `paid`인 행은 `paid_at`·`due_date` 없이도 수정할 수 있다(옛 행). 단 `paid_at`을 명시적으로 비우면 거부.
 * - `canceled` 행은 날짜 없이 저장할 수 있다.
 * - 날짜는 `YYYY-MM-DD`로 받는다. `paid_at`은 `YYYY-MM-DDT00:00:00+09:00`로 저장한다.
 * @param existing 수정일 때 저장된 행. 새 행이면 생략.
 */
export function validateFinanceDates(
  input: FinanceDatesInput,
  existing?: FinanceDatesExisting | null
): FinanceDatesResult {
  if (!isFinancialStatus(input.status)) {
    return { ok: false, error: '상태(status) 값이 올바르지 않습니다.' };
  }

  const due = normalizeDateInput(input.due_date);
  if (due.kind === 'invalid') return { ok: false, error: '기한(due_date)은 YYYY-MM-DD 형식이어야 합니다.' };
  const paid = normalizeDateInput(input.paid_at);
  if (paid.kind === 'invalid') return { ok: false, error: '입금·지급일(paid_at)은 YYYY-MM-DD 형식이어야 합니다.' };

  const dueToWrite = due.kind === 'absent' ? undefined : due.kind === 'cleared' ? null : due.value;
  const paidToWrite = paid.kind === 'absent' ? undefined : paid.kind === 'cleared' ? null : toPaidAtTimestamp(paid.value);

  const effectiveDue = dueToWrite !== undefined ? dueToWrite : existing?.due_date ?? null;
  const effectivePaid = paidToWrite !== undefined ? paidToWrite : existing?.paid_at ?? null;

  if (input.status === 'planned' && !effectiveDue) {
    return { ok: false, error: '예정(planned) 행은 기한(due_date)이 필요합니다.' };
  }

  if (input.status === 'paid') {
    const becomingPaid = !existing || existing.status !== 'paid';
    if (paid.kind === 'cleared') {
      return { ok: false, error: '완료(paid) 행의 입금·지급일(paid_at)은 비울 수 없습니다.' };
    }
    if (becomingPaid && !effectivePaid) {
      return { ok: false, error: '완료(paid)로 저장하려면 입금·지급일(paid_at)이 필요합니다.' };
    }
  }

  return { ok: true, due_date: dueToWrite, paid_at: paidToWrite };
}

// ============================================
// 변경 기록 보기·사람 값 변경 (R18·R19·R22)
// ============================================

/** 매출·지출 변경 기록 보기 (R18): 관리자, 그 행 사업부의 리더, 그 행의 등록자 */
export function canViewFinanceChanges(user: AppUser | null | undefined, entry: FinancialEntry): boolean {
  if (!isActiveStaff(user)) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'leader' && entry.bu_code === user.bu_code) return true;
  return !!entry.created_by && entry.created_by === user.id;
}

/** 직원 역할·사업부·재직 변경 기록 보기 (R19): 관리자만 */
export function canViewUserChanges(user: AppUser | null | undefined): boolean {
  return isActiveAdmin(user);
}

/** 직원 등록·정보 수정 (R22·R23): 재직 관리자만 */
export function canManageUsers(user: AppUser | null | undefined): boolean {
  return isActiveAdmin(user);
}

/** 직원 역할·사업부·재직 상태 변경 (R22): 관리자만, 본인 값은 불가 */
export function canChangeUserRoleBuStatus(user: AppUser | null | undefined, targetUserId: string): boolean {
  if (!isActiveAdmin(user)) return false;
  return !!targetUserId && targetUserId !== user!.id;
}

// ============================================
// 출퇴근 권한
// ============================================

/**
 * 출퇴근 기록 접근 권한
 */
export function canAccessAttendance(
  user: AppUser,
  targetUserId: string,
  targetBuCode: BuCode | null
): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'leader' && targetBuCode === user.bu_code) return true;
  if (user.id === targetUserId) return true;
  return false;
}

/**
 * 출퇴근 기록 수정 권한
 */
export function canEditAttendance(
  user: AppUser,
  targetUserId: string,
  targetBuCode: BuCode | null
): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'leader' && targetBuCode === user.bu_code) return true;
  return false;
}

// ============================================
// 외부인 기능 (R27)
// ============================================

/**
 * 아티스트·파트너용 기능(`/artist`, `api/artist/*`, `api/partner-settlements*`,
 * `projects/[id]/share-settings`)은 누구에게나 막는다(R27). 코드·테이블은 남긴다.
 */
export function canAccessExternalFeature(_user?: AppUser | null): boolean {
  return false;
}

// ============================================
// UI 표시 권한
// ============================================

/**
 * 사이드바 메뉴 표시 권한
 *
 * 그룹 순서:
 * 1. 일상 업무: dashboard, tasks, workLog
 * 2. 근태/휴가: attendance, leave
 * 3. 프로젝트 운영: projects, settlement
 * 4. 지식 관리: manuals, taskTemplates
 * 5. 조직/인력: organization, partners, exclusiveArtists
 * 6. 예약/자원: meetingRooms, equipment, vehicles
 * 7. 관리자 전용: attendanceAdmin, leaveAdmin, bugReports, pushTest
 *
 * 외부인(viewer·artist)과 명시적 비재직 계정에는 메뉴를 주지 않는다(R1·R27).
 * 아티스트·파트너용 메뉴(아티스트 포털·파트너 정산·공유 설정)는 누구에게도 주지 않는다.
 */
export function getVisibleMenus(user: AppUser): string[] {
  if (isExplicitlyBlocked(user)) return [];
  if (!isStaffRole(user.role)) return [];

  const menus: string[] = [];

  // ── 그룹 1: 일상 업무 ──
  menus.push('dashboard');
  menus.push('tasks');
  menus.push('workLog');

  // ── 그룹 2: 근태/휴가 ──
  menus.push('attendance');
  menus.push('leave');

  // ── 그룹 3: 프로젝트 운영 ──
  menus.push('projects');
  // 정산(사업부별 매출·지출·미수금): 관리자와 모든 리더 (R7)
  if (canAccessSettlement(user)) {
    menus.push('settlement');
  }

  // ── 그룹 4: 지식 관리 ──
  menus.push('manuals');
  menus.push('documentRoom');
  if (['admin', 'leader', 'manager'].includes(user.role)) {
    menus.push('taskTemplates');
  }

  // ── 그룹 5: 조직/인력 ──
  if (['admin', 'leader'].includes(user.role)) {
    menus.push('organization');
  }
  // 거래처·인력 명부(사내 기능): admin, leader, manager
  if (['admin', 'leader', 'manager'].includes(user.role)) {
    menus.push('partners');
  }
  // 전속 아티스트 관리(사내 기능): GRIGO/HEAD의 admin, leader, manager
  if (canAccessExclusiveArtists(user)) {
    menus.push('exclusiveArtists');
  }

  // ── 그룹 6: 예약/자원 ──
  menus.push('meetingRooms');
  menus.push('equipment');
  menus.push('vehicles');

  // ── 그룹 6.5: 재무 관리 ──
  // 법인카드: admin, leader 항상 / manager, member는 매핑 존재 시 (프론트에서 추가 체크)
  if (['admin', 'leader'].includes(user.role)) {
    menus.push('corporateCard');
  }

  // ── 그룹 7: 기타/관리자 ──
  menus.push('bugReports');
  if (['admin', 'leader'].includes(user.role)) {
    menus.push('attendanceAdmin');
    menus.push('leaveAdmin');
  }
  if (user.role === 'admin') {
    menus.push('workLogAdmin');
  }
  if (user.role === 'admin' && user.bu_code === 'HEAD') {
    menus.push('resourceOverview');
  }
  if (user.role === 'admin') {
    menus.push('pushTest');
  }

  return menus;
}

/**
 * 정산 화면 접근 (R7): 관리자와 모든 리더(사업부 무관). 이전에는 HEAD의 관리자·리더만.
 */
export function canAccessSettlement(user: AppUser): boolean {
  if (isExplicitlyBlocked(user)) return false;
  return user.role === 'admin' || user.role === 'leader';
}

/**
 * 전 사업부 통계 보기 (R7): 관리자와 모든 리더
 */
export function canViewAllBuStats(user: AppUser): boolean {
  if (isExplicitlyBlocked(user)) return false;
  return user.role === 'admin' || user.role === 'leader';
}

/**
 * 특정 BU 통계 조회 권한 (R7: 리더는 전 사업부를 본다)
 */
export function canViewBuStats(user: AppUser, _buCode: BuCode): boolean {
  if (isExplicitlyBlocked(user)) return false;
  return user.role === 'admin' || user.role === 'leader';
}

// ============================================
// 유틸리티
// ============================================

/**
 * 권한 객체 일괄 생성 (프론트엔드에서 사용)
 */
export function getProjectPermissions(user: AppUser, project: Project) {
  return {
    canAccess: canAccessProject(user, project),
    canEdit: canEditProject(user, project),
    canDelete: canDeleteProject(user, project),
    canCreateTask: canCreateTask(user, project),
    canCreateFinance: canCreateFinance(user, project),
    canViewNetProfit: canViewNetProfit(user, project),
  };
}

export function getTaskPermissions(user: AppUser, task: Task, project: Project) {
  return {
    canAccess: canAccessTask(user, task, project),
    canEdit: canEditTask(user, task, project),
    canDelete: canDeleteTask(user, task, project),
    canOnlyUpdateStatus: canOnlyUpdateTaskStatus(user, task, project),
  };
}

export function getFinancePermissions(
  user: AppUser,
  entry: FinancialEntry,
  project: Project | null
) {
  return {
    canAccess: canViewFinanceEntry(user, entry, project),
    canEdit: canEditFinance(user, entry, project),
    canDelete: canDeleteFinance(user, entry, project),
  };
}

// ============================================
// 휴가 권한
// ============================================

/**
 * 휴가 신청 승인 권한
 * - admin: 전체 승인 가능
 * - leader: 같은 BU만 승인 가능
 */
export function canApproveLeaveRequest(
  user: AppUser,
  requesterBuCode: BuCode | null
): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'leader' && user.bu_code === requesterBuCode) return true;
  return false;
}

/**
 * 대체휴무 생성 승인 권한 - HEAD의 admin만 가능
 */
export function canApproveCompensatoryRequest(user: AppUser): boolean {
  return user.role === 'admin' && user.bu_code === 'HEAD';
}

/**
 * 특별휴가 부여 권한 - HEAD의 admin만 가능
 */
export function canGrantSpecialLeave(user: AppUser): boolean {
  return user.role === 'admin' && user.bu_code === 'HEAD';
}

/**
 * 연차 수동 조정 권한 - HEAD의 admin만 가능
 */
export function canAdjustAnnualLeave(user: AppUser): boolean {
  return user.role === 'admin' && user.bu_code === 'HEAD';
}

/**
 * 휴가 관리자 페이지 접근 권한
 */
export function canAccessLeaveAdmin(user: AppUser): boolean {
  return ['admin', 'leader'].includes(user.role);
}

// ============================================
// 아티스트 페이지 권한 (R27: 차단)
// ============================================

/**
 * /artist 페이지 접근 권한 — R27로 누구에게나 막는다.
 * (이전: artist 역할 또는 HEAD의 leader·admin)
 */
export function canAccessArtistPage(user: AppUser): boolean {
  return canAccessExternalFeature(user);
}

// ============================================
// 전속 아티스트 관리 권한 (사내 기능)
// ============================================

/**
 * 전속 아티스트 관리 페이지 접근 권한 체크
 * - GRIGO 또는 HEAD 사업부 소속만 접근 가능 (업무 규칙)
 * - role이 admin, leader, manager인 경우
 */
export function canAccessExclusiveArtists(user: AppUser): boolean {
  const allowedBuCodes: BuCode[] = ['GRIGO', 'HEAD'];
  const allowedRoles: Role[] = ['admin', 'leader', 'manager'];

  if (!user.bu_code) return false;

  return allowedBuCodes.includes(user.bu_code) && allowedRoles.includes(user.role);
}

/**
 * 전속 아티스트 정보 수정 권한 체크
 * - GRIGO 또는 HEAD 사업부의 admin, leader만 가능
 */
export function canEditExclusiveArtist(user: AppUser): boolean {
  const allowedBuCodes: BuCode[] = ['GRIGO', 'HEAD'];
  const allowedRoles: Role[] = ['admin', 'leader'];

  if (!user.bu_code) return false;

  return allowedBuCodes.includes(user.bu_code) && allowedRoles.includes(user.role);
}

/**
 * artist 역할을 /artist로 보낼지 — R27로 /artist가 막혀 항상 false.
 */
export function shouldRedirectArtistToArtistPage(_user: AppUser): boolean {
  return false;
}

// ============================================
// Manuals (SOP) 권한
// ============================================

/**
 * Manuals 조회 권한 - 모든 사용자가 모든 사업부의 매뉴얼 조회 가능
 */
export function canAccessManual(_user: AppUser): boolean {
  return true;
}

/**
 * Manuals 생성 권한
 */
export function canCreateManual(user: AppUser, buCode: BuCode): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'leader' && user.bu_code === buCode) return true;
  if (user.role === 'manager' && user.bu_code === buCode) return true;
  return false;
}

/**
 * Manuals 수정 권한
 */
export function canEditManual(user: AppUser, manual: { bu_code: BuCode }): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'leader' && user.bu_code === manual.bu_code) return true;
  if (user.role === 'manager' && user.bu_code === manual.bu_code) return true;
  return false;
}

/**
 * Manuals 삭제 권한
 */
export function canDeleteManual(user: AppUser, manual: { bu_code: BuCode }): boolean {
  return canEditManual(user, manual);
}

// ============================================
// 할일 템플릿 권한
// ============================================

/**
 * 할일 템플릿 조회 권한 - 모든 사용자가 모든 사업부의 템플릿 조회 가능
 */
export function canAccessTaskTemplate(_user: AppUser): boolean {
  return true;
}

/**
 * 할일 템플릿 생성 권한
 */
export function canCreateTaskTemplate(user: AppUser, buCode: BuCode): boolean {
  return canCreateManual(user, buCode);
}

/**
 * 할일 템플릿 수정 권한
 */
export function canEditTaskTemplate(user: AppUser, template: { bu_code: BuCode }): boolean {
  return canEditManual(user, template);
}

/**
 * 할일 템플릿 삭제 권한
 */
export function canDeleteTaskTemplate(user: AppUser, template: { bu_code: BuCode }): boolean {
  return canEditTaskTemplate(user, template);
}

/**
 * 권한 시스템 export
 */
export const Permissions = {
  staff: {
    isActive: isActiveStaff,
    isHeadAdmin,
  },
  project: {
    canAccess: canAccessProject,
    canView: canViewProject,
    canViewBasicInfo: canViewProjectBasicInfo,
    canCreate: canCreateProject,
    canEdit: canEditProject,
    canDelete: canDeleteProject,
    getPermissions: getProjectPermissions,
  },
  task: {
    canAccess: canAccessTask,
    canView: canViewTask,
    canCreate: canCreateTask,
    canEdit: canEditTask,
    canDelete: canDeleteTask,
    canOnlyUpdateStatus: canOnlyUpdateTaskStatus,
    getPermissions: getTaskPermissions,
  },
  finance: {
    canAccess: canAccessFinance,
    canView: canViewFinanceEntry,
    canCreate: canCreateFinance,
    canEdit: canEditFinance,
    canDelete: canDeleteFinance,
    canTransition: canTransitionFinance,
    canMoveBu: canMoveFinanceBu,
    canViewChanges: canViewFinanceChanges,
    canViewNetProfit: canViewNetProfit,
    validateDates: validateFinanceDates,
    validateScope: validateFinanceScope,
    getPermissions: getFinancePermissions,
  },
  users: {
    canManage: canManageUsers,
    canViewChanges: canViewUserChanges,
    canChangeRoleBuStatus: canChangeUserRoleBuStatus,
  },
  settlement: {
    canAccess: canAccessSettlement,
  },
  attendance: {
    canAccess: canAccessAttendance,
    canEdit: canEditAttendance,
  },
  leave: {
    canApproveRequest: canApproveLeaveRequest,
    canApproveCompensatory: canApproveCompensatoryRequest,
    canGrantSpecial: canGrantSpecialLeave,
    canAdjustAnnual: canAdjustAnnualLeave,
    canAccessAdmin: canAccessLeaveAdmin,
  },
  artist: {
    canAccessPage: canAccessArtistPage,
    shouldRedirectToArtistPage: shouldRedirectArtistToArtistPage,
  },
  external: {
    canAccess: canAccessExternalFeature,
  },
  exclusiveArtists: {
    canAccess: canAccessExclusiveArtists,
    canEdit: canEditExclusiveArtist,
  },
  ui: {
    getVisibleMenus,
    canViewAllBuStats,
    canViewBuStats,
  },
};
