'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBugReports, createBugReport, updateBugReport } from './api';
import type { CreateBugReportPayload, UpdateBugReportPayload } from './types';

const QUERY_KEY = ['bug-reports'];

export function useBugReports() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchBugReports,
  });
}

export function useCreateBugReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBugReportPayload) => createBugReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateBugReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBugReportPayload }) =>
      updateBugReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
