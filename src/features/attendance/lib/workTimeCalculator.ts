import type { AttendanceLog, AttendanceType } from '@/types/database';
import type { WorkTimeStats, MonthlyStats } from '../types';
import { differenceInMinutes, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

const STANDARD_WORK_HOURS = 8; // 기준 근무시간 (시간)
const STANDARD_WORK_MINUTES = STANDARD_WORK_HOURS * 60; // 기준 근무시간 (분)
const LUNCH_BREAK_MINUTES = 60; // 점심시간 (분)
const STANDARD_CHECK_IN_HOUR = 9; // 기준 출근 시간 (시)

export function calculateWorkTimeMinutes(
  checkInAt: string | null | undefined,
  checkOutAt: string | null | undefined
): number | null {
  if (!checkInAt || !checkOutAt) {
    return null;
  }

  try {
    const checkIn = parseISO(checkInAt);
    const checkOut = parseISO(checkOutAt);
    
    if (checkOut <= checkIn) {
      return null;
    }

    const totalMinutes = differenceInMinutes(checkOut, checkIn);
    const workMinutes = Math.max(0, totalMinutes - LUNCH_BREAK_MINUTES);
    
    return workMinutes;
  } catch {
    return null;
  }
}

export function isLate(checkInAt: string | null | undefined): boolean {
  if (!checkInAt) {
    return false;
  }

  try {
    const checkIn = parseISO(checkInAt);
    const checkInHour = checkIn.getHours();
    const checkInMinute = checkIn.getMinutes();
    
    return checkInHour > STANDARD_CHECK_IN_HOUR || 
           (checkInHour === STANDARD_CHECK_IN_HOUR && checkInMinute > 0);
  } catch {
    return false;
  }
}

export function isEarlyLeave(
  checkOutAt: string | null | undefined,
  workTimeMinutes: number | null
): boolean {
  if (!checkOutAt || workTimeMinutes === null) {
    return false;
  }

  return workTimeMinutes < STANDARD_WORK_MINUTES;
}

export function determineAttendanceStatus(
  checkInAt: string | null | undefined,
  checkOutAt: string | null | undefined,
  workTimeMinutes: number | null
): AttendanceType {
  if (!checkInAt) {
    return 'absent';
  }

  if (isLate(checkInAt)) {
    return 'late';
  }

  if (isEarlyLeave(checkOutAt, workTimeMinutes)) {
    return 'early_leave';
  }

  return 'present';
}

export function calculateDailyStats(log: AttendanceLog): WorkTimeStats {
  const workTimeMinutes = calculateWorkTimeMinutes(log.check_in_at, log.check_out_at);
  const isLateStatus = isLate(log.check_in_at);
  const isEarlyLeaveStatus = isEarlyLeave(log.check_out_at, workTimeMinutes);

  return {
    date: log.work_date,
    workTimeMinutes: workTimeMinutes ?? 0,
    checkInAt: log.check_in_at,
    checkOutAt: log.check_out_at,
    status: log.status,
    isLate: isLateStatus,
    isEarlyLeave: isEarlyLeaveStatus,
  };
}

export function calculateMonthlyStats(
  logs: AttendanceLog[],
  year: number,
  month: number
): MonthlyStats {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const monthLogs = logs.filter(log => {
    const logDate = parseISO(log.work_date);
    return logDate >= monthStart && logDate <= monthEnd;
  });

  const totalWorkMinutes = monthLogs.reduce((sum, log) => {
    const minutes = calculateWorkTimeMinutes(log.check_in_at, log.check_out_at);
    return sum + (minutes ?? 0);
  }, 0);

  const totalWorkDays = monthLogs.filter(log => {
    const minutes = calculateWorkTimeMinutes(log.check_in_at, log.check_out_at);
    return minutes !== null && minutes > 0;
  }).length;

  const averageWorkMinutes = totalWorkDays > 0 ? Math.round(totalWorkMinutes / totalWorkDays) : 0;

  const lateCount = monthLogs.filter(log => log.status === 'late').length;
  const earlyLeaveCount = monthLogs.filter(log => log.status === 'early_leave').length;
  const absentCount = monthLogs.filter(log => log.status === 'absent').length;
  const vacationCount = monthLogs.filter(log => log.status === 'vacation').length;
  const remoteCount = monthLogs.filter(log => log.status === 'remote').length;
  const externalCount = monthLogs.filter(log => log.status === 'external').length;

  return {
    year,
    month,
    totalWorkDays,
    totalWorkMinutes,
    averageWorkMinutes,
    lateCount,
    earlyLeaveCount,
    absentCount,
    vacationCount,
    remoteCount,
    externalCount,
  };
}

export function formatWorkTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}분`;
  }
  
  if (mins === 0) {
    return `${hours}시간`;
  }
  
  return `${hours}시간 ${mins}분`;
}

