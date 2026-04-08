'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGowidMembers,
  fetchGowidPurposes,
  fetchExpenses,
  fetchExpenseDetail,
  fetchNotSubmittedExpenses,
  updateExpensePurpose,
  updateExpenseParticipants,
  updateExpenseMemo,
  updateExpenseApproval,
  addExpenseComment,
  bulkApproveExpenses,
  bulkUpdatePurposes,
  fetchGowidMappings,
  createGowidMapping,
  deleteGowidMapping,
  fetchExpenseProjectLink,
  linkExpenseToProject,
  unlinkExpenseFromProject,
} from './api';
import type { ExpenseSearchCriteria } from './types';

const KEYS = {
  members: ['gowid', 'members'] as const,
  purposes: ['gowid', 'purposes'] as const,
  expenses: (criteria: Record<string, unknown>) => ['gowid', 'expenses', criteria] as const,
  expenseDetail: (id: number) => ['gowid', 'expense', id] as const,
  notSubmitted: (page: number) => ['gowid', 'not-submitted', page] as const,
  mappings: ['gowid', 'mappings'] as const,
  projectLink: (expenseId: number) => ['gowid', 'project-link', expenseId] as const,
};

export function useGowidMembers() {
  return useQuery({
    queryKey: KEYS.members,
    queryFn: fetchGowidMembers,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGowidPurposes(isActivated?: boolean) {
  return useQuery({
    queryKey: [...KEYS.purposes, isActivated],
    queryFn: () => fetchGowidPurposes(isActivated),
    staleTime: 5 * 60 * 1000,
  });
}

export function useExpenses(criteria: ExpenseSearchCriteria & { page?: number; size?: number }) {
  return useQuery({
    queryKey: KEYS.expenses(criteria as Record<string, unknown>),
    queryFn: () => fetchExpenses(criteria),
  });
}

export function useExpenseDetail(expenseId: number | null) {
  return useQuery({
    queryKey: KEYS.expenseDetail(expenseId!),
    queryFn: () => fetchExpenseDetail(expenseId!),
    enabled: expenseId !== null,
  });
}

export function useNotSubmittedExpenses(page = 0, size = 20) {
  return useQuery({
    queryKey: KEYS.notSubmitted(page),
    queryFn: () => fetchNotSubmittedExpenses(page, size),
  });
}

export function useUpdatePurpose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, ...data }: { expenseId: number; purposeId: number; purposeRequirementAnswerMap?: Record<string, string[]> }) =>
      updateExpensePurpose(expenseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gowid', 'expenses'] });
      qc.invalidateQueries({ queryKey: ['gowid', 'expense'] });
    },
  });
}

export function useUpdateParticipants() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, ...data }: { expenseId: number; participantIds: number[]; externalUsers: { name: string; company: string }[] }) =>
      updateExpenseParticipants(expenseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gowid', 'expense'] });
    },
  });
}

export function useUpdateMemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, memo }: { expenseId: number; memo: string }) =>
      updateExpenseMemo(expenseId, { memo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gowid', 'expenses'] });
      qc.invalidateQueries({ queryKey: ['gowid', 'expense'] });
    },
  });
}

export function useUpdateApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, ...data }: { expenseId: number; approvalStatus: string; approvedAmount?: number }) =>
      updateExpenseApproval(expenseId, data as Parameters<typeof updateExpenseApproval>[1]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gowid', 'expenses'] });
      qc.invalidateQueries({ queryKey: ['gowid', 'expense'] });
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, comment }: { expenseId: number; comment: string }) =>
      addExpenseComment(expenseId, { comment }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.expenseDetail(vars.expenseId) });
    },
  });
}

export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bulkApproveExpenses,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gowid', 'expenses'] });
    },
  });
}

export function useBulkUpdatePurposes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bulkUpdatePurposes,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gowid', 'expenses'] });
    },
  });
}

export function useGowidMappings() {
  return useQuery({
    queryKey: KEYS.mappings,
    queryFn: fetchGowidMappings,
  });
}

export function useCreateMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGowidMapping,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.mappings });
    },
  });
}

export function useDeleteMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteGowidMapping,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.mappings });
    },
  });
}

export function useExpenseProjectLink(expenseId: number | null) {
  return useQuery({
    queryKey: KEYS.projectLink(expenseId!),
    queryFn: () => fetchExpenseProjectLink(expenseId!),
    enabled: expenseId !== null,
  });
}

export function useLinkProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, projectId }: { expenseId: number; projectId: number }) =>
      linkExpenseToProject(expenseId, projectId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.projectLink(vars.expenseId) });
    },
  });
}

export function useUnlinkProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: number) => unlinkExpenseFromProject(expenseId),
    onSuccess: (_, expenseId) => {
      qc.invalidateQueries({ queryKey: KEYS.projectLink(expenseId) });
    },
  });
}
