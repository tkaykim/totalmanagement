import { createPureClient } from '@/lib/supabase/server';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

/**
 * HEAD 사업부의 admin 사용자들 ID 목록 조회
 */
async function getHeadAdminIds(): Promise<string[]> {
  try {
    const supabase = await createPureClient();
    const { data } = await supabase
      .from('app_users')
      .select('id')
      .eq('bu_code', 'HEAD')
      .eq('role', 'admin');
    
    return data?.map(u => u.id) || [];
  } catch {
    return [];
  }
}

/**
 * 모든 활성 사용자 ID 목록 조회
 */
async function getAllUserIds(): Promise<string[]> {
  try {
    const supabase = await createPureClient();
    const { data } = await supabase
      .from('app_users')
      .select('id');
    
    return data?.map(u => u.id) || [];
  } catch {
    return [];
  }
}

/**
 * 관리자(admin, leader) ID 목록 조회
 */
async function getManagerIds(): Promise<string[]> {
  try {
    const supabase = await createPureClient();
    const { data } = await supabase
      .from('app_users')
      .select('id')
      .in('role', ['admin', 'leader']);
    
    return data?.map(u => u.id) || [];
  } catch {
    return [];
  }
}

/**
 * 알림 생성 유틸리티 함수
 * 서버 사이드에서만 사용 가능
 */
export async function createNotification(data: NotificationData) {
  try {
    const supabase = await createPureClient();
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.userId,
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        entity_type: data.entityType,
        entity_id: data.entityId,
        action_url: data.actionUrl,
        read: false,
      });

    if (error) {
      console.error('Failed to create notification:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Create notification error:', error);
    return { success: false, error };
  }
}

/**
 * 여러 사용자에게 알림 전송
 */
export async function createNotificationForUsers(
  userIds: string[],
  notification: Omit<NotificationData, 'userId'>
) {
  const results = await Promise.all(
    userIds.map(userId =>
      createNotification({ ...notification, userId })
    )
  );
  
  return results;
}

// === 알림 타입별 헬퍼 함수 ===

/**
 * 할일 배정 알림 (누가 배정했는지 포함)
 */
export async function notifyTaskAssigned(
  assigneeId: string,
  taskTitle: string,
  projectName: string,
  taskId: string,
  assignerName?: string
) {
  const message = assignerName
    ? `${assignerName}님이 [${projectName}] "${taskTitle}" 할일을 배정했습니다.`
    : `[${projectName}] ${taskTitle}`;
  
  return createNotification({
    userId: assigneeId,
    title: '새 할일이 배정되었습니다',
    message,
    type: 'info',
    entityType: 'task',
    entityId: taskId,
    actionUrl: '/?view=tasks',
  });
}

/**
 * 할일 마감 임박 알림
 */
export async function notifyTaskDueSoon(
  assigneeId: string,
  taskTitle: string,
  dueDate: string,
  taskId: string
) {
  return createNotification({
    userId: assigneeId,
    title: '할일 마감이 임박했습니다',
    message: `"${taskTitle}" - 마감일: ${dueDate}`,
    type: 'warning',
    entityType: 'task',
    entityId: taskId,
    actionUrl: '/?view=tasks',
  });
}

/**
 * 프로젝트 PM 배정 알림 (누가 배정했는지 포함)
 */
export async function notifyProjectPMAssigned(
  pmId: string,
  projectName: string,
  projectId: string,
  assignerName?: string
) {
  const message = assignerName
    ? `${assignerName}님이 "${projectName}" 프로젝트의 PM으로 지정했습니다.`
    : `"${projectName}" 프로젝트를 담당하게 되었습니다.`;
  
  return createNotification({
    userId: pmId,
    title: '프로젝트 PM으로 배정되었습니다',
    message,
    type: 'info',
    entityType: 'project',
    entityId: projectId,
    actionUrl: '/?view=projects',
  });
}

