import type { AttendanceType, ApprovalStatus, WorkRequestType, BU } from '@/types/database';

export type { AttendanceType, ApprovalStatus, WorkRequestType };

export interface PendingAutoCheckoutRecord {
  id: string;
  work_date: string;
  check_in_at: string;
  check_out_at: string;
}

export interface AttendanceStatus {
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  workDate: string;
  status: AttendanceType;
  workTimeMinutes?: number;
  pendingAutoCheckouts?: PendingAutoCheckoutRecord[];
}

export interface WorkTimeStats {
  date: string;
  workTimeMinutes: number;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status: AttendanceType;
  isLate: boolean;
  isEarlyLeave: boolean;
}

export interface MonthlyStats {
  year: number;
  month: number;
  totalWorkDays: number;
  totalWorkMinutes: number;
  averageWorkMinutes: number;
  lateCount: number;
  earlyLeaveCount: number;
  absentCount: number;
  vacationCount: number;
  remoteCount: number;
  externalCount: number;
}

export interface WorkRequestFormData {
  request_type: WorkRequestType;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  reason: string;
}

export interface CorrectionRequestFormData {
  correction_type: 'missing_check_in' | 'missing_check_out' | 'time_change';
  work_date: string;
  check_in_time?: string;
  check_out_time?: string;
  reason: string;
}

export interface ApprovalQueueItem {
  id: string;
  requester_name: string;
  requester_id: string;
  request_type: WorkRequestType;
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  reason: string;
  status: ApprovalStatus;
  created_at: string;
}

export interface AttendanceCalendarDay {
  date: string;
  status: AttendanceType;
  workTimeMinutes?: number;
  isToday: boolean;
  isWeekend: boolean;
}

