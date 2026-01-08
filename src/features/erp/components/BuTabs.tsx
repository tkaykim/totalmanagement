'use client';

import { cn } from '@/lib/utils';
import { BU, BU_TITLES } from '../types';

export interface BuTabsProps {
  bu: BU | 'ALL';
  onChange: (bu: BU | 'ALL') => void;
  prefix: string;
  showAll?: boolean;
}

export function BuTabs({ bu, onChange, prefix, showAll }: BuTabsProps) {
  const buKeys = (Object.keys(BU_TITLES) as BU[]);
  
  return (
    <div className="flex w-fit overflow-x-auto rounded-2xl bg-slate-200/60 p-1 sm:p-1.5">
      {showAll && (
        <button
          onClick={() => onChange('ALL')}
          className={cn(
            'px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap',
            bu === 'ALL' ? 'tab-active rounded-xl bg-white dark:bg-slate-800 text-blue-600 shadow' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100',
          )}
          id={`tab-${prefix}-ALL`}
        >
          전체
        </button>
      )}
      {buKeys.map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            'px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap',
            bu === key ? 'tab-active rounded-xl bg-white dark:bg-slate-800 text-blue-600 shadow' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100',
          )}
          id={`tab-${prefix}-${key}`}
        >
          {BU_TITLES[key]}
        </button>
      ))}
    </div>
  );
}

