import type { AppUser, BU } from '@/types/database';

export function isAdmin(user: AppUser | null | undefined): boolean {
  return user?.role === 'admin';
}

export function isManager(user: AppUser | null | undefined): boolean {
  return user?.role === 'manager' || user?.role === 'admin';
}

export function isMember(user: AppUser | null | undefined): boolean {
  return user?.role === 'member' || isManager(user);
}

export function canViewAllAttendance(user: AppUser | null | undefined): boolean {
  return isAdmin(user);
}

export function canViewTeamAttendance(
  currentUser: AppUser | null | undefined,
  targetUserBuCode: BU | null | undefined
): boolean {
  if (!currentUser || !targetUserBuCode) {
    return false;
  }

  if (isAdmin(currentUser)) {
    return true;
  }

  if (isManager(currentUser)) {
    return currentUser.bu_code === targetUserBuCode;
  }

  return false;
}

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

  if (isManager(currentUser)) {
    return currentUser.bu_code === requesterBuCode;
  }

  return false;
}

export function canModifyAttendance(
  currentUser: AppUser | null | undefined,
  targetUserId: string,
  targetUserBuCode: BU | null | undefined
): boolean {
  if (!currentUser) {
    return false;
  }

  if (currentUser.id === targetUserId) {
    return true;
  }

  return canApproveRequest(currentUser, targetUserBuCode);
}

