'use client';

import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BU,
  Project,
  TaskItem,
  FinancialEntry,
  formatCurrency,
} from '../types';
import { BuTabs } from './BuTabs';
import { FinanceRow } from './FinanceRow';

export interface ProjectsViewProps {
  bu: BU | 'ALL';
  onBuChange: (bu: BU | 'ALL') => void;
  projects: Project[];
  revenues: FinancialEntry[];
  expenses: FinancialEntry[];
  onOpenModal: (id: string) => void;
  onOpenTaskModal: (projectId: string) => void;
  onEditFinance: (entry: FinancialEntry) => void;
  onEditTask: (task: TaskItem) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  tasks: TaskItem[];
  usersData?: { users: any[]; currentUser: any };
  partnerWorkersData?: any[];
  partnerCompaniesData?: any[];
}

export function ProjectsView({
  bu,
  onBuChange,
  projects,
  revenues,
  expenses,
  onOpenModal,
  onOpenTaskModal,
  onEditFinance,
  onEditTask,
  onEditProject,
  onDeleteProject,
  tasks,
  usersData,
}: ProjectsViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<'active' | 'completed'>('active');

  const activeProjectStatuses = ['준비중', '기획중', '진행중', '운영중'];
  const completedProjectStatuses = ['완료'];
  
  const filteredProjects = useMemo(() => {
    if (projectFilter === 'active') {
      return projects.filter((p) => activeProjectStatuses.includes(p.status));
    } else {
      return projects.filter((p) => completedProjectStatuses.includes(p.status));
    }
  }, [projects, projectFilter]);

  return (
    <section className="space-y-6">
      <BuTabs bu={bu} onChange={onBuChange} prefix="BU" />

      <div className="flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
        <button
          onClick={() => setProjectFilter('active')}
          className={cn(
            'px-4 py-2 text-xs font-semibold transition whitespace-nowrap rounded-lg',
            projectFilter === 'active'
              ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
          )}
        >
          진행예정/진행중
        </button>
        <button
          onClick={() => setProjectFilter('completed')}
          className={cn(
            'px-4 py-2 text-xs font-semibold transition whitespace-nowrap rounded-lg',
            projectFilter === 'completed'
              ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
          )}
        >
          완료
        </button>
      </div>

      <div className="space-y-3">
        {filteredProjects.length === 0 ? (
          <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <div className="px-4 sm:px-6 py-8 sm:py-12 text-center">
              <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500">
                {projectFilter === 'active'
                  ? '현재 진행중인 프로젝트가 없습니다.'
                  : '완료된 프로젝트가 없습니다.'}
              </p>
            </div>
          </div>
        ) : (
          filteredProjects.map((p) => {
            const projectTasks = tasks.filter((t) => t.projectId === p.id);
            const projectRevenues = revenues.filter((r) => r.projectId === p.id);
            const projectExpenses = expenses.filter((e) => e.projectId === p.id);
            const revTotal = projectRevenues.reduce((sum, r) => sum + r.amount, 0);
            const expTotal = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
            const profit = revTotal - expTotal;
            const opened = openId === p.id;

            return (
            <div
              key={p.id}
              className="overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
            >
              <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
                <button
                  onClick={() => setOpenId(opened ? null : p.id)}
                  className="flex flex-1 items-center justify-between text-left"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{p.name}</p>
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {p.cat}
                      </span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-emerald-700 whitespace-nowrap">
                        할일 {projectTasks.length}개
                      </span>
                    </div>
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {p.startDate} ~ {p.endDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                    <div className="text-right text-[9px] sm:text-[11px]">
                      <p className="font-semibold text-blue-600 whitespace-nowrap">{formatCurrency(revTotal)}</p>
                      <p className="text-red-500 whitespace-nowrap">- {formatCurrency(expTotal)}</p>
                      <p className="font-semibold text-emerald-600 whitespace-nowrap">
                        {profit >= 0 ? '+' : ''}
                        {formatCurrency(profit)}
                      </p>
                    </div>
                    <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {opened ? '접기 ▲' : '펼치기 ▼'}
                    </span>
                  </div>
                </button>
                <div className="ml-2 sm:ml-4 flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditProject(p);
                    }}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-900 hover:text-blue-600"
                    title="프로젝트 수정"
                  >
                    <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(p.id);
                    }}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                    title="프로젝트 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>
              </div>

              {opened && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 sm:px-6 py-4 sm:py-5">
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-600">
                          Project Tasks
                        </h4>
                        <button
                          onClick={() => onOpenTaskModal(p.id)}
                          className="rounded-lg bg-emerald-500 px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-semibold text-white hover:bg-emerald-600 whitespace-nowrap"
                        >
                          할일 추가
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {projectTasks.length === 0 && (
                          <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
                            등록된 할 일이 없습니다.
                          </p>
                        )}
                        {projectTasks.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => onEditTask(t)}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 sm:px-3 py-2 text-left transition hover:bg-slate-50 dark:bg-slate-900"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {t.title}
                              </p>
                              <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                {t.assignee} • {t.dueDate}
                              </p>
                            </div>
                            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[8px] sm:text-[9px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap flex-shrink-0 ml-2">
                              {t.status === 'todo'
                                ? 'TODO'
                                : t.status === 'in-progress'
                                  ? 'IN PROGRESS'
                                  : 'DONE'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-blue-600">
                          매출 내역
                        </h4>
                        <button
                          onClick={() => onOpenModal(p.id)}
                          className="rounded-lg border border-blue-200 px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-semibold text-blue-600 hover:bg-blue-600 hover:text-white whitespace-nowrap"
                        >
                          매출/지출 관리
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {projectRevenues.length === 0 && (
                          <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
                            등록된 매출이 없습니다.
                          </p>
                        )}
                        {projectRevenues.map((r, idx) => (
                          <FinanceRow
                            key={`${r.projectId}-rev-${idx}`}
                            entry={r}
                            tone="blue"
                            onClick={() => onEditFinance(r)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-red-600">
                        지출 내역
                      </h4>
                      <div className="space-y-1.5">
                        {projectExpenses.length === 0 && (
                          <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
                            등록된 지출이 없습니다.
                          </p>
                        )}
                        {projectExpenses.map((e, idx) => (
                          <FinanceRow
                            key={`${e.projectId}-exp-${idx}`}
                            entry={e}
                            tone="red"
                            onClick={() => onEditFinance(e)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
          })
        )}
      </div>
    </section>
  );
}

