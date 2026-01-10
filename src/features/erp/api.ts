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
// Creators API Functions (uses unified-partners)
// ============================================

export async function fetchCreators(bu?: BU): Promise<Creator[]> {
  const params = new URLSearchParams();
  params.append('category', 'creator');
  if (bu) params.append('bu', bu);
  const url = `${API_BASE}/unified-partners?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch creators');
  const data = await res.json();
  // Map to legacy Creator format for compatibility
  return (data.partners || []).map((p: any) => ({
    id: p.id,
    bu_code: p.owner_bu_code,
    name: p.display_name,
    type: p.metadata?.creator_type || 'influencer',
    platform: p.metadata?.platform,
    subscribers_count: p.metadata?.subscribers_count,
    engagement_rate: p.metadata?.engagement_rate,
    contact_person: p.metadata?.contact_person,
    phone: p.phone,
    email: p.email,
    agency: p.metadata?.agency,
    fee_range: p.metadata?.fee_range,
    specialties: p.metadata?.specialties || [],
    status: p.metadata?.status || 'active',
    notes: p.notes,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
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
  const res = await fetch(`${API_BASE}/unified-partners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entity_type: 'person',
      display_name: data.name,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
      owner_bu_code: data.bu_code,
      category_ids: [], // Will need to look up 'creator' category
      metadata: {
        creator_type: data.type,
        platform: data.platform,
        channel_id: data.channel_id,
        subscribers_count: data.subscribers_count,
        engagement_rate: data.engagement_rate,
        contact_person: data.contact_person,
        agency: data.agency,
        fee_range: data.fee_range,
        specialties: data.specialties,
        status: data.status,
      },
    }),
  });
  if (!res.ok) throw new Error('Failed to create creator');
  const partner = await res.json();
  return {
    id: partner.id,
    bu_code: partner.owner_bu_code,
    name: partner.display_name,
    type: data.type,
    platform: data.platform,
    subscribers_count: data.subscribers_count,
    engagement_rate: data.engagement_rate,
    contact_person: data.contact_person,
    phone: data.phone,
    email: data.email,
    agency: data.agency,
    fee_range: data.fee_range,
    specialties: data.specialties || [],
    status: data.status || 'active',
    notes: data.notes,
    created_at: partner.created_at,
    updated_at: partner.updated_at,
  } as Creator;
}

