'use client';

import { useMemo, useState } from 'react';
import { DollarSign, Coins, Search } from 'lucide-react';
import type { FinancialEntry, FinancialEntryStatus, Project } from '../types';
import { formatCurrency } from '../types';
import { Input } from '@/components/ui/input';

export type OutstandingViewType = 'receivable' | 'payable';

export interface OutstandingTabProps {
  revRows: FinancialEntry[];
  expRows: FinancialEntry[];
  projects: Project[];
  onEditFinance: (entry: FinancialEntry) => void;
  getPartnerName: (entry: FinancialEntry) => string;
  getStatusLabel: (status: FinancialEntryStatus | undefined | null) => string;
  getStatusClass: (status: FinancialEntryStatus | undefined | null) => string;
}

export function OutstandingTab({
  revRows,
  expRows,
  projects,
  onEditFinance,
  getPartnerName,
  getStatusLabel,
  getStatusClass,
}: OutstandingTabProps) {
  const [viewType, setViewType] = useState<OutstandingViewType>('receivable');
  const [searchQuery, setSearchQuery] = useState('');

  const findProject = (id: string) => projects.find((p) => p.id === id)?.name ?? '-';

  const receivableRows = useMemo(
    () => revRows.filter((r) => r.status === 'planned'),
    [revRows]
  );

  const payableRows = useMemo(
    () => expRows.filter((e) => e.status === 'planned'),
    [expRows]
  );

  const searchLower = searchQuery.trim().toLowerCase();
  const filterBySearch = (rows: FinancialEntry[]) => {
    if (!searchLower) return rows;
    return rows.filter((entry) => {
      const projName = findProject(entry.projectId).toLowerCase();
      const partnerName = getPartnerName(entry).toLowerCase();
      return (
        projName.includes(searchLower) ||
        (entry.name || '').toLowerCase().includes(searchLower) ||
        (entry.category || '').toLowerCase().includes(searchLower) ||
        partnerName.includes(searchLower)
      );
    });
  };

  const filteredReceivable = useMemo(
    () => filterBySearch(receivableRows),
    [receivableRows, searchLower]
  );
  const filteredPayable = useMemo(
    () => filterBySearch(payableRows),
    [payableRows, searchLower]
  );

  const totalReceivable = useMemo(
    () => filteredReceivable.reduce((sum, r) => sum + r.amount, 0),
    [filteredReceivable]
  );
  const totalPayable = useMemo(
    () => filteredPayable.reduce((sum, e) => sum + e.amount, 0),
    [filteredPayable]
  );

  const displayRows = viewType === 'receivable' ? filteredReceivable : filteredPayable;
  const totalAmount = viewType === 'receivable' ? totalReceivable : totalPayable;
  const isReceivable = viewType === 'receivable';

  return (
    <div className="space-y-4">
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
            type="button"
            onClick={() => setViewType('receivable')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewType === 'receivable'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>받아야 할 돈 (미수)</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-xs">
              {filteredReceivable.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setViewType('payable')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewType === 'payable'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>줘야 할 돈 (미지급)</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-xs">
              {filteredPayable.length}
            </span>
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        지급예정 상태로 남아 있어 아직 지급완료되지 않은 건만 표시됩니다. 프로젝트·할일 상태와 무관하게 조회됩니다.
      </p>

      <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <table className="w-full min-w-[700px] text-left text-[10px] sm:text-[11px]">
          <thead
            className={
              isReceivable
                ? 'border-b border-slate-100 dark:border-slate-700 bg-blue-50/40 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'border-b border-slate-100 dark:border-slate-700 bg-red-50/40 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }
          >
            <tr>
              <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">
                프로젝트명
              </th>
              <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">
                항목명
              </th>
              <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">
                구분
              </th>
              <th
                className={`px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap ${
                  isReceivable ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'
                }`}
              >
                금액
              </th>
              <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">
                지급처
              </th>
              <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">
                결제일
              </th>
              <th className="px-2 sm:px-4 py-3 font-bold uppercase tracking-tight whitespace-nowrap">
                상태
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-2 sm:px-4 py-6 text-center text-[10px] sm:text-xs text-slate-400 dark:text-slate-500"
                >
                  {searchLower
                    ? '검색 결과가 없습니다.'
                    : isReceivable
                      ? '지급예정인 미수 건이 없습니다.'
                      : '지급예정인 미지급 건이 없습니다.'}
                </td>
              </tr>
            ) : (
              <>
                {displayRows.map((entry, idx) => (
                  <tr
                    key={`${entry.projectId}-${entry.id}-${idx}`}
                    onClick={() => onEditFinance(entry)}
                    className={`cursor-pointer transition ${
                      isReceivable
                        ? 'hover:bg-blue-50/30 dark:hover:bg-blue-900/20'
                        : 'hover:bg-red-50/30 dark:hover:bg-red-900/20'
                    }`}
                  >
                  <td className="px-2 sm:px-4 py-3 font-bold text-slate-500 dark:text-slate-400 truncate max-w-[100px] sm:max-w-[140px]">
                    {findProject(entry.projectId)}
                  </td>
                  <td className="px-2 sm:px-4 py-3 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px] sm:max-w-[120px]">
                    {entry.name || '-'}
                  </td>
                  <td className="px-2 sm:px-4 py-3 font-medium text-slate-600 dark:text-slate-400 truncate max-w-[60px] sm:max-w-[100px]">
                    {entry.category}
                  </td>
                  <td
                    className={`px-2 sm:px-4 py-3 font-black italic whitespace-nowrap ${
                      isReceivable ? 'text-blue-600' : 'text-red-500'
                    }`}
                  >
                    {formatCurrency(entry.amount)}
                  </td>
                  <td className="px-2 sm:px-4 py-3 font-medium text-slate-500 dark:text-slate-400 truncate max-w-[80px] sm:max-w-[120px]">
                    {getPartnerName(entry)}
                  </td>
                  <td className="px-2 sm:px-4 py-3 font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap text-[9px] sm:text-[11px]">
                    {entry.date}
                  </td>
                  <td className="px-2 sm:px-4 py-3">
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-semibold whitespace-nowrap ${getStatusClass(entry.status)}`}
                    >
                      {getStatusLabel(entry.status)}
                    </span>
                  </td>
                </tr>
                ))}
                <tr
                  className={`border-t-2 ${
                    isReceivable
                      ? 'bg-blue-50/20 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
                      : 'bg-red-50/20 dark:bg-red-900/30 border-red-200 dark:border-red-700'
                  }`}
                >
                  <td colSpan={3} className="px-2 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                    {searchLower ? '필터 합계' : '합계'}
                  </td>
                  <td
                    className={`px-2 sm:px-4 py-3 font-black italic whitespace-nowrap ${
                      isReceivable ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'
                    }`}
                  >
                    {formatCurrency(totalAmount)}
                  </td>
                  <td colSpan={3} className="px-2 sm:px-4 py-3" />
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
