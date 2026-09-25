'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import type { FinancialEntry } from '../types';
import { formatCurrency } from '../types';
import { cn } from '@/lib/utils';
import { isInternalAllocation, summarizeProjectPnl } from '../finance-ui';

interface ProjectDetailFinanceProps {
  financeData: FinancialEntry[];
  onFinanceClick?: (entry: FinancialEntry) => void;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  planned: {
    label: '예정',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  paid: {
    label: '완료',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  canceled: {
    label: '취소',
    className: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 line-through',
  },
};

function FinanceItem({
  entry,
  onClick,
}: {
  entry: FinancialEntry;
  onClick?: () => void;
}) {
  const isRevenue = entry.type === 'revenue';
  const isInternal = isInternalAllocation(entry);
  const badge = STATUS_BADGE[entry.status] ?? STATUS_BADGE.planned;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/50',
        entry.status === 'canceled' && 'opacity-50',
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
          isRevenue
            ? 'bg-blue-100 dark:bg-blue-900/50'
            : 'bg-red-100 dark:bg-red-900/50',
        )}
      >
        {isRevenue ? (
          <TrendingUp className="h-3 w-3 text-blue-600 dark:text-blue-400" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
          {entry.name}
        </p>
        {(entry.category || (entry.status === 'planned' && entry.due_date)) && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
            {entry.category}
            {entry.status === 'planned' && entry.due_date && (
              <span className="ml-1">· 기한 {entry.due_date}</span>
            )}
          </p>
        )}
      </div>
      <span className={cn('text-[10px] font-medium rounded px-1.5 py-0.5', badge.className)}>
        {badge.label}
      </span>
      {isInternal && (
        <span className="text-[10px] font-medium rounded bg-violet-100 px-1.5 py-0.5 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          내부
        </span>
      )}
      <span
        className={cn(
          'text-xs font-bold tabular-nums',
          isRevenue
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-red-600 dark:text-red-400',
        )}
      >
        {isRevenue ? '+' : '-'}
        {formatCurrency(entry.amount)}
      </span>
    </button>
  );
}

export function ProjectDetailFinance({
  financeData,
  onFinanceClick,
}: ProjectDetailFinanceProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // R26: 프로젝트 상세는 외부 손익과 내부배부 합계를 나눠 보여 준다(취소 제외).
  const pnl = summarizeProjectPnl(financeData);
  const totalRevenue = pnl.externalRevenue;
  const totalExpense = pnl.externalExpense;
  const netProfit = pnl.externalProfit;
  const internalRevenue = pnl.internalRevenue;
  const internalExpense = pnl.internalExpense;
  const hasInternal = financeData.some((f) => isInternalAllocation(f) && f.status !== 'canceled');

  if (financeData.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 sm:px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
            매출 / 지출
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {financeData.length}건
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] tabular-nums">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">외부 손익</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              +{formatCurrency(totalRevenue)}
            </span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-red-500 dark:text-red-400 font-semibold">
              -{formatCurrency(totalExpense)}
            </span>
            <span className="text-slate-300 dark:text-slate-600">=</span>
            <span
              className={cn(
                'font-bold',
                netProfit >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {formatCurrency(netProfit)}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-700">
          {hasInternal && (
            <div className="flex items-center justify-between bg-violet-50/60 px-3 py-2 text-[10px] text-violet-700 dark:bg-violet-900/10 dark:text-violet-300">
              <span className="font-semibold">내부배부 합계 (외부 손익에 포함하지 않음)</span>
              <span className="tabular-nums">
                매출 {formatCurrency(internalRevenue)} · 지출 {formatCurrency(internalExpense)} · 차액 {formatCurrency(internalRevenue - internalExpense)}
              </span>
            </div>
          )}
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {financeData.map((entry) => (
              <FinanceItem
                key={entry.id}
                entry={entry}
                onClick={() => onFinanceClick?.(entry)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
