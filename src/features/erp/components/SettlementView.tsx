'use client';

import { useMemo, useState } from 'react';
import { ChartLine, Coins, DollarSign, PieChart, FileText } from 'lucide-react';
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
import { ProjectShareTab, SettlementListTab } from '@/features/settlement/components';

type SettlementTabType = 'overview' | 'project-share' | 'settlements';

export interface SettlementViewProps {
  bu: BU | 'ALL';
  onBuChange: (bu: BU | 'ALL') => void;
  rows: { revRows: FinancialEntry[]; expRows: FinancialEntry[] };
  projects: Project[];
  onEditFinance: (entry: FinancialEntry) => void;
  canViewAllBu?: boolean;
  canViewNetProfit?: boolean;
  activePeriod?: { start?: string; end?: string };
}

export function SettlementView({
  bu,
  onBuChange,
  rows,
  projects,
  onEditFinance,
  canViewAllBu = false,
  canViewNetProfit = true,
  activePeriod,
}: SettlementViewProps) {
  const [activeTab, setActiveTab] = useState<SettlementTabType>('overview');

  const findProject = (id: string) => projects.find((p) => p.id === id)?.name ?? '-';

  const getStatusLabel = (status: FinancialEntryStatus | undefined | null) => {
    if (!status) return '미정';
    if (status === 'paid') return '지급완료';
    if (status === 'planned') return '지급예정';
    if (status === 'canceled') return '취소';
    return String(status);
  };

  const getStatusClass = (status: FinancialEntryStatus | undefined | null) => {
    if (!status) return 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300';
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

  const tabs = [
    { id: 'overview' as const, label: '전체 정산', icon: ChartLine },
    { id: 'project-share' as const, label: '프로젝트별 분배', icon: PieChart },
    { id: 'settlements' as const, label: '정산서 관리', icon: FileText },
  ];

  return (
    <section className="space-y-6">
      <BuTabs bu={bu} onChange={onBuChange} prefix="SET" showAll={canViewAllBu} />

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'project-share' && (
        <ProjectShareTab bu={bu} />
      )}

      {activeTab === 'settlements' && (
        <SettlementListTab />
      )}

      {activeTab === 'overview' && (
        <>

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
        <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <table className="w-full min-w-[500px] text-left text-[10px] sm:text-[11px]">
            <thead className="border-b border-slate-100 dark:border-slate-700 bg-blue-50/40 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              <tr>
                <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">프로젝트</th>
                <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">구분</th>
                <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight text-blue-600 dark:text-blue-400 whitespace-nowrap">금액</th>
                <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">결제일</th>
                <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700" id="revenue-list-body">
              {rows.revRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 sm:px-4 py-6 text-center text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
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
                      <td className="px-2 sm:px-4 py-3 font-bold text-slate-500 dark:text-slate-400 truncate max-w-[80px] sm:max-w-[120px]">{findProject(r.projectId)}</td>
                      <td className="px-2 sm:px-4 py-3 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[60px] sm:max-w-[100px]">{r.category}</td>
                      <td className="px-2 sm:px-4 py-3 font-black text-blue-600 italic whitespace-nowrap">{formatCurrency(r.amount)}</td>
                      <td className="px-2 sm:px-4 py-3 font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap text-[9px] sm:text-[11px]">{r.date}</td>
                      <td className="px-2 sm:px-4 py-3">
                        <span className={cn('px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-semibold whitespace-nowrap', getStatusClass(r.status))}>
                          {getStatusLabel(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50/20 dark:bg-blue-900/30 border-t-2 border-blue-200 dark:border-blue-700">
                    <td colSpan={2} className="px-2 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-300">합계</td>
                    <td className="px-2 sm:px-4 py-3 font-black text-blue-600 dark:text-blue-400 italic whitespace-nowrap">{formatCurrency(totalRevenue)}</td>
                    <td className="px-2 sm:px-4 py-3"></td>
                    <td className="px-2 sm:px-4 py-3"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <table className="w-full min-w-[500px] text-left text-[10px] sm:text-[11px]">
            <thead className="border-b border-slate-100 dark:border-slate-700 bg-red-50/40 dark:bg-red-900/30 text-red-700 dark:text-red-300">
              <tr>
                <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">프로젝트</th>
                <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">구분</th>
                <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight text-red-500 dark:text-red-400 whitespace-nowrap">금액</th>
                <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">결제일</th>
                <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700" id="expense-list-body">
              {rows.expRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 sm:px-4 py-6 text-center text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
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
                      <td className="px-2 sm:px-4 py-3 font-bold text-slate-500 dark:text-slate-400 truncate max-w-[80px] sm:max-w-[120px]">{findProject(e.projectId)}</td>
                      <td className="px-2 sm:px-4 py-3 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[60px] sm:max-w-[100px]">{e.category}</td>
                      <td className="px-2 sm:px-4 py-3 font-black text-red-500 italic whitespace-nowrap">{formatCurrency(e.amount)}</td>
                      <td className="px-2 sm:px-4 py-3 font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap text-[9px] sm:text-[11px]">{e.date}</td>
                      <td className="px-2 sm:px-4 py-3">
                        <span className={cn('px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-semibold whitespace-nowrap', getStatusClass(e.status))}>
                          {getStatusLabel(e.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-red-50/20 dark:bg-red-900/30 border-t-2 border-red-200 dark:border-red-700">
                    <td colSpan={2} className="px-2 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-300">합계</td>
                    <td className="px-2 sm:px-4 py-3 font-black text-red-500 dark:text-red-400 italic whitespace-nowrap">{formatCurrency(totalExpense)}</td>
                    <td className="px-2 sm:px-4 py-3"></td>
                    <td className="px-2 sm:px-4 py-3"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </section>
  );
}

