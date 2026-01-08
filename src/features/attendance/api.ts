import type {
  AttendanceLog,
  WorkRequest,
  AttendanceType,
  ApprovalStatus,
  WorkRequestType,
} from '@/types/database';
import type {
  AttendanceStatus,
  WorkTimeStats,
  MonthlyStats,
  WorkRequestFormData,
  CorrectionRequestFormData,
  ApprovalQueueItem,
} from './types';

const API_BASE = '/api/attendance';

export async function checkIn(): Promise<AttendanceLog> {
  const res = await fetch(`${API_BASE}/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to check in');
  }
  return res.json();
}

export async function checkOut(): Promise<AttendanceLog> {
  const res = await fetch(`${API_BASE}/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to check out');
  }
  return res.json();
}

export async function getAttendanceStatus(): Promise<AttendanceStatus> {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get attendance status');
  }
  return res.json();
}

export async function getAttendanceLogs(params?: {
  user_id?: string;
  start_date?: string;
  end_date?: string;
}): Promise<AttendanceLog[]> {
  const searchParams = new URLSearchParams();
  if (params?.user_id) searchParams.append('user_id', params.user_id);
  if (params?.start_date) searchParams.append('start_date', params.start_date);
  if (params?.end_date) searchParams.append('end_date', params.end_date);
  
  const url = `${API_BASE}/logs${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get attendance logs');
  }
  return res.json();
}

export async function getAttendanceStats(params?: {
  user_id?: string;
  year?: number;
  month?: number;
}): Promise<MonthlyStats> {
  const searchParams = new URLSearchParams();
  if (params?.user_id) searchParams.append('user_id', params.user_id);
  if (params?.year) searchParams.append('year', String(params.year));
  if (params?.month) searchParams.append('month', String(params.month));
  
  const url = `${API_BASE}/stats${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get attendance stats');
  }
  return res.json();
}

export async function createWorkRequest(data: WorkRequestFormData): Promise<WorkRequest> {
  const res = await fetch(`${API_BASE}/work-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create work request');
  }
  return res.json();
}

export async function createCorrectionRequest(
  data: CorrectionRequestFormData
): Promise<WorkRequest> {
  const { correction_type, work_date, check_in_time, check_out_time, reason } = data;
  
  const requestData: WorkRequestFormData = {
    request_type: 'attendance_correction',
    start_date: work_date,
    end_date: work_date,
    start_time: check_in_time,
    end_time: check_out_time,
    reason,
  };

  return createWorkRequest(requestData);
}

export async function getWorkRequests(params?: {
  requester_id?: string;
  status?: ApprovalStatus;
}): Promise<WorkRequest[]> {
  const searchParams = new URLSearchParams();
  if (params?.requester_id) searchParams.append('requester_id', params.requester_id);
  if (params?.status) searchParams.append('status', params.status);
  
  const url = `${API_BASE}/work-requests${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get work requests');
  }
  return res.json();
}

export async function getWorkRequest(id: string): Promise<WorkRequest> {
  const res = await fetch(`${API_BASE}/work-requests/${id}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get work request');
  }
  return res.json();
}

export async function approveWorkRequest(id: string): Promise<WorkRequest> {
  const res = await fetch(`${API_BASE}/work-requests/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to approve work request');
  }
  return res.json();
}

export async function rejectWorkRequest(
  id: string,
  rejection_reason: string
): Promise<WorkRequest> {
  const res = await fetch(`${API_BASE}/work-requests/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rejection_reason }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to reject work request');
  }
  return res.json();
}

export async function getApprovalQueue(): Promise<ApprovalQueueItem[]> {
  const res = await fetch(`${API_BASE}/work-requests?status=pending`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get approval queue');
  }
  
  const requests = await res.json();
  
  return requests.map((req: any) => ({
    id: req.id,
    requester_name: req.requester?.name || 'Unknown',
    requester_id: req.requester_id,
    request_type: req.request_type,
    start_date: req.start_date,
    end_date: req.end_date,
    start_time: req.start_time,
    end_time: req.end_time,
    reason: req.reason,
    status: req.status,
    created_at: req.created_at,
  }));
}

