'use client';

import { useState, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { Plus, Settings, Calendar, List, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useVehicles,
  useMeetingRooms,
  useEquipmentList,
  useReservations,
  useCreateReservation,
  useCancelReservation,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useCreateMeetingRoom,
  useUpdateMeetingRoom,
  useDeleteMeetingRoom,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
} from '../hooks';
import { ReservationModal } from './ReservationModal';
import { ResourceManageModal } from './ResourceManageModal';
import { MonthlyCalendar } from './MonthlyCalendar';
import { ReservationList } from './ReservationList';
import { DayDetailModal } from './DayDetailModal';
import type { Reservation, CreateReservationPayload, Vehicle } from '../types';
import type { Project, TaskItem } from '@/features/erp/types';

interface VehicleLogViewProps {
  projects: Project[];
  tasks: TaskItem[];
  currentUserId: string;
  isAdmin: boolean;
}

export function VehicleLogView({
  projects,
  tasks,
  currentUserId,
  isAdmin,
}: VehicleLogViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'view'>('create');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | undefined>();

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const { data: vehicles = [] } = useVehicles();
  const { data: meetingRooms = [] } = useMeetingRooms();
  const { data: equipment = [] } = useEquipmentList();
  const { data: reservations = [], isLoading } = useReservations({
    resource_type: 'vehicle',
    start_date: format(subMonths(monthStart, 1), 'yyyy-MM-dd'),
    end_date: format(addMonths(monthEnd, 1), 'yyyy-MM-dd'),
    status: 'active',
  });

  const createReservationMutation = useCreateReservation();
  const cancelReservationMutation = useCancelReservation();
  const createVehicleMutation = useCreateVehicle();
  const updateVehicleMutation = useUpdateVehicle();
  const deleteVehicleMutation = useDeleteVehicle();
  const createMeetingRoomMutation = useCreateMeetingRoom();
  const updateMeetingRoomMutation = useUpdateMeetingRoom();
  const deleteMeetingRoomMutation = useDeleteMeetingRoom();
  const createEquipmentMutation = useCreateEquipment();
  const updateEquipmentMutation = useUpdateEquipment();
  const deleteEquipmentMutation = useDeleteEquipment();

  const getResourceName = useCallback((resourceType: string, resourceId: number): string => {
    if (resourceType === 'vehicle') {
      const vehicle = vehicles.find((v) => v.id === resourceId);
      return vehicle ? `${vehicle.name} (${vehicle.license_plate})` : `차량 #${resourceId}`;
    }
    return `#${resourceId}`;
  }, [vehicles]);

  const getVehicleStatus = (vehicle: Vehicle): { label: string; color: string; inUse: boolean } => {
    const now = new Date();
    const activeReservation = reservations.find(
      (r) => r.resource_id === vehicle.id && 
             new Date(r.start_time) <= now && 
             new Date(r.end_time) >= now
    );

    if (activeReservation) {
      return { label: '운행중', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', inUse: true };
    }
    return { label: '대기중', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', inUse: false };
  };

  const handleOpenCreateModal = (vehicleId?: number) => {
    setIsDayDetailModalOpen(false);
    setSelectedReservation(null);
    setSelectedVehicleId(vehicleId);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (reservation: Reservation) => {
    setIsDayDetailModalOpen(false);
    setSelectedReservation(reservation);
    setSelectedVehicleId(undefined);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
            <Car className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">차량 일지</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              법인 차량 {vehicles.filter(v => v.is_active).length}대
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Settings className="h-4 w-4" />
              차량 관리
            </button>
          )}
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition"
          >
            <Plus className="h-4 w-4" />
            차량 예약
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vehicles.filter(v => v.is_active).map((vehicle) => {
          const status = getVehicleStatus(vehicle);
          const activeReservation = reservations.find(
            (r) => r.resource_id === vehicle.id && 
                   new Date(r.start_time) <= new Date() && 
                   new Date(r.end_time) >= new Date()
          );

          return (
            <div
              key={vehicle.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <Car className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{vehicle.name}</p>
                    <p className="text-sm font-mono text-slate-500 dark:text-slate-400">{vehicle.license_plate}</p>
                  </div>
                </div>
                <span className={cn('px-3 py-1 rounded-full text-xs font-semibold', status.color)}>
                  {status.label}
                </span>
              </div>

              {activeReservation && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{activeReservation.title}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {activeReservation.reserver?.name} · {format(parseISO(activeReservation.start_time), 'HH:mm')} - {format(parseISO(activeReservation.end_time), 'HH:mm')}
                  </p>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {!status.inUse ? (
                  <button
                    onClick={() => handleOpenCreateModal(vehicle.id)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 transition"
                  >
                    <Plus className="h-4 w-4" />
                    예약하기
                  </button>
                ) : (
                  <button
                    onClick={() => activeReservation && handleOpenViewModal(activeReservation)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
                  >
                    상세보기
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">운행 기록</h3>
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
            resourceType="vehicle"
          />
        ) : (
          <ReservationList
            reservations={reservations}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onReservationClick={handleOpenViewModal}
            onAddClick={() => handleOpenCreateModal()}
            getResourceName={getResourceName}
            isLoading={isLoading}
            emptyMessage="차량 운행 기록이 없습니다."
            addButtonLabel="차량 예약"
            resourceType="vehicle"
          />
        )}
      </div>

      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVehicleId(undefined);
        }}
        reservation={selectedReservation}
        mode={modalMode}
        fixedResourceType="vehicle"
        hideResourceTypeSelector
        defaultResourceId={selectedVehicleId}
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
        title={modalMode === 'create' ? '차량 예약' : '운행 상세'}
      />

      <ResourceManageModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        type="vehicle"
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
        onAddClick={() => handleOpenCreateModal()}
        onReservationClick={handleOpenViewModal}
        getResourceName={getResourceName}
      />
    </div>
  );
}
