'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { APPROVAL_STATUS_LABELS, type GowidApprovalStatus, type ExpenseSearchCriteria } from '../types';

interface ExpenseFiltersProps {
  criteria: ExpenseSearchCriteria;
  onCriteriaChange: (criteria: ExpenseSearchCriteria) => void;
}

const STATUS_OPTIONS: { value: GowidApprovalStatus | ''; label: string }[] = [
  { value: '', label: '전체 상태' },
  { value: 'NOT_SUBMITTED', label: APPROVAL_STATUS_LABELS.NOT_SUBMITTED },
  { value: 'SUBMITTED', label: APPROVAL_STATUS_LABELS.SUBMITTED },
  { value: 'APPROVED', label: APPROVAL_STATUS_LABELS.APPROVED },
  { value: 'PARTIAL_APPROVED', label: APPROVAL_STATUS_LABELS.PARTIAL_APPROVED },
  { value: 'REJECTED', label: APPROVAL_STATUS_LABELS.REJECTED },
];

export function ExpenseFilters({ criteria, onCriteriaChange }: ExpenseFiltersProps) {
  const [keyword, setKeyword] = useState(criteria.memo || '');

  const handleSearch = () => {
    onCriteriaChange({ ...criteria, memo: keyword || undefined });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleClear = () => {
    setKeyword('');
    onCriteriaChange({});
  };

  const hasFilters = criteria.approvalState || criteria.memo || criteria.startDate || criteria.userName || criteria.purposeName;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="사용처, 메모 검색..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <input
        type="month"
        value={criteria.startDate ? `${criteria.startDate.slice(0, 4)}-${criteria.startDate.slice(4, 6)}` : ''}
        onChange={(e) => {
          const val = e.target.value;
          onCriteriaChange({
            ...criteria,
            startDate: val ? val.replace('-', '') + '01' : undefined,
          });
        }}
        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <select
        value={criteria.approvalState || ''}
        onChange={(e) =>
          onCriteriaChange({
            ...criteria,
            approvalState: (e.target.value || undefined) as GowidApprovalStatus | undefined,
          })
        }
        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        onClick={handleSearch}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
      >
        <Filter className="h-4 w-4" />
      </button>

      {hasFilters && (
        <button
          onClick={handleClear}
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
        >
          <X className="h-3.5 w-3.5" />
          초기화
        </button>
      )}
    </div>
  );
}
