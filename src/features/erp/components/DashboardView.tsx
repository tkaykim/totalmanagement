'use client';

import { useMemo, useState } from 'react';
import { BookOpen, FolderKanban, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BU,
  BU_TITLES,
  BU_CHIP_STYLES,
  Project,
  TaskItem,
} from '../types';
import { Input } from '@/components/ui/input';

export interface DashboardViewProps {
  tasks: TaskItem[];
  projects: Project[];
  currentUser?: any;
  onProjectClick: (project: Project) => void;
  onTaskClick: (task: TaskItem) => void;
  usersData?: { users: any[]; currentUser: any };
  /** @deprecated 대시보드에서 재무 지표 미표시. 호환용으로 전달 가능 */
  totals?: { totalRev: number; totalExp: number; totalProfit: number };
  buCards?: { bu: BU; projects: number; revenue: number; expense: number; profit: number }[];
  share?: { bu: BU; amount: number; ratio: number }[];
  revenues?: unknown[];
  expenses?: unknown[];
}

export function DashboardView({
  tasks,
  projects,
  currentUser,
  onProjectClick,
  onTaskClick,
  usersData,
}: DashboardViewProps) {
  const [selectedBu, setSelectedBu] = useState<BU | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<'active' | 'completed' | 'onhold'>('active');
  const [projectAssigneeFilter, setProjectAssigneeFilter] = useState<'all' | 'my' | 'unassigned'>('my');
  const [taskFilter, setTaskFilter] = useState<'active' | 'completed' | 'onhold'>('active');
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<'all' | 'my' | 'unassigned'>('my');

  const searchLower = searchQuery.trim().toLowerCase();

  const activeProjectStatuses = ['준비중', '기획중', '진행중', '운영중'];
  const onHoldProjectStatuses = ['보류'];
  const completedProjectStatuses = ['완료'];

  const filteredProjects = useMemo(() => {
    let filtered = projects;

    if (projectFilter === 'active') {
      filtered = filtered.filter((p) => activeProjectStatuses.includes(p.status));
    } else if (projectFilter === 'onhold') {
      filtered = filtered.filter((p) => onHoldProjectStatuses.includes(p.status));
    } else {
      filtered = filtered.filter((p) => completedProjectStatuses.includes(p.status));
    }
    
    if (selectedBu !== 'ALL') {
      filtered = filtered.filter((p) => p.bu === selectedBu);
    }
    
    if (projectAssigneeFilter === 'my' && currentUser) {
      filtered = filtered.filter((p) => {
        const isPM = p.pm_id === currentUser.id;
        const isCreator = p.created_by === currentUser.id;
        const isParticipant = p.participants?.some(
          (participant) => participant.user_id === currentUser.id
        ) ?? false;
        return isPM || isCreator || isParticipant;
      });
    }
    if (projectAssigneeFilter === 'unassigned') {
      filtered = filtered.filter((p) => !p.pm_id || p.pm_id.trim() === '');
    }

    if (searchLower) {
      filtered = filtered.filter((p) => {
        const pmName = p.pm_id && usersData?.users
          ? usersData.users.find((u: { id: string }) => u.id === p.pm_id)?.name ?? ''
          : '';
        return (
          p.name.toLowerCase().includes(searchLower) ||
          p.cat.toLowerCase().includes(searchLower) ||
          p.status.toLowerCase().includes(searchLower) ||
          pmName.toLowerCase().includes(searchLower)
        );
      });
    }
    
    return filtered;
  }, [projects, selectedBu, projectFilter, projectAssigneeFilter, currentUser, searchLower, usersData?.users]);

  const filteredTasksByProject = useMemo(() => {
    const projectIds = new Set(filteredProjects.map((p) => p.id));
    return tasks.filter((t) => projectIds.has(t.projectId));
  }, [tasks, filteredProjects]);

  const filteredTasks = useMemo(() => {
    let filtered = filteredTasksByProject;

    if (taskFilter === 'active') {
      filtered = filtered.filter((t) => t.status === 'todo' || t.status === 'in-progress');
    } else if (taskFilter === 'onhold') {
      filtered = filtered.filter((t) => t.status === 'on-hold');
    } else {
      filtered = filtered.filter((t) => t.status === 'done');
    }
    
    if (taskAssigneeFilter === 'my' && currentUser?.profile?.name) {
      filtered = filtered.filter((t) => t.assignee === currentUser.profile.name);
    }
    if (taskAssigneeFilter === 'unassigned') {
      filtered = filtered.filter((t) => !t.assignee || t.assignee.trim() === '');
    }

    if (searchLower) {
      filtered = filtered.filter((t) => {
        const projectName = projects.find((p) => p.id === t.projectId)?.name ?? '';
        return (
          t.title.toLowerCase().includes(searchLower) ||
          t.assignee.toLowerCase().includes(searchLower) ||
          projectName.toLowerCase().includes(searchLower)
        );
      });
    }
    
    return filtered;
  }, [filteredTasksByProject, taskFilter, taskAssigneeFilter, currentUser, searchLower, projects]);

  return (
    <section className="space-y-4 sm:space-y-8">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <Input
          type="search"
          placeholder="프로젝트, 할일 검색 (이름·카테고리·담당자 등)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 sm:h-10 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 w-full max-w-2xl"
        />
      </div>

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

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2 xl:gap-8">
        <div className="rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-700 dark:border-slate-700 bg-white dark:bg-slate-800 dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-blue-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">
                {selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]} 프로젝트
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400">
              {filteredProjects.length}개
            </span>
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
              <button
                onClick={() => setProjectFilter('onhold')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  projectFilter === 'onhold'
                    ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100'
                )}
              >
                보류
              </button>
            </div>
          </div>
          <div className="mb-4">
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
          <div className="space-y-3 max-h-[min(70vh,800px)] overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-8">
                {projectAssigneeFilter === 'my'
                  ? '내 프로젝트가 없습니다.'
                  : projectAssigneeFilter === 'unassigned'
                    ? `${selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]}에서 담당자 미정인 프로젝트가 없습니다.`
                    : projectFilter === 'active'
                      ? `${selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]}에서 진행 예정이거나 진행 중인 프로젝트가 없습니다.`
                      : projectFilter === 'onhold'
                        ? `${selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]}에서 보류된 프로젝트가 없습니다.`
                        : `${selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]}에서 완료된 프로젝트가 없습니다.`
                }
              </p>
            ) : (
              filteredProjects.map((project) => {
                const projectTasks = filteredTasks.filter((t) => t.projectId === project.id);
                const todoCount = projectTasks.filter((t) => t.status === 'todo').length;
                const inProgressCount = projectTasks.filter((t) => t.status === 'in-progress').length;
                const onHoldCount = projectTasks.filter((t) => t.status === 'on-hold').length;
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
                                      : project.status === '보류'
                                        ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
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
                        {project.creator_name && (
                          <p className="mt-0.5 text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500">생성: {project.creator_name}</p>
                        )}
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
                        {onHoldCount > 0 && (
                          <span className="rounded-full bg-orange-100 dark:bg-orange-900/50 px-2 py-0.5 text-[9px] font-semibold text-orange-700 dark:text-orange-300">
                            보류 {onHoldCount}
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
              <button
                onClick={() => setTaskFilter('onhold')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  taskFilter === 'onhold'
                    ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100'
                )}
              >
                보류
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
          <div className="space-y-3 max-h-[min(70vh,800px)] overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-8">
                {taskAssigneeFilter === 'my'
                  ? '내 담당 할일이 없습니다.'
                  : taskAssigneeFilter === 'unassigned'
                    ? `${selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]}에서 담당자 미지정 할일이 없습니다.`
                    : taskFilter === 'active'
                      ? `${selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]}에서 진행 예정이거나 진행 중인 할일이 없습니다.`
                      : taskFilter === 'onhold'
                        ? `${selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]}에서 보류된 할일이 없습니다.`
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
                        {task.creator_name && <span className="ml-1 text-slate-400 dark:text-slate-500">· 생성: {task.creator_name}</span>}
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
                          : task.status === 'on-hold'
                            ? 'bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300'
                            : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    )}
                  >
                    {task.status === 'todo' ? '진행 전' : task.status === 'in-progress' ? '진행중' : task.status === 'on-hold' ? '보류' : '완료'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

