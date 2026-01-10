'use client';

import { useState, useEffect } from 'react';
import { format, parseISO, addDays, addWeeks, addMonths, addYears, isBefore, isAfter } from 'date-fns';
import { X, Calendar, Clock, Building, Car, Package, FileText, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  Reservation, 
  CreateReservationPayload, 
  ReservationResourceType,
  MeetingRoom,
  Vehicle,
  Equipment,
} from '../types';
import type { Project, TaskItem } from '@/features/erp/types';
import { ParticipantSelector, type Participant } from './ParticipantSelector';
import { RecurrenceSelector, defaultRecurrenceSettings, type RecurrenceSettings } from './RecurrenceSelector';

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

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation?: Reservation | null;
  mode: 'create' | 'view' | 'edit';
  defaultResourceType?: ReservationResourceType;
  defaultResourceId?: number;
  defaultDate?: Date;
  meetingRooms: MeetingRoom[];
  vehicles: Vehicle[];
  equipment: Equipment[];
  projects: Project[];
  tasks: TaskItem[];
  currentUserId?: string;
  isAdmin?: boolean;
  onSubmit: (payload: CreateReservationPayload) => Promise<void>;
  onCancel?: (id: number) => Promise<void>;
  fixedResourceType?: ReservationResourceType;
  hideResourceTypeSelector?: boolean;
  title?: string;
  users?: AppUser[];
  partners?: Partner[];
}

