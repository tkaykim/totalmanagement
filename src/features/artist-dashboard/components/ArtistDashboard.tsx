'use client';

import { FolderKanban, CheckCircle2, Wallet, RefreshCw, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useArtistDashboard, useUpdateArtistTaskStatus } from '../hooks';
import { ProjectsSection } from './ProjectsSection';
import { TasksSection } from './TasksSection';
import { SettlementSection } from './SettlementSection';
import type { ArtistProject, ArtistTask, ArtistSettlement } from '../types';

interface ArtistDashboardProps {
  userName?: string;
  onProjectClick?: (project: ArtistProject) => void;
  onTaskClick?: (task: ArtistTask) => void;
  onSettlementClick?: (settlement: ArtistSettlement) => void;
}

const formatCurrency = (value: number) =>
  `₩ ${value.toLocaleString('ko-KR')}`;

export function ArtistDashboard({ 
  userName,
  onProjectClick,
  onTaskClick,
  onSettlementClick,
}: ArtistDashboardProps) {
  const { projects, tasks, settlements, isLoading, error, refetch } = useArtistDashboard();
  const updateTaskStatus = useUpdateArtistTaskStatus();

  const handleStatusChange = (taskId: number, status: 'todo' | 'in_progress' | 'done') => {
    updateTaskStatus.mutate({ taskId, status });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {userName ? `${userName}님의 대시보드` : '아티스트 대시보드'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              프로젝트, 할일, 정산 현황을 한눈에 확인하세요
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          새로고침
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">진행 중 프로젝트</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {projects?.summary.in_progress || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">미완료 할일</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {tasks?.summary.pending || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">정산 확정/지급</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(
                  (settlements?.summary?.confirmed?.amount || 0) + 
                  (settlements?.summary?.paid?.amount || 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 프로젝트 섹션 */}
        <ProjectsSection
          projects={projects?.projects || []}
          summary={projects?.summary || { proposal: 0, in_progress: 0, completed: 0, total: 0 }}
          onProjectClick={onProjectClick}
        />

        {/* 할일 섹션 */}
        <TasksSection
          tasks={tasks?.tasks || []}
          grouped={tasks?.grouped || { todo: [], in_progress: [], done: [] }}
          summary={tasks?.summary || { todo: 0, in_progress: 0, done: 0, total: 0, pending: 0 }}
          onTaskClick={onTaskClick}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* 정산 섹션 */}
      <SettlementSection
        settlements={settlements?.settlements || []}
        partnerSettlements={settlements?.partnerSettlements || []}
        summary={settlements?.summary || {
          draft: { count: 0, amount: 0 },
          confirmed: { count: 0, amount: 0 },
          paid: { count: 0, amount: 0 },
          total: { count: 0, amount: 0 },
        }}
        onSettlementClick={onSettlementClick}
      />
    </div>
  );
}
