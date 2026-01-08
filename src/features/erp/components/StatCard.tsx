'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '../types';

export interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}

export function StatCard({ title, value, icon, accent }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
      <p className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{title}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className={cn('text-xl sm:text-2xl md:text-3xl font-black', accent)}>{formatCurrency(value)}</p>
        <span className="rounded-full bg-slate-100 dark:bg-slate-800 p-2 sm:p-3 text-slate-500 dark:text-slate-400 flex-shrink-0">{icon}</span>
      </div>
    </div>
  );
}

