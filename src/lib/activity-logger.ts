import { createPureClient } from '@/lib/supabase/server';

export type ActivityActionType =
  | 'project_created'
  | 'project_updated'
  | 'project_status_changed'
  | 'task_created'
  | 'task_assigned'
  | 'task_status_changed'
  | 'task_completed'
  | 'financial_created'
  | 'financial_updated'
  | 'check_in'
  | 'check_out';

export type ActivityEntityType =
  | 'project'
  | 'task'
  | 'financial_entry'
  | 'attendance';

export interface ActivityLogParams {
  userId: string;
  actionType: ActivityActionType;
  entityType: ActivityEntityType;
  entityId: string;
  entityTitle?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 활동 로그를 생성합니다.
 * 이 함수는 프로젝트, 할일, 재무, 근태 등의 생성/수정 시 호출됩니다.
 */
export async function createActivityLog(params: ActivityLogParams): Promise<void> {
  try {
    const supabase = await createPureClient();
    
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: params.userId,
        action_type: params.actionType,
        entity_type: params.entityType,
        entity_id: params.entityId,
        entity_title: params.entityTitle || null,
        metadata: params.metadata || {},
        occurred_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to create activity log:', error);
    }
  } catch (error) {
    // 활동 로그 실패가 메인 작업을 방해하지 않도록 에러를 로깅만 합니다.
    console.error('Activity log error:', error);
  }
}

/**
 * 할일 담당자에게 할당 알림용 활동 로그를 생성합니다.
 */
export async function createTaskAssignedLog(
  assigneeId: string,
  taskId: string,
  taskTitle: string,
  assignedBy: string
): Promise<void> {
  await createActivityLog({
    userId: assigneeId,
    actionType: 'task_assigned',
    entityType: 'task',
    entityId: taskId,
    entityTitle: taskTitle,
    metadata: { assigned_by: assignedBy },
  });
}

/**
 * 프로젝트 상태 변경 활동 로그를 생성합니다.
 */
export async function createProjectStatusChangeLog(
  userId: string,
  projectId: string,
  projectName: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  await createActivityLog({
    userId,
    actionType: 'project_status_changed',
    entityType: 'project',
    entityId: projectId,
    entityTitle: projectName,
    metadata: { old_status: oldStatus, new_status: newStatus },
  });
}

/**
 * 할일 상태 변경 활동 로그를 생성합니다.
 */
export async function createTaskStatusChangeLog(
  userId: string,
  taskId: string,
  taskTitle: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  const actionType = newStatus === 'done' ? 'task_completed' : 'task_status_changed';
  
  await createActivityLog({
    userId,
    actionType,
    entityType: 'task',
    entityId: taskId,
    entityTitle: taskTitle,
    metadata: { old_status: oldStatus, new_status: newStatus },
  });
}
