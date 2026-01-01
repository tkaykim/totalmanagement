import type {
  Project,
  ProjectTask,
  FinancialEntry,
  OrgUnit,
  BU,
  FinancialKind,
  TaskStatus,
  Client,
  ClientCompany,
  ClientWorker,
  Equipment,
  Channel,
  ChannelContent,
  Event,
  Manual,
  TaskPriority,
  EquipmentStatus,
  ChannelStatus,
  ContentStage,
  EventType,
  ClientStatus,
  Creator,
  CreatorType,
  CreatorStatus,
  ExternalWorker,
  ExternalWorkerType,
  Artist,
  ArtistStatus,
  ArtistType,
  Dancer,
  Comment,
  CommentEntityType,
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
  start_date?: string | null;
  end_date?: string | null;
  participants?: Array<{ user_id?: string; external_worker_id?: number; role?: string; is_pm?: boolean }>;
  created_by?: string;
  client_id?: number;
  artist_id?: number;
}): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    // 서버에서 전달한 에러 메시지를 그대로 노출해 디버깅 및 UX 개선
    let message = 'Failed to create project';
    try {
      const errorBody = await res.json();
      if (errorBody?.error) {
        message = errorBody.error;
      }
    } catch {
      // JSON 파싱 실패 시 기본 메시지 유지
    }
    throw new Error(message);
  }
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

