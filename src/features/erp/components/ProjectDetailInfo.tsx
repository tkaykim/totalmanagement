'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Minus, Calendar, Tag } from 'lucide-react';
import type { Project } from '../types';
import { cn } from '@/lib/utils';

type ExpandState = 'collapsed' | 'compact' | 'expanded';

interface ProjectDetailInfoProps {
  project: Project;
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}.${month}.${day}`;
}

const STATE_CYCLE: Record<ExpandState, ExpandState> = {
  collapsed: 'compact',
  compact: 'expanded',
  expanded: 'collapsed',
};

const STATE_LABELS: Record<ExpandState, string> = {
  collapsed: '펼치기',
  compact: '더보기',
  expanded: '접기',
};

export function ProjectDetailInfo({ project }: ProjectDetailInfoProps) {
  const [expandState, setExpandState] = useState<ExpandState>('compact');

  const hasDescription = project.description && project.description.trim().length > 0;

  const handleToggle = () => {
    setExpandState(STATE_CYCLE[expandState]);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-4 sm:px-5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
            설명
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {STATE_LABELS[expandState]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {expandState !== 'collapsed' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpandState('collapsed');
              }}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="완전히 접기"
            >
              <Minus className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}
          {expandState === 'collapsed' ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : expandState === 'compact' ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {expandState !== 'collapsed' && (
        <div
          className={cn(
            'border-t border-slate-100 dark:border-slate-700 px-4 sm:px-5 transition-all',
            expandState === 'compact' ? 'py-2' : 'py-3 space-y-3',
          )}
        >
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-medium">
                {formatDate(project.startDate)} ~ {formatDate(project.endDate)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              <span className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 font-medium text-slate-600 dark:text-slate-300">
                {project.cat}
              </span>
            </div>
          </div>

          {expandState === 'expanded' && (
            <>
              {hasDescription ? (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {project.description}
                </p>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                  설명이 없습니다.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
