export type BU = 'GRIGO' | 'REACT' | 'FLOW' | 'AST' | 'MODOO' | 'HEAD';
export type ProjectStatus = '준비중' | '진행중' | '운영중' | '기획중' | '완료';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type FinancialKind = 'revenue' | 'expense';
export type FinancialStatus = 'planned' | 'paid' | 'canceled';
export type PaymentMethod = 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment';
export type ERPRole = 'admin' | 'manager' | 'member' | 'viewer' | 'artist';
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
export type PartnerType = 'client' | 'vendor' | 'contractor';
export type PartnerWorkerType = 'employee' | 'freelancer' | 'contractor';
export type ArtistStatus = 'Active' | 'Inactive' | 'Archived';
export type ArtistType = 'individual' | 'team';
export type ProjectStep = 'plan' | 'script' | 'shoot' | 'edit';
export type AssetStatus = 'completed' | 'in-progress' | 'pending' | 'none';

export interface ProjectAsset {
  status: AssetStatus;
  version?: string;
  link?: string;
}

export interface ProjectAssets {
  script?: ProjectAsset;
  video?: ProjectAsset;
  thumbnail?: ProjectAsset;
}

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

export interface ProjectParticipant {
  user_id?: string;
  external_worker_id?: number; // 하위 호환성 유지
  partner_worker_id?: number; // 파트너 인력 ID
  partner_company_id?: number; // 파트너 회사 ID (새로 추가)
  dancer_id?: number;
  role: string;
  is_pm: boolean;
}

export interface Project {
  id: number;
  bu_code: BU;
  name: string;
  category: string;
  description?: string | null; // 프로젝트 설명 (nullable)
  status: ProjectStatus;
  start_date: string;
  end_date: string;
  client_id?: number;
  channel_id?: number | null; // 연결된 채널 ID (nullable, 선택사항)
  artist_id?: number;
  pm_id?: string | null; // 단일 PM ID (하위 호환성)
  pm_name?: string; // 하위 호환성을 위해 유지 (deprecated)
  pm_ids?: string[]; // PM 사용자 ID 배열 (JSONB, app_users.id 참조, 다수 가능)
  creators?: ProjectCreator[]; // JSONB
  freelancers?: ProjectFreelancer[]; // JSONB
  active_steps?: ProjectStep[]; // JSONB: 활성화된 단계 배열
  plan_date?: string | null; // 기획 확정일 (D-11)
  script_date?: string | null; // 대본 확정일 (D-9)
  shoot_date?: string | null; // 촬영 확정일 (D-7)
  edit1_date?: string | null; // 1차 편집 확정일 (D-3)
  edit_final_date?: string | null; // 최종 편집 확정일 (D-1)
  release_date?: string | null; // 업로드/납품일 (D-Day)
  assets?: ProjectAssets; // JSONB: 제작 자산 정보
  participants?: ProjectParticipant[]; // 프로젝트 참여자 목록
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
  partner_company_id?: number | null;
  partner_worker_id?: number | null;
  payment_method?: PaymentMethod | null;
  actual_amount?: number | null;
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
  artist_id?: number;
  created_at: string;
  updated_at: string;
}

export interface PartnerCompany {
  id: number;
  bu_code: BU;
  company_name_en: string | null;
  company_name_ko: string | null;
  industry?: string | null;
  business_registration_number?: string | null;
  representative_name?: string | null;
  partner_type: PartnerType;
  status: ClientStatus;
  last_meeting_date?: string | null;
  business_registration_file?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerWorker {
  id: number;
  partner_company_id: number | null;
  bu_code: BU;
  name_en?: string | null;
  name_ko?: string | null;
  name?: string | null;
  worker_type: PartnerWorkerType;
  phone?: string | null;
  email?: string | null;
  specialties?: string[];
  notes?: string | null;
  business_card_file?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 하위 호환성을 위한 타입 별칭 (기존 코드 호환)
export interface ClientCompany extends Omit<PartnerCompany, 'partner_type'> {
  partner_type?: never; // 타입 안전성을 위해 제거
}
export interface ClientWorker extends Omit<PartnerWorker, 'partner_company_id' | 'bu_code' | 'worker_type' | 'name' | 'specialties' | 'is_active'> {
  client_company_id: number | null;
  partner_company_id?: never;
  bu_code?: never;
  worker_type?: never;
  name?: never;
  specialties?: never;
  is_active?: never;
}
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

export interface Dancer {
  id: number;
  bu_code: BU;
  name: string; // 하위 호환성을 위해 유지 (nickname_ko와 동일한 값)
  nickname_ko?: string; // 닉네임 (한글)
  nickname_en?: string; // 닉네임 (영어)
  real_name?: string; // 본명
  photo?: string;
  team_name?: string;
  company?: string;
  nationality?: string;
  gender?: 'male' | 'female'; // 성별
  contact?: string;
  bank_copy?: string;
  bank_name?: string; // 은행명
  account_number?: string;
  id_document_type?: 'passport' | 'resident_registration' | 'alien_registration';
  id_document_file?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

// 하위 호환성을 위한 타입 별칭
export type ExternalDancer = Dancer;

export type CommentEntityType = 'task' | 'project';

export interface Comment {
  id: number;
  entity_type: CommentEntityType;
  entity_id: number;
  content: string;
  author_id: string;
  author_name: string;
  mentioned_user_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectDocument {
  id: number;
  project_id: number;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

