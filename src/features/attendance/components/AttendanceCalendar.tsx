'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAttendanceLogs, getAttendanceStats } from '../api';
import { formatWorkTime } from '../lib/workTimeCalculator';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isWeekend, parseISO, differenceInMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Coffee, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttendanceLog } from '@/types/database';

interface AttendanceCalendarProps {
  onSelectDate?: (date: string, log?: AttendanceLog) => void;
  userId?: string;
  userName?: string;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function AttendanceCalendar({ onSelectDate, userId, userName }: AttendanceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = format(monthStart, 'yyyy-MM-dd');
  const endDate = format(monthEnd, 'yyyy-MM-dd');

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['attendance-logs', startDate, endDate, userId],
    queryFn: () => getAttendanceLogs({ 
      start_date: startDate, 
      end_date: endDate,
      user_id: userId,
    }),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['attendance-stats', year, month, userId],
    queryFn: () => getAttendanceStats({ year, month, user_id: userId }),
  });

  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = monthStart.getDay();
    const prefixDays: null[] = Array(startDay).fill(null);
    return [...prefixDays, ...days];
  }, [monthStart, monthEnd]);

  const logsByDate = useMemo(() => {
    const map: Record<string, AttendanceLog[]> = {};
    logs.forEach((log) => {
      const dateKey = log.work_date;
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(log);
    });
    return map;
  }, [logs]);

  const calculateDayInfo = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayLogs = logsByDate[dateStr] || [];
    
    if (dayLogs.length === 0) {
      return null;
    }

    let totalWorkMinutes = 0;
    let totalBreakMinutes = 0;
    let firstCheckIn: string | null = null;
    let lastCheckOut: string | null = null;

    dayLogs.forEach((log) => {
      if (log.check_in_at) {
        if (!firstCheckIn || log.check_in_at < firstCheckIn) {
          firstCheckIn = log.check_in_at;
        }
      }
      if (log.check_out_at) {
        if (!lastCheckOut || log.check_out_at > lastCheckOut) {
          lastCheckOut = log.check_out_at;
        }
      }

      if (log.check_in_at && log.check_out_at) {
        const checkIn = parseISO(log.check_in_at);
        const checkOut = parseISO(log.check_out_at);
        const minutes = differenceInMinutes(checkOut, checkIn);
        totalWorkMinutes += Math.max(0, minutes);
      }

      if (log.break_minutes) {
        totalBreakMinutes += log.break_minutes;
      }
    });

    const netWorkMinutes = Math.max(0, totalWorkMinutes - totalBreakMinutes);
    const isOvertime = dayLogs.some((log) => log.is_overtime);

    return {
      logs: dayLogs,
      firstCheckIn,
      lastCheckOut,
      totalWorkMinutes,
      netWorkMinutes,
      totalBreakMinutes,
      isOvertime,
    };
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    try {
      return format(parseISO(isoString), 'HH:mm');
    } catch {
      return '-';
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isLoading = logsLoading || statsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
            {userName && (
              <span className="ml-2 text-base font-medium text-blue-600 dark:text-blue-400">
                - {userName}
              </span>
            )}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
        >
          오늘
        </button>
      </div>

      {/* Monthly Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-4">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">총 근무일</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalWorkDays}일</p>
          </div>
          <div className="rounded-xl bg-green-50 dark:bg-green-900/30 p-4">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">총 근무시간</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatWorkTime(stats.totalWorkMinutes)}</p>
          </div>
          <div className="rounded-xl bg-purple-50 dark:bg-purple-900/30 p-4">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">평균 근무시간</p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{formatWorkTime(stats.averageWorkMinutes)}</p>
          </div>
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/30 p-4">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">지각 / 조퇴</p>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.lateCount} / {stats.earlyLeaveCount}</p>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={cn(
                'py-3 text-center text-xs font-semibold',
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-600 dark:text-slate-400'
              )}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {isLoading ? (
            <div className="col-span-7 py-20 text-center text-slate-500 dark:text-slate-400">
              로딩 중...
            </div>
          ) : (
            calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="min-h-[100px] border-b border-r border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50" />;
              }

              const dateStr = format(day, 'yyyy-MM-dd');
              const dayInfo = calculateDayInfo(day);
              const isWeekendDay = isWeekend(day);
              const isTodayDay = isToday(day);
              const dayNumber = day.getDate();

              return (
                <div
                  key={dateStr}
                  onClick={() => onSelectDate?.(dateStr, dayInfo?.logs[0])}
                  className={cn(
                    'min-h-[100px] border-b border-r border-slate-100 dark:border-slate-700 p-2 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50',
                    isWeekendDay && 'bg-slate-50/50 dark:bg-slate-900/30',
                    isTodayDay && 'bg-blue-50/50 dark:bg-blue-900/20'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        isTodayDay && 'bg-blue-600 text-white px-2 py-0.5 rounded-full',
                        !isTodayDay && day.getDay() === 0 && 'text-red-500',
                        !isTodayDay && day.getDay() === 6 && 'text-blue-500',
                        !isTodayDay && day.getDay() !== 0 && day.getDay() !== 6 && 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {dayNumber}
                    </span>
                    {dayInfo?.isOvertime && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 font-semibold">
                        연장
                      </span>
                    )}
                  </div>

                  {dayInfo && (
                    <div className="space-y-0.5 text-[10px]">
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(dayInfo.firstCheckIn)}</span>
                        <span className="text-slate-400">~</span>
                        <span className="text-red-500 dark:text-red-400">{formatTime(dayInfo.lastCheckOut)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <Calendar className="h-3 w-3" />
                        <span>{formatWorkTime(dayInfo.netWorkMinutes)}</span>
                      </div>
                      {dayInfo.totalBreakMinutes > 0 && (
                        <div className="flex items-center gap-1 text-orange-500">
                          <Coffee className="h-3 w-3" />
                          <span>휴식 {dayInfo.totalBreakMinutes}분</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-green-500" />
          <span>출근시각</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-red-500" />
          <span>퇴근시각</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          <span>순 근무시간</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Coffee className="h-3.5 w-3.5 text-orange-500" />
          <span>휴식시간</span>
        </div>
      </div>
    </div>
  );
}

