// 파트너 분배 정산 hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProjectShareSettings,
  updateProjectShareSetting,
  fetchPartnerSettlements,
  fetchPartnerSettlement,
  createPartnerSettlement,
  updatePartnerSettlement,
  deletePartnerSettlement,
  fetchPartnerOptions,
} from './api';
import type {
  UpdateProjectShareInput,
  CreateSettlementInput,
  UpdateSettlementInput,
} from './types';

// 프로젝트별 분배 설정
export function useProjectShareSettings(bu: string, activePeriod?: { start?: string; end?: string }) {
  return useQuery({
    queryKey: ['project-share-settings', bu, activePeriod?.start, activePeriod?.end],
    queryFn: () => fetchProjectShareSettings(bu, activePeriod),
  });
}

export function useUpdateProjectShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectShareInput) => updateProjectShareSetting(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-share-settings'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// 정산서 목록
export function usePartnerSettlements(partnerId?: number) {
  return useQuery({
    queryKey: ['partner-settlements', partnerId],
    queryFn: () => fetchPartnerSettlements(partnerId),
  });
}

// 정산서 상세
export function usePartnerSettlement(id: number | null) {
  return useQuery({
    queryKey: ['partner-settlement', id],
    queryFn: () => (id ? fetchPartnerSettlement(id) : null),
    enabled: !!id,
  });
}

// 정산서 생성
export function useCreateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSettlementInput) => createPartnerSettlement(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-settlements'] });
    },
  });
}

// 정산서 수정
export function useUpdateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSettlementInput) => updatePartnerSettlement(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['partner-settlement', data.id] });
    },
  });
}

// 정산서 삭제
export function useDeleteSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePartnerSettlement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-settlements'] });
    },
  });
}

// 파트너 옵션
export function usePartnerOptions() {
  return useQuery({
    queryKey: ['partner-options'],
    queryFn: fetchPartnerOptions,
    staleTime: 5 * 60 * 1000,
  });
}
