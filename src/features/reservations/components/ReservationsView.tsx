'use client';

import { useState, useMemo, useCallback } from 'react';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus, Building, Car, Package, Settings, Calendar, List, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { ReservationCalendar } from './ReservationCalendar';
import type { Reservation, ReservationResourceType, CreateReservationPayload } from '../types';
import type { Project, TaskItem } from '@/features/erp/types';

interface ReservationsViewProps {
  projects: Project[];
  tasks: TaskItem[];
  currentUserId: string;
  isAdmin: boolean;
}

type ViewMode = 'calendar' | 'list';
type ResourceFilter = 'all' | ReservationResourceType;

export function ReservationsView({
  projects,
  tasks,
  currentUserId,
  isAdmin,
}: ReservationsViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'view'>('create');
  const [defaultResourceType, setDefaultResourceType] = useState<ReservationResourceType>('meeting_room');

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  const { data: meetingRooms = [] } = useMeetingRooms();
  const { data: vehicles = [] } = useVehicles();
  const { data: equipment = [] } = useEquipmentList();
  const { data: reservations = [], isLoading: reservationsLoading } = useReservations({
    start_date: format(subWeeks(weekStart, 1), 'yyyy-MM-dd'),
    end_date: format(addWeeks(weekEnd, 1), 'yyyy-MM-dd'),
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

  const filteredReservations = useMemo(() => {
    if (resourceFilter === 'all') return reservations;
    return reservations.filter((r) => r.resource_type === resourceFilter);
  }, [reservations, resourceFilter]);

  const todayReservations = useMemo(() => {
    return filteredReservations.filter((r) => {
      const startDate = parseISO(r.start_time);
      return isSameDay(startDate, selectedDate);
    });
  }, [filteredReservations, selectedDate]);

  const getResourceName = useCallback((resourceType: string, resourceId: number): string => {
    switch (resourceType) {
      case 'meeting_room':
        return meetingRooms.find((r) => r.id === resourceId)?.name || `회의실 #${resourceId}`;
      case 'vehicle':
        const vehicle = vehicles.find((v) => v.id === resourceId);
        return vehicle ? `${vehicle.name} (${vehicle.license_plate})` : `차량 #${resourceId}`;
      case 'equipment':
        return equipment.find((e) => e.id === resourceId)?.name || `장비 #${resourceId}`;
      default:
        return `#${resourceId}`;
    }
  }, [meetingRooms, vehicles, equipment]);

  const handleOpenCreateModal = (type: ReservationResourceType = 'meeting_room') => {
    setSelectedReservation(null);
    setModalMode('create');
    setDefaultResourceType(type);
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleSubmitReservation = async (payload: CreateReservationPayload) => {
    await createReservationMutation.mutateAsync(payload);
  };

  const handleCancelReservation = async (id: number) => {
    await cancelReservationMutation.mutateAsync(id);
  };

  const getResourceTypeStyle = (type: ReservationResourceType) => {
    switch (type) {
      case 'meeting_room':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700';
      case 'equipment':
        return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700';
      case 'vehicle':
        return 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700';
    }
  };

  const getResourceTypeLabel = (type: ReservationResourceType) => {
    switch (type) {
      case 'meeting_room': return '회의실';
      case 'equipment': return '장비';
      case 'vehicle': return '차량';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">예약 관리</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            회의실, 장비, 차량을 예약하고 관리하세요
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Settings className="h-4 w-4" />
              리소스 관리
            </button>
          )}
          <button
            onClick={() => handleOpenCreateModal('meeting_room')}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            새 예약
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => handleOpenCreateModal('meeting_room')}
          className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">회의실 예약</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{meetingRooms.filter(r => r.is_active).length}개 회의실</p>
          </div>
        </button>
        <button
          onClick={() => handleOpenCreateModal('equipment')}
          className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md transition"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">장비 대여</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{equipment.filter(e => e.status === 'available').length}개 장비</p>
          </div>
        </button>
        <button
          onClick={() => handleOpenCreateModal('vehicle')}
          className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
            <Car className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">차량 예약</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{vehicles.filter(v => v.is_active).length}대 차량</p>
          </div>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setResourceFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition',
              resourceFilter === 'all'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            )}
          >
            전체
          </button>
          <button
            onClick={() => setResourceFilter('meeting_room')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition',
              resourceFilter === 'meeting_room'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
            )}
          >
            회의실
          </button>
          <button
            onClick={() => setResourceFilter('equipment')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition',
              resourceFilter === 'equipment'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
            )}
          >
            장비
          </button>
          <button
            onClick={() => setResourceFilter('vehicle')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition',
              resourceFilter === 'vehicle'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50'
            )}
          >
            차량
          </button>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {viewMode === 'calendar' ? (
        <ReservationCalendar
          reservations={filteredReservations}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          getResourceName={getResourceName}
          onReservationClick={handleOpenViewModal}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedDate((d) => subWeeks(d, 1))}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {format(selectedDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}
              </h3>
              <button
                onClick={() => setSelectedDate((d) => addWeeks(d, 1))}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => setSelectedDate(new Date())}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition',
                isToday(selectedDate)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              )}
            >
              오늘
            </button>
          </div>

          {reservationsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">예약 목록을 불러오는 중...</p>
            </div>
          ) : todayReservations.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <Calendar className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                {format(selectedDate, 'M월 d일', { locale: ko })}에 예약이 없습니다.
              </p>
              <button
                onClick={() => handleOpenCreateModal()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
              >
                <Plus className="h-4 w-4" />
                예약하기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {todayReservations.map((reservation) => (
                <button
                  key={reservation.id}
                  onClick={() => handleOpenViewModal(reservation)}
                  className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        reservation.resource_type === 'meeting_room' && 'bg-blue-100 dark:bg-blue-900/50',
                        reservation.resource_type === 'equipment' && 'bg-emerald-100 dark:bg-emerald-900/50',
                        reservation.resource_type === 'vehicle' && 'bg-amber-100 dark:bg-amber-900/50',
                      )}>
                        {reservation.resource_type === 'meeting_room' && <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                        {reservation.resource_type === 'equipment' && <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                        {reservation.resource_type === 'vehicle' && <Car className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{reservation.title}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {getResourceName(reservation.resource_type, reservation.resource_id)}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          예약자: {reservation.reserver?.name}
                          {reservation.project && ` · ${reservation.project.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded text-[10px] font-semibold border',
                        getResourceTypeStyle(reservation.resource_type)
                      )}>
                        {getResourceTypeLabel(reservation.resource_type)}
                      </span>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-2">
                        {format(parseISO(reservation.start_time), 'HH:mm')} - {format(parseISO(reservation.end_time), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        reservation={selectedReservation}
        mode={modalMode}
        defaultResourceType={defaultResourceType}
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
    </div>
  );
}
