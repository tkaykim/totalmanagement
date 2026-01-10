import type { ActivityLog, DailyWorkLog, WorkLogFormData } from './types';

const API_BASE = '/api';

// 활동 로그 조회
export async function getActivityLogs(date?: string): Promise<ActivityLog[]> {
  const params = new URLSearchParams();
  if (date) {
    params.set('date', date);
  }
  
  const url = `${API_BASE}/activity-logs${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to get activity logs');
  }
  
  return res.json();
}

// 업무 일지 조회
export async function getWorkLog(date?: string): Promise<DailyWorkLog | null> {
  const params = new URLSearchParams();
  if (date) {
    params.set('date', date);
  }
  
  const url = `${API_BASE}/work-logs${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to get work log');
  }
  
  return res.json();
}

// 업무 일지 저장 (생성 또는 업데이트)
export async function saveWorkLog(data: WorkLogFormData): Promise<DailyWorkLog> {
  const res = await fetch(`${API_BASE}/work-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save work log');
  }
  
  return res.json();
}

// 업무 일지 업데이트
export async function updateWorkLog(id: number, data: WorkLogFormData): Promise<DailyWorkLog> {
  const res = await fetch(`${API_BASE}/work-logs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update work log');
  }
  
  return res.json();
}

// 업무 일지 삭제
export async function deleteWorkLog(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/work-logs/${id}`, {
    method: 'DELETE',
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete work log');
  }
}
