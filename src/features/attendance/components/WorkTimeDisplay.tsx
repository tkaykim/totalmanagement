'use client';

import { Clock } from 'lucide-react';
import { formatWorkTime } from '../lib/workTimeCalculator';
import { cn } from '@/lib/utils';

interface WorkTimeDisplayProps {
  minutes: number;
  className?: string;
}

export function WorkTimeDisplay({ minutes, className }: WorkTimeDisplayProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Clock size={18} className="text-slate-500 dark:text-slate-400" />
      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
        {formatWorkTime(minutes)}
      </span>
    </div>
  );
}

