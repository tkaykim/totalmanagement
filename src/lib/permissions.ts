/**
 * 역할 기반 권한 시스템
 * 
 * 역할 계층:
 * - admin: 슈퍼관리자 - 모든 접근 가능
 * - leader: 사업부 리더 - 본인 BU 전체 + PM/참여 프로젝트
 * - manager: PM/매니저 - 본인 PM 프로젝트 + 참여/할당
 * - member: 일반 직원 - 본인 참여/할당분만
 * - viewer: 열람자 - 읽기 전용
 * - artist: 아티스트 - 제한된 접근
 */

export type Role = 'admin' | 'leader' | 'manager' | 'member' | 'viewer' | 'artist';
export type BuCode = 'GRIGO' | 'FLOW' | 'REACT' | 'MODOO' | 'AST' | 'HEAD';

export interface AppUser {
  id: string;
  role: Role;
  bu_code: BuCode | null;
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
  project_id: string | number;
  bu_code: BuCode;
  created_by: string | null;
  kind: 'revenue' | 'expense';
}

// ============================================
// 프로젝트 권한
// ============================================

/**
 * 프로젝트 접근(열람) 권한 체크
 */
export function canAccessProject(user: AppUser, project: Project): boolean {
  // admin: 전체 접근
  if (user.role === 'admin') return true;
  
  // leader: 본인 BU + 본인 PM + 참여자
  if (user.role === 'leader') {
    if (project.bu_code === user.bu_code) return true;
    if (project.pm_id === user.id) return true;
    if (project.participants?.includes(user.id)) return true;
  }
  
  // manager: 본인 BU + 본인 PM + 참여자
  if (user.role === 'manager') {
    if (project.bu_code === user.bu_code) return true;
    if (project.pm_id === user.id) return true;
    if (project.participants?.includes(user.id)) return true;
  }
  
  // member: 참여자만
  if (user.role === 'member') {
    if (project.participants?.includes(user.id)) return true;
  }
  
  return false;
}

/**
 * 프로젝트 기본 정보(제목, 설명)만 볼 수 있는 권한
 * - 본인에게 할일이 할당된 경우 해당 프로젝트 기본 정보 열람 가능
 */
export function canViewProjectBasicInfo(
  user: AppUser, 
  project: Project, 
  hasAssignedTasks: boolean
): boolean {
  // 기존 프로젝트 접근 권한이 있으면 당연히 OK
  if (canAccessProject(user, project)) return true;
  
  // 본인에게 할당된 할일이 해당 프로젝트에 있으면 기본 정보 조회 가능
  if (hasAssignedTasks) return true;
  
  return false;
}

/**
 * 프로젝트 생성 권한
 */
export function canCreateProject(user: AppUser): boolean {
  return ['admin', 'leader', 'manager'].includes(user.role);
}

/**
 * 프로젝트 수정 권한
 */
export function canEditProject(user: AppUser, project: Project): boolean {
  if (user.role === 'admin') return true;
  
  // leader: 본인 BU 또는 본인 PM인 프로젝트
  if (user.role === 'leader') {
    if (project.bu_code === user.bu_code) return true;
    if (project.pm_id === user.id) return true;
  }
  
  // manager: 본인 PM만
  if (user.role === 'manager' && project.pm_id === user.id) return true;
  
  return false;
}

/**
 * 프로젝트 삭제 권한
 */
export function canDeleteProject(user: AppUser, project: Project): boolean {
  return canEditProject(user, project);
}

// ============================================
// 할일 권한
// ============================================

/**
 * 할일 접근(열람) 권한 체크
 */
export function canAccessTask(user: AppUser, task: Task, project: Project): boolean {
  if (user.role === 'admin') return true;
  
  // leader: 본인 BU 프로젝트 전체 + 본인 할당 할일
  if (user.role === 'leader') {
    if (project.bu_code === user.bu_code) return true;
    if (task.assignee_id === user.id) return true;
  }
  
  // manager: PM이거나 본인 할당
  if (user.role === 'manager') {
    if (project.pm_id === user.id) return true;
    if (task.assignee_id === user.id) return true;
  }
  
  // member/viewer/artist: 본인 할당만
  if (task.assignee_id === user.id) return true;
  
  return false;
}