export function ReservationModal({
  isOpen,
  onClose,
  reservation,
  mode,
  defaultResourceType = 'meeting_room',
  defaultResourceId,
  defaultDate,
  meetingRooms,
  vehicles,
  equipment,
  projects,
  tasks,
  currentUserId,
  isAdmin,
  onSubmit,
  onCancel,
  fixedResourceType,
  hideResourceTypeSelector = false,
  title: modalTitle,
  users = [],
  partners = [],
}: ReservationModalProps) {
  const effectiveResourceType = fixedResourceType || defaultResourceType;
  const [isEditing, setIsEditing] = useState(mode === 'create' || mode === 'edit');
  const [resourceType, setResourceType] = useState<ReservationResourceType>(
    reservation?.resource_type || fixedResourceType || defaultResourceType
  );
  const [resourceId, setResourceId] = useState<number | ''>(
    reservation?.resource_id || defaultResourceId || ''
  );
  const [projectId, setProjectId] = useState<number | ''>(
    reservation?.project_id || ''
  );
  const [taskId, setTaskId] = useState<number | ''>(
    reservation?.task_id || ''
  );
  const [title, setTitle] = useState(reservation?.title || '');
  const [startDate, setStartDate] = useState(
    reservation?.start_time
      ? format(parseISO(reservation.start_time), 'yyyy-MM-dd')
      : defaultDate
        ? format(defaultDate, 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd')
  );
  const [startTime, setStartTime] = useState(
    reservation?.start_time
      ? format(parseISO(reservation.start_time), 'HH:mm')
      : '09:00'
  );
  const [endDate, setEndDate] = useState(
    reservation?.end_time
      ? format(parseISO(reservation.end_time), 'yyyy-MM-dd')
      : defaultDate
        ? format(defaultDate, 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd')
  );
  const [endTime, setEndTime] = useState(
    reservation?.end_time
      ? format(parseISO(reservation.end_time), 'HH:mm')
      : '10:00'
  );
  const [notes, setNotes] = useState(reservation?.notes || '');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceSettings>(defaultRecurrenceSettings);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (reservation) {
      setResourceType(reservation.resource_type);
      setResourceId(reservation.resource_id);
      setProjectId(reservation.project_id || '');
      setTaskId(reservation.task_id || '');
      setTitle(reservation.title);
      setStartDate(format(parseISO(reservation.start_time), 'yyyy-MM-dd'));
      setStartTime(format(parseISO(reservation.start_time), 'HH:mm'));
      setEndDate(format(parseISO(reservation.end_time), 'yyyy-MM-dd'));
      setEndTime(format(parseISO(reservation.end_time), 'HH:mm'));
      setNotes(reservation.notes || '');
    }
  }, [reservation]);

  const canEdit = mode === 'create' || (reservation && (reservation.reserver_id === currentUserId || isAdmin));
  const canCancel = reservation && (reservation.reserver_id === currentUserId || isAdmin) && reservation.status === 'active';

  const getResourceOptions = () => {
    switch (resourceType) {
      case 'meeting_room':
        return meetingRooms.filter((r) => r.is_active).map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
        }));
      case 'vehicle':
        return vehicles.filter((v) => v.is_active).map((v) => ({
          id: v.id,
          name: `${v.name} (${v.license_plate})`,
          description: v.description,
        }));
      case 'equipment':
        return equipment.filter((e) => e.status === 'available').map((e) => ({
          id: e.id,
          name: e.name,
          description: e.category,
        }));
      default:
        return [];
    }
  };

  const filteredTasks = projectId 
    ? tasks.filter((t) => String(t.projectId) === String(projectId))
    : tasks;

  const generateRecurringDates = (
    baseStartDate: Date,
    baseEndDate: Date,
    settings: RecurrenceSettings
  ): Array<{ start: Date; end: Date }> => {
    if (settings.type === 'none') {
      return [{ start: baseStartDate, end: baseEndDate }];
    }

    const dates: Array<{ start: Date; end: Date }> = [];
    const duration = baseEndDate.getTime() - baseStartDate.getTime();
    const endLimit = settings.hasEndDate && settings.endDate
      ? new Date(settings.endDate + 'T23:59:59')
      : addYears(baseStartDate, 1);

    let currentStart = baseStartDate;
    const maxOccurrences = 365;

    while (dates.length < maxOccurrences && !isAfter(currentStart, endLimit)) {
      if (settings.type === 'weekly') {
        const dayOfWeek = currentStart.getDay();
        if (settings.weekDays.includes(dayOfWeek)) {
          dates.push({
            start: currentStart,
            end: new Date(currentStart.getTime() + duration),
          });
        }
        currentStart = addDays(currentStart, 1);
        
        const daysFromStart = Math.floor((currentStart.getTime() - baseStartDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysFromStart > 0 && daysFromStart % 7 === 0 && settings.interval > 1) {
          currentStart = addDays(currentStart, 7 * (settings.interval - 1));
        }
      } else {
        dates.push({
          start: currentStart,
          end: new Date(currentStart.getTime() + duration),
        });
        
        switch (settings.type) {
          case 'daily':
            currentStart = addDays(currentStart, settings.interval);
            break;
          case 'monthly':
            currentStart = addMonths(currentStart, settings.interval);
            break;
          case 'yearly':
            currentStart = addYears(currentStart, settings.interval);
            break;
        }
      }
    }

    return dates;
  };

  const handleSubmit = async () => {
    if (!resourceId) {
      setError('리소스를 선택해주세요.');
      return;
    }
    if (!title.trim()) {
      setError('예약 목적을 입력해주세요.');
      return;
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      setError('시작/종료 일시를 입력해주세요.');
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(`${endDate}T${endTime}:00`);

    if (endDateTime <= startDateTime) {
      setError('종료 시간은 시작 시간보다 이후여야 합니다.');
      return;
    }

    if (recurrence.type === 'weekly' && recurrence.weekDays.length === 0) {
      setError('반복할 요일을 최소 1개 선택해주세요.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const recurringDates = generateRecurringDates(startDateTime, endDateTime, recurrence);
      
      for (const { start, end } of recurringDates) {
        await onSubmit({
          resource_type: resourceType,
          resource_id: Number(resourceId),
          project_id: projectId ? Number(projectId) : null,
          task_id: taskId ? Number(taskId) : null,
          title: title.trim(),
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '예약 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!reservation || !onCancel) return;
    if (!confirm('정말로 이 예약을 취소하시겠습니까?')) return;

    setIsSubmitting(true);
    try {
      await onCancel(reservation.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '예약 취소 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {modalTitle || (mode === 'create' ? '새 예약' : isEditing ? '예약 수정' : '예약 상세')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {!hideResourceTypeSelector && !fixedResourceType && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">리소스 종류</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'meeting_room' as const, icon: Building, label: '회의실' },
                  { type: 'equipment' as const, icon: Package, label: '장비' },
                  { type: 'vehicle' as const, icon: Car, label: '차량' },
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      if (!isEditing) return;
                      setResourceType(type);
                      setResourceId('');
                    }}
                    disabled={!isEditing}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition',
                      resourceType === type
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700',
                      !isEditing && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {resourceType === 'meeting_room' ? '회의실' : resourceType === 'vehicle' ? '차량' : '장비'} 선택
            </label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value ? Number(e.target.value) : '')}
              disabled={!isEditing}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
            >
              <option value="">선택하세요</option>
              {getResourceOptions().map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name} {opt.description ? `- ${opt.description}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              <FileText className="inline h-4 w-4 mr-1" />
              예약 목적 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isEditing}
              placeholder="예약 목적을 입력하세요"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">연결 프로젝트</label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value ? Number(e.target.value) : '');
                  setTaskId('');
                }}
                disabled={!isEditing}
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
                disabled={!isEditing}
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
              시작 일시 *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!isEditing}
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={!isEditing}
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Clock className="inline h-4 w-4 mr-1" />
              종료 일시 *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!isEditing}
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!isEditing}
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {mode === 'create' && (
            <RecurrenceSelector
              value={recurrence}
              onChange={setRecurrence}
              startDate={startDate ? new Date(startDate) : new Date()}
              disabled={!isEditing}
            />
          )}

          {resourceType === 'meeting_room' && (
            <ParticipantSelector
              users={users}
              partners={partners}
              selectedParticipants={participants}
              onChange={setParticipants}
              disabled={!isEditing}
            />
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">메모</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!isEditing}
              placeholder="추가 메모사항"
              rows={2}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm resize-none"
            />
          </div>

          {!isEditing && reservation && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-4 space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                예약자: <span className="font-semibold text-slate-700 dark:text-slate-300">{reservation.reserver?.name}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                상태: <span className={cn(
                  'font-semibold',
                  reservation.status === 'active' ? 'text-green-600' : 'text-red-500'
                )}>
                  {reservation.status === 'active' ? '예약중' : '취소됨'}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 p-6">
          <div>
            {canCancel && !isEditing && (
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                예약 취소
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isEditing && canEdit && mode !== 'create' && (
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                수정
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              {isEditing ? '취소' : '닫기'}
            </button>
            {isEditing && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSubmitting ? '처리 중...' : mode === 'create' ? '예약하기' : '저장'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