export async function deleteTask(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete task');
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

export async function deleteFinancialEntry(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/financial-entries/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete financial entry');
}

export async function fetchOrgMembers(): Promise<(OrgUnit & { members: any[] })[]> {
  const res = await fetch(`${API_BASE}/org-members`);
  if (!res.ok) throw new Error('Failed to fetch org members');
  return res.json();
}

export async function createOrgMember(data: {
  org_unit_id?: number;
  name: string;
  title?: string;
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
    org_unit_id?: number;
    name: string;
    title?: string;
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

// ============================================
// ReactStudio & Multi-BU API Functions
// ============================================

// Client Companies
export async function fetchClients(bu?: BU): Promise<ClientCompany[]> {
  const url = bu ? `${API_BASE}/clients?bu=${bu}` : `${API_BASE}/clients`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch clients');
  return res.json();
}

export async function createClient(data: {
  bu_code: BU;
  company_name_en: string;
  company_name_ko: string;
  industry?: string;
  business_registration_number?: string;
  representative_name?: string;
  status?: ClientStatus;
  last_meeting_date?: string;
  business_registration_file?: string;
}): Promise<ClientCompany> {
  const res = await fetch(`${API_BASE}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create client');
  return res.json();
}

export async function updateClient(id: number, data: Partial<ClientCompany>): Promise<ClientCompany> {
  const res = await fetch(`${API_BASE}/clients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update client');
  return res.json();
}

export async function deleteClient(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/clients/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete client');
}

// Client Workers
export async function fetchClientWorkers(clientCompanyId?: number): Promise<ClientWorker[]> {
  const url = clientCompanyId
    ? `${API_BASE}/client-workers?client_company_id=${clientCompanyId}`
    : `${API_BASE}/client-workers`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch client workers');
  return res.json();
}

export async function createClientWorker(data: {
  client_company_id: number;
  name_en: string;
  name_ko: string;
  phone?: string;
  email?: string;
  business_card_file?: string;
}): Promise<ClientWorker> {
  const res = await fetch(`${API_BASE}/client-workers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create client worker');
  return res.json();
}

export async function updateClientWorker(id: number, data: Partial<ClientWorker>): Promise<ClientWorker> {
  const res = await fetch(`${API_BASE}/client-workers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update client worker');
  return res.json();
}

export async function deleteClientWorker(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/client-workers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete client worker');
}

// Equipment
export async function fetchEquipment(bu?: BU): Promise<Equipment[]> {
  const url = bu ? `${API_BASE}/equipment?bu=${bu}` : `${API_BASE}/equipment`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch equipment');
  return res.json();
}

export async function createEquipment(data: {
  bu_code: BU;
  name: string;
  category: string;
  serial_number?: string;
  status?: EquipmentStatus;
  location?: string;
  borrower_id?: string;
  borrower_name?: string;
  return_date?: string;
  notes?: string;
}): Promise<Equipment> {
  const res = await fetch(`${API_BASE}/equipment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create equipment');
  return res.json();
}

export async function updateEquipment(id: number, data: Partial<Equipment>): Promise<Equipment> {
  const res = await fetch(`${API_BASE}/equipment/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update equipment');
  return res.json();
}

export async function deleteEquipment(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/equipment/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete equipment');
}

// Channels
export async function fetchChannels(bu?: BU): Promise<Channel[]> {
  const url = bu ? `${API_BASE}/channels?bu=${bu}` : `${API_BASE}/channels`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch channels');
  return res.json();
}

export async function createChannel(data: {
  bu_code: BU;
  name: string;
  url?: string;
  subscribers_count?: string;
  total_views?: string;
  status?: ChannelStatus;
  production_company?: string;
  ad_status?: string;
  manager_id?: string;
  manager_name?: string;
  next_upload_date?: string;
  recent_video?: string;
}): Promise<Channel> {
  const res = await fetch(`${API_BASE}/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create channel');
  return res.json();
}

export async function updateChannel(id: number, data: Partial<Channel>): Promise<Channel> {
  const res = await fetch(`${API_BASE}/channels/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update channel');
  return res.json();
}

export async function deleteChannel(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/channels/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete channel');
}

// Channel Contents
export async function fetchChannelContents(channelId?: number): Promise<ChannelContent[]> {
  const url = channelId
    ? `${API_BASE}/channel-contents?channel_id=${channelId}`
    : `${API_BASE}/channel-contents`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch channel contents');
  return res.json();
}

export async function createChannelContent(data: {
  channel_id: number;
  title: string;
  stage?: ContentStage;
  assignee_id?: string;
  assignee_name?: string;
  upload_date: string;
}): Promise<ChannelContent> {
  const res = await fetch(`${API_BASE}/channel-contents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create channel content');
  return res.json();
}

export async function updateChannelContent(
  id: number,
  data: Partial<ChannelContent>
): Promise<ChannelContent> {
  const res = await fetch(`${API_BASE}/channel-contents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update channel content');
  return res.json();
}

export async function deleteChannelContent(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/channel-contents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete channel content');
}

// Events
export async function fetchEvents(bu?: BU, startDate?: string, endDate?: string): Promise<Event[]> {
  const params = new URLSearchParams();
  if (bu) params.append('bu', bu);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const url = `${API_BASE}/events${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function createEvent(data: {
  bu_code: BU;
  title: string;
  event_date: string;
  event_type?: EventType;
  description?: string;
  project_id?: number;
  created_by?: string;
}): Promise<Event> {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create event');
  return res.json();
}

export async function updateEvent(id: number, data: Partial<Event>): Promise<Event> {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update event');
  return res.json();
}

export async function deleteEvent(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete event');
}

// Manuals
export async function fetchManuals(bu?: BU, category?: string): Promise<Manual[]> {
  const params = new URLSearchParams();
  if (bu) params.append('bu', bu);
  if (category) params.append('category', category);
  const url = `${API_BASE}/manuals${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch manuals');
  return res.json();
}

export async function createManual(data: {
  bu_code: BU;
  title: string;
  category: string;
  content: any;
  author_id?: string;
  author_name?: string;
}): Promise<Manual> {
  const res = await fetch(`${API_BASE}/manuals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create manual');
  return res.json();
}

export async function updateManual(id: number, data: Partial<Manual>): Promise<Manual> {
  const res = await fetch(`${API_BASE}/manuals/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update manual');
  return res.json();
}

export async function deleteManual(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/manuals/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete manual');
}

// ============================================
// Creators API Functions
// ============================================

export async function fetchCreators(bu?: BU): Promise<Creator[]> {
  const url = bu ? `${API_BASE}/creators?bu=${bu}` : `${API_BASE}/creators`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch creators');
  return res.json();
}

export async function createCreator(data: {
  bu_code: BU;
  name: string;
  type: CreatorType;
  platform?: string;
  channel_id?: number;
  subscribers_count?: string;
  engagement_rate?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  agency?: string;
  fee_range?: string;
  specialties?: string[];
  status?: CreatorStatus;
  notes?: string;
  created_by?: string;
}): Promise<Creator> {
  const res = await fetch(`${API_BASE}/creators`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create creator');
  return res.json();
}

export async function updateCreator(id: number, data: Partial<Creator>): Promise<Creator> {
  const res = await fetch(`${API_BASE}/creators/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update creator');
  return res.json();
}

export async function deleteCreator(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/creators/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete creator');
}

// ============================================
// External Workers API Functions
// ============================================

export async function fetchExternalWorkers(bu?: BU): Promise<ExternalWorker[]> {
  const url = bu ? `${API_BASE}/external-workers?bu=${bu}` : `${API_BASE}/external-workers`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch external workers');
  return res.json();
}

export async function createExternalWorker(data: {
  bu_code: BU;
  name: string;
  company_name?: string;
  worker_type?: ExternalWorkerType;
  phone?: string;
  email?: string;
  specialties?: string[];
  notes?: string;
  is_active?: boolean;
}): Promise<ExternalWorker> {
  const res = await fetch(`${API_BASE}/external-workers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create external worker');
  return res.json();
}

export async function updateExternalWorker(
  id: number,
  data: Partial<ExternalWorker>
): Promise<ExternalWorker> {
  const res = await fetch(`${API_BASE}/external-workers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update external worker');
  return res.json();
}

export async function deleteExternalWorker(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/external-workers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete external worker');
}

// ============================================
// Artists API Functions
// ============================================

export async function fetchArtists(bu?: BU): Promise<Artist[]> {
  const url = bu ? `${API_BASE}/artists?bu=${bu}` : `${API_BASE}/artists`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch artists');
  return res.json();
}

export async function createArtist(data: {
  bu_code: BU;
  name: string;
  type?: ArtistType;
  team_id?: number;
  nationality?: string;
  visa_type?: string;
  contract_start: string;
  contract_end: string;
  visa_start?: string;
  visa_end?: string;
  role?: string;
  status?: ArtistStatus;
}): Promise<Artist> {
  const res = await fetch(`${API_BASE}/artists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to create artist');
  }
  return res.json();
}

export async function updateArtist(id: number, data: Partial<Artist>): Promise<Artist> {
  const res = await fetch(`${API_BASE}/artists/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update artist');
  return res.json();
}

export async function deleteArtist(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/artists/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete artist');
}

// ============================================
// Dancers API Functions
// ============================================

export async function fetchDancers(bu?: BU): Promise<Dancer[]> {
  const url = bu ? `${API_BASE}/dancers?bu=${bu}` : `${API_BASE}/dancers`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch dancers');
  return res.json();
}

export async function createDancer(data: {
  bu_code: BU;
  name: string;
  nickname_ko?: string;
  nickname_en?: string;
  real_name?: string;
  photo?: string;
  team_name?: string;
  company?: string;
  nationality?: string;
  gender?: 'male' | 'female';
  contact?: string;
  bank_copy?: string;
  bank_name?: string;
  account_number?: string;
  id_document_type?: 'passport' | 'resident_registration' | 'alien_registration';
  id_document_file?: string;
  note?: string;
}): Promise<Dancer> {
  const res = await fetch(`${API_BASE}/dancers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to create dancer');
  }
  return res.json();
}

export async function updateDancer(id: number, data: Partial<Dancer>): Promise<Dancer> {
  const res = await fetch(`${API_BASE}/dancers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update dancer');
  return res.json();
}

export async function deleteDancer(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/dancers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete dancer');
}

// ============================================
// Comments API Functions
// ============================================

export async function fetchComments(
  entityType: CommentEntityType,
  entityId: number
): Promise<Comment[]> {
  const params = new URLSearchParams();
  params.append('entity_type', entityType);
  params.append('entity_id', String(entityId));
  const url = `${API_BASE}/comments?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
}

export async function createComment(data: {
  entity_type: CommentEntityType;
  entity_id: number;
  content: string;
  mentioned_user_ids?: string[];
}): Promise<Comment> {
  const res = await fetch(`${API_BASE}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create comment');
  }
  return res.json();
}

export async function updateComment(
  id: number,
  data: { content?: string; mentioned_user_ids?: string[] }
): Promise<Comment> {
  const res = await fetch(`${API_BASE}/comments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update comment');
  }
  return res.json();
}

export async function deleteComment(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/comments/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete comment');
  }
}

export async function fetchMentionedComments(): Promise<(Comment & { is_read: boolean; read_at: string | null })[]> {
  const res = await fetch(`${API_BASE}/comments/mentions`);
  if (!res.ok) throw new Error('Failed to fetch mentioned comments');
  return res.json();
}

export async function markCommentAsRead(commentId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/comments/${commentId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to mark comment as read');
  }
  return res.json();
}

export async function fetchCommentReads(commentId: number): Promise<any[]> {
  const res = await fetch(`${API_BASE}/comments/${commentId}/reads`);
  if (!res.ok) throw new Error('Failed to fetch comment reads');
  return res.json();
}

// ============================================
// My Works API Functions
// ============================================

export async function fetchMyWorks(): Promise<{
  projects: Project[];
  tasks: ProjectTask[];
  user: any;
}> {
  const res = await fetch(`${API_BASE}/my-works`);
  if (!res.ok) throw new Error('Failed to fetch my works');
  return res.json();
}

export async function fetchMyArtistProfile(): Promise<{
  artist: Artist;
  projects: Project[];
  financialSummary: {
    totalRevenue: number;
    totalExpense: number;
    totalProfit: number;
    byProject: Array<{
      projectId: number;
      projectName: string;
      revenue: number;
      expense: number;
      profit: number;
    }>;
  };
  financialEntries: FinancialEntry[];
}> {
  const res = await fetch(`${API_BASE}/grigoent/my-profile`);
  if (!res.ok) throw new Error('Failed to fetch artist profile');
  return res.json();
}


