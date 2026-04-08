'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGowidPurposes, useUpdatePurpose } from '../hooks';

interface PurposeSelectorProps {
  expenseId: number;
  currentPurposeName: string | null;
  canEdit: boolean;
}

export function PurposeSelector({ expenseId, currentPurposeName, canEdit }: PurposeSelectorProps) {
  const { data: purposes } = useGowidPurposes(true);
  const updatePurpose = useUpdatePurpose();
  const [open, setOpen] = useState(false);

  const handleSelect = (purposeId: number) => {
    updatePurpose.mutate({ expenseId, purposeId });
    setOpen(false);
  };

  if (!canEdit) {
    return (
      <div className="text-sm text-slate-700 dark:text-slate-300">
        {currentPurposeName || <span className="text-slate-400">미지정</span>}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-left"
      >
        <span className={currentPurposeName ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>
          {currentPurposeName || '용도 선택...'}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', open && 'rotate-180')} />
      </button>

      {open && purposes && (
        <div className="absolute z-50 mt-1 w-full max-h-[250px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          {purposes.map((p) => (
            <button
              key={p.purposeId}
              onClick={() => handleSelect(p.purposeId)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              {p.name === currentPurposeName && <Check className="h-3.5 w-3.5 text-blue-600" />}
              <span className={cn(
                'flex-1',
                p.name === currentPurposeName ? 'text-blue-600 font-medium' : 'text-slate-700 dark:text-slate-300'
              )}>
                {p.name}
              </span>
              {p.category?.name && (
                <span className="text-[10px] text-slate-400">{p.category.name}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