/**
 * 할일 생성 권한
 */
export function canCreateTask(user: AppUser, project: Project): boolean {
  if (user.role === 'admin') return true;
  
  // leader: 본인 BU 프로젝트
  if (user.role === 'leader' && project.bu_code === user.bu_code) return true;
  
  // manager: 본인 PM 프로젝트
  if (user.role === 'manager' && project.pm_id === user.id) return true;
  
  return false;
}

/**
 * 할일 수정 권한
 */
export function canEditTask(user: AppUser, task: Task, project: Project): boolean {
  if (user.role === 'admin') return true;
  
  // leader: 본인 BU 프로젝트 또는 본인 할당
  if (user.role === 'leader') {
    if (project.bu_code === user.bu_code) return true;
    if (task.assignee_id === user.id) return true;
  }
  
  // manager: PM이면 전체, 본인 할당도 가능
  if (user.role === 'manager') {
    if (project.pm_id === user.id) return true;
    if (task.assignee_id === user.id) return true;
  }
  
  // member: 본인 할당만
  if (user.role === 'member' && task.assignee_id === user.id) return true;
  
  return false;
}

/**
 * 할일 상태만 수정 가능한지 체크 (제목 등은 수정 불가)
 */
export function canOnlyUpdateTaskStatus(user: AppUser, task: Task, project: Project): boolean {
  // 전체 수정 권한이 있으면 false
  if (user.role === 'admin') return false;
  if (user.role === 'leader' && project.bu_code === user.bu_code) return false;
  if (user.role === 'manager' && project.pm_id === user.id) return false;
  
  // 본인 할당이면 상태만 수정 가능
  if (task.assignee_id === user.id) return true;
  
  return false;
}

/**
 * 할일 삭제 권한
 */
export function canDeleteTask(user: AppUser, task: Task, project: Project): boolean {
  if (user.role === 'admin') return true;
  
  // leader: 본인 BU 프로젝트
  if (user.role === 'leader' && project.bu_code === user.bu_code) return true;
  
  // manager: 본인 PM만
  if (user.role === 'manager' && project.pm_id === user.id) return true;
  
  return false;
}

// ============================================
// 재무(매출/지출) 권한
// ============================================

/**
 * 재무 항목 접근(열람) 권한 체크
 */
export function canAccessFinance(
  user: AppUser, 
  entry: FinancialEntry, 
  project: Project
): boolean {
  if (user.role === 'admin') return true;
  
  // leader: 본인 BU 전체 + PM 프로젝트 전체 + 참여 프로젝트는 본인 등록분만
  if (user.role === 'leader') {
    if (entry.bu_code === user.bu_code) return true;
    if (project.pm_id === user.id) return true;
    // 참여 프로젝트는 본인 등록분만
    if (project.participants?.includes(user.id) && entry.created_by === user.id) return true;
  }
  
  // manager: PM이면 전체, 아니면 본인 등록분만
  if (user.role === 'manager') {
    if (project.pm_id === user.id) return true;
    if (entry.created_by === user.id) return true;
  }
  
  // member: 본인 등록분만
  if (user.role === 'member' && entry.created_by === user.id) return true;
  
  return false;
}

/**
 * 순익 조회 권한 체크
 */
export function canViewNetProfit(user: AppUser, project: Project): boolean {
  if (user.role === 'admin') return true;
  
  // leader: 본인 BU만 (참여 프로젝트는 순익 못 봄)
  if (user.role === 'leader' && project.bu_code === user.bu_code) return true;
  
  // manager: 본인 PM만
  if (user.role === 'manager' && project.pm_id === user.id) return true;
  
  return false;
}

/**
 * 재무 항목 생성 권한
 */
export function canCreateFinance(user: AppUser, project: Project): boolean {
  if (user.role === 'admin') return true;
  
  // leader: 본인 BU 프로젝트 또는 PM 프로젝트
  if (user.role === 'leader') {
    if (project.bu_code === user.bu_code) return true;
    if (project.pm_id === user.id) return true;
  }
  
  // manager: PM 프로젝트 또는 참여 프로젝트
  if (user.role === 'manager') {
    if (project.pm_id === user.id) return true;
    if (project.participants?.includes(user.id)) return true;
  }
  
  // member: 참여 프로젝트
  if (user.role === 'member' && project.participants?.includes(user.id)) return true;
  
  return false;
}

