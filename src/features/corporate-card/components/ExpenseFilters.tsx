'use client';

import { useState, useMemo, useCallback } from 'react';
import { Search, X, SlidersHorizontal, Calendar, CreditCard, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGowidMembers, useGowidPurposes } from '../hooks';
import { useCardAliasMap } from '../hooks/useCardAliasMap';
import { SearchableDropdown, type DropdownOption } from './SearchableDropdown';
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_COLORS,
  type GowidApprovalStatus,
  type ExpenseSearchCriteria,
} from '../types';

interface ExpenseFiltersProps {
  criteria: ExpenseSearchCriteria;
  onCriteriaChange: (criteria: ExpenseSearchCriteria) => void;
}

const STATUS_OPTIONS: { value: GowidApprovalStatus | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'NOT_SUBMITTED', label: APPROVAL_STATUS_LABELS.NOT_SUBMITTED },
  { value: 'SUBMITTED', label: APPROVAL_STATUS_LABELS.SUBMITTED },
  { value: 'APPROVED', label: APPROVAL_STATUS_LABELS.APPROVED },
  { value: 'PARTIAL_APPROVED', label: APPROVAL_STATUS_LABELS.PARTIAL_APPROVED },
  { value: 'REJECTED', label: APPROVAL_STATUS_LABELS.REJECTED },
];

function toInputDate(gowidDate?: string): string {
  if (!gowidDate || gowidDate.length < 8) return '';
  return `${gowidDate.slice(0, 4)}-${gowidDate.slice(4, 6)}-${gowidDate.slice(6, 8)}`;
}

function toGowidDate(inputDate: string): string {
  return inputDate.replace(/-/g, '');
}

export function ExpenseFilters({ criteria, onCriteriaChange }: ExpenseFiltersProps) {
  const [keyword, setKeyword] = useState(criteria.memo || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: members } = useGowidMembers();
  const { data: purposes } = useGowidPurposes(true);
  const { cards: registeredCards } = useCardAliasMap();

  const userOptions: DropdownOption[] = useMemo(() => {
    if (!members) return [];
    return members
      .filter((m) => m.status === 'NORMAL')
      .map((m) => ({
        value: m.userName,
        label: m.userName,
        sub: m.department?.name || undefined,
      }));
  }, [members]);

  const cardOptions: DropdownOption[] = useMemo(() => {
    if (!registeredCards || registeredCards.length === 0) return [];
    return registeredCards.map((c) => {
      const displayName = c.erp_alias || c.gowid_alias;
      const sub = [
        c.erp_alias ? c.gowid_alias : null,
        c.short_card_number ? `끝자리 ${c.short_card_number}` : null,
        c.card_user_name || null,
      ]
        .filter(Boolean)
        .join(' · ');
      return {
        value: c.gowid_alias,
        label: displayName,
        sub: sub || undefined,
      };
    });
  }, [registeredCards]);

  const purposeOptions: DropdownOption[] = useMemo(() => {
    if (!purposes) return [];
    return purposes.map((p) => ({
      value: p.name,
      label: p.name,
      sub: p.category?.name || undefined,
    }));
  }, [purposes]);

  const handleSearch = useCallback(() => {
    onCriteriaChange({ ...criteria, memo: keyword || undefined });
  }, [criteria, keyword, onCriteriaChange]);

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
    criteria.endDate,
    criteria.cardAlias,
    criteria.memo,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-4 space-y-3">
        {/* 기간 설정 */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-[40px]">
            <Calendar className="h-3.5 w-3.5" />
            기간
          </div>
          <input
            type="date"
            value={toInputDate(criteria.startDate)}
            onChange={(e) => {
              const val = e.target.value;
              onCriteriaChange({
                ...criteria,
                startDate: val ? toGowidDate(val) : undefined,
              });
            }}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-400">~</span>
          <input
            type="date"
            value={toInputDate(criteria.endDate)}
            onChange={(e) => {
              const val = e.target.value;
              onCriteriaChange({
                ...criteria,
                endDate: val ? toGowidDate(val) : undefined,
              });
            }}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-1 ml-auto sm:ml-0">
            {[
              { label: '이번 달', days: 0, type: 'month' as const },
              { label: '지난 달', days: -1, type: 'lastMonth' as const },
              { label: '3개월', days: 90, type: 'days' as const },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  const now = new Date();
                  let start: Date;
                  let end: Date;
                  if (preset.type === 'month') {
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    end = now;
                  } else if (preset.type === 'lastMonth') {
                    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    end = new Date(now.getFullYear(), now.getMonth(), 0);
                  } else {
                    start = new Date(now.getTime() - preset.days * 24 * 60 * 60 * 1000);
                    end = now;
                  }
                  const fmt = (d: Date) =>
                    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
                  onCriteriaChange({
                    ...criteria,
                    startDate: fmt(start),
                    endDate: fmt(end),
                  });
                }}
                className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 사용자 + 카드 */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-[40px]">
            <User className="h-3.5 w-3.5" />
            사용자
          </div>
          <SearchableDropdown
            options={userOptions}
            value={criteria.userName || ''}
            onChange={(val) => onCriteriaChange({ ...criteria, userName: val || undefined })}
            placeholder="전체 사용자"
            emptyLabel="전체 사용자"
            searchPlaceholder="사용자 검색..."
            className="min-w-[150px]"
          />

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-[40px]">
            <CreditCard className="h-3.5 w-3.5" />
            카드
          </div>
          <SearchableDropdown
            options={cardOptions}
            value={criteria.cardAlias || ''}
            onChange={(val) => onCriteriaChange({ ...criteria, cardAlias: val || undefined })}
            placeholder="전체 카드"
            emptyLabel="전체 카드"
            searchPlaceholder="카드 별칭·번호 검색..."
            className="min-w-[160px]"
          />
        </div>

        {/* 상태 */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_OPTIONS.map((opt) => {
              const isActive = (criteria.approvalState || '') === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() =>
                    onCriteriaChange({
                      ...criteria,
                      approvalState: (opt.value || undefined) as GowidApprovalStatus | undefined,
                    })
                  }
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-medium border transition',
                    isActive
                      ? opt.value
                        ? `${APPROVAL_STATUS_COLORS[opt.value as GowidApprovalStatus]} border-transparent`
                        : 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 검색 + 용도 + 초기화 */}
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
            용도
          </button>

          <button
            onClick={handleSearch}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            검색
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={handleClear}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              초기화
              <span className="rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-1.5 py-0.5 font-bold">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 상세 필터: 용도 */}
      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">용도</label>
            <SearchableDropdown
              options={purposeOptions}
              value={criteria.purposeName || ''}
              onChange={(val) => onCriteriaChange({ ...criteria, purposeName: val || undefined })}
              placeholder="용도 선택"
              emptyLabel="전체 용도"
              searchPlaceholder="용도 검색..."
              className="min-w-[200px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
