import type { Project, ProjectTask, FinancialEntry, ProjectStep, ProjectAssets } from '@/types/database';
import type { BU } from '@/types/database';
import { getTodayKST } from '@/lib/timezone';

// DB 타입 -> 프론트 타입 변환
export function dbProjectToFrontend(p: Project): {
  id: string;
  bu: BU;
  name: string;
  description?: string | null;
  cat: string;
  channel_id?: number | null;
  client_id?: number | null;
  startDate: string;
  endDate: string;
  status: string;
  partner_company_id?: number | null;
  partner_worker_id?: number | null;
  artist_id?: number;
  pm_id?: string | null;
  pm_name?: string | null;
  participants?: Array<{ user_id?: string; partner_worker_id?: number; partner_company_id?: number; external_worker_id?: number; role: string; is_pm: boolean }>;
} {
  return {
    id: String(p.id),
    bu: p.bu_code,
    name: p.name,
    description: p.description,
    cat: p.category,
    channel_id: p.channel_id,
    client_id: p.client_id || null,
    startDate: p.start_date,
    endDate: p.end_date,
    status: p.status,
    partner_company_id: (p as any).partner_company_id || null,
    partner_worker_id: (p as any).partner_worker_id || null,
    artist_id: p.artist_id,
    pm_id: (p as any).pm_id || null,
    pm_name: p.pm_name || null,
    participants: p.participants,
  };
}

export function dbTaskToFrontend(t: ProjectTask): {
  id: string;
  bu: BU;
  projectId: string;
  title: string;
  description?: string;
  assignee_id?: string;
  assignee: string;
  dueDate: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  tag?: string;
} {
  return {
    id: String(t.id),
    bu: t.bu_code,
    projectId: String(t.project_id),
    title: t.title,
    description: (t as any).description || undefined,
    assignee_id: t.assignee_id || undefined,
    assignee: t.assignee || '',
    dueDate: t.due_date,
    status: t.status === 'in_progress' ? 'in-progress' : t.status,
    priority: t.priority || 'medium',
    tag: t.tag,
  };
}

export function dbFinancialToFrontend(f: FinancialEntry): {
  id: string;
  projectId: string;
  bu: BU;
  type: 'revenue' | 'expense';
  category: string;
  name: string;
  amount: number;
  date: string;
  status: 'planned' | 'paid' | 'canceled';
  partner_id?: number | null;
  payment_method?: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | null;
  actual_amount?: number | null;
} {
  return {
    id: String(f.id),
    projectId: String(f.project_id),
    bu: f.bu_code,
    type: f.kind,
    category: f.category,
    name: f.name,
    amount: f.amount,
    date: f.occurred_at,
    status: f.status,
    partner_id: f.partner_id,
    payment_method: f.payment_method,
    actual_amount: f.actual_amount,
  };
}

// 프론트 타입 -> DB 타입 변환
export function frontendProjectToDb(p: {
  bu: BU;
  name: string;
  description?: string | null;
  cat?: string | null;
  channel_id?: number | null;
  startDate: string;
  endDate: string;
  status?: string;
  partner_company_id?: number | null;
  partner_worker_id?: number | null;
  artist_id?: number;
  pm_id?: string | null;
  pm_name?: string | null;
  participants?: Array<{ user_id?: string; partner_worker_id?: number; partner_company_id?: number; external_worker_id?: number; role?: string; is_pm?: boolean }>;
}): {
  bu_code: BU;
  name: string;
  description?: string | null;
  category: string;
  channel_id?: number | null;
  status: string;
  start_date: string;
  end_date: string;
  partner_company_id?: number | null;
  partner_worker_id?: number | null;
  artist_id?: number;
  pm_id?: string | null;
  pm_name?: string | null;
  participants?: Array<{ user_id?: string; partner_worker_id?: number; partner_company_id?: number; external_worker_id?: number; role?: string; is_pm?: boolean }>;
} {
  const today = getTodayKST();
  const result: {
    bu_code: BU;
    name: string;
    description?: string | null;
    category: string;
    channel_id?: number | null;
    status: string;
    start_date: string;
    end_date: string;
    partner_company_id?: number | null;
    partner_worker_id?: number | null;
    artist_id?: number;
    pm_id?: string | null;
    pm_name?: string | null;
    participants?: Array<{ user_id?: string; partner_worker_id?: number; partner_company_id?: number; external_worker_id?: number; role?: string; is_pm?: boolean }>;
  } = {
    bu_code: p.bu,
    name: p.name,
    category: p.cat || '',
    status: p.status || '준비중',
    start_date: p.startDate || today,
    end_date: p.endDate || today,
  };
  
  if (p.description !== undefined) {
    result.description = p.description || null;
  }
  
  if (p.channel_id !== undefined) {
    result.channel_id = p.channel_id || null;
  }
  
  if (p.partner_company_id !== undefined) {
    result.partner_company_id = p.partner_company_id || null;
  }
  
  if (p.partner_worker_id !== undefined) {
    result.partner_worker_id = p.partner_worker_id || null;
  }
  
  if (p.artist_id !== undefined) {
    result.artist_id = p.artist_id;
  }
  
  if (p.pm_id !== undefined) {
    result.pm_id = p.pm_id || null;
  }

  if (p.pm_name !== undefined) {
    result.pm_name = p.pm_name || null;
  }

  if (p.participants !== undefined) {
    result.participants = p.participants;
  }

  return result;
}

export function frontendTaskToDb(t: {
  projectId: string;
  bu: BU;
  title: string;
  description?: string;
  assignee_id?: string;
  assignee: string;
  dueDate: string;
  status?: 'todo' | 'in-progress' | 'done';
  priority?: 'high' | 'medium' | 'low';
  tag?: string;
}): {
  project_id: number;
  bu_code: BU;
  title: string;
  description?: string;
  assignee_id?: string;
  assignee: string;
  due_date: string;
  status: 'todo' | 'in_progress' | 'done';
  priority?: 'high' | 'medium' | 'low';
  tag?: string;
} {
  const today = getTodayKST();
  return {
    project_id: Number(t.projectId),
    bu_code: t.bu,
    title: t.title,
    description: t.description,
    assignee_id: t.assignee_id || undefined,
    assignee: t.assignee || '',
    due_date: t.dueDate || today,
    status: t.status === 'in-progress' ? 'in_progress' : (t.status || 'todo'),
    priority: t.priority || 'medium',
    tag: t.tag,
  };
}

export function frontendFinancialToDb(f: {
  projectId: string;
  bu: BU;
  type: 'revenue' | 'expense';
  category?: string;
  name: string;
  amount: number;
  date: string;
  status?: 'planned' | 'paid' | 'canceled';
  partner_id?: number | null;
  payment_method?: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | null;
  actual_amount?: number | null;
}): {
  project_id: number;
  bu_code: BU;
  kind: 'revenue' | 'expense';
  category: string;
  name: string;
  amount: number;
  occurred_at: string;
  status: 'planned' | 'paid' | 'canceled';
  partner_id?: number | null;
  payment_method?: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | null;
  actual_amount?: number | null;
} {
  const today = getTodayKST();
  return {
    project_id: Number(f.projectId),
    bu_code: f.bu,
    kind: f.type,
    category: f.category || f.type,
    name: f.name,
    amount: f.amount,
    occurred_at: f.date || today,
    status: f.status || 'planned',
    partner_id: f.partner_id || null,
    payment_method: f.payment_method || null,
    actual_amount: f.actual_amount || null,
  };
}

