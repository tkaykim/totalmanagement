'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Tag } from 'lucide-react';
import type { Project } from '../types';

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

export function ProjectDetailInfo({ project }: ProjectDetailInfoProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasDescription = project.description && project.description.trim().length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 sm:px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
      >
        <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
          설명
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 sm:px-5 py-3 space-y-3">
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

          {hasDescription ? (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {project.description}
            </p>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              설명이 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
