import type {
  LeaveBalance,
  LeaveBalanceSummary,
  LeaveGrant,
  LeaveGrantWithUser,
  LeaveRequest,
  LeaveRequestWithUser,
  CompensatoryRequest,
  CompensatoryRequestWithUser,
  LeaveRequestFormData,
  CompensatoryRequestFormData,
  LeaveGrantFormData,
  ApprovalStatus,
} from './types';

const API_BASE = '/api/leave';

// ============================================
// Leave Balances
// ============================================

export async function getLeaveBalances(params?: {
  user_id?: string;
  year?: number;
}): Promise<LeaveBalance[]> {
  const searchParams = new URLSearchParams();
  if (params?.user_id) searchParams.append('user_id', params.user_id);
  if (params?.year) searchParams.append('year', String(params.year));

  const url = `${API_BASE}/balances${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '휴가 잔여일수 조회에 실패했습니다.');
  }
  return res.json();
}

export async function getLeaveBalanceSummary(params?: {
  user_id?: string;
  year?: number;
}): Promise<LeaveBalanceSummary> {
  const searchParams = new URLSearchParams();
  if (params?.user_id) searchParams.append('user_id', params.user_id);
  if (params?.year) searchParams.append('year', String(params.year));
  searchParams.append('summary', 'true');

  const url = `${API_BASE}/balances${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '휴가 잔여일수 조회에 실패했습니다.');
  }
  return res.json();
}

// ============================================
// Leave Requests
// ============================================

export async function createLeaveRequest(data: LeaveRequestFormData): Promise<LeaveRequest> {
  const res = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '휴가 신청에 실패했습니다.');
  }
  return res.json();
}

export async function getLeaveRequests(params?: {
  requester_id?: string;
  status?: ApprovalStatus;
  year?: number;
  month?: number;
}): Promise<LeaveRequestWithUser[]> {
  const searchParams = new URLSearchParams();
  if (params?.requester_id) searchParams.append('requester_id', params.requester_id);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.year) searchParams.append('year', String(params.year));
  if (params?.month) searchParams.append('month', String(params.month));

  const url = `${API_BASE}/requests${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '휴가 신청 목록 조회에 실패했습니다.');
  }
  return res.json();
}

export async function getLeaveRequest(id: string): Promise<LeaveRequestWithUser> {
  const res = await fetch(`${API_BASE}/requests/${id}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '휴가 신청 조회에 실패했습니다.');
  }
  return res.json();
}

export async function cancelLeaveRequest(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/requests/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '휴가 신청 취소에 실패했습니다.');
  }
}

export async function approveLeaveRequest(id: string): Promise<LeaveRequest> {
  const res = await fetch(`${API_BASE}/requests/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '휴가 승인에 실패했습니다.');
  }
  return res.json();
}

export async function rejectLeaveRequest(
  id: string,
  rejectionReason: string
): Promise<LeaveRequest> {
  const res = await fetch(`${API_BASE}/requests/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rejection_reason: rejectionReason }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '휴가 반려에 실패했습니다.');
  }
  return res.json();
}

// ============================================
// Compensatory Requests (대체휴무 생성 신청)
// ============================================

export async function createCompensatoryRequest(
  data: CompensatoryRequestFormData
): Promise<CompensatoryRequest> {
  const res = await fetch(`${API_BASE}/compensatory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '대체휴무 생성 신청에 실패했습니다.');
  }
  return res.json();
}

export async function getCompensatoryRequests(params?: {
  requester_id?: string;
  status?: ApprovalStatus;
}): Promise<CompensatoryRequestWithUser[]> {
  const searchParams = new URLSearchParams();
  if (params?.requester_id) searchParams.append('requester_id', params.requester_id);
  if (params?.status) searchParams.append('status', params.status);

  const url = `${API_BASE}/compensatory${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '대체휴무 신청 목록 조회에 실패했습니다.');
  }
  return res.json();
}

export async function approveCompensatoryRequest(id: string): Promise<CompensatoryRequest> {
  const res = await fetch(`${API_BASE}/compensatory/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '대체휴무 승인에 실패했습니다.');
  }
  return res.json();
}

export async function rejectCompensatoryRequest(
  id: string,
  rejectionReason: string
): Promise<CompensatoryRequest> {
  const res = await fetch(`${API_BASE}/compensatory/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rejection_reason: rejectionReason }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '대체휴무 반려에 실패했습니다.');
  }
  return res.json();
}

// ============================================
// Leave Grants (관리자용)
// ============================================

export async function getLeaveGrants(params?: {
  user_id?: string;
  year?: number;
}): Promise<LeaveGrantWithUser[]> {
  const searchParams = new URLSearchParams();
  if (params?.user_id) searchParams.append('user_id', params.user_id);
  if (params?.year) searchParams.append('year', String(params.year));

  const url = `${API_BASE}/grants${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '휴가 부여 이력 조회에 실패했습니다.');
  }
  return res.json();
}

export async function createLeaveGrant(data: LeaveGrantFormData): Promise<LeaveGrant> {
  const res = await fetch(`${API_BASE}/grants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '휴가 부여에 실패했습니다.');
  }
  return res.json();
}

// ============================================
// Pending Approval Queue
// ============================================

export interface PendingApprovalItem {
  id: string;
  type: 'leave' | 'compensatory';
  requester_id: string;
  requester_name: string;
  requester_bu_code?: string | null;
  request_type: string;
  start_date?: string;
  end_date?: string;
  days: number;
  reason: string;
  created_at: string;
}

export async function getPendingApprovals(): Promise<PendingApprovalItem[]> {
  const res = await fetch(`${API_BASE}/pending`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '승인 대기 목록 조회에 실패했습니다.');
  }
  return res.json();
}

// ============================================
// Team Leave Stats (관리자용)
// ============================================

export interface TeamLeaveStats {
  user_id: string;
  user_name: string;
  bu_code: string | null;
  position: string | null;
  hire_date: string | null;
  annual_total: number;
  annual_used: number;
  annual_remaining: number;
  compensatory_total: number;
  compensatory_used: number;
  compensatory_remaining: number;
  special_total: number;
  special_used: number;
  special_remaining: number;
  total_generated?: number;
  total_remaining?: number;
  grant_regular?: number;
  grant_reward?: number;
  grant_other?: number;
  usage_annual?: number;
  usage_monthly?: number;
  usage_compensatory?: number;
  usage_special?: number;
}

export async function getTeamLeaveStats(params?: {
  bu_code?: string;
  year?: number;
}): Promise<TeamLeaveStats[]> {
  const searchParams = new URLSearchParams();
  if (params?.bu_code) searchParams.append('bu_code', params.bu_code);
  if (params?.year) searchParams.append('year', String(params.year));

  const url = `${API_BASE}/team-stats${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '팀 휴가 현황 조회에 실패했습니다.');
  }
  return res.json();
}
