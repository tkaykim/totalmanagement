import type {
  Project,
  ProjectTask,
  FinancialEntry,
  OrgUnit,
  BU,
  FinancialKind,
  TaskStatus,
} from '@/types/database';

const API_BASE = '/api';

export async function fetchProjects(bu?: BU): Promise<Project[]> {
  const url = bu ? `${API_BASE}/projects?bu=${bu}` : `${API_BASE}/projects`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function createProject(data: {
  bu_code: BU;
  name: string;
  category: string;
  status?: string;
  start_date: string;
  end_date: string;
  created_by?: string;
}): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function updateProject(id: number, data: Partial<Project>): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

export async function deleteProject(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete project');
}

export async function fetchTasks(bu?: BU, projectId?: number): Promise<ProjectTask[]> {
  const params = new URLSearchParams();
  if (bu) params.append('bu', bu);
  if (projectId) params.append('project_id', String(projectId));
  const url = `${API_BASE}/tasks${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function createTask(data: {
  project_id: number;
  bu_code: BU;
  title: string;
  assignee?: string;
  assignee_id?: string;
  due_date: string;
  status?: TaskStatus;
  created_by?: string;
}): Promise<ProjectTask> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function updateTask(id: number, data: Partial<ProjectTask>): Promise<ProjectTask> {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

export async function fetchFinancialEntries(params?: {
  bu?: BU;
  projectId?: number;
  kind?: FinancialKind;
  startDate?: string;
  endDate?: string;
}): Promise<FinancialEntry[]> {
  const searchParams = new URLSearchParams();
  if (params?.bu) searchParams.append('bu', params.bu);
  if (params?.projectId) searchParams.append('project_id', String(params.projectId));
  if (params?.kind) searchParams.append('kind', params.kind);
  if (params?.startDate) searchParams.append('start_date', params.startDate);
  if (params?.endDate) searchParams.append('end_date', params.endDate);
  const url = `${API_BASE}/financial-entries${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch financial entries');
  return res.json();
}

export async function createFinancialEntry(data: {
  project_id: number;
  bu_code: BU;
  kind: FinancialKind;
  category: string;
  name: string;
  amount: number;
  occurred_at: string;
  status?: string;
  memo?: string;
  created_by?: string;
}): Promise<FinancialEntry> {
  const res = await fetch(`${API_BASE}/financial-entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create financial entry');
  return res.json();
}

export async function updateFinancialEntry(
  id: number,
  data: Partial<FinancialEntry>,
): Promise<FinancialEntry> {
  const res = await fetch(`${API_BASE}/financial-entries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update financial entry');
  return res.json();
}

export async function fetchOrgMembers(): Promise<(OrgUnit & { members: any[] })[]> {
  const res = await fetch(`${API_BASE}/org-members`);
  if (!res.ok) throw new Error('Failed to fetch org members');
  return res.json();
}

export async function createOrgMember(data: {
  org_unit_id: number;
  name: string;
  title: string;
  bu_code?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
  is_leader?: boolean;
  user_id?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/org-members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create org member');
  return res.json();
}

export async function updateOrgMember(
  id: number,
  data: Partial<{
    org_unit_id: number;
    name: string;
    title: string;
    bu_code?: string;
    phone?: string;
    email?: string;
    is_active?: boolean;
    is_leader?: boolean;
    user_id?: string;
  }>
): Promise<any> {
  const res = await fetch(`${API_BASE}/org-members/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update org member');
  return res.json();
}

export async function deleteOrgMember(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/org-members/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete org member');
}

export async function fetchBusinessUnits(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/business-units`);
  if (!res.ok) throw new Error('Failed to fetch business units');
  return res.json();
}

export async function fetchUsers(): Promise<{ users: any[]; currentUser: any }> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: string;
  bu_code?: string;
  position?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create user');
  }
  return res.json();
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string;
    email?: string;
    role?: string;
    bu_code?: string;
    position?: string;
  }>
): Promise<any> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update user');
  }
  return res.json();
}


