'use client';

import { cn } from '@/lib/utils';
import { BU, BU_TITLES } from '../types';

export interface BuTabsProps {
  bu: BU | 'ALL';
  onChange: (bu: BU | 'ALL') => void;
  prefix: string;
  showAll?: boolean;
}

export function BuTabs({ bu, onChange, prefix, showAll = true }: BuTabsProps) {
  const buKeys = (Object.keys(BU_TITLES) as BU[]);
  
  return (
    <div className="max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
      <div className="flex w-fit rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
        {showAll && (
          <button
            onClick={() => onChange('ALL')}
            className={cn(
              'px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold transition whitespace-nowrap rounded-lg flex-shrink-0',
              bu === 'ALL' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
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
              'px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold transition whitespace-nowrap rounded-lg flex-shrink-0',
              bu === key 
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
            )}
            id={`tab-${prefix}-${key}`}
          >
            {BU_TITLES[key]}
          </button>
        ))}
      </div>
    </div>
  );
}

