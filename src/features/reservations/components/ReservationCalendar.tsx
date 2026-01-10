'use client';

import { useMemo } from 'react';
import { format, parseISO, isSameDay, startOfDay, addDays, eachDayOfInterval, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Reservation } from '../types';

interface ReservationCalendarProps {
  reservations: Reservation[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  getResourceName: (resourceType: string, resourceId: number) => string;
  onReservationClick?: (reservation: Reservation) => void;
}

export function ReservationCalendar({
  reservations,
  selectedDate,
  onDateSelect,
  getResourceName,
  onReservationClick,
}: ReservationCalendarProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const hours = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => i + 8);
  }, []);

  const dayReservations = useMemo(() => {
    return reservations.filter((r) => {
      const startDate = parseISO(r.start_time);
      const endDate = parseISO(r.end_time);
      return weekDays.some((day) =>
        isWithinInterval(day, { start: startOfDay(startDate), end: startOfDay(endDate) }) ||
        isSameDay(day, startDate) ||
        isSameDay(day, endDate)
      );
    });
  }, [reservations, weekDays]);

  const getReservationsForDayAndHour = (day: Date, hour: number) => {
    return dayReservations.filter((r) => {
      const startDate = parseISO(r.start_time);
      const endDate = parseISO(r.end_time);
      const slotStart = new Date(day);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(day);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      return (
        isSameDay(startDate, day) &&
        startDate.getHours() === hour
      );
    });
  };

  const getReservationStyle = (resourceType: string) => {
    switch (resourceType) {
      case 'meeting_room':
        return 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200';
      case 'equipment':
        return 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200';
      case 'vehicle':
        return 'bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200';
      default:
        return 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <button
          onClick={() => onDateSelect(addDays(selectedDate, -7))}
          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          {format(weekStart, 'yyyy년 M월', { locale: ko })}
        </h3>
        <button
          onClick={() => onDateSelect(addDays(selectedDate, 7))}
          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-700">
            <div className="p-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
              시간
            </div>
            {weekDays.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => onDateSelect(day)}
                className={cn(
                  'p-2 text-center transition hover:bg-slate-100 dark:hover:bg-slate-700',
                  isSameDay(day, selectedDate) && 'bg-blue-50 dark:bg-blue-900/30'
                )}
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {format(day, 'EEE', { locale: ko })}
                </p>
                <p
                  className={cn(
                    'text-sm font-bold',
                    isSameDay(day, new Date())
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-800 dark:text-slate-200'
                  )}
                >
                  {format(day, 'd')}
                </p>
              </button>
            ))}
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-slate-100 dark:border-slate-700/50">
                <div className="p-2 text-xs text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 text-center">
                  {hour}:00
                </div>
                {weekDays.map((day) => {
                  const slotReservations = getReservationsForDayAndHour(day, hour);
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="p-1 min-h-[48px] border-r border-slate-100 dark:border-slate-700/50 last:border-r-0"
                    >
                      {slotReservations.map((r) => {
                        const startDate = parseISO(r.start_time);
                        const endDate = parseISO(r.end_time);
                        const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
                        return (
                          <button
                            key={r.id}
                            onClick={() => onReservationClick?.(r)}
                            className={cn(
                              'w-full text-left px-2 py-1 rounded-lg border text-[10px] font-medium truncate transition hover:opacity-80',
                              getReservationStyle(r.resource_type)
                            )}
                            style={{ minHeight: `${Math.min(durationHours, 4) * 40}px` }}
                            title={`${r.title} (${getResourceName(r.resource_type, r.resource_id)})`}
                          >
                            <p className="truncate font-semibold">{r.title}</p>
                            <p className="truncate opacity-75">
                              {getResourceName(r.resource_type, r.resource_id)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
