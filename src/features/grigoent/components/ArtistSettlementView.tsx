'use client';

import { useMemo } from 'react';
import { parseISO, isWithinInterval } from 'date-fns';
import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, FinancialEntry } from '@/types/database';
import { dbFinancialToFrontend } from '@/features/erp/utils';

interface ArtistSettlementViewProps {
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

export function ArtistSettlementView({
  projects,
  financialEntries,
  financialSummary: initialSummary,
  activePeriod,
}: ArtistSettlementViewProps) {
  const filteredFinancials = useMemo(() => {
    const entries = financialEntries.map((f: FinancialEntry) => dbFinancialToFrontend(f));
    return entries.filter((entry) => isDateInRange(entry.date, activePeriod.start, activePeriod.end));
  }, [financialEntries, activePeriod]);

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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-500" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">정산 현황</h2>
          </div>
        </div>

        {/* 정산 요약 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
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

        {/* 정산 내역 - 모바일은 카드, 데스크톱은 테이블 */}
        {filteredFinancials.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-sm text-slate-500 dark:text-slate-400">정산 내역이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 모바일: 카드 형식 */}
            <div className="space-y-3 sm:hidden">
              {filteredFinancials.map((entry) => {
                const project = projects.find((p: Project) => p.id === Number(entry.projectId));
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'rounded-xl border p-4',
                      entry.type === 'revenue'
                        ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20'
                        : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20',
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              'px-2 py-1 rounded text-xs font-semibold',
                              entry.type === 'revenue'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
                            )}
                          >
                            {entry.type === 'revenue' ? '매출' : '지출'}
                          </span>
                          <span
                            className={cn(
                              'px-2 py-1 rounded text-xs font-semibold',
                              entry.status === 'paid'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
                            )}
                          >
                            {entry.status === 'paid' ? '완료' : '예정'}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1 truncate">
                          {entry.name}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{project?.name || '-'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">{entry.category}</p>
                      </div>
                      <div className="flex-shrink-0 ml-3 text-right">
                        <p
                          className={cn(
                            'text-base font-bold',
                            entry.type === 'revenue'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-red-600 dark:text-red-400',
                          )}
                        >
                          {formatCurrency(entry.amount)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{entry.date}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 데스크톱: 테이블 형식 */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">프로젝트</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">구분</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">카테고리</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">내용</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">금액</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">날짜</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredFinancials.map((entry) => {
                    const project = projects.find((p: Project) => p.id === Number(entry.projectId));
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{project?.name || '-'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'px-2 py-1 rounded text-xs font-semibold',
                              entry.type === 'revenue'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
                            )}
                          >
                            {entry.type === 'revenue' ? '매출' : '지출'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{entry.category}</td>
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{entry.name}</td>
                        <td
                          className={cn(
                            'px-4 py-3 text-right font-semibold',
                            entry.type === 'revenue'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-red-600 dark:text-red-400',
                          )}
                        >
                          {formatCurrency(entry.amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{entry.date}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'px-2 py-1 rounded text-xs font-semibold',
                              entry.status === 'paid'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
                            )}
                          >
                            {entry.status === 'paid' ? '완료' : '예정'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

