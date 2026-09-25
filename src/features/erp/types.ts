import { BU_CODES, BU_NAMES, BU_ENGLISH_LABELS, BU_CHIP_CLASSES, type BuCode } from '@/lib/business-units';

/** 사업부 코드. 정의는 `@/lib/business-units`의 BU_CODES 한 곳이다. */
export type BU = BuCode;
export { BU_CODES };
export type View = 'dashboard' | 'projects' | 'settlement' | 'tasks' | 'taskTemplates' | 'manuals' | 'documentRoom' | 'organization' | 'reactstudio' | 'attendance' | 'attendanceAdmin' | 'leave' | 'leaveAdmin' | 'partners' | 'meetingRooms' | 'equipment' | 'vehicles' | 'workLog' | 'workLogAdmin' | 'bugReports' | 'exclusiveArtists' | 'pushTest' | 'resourceOverview' | 'aiWorkInsight' | 'corporateCard';

export type Project = {
  id: string;
  bu: BU;
  brand_bu: BU;
  delivery_bu: BU;
  artist_management_bu?: BU | null;
  name: string;
  cat: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  pm_id?: string | null;
  created_by?: string | null;
  /** 생성자 이름 (API 조인) */
  creator_name?: string | null;
  participants?: Array<{ user_id?: string; partner_worker_id?: number; partner_company_id?: number; role: string }>;
};

export type FinancialEntryStatus = 'planned' | 'paid' | 'canceled';

export type FinancialEntry = {
  id: string;
  projectId: string;
  bu: BU;
  entry_scope: 'external' | 'internal_allocation';
  counterparty_bu?: BU | null;
  memo?: string | null;
  type: 'revenue' | 'expense';
  category: string;
  name: string;
  amount: number;
  date: string;
  due_date?: string | null;
  status: FinancialEntryStatus;
  partner_id?: number | null;
  partner_company_id?: number | null;
  partner_worker_id?: number | null;
  payment_method?: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | null;
  actual_amount?: number | null;
};

export type Member = {
  name: string;
  role: string;
  team: string;
};

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskItem = {
  id: string;
  bu: BU;
  projectId: string;
  title: string;
  description?: string;
  assignee_id?: string;
  assignee: string;
  dueDate: string;
  status: 'todo' | 'in-progress' | 'on-hold' | 'done';
  priority: TaskPriority;
  manual_id?: number | null;
  /** 생성자 이름 (API 조인) */
  creator_name?: string | null;
};

/** 코드 → 한국어 이름. `@/lib/business-units` BU_META에서 파생된다. */
export const BU_TITLES: Record<BU, string> = BU_NAMES;

/** 코드 → 영문 라벨. `@/lib/business-units` BU_META에서 파생된다. */
export const BU_LABELS: Record<BU, string> = BU_ENGLISH_LABELS;

/** 코드 → 칩 색상. `@/lib/business-units` BU_META에서 파생된다. */
export const BU_CHIP_STYLES: Record<BU, string> = BU_CHIP_CLASSES;

export const formatCurrency = (value: number) =>
  `₩ ${value.toLocaleString('ko-KR')}`;

