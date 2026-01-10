'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchArtistProjects,
  fetchArtistTasks,
  fetchArtistSettlements,
  updateArtistTaskStatus,
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
