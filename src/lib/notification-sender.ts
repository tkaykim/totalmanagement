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
 * 할일 배정 알림
 */
export async function notifyTaskAssigned(
  assigneeId: string,
  taskTitle: string,
  projectName: string,
  taskId: string
) {
  return createNotification({
    userId: assigneeId,
    title: '새 할일이 배정되었습니다',
    message: `[${projectName}] ${taskTitle}`,
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
 * 프로젝트 PM 배정 알림
 */
export async function notifyProjectPMAssigned(
  pmId: string,
  projectName: string,
  projectId: string
) {
  return createNotification({
    userId: pmId,
    title: '프로젝트 PM으로 배정되었습니다',
    message: `"${projectName}" 프로젝트를 담당하게 되었습니다.`,
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
