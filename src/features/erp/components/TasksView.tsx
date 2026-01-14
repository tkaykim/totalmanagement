'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { BuTabs } from './BuTabs';
import { BU, BU_TITLES, Project, TaskItem, TaskPriority } from '../types';
import { Circle, Clock, CheckCircle2, Calendar, User, ArrowRight } from 'lucide-react';

type TaskStatus = 'todo' | 'in-progress' | 'done';

const STATUS_CONFIG: Record<TaskStatus, { 
  label: string; 
  shortLabel: string;
  color: string; 
  bgColor: string; 
  borderColor: string;
  icon: typeof Circle;
  headerBg: string;
}> = {
  'todo': { 
    label: '진행 전', 
    shortLabel: '진행전',
    color: 'text-violet-600 dark:text-violet-400', 
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    borderColor: 'border-violet-200 dark:border-violet-800',
    icon: Circle,
    headerBg: 'bg-violet-100 dark:bg-violet-900/40',
  },
  'in-progress': { 
    label: '진행중', 
    shortLabel: '진행중',
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: Clock,
    headerBg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  'done': { 
    label: '완료', 
    shortLabel: '완료',
    color: 'text-emerald-600 dark:text-emerald-400', 
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle2,
    headerBg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  low: { label: '낮음', color: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' },
  medium: { label: '보통', color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-400' },
  high: { label: '높음', color: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
};

function TaskCard({
  task,
  projectName,
  onEdit,
  onStatusChange,
}: {
  task: TaskItem;
  projectName: string;
  onEdit: () => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const statusConfig = STATUS_CONFIG[task.status];

  return (
    <div
      onClick={onEdit}
      className={cn(
        'group relative bg-white dark:bg-slate-800 rounded-xl border shadow-sm',
        'cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600',
        'active:scale-[0.98]',
        statusConfig.borderColor
      )}
    >
      <div className="p-3 sm:p-4">
        {/* 상단: 프로젝트명 + 우선순위 */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {projectName}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={cn('w-1.5 h-1.5 rounded-full', priorityConfig.dot)} />
            <span className={cn('text-[9px] sm:text-[10px] font-medium', priorityConfig.color)}>
              {priorityConfig.label}
            </span>
          </div>
        </div>

        {/* 제목 */}
        <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 line-clamp-2">
          {task.title}
        </h4>

        {/* 담당자 + 마감일 */}
        <div className="flex items-center gap-3 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[60px] sm:max-w-[80px]">{task.assignee}</span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{task.dueDate}</span>
            </div>
          )}
        </div>

        {/* 빠른 상태 변경 버튼들 */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700"
        >
          {(['todo', 'in-progress', 'done'] as const).map((status) => {
            const config = STATUS_CONFIG[status];
            const isActive = task.status === status;
            return (
              <button
                key={status}
                onClick={() => onStatusChange(status)}
                className={cn(
                  'flex-1 px-1.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-medium transition-colors',
                  isActive
                    ? cn(config.headerBg, config.color)
                    : 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                {config.shortLabel}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  projects,
  onEditTask,
  onStatusChange,
}: {
  status: TaskStatus;
  tasks: TaskItem[];
  projects: Project[];
  onEditTask: (task: TaskItem) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const findProject = (id: string) => projects.find((p) => p.id === id)?.name ?? '-';

  return (
    <div className="flex flex-col min-w-[280px] sm:min-w-[300px] lg:min-w-0 lg:flex-1">
      {/* 컬럼 헤더 */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2.5 rounded-t-xl',
        config.headerBg
      )}>
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4', config.color)} />
          <span className={cn('text-sm font-bold', config.color)}>{config.label}</span>
        </div>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs font-bold',
          config.bgColor, config.color
        )}>
          {tasks.length}
        </span>
      </div>

      {/* 카드 리스트 */}
      <div className={cn(
        'flex-1 p-2 space-y-2 rounded-b-xl border-x border-b overflow-y-auto',
        'bg-slate-50/50 dark:bg-slate-900/30',
        config.borderColor
      )}
      style={{ maxHeight: 'calc(100vh - 340px)', minHeight: '200px' }}
      >
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-slate-400 dark:text-slate-500">
            {status === 'todo' && '진행 전인 할일이 없습니다'}
            {status === 'in-progress' && '진행 중인 할일이 없습니다'}
            {status === 'done' && '완료된 할일이 없습니다'}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectName={findProject(task.projectId)}
              onEdit={() => onEditTask(task)}
              onStatusChange={(newStatus) => onStatusChange(task.id, newStatus)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function TasksView({
  bu,
  onBuChange,
  tasks,
  projects,
  onStatusChange,
  onEditTask,
}: {
  bu: BU | 'ALL';
  onBuChange: (bu: BU | 'ALL') => void;
  tasks: TaskItem[];
  projects: Project[];
  onStatusChange: (id: string, status: TaskItem['status']) => void;
  onEditTask: (task: TaskItem) => void;
}) {
  const [mobileTab, setMobileTab] = useState<TaskStatus>('todo');

  const buProjects = bu === 'ALL' ? projects : projects.filter((p) => p.bu === bu);
  const buProjectIds = buProjects.map((p) => p.id);
  const buTasks = bu === 'ALL' ? tasks : tasks.filter((t) => buProjectIds.includes(t.projectId));

  const tasksByStatus = useMemo(() => ({
    todo: buTasks.filter((t) => t.status === 'todo'),
    'in-progress': buTasks.filter((t) => t.status === 'in-progress'),
    done: buTasks.filter((t) => t.status === 'done'),
  }), [buTasks]);

  const totalCount = buTasks.length;

  return (
    <section className="space-y-4 sm:space-y-6">
      <BuTabs bu={bu} onChange={onBuChange} prefix="TASK" />

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 dark:text-slate-200">
          {bu === 'ALL' ? '전체' : BU_TITLES[bu]} 할일 관리
        </h3>
        <span className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500">
          총 {totalCount}건
        </span>
      </div>

      {/* 모바일: 탭 전환 */}
      <div className="lg:hidden">
        {/* 탭 헤더 */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-4">
          {(['todo', 'in-progress', 'done'] as const).map((status) => {
            const config = STATUS_CONFIG[status];
            const count = tasksByStatus[status].length;
            const isActive = mobileTab === status;
            return (
              <button
                key={status}
                onClick={() => setMobileTab(status)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all',
                  isActive
                    ? cn('bg-white dark:bg-slate-700 shadow-sm', config.color)
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                <span>{config.shortLabel}</span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px]',
                  isActive ? config.headerBg : 'bg-slate-200 dark:bg-slate-600'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 모바일 카드 리스트 */}
        <div className="space-y-2">
          {tasksByStatus[mobileTab].length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
              {mobileTab === 'todo' && '진행 전인 할일이 없습니다'}
              {mobileTab === 'in-progress' && '진행 중인 할일이 없습니다'}
              {mobileTab === 'done' && '완료된 할일이 없습니다'}
            </div>
          ) : (
            tasksByStatus[mobileTab].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                projectName={projects.find((p) => p.id === task.projectId)?.name ?? '-'}
                onEdit={() => onEditTask(task)}
                onStatusChange={(newStatus) => onStatusChange(task.id, newStatus)}
              />
            ))
          )}
        </div>

        {/* 모바일: 빠른 이동 안내 */}
        {tasksByStatus[mobileTab].length > 0 && mobileTab !== 'done' && (
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400 dark:text-slate-500">
            <ArrowRight className="w-3 h-3" />
            <span>카드를 클릭하여 상세 정보를 확인하세요</span>
          </div>
        )}
      </div>

      {/* 데스크톱: 칸반 보드 */}
      <div className="hidden lg:flex gap-4">
        {(['todo', 'in-progress', 'done'] as const).map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            projects={projects}
            onEditTask={onEditTask}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      {/* 태블릿: 가로 스크롤 칸반 */}
      <div className="hidden sm:flex lg:hidden overflow-x-auto gap-4 pb-4 -mx-4 px-4 snap-x snap-mandatory">
        {(['todo', 'in-progress', 'done'] as const).map((status) => (
          <div key={status} className="snap-center flex-shrink-0">
            <KanbanColumn
              status={status}
              tasks={tasksByStatus[status]}
              projects={projects}
              onEditTask={onEditTask}
              onStatusChange={onStatusChange}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
