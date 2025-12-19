export type BU = 'GRIGO' | 'REACT' | 'FLOW' | 'AST' | 'MODOO';
export type ProjectStatus = '준비중' | '진행중' | '운영중' | '기획중' | '완료';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type FinancialKind = 'revenue' | 'expense';
export type FinancialStatus = 'planned' | 'paid' | 'canceled';
export type ERPRole = 'admin' | 'manager' | 'member' | 'viewer';

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
  org_unit_id: number;
  name: string;
  title: string;
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

