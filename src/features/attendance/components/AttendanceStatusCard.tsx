'use client';

import { cn } from '@/lib/utils';
import type { AttendanceStatus } from '../types';
import { formatWorkTime } from '../lib/workTimeCalculator';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { formatTimeKST } from '@/lib/timezone';

interface AttendanceStatusCardProps {
  status: AttendanceStatus;
}

const statusConfig = {
  present: {
    label: '정상 출근',
    color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    icon: CheckCircle2,
  },
  late: {
    label: '지각',
    color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
    icon: Clock,
  },
  early_leave: {
    label: '조퇴',
    color: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
    icon: XCircle,
  },
  absent: {
    label: '결근',
    color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    icon: XCircle,
  },
  vacation: {
    label: '휴가',
    color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    icon: CheckCircle2,
  },
  remote: {
    label: '재택',
    color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    icon: CheckCircle2,
  },
  external: {
    label: '외근',
    color: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
    icon: CheckCircle2,
  },
};

export function AttendanceStatusCard({ status }: AttendanceStatusCardProps) {
  const config = statusConfig[status.status];
  const Icon = config.icon;

  return (
    <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">오늘의 근태</h3>
        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold', config.color)}>
          <Icon size={14} />
          {config.label}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">출근 시간</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {status.checkInAt 
              ? formatTimeKST(status.checkInAt)
              : '미기록'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">퇴근 시간</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {status.checkOutAt 
              ? formatTimeKST(status.checkOutAt)
              : '미기록'}
          </span>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">근무 시간</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {formatWorkTime(status.workTimeMinutes || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

