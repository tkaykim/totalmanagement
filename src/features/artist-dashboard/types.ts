import type { ProjectStatus, TaskStatus, FinancialStatus, BU } from '@/types/database';

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

export interface ArtistSettlementsResponse {
  settlements: ArtistSettlement[];
  partnerSettlements?: any[];
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

// 대시보드 탭 타입
export type ProjectTab = 'proposal' | 'in_progress' | 'completed';
export type TaskTab = 'all' | 'todo' | 'in_progress' | 'done';
export type SettlementTab = 'all' | 'planned' | 'paid';

// 통합 대시보드 데이터
export interface ArtistDashboardData {
  projects: ArtistProjectsResponse | null;
  tasks: ArtistTasksResponse | null;
  settlements: ArtistSettlementsResponse | null;
  isLoading: boolean;
  error: string | null;
}
