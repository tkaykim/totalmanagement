'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ArtistTask, TaskTab } from '../types';

interface TasksSectionProps {
  tasks: ArtistTask[];
  grouped: {
    todo: ArtistTask[];
    in_progress: ArtistTask[];
    done: ArtistTask[];
  };
  summary: {
    todo: number;
    in_progress: number;
    done: number;
    total: number;
    pending: number;
  };
  onTaskClick?: (task: ArtistTask) => void;
  onStatusChange?: (taskId: number, status: 'todo' | 'in_progress' | 'done') => void;
}

const STATUS_CONFIG = {
  todo: {
    label: '할 일',
    icon: Circle,
    color: 'text-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-700',
  },
  in_progress: {
    label: '진행 중',
    icon: Clock,
    color: 'text-blue-500',
    bg: 'bg-blue-100 dark:bg-blue-900/50',
  },
  done: {
    label: '완료',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
  },
};

const PRIORITY_STYLES = {
  high: 'border-l-4 border-l-red-500',
  medium: 'border-l-4 border-l-yellow-500',
  low: 'border-l-4 border-l-slate-300 dark:border-l-slate-600',
};

export function TasksSection({ 
  tasks, 
  grouped, 
  summary, 
  onTaskClick,
  onStatusChange 
}: TasksSectionProps) {
  const [activeTab, setActiveTab] = useState<TaskTab>('all');

  const filteredTasks = activeTab === 'all' 
    ? tasks 
    : grouped[activeTab as keyof typeof grouped] || [];

  const getNextStatus = (current: string): 'todo' | 'in_progress' | 'done' => {
    if (current === 'todo') return 'in_progress';
    if (current === 'in_progress') return 'done';
    return 'todo';
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return '오늘';
    return format(date, 'M/d (EEE)', { locale: ko });
  };

  const isOverdue = (dateStr: string, status: string) => {
    if (status === 'done') return false;
    return isPast(new Date(dateStr)) && !isToday(new Date(dateStr));
  };

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">내 할일</h3>
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          미완료 {summary.pending}개 / 총 {summary.total}개
        </span>
      </div>

      {/* 탭 */}
      <div className="mb-4 flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
            activeTab === 'all'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
          )}
        >
          전체 ({summary.total})
        </button>
        <button
          onClick={() => setActiveTab('todo')}
          className={cn(
            'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
            activeTab === 'todo'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
          )}
        >
          할 일 ({summary.todo})
        </button>
        <button
          onClick={() => setActiveTab('in_progress')}
          className={cn(
            'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
            activeTab === 'in_progress'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
          )}
        >
          진행 중 ({summary.in_progress})
        </button>
        <button
          onClick={() => setActiveTab('done')}
          className={cn(
            'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
            activeTab === 'done'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
          )}
        >
          완료 ({summary.done})
        </button>
      </div>

      {/* 할일 목록 */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {activeTab === 'all' && '할일이 없습니다.'}
              {activeTab === 'todo' && '할 일이 없습니다.'}
              {activeTab === 'in_progress' && '진행 중인 할일이 없습니다.'}
              {activeTab === 'done' && '완료된 할일이 없습니다.'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const statusConfig = STATUS_CONFIG[task.status];
            const StatusIcon = statusConfig.icon;
            const overdue = isOverdue(task.due_date, task.status);

            return (
              <div
                key={task.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 transition hover:bg-slate-100 dark:hover:bg-slate-700/60',
                  PRIORITY_STYLES[task.priority]
                )}
              >
                {/* 상태 토글 버튼 */}
                <button
                  onClick={() => onStatusChange?.(task.id, getNextStatus(task.status))}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full transition',
                    statusConfig.bg,
                    'hover:opacity-80'
                  )}
                  title={`${statusConfig.label} → ${STATUS_CONFIG[getNextStatus(task.status)].label}`}
                >
                  <StatusIcon className={cn('h-4 w-4', statusConfig.color)} />
                </button>

                {/* 할일 내용 */}
                <button
                  onClick={() => onTaskClick?.(task)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className={cn(
                    'text-sm font-medium truncate',
                    task.status === 'done' 
                      ? 'text-slate-400 dark:text-slate-500 line-through' 
                      : 'text-slate-800 dark:text-slate-200'
                  )}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {task.projects?.name || '프로젝트 미지정'}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className={cn(
                      'text-xs flex items-center gap-1',
                      overdue 
                        ? 'text-red-500 font-semibold' 
                        : 'text-slate-500 dark:text-slate-400'
                    )}>
                      {overdue && <AlertCircle className="h-3 w-3" />}
                      {formatDueDate(task.due_date)}
                    </span>
                  </div>
                </button>

                {/* 우선순위 뱃지 */}
                {task.priority === 'high' && (
                  <span className="text-[10px] font-bold text-red-500 uppercase">
                    긴급
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
