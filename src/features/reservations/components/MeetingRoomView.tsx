'use client';

import { useState, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { Plus, Settings, Calendar, List, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMeetingRooms,
  useVehicles,
  useEquipmentList,
  useReservations,
  useCreateReservation,
  useCancelReservation,
  useCreateMeetingRoom,
  useUpdateMeetingRoom,
  useDeleteMeetingRoom,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
} from '../hooks';
import { ReservationModal } from './ReservationModal';
import { ResourceManageModal } from './ResourceManageModal';
import { MonthlyCalendar } from './MonthlyCalendar';
import { ReservationList } from './ReservationList';
import { DayDetailModal } from './DayDetailModal';
import type { Reservation, CreateReservationPayload } from '../types';
import type { Project, TaskItem } from '@/features/erp/types';

interface AppUser {
  id: string;
  name: string;
  email?: string;
  position?: string;
  bu_code?: string;
}

interface Partner {
  id: number;
  display_name: string;
  entity_type: string;
  email?: string;
  phone?: string;
}

interface MeetingRoomViewProps {
  projects: Project[];
  tasks: TaskItem[];
  currentUserId: string;
  isAdmin: boolean;
  users: AppUser[];
  partners: Partner[];
}

export function MeetingRoomView({
  projects,
  tasks,
  currentUserId,
  isAdmin,
  users,
  partners,
}: MeetingRoomViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'view'>('create');

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const { data: meetingRooms = [] } = useMeetingRooms();
  const { data: vehicles = [] } = useVehicles();
  const { data: equipment = [] } = useEquipmentList();
  const { data: reservations = [], isLoading } = useReservations({
    resource_type: 'meeting_room',
    start_date: format(subMonths(monthStart, 1), 'yyyy-MM-dd'),
    end_date: format(addMonths(monthEnd, 1), 'yyyy-MM-dd'),
    status: 'active',
  });

  const createReservationMutation = useCreateReservation();
  const cancelReservationMutation = useCancelReservation();
  const createMeetingRoomMutation = useCreateMeetingRoom();
  const updateMeetingRoomMutation = useUpdateMeetingRoom();
  const deleteMeetingRoomMutation = useDeleteMeetingRoom();
  const createVehicleMutation = useCreateVehicle();
  const updateVehicleMutation = useUpdateVehicle();
  const deleteVehicleMutation = useDeleteVehicle();
  const createEquipmentMutation = useCreateEquipment();
  const updateEquipmentMutation = useUpdateEquipment();
  const deleteEquipmentMutation = useDeleteEquipment();

  const getResourceName = useCallback((resourceType: string, resourceId: number): string => {
    if (resourceType === 'meeting_room') {
      return meetingRooms.find((r) => r.id === resourceId)?.name || `회의실 #${resourceId}`;
    }
    return `#${resourceId}`;
  }, [meetingRooms]);

  const handleOpenCreateModal = () => {
    setIsDayDetailModalOpen(false);
    setSelectedReservation(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (reservation: Reservation) => {
    setIsDayDetailModalOpen(false);
    setSelectedReservation(reservation);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsDayDetailModalOpen(true);
  };

  const handleSubmitReservation = async (payload: CreateReservationPayload) => {
    await createReservationMutation.mutateAsync(payload);
  };

  const handleCancelReservation = async (id: number) => {
    await cancelReservationMutation.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <Building className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-200">회의실 예약</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {meetingRooms.filter(r => r.is_active).length}개 회의실
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">회의실 관리</span>
              <span className="sm:hidden">관리</span>
            </button>
          )}
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">새 예약</span>
            <span className="sm:hidden">예약</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {meetingRooms.filter(r => r.is_active).map((room) => (
          <button
            key={room.id}
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 sm:p-3 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition text-left"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <Building className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex items-center gap-1.5 sm:block">
              <p className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200 truncate">{room.name}</p>
              <span className="text-slate-300 dark:text-slate-600 sm:hidden">/</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {room.capacity ? `${room.capacity}명` : '인원 미정'}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 transition',
              viewMode === 'list'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'p-2 transition',
              viewMode === 'calendar'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            )}
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <MonthlyCalendar
          reservations={reservations}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onMonthChange={setSelectedDate}
          getResourceName={getResourceName}
          onReservationClick={handleOpenViewModal}
          resourceType="meeting_room"
        />
      ) : (
        <ReservationList
          reservations={reservations}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onReservationClick={handleOpenViewModal}
          onAddClick={handleOpenCreateModal}
          getResourceName={getResourceName}
          isLoading={isLoading}
          emptyMessage="회의실 예약이 없습니다."
          addButtonLabel="회의실 예약"
          resourceType="meeting_room"
        />
      )}

      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        reservation={selectedReservation}
        mode={modalMode}
        fixedResourceType="meeting_room"
        hideResourceTypeSelector
        defaultDate={selectedDate}
        meetingRooms={meetingRooms}
        vehicles={vehicles}
        equipment={equipment}
        projects={projects}
        tasks={tasks}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onSubmit={handleSubmitReservation}
        onCancel={handleCancelReservation}
        title={modalMode === 'create' ? '회의실 예약' : undefined}
        users={users}
        partners={partners}
      />

      <ResourceManageModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        type="meeting_room"
        meetingRooms={meetingRooms}
        vehicles={vehicles}
        equipment={equipment}
        onCreateMeetingRoom={(p) => createMeetingRoomMutation.mutateAsync(p).then(() => {})}
        onUpdateMeetingRoom={(id, p) => updateMeetingRoomMutation.mutateAsync({ id, payload: p }).then(() => {})}
        onDeleteMeetingRoom={(id) => deleteMeetingRoomMutation.mutateAsync(id).then(() => {})}
        onCreateVehicle={(p) => createVehicleMutation.mutateAsync(p).then(() => {})}
        onUpdateVehicle={(id, p) => updateVehicleMutation.mutateAsync({ id, payload: p }).then(() => {})}
        onDeleteVehicle={(id) => deleteVehicleMutation.mutateAsync(id).then(() => {})}
        onCreateEquipment={(p) => createEquipmentMutation.mutateAsync(p).then(() => {})}
        onUpdateEquipment={(id, p) => updateEquipmentMutation.mutateAsync({ id, payload: p }).then(() => {})}
        onDeleteEquipment={(id) => deleteEquipmentMutation.mutateAsync(id).then(() => {})}
      />

      <DayDetailModal
        isOpen={isDayDetailModalOpen}
        onClose={() => setIsDayDetailModalOpen(false)}
        date={selectedDate}
        reservations={reservations}
        onAddClick={handleOpenCreateModal}
        onReservationClick={handleOpenViewModal}
        getResourceName={getResourceName}
      />
    </div>
  );
}
