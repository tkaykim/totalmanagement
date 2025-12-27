import type { Project, ProjectTask, FinancialEntry, ProjectStep, ProjectAssets } from '@/types/database';
import type { BU } from '@/types/database';

// DB 타입 -> 프론트 타입 변환
export function dbProjectToFrontend(p: Project): {
  id: string;
  bu: BU;
  name: string;
  cat: string;
  startDate: string;
  endDate: string;
  status: string;
  client_id?: number;
  artist_id?: number;
  pm_name?: string;
  active_steps?: ProjectStep[];
  plan_date?: string | null;
  script_date?: string | null;
  shoot_date?: string | null;
  edit1_date?: string | null;
  edit_final_date?: string | null;
  release_date?: string | null;
  assets?: ProjectAssets;
  participants?: Array<{ user_id?: string; external_worker_id?: number; role: string; is_pm: boolean }>;
} {
  return {
    id: String(p.id),
    bu: p.bu_code,
    name: p.name,
    cat: p.category,
    startDate: p.start_date,
    endDate: p.end_date,
    status: p.status,
    client_id: p.client_id,
    artist_id: p.artist_id,
    pm_name: p.pm_name,
    active_steps: p.active_steps,
    plan_date: p.plan_date,
    script_date: p.script_date,
    shoot_date: p.shoot_date,
    edit1_date: p.edit1_date,
    edit_final_date: p.edit_final_date,
    release_date: p.release_date,
    assets: p.assets,
    participants: p.participants,
  };
}

export function dbTaskToFrontend(t: ProjectTask): {
  id: string;
  bu: BU;
  projectId: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: 'todo' | 'in-progress' | 'done';
  priority?: 'high' | 'medium' | 'low';
  tag?: string;
} {
  return {
    id: String(t.id),
    bu: t.bu_code,
    projectId: String(t.project_id),
    title: t.title,
    assignee: t.assignee || '',
    dueDate: t.due_date,
    status: t.status === 'in_progress' ? 'in-progress' : t.status,
    priority: t.priority,
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
} {
  return {
    id: String(f.id),
    projectId: String(f.project_id),
    bu: f.bu_code,
    type: f.kind, // 'revenue' 또는 'expense'
    category: f.category, // 실제 카테고리명 (안무제작, 인건비 등)
    name: f.name,
    amount: f.amount,
    date: f.occurred_at,
    status: f.status,
  };
}

// 프론트 타입 -> DB 타입 변환
export function frontendProjectToDb(p: {
  bu: BU;
  name: string;
  cat: string;
  startDate: string;
  endDate: string;
  status?: string;
  artist_id?: number;
  pm_name?: string | null;
  active_steps?: ProjectStep[];
  plan_date?: string | null;
  script_date?: string | null;
  shoot_date?: string | null;
  edit1_date?: string | null;
  edit_final_date?: string | null;
  release_date?: string | null;
  assets?: ProjectAssets;
  participants?: Array<{ user_id?: string; external_worker_id?: number; role?: string; is_pm?: boolean }>;
}): {
  bu_code: BU;
  name: string;
  category: string;
  status: string;
  start_date: string;
  end_date: string;
  artist_id?: number;
  pm_name?: string | null;
  active_steps?: ProjectStep[];
  plan_date?: string | null;
  script_date?: string | null;
  shoot_date?: string | null;
  edit1_date?: string | null;
  edit_final_date?: string | null;
  release_date?: string | null;
  assets?: ProjectAssets;
  participants?: Array<{ user_id?: string; external_worker_id?: number; role?: string; is_pm?: boolean }>;
} {
  const today = new Date().toISOString().split('T')[0];
  const result: {
    bu_code: BU;
    name: string;
    category: string;
    status: string;
    start_date: string;
    end_date: string;
    artist_id?: number;
    pm_name?: string | null;
    active_steps?: ProjectStep[];
    plan_date?: string | null;
    script_date?: string | null;
    shoot_date?: string | null;
    edit1_date?: string | null;
    edit_final_date?: string | null;
    release_date?: string | null;
    assets?: ProjectAssets;
    participants?: Array<{ user_id?: string; external_worker_id?: number; role?: string; is_pm?: boolean }>;
  } = {
    bu_code: p.bu,
    name: p.name,
    category: p.cat,
    status: p.status || '준비중',
    start_date: p.startDate || today,
    end_date: p.endDate || today,
  };
  
  if (p.artist_id !== undefined) {
    result.artist_id = p.artist_id;
  }
  
  if (p.pm_name !== undefined) {
    result.pm_name = p.pm_name || null;
  }

  if (p.active_steps !== undefined) {
    result.active_steps = p.active_steps;
  }

  if (p.plan_date !== undefined) {
    result.plan_date = p.plan_date || null;
  }

  if (p.script_date !== undefined) {
    result.script_date = p.script_date || null;
  }

  if (p.shoot_date !== undefined) {
    result.shoot_date = p.shoot_date || null;
  }

  if (p.edit1_date !== undefined) {
    result.edit1_date = p.edit1_date || null;
  }

  if (p.edit_final_date !== undefined) {
    result.edit_final_date = p.edit_final_date || null;
  }

  if (p.release_date !== undefined) {
    result.release_date = p.release_date || null;
  }

  if (p.assets !== undefined) {
    result.assets = p.assets;
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
  assignee: string;
  dueDate: string;
  status?: 'todo' | 'in-progress' | 'done';
  priority?: 'high' | 'medium' | 'low';
  tag?: string;
}): {
  project_id: number;
  bu_code: BU;
  title: string;
  assignee: string;
  due_date: string;
  status: 'todo' | 'in_progress' | 'done';
  priority?: 'high' | 'medium' | 'low';
  tag?: string;
} {
  const today = new Date().toISOString().split('T')[0];
  return {
    project_id: Number(t.projectId),
    bu_code: t.bu,
    title: t.title,
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
}): {
  project_id: number;
  bu_code: BU;
  kind: 'revenue' | 'expense';
  category: string;
  name: string;
  amount: number;
  occurred_at: string;
  status: 'planned' | 'paid' | 'canceled';
} {
  const today = new Date().toISOString().split('T')[0];
  return {
    project_id: Number(f.projectId),
    bu_code: f.bu,
    kind: f.type,
    category: f.category || f.type, // category가 없으면 type을 사용 (하위 호환성)
    name: f.name,
    amount: f.amount,
    occurred_at: f.date || today,
    status: f.status || 'planned',
  };
}

