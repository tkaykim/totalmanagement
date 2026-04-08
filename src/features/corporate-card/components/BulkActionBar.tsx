'use client';

import { useState } from 'react';
import { CheckCircle, Tag, X } from 'lucide-react';
import { useBulkApprove, useBulkUpdatePurposes, useGowidPurposes } from '../hooks';
import type { GowidApprovalStatus } from '../types';

interface BulkActionBarProps {
  selectedIds: number[];
  onClear: () => void;
  canApprove: boolean;
}

export function BulkActionBar({ selectedIds, onClear, canApprove }: BulkActionBarProps) {
  const bulkApprove = useBulkApprove();
  const bulkPurposes = useBulkUpdatePurposes();
  const { data: purposes } = useGowidPurposes(true);

  const [showPurposeSelect, setShowPurposeSelect] = useState(false);

  const handleBulkApprove = () => {
    const items = selectedIds.map((id) => ({
      expenseId: id,
      approvalStatus: 'APPROVED' as GowidApprovalStatus,
    }));
    bulkApprove.mutate(items, {
      onSuccess: () => onClear(),
    });
  };

  const handleBulkPurpose = (purposeId: number) => {
    bulkPurposes.mutate(
      { expenseIds: selectedIds, purposeId },
      { onSuccess: () => { setShowPurposeSelect(false); onClear(); } }
    );
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="sticky bottom-0 z-20 mx-auto max-w-4xl">
      <div className="flex items-center justify-between rounded-xl bg-slate-900 dark:bg-slate-800 border border-slate-700 px-4 py-3 shadow-2xl">
        <div className="flex items-center gap-2 text-white text-sm">
          <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold">
            {selectedIds.length}
          </span>
          <span>건 선택됨</span>
        </div>

        <div className="flex items-center gap-2">
          {canApprove && (
            <button
              onClick={handleBulkApprove}
              disabled={bulkApprove.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
            >
              <CheckCircle className="h-4 w-4" />
              일괄 승인
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowPurposeSelect(!showPurposeSelect)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-600 transition"
            >
              <Tag className="h-4 w-4" />
              용도 변경
            </button>

            {showPurposeSelect && purposes && (
              <div className="absolute bottom-full right-0 mb-2 w-64 max-h-[250px] overflow-y-auto rounded-lg border border-slate-600 bg-slate-800 shadow-xl">
                {purposes.map((p) => (
                  <button
                    key={p.purposeId}
                    onClick={() => handleBulkPurpose(p.purposeId)}
                    className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 transition"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onClear}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