/**
 * 프로젝트 참여자 추가 알림 (누가 추가했는지 포함)
 */
export async function notifyProjectParticipantAdded(
  participantId: string,
  projectName: string,
  projectId: string,
  adderName?: string
) {
  const message = adderName
    ? `${adderName}님이 "${projectName}" 프로젝트에 참여자로 추가했습니다.`
    : `"${projectName}" 프로젝트에 참여자로 추가되었습니다.`;
  
  return createNotification({
    userId: participantId,
    title: '프로젝트에 참여하게 되었습니다',
    message,
    type: 'info',
    entityType: 'project',
    entityId: projectId,
    actionUrl: '/?view=projects',
  });
}

/**
 * 강제 퇴근 알림
 */
export async function notifyAutoCheckout(
  userId: string,
  workDate: string,
  logId: string
) {
  return createNotification({
    userId,
    title: '시스템 강제 퇴근 처리',
    message: `${workDate} 출근 기록이 퇴근 미처리로 자동 퇴근 처리되었습니다. 확인해주세요.`,
    type: 'warning',
    entityType: 'attendance',
    entityId: logId,
    actionUrl: '/attendance',
  });
}

/**
 * 근무 신청 승인 알림
 */
export async function notifyWorkRequestApproved(
  requesterId: string,
  requestType: string,
  startDate: string,
  requestId: string
) {
  const typeLabel = {
    external_work: '외근',
    remote_work: '재택',
    overtime: '연장/야근',
    attendance_correction: '출퇴근 정정',
  }[requestType] || requestType;

  return createNotification({
    userId: requesterId,
    title: `${typeLabel} 신청이 승인되었습니다`,
    message: `${startDate} ${typeLabel} 신청이 승인되었습니다.`,
    type: 'success',
    entityType: 'work_request',
    entityId: requestId,
    actionUrl: '/attendance',
  });
}

/**
 * 근무 신청 거절 알림
 */
export async function notifyWorkRequestRejected(
  requesterId: string,
  requestType: string,
  startDate: string,
  requestId: string,
  rejectionReason?: string
) {
  const typeLabel = {
    external_work: '외근',
    remote_work: '재택',
    overtime: '연장/야근',
    attendance_correction: '출퇴근 정정',
  }[requestType] || requestType;

  return createNotification({
    userId: requesterId,
    title: `${typeLabel} 신청이 반려되었습니다`,
    message: rejectionReason 
      ? `${startDate} ${typeLabel} 신청이 반려되었습니다. 사유: ${rejectionReason}`
      : `${startDate} ${typeLabel} 신청이 반려되었습니다.`,
    type: 'error',
    entityType: 'work_request',
    entityId: requestId,
    actionUrl: '/attendance',
  });
}

/**
 * 휴가 신청 승인 알림
 */
export async function notifyLeaveRequestApproved(
  requesterId: string,
  leaveType: string,
  startDate: string,
  requestId: string
) {
  const typeLabel = {
    annual: '연차',
    half_am: '오전반차',
    half_pm: '오후반차',
    compensatory: '대체휴무',
    special: '특별휴가',
  }[leaveType] || leaveType;

  return createNotification({
    userId: requesterId,
    title: `${typeLabel} 신청이 승인되었습니다`,
    message: `${startDate} ${typeLabel} 신청이 승인되었습니다.`,
    type: 'success',
    entityType: 'leave',
    entityId: requestId,
    actionUrl: '/leave',
  });
}

/**
 * 휴가 신청 거절 알림
 */
export async function notifyLeaveRequestRejected(
  requesterId: string,
  leaveType: string,
  startDate: string,
  requestId: string,
  rejectionReason?: string
) {
  const typeLabel = {
    annual: '연차',
    half_am: '오전반차',
    half_pm: '오후반차',
    compensatory: '대체휴무',
    special: '특별휴가',
  }[leaveType] || leaveType;

  return createNotification({
    userId: requesterId,
    title: `${typeLabel} 신청이 반려되었습니다`,
    message: rejectionReason 
      ? `${startDate} ${typeLabel} 신청이 반려되었습니다. 사유: ${rejectionReason}`
      : `${startDate} ${typeLabel} 신청이 반려되었습니다.`,
    type: 'error',
    entityType: 'leave',
    entityId: requestId,
    actionUrl: '/leave',
  });
}

