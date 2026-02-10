'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Manual } from '@/types/database';
import type { BU } from '@/features/erp/types';
import { BU_TITLES } from '@/features/erp/types';

type ManualOption = {
  value: string;
  label: string;
  subLabel?: string;
  buCode: string;
  isSameBu: boolean;
};

interface ManualSelectorProps {
  manuals: Manual[];
  value: number | null;
  onChange: (manualId: number | null) => void;
  buFilter?: BU;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}

export function ManualSelector({
  manuals,
  value,
  onChange,
  buFilter,
  placeholder = '매뉴얼 검색...',
  emptyLabel = '매뉴얼 선택 안함',
  disabled = false,
}: ManualSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: ManualOption[] = useMemo(() =>
    manuals
      .filter((m) => m.is_active !== false)
      .map((m) => ({
        value: String(m.id),
        label: m.title,
        subLabel: m.category ? `[${m.category}]` : undefined,
        buCode: m.bu_code,
        isSameBu: !!buFilter && m.bu_code === buFilter,
      }))
      .sort((a, b) => {
        if (a.isSameBu !== b.isSameBu) return a.isSameBu ? -1 : 1;
        return a.label.localeCompare(b.label, 'ko');
      }),
    [manuals, buFilter],
  );

  const filteredOptions = useMemo(() =>
    options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase())) ||
        (BU_TITLES[opt.buCode as BU] || '').toLowerCase().includes(search.toLowerCase())
    ),
    [options, search],
  );

  const selectedOption = options.find((opt) => opt.value === String(value));
  const displayLabel = selectedOption ? selectedOption.label : emptyLabel;

  const sameBuCount = filteredOptions.filter((o) => o.isSameBu).length;
  const otherBuCount = filteredOptions.filter((o) => !o.isSameBu).length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <span className={cn('truncate', !value && 'text-slate-400')}>
          {selectedOption ? (
            <span className="flex items-center gap-1.5">
              <span>{displayLabel}</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {BU_TITLES[selectedOption.buCode as BU]}
              </span>
            </span>
          ) : (
            displayLabel
          )}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition flex-shrink-0', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {/* 선택 해제 옵션 */}
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
                setSearch('');
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700',
                !value && 'bg-blue-50 dark:bg-blue-900/30'
              )}
            >
              <span className="text-slate-500 dark:text-slate-400">{emptyLabel}</span>
              {!value && <Check className="h-4 w-4 text-blue-600" />}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">검색 결과가 없습니다</div>
            ) : (
              <>
                {/* 같은 사업부 매뉴얼 */}
                {buFilter && sameBuCount > 0 && (
                  <div className="px-3 pt-2 pb-1">
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {BU_TITLES[buFilter]} 매뉴얼
                    </span>
                  </div>
                )}
                {filteredOptions
                  .filter((o) => o.isSameBu)
                  .map((opt) => (
                    <ManualOptionItem
                      key={opt.value}
                      opt={opt}
                      isSelected={value === Number(opt.value)}
                      showBuTag={false}
                      onSelect={() => {
                        onChange(Number(opt.value));
                        setIsOpen(false);
                        setSearch('');
                      }}
                    />
                  ))}

                {/* 다른 사업부 매뉴얼 */}
                {buFilter && otherBuCount > 0 && sameBuCount > 0 && (
                  <div className="px-3 pt-3 pb-1 border-t border-slate-100 dark:border-slate-700 mt-1">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      다른 사업부 매뉴얼
                    </span>
                  </div>
                )}
                {filteredOptions
                  .filter((o) => !o.isSameBu)
                  .map((opt) => (
                    <ManualOptionItem
                      key={opt.value}
                      opt={opt}
                      isSelected={value === Number(opt.value)}
                      showBuTag={true}
                      onSelect={() => {
                        onChange(Number(opt.value));
                        setIsOpen(false);
                        setSearch('');
                      }}
                    />
                  ))}

                {/* buFilter 없는 경우 전체 표시 */}
                {!buFilter &&
                  filteredOptions.map((opt) => (
                    <ManualOptionItem
                      key={opt.value}
                      opt={opt}
                      isSelected={value === Number(opt.value)}
                      showBuTag={true}
                      onSelect={() => {
                        onChange(Number(opt.value));
                        setIsOpen(false);
                        setSearch('');
                      }}
                    />
                  ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ManualOptionItem({
  opt,
  isSelected,
  showBuTag,
  onSelect,
}: {
  opt: ManualOption;
  isSelected: boolean;
  showBuTag: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700',
        isSelected && 'bg-blue-50 dark:bg-blue-900/30'
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-slate-900 dark:text-slate-100 truncate">{opt.label}</span>
        {opt.subLabel && (
          <span className="text-xs text-slate-400 flex-shrink-0">{opt.subLabel}</span>
        )}
        {showBuTag && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex-shrink-0">
            {BU_TITLES[opt.buCode as BU] || opt.buCode}
          </span>
        )}
      </div>
      {isSelected && <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />}
    </button>
  );
}