export async function updateCreator(id: number, data: Partial<Creator>): Promise<Creator> {
  const res = await fetch(`${API_BASE}/unified-partners/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      display_name: data.name,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
      metadata: {
        creator_type: data.type,
        platform: data.platform,
        subscribers_count: data.subscribers_count,
        engagement_rate: data.engagement_rate,
        contact_person: data.contact_person,
        agency: data.agency,
        fee_range: data.fee_range,
        specialties: data.specialties,
        status: data.status,
      },
    }),
  });
  if (!res.ok) throw new Error('Failed to update creator');
  return res.json();
}

export async function deleteCreator(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/unified-partners/${id}`, {
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

export async function fetchPartners(bu?: BU): Promise<{ id: number; display_name: string; entity_type: string }[]> {
  const params = new URLSearchParams();
  if (bu) params.append('bu', bu);
  const url = `${API_BASE}/unified-partners?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch partners');
  const data = await res.json();
  return (data.partners || []).map((p: any) => ({
    id: p.id,
    display_name: p.display_name,
    entity_type: p.entity_type,
  }));
}

export async function fetchPartnerCompanies(bu?: BU): Promise<any[]> {
  const params = new URLSearchParams();
  params.append('entity_type', 'organization');
  if (bu) params.append('bu', bu);
  const url = `${API_BASE}/unified-partners?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch partner companies');
  const data = await res.json();
  // Map to legacy format for compatibility
  return (data.partners || []).map((p: any) => ({
    id: p.id,
    company_name_ko: p.display_name,
    company_name_en: p.name_en || p.display_name,
    phone: p.phone,
    email: p.email,
    address: p.address,
    notes: p.notes,
    bu_code: p.owner_bu_code,
  }));
}

export async function fetchPartnerWorkers(bu?: BU): Promise<any[]> {
  const params = new URLSearchParams();
  params.append('entity_type', 'person');
  if (bu) params.append('bu', bu);
  const url = `${API_BASE}/unified-partners?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch partner workers');
  const data = await res.json();
  // Map to legacy format for compatibility
  return (data.partners || []).map((p: any) => ({
    id: p.id,
    name_ko: p.display_name,
    name_en: p.name_en || p.display_name,
    phone: p.phone,
    email: p.email,
    bu_code: p.owner_bu_code,
    partner_company_id: p.affiliations?.[0]?.partner_id || null,
  }));
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
// Artists API Functions (uses unified-partners)
// ============================================

export async function fetchArtists(bu?: BU): Promise<Artist[]> {
  const params = new URLSearchParams();
  params.append('category', 'artist');
  if (bu) params.append('bu', bu);
  const url = `${API_BASE}/unified-partners?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch artists');
  const data = await res.json();
  // Map to legacy Artist format for compatibility
  return (data.partners || []).map((p: any) => ({
    id: p.id,
    bu_code: p.owner_bu_code,
    name: p.display_name,
    name_ko: p.display_name,
    name_en: p.name_en,
    type: p.metadata?.artist_type || 'solo',
    nationality: p.nationality,
    visa_type: p.metadata?.visa_type,
    contract_start: p.metadata?.contract_start,
    contract_end: p.metadata?.contract_end,
    visa_start: p.metadata?.visa_start,
    visa_end: p.metadata?.visa_end,
    role: p.metadata?.role,
    status: p.metadata?.status || 'active',
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
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
  const res = await fetch(`${API_BASE}/unified-partners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entity_type: 'person',
      display_name: data.name,
      nationality: data.nationality,
      owner_bu_code: data.bu_code,
      category_ids: [], // Will need to look up 'artist' category
      metadata: {
        artist_type: data.type,
        visa_type: data.visa_type,
        contract_start: data.contract_start,
        contract_end: data.contract_end,
        visa_start: data.visa_start,
        visa_end: data.visa_end,
        role: data.role,
        status: data.status,
      },
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to create artist');
  }
  const partner = await res.json();
  return {
    id: partner.id,
    bu_code: partner.owner_bu_code,
    name: partner.display_name,
    type: data.type || 'solo',
    nationality: data.nationality,
    visa_type: data.visa_type,
    contract_start: data.contract_start,
    contract_end: data.contract_end,
    visa_start: data.visa_start,
    visa_end: data.visa_end,
    role: data.role,
    status: data.status || 'active',
    created_at: partner.created_at,
    updated_at: partner.updated_at,
  } as Artist;
}

export async function updateArtist(id: number, data: Partial<Artist>): Promise<Artist> {
  const res = await fetch(`${API_BASE}/unified-partners/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      display_name: data.name,
      nationality: data.nationality,
      metadata: {
        artist_type: data.type,
        visa_type: data.visa_type,
        contract_start: data.contract_start,
        contract_end: data.contract_end,
        visa_start: data.visa_start,
        visa_end: data.visa_end,
        role: data.role,
        status: data.status,
      },
    }),
  });
  if (!res.ok) throw new Error('Failed to update artist');
  return res.json();
}

export async function deleteArtist(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/unified-partners/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete artist');
}

// ============================================
// Dancers API Functions (uses unified-partners)
// ============================================

export async function fetchDancers(
  bu?: BU,
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<{ data: Dancer[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const params = new URLSearchParams();
  params.append('category', 'dancer');
  if (bu) params.append('bu', bu);
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (search && search.trim()) {
    params.append('search', search.trim());
  }
  
  const url = `${API_BASE}/unified-partners?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch dancers');
  const data = await res.json();
  // Map to legacy Dancer format for compatibility
  const dancers = (data.partners || []).map((p: any) => ({
    id: p.id,
    bu_code: p.owner_bu_code,
    name: p.display_name,
    nickname_ko: p.nickname_ko,
    nickname_en: p.nickname_en,
    real_name: p.real_name,
    photo: p.profile_image,
    team_name: p.metadata?.team_name,
    company: p.metadata?.company,
    nationality: p.nationality,
    gender: p.metadata?.gender,
    contact: p.phone,
    bank_copy: p.metadata?.bank_copy,
    bank_name: p.metadata?.bank_name,
    account_number: p.metadata?.account_number,
    id_document_type: p.metadata?.id_document_type,
    id_document_file: p.metadata?.id_document_file,
    note: p.notes,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
  return {
    data: dancers,
    pagination: data.pagination || { page, limit, total: dancers.length, totalPages: 1 },
  };
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
  const res = await fetch(`${API_BASE}/unified-partners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entity_type: 'person',
      display_name: data.name,
      nickname_ko: data.nickname_ko,
      nickname_en: data.nickname_en,
      real_name: data.real_name,
      profile_image: data.photo,
      phone: data.contact,
      nationality: data.nationality,
      notes: data.note,
      owner_bu_code: data.bu_code,
      category_ids: [], // Will need to look up 'dancer' category
      metadata: {
        team_name: data.team_name,
        company: data.company,
        gender: data.gender,
        bank_copy: data.bank_copy,
        bank_name: data.bank_name,
        account_number: data.account_number,
        id_document_type: data.id_document_type,
        id_document_file: data.id_document_file,
      },
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to create dancer');
  }
  const partner = await res.json();
  return {
    id: partner.id,
    bu_code: partner.owner_bu_code,
    name: partner.display_name,
    nickname_ko: data.nickname_ko,
    nickname_en: data.nickname_en,
    real_name: data.real_name,
    photo: data.photo,
    team_name: data.team_name,
    company: data.company,
    nationality: data.nationality,
    gender: data.gender,
    contact: data.contact,
    bank_copy: data.bank_copy,
    bank_name: data.bank_name,
    account_number: data.account_number,
    id_document_type: data.id_document_type,
    id_document_file: data.id_document_file,
    note: data.note,
    created_at: partner.created_at,
    updated_at: partner.updated_at,
  } as Dancer;
}

export async function updateDancer(id: number, data: Partial<Dancer>): Promise<Dancer> {
  const res = await fetch(`${API_BASE}/unified-partners/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      display_name: data.name,
      nickname_ko: data.nickname_ko,
      nickname_en: data.nickname_en,
      real_name: data.real_name,
      profile_image: data.photo,
      phone: data.contact,
      nationality: data.nationality,
      notes: data.note,
      metadata: {
        team_name: data.team_name,
        company: data.company,
        gender: data.gender,
        bank_copy: data.bank_copy,
        bank_name: data.bank_name,
        account_number: data.account_number,
        id_document_type: data.id_document_type,
        id_document_file: data.id_document_file,
      },
    }),
  });
  if (!res.ok) throw new Error('Failed to update dancer');
  return res.json();
}

export async function deleteDancer(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/unified-partners/${id}`, {
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



