import type { AppUser, BU } from '@/types/database';

export function isAdmin(user: AppUser | null | undefined): boolean {
  return user?.role === 'admin';
}

export function isLeader(user: AppUser | null | undefined): boolean {
  return user?.role === 'leader';
}

export function isManager(user: AppUser | null | undefined): boolean {
  return user?.role === 'manager';
}

export function isAdminOrLeader(user: AppUser | null | undefined): boolean {
  return isAdmin(user) || isLeader(user);
}

export function isMember(user: AppUser | null | undefined): boolean {
  return user?.role === 'member' || isManager(user) || isLeader(user) || isAdmin(user);
}

/**
 * HEAD 소속 leader인지 확인
 * HEAD 소속 leader는 admin과 동등한 출퇴근 관리 권한을 가짐
 */
export function isHeadLeader(user: AppUser | null | undefined): boolean {
  return isLeader(user) && user?.bu_code === 'HEAD';
}

/**
 * 전체 출퇴근 현황 조회 권한 (모든 사업부)
 * - admin 가능
 * - HEAD 소속 leader 가능
 */
export function canViewAllAttendance(user: AppUser | null | undefined): boolean {
  return isAdmin(user) || isHeadLeader(user);
}

/**
 * 팀/사업부 출퇴근 조회 권한
 * - admin: 모든 사업부
 * - HEAD 소속 leader: 모든 사업부
 * - leader: 본인 BU만
 */
export function canViewTeamAttendance(
  currentUser: AppUser | null | undefined,
  targetUserBuCode: BU | null | undefined
): boolean {
  if (!currentUser || !targetUserBuCode) {
    return false;
  }

  // admin은 전체 접근
  if (isAdmin(currentUser)) {
    return true;
  }

  // HEAD 소속 leader는 전체 접근
  if (isHeadLeader(currentUser)) {
    return true;
  }

  // leader는 본인 BU만
  if (isLeader(currentUser)) {
    return currentUser.bu_code === targetUserBuCode;
  }

  return false;
}

/**
 * 근무 신청 승인 권한
 * - admin: 모든 승인
 * - HEAD 소속 leader: 모든 승인
 * - leader: 본인 BU 직원 승인
 */
export function canApproveRequest(
  currentUser: AppUser | null | undefined,
  requesterBuCode: BU | null | undefined
): boolean {
  if (!currentUser || !requesterBuCode) {
    return false;
  }

  if (isAdmin(currentUser)) {
    return true;
  }

  // HEAD 소속 leader는 전체 승인 가능
  if (isHeadLeader(currentUser)) {
    return true;
  }

  if (isLeader(currentUser)) {
    return currentUser.bu_code === requesterBuCode;
  }

  return false;
}

/**
 * 출퇴근 기록 직접 수정/등록 권한
 * - admin: 모든 기록
 * - HEAD 소속 leader: 모든 기록
 * - 일반 leader: 직접 수정 불가 (승인/반려만 가능)
 */
export function canModifyAttendance(
  currentUser: AppUser | null | undefined,
  targetUserId: string,
  targetUserBuCode: BU | null | undefined
): boolean {
  if (!currentUser) {
    return false;
  }

  // admin은 전체 수정 가능
  if (isAdmin(currentUser)) {
    return true;
  }

  // HEAD 소속 leader만 전체 수정 가능
  // 일반 leader는 직접 수정 불가 (승인/반려만 가능)
  if (isHeadLeader(currentUser)) {
    return true;
  }

  return false;
}

/**
 * 출퇴근 기록 조회 권한
 * - admin: 전체
 * - HEAD 소속 leader: 전체
 * - leader: 본인 BU + 본인
 * - manager/member: 본인만
 */
export function canAccessAttendanceLog(
  currentUser: AppUser | null | undefined,
  targetUserId: string,
  targetUserBuCode: BU | null | undefined
): boolean {
  if (!currentUser) {
    return false;
  }

  // 본인 기록은 항상 접근 가능
  if (currentUser.id === targetUserId) {
    return true;
  }

  // admin은 전체 접근
  if (isAdmin(currentUser)) {
    return true;
  }

  // HEAD 소속 leader는 전체 접근
  if (isHeadLeader(currentUser)) {
    return true;
  }

  // leader는 본인 BU 직원 접근
  if (isLeader(currentUser) && currentUser.bu_code === targetUserBuCode) {
    return true;
  }

  return false;
}
