export type BU = 'GRIGO' | 'REACT' | 'FLOW' | 'AST' | 'MODOO';
export type ProjectStatus = '준비중' | '진행중' | '운영중' | '기획중' | '완료';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type FinancialKind = 'revenue' | 'expense';
export type FinancialStatus = 'planned' | 'paid' | 'canceled';
export type ERPRole = 'admin' | 'manager' | 'member' | 'viewer';
export type TaskPriority = 'high' | 'medium' | 'low';
export type EquipmentStatus = 'available' | 'rented' | 'maintenance' | 'lost';
export type ChannelStatus = 'active' | 'growing' | 'inactive' | 'archived';
export type ContentStage = 'planning' | 'shooting' | 'editing' | 'uploaded';
export type EventType = 'meeting' | 'shoot' | 'deadline' | 'holiday' | 'event';
export type ClientStatus = 'active' | 'inactive' | 'archived';

export interface BusinessUnit {
  id: number;
  code: BU;
  name: string;
  english_label: string;
  created_at: string;
}

export interface Project {
  id: number;
  bu_code: BU;
  name: string;
  category: string;
  status: ProjectStatus;
  start_date: string;
  end_date: string;
  client_id?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: number;
  project_id: number;
  bu_code: BU;
  title: string;
  assignee_id?: string;
  assignee?: string;
  due_date: string;
  status: TaskStatus;
  priority?: TaskPriority;
  tag?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialEntry {
  id: number;
  project_id: number;
  bu_code: BU;
  kind: FinancialKind;
  category: string;
  name: string;
  amount: number;
  occurred_at: string;
  status: FinancialStatus;
  memo?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface OrgUnit {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface OrgMember {
  id: number;
  org_unit_id?: number;
  name: string;
  title?: string;
  user_id?: string;
  is_leader: boolean;
  bu_code?: BU;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
}

export interface AppUser {
  id: string;
  name: string;
  email?: string;
  role: ERPRole;
  bu_code?: BU;
  position?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: number;
  bu_code: BU;
  name: string;
  industry?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: ClientStatus;
  last_meeting_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: number;
  bu_code: BU;
  name: string;
  category: string;
  serial_number?: string;
  status: EquipmentStatus;
  location?: string;
  borrower_id?: string;
  borrower_name?: string;
  return_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: number;
  bu_code: BU;
  name: string;
  url?: string;
  subscribers_count?: string;
  total_views?: string;
  status: ChannelStatus;
  manager_id?: string;
  manager_name?: string;
  next_upload_date?: string;
  recent_video?: string;
  created_at: string;
  updated_at: string;
}

export interface ChannelContent {
  id: number;
  channel_id: number;
  title: string;
  stage: ContentStage;
  assignee_id?: string;
  assignee_name?: string;
  upload_date: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  bu_code: BU;
  title: string;
  event_date: string;
  event_type: EventType;
  description?: string;
  project_id?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Manual {
  id: number;
  bu_code: BU;
  title: string;
  category: string;
  content: any; // JSONB
  author_id?: string;
  author_name?: string;
  created_at: string;
  updated_at: string;
}

