'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { X, Package, Calendar, Clock, FileText, Trash2, Plus, Minus, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Equipment, CreateReservationPayload, Reservation } from '../types';
import type { Project, TaskItem } from '@/features/erp/types';

interface EquipmentWithAvailability extends Equipment {
  availableQty: number;
}

interface MultiEquipmentRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEquipment: Equipment[];
  allEquipment?: Equipment[];
  projects: Project[];
  tasks: TaskItem[];
  reservations?: Reservation[];
  defaultDate?: Date;
  onSubmit: (payload: CreateReservationPayload) => Promise<void>;
  onRemoveEquipment: (id: number) => void;
  onAddEquipment?: (id: number) => void;
}

export function MultiEquipmentRentalModal({
  isOpen,
  onClose,
  selectedEquipment,
  allEquipment = [],
  projects,
  tasks,
  reservations = [],
  defaultDate,
  onSubmit,
  onRemoveEquipment,
  onAddEquipment,
}: MultiEquipmentRentalModalProps) {
  const [projectId, setProjectId] = useState<number | ''>('');
  const [taskId, setTaskId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(format(defaultDate || new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState(format(defaultDate || new Date(), 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState('18:00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 기본 날짜 변경 시 업데이트
  useEffect(() => {
    if (defaultDate) {
      setStartDate(format(defaultDate, 'yyyy-MM-dd'));
      setEndDate(format(defaultDate, 'yyyy-MM-dd'));
    }
  }, [defaultDate]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 선택한 대여 기간
  const selectedStartDateTime = useMemo(() => {
    if (!startDate || !startTime) return null;
    return new Date(`${startDate}T${startTime}:00`);
  }, [startDate, startTime]);

  const selectedEndDateTime = useMemo(() => {
    if (!endDate || !endTime) return null;
    return new Date(`${endDate}T${endTime}:00`);
  }, [endDate, endTime]);

  // 선택한 기간과 겹치는 예약인지 확인
  const isOverlapping = useCallback((reservationStart: Date, reservationEnd: Date): boolean => {
    if (!selectedStartDateTime || !selectedEndDateTime) return false;
    // 두 기간이 겹치는 조건: 시작1 < 종료2 AND 종료1 > 시작2
    return reservationStart < selectedEndDateTime && reservationEnd > selectedStartDateTime;
  }, [selectedStartDateTime, selectedEndDateTime]);

  // 각 장비별 가용 수량 계산 (선택한 기간 기준)
  const equipmentWithAvailability = useMemo((): EquipmentWithAvailability[] => {
    return selectedEquipment.map((eq) => {
      // 선택한 기간과 겹치는 예약 찾기
      const overlappingReservations = reservations.filter((r) => {
        if (r.resource_id !== eq.id) return false;
        const resStart = new Date(r.start_time);
        const resEnd = new Date(r.end_time);
        return isOverlapping(resStart, resEnd);
      });
      const rentedQty = overlappingReservations.reduce((sum, r) => sum + (r.quantity || 1), 0);
      const availableQty = Math.max(0, (eq.quantity || 1) - rentedQty);
      return { ...eq, availableQty };
    });
  }, [selectedEquipment, reservations, isOverlapping]);

  // 선택된 장비 변경 시 수량 초기화
  useEffect(() => {
    const newQuantities: Record<number, number> = {};
    equipmentWithAvailability.forEach((eq) => {
      if (!(eq.id in quantities)) {
        newQuantities[eq.id] = Math.min(1, eq.availableQty);
      } else {
        newQuantities[eq.id] = Math.min(quantities[eq.id], eq.availableQty);
      }
    });
    setQuantities(newQuantities);
  }, [equipmentWithAvailability]);

  const updateQuantity = (id: number, delta: number) => {
    const eq = equipmentWithAvailability.find((e) => e.id === id);
    if (!eq) return;
    
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, Math.min(eq.availableQty, (prev[id] || 1) + delta)),
    }));
  };

  const filteredTasks = projectId 
    ? tasks.filter((t) => String(t.projectId) === String(projectId))
    : tasks;

  const totalItems = useMemo(() => {
    return Object.values(quantities).reduce((sum, q) => sum + q, 0);
  }, [quantities]);

  // 선택되지 않은 장비 중 검색 가능한 목록 (선택한 기간 기준 가용 수량)
  const availableToAdd = useMemo(() => {
    const selectedIds = new Set(selectedEquipment.map((eq) => eq.id));
    
    return allEquipment
      .filter((eq) => !selectedIds.has(eq.id) && eq.status === 'available')
      .map((eq) => {
        // 선택한 기간과 겹치는 예약 찾기
        const overlappingReservations = reservations.filter((r) => {
          if (r.resource_id !== eq.id) return false;
          const resStart = new Date(r.start_time);
          const resEnd = new Date(r.end_time);
          return isOverlapping(resStart, resEnd);
        });
        const rentedQty = overlappingReservations.reduce((sum, r) => sum + (r.quantity || 1), 0);
        const availableQty = Math.max(0, (eq.quantity || 1) - rentedQty);
        return { ...eq, availableQty };
      })
      .filter((eq) => eq.availableQty > 0)
      .filter((eq) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return eq.name.toLowerCase().includes(query) || eq.category.toLowerCase().includes(query);
      });
  }, [allEquipment, selectedEquipment, reservations, searchQuery, isOverlapping]);

  const handleAddEquipment = (id: number) => {
    if (onAddEquipment) {
      onAddEquipment(id);
      // 드롭다운을 닫지 않고 계속 선택할 수 있도록 함
    }
  };

  const handleSubmit = async () => {
    if (selectedEquipment.length === 0) {
      setError('선택된 장비가 없습니다.');
      return;
    }
    if (!title.trim()) {
      setError('대여 목적을 입력해주세요.');
      return;
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      setError('대여 기간을 입력해주세요.');
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(`${endDate}T${endTime}:00`);

    if (endDateTime <= startDateTime) {
      setError('반납 시간은 대여 시간보다 이후여야 합니다.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      for (const eq of selectedEquipment) {
        const qty = quantities[eq.id] || 1;
        if (qty > 0) {
          await onSubmit({
            resource_type: 'equipment',
            resource_id: eq.id,
            project_id: projectId ? Number(projectId) : null,
            task_id: taskId ? Number(taskId) : null,
            title: title.trim(),
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            quantity: qty,
            notes: notes.trim() || undefined,
          });
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '대여 신청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 p-4 sm:p-6 flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200">
              장비 일괄 대여
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedEquipment.length}개 장비 선택됨
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                선택된 장비 ({totalItems}개)
              </label>
            </div>
            
            {/* 선택된 장비 목록 */}
            {equipmentWithAvailability.length > 0 && (
              <div className="space-y-2">
                {equipmentWithAvailability.map((eq) => (
                  <div
                    key={eq.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate block">
                          {eq.name}
                        </span>
                        <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                          {eq.availableQty}개 대여가능 (총 {eq.quantity || 1}개)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {eq.availableQty > 1 && (
                        <div className="flex items-center gap-0.5 bg-white dark:bg-slate-700 rounded-lg border border-emerald-200 dark:border-emerald-700">
                          <button
                            type="button"
                            onClick={() => updateQuantity(eq.id, -1)}
                            disabled={(quantities[eq.id] || 1) <= 1}
                            className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-l-lg transition disabled:opacity-30"
                          >
                            <Minus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            {quantities[eq.id] || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(eq.id, 1)}
                            disabled={(quantities[eq.id] || 1) >= eq.availableQty}
                            className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-r-lg transition disabled:opacity-30"
                          >
                            <Plus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveEquipment(eq.id)}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 장비 검색/추가 드롭다운 */}
            {onAddEquipment && allEquipment.length > 0 && (
              <div ref={dropdownRef} className="relative">
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2 cursor-pointer transition',
                    isDropdownOpen 
                      ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20' 
                      : 'border-slate-300 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-700'
                  )}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(true);
                    }}
                    placeholder="장비 검색하여 추가..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                  <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', isDropdownOpen && 'rotate-180')} />
                </div>
                
                {isDropdownOpen && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                    {availableToAdd.length === 0 ? (
                      <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        {searchQuery ? '검색 결과가 없습니다' : '추가할 수 있는 장비가 없습니다'}
                      </div>
                    ) : (
                      availableToAdd.map((eq) => (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => handleAddEquipment(eq.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{eq.name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {eq.category} · {eq.availableQty}개 가능
                            </p>
                          </div>
                          <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 장비가 없을 때 안내 */}
            {equipmentWithAvailability.length === 0 && !onAddEquipment && (
              <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
                선택된 장비가 없습니다
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              <FileText className="inline h-4 w-4 mr-1" />
              대여 목적 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 촬영 장비 대여, 행사 준비 등"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">연결 프로젝트</label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value ? Number(e.target.value) : '');
                  setTaskId('');
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              >
                <option value="">선택 안함</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">연결 할일</label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              >
                <option value="">선택 안함</option>
                {filteredTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Calendar className="inline h-4 w-4 mr-1" />
              대여 시작 *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Clock className="inline h-4 w-4 mr-1" />
              반납 예정 *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">메모</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="추가 메모사항 (선택)"
              rows={2}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700 p-4 sm:p-6 flex-shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedEquipment.length === 0 || totalItems === 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '처리 중...' : `${totalItems}개 장비 대여 신청`}
          </button>
        </div>
      </div>
    </div>
  );
}
