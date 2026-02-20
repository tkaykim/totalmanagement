import type {
  ArtistProfile,
  ArtistNotification,
  ArtistProjectsResponse,
  ArtistTasksResponse,
  ArtistSettlementsResponse,
} from './types';

const API_BASE = '/api/artist';

// 아티스트 프로필 조회
export async function fetchArtistProfile(): Promise<{ profile: ArtistProfile | null }> {
  const res = await fetch(`${API_BASE}/profile`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch profile' }));
    throw new Error(error.error || 'Failed to fetch artist profile');
  }
  return res.json();
}

// 아티스트 프로젝트 조회
export async function fetchArtistProjects(
  status?: string
): Promise<ArtistProjectsResponse> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  
  const url = `${API_BASE}/projects${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch projects' }));
    throw new Error(error.error || 'Failed to fetch artist projects');
  }
  
  return res.json();
}

// 아티스트 할일 조회
export async function fetchArtistTasks(params?: {
  status?: string;
  project_id?: number;
}): Promise<ArtistTasksResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.append('status', params.status);
  if (params?.project_id) searchParams.append('project_id', String(params.project_id));
  
  const url = `${API_BASE}/tasks${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch tasks' }));
    throw new Error(error.error || 'Failed to fetch artist tasks');
  }
  
  return res.json();
}

// 아티스트 할일 상태 업데이트
export async function updateArtistTaskStatus(
  taskId: number,
  status: 'todo' | 'in_progress' | 'done'
): Promise<any> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, status }),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to update task' }));
    throw new Error(error.error || 'Failed to update task status');
  }
  
  return res.json();
}

// 아티스트 알림 목록
export async function fetchArtistNotifications(params?: {
  unread_only?: boolean;
  limit?: number;
}): Promise<{ notifications: ArtistNotification[]; unread_count: number }> {
  const searchParams = new URLSearchParams();
  if (params?.unread_only) searchParams.set('unread_only', 'true');
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const url = `${API_BASE}/notifications${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch notifications' }));
    throw new Error(err.error || 'Failed to fetch notifications');
  }
  return res.json();
}

// 아티스트 알림 읽음 처리
export async function markArtistNotificationsRead(params: {
  ids?: number[];
  mark_all?: boolean;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/notifications`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to mark read' }));
    throw new Error(err.error || 'Failed to mark notifications read');
  }
}

// 아티스트 제안 수락/거절
export async function submitArtistProposal(params: {
  project_id: number;
  response: 'accept' | 'reject' | 'pending';
  message?: string;
}): Promise<{ success: boolean; artist_response: string }> {
  const res = await fetch('/api/artist/proposals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to submit proposal' }));
    throw new Error(error.error || 'Failed to submit proposal');
  }

  return res.json();
}

// 아티스트 정산 내역 조회
export async function fetchArtistSettlements(params?: {
  start_date?: string;
  end_date?: string;
  status?: string;
}): Promise<ArtistSettlementsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.start_date) searchParams.append('start_date', params.start_date);
  if (params?.end_date) searchParams.append('end_date', params.end_date);
  if (params?.status) searchParams.append('status', params.status);
  
  const url = `${API_BASE}/settlements${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch settlements' }));
    throw new Error(error.error || 'Failed to fetch artist settlements');
  }
  
  return res.json();
}
