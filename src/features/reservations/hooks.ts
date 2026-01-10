'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMeetingRooms,
  createMeetingRoom,
  updateMeetingRoom,
  deleteMeetingRoom,
  fetchVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  fetchEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  fetchReservations,
  createReservation,
  updateReservation,
  cancelReservation,
} from './api';
import type {
  CreateMeetingRoomPayload,
  CreateVehiclePayload,
  CreateEquipmentPayload,
  CreateReservationPayload,
  UpdateReservationPayload,
  ReservationResourceType,
} from './types';

export const QUERY_KEYS = {
  meetingRooms: ['meeting-rooms'],
  vehicles: ['vehicles'],
  equipment: ['equipment'],
  reservations: ['reservations'],
} as const;

export function useMeetingRooms() {
  return useQuery({
    queryKey: QUERY_KEYS.meetingRooms,
    queryFn: fetchMeetingRooms,
  });
}

export function useCreateMeetingRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMeetingRoomPayload) => createMeetingRoom(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meetingRooms });
    },
  });
}

export function useUpdateMeetingRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateMeetingRoomPayload> }) =>
      updateMeetingRoom(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meetingRooms });
    },
  });
}

export function useDeleteMeetingRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMeetingRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meetingRooms });
    },
  });
}

export function useVehicles() {
  return useQuery({
    queryKey: QUERY_KEYS.vehicles,
    queryFn: fetchVehicles,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVehiclePayload) => createVehicle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vehicles });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateVehiclePayload> }) =>
      updateVehicle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vehicles });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vehicles });
    },
  });
}

export function useEquipmentList() {
  return useQuery({
    queryKey: QUERY_KEYS.equipment,
    queryFn: fetchEquipment,
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEquipmentPayload) => createEquipment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.equipment });
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateEquipmentPayload> }) =>
      updateEquipment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.equipment });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEquipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.equipment });
    },
  });
}

interface UseReservationsParams {
  resource_type?: ReservationResourceType;
  resource_id?: number;
  start_date?: string;
  end_date?: string;
  status?: 'active' | 'cancelled';
}

export function useReservations(params?: UseReservationsParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.reservations, params],
    queryFn: () => fetchReservations(params),
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReservationPayload) => createReservation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reservations });
    },
  });
}

export function useUpdateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateReservationPayload }) =>
      updateReservation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reservations });
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cancelReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reservations });
    },
  });
}
