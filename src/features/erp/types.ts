export type BU = 'GRIGO' | 'REACT' | 'FLOW' | 'AST' | 'MODOO' | 'HEAD';
export type View = 'dashboard' | 'projects' | 'settlement' | 'tasks' | 'organization' | 'reactstudio' | 'attendance' | 'attendanceAdmin' | 'partners' | 'meetingRooms' | 'equipment' | 'vehicles';

export type Project = {
  id: string;
  bu: BU;
  name: string;
  cat: string;
  startDate: string;
  endDate: string;
  status: string;
  pm_id?: string | null;
  participants?: Array<{ user_id?: string; partner_worker_id?: number; partner_company_id?: number; role: string }>;
};

export type FinancialEntryStatus = 'planned' | 'paid' | 'canceled';

export type FinancialEntry = {
  id: string;
  projectId: string;
  bu: BU;
  type: 'revenue' | 'expense';
  category: string;
  name: string;
  amount: number;
  date: string;
  status: FinancialEntryStatus;
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
  assignee: string;
  dueDate: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: TaskPriority;
};

export const BU_TITLES: Record<BU, string> = {
  GRIGO: '그리고 엔터',
  REACT: '리액트 스튜디오',
  FLOW: '플로우메이커',
  AST: '아스트 컴퍼니',
  MODOO: '모두굿즈',
  HEAD: '본사',
};

export const BU_LABELS: Record<BU, string> = {
  GRIGO: 'GRIGO',
  REACT: 'REACT STUDIO',
  FLOW: 'FLOWMAKER',
  AST: 'AST',
  MODOO: 'MODOO',
  HEAD: 'HEAD',
};

export const BU_CHIP_STYLES: Record<BU, string> = {
  GRIGO: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  REACT: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  FLOW: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  AST: 'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  MODOO: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  HEAD: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

export const formatCurrency = (value: number) =>
  `₩ ${value.toLocaleString('ko-KR')}`;

