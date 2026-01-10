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

export interface ActivityLog {
  id: number;
  user_id: string;
  action_type: ActivityActionType;
  entity_type: ActivityEntityType;
  entity_id: string;
  entity_title: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

export interface DailyWorkLog {
  id: number;
  user_id: string;
  log_date: string;
  summary: string | null;
  notes: string | null;
  tomorrow_plan: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkLogFormData {
  log_date?: string;
  summary?: string;
  notes?: string;
  tomorrow_plan?: string;
}

// 활동 로그 UI용 매핑
export const ACTION_TYPE_LABELS: Record<ActivityActionType, string> = {
  project_created: '프로젝트 생성',
  project_updated: '프로젝트 수정',
  project_status_changed: '프로젝트 상태 변경',
  task_created: '할일 생성',
  task_assigned: '할일 할당됨',
  task_status_changed: '할일 상태 변경',
  task_completed: '할일 완료',
  financial_created: '재무 항목 등록',
  financial_updated: '재무 항목 수정',
  check_in: '출근',
  check_out: '퇴근',
};

export const ACTION_TYPE_ICONS: Record<ActivityActionType, string> = {
  project_created: '📁',
  project_updated: '📝',
  project_status_changed: '🔄',
  task_created: '✅',
  task_assigned: '👤',
  task_status_changed: '🔄',
  task_completed: '✅',
  financial_created: '💰',
  financial_updated: '💰',
  check_in: '📍',
  check_out: '📍',
};
