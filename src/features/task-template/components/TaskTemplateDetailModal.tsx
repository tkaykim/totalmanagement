'use client';

import { useMemo } from 'react';
import { X, FileText, Clock, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BU_TITLES } from '@/features/erp/types';
import type { TaskTemplate, TaskTemplateTask, TaskPriority } from '@/types/database';
import { Button } from '@/components/ui/button';

interface TaskTemplateDetailModalProps {
  template: TaskTemplate;
  onClose: () => void;
  onEdit?: () => void;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string; dot: string }> = {
  high: {
    label: '높음',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-900/30',
    dot: 'bg-rose-500',
  },
  medium: {
    label: '보통',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    dot: 'bg-amber-400',
  },
  low: {
    label: '낮음',
    color: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-800',
    dot: 'bg-slate-400',
  },
};

function formatDayLabel(daysBefore: number): string {
  if (daysBefore > 0) return `D-${daysBefore}`;
  if (daysBefore === 0) return 'D-Day';
  return `D+${Math.abs(daysBefore)}`;
}

function groupTasksByPhase(tasks: TaskTemplateTask[]): { phase: string; tasks: TaskTemplateTask[] }[] {
  const sorted = [...tasks].sort((a, b) => b.days_before - a.days_before);

  const groups: { phase: string; min: number; max: number; tasks: TaskTemplateTask[] }[] = [];

  for (const task of sorted) {
    const d = task.days_before;
    let phaseName: string;

    if (d > 60) phaseName = '사전 준비 (D-60 이전)';
    else if (d > 30) phaseName = '기획/섭외 단계 (D-60 ~ D-31)';
    else if (d > 14) phaseName = '실행 준비 (D-30 ~ D-15)';
    else if (d > 7) phaseName = '최종 점검 (D-14 ~ D-8)';
    else if (d > 0) phaseName = '직전 준비 (D-7 ~ D-1)';
    else if (d === 0) phaseName = '당일 (D-Day)';
    else phaseName = '사후 처리 (D-Day 이후)';

    const existing = groups.find((g) => g.phase === phaseName);
    if (existing) {
      existing.tasks.push(task);
    } else {
      groups.push({ phase: phaseName, min: d, max: d, tasks: [task] });
    }
  }

  return groups;
}

function TaskRow({ task, isLast }: { task: TaskTemplateTask; isLast: boolean }) {
  const priority = task.priority || 'medium';
  const config = PRIORITY_CONFIG[priority];

  return (
    <div className="flex gap-3">
      {/* 타임라인 선 */}
      <div className="flex flex-col items-center pt-1">
        <div className={cn('w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-800 flex-shrink-0', config.dot)} />
        {!isLast && (
          <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
        )}
      </div>

      {/* 내용 */}
      <div className={cn('flex-1 pb-4', isLast && 'pb-0')}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
              {task.condition_key && (
                <span className="inline-block mr-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400 align-middle">
                  조건부
                </span>
              )}
              {task.title}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3" />
                {formatDayLabel(task.days_before)}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md',
                config.bgColor, config.color,
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
                {config.label}
              </span>
              {task.assignee_role && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                  {task.assignee_role === 'manager' ? '매니저' : task.assignee_role === 'staff' ? '스태프' : task.assignee_role}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskTemplateDetailModal({ template, onClose, onEdit }: TaskTemplateDetailModalProps) {
  const tasks = template.tasks || [];
  const phases = useMemo(() => groupTasksByPhase(tasks), [tasks]);

  const highCount = tasks.filter((t) => t.priority === 'high').length;
  const mediumCount = tasks.filter((t) => (t.priority || 'medium') === 'medium').length;
  const lowCount = tasks.filter((t) => t.priority === 'low').length;

  const optionEntries = template.options_schema?.properties
    ? Object.entries(template.options_schema.properties)
    : [];

  const earliestDay = tasks.length > 0 ? Math.max(...tasks.map((t) => t.days_before)) : 0;
  const latestDay = tasks.length > 0 ? Math.min(...tasks.map((t) => t.days_before)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 truncate">
                  {template.name}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-block rounded-md bg-blue-50 dark:bg-blue-900/50 px-2 py-1 text-[10px] font-semibold text-blue-600 dark:text-blue-300">
                  {BU_TITLES[template.bu_code]}
                </span>
                <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                  {template.template_type}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {template.description && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {template.description}
            </p>
          )}

          {/* 요약 통계 */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{tasks.length}</p>
              <p className="text-[10px] text-slate-500">전체 할일</p>
            </div>
            <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-center">
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{highCount}</p>
              <p className="text-[10px] text-rose-500">높은 우선순위</p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-center">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{mediumCount}</p>
              <p className="text-[10px] text-amber-500">보통 우선순위</p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-slate-600 dark:text-slate-400">
                {earliestDay > 0 ? `D-${earliestDay}` : 'D-Day'}
                {latestDay < 0 ? ` ~ D+${Math.abs(latestDay)}` : ''}
              </p>
              <p className="text-[10px] text-slate-500">기간 범위</p>
            </div>
          </div>

          {/* 옵션 스키마 */}
          {optionEntries.length > 0 && (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-3">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                생성 시 설정 옵션
              </p>
              <div className="flex flex-wrap gap-2">
                {optionEntries.map(([key, prop]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg"
                  >
                    {(prop as any).title || key}
                    {template.options_schema.required?.includes(key) && (
                      <span className="text-rose-500 text-[10px]">*</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 할일 타임라인 */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-blue-500" />
            할일 타임라인
            <span className="text-xs font-normal text-slate-400">(기준일로부터 역순)</span>
          </h3>

          <div className="space-y-6">
            {phases.map((group, groupIdx) => (
              <div key={group.phase}>
                {/* 단계 헤더 */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap px-2">
                    {group.phase}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {group.tasks.length}건
                  </span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>

                {/* 할일 목록 */}
                <div className="ml-1">
                  {group.tasks.map((task, taskIdx) => (
                    <TaskRow
                      key={`${groupIdx}-${taskIdx}`}
                      task={task}
                      isLast={taskIdx === group.tasks.length - 1}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-end gap-3">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              수정하기
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
