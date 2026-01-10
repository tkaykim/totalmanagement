'use client';

import { useState } from 'react';
import { FolderKanban, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArtistProject, ProjectTab } from '../types';

interface ProjectsSectionProps {
  projects: ArtistProject[];
  summary: {
    proposal: number;
    in_progress: number;
    completed: number;
    total: number;
  };
  onProjectClick?: (project: ArtistProject) => void;
}

const PROJECT_STATUS_STYLES: Record<string, string> = {
  '준비중': 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
  '기획중': 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
  '진행중': 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  '운영중': 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
  '완료': 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
};

const TAB_CONFIG: { key: ProjectTab; label: string; statuses: string[] }[] = [
  { key: 'proposal', label: '제안/조율 중', statuses: ['준비중', '기획중'] },
  { key: 'in_progress', label: '진행 중', statuses: ['진행중', '운영중'] },
  { key: 'completed', label: '완료', statuses: ['완료'] },
];

export function ProjectsSection({ projects, summary, onProjectClick }: ProjectsSectionProps) {
  const [activeTab, setActiveTab] = useState<ProjectTab>('proposal');

  const filteredProjects = projects.filter((project) => {
    const tabConfig = TAB_CONFIG.find((t) => t.key === activeTab);
    return tabConfig?.statuses.includes(project.status);
  });

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-blue-500" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">내 프로젝트</h3>
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          총 {summary.total}개
        </span>
      </div>

      {/* 탭 */}
      <div className="mb-4 flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
        {TAB_CONFIG.map((tab) => {
          const count = tab.key === 'proposal' ? summary.proposal 
            : tab.key === 'in_progress' ? summary.in_progress 
            : summary.completed;
          
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg flex items-center gap-1.5',
                activeTab === tab.key
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  activeTab === tab.key
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 프로젝트 목록 */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {activeTab === 'proposal' && '제안/조율 중인 프로젝트가 없습니다.'}
              {activeTab === 'in_progress' && '진행 중인 프로젝트가 없습니다.'}
              {activeTab === 'completed' && '완료된 프로젝트가 없습니다.'}
            </p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => onProjectClick?.(project)}
              className="flex items-center justify-between w-full rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4 transition hover:border-blue-200 dark:hover:border-blue-600 hover:shadow-md text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    'rounded px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
                    PROJECT_STATUS_STYLES[project.status] || 'bg-slate-100 text-slate-700'
                  )}>
                    {project.status}
                  </span>
                  {project.connection_type === 'participant' && (
                    <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                      참여
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate mb-1">
                  {project.name}
                </p>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {project.start_date || '미정'} ~ {project.end_date || '미정'}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
