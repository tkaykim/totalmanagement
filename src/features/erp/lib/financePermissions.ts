/**
 * 재무 정보 접근 권한 체크 유틸리티
 * 
 * 권한 정책:
 * - viewer: 재무정보 접근 불가
 * - member: 
 *   - 본인 BU만 접근 가능 (HEAD는 전체)
 *   - PM인 프로젝트: 전체 열람/등록/수정/본인등록분 삭제 가능
 *   - PM이 아닌 프로젝트: 본인 등록분만 열람/수정/삭제 가능, 등록은 가능
 * - manager:
 *   - 본인 BU 전체 접근 가능 (HEAD는 전체)
 *   - 열람/등록/수정/삭제 모두 가능
 * - admin:
 *   - 전체 BU 접근 가능
 *   - 열람/등록/수정/삭제 모두 가능
 */

import type { BU, ERPRole, AppUser, FinancialEntry, Project, ProjectParticipant } from '@/types/database';

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

/**
 * BU 접근 권한 체크
 * HEAD 소속이면 전체 BU 접근 가능
 * 그 외는 본인 BU만 접근 가능
 */
function canAccessBu(userBu: BU | undefined, targetBu: BU): boolean {
  if (!userBu) return false;
  if (userBu === 'HEAD') return true;
  return userBu === targetBu;
}

/**
 * 프로젝트 PM 여부 확인
 */
function isProjectPm(userId: string, project: Project | null | undefined): boolean {
  if (!project || !userId) return false;
  
  // pm_id 단일 필드 체크
  if (project.pm_id === userId) return true;
  
  // pm_ids 배열 체크
  if (project.pm_ids && project.pm_ids.includes(userId)) return true;
  
  // participants에서 is_pm 체크
  if (project.participants) {
    return project.participants.some(
      (p: ProjectParticipant) => p.user_id === userId && p.is_pm
    );
  }
  
  return false;
}

/**
 * 프로젝트 참여자 여부 확인
 */
function isProjectParticipant(userId: string, project: Project | null | undefined): boolean {
  if (!project || !userId) return false;
  
  if (project.participants) {
    return project.participants.some((p: ProjectParticipant) => p.user_id === userId);
  }
  
  return false;
}

/**
 * 재무 항목 작성자 여부 확인
 */
function isEntryCreator(userId: string, entry: FinancialEntry | null | undefined): boolean {
  if (!entry || !userId) return false;
  return entry.created_by === userId;
}

/**
 * 재무 정보 접근 권한 체크 메인 함수
 */
export function checkFinancePermission({
  currentUser,
  entry,
  project,
  targetBu,
}: FinancePermissionParams): FinancePermission {
  // 사용자 정보 없음
  if (!currentUser) {
    return {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      reason: '로그인이 필요합니다.',
    };
  }

  const { role, bu_code: userBu, id: userId } = currentUser;
  const entryBu = entry?.bu_code || targetBu;

  // 1. viewer는 완전 차단
  if (role === 'viewer') {
    return {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      reason: '재무 정보 열람 권한이 없습니다.',
    };
  }

  // 2. admin은 전체 접근
  if (role === 'admin') {
    return {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    };
  }

  // 3. BU 접근 권한 체크 (manager, member 공통)
  if (entryBu && !canAccessBu(userBu, entryBu)) {
    return {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      reason: '해당 사업부의 재무 정보에 접근할 수 없습니다.',
    };
  }

  // 4. manager는 본인 BU(또는 HEAD면 전체) 접근
  if (role === 'manager') {
    return {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    };
  }

  // 5. member 권한 세분화
  if (role === 'member') {
    const isPm = isProjectPm(userId, project);
    const isCreator = isEntryCreator(userId, entry);
    const isParticipant = isProjectParticipant(userId, project);

    // 새 항목 등록 (entry가 없는 경우)
    if (!entry) {
      return {
        canRead: isPm || isParticipant,
        canCreate: true, // member는 항상 등록 가능
        canUpdate: false,
        canDelete: false,
      };
    }

    // PM인 경우: 전체 열람, 등록, 본인 등록분 수정/삭제
    if (isPm) {
      return {
        canRead: true,
        canCreate: true,
        canUpdate: isCreator,
        canDelete: isCreator,
        reason: !isCreator ? '본인이 등록한 항목만 수정/삭제할 수 있습니다.' : undefined,
      };
    }

    // PM이 아닌 경우: 본인 등록분만 열람/수정/삭제 가능
    return {
      canRead: isCreator || isParticipant,
      canCreate: true,
      canUpdate: isCreator,
      canDelete: isCreator,
      reason: !isCreator ? '본인이 등록한 항목만 열람/수정/삭제할 수 있습니다.' : undefined,
    };
  }

  // 6. artist 역할 (별도 정책 필요시 여기서 처리)
  if (role === 'artist') {
    return {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      reason: '재무 정보 접근 권한이 없습니다.',
    };
  }

  // 기본값 (알 수 없는 역할)
  return {
    canRead: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    reason: '권한을 확인할 수 없습니다.',
  };
}

/**
 * 특정 사업부의 재무 정보 열람 권한 체크 (리스트 필터링용)
 */
export function canViewFinanceForBu(currentUser: AppUser | null, targetBu: BU): boolean {
  if (!currentUser) return false;
  
  const { role, bu_code: userBu } = currentUser;
  
  if (role === 'viewer' || role === 'artist') return false;
  if (role === 'admin') return true;
  
  // manager, member는 BU 체크
  return canAccessBu(userBu, targetBu);
}

/**
 * 재무 항목 리스트 필터링 (member용)
 * member는 PM이거나 본인이 등록한 항목만 볼 수 있음
 */
export function filterFinanceEntriesForMember(
  entries: FinancialEntry[],
  currentUser: AppUser,
  project: Project | null
): FinancialEntry[] {
  if (currentUser.role !== 'member') return entries;
  
  const isPm = isProjectPm(currentUser.id, project);
  
  // PM이면 전체 반환
  if (isPm) return entries;
  
  // PM이 아니면 본인 등록분만
  return entries.filter(entry => entry.created_by === currentUser.id);
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
  
  return {
    canDelete: permission.canDelete,
    reason: permission.reason,
  };
}

