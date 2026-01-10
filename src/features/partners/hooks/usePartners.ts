'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchPartners, 
  fetchPartner, 
  createPartner, 
  updatePartner, 
  deletePartner,
  fetchCategories,
  requestAccess,
  fetchAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
} from '../api';
import { PartnerFormData, PartnerEntityType } from '../types';

interface UsePartnersParams {
  bu?: string;
  entity_type?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function usePartners(params: UsePartnersParams = {}) {
  return useQuery({
    queryKey: ['partners', params],
    queryFn: () => fetchPartners(params),
  });
}

export function usePartner(id: number | null) {
  return useQuery({
    queryKey: ['partner', id],
    queryFn: () => fetchPartner(id!),
    enabled: !!id,
  });
}

export function useCategories(params: { search?: string; entity_type?: string } = {}) {
  return useQuery({
    queryKey: ['partner-categories', params],
    queryFn: () => fetchCategories(params),
  });
}

export function useCategoriesByEntityType(entityType: PartnerEntityType | null) {
  return useQuery({
    queryKey: ['partner-categories', entityType],
    queryFn: () => fetchCategories({ entity_type: entityType || undefined }),
    enabled: !!entityType,
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: PartnerFormData) => createPartner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PartnerFormData> }) => 
      updatePartner(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner', variables.id] });
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => deletePartner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}

export function useRequestAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ partnerId, data }: { partnerId: number; data: { access_level?: string; reason?: string } }) => 
      requestAccess(partnerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partner', variables.partnerId] });
    },
  });
}

export function useAccessRequests(status: string = 'pending') {
  return useQuery({
    queryKey: ['access-requests', status],
    queryFn: () => fetchAccessRequests(status),
  });
}

export function useApproveAccessRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: number; data?: { valid_until?: string } }) => 
      approveAccessRequest(requestId, data || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}

export function useRejectAccessRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: number; data?: { reason?: string } }) => 
      rejectAccessRequest(requestId, data || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    },
  });
}
