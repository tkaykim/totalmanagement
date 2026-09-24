/**
 * 재무(매출·지출) 화면 권한 — 판정은 `src/lib/permissions.ts`에 위임한다.
 * 이 파일은 화면 타입(`@/types/database`)을 권한 판정 타입으로 바꾸는 어댑터일 뿐이다.
 * 규칙을 여기에 새로 쓰지 않는다.
 *
 * 규칙(spec R7·R9·R10·R11)
 * - 보기: 관리자·리더는 전체, 일반 직원은 볼 수 있는 프로젝트의 모든 행 + 본인 등록 행
 * - 등록: 관리자, 리더는 자기 사업부 행만, 일반 직원은 볼 수 있는 프로젝트에
 * - 수정: 관리자, 행 사업부 리더, 등록자(등록자 없는 옛 행은 관리자만)
 * - 삭제: `planned` 행만, 수정 권한자. `paid`·`canceled`는 누구도 못 지운다
 *
 * 화면 판정은 보안 경계가 아니다. 서버(`requireActiveStaff` + permissions.ts)와 DB가 강제한다.
 * 화면 사용자 객체에 `status`가 없으면(기존 화면 코드) 재직으로 보고 판정한다.
 * 메인 화면은 비재직·사업부 없는 계정을 이미 막는다.
 */

import type { BU, AppUser, FinancialEntry, Project, ProjectParticipant } from '@/types/database';
import {
  canCreateFinance,
  canDeleteFinance,
  canEditFinance,
  canViewFinanceEntry,
  canViewProject,
  isActiveStaff,
  type AppUser as PermAppUser,
  type FinancialEntry as PermFinancialEntry,
  type Project as PermProject,
} from '@/lib/permissions';

export type FinancePermission = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  reason?: string;
};

type FinancePermissionParams = {
  currentUser: AppUser | null;
  entry?: FinancialEntry | null;
  project?: Project | null;
  targetBu?: BU;
};

const NONE = (reason: string): FinancePermission => ({
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  reason,
});

function toPermUser(user: AppUser): PermAppUser {
  return {
    id: user.id,
    role: user.role,
    bu_code: user.bu_code ?? null,
    status: user.status ?? 'active',
    name: user.name,
    position: user.position,
  };
}

function pmIdOf(project: Project): string | null {
  if (project.pm_id) return project.pm_id;
  if (project.pm_ids && project.pm_ids.length > 0) return project.pm_ids[0];
  const pmParticipant = project.participants?.find((p: ProjectParticipant) => p.is_pm && p.user_id);
  return pmParticipant?.user_id ?? null;
}

function toPermProject(project: Project, userId: string): PermProject {
  const participants = (project.participants ?? [])
    .map((p: ProjectParticipant) => p.user_id)
    .filter((id): id is string => !!id);
  // pm_ids(여러 PM)에 본인이 있으면 본인을 PM으로 넘긴다.
  const pmId = project.pm_ids?.includes(userId) ? userId : pmIdOf(project);
  return {
    id: project.id,
    bu_code: project.bu_code,
    pm_id: pmId,
    participants,
    created_by: project.created_by ?? null,
  };
}

function toPermEntry(entry: FinancialEntry): PermFinancialEntry {
  return {
    id: entry.id,
    project_id: entry.project_id,
    bu_code: entry.bu_code,
    created_by: entry.created_by ?? null,
    kind: entry.kind,
    status: entry.status,
    entry_scope: entry.entry_scope,
    counterparty_bu_code: entry.counterparty_bu_code ?? null,
    due_date: entry.due_date ?? null,
    paid_at: entry.paid_at ?? null,
  };
}

/**
 * 재무 정보 접근 권한 체크 메인 함수
 * - entry가 있으면 그 행 기준 보기·수정·삭제
 * - entry가 없으면 프로젝트 기준(보기·등록). `canUpdate`는 등록 가능 여부와 같다.
 * - project도 없으면(새 프로젝트 작성 중) 재직자는 등록 가능, 리더는 `targetBu`가 자기 사업부일 때만.
 */
export function checkFinancePermission({
  currentUser,
  entry,
  project,
  targetBu,
}: FinancePermissionParams): FinancePermission {
  if (!currentUser) return NONE('로그인이 필요합니다.');

  const user = toPermUser(currentUser);
  if (!isActiveStaff(user)) return NONE('재무 정보 접근 권한이 없습니다.');

  if (!project) {
    const rowBu = entry?.bu_code ?? targetBu ?? user.bu_code;
    const canCreate = user.role === 'leader' ? rowBu === user.bu_code : true;
    if (entry) {
      const e = toPermEntry(entry);
      return {
        canRead: canViewFinanceEntry(user, e, null),
        canCreate,
        canUpdate: canEditFinance(user, e),
        canDelete: canDeleteFinance(user, e),
      };
    }
    return { canRead: true, canCreate, canUpdate: canCreate, canDelete: false };
  }

  const p = toPermProject(project, user.id);
  const rowBu = entry?.bu_code ?? targetBu ?? project.bu_code;
  const canCreate = canCreateFinance(user, p, rowBu);

  if (entry) {
    const e = toPermEntry(entry);
    return {
      canRead: canViewFinanceEntry(user, e, p),
      canCreate,
      canUpdate: canEditFinance(user, e, p),
      canDelete: canDeleteFinance(user, e, p),
    };
  }

  return {
    canRead: canViewProject(user, p),
    canCreate,
    canUpdate: canCreate,
    canDelete: false,
  };
}

/**
 * 특정 사업부의 재무 정보 열람 권한 (R7: 관리자·리더는 전체).
 * 일반 직원은 행 단위로 판정하므로(R9) 사업부 단위로는 본인 사업부만 true를 준다.
 */
export function canViewFinanceForBu(currentUser: AppUser | null, targetBu: BU): boolean {
  if (!currentUser) return false;
  const user = toPermUser(currentUser);
  if (!isActiveStaff(user)) return false;
  if (user.role === 'admin' || user.role === 'leader') return true;
  return user.bu_code === targetBu;
}

/**
 * 한 프로젝트의 재무 행 목록을 보기 범위(R9)로 거른다.
 */
export function filterFinanceEntriesForMember(
  entries: FinancialEntry[],
  currentUser: AppUser,
  project: Project | null
): FinancialEntry[] {
  const user = toPermUser(currentUser);
  const p = project ? toPermProject(project, user.id) : null;
  return entries.filter((entry) => canViewFinanceEntry(user, toPermEntry(entry), p));
}

/**
 * 삭제 가능 여부 체크 (확인 다이얼로그용)
 */
export function canDeleteEntry(
  currentUser: AppUser | null,
  entry: FinancialEntry,
  project?: Project | null
): { canDelete: boolean; reason?: string } {
  const permission = checkFinancePermission({
    currentUser,
    entry,
    project,
    targetBu: entry.bu_code,
  });

  if (permission.canDelete) return { canDelete: true };
  if (entry.status === 'paid' || entry.status === 'canceled') {
    return { canDelete: false, reason: '완료·취소된 매출·지출은 삭제할 수 없습니다.' };
  }
  return { canDelete: false, reason: permission.reason ?? '삭제 권한이 없습니다.' };
}
