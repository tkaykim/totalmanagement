'use client';

import { useMemo } from 'react';
import { ChartLine, Coins, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BU,
  Project,
  FinancialEntry,
  FinancialEntryStatus,
  formatCurrency,
} from '../types';
import { BuTabs } from './BuTabs';
import { StatCard } from './StatCard';

export interface SettlementViewProps {
  bu: BU | 'ALL';
  onBuChange: (bu: BU | 'ALL') => void;
  rows: { revRows: FinancialEntry[]; expRows: FinancialEntry[] };
  projects: Project[];
  onEditFinance: (entry: FinancialEntry) => void;
  canViewAllBu?: boolean;
  canViewNetProfit?: boolean;
}

export function SettlementView({
  bu,
  onBuChange,
  rows,
  projects,
  onEditFinance,
  canViewAllBu = false,
  canViewNetProfit = true,
}: SettlementViewProps) {
  const findProject = (id: string) => projects.find((p) => p.id === id)?.name ?? '-';

  const getStatusLabel = (status: FinancialEntryStatus) => {
    if (status === 'paid') return '지급완료';
    if (status === 'planned') return '지급예정';
    if (status === 'canceled') return '취소';
    return status;
  };

  const getStatusClass = (status: FinancialEntryStatus) => {
    if (status === 'paid') return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
    if (status === 'planned') return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300';
    if (status === 'canceled') return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300';
    return 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300';
  };

  const totalRevenue = useMemo(() => {
    return rows.revRows.reduce((sum, r) => sum + r.amount, 0);
  }, [rows.revRows]);

  const totalExpense = useMemo(() => {
    return rows.expRows.reduce((sum, e) => sum + e.amount, 0);
  }, [rows.expRows]);

  const totalProfit = useMemo(() => {
    return totalRevenue - totalExpense;
  }, [totalRevenue, totalExpense]);

  return (
    <section className="space-y-6">
      <BuTabs bu={bu} onChange={onBuChange} prefix="SET" showAll={canViewAllBu} />

      <div className={cn("grid grid-cols-1 gap-4", canViewNetProfit ? "md:grid-cols-3" : "md:grid-cols-2")}>
        <StatCard
          title="총 매출"
          value={totalRevenue}
          icon={<DollarSign className="h-5 w-5 text-blue-500" />}
          accent="text-blue-600"
        />
        <StatCard
          title="총 지출"
          value={totalExpense}
          icon={<Coins className="h-5 w-5 text-red-500" />}
          accent="text-red-600"
        />
        {canViewNetProfit && (
          <StatCard
            title="순익"
            value={totalProfit}
            icon={<ChartLine className="h-5 w-5 text-emerald-500" />}
            accent="text-emerald-600"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <table className="w-full text-left text-[10px] sm:text-[11px]">
            <thead className="border-b border-slate-100 dark:border-slate-700 bg-blue-50/40 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              <tr>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">프로젝트</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">구분</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight text-blue-600 dark:text-blue-400 whitespace-nowrap">금액</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">결제일</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 dark:divide-slate-700" id="revenue-list-body">
              {rows.revRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 sm:px-6 py-6 text-center text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
                    등록된 매출이 없습니다.
                  </td>
                </tr>
              ) : (
                <>
                  {rows.revRows.map((r, idx) => (
                    <tr
                      key={`${r.projectId}-${idx}`}
                      onClick={() => onEditFinance(r)}
                      className="cursor-pointer transition hover:bg-blue-50/30 dark:hover:bg-blue-900/20"
                    >
                      <td className="px-3 sm:px-6 py-4 font-bold text-slate-500 dark:text-slate-400 truncate max-w-[100px] sm:max-w-none">{findProject(r.projectId)}</td>
                      <td className="px-3 sm:px-6 py-4 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px] sm:max-w-none">{r.category}</td>
                      <td className="px-3 sm:px-6 py-4 font-black text-blue-600 italic whitespace-nowrap">{formatCurrency(r.amount)}</td>
                      <td className="px-3 sm:px-6 py-4 font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">{r.date}</td>
                      <td className="px-3 sm:px-6 py-4">
                        <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap', getStatusClass(r.status))}>
                          {getStatusLabel(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50/20 dark:bg-blue-900/30 border-t-2 border-blue-200 dark:border-blue-700">
                    <td colSpan={2} className="px-3 sm:px-6 py-4 font-bold text-slate-700 dark:text-slate-300">합계</td>
                    <td className="px-3 sm:px-6 py-4 font-black text-blue-600 dark:text-blue-400 italic whitespace-nowrap">{formatCurrency(totalRevenue)}</td>
                    <td className="px-3 sm:px-6 py-4"></td>
                    <td className="px-3 sm:px-6 py-4"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <table className="w-full text-left text-[10px] sm:text-[11px]">
            <thead className="border-b border-slate-100 dark:border-slate-700 bg-red-50/40 dark:bg-red-900/30 text-red-700 dark:text-red-300">
              <tr>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">프로젝트</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">구분</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight text-red-500 dark:text-red-400 whitespace-nowrap">금액</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">결제일</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 dark:divide-slate-700" id="expense-list-body">
              {rows.expRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 sm:px-6 py-6 text-center text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
                    등록된 지출이 없습니다.
                  </td>
                </tr>
              ) : (
                <>
                  {rows.expRows.map((e, idx) => (
                    <tr
                      key={`${e.projectId}-${idx}`}
                      onClick={() => onEditFinance(e)}
                      className="cursor-pointer transition hover:bg-red-50/30 dark:hover:bg-red-900/20"
                    >
                      <td className="px-3 sm:px-6 py-4 font-bold text-slate-500 dark:text-slate-400 truncate max-w-[100px] sm:max-w-none">{findProject(e.projectId)}</td>
                      <td className="px-3 sm:px-6 py-4 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px] sm:max-w-none">{e.category}</td>
                      <td className="px-3 sm:px-6 py-4 font-black text-red-500 italic whitespace-nowrap">{formatCurrency(e.amount)}</td>
                      <td className="px-3 sm:px-6 py-4 font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">{e.date}</td>
                      <td className="px-3 sm:px-6 py-4">
                        <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap', getStatusClass(e.status))}>
                          {getStatusLabel(e.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-red-50/20 dark:bg-red-900/30 border-t-2 border-red-200 dark:border-red-700">
                    <td colSpan={2} className="px-3 sm:px-6 py-4 font-bold text-slate-700 dark:text-slate-300">합계</td>
                    <td className="px-3 sm:px-6 py-4 font-black text-red-500 dark:text-red-400 italic whitespace-nowrap">{formatCurrency(totalExpense)}</td>
                    <td className="px-3 sm:px-6 py-4"></td>
                    <td className="px-3 sm:px-6 py-4"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

