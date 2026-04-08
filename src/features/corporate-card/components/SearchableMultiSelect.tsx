'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: number;
  label: string;
  sub?: string;
}

interface SearchableMultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: number[];
  onChange: (values: number[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

export function SearchableMultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = '선택...',
  searchPlaceholder = '검색...',
  disabled = false,
}: SearchableMultiSelectProps) {
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

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase().trim()) ||
      (o.sub && o.sub.toLowerCase().includes(search.toLowerCase().trim()))
  );

  const toggle = (val: number) => {
    onChange(
      selectedValues.includes(val)
        ? selectedValues.filter((v) => v !== val)
        : [...selectedValues, val]
    );
  };

  const selectedLabels = options
    .filter((o) => selectedValues.includes(o.value))
    .map((o) => o.label);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-left min-h-[38px]',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        {selectedLabels.length === 0 ? (
          <span className="text-slate-400">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {selectedLabels.slice(0, 3).map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300"
              >
                {label}
              </span>
            ))}
            {selectedLabels.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-slate-500">
                +{selectedLabels.length - 3}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              <X className="h-3 w-3 text-slate-400" />
            </button>
          )}
          <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', isOpen && 'rotate-180')} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <div className="max-h-[220px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">검색 결과 없음</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700',
                      isSelected && 'bg-blue-50 dark:bg-blue-900/30'
                    )}
                  >
                    <div
                      className={cn(
                        'flex-shrink-0 h-4 w-4 rounded border flex items-center justify-center',
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-slate-300 dark:border-slate-600'
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-slate-900 dark:text-slate-100">{opt.label}</span>
                      {opt.sub && <span className="text-[10px] text-slate-400 truncate">{opt.sub}</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {selectedValues.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-2 text-xs text-slate-500">
              {selectedValues.length}명 선택
            </div>
          )}
        </div>
      )}
    </div>
  );
}
