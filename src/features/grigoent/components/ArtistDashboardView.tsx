'use client';

import { useMemo } from 'react';
import { ArtistProfileCard } from './ArtistProfileCard';
import { parseISO, differenceInDays, isWithinInterval } from 'date-fns';
import type { Artist, Project, FinancialEntry } from '@/types/database';
import { dbProjectToFrontend, dbFinancialToFrontend } from '@/features/erp/utils';

interface ArtistDashboardViewProps {
  artist: Artist;
  projects: Project[];
  financialEntries: FinancialEntry[];
  financialSummary: {
    totalRevenue: number;
    totalExpense: number;
    totalProfit: number;
  };
  activePeriod: { start?: string; end?: string };
}

const isDateInRange = (date: string, start?: string, end?: string) => {
  if (!start || !end) return true;
  const target = parseISO(date);
  return isWithinInterval(target, { start: parseISO(start), end: parseISO(end) });
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

export function ArtistDashboardView({
  artist,
  projects,
  financialEntries,
  financialSummary: initialSummary,
  activePeriod,
}: ArtistDashboardViewProps) {
  // 비자 기간 계산
  const visaStatus = useMemo(() => {
    if (!artist.visa_start || !artist.visa_end) {
      return null;
    }

    const startDate = parseISO(artist.visa_start);
    const endDate = parseISO(artist.visa_end);
    const today = new Date();
    const daysRemaining = differenceInDays(endDate, today);

    return {
      start: artist.visa_start,
      end: artist.visa_end,
      daysRemaining,
      isExpired: daysRemaining < 0,
      isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 30,
    };
  }, [artist]);

  // 날짜 필터링된 정산 데이터
  const filteredFinancials = useMemo(() => {
    const entries = financialEntries.map((f: FinancialEntry) => dbFinancialToFrontend(f));
    return entries.filter((entry) => isDateInRange(entry.date, activePeriod.start, activePeriod.end));
  }, [financialEntries, activePeriod]);

  // 필터링된 정산 요약
  const financialSummary = useMemo(() => {
    if (!activePeriod.start || !activePeriod.end) {
      return initialSummary;
    }

    const revenue = filteredFinancials.filter((f) => f.type === 'revenue').reduce((sum, f) => sum + f.amount, 0);
    const expense = filteredFinancials.filter((f) => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
    const profit = revenue - expense;

    return {
      totalRevenue: revenue,
      totalExpense: expense,
      totalProfit: profit,
    };
  }, [activePeriod, filteredFinancials, initialSummary]);

  // 진행중 프로젝트 개수
  const activeProjectsCount = useMemo(() => {
    const frontendProjects = projects.map((p: Project) => dbProjectToFrontend(p));
    return frontendProjects.filter((p) => p.status === '진행중' || p.status === '운영중').length;
  }, [projects]);

  // 완료 프로젝트 개수
  const completedProjectsCount = useMemo(() => {
    const frontendProjects = projects.map((p: Project) => dbProjectToFrontend(p));
    return frontendProjects.filter((p) => p.status === '완료').length;
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* 프로필 카드 */}
      <ArtistProfileCard artist={artist} visaStatus={visaStatus} />

      {/* 요약 정보 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            총 프로젝트
          </p>
          <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">{projects.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            진행중
          </p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300">{activeProjectsCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
            완료
          </p>
          <p className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-slate-300">{completedProjectsCount}</p>
        </div>
        <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
            순이익
          </p>
          <p className="text-lg sm:text-2xl font-bold text-purple-700 dark:text-purple-300 break-all">
            {formatCurrency(financialSummary.totalProfit)}
          </p>
        </div>
      </div>

      {/* 정산 요약 */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4">정산 요약</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              매출
            </p>
            <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-300 break-all">
              {formatCurrency(financialSummary.totalRevenue)}
            </p>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
              지출
            </p>
            <p className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-300 break-all">
              {formatCurrency(financialSummary.totalExpense)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
              순이익
            </p>
            <p className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-300 break-all">
              {formatCurrency(financialSummary.totalProfit)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