/**
 * 재무 항목 수정 권한
 */
export function canEditFinance(
  user: AppUser, 
  entry: FinancialEntry, 
  project: Project
): boolean {
  if (user.role === 'admin') return true;
  
  // leader: 본인 BU 전체 또는 본인 등록분
  if (user.role === 'leader') {
    if (entry.bu_code === user.bu_code) return true;
    if (entry.created_by === user.id) return true;
  }
  
  // manager: PM 프로젝트 전체 또는 본인 등록분
  if (user.role === 'manager') {
    if (project.pm_id === user.id) return true;
    if (entry.created_by === user.id) return true;
  }
  
  // member: 본인 등록분만
  if (user.role === 'member' && entry.created_by === user.id) return true;
  
  return false;
}

/**
 * 재무 항목 삭제 권한
 */
export function canDeleteFinance(
  user: AppUser, 
  entry: FinancialEntry, 
  project: Project
): boolean {
  if (user.role === 'admin') return true;
  
  // leader: 본인 BU 전체
  if (user.role === 'leader' && entry.bu_code === user.bu_code) return true;
  
  // manager/member는 본인 등록분 삭제 불가 (정책에 따라 조정 가능)
  // 현재 계획서에서는 member 삭제 X로 되어있음
  if (user.role === 'manager' && entry.created_by === user.id) return true;
  
  return false;
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
// UI 표시 권한
// ============================================

/**
 * 사이드바 메뉴 표시 권한
 */
export function getVisibleMenus(user: AppUser): string[] {
  const menus: string[] = ['dashboard', 'tasks']; // 기본 메뉴
  
  if (['admin', 'leader', 'manager'].includes(user.role)) {
    menus.push('projects', 'settlement');
  }
  
  if (['admin', 'leader'].includes(user.role)) {
    menus.push('organization');
  }
  
  // 모든 사용자가 본인 근무시간은 볼 수 있음
  menus.push('attendance');
  
  // admin과 leader는 전체 근무현황 (승인/반려를 위해)
  // leader는 본인 BU만 조회 가능하지만, 메뉴 자체는 접근 가능
  if (['admin', 'leader'].includes(user.role)) {
    menus.push('attendanceAdmin');
  }
  
  return menus;
}

/**
 * BU 탭 표시 권한 (전체 통계 등)
 */
export function canViewAllBuStats(user: AppUser): boolean {
  return user.role === 'admin';
}

/**
 * 특정 BU 통계 조회 권한
 */
export function canViewBuStats(user: AppUser, buCode: BuCode): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'leader' && user.bu_code === buCode) return true;
  return false;
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
  project: Project
) {
  return {
    canAccess: canAccessFinance(user, entry, project),
    canEdit: canEditFinance(user, entry, project),
    canDelete: canDeleteFinance(user, entry, project),
  };
}

/**
 * 권한 시스템 export
 */
export const Permissions = {
  project: {
    canAccess: canAccessProject,
    canViewBasicInfo: canViewProjectBasicInfo,
    canCreate: canCreateProject,
    canEdit: canEditProject,
    canDelete: canDeleteProject,
    getPermissions: getProjectPermissions,
  },
  task: {
    canAccess: canAccessTask,
    canCreate: canCreateTask,
    canEdit: canEditTask,
    canDelete: canDeleteTask,
    canOnlyUpdateStatus: canOnlyUpdateTaskStatus,
    getPermissions: getTaskPermissions,
  },
  finance: {
    canAccess: canAccessFinance,
    canCreate: canCreateFinance,
    canEdit: canEditFinance,
    canDelete: canDeleteFinance,
    canViewNetProfit: canViewNetProfit,
    getPermissions: getFinancePermissions,
  },
  attendance: {
    canAccess: canAccessAttendance,
    canEdit: canEditAttendance,
  },
  ui: {
    getVisibleMenus,
    canViewAllBuStats,
    canViewBuStats,
  },
};
