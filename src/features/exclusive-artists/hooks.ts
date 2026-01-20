'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchExclusiveArtists,
  fetchExclusiveArtist,
  createExclusiveArtist,
  updateExclusiveArtist,
  removeExclusiveArtist,
  FetchExclusiveArtistsParams,
} from './api';
import { ExclusiveArtistFormData } from './types';

export function useExclusiveArtists(params: FetchExclusiveArtistsParams = {}) {
  return useQuery({
    queryKey: ['exclusive-artists', params],
    queryFn: () => fetchExclusiveArtists(params),
  });
}

export function useExclusiveArtist(id: number | null) {
  return useQuery({
    queryKey: ['exclusive-artist', id],
    queryFn: () => fetchExclusiveArtist(id!),
    enabled: !!id,
  });
}

export function useCreateExclusiveArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ExclusiveArtistFormData) => createExclusiveArtist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exclusive-artists'] });
    },
  });
}

export function useUpdateExclusiveArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ExclusiveArtistFormData> }) =>
      updateExclusiveArtist(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exclusive-artists'] });
    },
  });
}

export function useRemoveExclusiveArtist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => removeExclusiveArtist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exclusive-artists'] });
    },
  });
}
