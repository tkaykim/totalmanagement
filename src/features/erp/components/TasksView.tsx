'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { BuTabs } from './BuTabs';
import { BU, BU_TITLES, Project, TaskItem } from '../types';

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
  const [taskFilter, setTaskFilter] = useState<'active' | 'completed'>('active');

  const buProjects = bu === 'ALL' ? projects : projects.filter((p) => p.bu === bu);
  const buProjectIds = buProjects.map((p) => p.id);
  const buTasks = bu === 'ALL' ? tasks : tasks.filter((t) => buProjectIds.includes(t.projectId));

  const rows = useMemo(() => {
    if (taskFilter === 'active') {
      return buTasks.filter((t) => t.status === 'todo' || t.status === 'in-progress');
    } else {
      return buTasks.filter((t) => t.status === 'done');
    }
  }, [buTasks, taskFilter]);

  const findProject = (id: string) => projects.find((p) => p.id === id)?.name ?? '-';

  return (
    <section className="space-y-6">
      <BuTabs bu={bu} onChange={onBuChange} prefix="TASK" />

      <div className="max-w-full overflow-x-auto">
        <div className="flex w-fit rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          <button
            onClick={() => setTaskFilter('active')}
            className={cn(
              'px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold transition whitespace-nowrap rounded-lg flex-shrink-0',
              taskFilter === 'active'
                ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
            )}
          >
            진행예정/진행중
          </button>
          <button
            onClick={() => setTaskFilter('completed')}
            className={cn(
              'px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold transition whitespace-nowrap rounded-lg flex-shrink-0',
              taskFilter === 'completed'
                ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
            )}
          >
            완료
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 p-3 sm:p-4 lg:p-6">
          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{bu === 'ALL' ? '전체' : BU_TITLES[bu]} 할일 관리</h3>
          <span className="text-[9px] sm:text-[10px] lg:text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0">{rows.length}건</span>
        </div>
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-[10px] sm:text-[11px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
              <tr>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">프로젝트</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">할일</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">담당자</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">마감일</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className="cursor-pointer transition hover:bg-slate-50 dark:bg-slate-900"
                >
                  <td className="px-3 sm:px-6 py-3 font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[120px] sm:max-w-none">
                    {findProject(task.projectId)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-none">{task.title}</td>
                  <td className="px-3 sm:px-6 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{task.assignee}</td>
                  <td className="px-3 sm:px-6 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{task.dueDate}</td>
                  <td className="px-3 sm:px-6 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onChange={(e) => onStatusChange(task.id, e.target.value as TaskItem['status'])}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[10px] sm:text-[11px] outline-none w-full"
                    >
                      <option value="todo">진행 전</option>
                      <option value="in-progress">진행중</option>
                      <option value="done">완료</option>
                    </select>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    {taskFilter === 'active'
                      ? '진행 예정이거나 진행 중인 할일이 없습니다.'
                      : '완료된 할일이 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
          {rows.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              {taskFilter === 'active'
                ? '진행 예정이거나 진행 중인 할일이 없습니다.'
                : '완료된 할일이 없습니다.'}
            </div>
          ) : (
            rows.map((task) => (
              <button
                key={task.id}
                onClick={() => onEditTask(task)}
                className="w-full px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mb-1">{task.title}</p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">{findProject(task.projectId)}</p>
                  </div>
                  <select
                    value={task.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onStatusChange(task.id, e.target.value as TaskItem['status'])}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[9px] outline-none flex-shrink-0"
                  >
                    <option value="todo">진행 전</option>
                    <option value="in-progress">진행중</option>
                    <option value="done">완료</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="whitespace-nowrap">담당자: {task.assignee}</span>
                  <span className="whitespace-nowrap">마감일: {task.dueDate}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
