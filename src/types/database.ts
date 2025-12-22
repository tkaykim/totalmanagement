export type BU = 'GRIGO' | 'REACT' | 'FLOW' | 'AST' | 'MODOO' | 'HEAD';
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
export type CreatorType = 'creator' | 'celebrity' | 'influencer';
export type CreatorStatus = 'active' | 'inactive' | 'archived';
export type AdStatus = 'active' | 'paused' | 'completed' | 'none';
export type ExternalWorkerType = 'freelancer' | 'company' | 'contractor';
export type ArtistStatus = 'Active' | 'Inactive' | 'Archived';
export type ArtistType = 'individual' | 'team';

export interface BusinessUnit {
  id: number;
  code: BU;
  name: string;
  english_label: string;
  created_at: string;
}

export interface ProjectCreator {
  creator_id: number;
  creator_name: string;
  role: string; // 'main', 'guest', 'support', etc
  fee_amount?: number;
  contract_date?: string;
  shoot_date?: string;
  upload_date?: string;
  payment_status?: 'pending' | 'paid' | 'cancelled';
  payment_date?: string;
  notes?: string;
}

export interface ProjectFreelancer {
  freelancer_id: number; // org_members.id
  freelancer_name: string;
  role: string; // 'director', 'editor', 'cameraman', etc
  rate_type?: 'hourly' | 'daily' | 'project' | 'fixed';
  rate_amount?: number;
  hours_worked?: number;
  days_worked?: number;
  total_amount?: number;
  payment_status?: 'pending' | 'paid' | 'cancelled';
  payment_date?: string;
  notes?: string;
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
  artist_id?: number;
  pm_name?: string;
  creators?: ProjectCreator[]; // JSONB
  freelancers?: ProjectFreelancer[]; // JSONB
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

export interface ClientCompany {
  id: number;
  bu_code: BU;
  company_name_en: string | null;
  company_name_ko: string | null;
  industry?: string | null;
  business_registration_number?: string | null;
  representative_name?: string | null;
  status: ClientStatus;
  last_meeting_date?: string | null;
  business_registration_file?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientWorker {
  id: number;
  client_company_id: number | null;
  name_en: string | null;
  name_ko: string | null;
  phone?: string | null;
  email?: string | null;
  business_card_file?: string | null;
  created_at: string;
  updated_at: string;
}

// 하위 호환성을 위한 타입 별칭 (기존 코드 호환)
export type Client = ClientCompany;

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
  production_company?: string;
  ad_status?: AdStatus;
  manager_id?: string;
  manager_name?: string;
  next_upload_date?: string;
  recent_video?: string;
  upload_days?: string[];
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

export interface Creator {
  id: number;
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
  status: CreatorStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalWorker {
  id: number;
  bu_code: BU;
  name: string;
  company_name?: string;
  worker_type: ExternalWorkerType;
  phone?: string;
  email?: string;
  specialties?: string[];
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Artist {
  id: number;
  bu_code: BU;
  name: string;
  type: ArtistType;
  team_id?: number;
  nationality?: string;
  visa_type?: string;
  contract_start: string;
  contract_end: string;
  visa_start?: string;
  visa_end?: string;
  role?: string;
  status: ArtistStatus;
  created_at: string;
  updated_at: string;
}

