'use client';

import { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { Plus, Package, Calendar, List, Settings, Check, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useEquipmentList,
  useMeetingRooms,
  useVehicles,
  useReservations,
  useCreateReservation,
  useCancelReservation,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  useCreateMeetingRoom,
  useUpdateMeetingRoom,
  useDeleteMeetingRoom,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
} from '../hooks';
import { ReservationModal } from './ReservationModal';
import { ResourceManageModal } from './ResourceManageModal';
import { MonthlyCalendar } from './MonthlyCalendar';
import { ReservationList } from './ReservationList';
import { DayDetailModal } from './DayDetailModal';
import { MultiEquipmentRentalModal } from './MultiEquipmentRentalModal';
import type { Reservation, CreateReservationPayload, Equipment } from '../types';
import type { Project, TaskItem } from '@/features/erp/types';

interface EquipmentRentalViewProps {
  projects: Project[];
  tasks: TaskItem[];
  currentUserId: string;
  isAdmin: boolean;
}

export function EquipmentRentalView({
  projects,
  tasks,
  currentUserId,
  isAdmin,
}: EquipmentRentalViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'view'>('create');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const { data: equipment = [] } = useEquipmentList();
  const { data: meetingRooms = [] } = useMeetingRooms();
  const { data: vehicles = [] } = useVehicles();
  const { data: reservations = [], isLoading } = useReservations({
    resource_type: 'equipment',
    start_date: format(subMonths(monthStart, 1), 'yyyy-MM-dd'),
    end_date: format(addMonths(monthEnd, 1), 'yyyy-MM-dd'),
    status: 'active',
  });

  const createReservationMutation = useCreateReservation();
  const cancelReservationMutation = useCancelReservation();
  const createEquipmentMutation = useCreateEquipment();
  const updateEquipmentMutation = useUpdateEquipment();
  const deleteEquipmentMutation = useDeleteEquipment();
  const createMeetingRoomMutation = useCreateMeetingRoom();
  const updateMeetingRoomMutation = useUpdateMeetingRoom();
  const deleteMeetingRoomMutation = useDeleteMeetingRoom();
  const createVehicleMutation = useCreateVehicle();
  const updateVehicleMutation = useUpdateVehicle();
  const deleteVehicleMutation = useDeleteVehicle();

  const categories = useMemo(() => {
    const cats = [...new Set(equipment.map((e) => e.category))];
    return cats.sort();
  }, [equipment]);

  const filteredEquipment = useMemo(() => {
    let result = equipment;
    
    // 카테고리 필터
    if (categoryFilter !== 'all') {
      result = result.filter((e) => e.category === categoryFilter);
    }
    
    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) => 
        e.name.toLowerCase().includes(query) || 
        e.category.toLowerCase().includes(query) ||
        (e.serial_number && e.serial_number.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [equipment, categoryFilter, searchQuery]);

  // 검색 결과에서 카테고리 목록
  const searchResultCategories = useMemo(() => {
    const cats = [...new Set(filteredEquipment.map((e) => e.category))];
    return cats.sort();
  }, [filteredEquipment]);

  const getResourceName = useCallback((resourceType: string, resourceId: number): string => {
    if (resourceType === 'equipment') {
      const item = equipment.find((e) => e.id === resourceId);
      return item ? `${item.name} (${item.category})` : `장비 #${resourceId}`;
    }
    return `#${resourceId}`;
  }, [equipment]);

  const getEquipmentStatus = (eq: Equipment): { 
    label: string; 
    color: string; 
    rented: boolean; 
    totalQty: number;
    rentedQty: number;
    availableQty: number;
  } => {
    const now = new Date();
    const totalQty = eq.quantity || 1;
    
    // 현재 대여중인 수량 계산
    const activeReservations = reservations.filter(
      (r) => r.resource_id === eq.id && 
             new Date(r.start_time) <= now && 
             new Date(r.end_time) >= now
    );
    const rentedQty = activeReservations.reduce((sum, r) => sum + (r.quantity || 1), 0);
    const availableQty = Math.max(0, totalQty - rentedQty);

    if (eq.status === 'maintenance') {
      return { label: '정비중', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', rented: false, totalQty, rentedQty: 0, availableQty: 0 };
    }
    if (eq.status === 'lost') {
      return { label: '분실', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', rented: false, totalQty, rentedQty: 0, availableQty: 0 };
    }
    if (availableQty === 0) {
      return { label: '전량 대여중', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', rented: true, totalQty, rentedQty, availableQty };
    }
    if (rentedQty > 0) {
      return { label: `${availableQty}/${totalQty} 가능`, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', rented: false, totalQty, rentedQty, availableQty };
    }
    return { label: totalQty > 1 ? `${totalQty}개 가능` : '대여 가능', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', rented: false, totalQty, rentedQty, availableQty };
  };

  const toggleEquipmentSelection = (id: number) => {
    setSelectedEquipmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedEquipmentIds(new Set());
  };

  const availableEquipment = useMemo(() => {
    return filteredEquipment.filter((eq) => {
      const status = getEquipmentStatus(eq);
      return status.availableQty > 0 && eq.status === 'available';
    });
  }, [filteredEquipment, reservations]);

  const selectedEquipmentList = useMemo(() => {
    return equipment.filter((eq) => selectedEquipmentIds.has(eq.id));
  }, [equipment, selectedEquipmentIds]);

  const handleOpenMultiModal = () => {
    setIsMultiModalOpen(true);
  };

  const handleOpenMultiModalFromDayDetail = () => {
    setIsDayDetailModalOpen(false);
    setIsMultiModalOpen(true);
  };

  const handleAddEquipmentToSelection = (id: number) => {
    setSelectedEquipmentIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleOpenCreateModal = (equipmentId?: number) => {
    setIsDayDetailModalOpen(false);
    setSelectedReservation(null);
    setSelectedEquipmentId(equipmentId);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (reservation: Reservation) => {
    setIsDayDetailModalOpen(false);
    setSelectedReservation(reservation);
    setSelectedEquipmentId(undefined);
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
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">장비 대여/반납</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {equipment.filter(e => e.status === 'available').length}개 대여 가능
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
              장비 관리
            </button>
          )}
        </div>
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="장비명, 카테고리, 시리얼 검색..."
          className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* 검색하지 않았을 때 안내 */}
      {!searchQuery.trim() && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-6 text-center">
          <Search className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">장비를 검색하여 선택하세요</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            총 {equipment.length}개 장비 · {categories.length}개 카테고리
          </p>
        </div>
      )}

      {/* 검색했을 때 결과 표시 */}
      {searchQuery.trim() && (
        <>
          {/* 카테고리 필터 */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCategoryFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition',
                categoryFilter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              )}
            >
              전체 ({filteredEquipment.length})
            </button>
            {searchResultCategories.map((cat) => {
              const count = filteredEquipment.filter((e) => e.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition',
                    categoryFilter === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  )}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* 장비 목록 */}
          {filteredEquipment.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">검색 결과가 없습니다</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
              {filteredEquipment.map((eq) => {
                const status = getEquipmentStatus(eq);
                const isSelected = selectedEquipmentIds.has(eq.id);
                const isAvailable = status.availableQty > 0 && eq.status === 'available';
                const hasRentedUnits = status.rentedQty > 0;

                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => {
                      if (isAvailable) {
                        toggleEquipmentSelection(eq.id);
                      } else if (hasRentedUnits || status.rented) {
                        const activeRes = reservations.find(
                          (r) => r.resource_id === eq.id && 
                                 new Date(r.start_time) <= new Date() && 
                                 new Date(r.end_time) >= new Date()
                        );
                        if (activeRes) handleOpenViewModal(activeRes);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition',
                      isSelected 
                        ? 'bg-emerald-50 dark:bg-emerald-900/30' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                      isAvailable && 'cursor-pointer',
                      (hasRentedUnits || status.rented) && 'cursor-pointer'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition',
                      isSelected 
                        ? 'bg-emerald-500 border-emerald-500' 
                        : isAvailable 
                          ? 'border-slate-300 dark:border-slate-600' 
                          : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-medium text-sm',
                          isAvailable ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
                        )}>
                          {eq.name}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
                          {eq.category}
                        </span>
                      </div>
                      {eq.serial_number && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {eq.serial_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {status.totalQty > 1 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {status.availableQty}/{status.totalQty}
                        </span>
                      )}
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap', status.color)}>
                        {status.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {selectedEquipmentIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-slate-900 dark:bg-slate-700 shadow-2xl px-4 py-2 sm:px-6 sm:py-3">
          <span className="text-sm sm:text-base text-white font-medium">
            {selectedEquipmentIds.size}개 선택됨
          </span>
          <button
            onClick={clearSelection}
            className="p-1.5 rounded-full hover:bg-slate-700 dark:hover:bg-slate-600 transition"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
          <button
            onClick={handleOpenMultiModal}
            className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 sm:px-5 sm:py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition"
          >
            <Plus className="h-4 w-4" />
            대여 신청
          </button>
        </div>
      )}

      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">대여 기록</h3>
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
            resourceType="equipment"
          />
        ) : (
          <ReservationList
            reservations={reservations}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onReservationClick={handleOpenViewModal}
            getResourceName={getResourceName}
            isLoading={isLoading}
            emptyMessage="장비 대여 기록이 없습니다."
            resourceType="equipment"
          />
        )}
      </div>

      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEquipmentId(undefined);
        }}
        reservation={selectedReservation}
        mode={modalMode}
        fixedResourceType="equipment"
        hideResourceTypeSelector
        defaultResourceId={selectedEquipmentId}
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
        title={modalMode === 'create' ? '장비 대여' : '대여 상세'}
      />

      <MultiEquipmentRentalModal
        isOpen={isMultiModalOpen}
        onClose={() => {
          setIsMultiModalOpen(false);
          clearSelection();
        }}
        selectedEquipment={selectedEquipmentList}
        allEquipment={equipment}
        projects={projects}
        tasks={tasks}
        reservations={reservations}
        defaultDate={selectedDate}
        onSubmit={handleSubmitReservation}
        onRemoveEquipment={(id) => toggleEquipmentSelection(id)}
        onAddEquipment={handleAddEquipmentToSelection}
      />

      <DayDetailModal
        isOpen={isDayDetailModalOpen}
        onClose={() => setIsDayDetailModalOpen(false)}
        date={selectedDate}
        reservations={reservations}
        onAddClick={handleOpenMultiModalFromDayDetail}
        getResourceName={getResourceName}
      />

      <ResourceManageModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        type="equipment"
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
