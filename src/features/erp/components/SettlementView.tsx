'use client';

import { useMemo, useState } from 'react';
import { ChartLine, Coins, DollarSign, Search, Wallet } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { OutstandingTab } from './OutstandingTab';
import { isInternalAllocation, summarizePnl } from '../finance-ui';

/**
 * 정산 화면: 사업부별 매출·지출(개요)과 미수 관리.
 * 파트너 하위 탭(프로젝트별 분배, 정산서 관리)은 외부인 기능이라 숨긴다(R27). 코드는 남긴다.
 */
type SettlementTabType = 'overview' | 'outstanding';
type FinanceViewType = 'revenue' | 'expense';

export interface SettlementViewProps {
  bu: BU | 'ALL';
  onBuChange: (bu: BU | 'ALL') => void;
  rows: { revRows: FinancialEntry[]; expRows: FinancialEntry[] };
  projects: Project[];
  onEditFinance: (entry: FinancialEntry) => void;
  canViewAllBu?: boolean;
  canViewNetProfit?: boolean;
  activePeriod?: { start?: string; end?: string };
  partnerCompaniesData?: Array<{ id: number; company_name_ko?: string; company_name_en?: string }>;
  partnerWorkersData?: Array<{ id: number; name_ko?: string; name_en?: string; name?: string }>;
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
  partnerCompaniesData = [],
  partnerWorkersData = [],
}: SettlementViewProps) {
  const [activeTab, setActiveTab] = useState<SettlementTabType>('overview');
  const [financeViewType, setFinanceViewType] = useState<FinanceViewType>('revenue');
  const [searchQuery, setSearchQuery] = useState('');

  const findProject = (id: string) => projects.find((p) => p.id === id)?.name ?? '-';

  const getPartnerName = (entry: FinancialEntry): string => {
    if (entry.partner_company_id) {
      const company = partnerCompaniesData.find((c) => c.id === entry.partner_company_id);
      return company?.company_name_ko || company?.company_name_en || '-';
    }
    if (entry.partner_worker_id) {
      const worker = partnerWorkersData.find((w) => w.id === entry.partner_worker_id);
      return worker?.name_ko || worker?.name_en || worker?.name || '-';
    }
    return '-';
  };

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

  // R26: '전체' = 회사 손익(내부배부 제외), 사업부 탭 = 관리손익(내부배부 포함). 취소 제외.
  // rows는 이미 탭(행 사업부)으로 걸러져 있으므로 여기서는 'ALL'/사업부 여부만 본다.
  const isCompanyView = bu === 'ALL';
  const pnl = useMemo(
    () => summarizePnl([...rows.revRows, ...rows.expRows], isCompanyView ? 'ALL' : bu),
    [rows.revRows, rows.expRows, isCompanyView, bu]
  );
  const totalRevenue = pnl.revenue;
  const totalExpense = pnl.expense;
  const totalProfit = pnl.profit;
  const labelPrefix = isCompanyView ? '회사' : '관리';
  const totalRowLabel = isCompanyView ? '합계(내부배부 제외)' : '합계(내부 포함)';

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredRevRows = useMemo(() => {
    if (!searchLower) return rows.revRows;
    return rows.revRows.filter((r) => {
      const projName = findProject(r.projectId).toLowerCase();
      const partnerName = getPartnerName(r).toLowerCase();
      return (
        projName.includes(searchLower) ||
        (r.name || '').toLowerCase().includes(searchLower) ||
        (r.category || '').toLowerCase().includes(searchLower) ||
        partnerName.includes(searchLower)
      );
    });
  }, [rows.revRows, searchLower, projects, partnerCompaniesData, partnerWorkersData]);
  const filteredExpRows = useMemo(() => {
    if (!searchLower) return rows.expRows;
    return rows.expRows.filter((e) => {
      const projName = findProject(e.projectId).toLowerCase();
      const partnerName = getPartnerName(e).toLowerCase();
      return (
        projName.includes(searchLower) ||
        (e.name || '').toLowerCase().includes(searchLower) ||
        (e.category || '').toLowerCase().includes(searchLower) ||
        partnerName.includes(searchLower)
      );
    });
  }, [rows.expRows, searchLower, projects, partnerCompaniesData, partnerWorkersData]);

  const filteredTotalRevenue = useMemo(
    () => summarizePnl(filteredRevRows, isCompanyView ? 'ALL' : bu).revenue,
    [filteredRevRows, isCompanyView, bu]
  );
  const filteredTotalExpense = useMemo(
    () => summarizePnl(filteredExpRows, isCompanyView ? 'ALL' : bu).expense,
    [filteredExpRows, isCompanyView, bu]
  );

  const tabs = [
    { id: 'overview' as const, label: '전체 정산', icon: ChartLine },
    { id: 'outstanding' as const, label: '미수 관리', icon: Wallet },
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

      {activeTab === 'outstanding' && (
        <OutstandingTab
          revRows={rows.revRows}
          expRows={rows.expRows}
          projects={projects}
          onEditFinance={onEditFinance}
          getPartnerName={getPartnerName}
          getStatusLabel={getStatusLabel}
          getStatusClass={getStatusClass}
        />
      )}

      {activeTab === 'overview' && (
        <>
          <div className={cn("grid grid-cols-1 gap-4", canViewNetProfit ? "md:grid-cols-3" : "md:grid-cols-2")}>
            <StatCard
              title={`${labelPrefix} 매출`}
              value={totalRevenue}
              icon={<DollarSign className="h-5 w-5 text-blue-500" />}
              accent="text-blue-600"
            />
            <StatCard
              title={`${labelPrefix} 지출`}
              value={totalExpense}
              icon={<Coins className="h-5 w-5 text-red-500" />}
              accent="text-red-600"
            />
            {canViewNetProfit && (
              <StatCard
                title={`${labelPrefix} 순익`}
                value={totalProfit}
                icon={<ChartLine className={cn('h-5 w-5', totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500')} />}
                accent={totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}
              />
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isCompanyView
              ? `회사 손익: 사업부 간 내부배부는 합계에서 뺍니다(취소 제외).${pnl.internalRevenue || pnl.internalExpense ? ` 제외된 내부배부 매출 ${formatCurrency(pnl.internalRevenue)} · 지출 ${formatCurrency(pnl.internalExpense)}` : ''}`
              : `관리손익: 이 사업부 행 전체(내부배부 포함, 취소 제외).${pnl.internalRevenue || pnl.internalExpense ? ` 그중 내부 매출 ${formatCurrency(pnl.internalRevenue)} · 지출 ${formatCurrency(pnl.internalExpense)}` : ''}`}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <Input
                type="search"
                placeholder="프로젝트·항목·지급처 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 sm:h-10 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              />
            </div>
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
              <button
                onClick={() => setFinanceViewType('revenue')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  financeViewType === 'revenue'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <DollarSign className="h-4 w-4" />
                <span>매출</span>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                  {filteredRevRows.length}
                </span>
              </button>
              <button
                onClick={() => setFinanceViewType('expense')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  financeViewType === 'expense'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Coins className="h-4 w-4" />
                <span>지출</span>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                  {filteredExpRows.length}
                </span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <table className="w-full min-w-[700px] text-left text-[10px] sm:text-[11px]">
              <thead className={cn(
                "border-b border-slate-100 dark:border-slate-700",
                financeViewType === 'revenue' 
                  ? "bg-blue-50/40 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "bg-red-50/40 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              )}>
                <tr>
                  <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">프로젝트명</th>
                  <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">항목명</th>
                  <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">구분</th>
                  <th className={cn(
                    "px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap",
                    financeViewType === 'revenue' ? "text-blue-600 dark:text-blue-400" : "text-red-500 dark:text-red-400"
                  )}>금액</th>
                  <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">지급처</th>
                  <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">결제일</th>
                  <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {financeViewType === 'revenue' ? (
                  filteredRevRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-2 sm:px-4 py-6 text-center text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
                        {searchLower ? '검색 결과가 없습니다.' : '등록된 매출이 없습니다.'}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredRevRows.map((r, idx) => (
                        <tr
                          key={`${r.projectId}-${idx}`}
                          onClick={() => onEditFinance(r)}
                          className="cursor-pointer transition hover:bg-blue-50/30 dark:hover:bg-blue-900/20"
                        >
                          <td className="px-2 sm:px-4 py-3 font-bold text-slate-500 dark:text-slate-400 truncate max-w-[100px] sm:max-w-[140px]">{findProject(r.projectId)}</td>
                          <td className="px-2 sm:px-4 py-3 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px] sm:max-w-[120px]">{r.name || '-'}</td>
                          <td className="px-2 sm:px-4 py-3 font-medium text-slate-600 dark:text-slate-400 truncate max-w-[60px] sm:max-w-[100px]">{r.category}</td>
                          <td className="px-2 sm:px-4 py-3 font-black text-blue-600 italic whitespace-nowrap">{formatCurrency(r.amount)}</td>
                          <td className="px-2 sm:px-4 py-3 font-medium text-slate-500 dark:text-slate-400 truncate max-w-[80px] sm:max-w-[120px]">{getPartnerName(r)}</td>
                          <td className="px-2 sm:px-4 py-3 font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap text-[9px] sm:text-[11px]">{r.date}</td>
                          <td className="px-2 sm:px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              <span className={cn('px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-semibold whitespace-nowrap', getStatusClass(r.status))}>
                                {getStatusLabel(r.status)}
                              </span>
                              {isInternalAllocation(r) && (
                                <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[8px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 sm:text-[9px]">
                                  내부
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50/20 dark:bg-blue-900/30 border-t-2 border-blue-200 dark:border-blue-700">
                        <td colSpan={3} className="px-2 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                          {searchLower ? `검색 결과 ${totalRowLabel}` : totalRowLabel}
                        </td>
                        <td className="px-2 sm:px-4 py-3 font-black text-blue-600 dark:text-blue-400 italic whitespace-nowrap">{formatCurrency(filteredTotalRevenue)}</td>
                        <td colSpan={3} className="px-2 sm:px-4 py-3"></td>
                      </tr>
                    </>
                  )
                ) : (
                  filteredExpRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-2 sm:px-4 py-6 text-center text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
                        {searchLower ? '검색 결과가 없습니다.' : '등록된 지출이 없습니다.'}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredExpRows.map((e, idx) => (
                        <tr
                          key={`${e.projectId}-${idx}`}
                          onClick={() => onEditFinance(e)}
                          className="cursor-pointer transition hover:bg-red-50/30 dark:hover:bg-red-900/20"
                        >
                          <td className="px-2 sm:px-4 py-3 font-bold text-slate-500 dark:text-slate-400 truncate max-w-[100px] sm:max-w-[140px]">{findProject(e.projectId)}</td>
                          <td className="px-2 sm:px-4 py-3 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px] sm:max-w-[120px]">{e.name || '-'}</td>
                          <td className="px-2 sm:px-4 py-3 font-medium text-slate-600 dark:text-slate-400 truncate max-w-[60px] sm:max-w-[100px]">{e.category}</td>
                          <td className="px-2 sm:px-4 py-3 font-black text-red-500 italic whitespace-nowrap">{formatCurrency(e.amount)}</td>
                          <td className="px-2 sm:px-4 py-3 font-medium text-slate-500 dark:text-slate-400 truncate max-w-[80px] sm:max-w-[120px]">{getPartnerName(e)}</td>
                          <td className="px-2 sm:px-4 py-3 font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap text-[9px] sm:text-[11px]">{e.date}</td>
                          <td className="px-2 sm:px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              <span className={cn('px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-semibold whitespace-nowrap', getStatusClass(e.status))}>
                                {getStatusLabel(e.status)}
                              </span>
                              {isInternalAllocation(e) && (
                                <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[8px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 sm:text-[9px]">
                                  내부
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-red-50/20 dark:bg-red-900/30 border-t-2 border-red-200 dark:border-red-700">
                        <td colSpan={3} className="px-2 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                          {searchLower ? `검색 결과 ${totalRowLabel}` : totalRowLabel}
                        </td>
                        <td className="px-2 sm:px-4 py-3 font-black text-red-500 dark:text-red-400 italic whitespace-nowrap">{formatCurrency(filteredTotalExpense)}</td>
                        <td colSpan={3} className="px-2 sm:px-4 py-3"></td>
                      </tr>
                    </>
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

