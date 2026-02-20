import type { ProjectStatus, TaskStatus, FinancialStatus, BU } from '@/types/database';

// 아티스트 제안 응답
export type ArtistResponseValue = 'pending' | 'accepted' | 'rejected';

// 아티스트 프로젝트 타입
export interface ArtistProject {
  id: number;
  bu_code: BU;
  name: string;
  category: string;
  description?: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  partner_id: number | null;
  pm_id: string | null;
  channel_id?: number | null;
  created_at: string;
  updated_at: string;
  connection_type: 'partner' | 'participant';
  pm_name?: string | null;
  artist_response?: ArtistResponseValue | null;
  artist_response_note?: string | null;
  artist_responded_at?: string | null;
}

export interface ArtistProjectsResponse {
  projects: ArtistProject[];
  summary: {
    proposal: number;
    in_progress: number;
    completed: number;
    total: number;
  };
}

// 아티스트 할일 타입
export interface ArtistTask {
  id: number;
  project_id: number;
  bu_code: BU;
  title: string;
  description?: string | null;
  assignee_id: string | null;
  assignee?: string | null;
  due_date: string;
  status: TaskStatus;
  priority: 'high' | 'medium' | 'low';
  tag?: string | null;
  created_at: string;
  updated_at: string;
  projects?: {
    id: number;
    name: string;
    status: ProjectStatus;
    partner_id: number | null;
  };
}

export interface ArtistTasksResponse {
  tasks: ArtistTask[];
  grouped: {
    todo: ArtistTask[];
    in_progress: ArtistTask[];
    done: ArtistTask[];
  };
  summary: {
    todo: number;
    in_progress: number;
    done: number;
    total: number;
    pending: number;
  };
}

// 아티스트 정산 타입
export interface ArtistSettlement {
  id: number;
  project_id: number;
  bu_code: BU;
  kind: 'revenue' | 'expense';
  category: string;
  name: string;
  amount: number;
  occurred_at: string;
  status: FinancialStatus;
  memo?: string | null;
  partner_id: number | null;
  payment_method?: string | null;
  actual_amount?: number | null;
  created_at: string;
  updated_at: string;
  projects?: {
    id: number;
    name: string;
    status: ProjectStatus;
  };
}

export interface SettlementSummaryItem {
  count: number;
  amount: number;
}

export interface PartnerSettlementProject {
  id: number;
  project_id: number;
  project?: { id: number; name: string };
  revenue: number;
  expense: number;
  net_profit: number;
  share_rate: number;
  partner_amount: number;
}

export interface PartnerSettlement {
  id: number;
  partner_id: number;
  period_start: string;
  period_end: string;
  status: 'draft' | 'confirmed' | 'paid';
  total_revenue: number;
  total_expense: number;
  net_profit: number;
  partner_amount: number;
  company_amount: number;
  memo: string | null;
  created_at: string;
  partner_settlement_projects?: PartnerSettlementProject[];
}

export interface ArtistSettlementsResponse {
  settlements: ArtistSettlement[];
  partnerSettlements?: PartnerSettlement[];
  summary: {
    draft?: SettlementSummaryItem;
    confirmed?: SettlementSummaryItem;
    planned?: SettlementSummaryItem;
    paid: SettlementSummaryItem;
    canceled?: SettlementSummaryItem;
    total: SettlementSummaryItem;
    this_month?: SettlementSummaryItem;
  };
}

// 정산 상세 다이얼로그 payload (레거시 | 파트너)
export type SettlementDetailPayload =
  | { type: 'legacy'; data: ArtistSettlement }
  | { type: 'partner'; data: PartnerSettlement };

// 알림
export interface ArtistNotification {
  id: number;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// 대시보드 탭 타입
export type ProjectTab = 'proposal' | 'in_progress' | 'completed';
export type TaskTab = 'all' | 'todo' | 'in_progress' | 'done';
export type SettlementTab = 'all' | 'planned' | 'paid';

// 아티스트 프로필 (민감정보 제외)
export interface ArtistProfile {
  id: number;
  display_name?: string | null;
  name_ko?: string | null;
  name_en?: string | null;
  nationality?: string | null;
  entity_type?: string | null;
  job_titles?: string[];
  contract_start?: string | null;
  contract_end?: string | null;
  visa_type?: string | null;
  visa_expiry?: string | null;
  photo_url?: string | null;
}

// 통합 대시보드 데이터
export interface ArtistDashboardData {
  projects: ArtistProjectsResponse | null;
  tasks: ArtistTasksResponse | null;
  settlements: ArtistSettlementsResponse | null;
  isLoading: boolean;
  error: string | null;
}
