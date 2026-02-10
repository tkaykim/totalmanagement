'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActivityLogs, getWorkLog, saveWorkLog, updateWorkLog, deleteWorkLog, getAdminWorkLogOverview, getAdminUserWorkLog, getAdminActivityLogs } from './api';
import type { WorkLogFormData } from './types';

// 활동 로그 조회 훅
export function useActivityLogs(date?: string) {
  return useQuery({
    queryKey: ['activity-logs', date],
    queryFn: () => getActivityLogs(date),
    staleTime: 1000 * 60, // 1분
  });
}

// 특정 날짜의 출퇴근 기록 조회 훅 (work_date 기준)
export function useAttendanceLogs(date?: string) {
  return useQuery({
    queryKey: ['attendance-logs-by-date', date],
    queryFn: async () => {
      if (!date) return [];
      const res = await fetch(`/api/attendance/logs?start_date=${date}&end_date=${date}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 1000 * 60, // 1분
  });
}

// 업무 일지 조회 훅
export function useWorkLog(date?: string) {
  return useQuery({
    queryKey: ['work-log', date],
    queryFn: () => getWorkLog(date),
    staleTime: 1000 * 60, // 1분
  });
}

// 업무 일지 저장 훅
export function useSaveWorkLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: WorkLogFormData) => saveWorkLog(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-log', variables.log_date] });
      queryClient.invalidateQueries({ queryKey: ['work-log'] });
    },
  });
}

// 업무 일지 업데이트 훅
export function useUpdateWorkLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: WorkLogFormData }) => updateWorkLog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-log'] });
    },
  });
}

// 업무 일지 삭제 훅
export function useDeleteWorkLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => deleteWorkLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-log'] });
    },
  });
}

// ============================================
// 관리자 전용 훅
// ============================================

// 관리자: 날짜별 전체 업무일지 제출 현황
export function useAdminWorkLogOverview(date?: string) {
  return useQuery({
    queryKey: ['admin-work-log-overview', date],
    queryFn: () => getAdminWorkLogOverview(date),
    staleTime: 1000 * 60,
  });
}

// 관리자: 특정 사용자의 업무일지 상세
export function useAdminUserWorkLog(userId: string | null, date?: string) {
  return useQuery({
    queryKey: ['admin-user-work-log', userId, date],
    queryFn: () => getAdminUserWorkLog(userId!, date),
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
}

// 관리자: 특정 사용자의 활동 로그
export function useAdminActivityLogs(userId: string | null, date?: string) {
  return useQuery({
    queryKey: ['admin-activity-logs', userId, date],
    queryFn: () => getAdminActivityLogs(userId!, date),
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
}

// 관리자: 특정 사용자의 출퇴근 기록
export function useAdminAttendanceLogs(userId: string | null, date?: string) {
  return useQuery({
    queryKey: ['admin-attendance-logs', userId, date],
    queryFn: async () => {
      if (!userId || !date) return [];
      const res = await fetch(`/api/attendance/logs?user_id=${userId}&start_date=${date}&end_date=${date}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId && !!date,
    staleTime: 1000 * 60,
  });
}
