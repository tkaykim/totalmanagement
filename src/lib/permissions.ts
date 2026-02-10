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
 * - PM이 지정되지 않은 프로젝트는 leader/admin만 접근 가능
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
  
  // PM이 지정되지 않은 프로젝트는 manager/member가 접근 불가
  // (단, 본인이 참여자로 지정된 경우는 예외)
  const hasPm = !!project.pm_id;
  const isParticipant = project.participants?.includes(user.id);
  
  // manager: 본인 PM + 참여자 (PM 없으면 참여자인 경우만)
  if (user.role === 'manager') {
    if (project.pm_id === user.id) return true;
    if (isParticipant) return true;
    // PM이 있는 경우에만 본인 BU 프로젝트 접근 가능
    if (hasPm && project.bu_code === user.bu_code) return true;
  }
  
  // member: 본인 PM + 참여자 (bu_code 관계없이)
  if (user.role === 'member') {
    if (project.pm_id === user.id) return true;
    if (isParticipant) return true;
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
  return ['admin', 'leader', 'manager', 'member'].includes(user.role);
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
  
  // manager: PM이거나 참여자이면 프로젝트의 모든 할일 접근 가능
  if (user.role === 'manager') {
    if (project.pm_id === user.id) return true;
    if (project.participants?.includes(user.id)) return true;
    if (task.assignee_id === user.id) return true;
  }
  
  // member: PM이거나 참여자이면 프로젝트의 모든 할일 접근 가능
  if (user.role === 'member') {
    if (project.pm_id === user.id) return true;
    if (project.participants?.includes(user.id)) return true;
    if (task.assignee_id === user.id) return true;
  }
  
  // viewer/artist: 본인 할당만
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
  
  // manager: 본인 PM 프로젝트 또는 참여자
  if (user.role === 'manager') {
    if (project.pm_id === user.id) return true;
    if (project.participants?.includes(user.id)) return true;
  }
  
  // member: 본인 PM 프로젝트 또는 참여자
  if (user.role === 'member') {
    if (project.pm_id === user.id) return true;
    if (project.participants?.includes(user.id)) return true;
  }
  
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
  
  // manager: PM이면 전체, 참여자 또는 본인 할당도 가능
  if (user.role === 'manager') {
    if (project.pm_id === user.id) return true;
    if (project.participants?.includes(user.id)) return true;
    if (task.assignee_id === user.id) return true;
  }
  
  // member: PM이면 전체, 아니면 본인 할당만
  if (user.role === 'member') {
    if (project.pm_id === user.id) return true;
    if (task.assignee_id === user.id) return true;
  }
  
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
  
  // manager: 본인 PM 또는 참여자
  if (user.role === 'manager') {
    if (project.pm_id === user.id) return true;
    if (project.participants?.includes(user.id)) return true;
  }
  
  // member: 본인 PM 또는 참여자
  if (user.role === 'member') {
    if (project.pm_id === user.id) return true;
    if (project.participants?.includes(user.id)) return true;
  }
  
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
 * PM인 경우 계정 ROLE과 관계없이 해당 프로젝트의 매출/지출(순익) 조회 가능
 */
export function canViewNetProfit(user: AppUser, project: Project): boolean {
  if (user.role === 'admin') return true;
  if (project.pm_id === user.id) return true;
  if (user.role === 'leader' && project.bu_code === user.bu_code) return true;
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
 * 
 * 그룹 순서:
 * 1. 일상 업무: dashboard, tasks, workLog
 * 2. 근태/휴가: attendance, leave
 * 3. 프로젝트 운영: projects, settlement
 * 4. 지식 관리: manuals, taskTemplates
 * 5. 조직/인력: organization, partners, exclusiveArtists
 * 6. 예약/자원: meetingRooms, equipment, vehicles
 * 7. 관리자 전용: attendanceAdmin, leaveAdmin, bugReports, pushTest
 */
export function getVisibleMenus(user: AppUser): string[] {
  const menus: string[] = [];

  // ── 그룹 1: 일상 업무 (모든 사용자) ──
  menus.push('dashboard');
  menus.push('tasks');
  menus.push('workLog');

  // ── 그룹 2: 근태/휴가 (모든 사용자) ──
  menus.push('attendance');
  menus.push('leave');

  // ── 그룹 3: 프로젝트 운영 ──
  // 프로젝트 관리: admin, leader, manager, member
  if (['admin', 'leader', 'manager', 'member'].includes(user.role)) {
    menus.push('projects');
  }
  // 정산 관리: HEAD의 admin, leader만
  if ((user.role === 'admin' || user.role === 'leader') && user.bu_code === 'HEAD') {
    menus.push('settlement');
  }

  // ── 그룹 4: 지식 관리 ──
  // 매뉴얼: 모든 사용자 (열람)
  menus.push('manuals');
  // 할일 템플릿: admin, leader, manager
  if (['admin', 'leader', 'manager'].includes(user.role)) {
    menus.push('taskTemplates');
  }

  // ── 그룹 5: 조직/인력 ──
  // 조직 현황: admin, leader
  if (['admin', 'leader'].includes(user.role)) {
    menus.push('organization');
  }
  // 파트너 관리: admin, leader, manager (독립 권한)
  if (['admin', 'leader', 'manager'].includes(user.role)) {
    menus.push('partners');
  }
  // 전속 아티스트: GRIGO/HEAD의 admin, leader, manager
  if (canAccessExclusiveArtists(user)) {
    menus.push('exclusiveArtists');
  }

  // ── 그룹 6: 예약/자원 (artist 제외) ──
  if (user.role !== 'artist') {
    menus.push('meetingRooms');
    menus.push('equipment');
    menus.push('vehicles');
  }

  // ── 그룹 7: 기타/관리자 ──
  // 버그 리포트: 모든 사용자
  menus.push('bugReports');
  // 전체 근무현황 / 휴가 승인: admin, leader
  if (['admin', 'leader'].includes(user.role)) {
    menus.push('attendanceAdmin');
    menus.push('leaveAdmin');
  }
  // 업무일지 관리: admin만
  if (user.role === 'admin') {
    menus.push('workLogAdmin');
  }
  // 푸시 알림 테스트: admin만
  if (user.role === 'admin') {
    menus.push('pushTest');
  }

  return menus;
}

/**
 * 정산 관리 접근 권한 체크
 * - bu_code가 HEAD이면서 leader 또는 admin인 경우만 접근 가능
 */
export function canAccessSettlement(user: AppUser): boolean {
  return (user.role === 'admin' || user.role === 'leader') && user.bu_code === 'HEAD';
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
 * 대체휴무 생성 승인 권한
 * - HEAD의 admin만 가능
 */
export function canApproveCompensatoryRequest(user: AppUser): boolean {
  return user.role === 'admin' && user.bu_code === 'HEAD';
}

/**
 * 특별휴가 부여 권한
 * - HEAD의 admin만 가능
 */
export function canGrantSpecialLeave(user: AppUser): boolean {
  return user.role === 'admin' && user.bu_code === 'HEAD';
}

/**
 * 연차 수동 조정 권한
 * - HEAD의 admin만 가능
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
// 아티스트 페이지 권한
// ============================================

/**
 * /artist 페이지 접근 권한 체크
 * - role이 artist인 경우
 * - role이 leader 또는 admin이면서 bu_code가 HEAD인 경우
 */
export function canAccessArtistPage(user: AppUser): boolean {
  // role이 artist인 경우 접근 가능
  if (user.role === 'artist') return true;
  
  // role이 leader 또는 admin이면서 bu_code가 HEAD인 경우 접근 가능
  if ((user.role === 'leader' || user.role === 'admin') && user.bu_code === 'HEAD') {
    return true;
  }
  
  return false;
}

// ============================================
// 전속 아티스트 관리 권한
// ============================================

/**
 * 전속 아티스트 관리 페이지 접근 권한 체크
 * - GRIGO 또는 HEAD 사업부 소속만 접근 가능
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
 * artist role 사용자가 루트 페이지(/)에 접근할 수 있는지 체크
 * - artist role은 루트 페이지 접근 불가, /artist로 리다이렉션 필요
 */
export function shouldRedirectArtistToArtistPage(user: AppUser): boolean {
  return user.role === 'artist';
}

// ============================================
// Manuals (SOP) 권한
// ============================================

/**
 * Manuals 조회 권한 - 모든 사용자가 모든 사업부의 매뉴얼 조회 가능
 */
export function canAccessManual(user: AppUser): boolean {
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
export function canAccessTaskTemplate(user: AppUser): boolean {
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
