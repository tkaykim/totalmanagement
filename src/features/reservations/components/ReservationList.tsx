'use client';

import { format, parseISO, isSameDay, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, Plus, Building, Package, Car, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Reservation, ReservationResourceType } from '../types';

interface ReservationListProps {
  reservations: Reservation[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onReservationClick: (reservation: Reservation) => void;
  onAddClick?: () => void;
  getResourceName: (resourceType: string, resourceId: number) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  addButtonLabel?: string;
  resourceType?: ReservationResourceType;
}

export function ReservationList({
  reservations,
  selectedDate,
  onDateChange,
  onReservationClick,
  onAddClick,
  getResourceName,
  isLoading = false,
  emptyMessage = '예약이 없습니다.',
  addButtonLabel = '예약하기',
  resourceType,
}: ReservationListProps) {
  const todayReservations = reservations.filter((r) => {
    const startDate = parseISO(r.start_time);
    return isSameDay(startDate, selectedDate);
  });

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

  const getResourceIcon = (type: ReservationResourceType) => {
    switch (type) {
      case 'meeting_room': return Building;
      case 'equipment': return Package;
      case 'vehicle': return Car;
    }
  };

  const prevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prevDay}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {format(selectedDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}
          </h3>
          <button
            onClick={nextDay}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => onDateChange(new Date())}
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

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">목록을 불러오는 중...</p>
        </div>
      ) : todayReservations.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <Calendar className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {format(selectedDate, 'M월 d일', { locale: ko })}에 {emptyMessage}
          </p>
          {onAddClick && (
            <button
              onClick={onAddClick}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              {addButtonLabel}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {todayReservations.map((reservation) => {
            const Icon = getResourceIcon(reservation.resource_type);
            return (
              <button
                key={reservation.id}
                onClick={() => onReservationClick(reservation)}
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
                      <Icon className={cn(
                        'h-5 w-5',
                        reservation.resource_type === 'meeting_room' && 'text-blue-600 dark:text-blue-400',
                        reservation.resource_type === 'equipment' && 'text-emerald-600 dark:text-emerald-400',
                        reservation.resource_type === 'vehicle' && 'text-amber-600 dark:text-amber-400',
                      )} />
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
                    {!resourceType && (
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded text-[10px] font-semibold border',
                        getResourceTypeStyle(reservation.resource_type)
                      )}>
                        {getResourceTypeLabel(reservation.resource_type)}
                      </span>
                    )}
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-2">
                      {format(parseISO(reservation.start_time), 'HH:mm')} - {format(parseISO(reservation.end_time), 'HH:mm')}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