/**
 * 댓글 멘션 알림
 */
export async function notifyCommentMention(
  mentionedUserId: string,
  authorName: string,
  entityType: 'task' | 'project',
  entityTitle: string,
  commentId: string
) {
  return createNotification({
    userId: mentionedUserId,
    title: `${authorName}님이 회원님을 언급했습니다`,
    message: `[${entityTitle}]에서 회원님이 언급되었습니다.`,
    type: 'info',
    entityType: 'comment',
    entityId: commentId,
    actionUrl: entityType === 'task' ? '/?view=tasks' : '/?view=projects',
  });
}

/**
 * 프로젝트 댓글 알림 (PM, 참여자에게)
 */
export async function notifyProjectComment(
  targetUserIds: string[],
  authorName: string,
  projectName: string,
  commentId: string,
  excludeUserId?: string
) {
  const recipients = excludeUserId 
    ? targetUserIds.filter(id => id !== excludeUserId)
    : targetUserIds;

  if (recipients.length === 0) return { success: true };

  return createNotificationForUsers(recipients, {
    title: '프로젝트에 새 댓글',
    message: `${authorName}님이 "${projectName}" 프로젝트에 댓글을 남겼습니다.`,
    type: 'info',
    entityType: 'comment',
    entityId: commentId,
    actionUrl: '/?view=projects',
  });
}

/**
 * 할일 댓글 알림 (담당자에게)
 */
export async function notifyTaskComment(
  assigneeId: string,
  authorName: string,
  taskTitle: string,
  projectName: string,
  commentId: string
) {
  return createNotification({
    userId: assigneeId,
    title: '할일에 새 댓글',
    message: `${authorName}님이 [${projectName}] "${taskTitle}" 할일에 댓글을 남겼습니다.`,
    type: 'info',
    entityType: 'comment',
    entityId: commentId,
    actionUrl: '/?view=tasks',
  });
}

// === 휴가 관련 알림 ===

/**
 * 휴가 신청 시 관리자에게 알림
 */
export async function notifyLeaveRequestCreated(
  requesterName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  requestId: string
) {
  const typeLabel: Record<string, string> = {
    annual: '연차',
    half_am: '오전반차',
    half_pm: '오후반차',
    compensatory: '대체휴무',
    special: '특별휴가',
  };
  const label = typeLabel[leaveType] || leaveType;
  const dateRange = startDate === endDate ? startDate : `${startDate} ~ ${endDate}`;
  
  const managerIds = await getManagerIds();
  
  return createNotificationForUsers(managerIds, {
    title: '새로운 휴가 신청',
    message: `${requesterName}님이 ${label} 신청 (${dateRange})`,
    type: 'info',
    entityType: 'leave',
    entityId: requestId,
    actionUrl: '/leave/admin',
  });
}

// === 예약 시스템 알림 (모든 사용자에게) ===

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  meeting_room: '회의실',
  equipment: '장비',
  vehicle: '차량',
};

/**
 * 예약 생성 알림 (모든 사용자)
 */
export async function notifyReservationCreated(
  resourceType: string,
  resourceName: string,
  reserverName: string,
  startTime: string,
  endTime: string,
  reservationId: string,
  excludeUserId?: string
) {
  const label = RESOURCE_TYPE_LABELS[resourceType] || resourceType;
  const userIds = await getAllUserIds();
  const targetUsers = excludeUserId ? userIds.filter(id => id !== excludeUserId) : userIds;
  
  return createNotificationForUsers(targetUsers, {
    title: `${label} 예약`,
    message: `${reserverName}님이 ${resourceName} 예약 (${formatTimeRange(startTime, endTime)})`,
    type: 'info',
    entityType: 'reservation',
    entityId: reservationId,
    actionUrl: getReservationUrl(resourceType),
  });
}

