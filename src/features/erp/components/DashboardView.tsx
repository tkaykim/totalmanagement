'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  ChartLine,
  Coins,
  DollarSign,
  FolderKanban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BU,
  BU_TITLES,
  BU_LABELS,
  BU_CHIP_STYLES,
  Project,
  TaskItem,
  FinancialEntry,
  formatCurrency,
} from '../types';
import { StatCard } from './StatCard';

function PieLikeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M12 3v9l7.8 4.5A9 9 0 1 1 12 3Z" />
      <path d="M12 12 21 9a9 9 0 0 0-9-6" />
    </svg>
  );
}

export interface DashboardViewProps {
  totals: { totalRev: number; totalExp: number; totalProfit: number };
  buCards: { bu: BU; projects: number; revenue: number; expense: number; profit: number }[];
  share: { bu: BU; amount: number; ratio: number }[];
  tasks: TaskItem[];
  projects: Project[];
  revenues: FinancialEntry[];
  expenses: FinancialEntry[];
  currentUser?: any;
  onProjectClick: (project: Project) => void;
  onTaskClick: (task: TaskItem) => void;
  usersData?: { users: any[]; currentUser: any };
}

export function DashboardView({
  totals,
  buCards,
  share,
  tasks,
  projects,
  revenues,
  expenses,
  currentUser,
  onProjectClick,
  onTaskClick,
  usersData,
}: DashboardViewProps) {
  const [selectedBu, setSelectedBu] = useState<BU | 'ALL'>('ALL');
  const [projectFilter, setProjectFilter] = useState<'active' | 'completed'>('active');
  const [projectAssigneeFilter, setProjectAssigneeFilter] = useState<'all' | 'my' | 'unassigned'>('all');
  const [taskFilter, setTaskFilter] = useState<'active' | 'completed'>('active');
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<'all' | 'my' | 'unassigned'>('all');

  const activeProjectStatuses = ['준비중', '기획중', '진행중', '운영중'];
  const completedProjectStatuses = ['완료'];
  
  const filteredProjects = useMemo(() => {
    let filtered = projects;
    
    if (projectFilter === 'active') {
      filtered = filtered.filter((p) => activeProjectStatuses.includes(p.status));
    } else {
      filtered = filtered.filter((p) => completedProjectStatuses.includes(p.status));
    }
    
    if (selectedBu !== 'ALL') {
      filtered = filtered.filter((p) => p.bu === selectedBu);
    }
    
    if (projectAssigneeFilter === 'my' && currentUser) {
      filtered = filtered.filter((p) => {
        const isPM = p.pm_id === currentUser.id;
        const isParticipant = p.participants?.some(
          (participant) => participant.user_id === currentUser.id
        ) || false;
        return isPM || isParticipant;
      });
    }
    if (projectAssigneeFilter === 'unassigned') {
      filtered = filtered.filter((p) => !p.pm_id || p.pm_id.trim() === '');
    }
    
    return filtered;
  }, [projects, selectedBu, projectFilter, projectAssigneeFilter, currentUser]);

  const filteredTasksByProject = useMemo(() => {
    const projectIds = new Set(filteredProjects.map((p) => p.id));
    return tasks.filter((t) => projectIds.has(t.projectId));
  }, [tasks, filteredProjects]);

  const filteredTasks = useMemo(() => {
    let filtered = filteredTasksByProject;
    
    if (taskFilter === 'active') {
      filtered = filtered.filter((t) => t.status === 'todo' || t.status === 'in-progress');
    } else {
      filtered = filtered.filter((t) => t.status === 'done');
    }
    
    if (taskAssigneeFilter === 'my' && currentUser?.profile?.name) {
      filtered = filtered.filter((t) => t.assignee === currentUser.profile.name);
    }
    if (taskAssigneeFilter === 'unassigned') {
      filtered = filtered.filter((t) => !t.assignee || t.assignee.trim() === '');
    }
    
    return filtered;
  }, [filteredTasksByProject, taskFilter, taskAssigneeFilter, currentUser]);

  const filteredTotals = useMemo(() => {
    if (selectedBu === 'ALL') {
      return totals;
    }
    
    const buProjectIds = new Set(projects.filter((p) => p.bu === selectedBu).map((p) => p.id));
    
    const buRevenues = revenues.filter((r) => buProjectIds.has(r.projectId));
    const buExpenses = expenses.filter((e) => buProjectIds.has(e.projectId));
    
    const totalRev = buRevenues.reduce((sum, r) => sum + r.amount, 0);
    const totalExp = buExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    return {
      totalRev,
      totalExp,
      totalProfit: totalRev - totalExp,
    };
  }, [selectedBu, totals, revenues, expenses, projects]);

  const canViewFinancialData = currentUser?.profile?.role === 'manager' || currentUser?.profile?.role === 'admin';

  return (
    <section className="space-y-4 sm:space-y-8">
      <div className="max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <div className="flex w-fit rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          <button
            onClick={() => setSelectedBu('ALL')}
            className={cn(
              'px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold transition whitespace-nowrap rounded-lg flex-shrink-0',
              selectedBu === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
            )}
          >
            전체
          </button>
          {(Object.keys(BU_TITLES) as BU[]).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedBu(key)}
              className={cn(
                'px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold transition whitespace-nowrap rounded-lg flex-shrink-0',
                selectedBu === key
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
              )}
            >
              {BU_TITLES[key]}
            </button>
          ))}
        </div>
      </div>

      {canViewFinancialData && (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          <StatCard
            title={selectedBu === 'ALL' ? '선택 기간 총 매출' : `${BU_TITLES[selectedBu]} 총 매출`}
            value={filteredTotals.totalRev}
            icon={<DollarSign className="h-5 w-5 text-blue-500" />}
            accent="text-blue-600"
          />
          <StatCard
            title={selectedBu === 'ALL' ? '선택 기간 총 지출' : `${BU_TITLES[selectedBu]} 총 지출`}
            value={filteredTotals.totalExp}
            icon={<Coins className="h-5 w-5 text-red-500" />}
            accent="text-red-500"
          />
          <StatCard
            title={selectedBu === 'ALL' ? '선택 기간 순이익' : `${BU_TITLES[selectedBu]} 순이익`}
            value={filteredTotals.totalProfit}
            icon={<ChartLine className="h-5 w-5 text-emerald-500" />}
            accent="text-emerald-600"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-700 dark:border-slate-700 bg-white dark:bg-slate-800 dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-blue-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">
                {selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]} 프로젝트
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400">
              {filteredProjects.length}개
            </span>
          </div>
          <div className="mb-4 space-y-2">
            <div className="flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 p-1">
              <button
                onClick={() => setProjectFilter('active')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  projectFilter === 'active'
                    ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100'
                )}
              >
                진행예정/진행중
              </button>
              <button
                onClick={() => setProjectFilter('completed')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  projectFilter === 'completed'
                    ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100'
                )}
              >
                완료
              </button>
            </div>
            <div className="flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 p-1">
              <button
                onClick={() => setProjectAssigneeFilter('all')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  projectAssigneeFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100'
                )}
              >
                전체 프로젝트 보기
              </button>
              <button
                onClick={() => setProjectAssigneeFilter('my')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  projectAssigneeFilter === 'my'
                    ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100'
                )}
              >
                내 프로젝트
              </button>
              <button
                onClick={() => setProjectAssigneeFilter('unassigned')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  projectAssigneeFilter === 'unassigned'
                    ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100'
                )}
              >
                담당자 미정 프로젝트
              </button>
            </div>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-8">
                {projectAssigneeFilter === 'my'
                  ? '내 프로젝트가 없습니다.'
                  : projectAssigneeFilter === 'unassigned'
                    ? `${selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]}에서 담당자 미정인 프로젝트가 없습니다.`
                    : projectFilter === 'active' 
                      ? `${selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]}에서 진행 예정이거나 진행 중인 프로젝트가 없습니다.`
                      : `${selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]}에서 완료된 프로젝트가 없습니다.`
                }
              </p>
            ) : (
              filteredProjects.map((project) => {
                const projectTasks = filteredTasks.filter((t) => t.projectId === project.id);
                const todoCount = projectTasks.filter((t) => t.status === 'todo').length;
                const inProgressCount = projectTasks.filter((t) => t.status === 'in-progress').length;
                const doneCount = projectTasks.filter((t) => t.status === 'done').length;

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onProjectClick(project);
                    }}
                    className="flex flex-col rounded-2xl border border-slate-100 dark:border-slate-700 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 dark:bg-slate-700/60 p-4 transition hover:border-blue-200 dark:hover:border-blue-600 hover:shadow-md text-left w-full cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={cn('rounded-md border px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold whitespace-nowrap', BU_CHIP_STYLES[project.bu])}>
                            {BU_TITLES[project.bu]}
                          </span>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100 truncate">{project.name}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-slate-600 dark:text-slate-300 dark:text-slate-300 whitespace-nowrap">
                            {project.cat}
                          </span>
                          <span
                            className={cn(
                              'rounded px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold whitespace-nowrap',
                              project.status === '준비중'
                                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                                : project.status === '기획중'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                                  : project.status === '진행중'
                                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                    : project.status === '운영중'
                                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
                            )}
                          >
                            {project.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          {project.startDate} ~ {project.endDate}
                        </p>
                        {project.pm_id && usersData?.users && (() => {
                          const pmUser = usersData.users.find((u: any) => u.id === project.pm_id);
                          return pmUser ? (
                            <p className="mt-1 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400">PM: {pmUser.name}</p>
                          ) : null;
                        })()}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {todoCount > 0 && (
                          <span className="rounded-full bg-slate-200 dark:bg-slate-600 px-2 py-0.5 text-[9px] font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">
                            진행 전 {todoCount}
                          </span>
                        )}
                        {inProgressCount > 0 && (
                          <span className="rounded-full bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 text-[9px] font-semibold text-blue-700 dark:text-blue-300">
                            진행중 {inProgressCount}
                          </span>
                        )}
                        {doneCount > 0 && (
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">
                            완료 {doneCount}
                          </span>
                        )}
                        {projectTasks.length === 0 && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">할일 없음</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-700 dark:border-slate-700 bg-white dark:bg-slate-800 dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
          <div className="mb-3 sm:mb-4 flex items-center justify-between flex-wrap gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">
                {selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]} 할일
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {filteredTasks.length}개
            </span>
          </div>
          <div className="mb-4 space-y-2">
            <div className="flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 p-1">
              <button
                onClick={() => setTaskFilter('active')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  taskFilter === 'active'
                    ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100'
                )}
              >
                진행예정/진행중
              </button>
              <button
                onClick={() => setTaskFilter('completed')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  taskFilter === 'completed'
                    ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100'
                )}
              >
                완료
              </button>
            </div>
            <div className="flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 p-1">
              <button
                onClick={() => setTaskAssigneeFilter('all')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  taskAssigneeFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100'
                )}
              >
                전체 할일 보기
              </button>
              <button
                onClick={() => setTaskAssigneeFilter('my')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  taskAssigneeFilter === 'my'
                    ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100'
                )}
              >
                내 할일만 보기
              </button>
              <button
                onClick={() => setTaskAssigneeFilter('unassigned')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  taskAssigneeFilter === 'unassigned'
                    ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100'
                )}
              >
                담당자 미지정 할일 보기
              </button>
            </div>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-8">
                {taskFilter === 'active'
                  ? `${selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]}에서 진행 예정이거나 진행 중인 할일이 없습니다.`
                  : `${selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]}에서 완료된 할일이 없습니다.`
                }
              </p>
            ) : (
              filteredTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onTaskClick(task);
                  }}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-700 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:bg-slate-700/50 p-4 transition hover:border-blue-200 dark:hover:border-blue-600 hover:shadow-md text-left w-full cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 font-bold flex-shrink-0">
                      {task.assignee[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn('rounded-md border px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold whitespace-nowrap', BU_CHIP_STYLES[task.bu])}>
                          {BU_TITLES[task.bu]}
                        </span>
                        <p className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 text-xs sm:text-sm truncate">
                          {task.title}
                        </p>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        {task.assignee} •{' '}
                        {projects.find((p) => p.id === task.projectId)?.name ?? '미지정 프로젝트'} •{' '}
                        {task.dueDate}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-bold tracking-tight whitespace-nowrap flex-shrink-0',
                      task.status === 'todo'
                        ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
                        : task.status === 'in-progress'
                          ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                          : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    )}
                  >
                    {task.status === 'todo' ? '진행 전' : task.status === 'in-progress' ? '진행중' : '완료'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {canViewFinancialData && (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200">사업부별 성과 요약</h3>
            </div>
            <div className="space-y-4">
              {buCards.map((item) => (
                <div
                  key={item.bu}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/60 p-5 transition hover:border-blue-200 dark:hover:border-blue-600"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
                      {BU_LABELS[item.bu]}
                    </p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">{BU_TITLES[item.bu]}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {item.projects} Active Projects
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-blue-600 dark:text-blue-400">{formatCurrency(item.revenue)}</p>
                    <p className="mt-0.5 text-[10px] font-bold text-red-500 dark:text-red-400">- {formatCurrency(item.expense)}</p>
                    <p className="mt-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400">Net: {formatCurrency(item.profit)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieLikeIcon className="h-5 w-5 text-blue-500" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200">사업부별 매출 비율</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">필터 적용 기준</span>
            </div>
            <div className="space-y-3">
              {share.map((item) => (
                <div key={item.bu}>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span>{BU_TITLES[item.bu]}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {item.ratio}% • {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{ width: `${item.ratio}%` }}
                    />
                  </div>
                </div>
              ))}
              {share.every((s) => s.amount === 0) && (
                <p className="text-center text-xs text-slate-400 dark:text-slate-500">매출 데이터가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

