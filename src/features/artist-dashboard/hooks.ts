'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchArtistProjects,
  fetchArtistTasks,
  fetchArtistSettlements,
  fetchArtistProfile,
  fetchArtistNotifications,
  markArtistNotificationsRead,
  updateArtistTaskStatus,
  submitArtistProposal,
} from './api';

// 아티스트 프로젝트 조회 훅
export function useArtistProjects(status?: string) {
  return useQuery({
    queryKey: ['artist-projects', status],
    queryFn: () => fetchArtistProjects(status),
  });
}

// 아티스트 할일 조회 훅
export function useArtistTasks(params?: { status?: string; project_id?: number }) {
  return useQuery({
    queryKey: ['artist-tasks', params],
    queryFn: () => fetchArtistTasks(params),
  });
}

// 아티스트 할일 상태 업데이트 훅
export function useUpdateArtistTaskStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: 'todo' | 'in_progress' | 'done' }) =>
      updateArtistTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-tasks'] });
    },
  });
}

// 아티스트 프로필 조회 훅
export function useArtistProfile() {
  return useQuery({
    queryKey: ['artist-profile'],
    queryFn: fetchArtistProfile,
  });
}

// 아티스트 알림 조회 훅
export function useArtistNotifications(params?: { unread_only?: boolean; limit?: number }) {
  return useQuery({
    queryKey: ['artist-notifications', params],
    queryFn: () => fetchArtistNotifications(params),
  });
}

// 아티스트 알림 읽음 처리 훅
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markArtistNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-notifications'] });
    },
  });
}

// 아티스트 제안 수락/거절 훅
export function useSubmitArtistProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitArtistProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-projects'] });
    },
  });
}

// 아티스트 정산 내역 조회 훅
export function useArtistSettlements(params?: {
  start_date?: string;
  end_date?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['artist-settlements', params],
    queryFn: () => fetchArtistSettlements(params),
  });
}

// 대시보드 전체 데이터 조회 (병렬)
export function useArtistDashboard() {
  const projectsQuery = useArtistProjects();
  const tasksQuery = useArtistTasks();
  const settlementsQuery = useArtistSettlements();
  
  return {
    projects: projectsQuery.data ?? null,
    tasks: tasksQuery.data ?? null,
    settlements: settlementsQuery.data ?? null,
    isLoading: projectsQuery.isLoading || tasksQuery.isLoading || settlementsQuery.isLoading,
    error: projectsQuery.error?.message || tasksQuery.error?.message || settlementsQuery.error?.message || null,
    refetch: () => {
      projectsQuery.refetch();
      tasksQuery.refetch();
      settlementsQuery.refetch();
    },
  };
}
