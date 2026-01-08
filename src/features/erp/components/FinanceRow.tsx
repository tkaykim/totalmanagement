'use client';

import { cn } from '@/lib/utils';
import { FinancialEntry, formatCurrency } from '../types';

export interface FinanceRowProps {
  entry: FinancialEntry;
  tone: 'blue' | 'red';
  onClick?: () => void;
}

export function FinanceRow({ entry, tone, onClick }: FinanceRowProps) {
  const isBlue = tone === 'blue';
  const statusLabel =
    entry.status === 'planned' ? '지급예정' : entry.status === 'paid' ? '지급완료' : '취소';
  const statusColor =
    entry.status === 'planned'
      ? 'bg-amber-50 text-amber-700'
      : entry.status === 'paid'
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-xl border px-2 sm:px-3 py-2 text-left transition hover:bg-slate-50 dark:bg-slate-900',
        isBlue ? 'border-blue-100 bg-white dark:bg-slate-800' : 'border-red-100 bg-white dark:bg-slate-800',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">{entry.name}</p>
        <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 truncate">
          {entry.date} • {entry.category}
        </p>
        <span
          className={cn(
            'mt-1 inline-flex rounded-full px-2 py-0.5 text-[8px] sm:text-[9px] font-semibold whitespace-nowrap',
            statusColor,
          )}
        >
          {statusLabel}
        </span>
      </div>
      <span className={cn('text-[10px] sm:text-xs font-bold whitespace-nowrap flex-shrink-0 ml-2', isBlue ? 'text-blue-600' : 'text-red-500')}>
        {formatCurrency(entry.amount)}
      </span>
    </button>
  );
}

