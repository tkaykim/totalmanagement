'use client';

import { useMemo } from 'react';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Building, Package, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Reservation, ReservationResourceType } from '../types';

interface MonthlyCalendarProps {
  reservations: Reservation[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  getResourceName: (resourceType: string, resourceId: number) => string;
  onReservationClick?: (reservation: Reservation) => void;
  resourceType?: ReservationResourceType;
}

export function MonthlyCalendar({
  reservations,
  selectedDate,
  onDateSelect,
  onMonthChange,
  getResourceName,
  onReservationClick,
  resourceType,
}: MonthlyCalendarProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['월', '화', '수', '목', '금', '토', '일'];

  const getReservationsForDay = (day: Date) => {
    return reservations.filter((r) => {
      const startDate = parseISO(r.start_time);
      const endDate = parseISO(r.end_time);
      return isSameDay(startDate, day) || 
             isSameDay(endDate, day) ||
             (startDate < day && endDate > day);
    });
  };

  const getResourceIcon = (type: ReservationResourceType) => {
    switch (type) {
      case 'meeting_room': return Building;
      case 'equipment': return Package;
      case 'vehicle': return Car;
    }
  };

  const getResourceColor = (type: ReservationResourceType) => {
    switch (type) {
      case 'meeting_room': return 'bg-blue-500';
      case 'equipment': return 'bg-emerald-500';
      case 'vehicle': return 'bg-amber-500';
    }
  };

  return (
    <div className="rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 sm:p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <button
          onClick={() => onMonthChange(subMonths(selectedDate, 1))}
          className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <div className="flex items-center gap-2 sm:gap-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
            {format(selectedDate, 'yyyy년 M월', { locale: ko })}
          </h3>
          <button
            onClick={() => onMonthChange(new Date())}
            className={cn(
              'px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-medium transition',
              isSameMonth(selectedDate, new Date())
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
            )}
          >
            오늘
          </button>
        </div>
        <button
          onClick={() => onMonthChange(addMonths(selectedDate, 1))}
          className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
        {weekDays.map((day, idx) => (
          <div
            key={day}
            className={cn(
              'py-1.5 sm:p-2 text-center text-[10px] sm:text-xs font-semibold',
              idx === 5 ? 'text-blue-600 dark:text-blue-400' : '',
              idx === 6 ? 'text-red-500 dark:text-red-400' : '',
              idx < 5 ? 'text-slate-500 dark:text-slate-400' : ''
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const dayReservations = getReservationsForDay(day);
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isSelected = isSameDay(day, selectedDate);
          const dayOfWeek = day.getDay();
          const isSaturday = dayOfWeek === 6;
          const isSunday = dayOfWeek === 0;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                'min-h-[60px] sm:min-h-[100px] p-0.5 sm:p-1 border-b border-r border-slate-100 dark:border-slate-700/50 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/30',
                !isCurrentMonth && 'bg-slate-50/50 dark:bg-slate-900/30',
                isSelected && 'bg-blue-50 dark:bg-blue-900/20',
                idx % 7 === 6 && 'border-r-0'
              )}
            >
              <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 text-[10px] sm:text-xs font-semibold rounded-full',
                    isToday(day) && 'bg-blue-600 text-white',
                    !isToday(day) && isSelected && 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
                    !isToday(day) && !isSelected && isCurrentMonth && isSaturday && 'text-blue-600 dark:text-blue-400',
                    !isToday(day) && !isSelected && isCurrentMonth && isSunday && 'text-red-500 dark:text-red-400',
                    !isToday(day) && !isSelected && isCurrentMonth && !isSaturday && !isSunday && 'text-slate-700 dark:text-slate-300',
                    !isCurrentMonth && 'text-slate-300 dark:text-slate-600'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayReservations.length > 0 && (
                  <span className="text-[8px] sm:text-[10px] font-medium text-slate-400 dark:text-slate-500 hidden sm:inline">
                    {dayReservations.length}건
                  </span>
                )}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayReservations.slice(0, 2).map((r) => {
                  const Icon = getResourceIcon(r.resource_type);
                  return (
                    <div
                      key={r.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReservationClick?.(r);
                      }}
                      className={cn(
                        'flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-medium truncate cursor-pointer hover:opacity-80 transition',
                        r.resource_type === 'meeting_room' && 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
                        r.resource_type === 'equipment' && 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
                        r.resource_type === 'vehicle' && 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
                      )}
                    >
                      <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                      <span className="truncate hidden sm:inline">{r.title}</span>
                    </div>
                  );
                })}
                {dayReservations.length > 2 && (
                  <p className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500 pl-0.5 sm:pl-1">
                    +{dayReservations.length - 2}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
