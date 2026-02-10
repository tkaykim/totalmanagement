'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BU, TaskTemplate } from '@/types/database';
import {
  getTaskTemplates,
  getTaskTemplate,
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
  generateTasksFromTemplate,
  type CreateTaskTemplateParams,
  type UpdateTaskTemplateParams,
  type GenerateTasksParams,
} from './api';

export function useTaskTemplates(bu?: BU) {
  return useQuery({
    queryKey: ['taskTemplates', bu],
    queryFn: () => getTaskTemplates(bu),
  });
}

export function useTaskTemplate(id: number | null) {
  return useQuery({
    queryKey: ['taskTemplate', id],
    queryFn: () => (id ? getTaskTemplate(id) : null),
    enabled: !!id,
  });
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateTaskTemplateParams) => createTaskTemplate(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
    },
  });
}

export function useUpdateTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, params }: { id: number; params: UpdateTaskTemplateParams }) =>
      updateTaskTemplate(id, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['taskTemplate', variables.id] });
    },
  });
}

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTaskTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
    },
  });
}

export function useGenerateTasksFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: GenerateTasksParams) => generateTasksFromTemplate(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