/**
 * 예약 수정 알림 (모든 사용자)
 */
export async function notifyReservationUpdated(
  resourceType: string,
  resourceName: string,
  reserverName: string,
  startTime: string,
  endTime: string,
  reservationId: string,
  excludeUserId?: string
) {
  const label = RESOURCE_TYPE_LABELS[resourceType] || resourceType;
  const userIds = await getAllUserIds();
  const targetUsers = excludeUserId ? userIds.filter(id => id !== excludeUserId) : userIds;
  
  return createNotificationForUsers(targetUsers, {
    title: `${label} 예약 변경`,
    message: `${reserverName}님의 ${resourceName} 예약이 변경됨 (${formatTimeRange(startTime, endTime)})`,
    type: 'info',
    entityType: 'reservation',
    entityId: reservationId,
    actionUrl: getReservationUrl(resourceType),
  });
}

/**
 * 예약 취소 알림 (모든 사용자)
 */
export async function notifyReservationCancelled(
  resourceType: string,
  resourceName: string,
  reserverName: string,
  startTime: string,
  reservationId: string,
  excludeUserId?: string
) {
  const label = RESOURCE_TYPE_LABELS[resourceType] || resourceType;
  const userIds = await getAllUserIds();
  const targetUsers = excludeUserId ? userIds.filter(id => id !== excludeUserId) : userIds;
  
  return createNotificationForUsers(targetUsers, {
    title: `${label} 예약 취소`,
    message: `${reserverName}님의 ${resourceName} 예약이 취소됨`,
    type: 'warning',
    entityType: 'reservation',
    entityId: reservationId,
    actionUrl: getReservationUrl(resourceType),
  });
}

function formatTimeRange(startTime: string, endTime: string): string {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const dateStr = start.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    const startStr = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const endStr = end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${startStr}~${endStr}`;
  } catch {
    return `${startTime} ~ ${endTime}`;
  }
}

function getReservationUrl(resourceType: string): string {
  const urls: Record<string, string> = {
    meeting_room: '/reservations/meeting-rooms',
    equipment: '/reservations/equipment',
    vehicle: '/reservations/vehicles',
  };
  return urls[resourceType] || '/reservations';
}

// === HEAD-ADMIN 출퇴근 알림 ===

/**
 * 출근 알림 (HEAD-ADMIN에게)
 */
export async function notifyCheckInToHeadAdmin(
  userName: string,
  checkInTime: string,
  logId: string
) {
  const headAdminIds = await getHeadAdminIds();
  if (headAdminIds.length === 0) return { success: true };
  
  const timeStr = new Date(checkInTime).toLocaleTimeString('ko-KR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return createNotificationForUsers(headAdminIds, {
    title: '출근 알림',
    message: `${userName}님이 ${timeStr}에 출근했습니다.`,
    type: 'info',
    entityType: 'attendance',
    entityId: logId,
    actionUrl: '/attendance/admin',
  });
}

/**
 * 퇴근 알림 (HEAD-ADMIN에게)
 */
export async function notifyCheckOutToHeadAdmin(
  userName: string,
  checkOutTime: string,
  logId: string
) {
  const headAdminIds = await getHeadAdminIds();
  if (headAdminIds.length === 0) return { success: true };
  
  const timeStr = new Date(checkOutTime).toLocaleTimeString('ko-KR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return createNotificationForUsers(headAdminIds, {
    title: '퇴근 알림',
    message: `${userName}님이 ${timeStr}에 퇴근했습니다.`,
    type: 'info',
    entityType: 'attendance',
    entityId: logId,
    actionUrl: '/attendance/admin',
  });
}
