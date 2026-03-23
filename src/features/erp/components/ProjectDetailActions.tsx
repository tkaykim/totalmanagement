'use client';

import { Plus, DollarSign, Coins } from 'lucide-react';

interface ProjectDetailActionsProps {
  onAddTask: () => void;
  onAddRevenue?: () => void;
  onAddExpense?: () => void;
}

export function ProjectDetailActions({
  onAddTask,
  onAddRevenue,
  onAddExpense,
}: ProjectDetailActionsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={onAddTask}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-semibold transition shadow-sm"
      >
        <Plus className="h-3.5 w-3.5" />
        할일 추가
      </button>
      {onAddRevenue && (
        <button
          onClick={onAddRevenue}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold transition shadow-sm"
        >
          <DollarSign className="h-3.5 w-3.5" />
          매출 등록
        </button>
      )}
      {onAddExpense && (
        <button
          onClick={onAddExpense}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 text-xs font-semibold transition shadow-sm"
        >
          <Coins className="h-3.5 w-3.5" />
          지출 등록
        </button>
      )}
    </div>
  );
}
