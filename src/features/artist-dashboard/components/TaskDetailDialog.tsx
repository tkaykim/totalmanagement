'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { differenceInCalendarDays, format, isToday, isPast } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, ListTodo, Flag, Circle, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArtistTask } from '../types';

const STATUS_CONFIG = {
  todo: {
    label: '할 일',
    icon: Circle,
    nextLabel: '진행 중',
    next: 'in_progress' as const,
  },
  in_progress: {
    label: '진행 중',
    icon: Clock,
    nextLabel: '완료',
    next: 'done' as const,
  },
  done: {
    label: '완료',
    icon: CheckCircle2,
    nextLabel: '할 일',
    next: 'todo' as const,
  },
};

const PRIORITY_LABELS: Record<string, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

function getDdayLabel(dueDate: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const days = differenceInCalendarDays(due, today);
  if (days < 0) return `D+${Math.abs(days)}`;
  if (days === 0) return 'D-day';
  return `D-${days}`;
}

function getDdayClassName(dueDate: Date, status: string): string {
  if (status === 'done') return 'text-slate-500 dark:text-slate-400';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const days = differenceInCalendarDays(due, today);
  if (days < 0) return 'text-red-600 dark:text-red-400 font-semibold';
  if (days === 0) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-slate-600 dark:text-slate-300';
}

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ArtistTask | null;
  onStatusChange?: (taskId: number, status: 'todo' | 'in_progress' | 'done') => void;
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  onStatusChange,
}: TaskDetailDialogProps) {
  if (!task) return null;

  const statusInfo = STATUS_CONFIG[task.status];
  const StatusIcon = statusInfo.icon;
  const nextStatus = statusInfo.next;
  const dueDate = new Date(task.due_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <ListTodo className="h-5 w-5 text-emerald-500" />
            {task.title}
          </DialogTitle>
          <DialogDescription className="text-left">
            할일 상세 및 상태 변경
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {task.description && (
            <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-3">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Calendar className="h-4 w-4" />
              <span>
                마감일: {format(dueDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}
              </span>
            </div>
            <span
              className={cn(
                'rounded px-2 py-0.5 text-xs font-semibold',
                getDdayClassName(dueDate, task.status)
              )}
            >
              {getDdayLabel(dueDate)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Flag className="h-4 w-4" />
            <span>우선순위: {PRIORITY_LABELS[task.priority] ?? task.priority}</span>
          </div>

          {task.projects?.name && (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              연결 프로젝트: {task.projects.name}
            </div>
          )}

          {task.tag && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              태그: {task.tag}
            </div>
          )}

          {onStatusChange && task.status !== 'done' && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                상태 변경
              </p>
              <button
                type="button"
                onClick={() => onStatusChange(task.id, nextStatus)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition',
                  'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
                  'hover:bg-blue-200 dark:hover:bg-blue-800/50'
                )}
              >
                <StatusIcon className="h-4 w-4" />
                {statusInfo.label} → {statusInfo.nextLabel}
              </button>
            </div>
          )}

          {task.status === 'done' && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>완료된 할일입니다.</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
