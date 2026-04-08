'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGowidMembers, useGowidPurposes } from '../hooks';
import { SearchableDropdown, type DropdownOption } from './SearchableDropdown';
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: members } = useGowidMembers();
  const { data: purposes } = useGowidPurposes(true);

  const cardOptions: DropdownOption[] = useMemo(() => {
    if (!members) return [];
    return members
      .filter((m) => m.status === 'NORMAL')
      .map((m) => ({
        value: m.userName,
        label: m.userName,
        sub: m.department?.name || undefined,
      }));
  }, [members]);

  const purposeOptions: DropdownOption[] = useMemo(() => {
    if (!purposes) return [];
    return purposes.map((p) => ({
      value: p.name,
      label: p.name,
      sub: p.category?.name || undefined,
    }));
  }, [purposes]);

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

  const activeFilterCount = [
    criteria.approvalState,
    criteria.userName,
    criteria.purposeName,
    criteria.startDate,
    criteria.cardAlias,
  ].filter(Boolean).length;

  const hasFilters = activeFilterCount > 0 || criteria.memo;

  return (
    <div className="space-y-3">
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

        <SearchableDropdown
          options={cardOptions}
          value={criteria.userName || ''}
          onChange={(val) => onCriteriaChange({ ...criteria, userName: val || undefined })}
          placeholder="카드 사용자"
          emptyLabel="전체 카드"
          searchPlaceholder="카드 사용자 검색..."
          className="min-w-[150px]"
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
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            'rounded-lg border px-3 py-2 text-sm flex items-center gap-1.5 transition',
            showAdvanced
              ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/30 text-blue-600'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          상세
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-blue-600 text-white text-[10px] px-1.5 py-0.5 font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

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

      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">기간</label>
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
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">용도</label>
            <SearchableDropdown
              options={purposeOptions}
              value={criteria.purposeName || ''}
              onChange={(val) => onCriteriaChange({ ...criteria, purposeName: val || undefined })}
              placeholder="용도 선택"
              emptyLabel="전체 용도"
              searchPlaceholder="용도 검색..."
              className="min-w-[180px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
