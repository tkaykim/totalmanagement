import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  BU,
  FinancialKind,
  TaskStatus,
  ClientStatus,
  EquipmentStatus,
  ChannelStatus,
  ContentStage,
  EventType,
} from '@/types/database';
import * as api from './api';

export function useProjects(bu?: BU) {
  return useQuery({
    queryKey: ['projects', bu],
    queryFn: () => api.fetchProjects(bu),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useTasks(bu?: BU, projectId?: number) {
  return useQuery({
    queryKey: ['tasks', bu, projectId],
    queryFn: () => api.fetchTasks(bu, projectId),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useFinancialEntries(params?: {
  bu?: BU;
  projectId?: number;
  kind?: FinancialKind;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['financial-entries', params],
    queryFn: () => api.fetchFinancialEntries(params),
  });
}

export function useCreateFinancialEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createFinancialEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
    },
  });
}

export function useUpdateFinancialEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateFinancialEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
    },
  });
}

export function useDeleteFinancialEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteFinancialEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
    },
  });
}

export function useOrgMembers() {
  return useQuery({
    queryKey: ['org-members'],
    queryFn: api.fetchOrgMembers,
  });
}

export function useCreateOrgMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createOrgMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
    },
  });
}

export function useUpdateOrgMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateOrgMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
    },
  });
}

export function useDeleteOrgMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteOrgMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
    },
  });
}

export function useBusinessUnits() {
  return useQuery({
    queryKey: ['business-units'],
    queryFn: api.fetchBusinessUnits,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: api.fetchUsers,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ============================================
// ReactStudio & Multi-BU Hooks
// ============================================

// Clients
export function useClients(bu?: BU) {
  return useQuery({
    queryKey: ['clients', bu],
    queryFn: () => api.fetchClients(bu),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// Client Workers
export function useClientWorkers(clientCompanyId?: number) {
  return useQuery({
    queryKey: ['client-workers', clientCompanyId],
    queryFn: () => api.fetchClientWorkers(clientCompanyId),
  });
}

export function useCreateClientWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createClientWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-workers'] });
    },
  });
}

export function useUpdateClientWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateClientWorker(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-workers'] });
    },
  });
}

export function useDeleteClientWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteClientWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-workers'] });
    },
  });
}

// Equipment
export function useEquipment(bu?: BU) {
  return useQuery({
    queryKey: ['equipment', bu],
    queryFn: () => api.fetchEquipment(bu),
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateEquipment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteEquipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

// Channels
export function useChannels(bu?: BU) {
  return useQuery({
    queryKey: ['channels', bu],
    queryFn: () => api.fetchChannels(bu),
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateChannel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteChannel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

// Channel Contents
export function useChannelContents(channelId?: number) {
  return useQuery({
    queryKey: ['channel-contents', channelId],
    queryFn: () => api.fetchChannelContents(channelId),
  });
}

export function useCreateChannelContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createChannelContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-contents'] });
    },
  });
}

export function useUpdateChannelContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateChannelContent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-contents'] });
    },
  });
}

export function useDeleteChannelContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteChannelContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-contents'] });
    },
  });
}

// Events
export function useEvents(bu?: BU, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['events', bu, startDate, endDate],
    queryFn: () => api.fetchEvents(bu, startDate, endDate),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Manuals
export function useManuals(bu?: BU, category?: string) {
  return useQuery({
    queryKey: ['manuals', bu, category],
    queryFn: () => api.fetchManuals(bu, category),
  });
}

export function useCreateManual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createManual,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manuals'] });
    },
  });
}

export function useUpdateManual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateManual(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manuals'] });
    },
  });
}

export function useDeleteManual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteManual(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manuals'] });
    },
  });
}

// Creators
export function useCreators(bu?: BU) {
  return useQuery({
    queryKey: ['creators', bu],
    queryFn: () => api.fetchCreators(bu),
  });
}

export function useCreateCreator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createCreator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
    },
  });
}

export function useUpdateCreator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateCreator(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
    },
  });
}

export function useDeleteCreator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteCreator(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
    },
  });
}

// External Workers
export function useExternalWorkers(bu?: BU) {
  return useQuery({
    queryKey: ['external-workers', bu],
    queryFn: () => api.fetchExternalWorkers(bu),
  });
}

export function useCreateExternalWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createExternalWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-workers'] });
    },
  });
}

export function useUpdateExternalWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateExternalWorker(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-workers'] });
    },
  });
}

export function useDeleteExternalWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteExternalWorker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-workers'] });
    },
  });
}

// Artists
export function useArtists(bu?: BU) {
  return useQuery({
    queryKey: ['artists', bu],
    queryFn: () => api.fetchArtists(bu),
  });
}

export function useCreateArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createArtist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artists'] });
    },
  });
}

export function useUpdateArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateArtist(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artists'] });
    },
  });
}

export function useDeleteArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteArtist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artists'] });
    },
  });
}


