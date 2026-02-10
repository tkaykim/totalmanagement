import type { TaskTemplate, BU, TaskTemplateOptionsSchema, TaskTemplateTask } from '@/types/database';

export async function getTaskTemplates(bu?: BU): Promise<TaskTemplate[]> {
  const params = new URLSearchParams();
  if (bu) {
    params.append('bu', bu);
  }

  const response = await fetch(`/api/task-templates?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch task templates');
  }
  return response.json();
}

export async function getTaskTemplate(id: number): Promise<TaskTemplate> {
  const response = await fetch(`/api/task-templates/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch task template');
  }
  return response.json();
}

export interface CreateTaskTemplateParams {
  bu_code: BU;
  name: string;
  description?: string;
  template_type: string;
  options_schema: TaskTemplateOptionsSchema;
  tasks: TaskTemplateTask[];
  is_active?: boolean;
}

export async function createTaskTemplate(params: CreateTaskTemplateParams): Promise<TaskTemplate> {
  const response = await fetch('/api/task-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create task template');
  }
  return response.json();
}

export interface UpdateTaskTemplateParams {
  name?: string;
  description?: string;
  template_type?: string;
  options_schema?: TaskTemplateOptionsSchema;
  tasks?: TaskTemplateTask[];
  is_active?: boolean;
}

export async function updateTaskTemplate(
  id: number,
  params: UpdateTaskTemplateParams
): Promise<TaskTemplate> {
  const response = await fetch(`/api/task-templates/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update task template');
  }
  return response.json();
}

export async function deleteTaskTemplate(id: number): Promise<void> {
  const response = await fetch(`/api/task-templates/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete task template');
  }
}

export interface GenerateTaskItem {
  title: string;
  due_date: string;
  priority: string;
  assignee_role?: string;
  manual_id?: number | null;
}

export interface GenerateTasksParams {
  template_id: number;
  project_id: number;
  tasks: GenerateTaskItem[];
}

export async function generateTasksFromTemplate(
  params: GenerateTasksParams
): Promise<{ tasks: any[]; count: number }> {
  const response = await fetch('/api/task-templates/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate tasks');
  }
  return response.json();
}
