'use client';

import { useState, useMemo } from 'react';
import { Circle, Clock, CheckCircle2, PauseCircle, User, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskItem } from '../types';

type KanbanView = 'active' | 'archived';

const STATUS_STYLES: Record<string, { header: string; accent: string; dot: string }> = {
  todo: {
    header: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
    accent: 'border-l-slate-400',
    dot: 'bg-slate-400',
  },
  'in-progress': {
    header: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    accent: 'border-l-blue-500',
    dot: 'bg-blue-500',
  },
  done: {
    header: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    accent: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
  },
  'on-hold': {
    header: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
    accent: 'border-l-orange-500',
    dot: 'bg-orange-500',
  },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  todo: <Circle className="h-3.5 w-3.5" />,
  'in-progress': <Clock className="h-3.5 w-3.5" />,
  done: <CheckCircle2 className="h-3.5 w-3.5" />,
  'on-hold': <PauseCircle className="h-3.5 w-3.5" />,
};

const STATUS_LABEL: Record<string, string> = {
  todo: '할일',
  'in-progress': '진행중',
  done: '완료',
  'on-hold': '보류',
};

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-slate-400',
};

interface ProjectDetailTasksProps {
  tasks: TaskItem[];
  usersData?: { users: any[]; currentUser: any };
  onTaskClick?: (task: TaskItem) => void;
  onTaskStatusChange?: (taskId: string, status: TaskItem['status']) => void;
}

function formatDateShort(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}/${day}`;
}

function resolveAssigneeName(task: TaskItem, usersData?: { users: any[] }): string {
  if (task.assignee_id) {
    const user = usersData?.users?.find((u: any) => u.id === task.assignee_id);
    if (user?.name) return user.name;
  }
  return task.assignee || '미지정';
}

function isOverdue(dateString: string, status: string): boolean {
  if (status === 'done') return false;
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateString);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function KanbanColumn({
  status,
  tasks,
  usersData,
  onTaskClick,
}: {
  status: string;
  tasks: TaskItem[];
  usersData?: { users: any[] };
  onTaskClick?: (task: TaskItem) => void;
}) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.todo;

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2 mb-2', style.header)}>
        {STATUS_ICON[status]}
        <span className="text-xs font-bold">{STATUS_LABEL[status]}</span>
        <span className="ml-auto rounded-full bg-black/10 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold min-w-[20px] text-center">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-4 text-center">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">없음</p>
          </div>
        ) : (
          tasks.map((task) => {
            const overdue = isOverdue(task.dueDate, task.status);
            const assigneeName = resolveAssigneeName(task, usersData);

            return (
              <button
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className={cn(
                  'w-full text-left rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 shadow-sm transition hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 border-l-[3px]',
                  style.accent,
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    {task.priority && (
                      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority] || PRIORITY_DOT.medium)} />
                    )}
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {task.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-0.5 truncate">
                      <User className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">{assigneeName}</span>
                    </span>
                    <span className={cn('flex items-center gap-0.5 flex-shrink-0', overdue && 'text-red-500 font-semibold')}>
                      <CalendarDays className="h-2.5 w-2.5" />
                      {task.dueDate ? formatDateShort(task.dueDate) : '-'}
                      {overdue && ' !'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ProjectDetailTasks({
  tasks,
  usersData,
  onTaskClick,
}: ProjectDetailTasksProps) {
  const [kanbanView, setKanbanView] = useState<KanbanView>('active');

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, TaskItem[]> = {
      todo: [],
      'in-progress': [],
      done: [],
      'on-hold': [],
    };
    tasks.forEach((t) => {
      if (grouped[t.status]) {
        grouped[t.status].push(t);
      } else {
        grouped.todo.push(t);
      }
    });
    return grouped;
  }, [tasks]);

  const activeCount = tasksByStatus.todo.length + tasksByStatus['in-progress'].length;
  const archivedCount = tasksByStatus.done.length + tasksByStatus['on-hold'].length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-1.5 mb-3 flex-shrink-0">
        <button
          onClick={() => setKanbanView('active')}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] sm:text-xs font-semibold transition whitespace-nowrap',
            kanbanView === 'active'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
          )}
        >
          <Circle className="h-3 w-3" />
          할일 / 진행중
          <span className={cn(
            'rounded-full px-1.5 py-0.5 text-[9px] font-bold min-w-[18px] text-center',
            kanbanView === 'active' ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-200 dark:bg-slate-700',
          )}>
            {activeCount}
          </span>
        </button>
        <button
          onClick={() => setKanbanView('archived')}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] sm:text-xs font-semibold transition whitespace-nowrap',
            kanbanView === 'archived'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          완료 / 보류
          <span className={cn(
            'rounded-full px-1.5 py-0.5 text-[9px] font-bold min-w-[18px] text-center',
            kanbanView === 'archived' ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-200 dark:bg-slate-700',
          )}>
            {archivedCount}
          </span>
        </button>
      </div>

      <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">
        {kanbanView === 'active' ? (
          <>
            <KanbanColumn status="todo" tasks={tasksByStatus.todo} usersData={usersData} onTaskClick={onTaskClick} />
            <KanbanColumn status="in-progress" tasks={tasksByStatus['in-progress']} usersData={usersData} onTaskClick={onTaskClick} />
          </>
        ) : (
          <>
            <KanbanColumn status="done" tasks={tasksByStatus.done} usersData={usersData} onTaskClick={onTaskClick} />
            <KanbanColumn status="on-hold" tasks={tasksByStatus['on-hold']} usersData={usersData} onTaskClick={onTaskClick} />
          </>
        )}
      </div>
    </div>
  );
}
