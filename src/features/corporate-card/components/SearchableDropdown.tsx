'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownOption {
  value: string;
  label: string;
  sub?: string;
}

interface SearchableDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = '선택...',
  emptyLabel = '전체',
  searchPlaceholder = '검색...',
  disabled = false,
  className,
}: SearchableDropdownProps) {
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

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-left',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <span className={selectedOption ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
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
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearch('');
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700',
                !value && 'bg-blue-50 dark:bg-blue-900/30'
              )}
            >
              <span className="text-slate-400">{emptyLabel}</span>
              {!value && <Check className="h-3.5 w-3.5 text-blue-600" />}
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">검색 결과 없음</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700',
                    opt.value === value && 'bg-blue-50 dark:bg-blue-900/30'
                  )}
                >
                  <div className="flex flex-col min-w-0">
                    <span className={cn(
                      'truncate',
                      opt.value === value ? 'text-blue-600 font-medium' : 'text-slate-900 dark:text-slate-100'
                    )}>
                      {opt.label}
                    </span>
                    {opt.sub && <span className="text-[10px] text-slate-400 truncate">{opt.sub}</span>}
                  </div>
                  {opt.value === value && <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 ml-2" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
