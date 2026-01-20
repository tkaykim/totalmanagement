import type { ApprovalStatus, BU } from '@/types/database';

// Leave Types
export type LeaveType = 'annual' | 'compensatory' | 'special';
export type LeaveRequestType = 'annual' | 'half_am' | 'half_pm' | 'compensatory' | 'special';
export type LeaveGrantType = 'auto_monthly' | 'auto_yearly' | 'manual' | 'compensatory_approved';

export { ApprovalStatus };

// Leave Balance
export interface LeaveBalance {
  id: number;
  user_id: string;
  leave_type: LeaveType;
  total_days: number;
  used_days: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalanceSummary {
  annual: {
    total: number;
    used: number;
    remaining: number;
  };
  compensatory: {
    total: number;
    used: number;
    remaining: number;
  };
  special: {
    total: number;
    used: number;
    remaining: number;
  };
}

// Leave Grant
export interface LeaveGrant {
  id: number;
  user_id: string;
  leave_type: LeaveType;
  days: number;
  grant_type: LeaveGrantType;
  reason?: string | null;
  granted_by?: string | null;
  year: number;
  granted_at: string;
  created_at: string;
}

export interface LeaveGrantWithUser extends LeaveGrant {
  granter?: {
    id: string;
    name: string;
  } | null;
}

// Leave Request
export interface LeaveRequest {
  id: string;
  requester_id: string;
  leave_type: LeaveRequestType;
  start_date: string;
  end_date: string;
  days_used: number;
  reason: string;
  status: ApprovalStatus;
  approver_id?: string | null;
  rejection_reason?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestWithUser extends LeaveRequest {
  requester?: {
    id: string;
    name: string;
    bu_code?: BU | null;
    position?: string | null;
  } | null;
  approver?: {
    id: string;
    name: string;
  } | null;
}

// Compensatory Request (대체휴무 생성 신청)
export interface CompensatoryRequest {
  id: string;
  requester_id: string;
  days: number;
  reason: string;
  work_date?: string | null;
  status: ApprovalStatus;
  approver_id?: string | null;
  rejection_reason?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompensatoryRequestWithUser extends CompensatoryRequest {
  requester?: {
    id: string;
    name: string;
    bu_code?: BU | null;
  } | null;
  approver?: {
    id: string;
    name: string;
  } | null;
}

// Form Data Types
export interface LeaveRequestFormData {
  leave_type: LeaveRequestType;
  start_date: string;
  end_date: string;
  reason: string;
}

export interface CompensatoryRequestFormData {
  days: number;
  reason: string;
  work_date?: string;
}

export interface LeaveGrantFormData {
  user_id: string;
  leave_type: LeaveType;
  days: number;
  reason: string;
}

// Calendar View
export interface LeaveCalendarDay {
  date: string;
  isToday: boolean;
  isWeekend: boolean;
  leaves: Array<{
    id: string;
    requester_name: string;
    leave_type: LeaveRequestType;
    status: ApprovalStatus;
  }>;
}

// Utility Types
export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: '연차',
  compensatory: '대체휴무',
  special: '특별휴가',
};

export const LEAVE_REQUEST_TYPE_LABELS: Record<LeaveRequestType, string> = {
  annual: '연차',
  half_am: '오전반차',
  half_pm: '오후반차',
  compensatory: '대체휴무',
  special: '특별휴가',
};

export const LEAVE_GRANT_TYPE_LABELS: Record<LeaveGrantType, string> = {
  auto_monthly: '월별 자동 부여',
  auto_yearly: '연간 자동 부여',
  manual: '관리자 수동 부여',
  compensatory_approved: '대체휴무 승인',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '반려',
};

export function getLeaveTypeFromRequestType(requestType: LeaveRequestType): LeaveType {
  if (requestType === 'half_am' || requestType === 'half_pm' || requestType === 'annual') {
    return 'annual';
  }
  return requestType as LeaveType;
}

export function getDaysUsed(leaveType: LeaveRequestType, startDate: string, endDate: string): number {
  if (leaveType === 'half_am' || leaveType === 'half_pm') {
    return 0.5;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  let days = 0;
  
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days += 1;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}
