'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/features/erp/types';

interface ProjectSearchDropdownProps {
  projects: Project[];
  value: number | '';
  onChange: (projectId: number | '') => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}

export function ProjectSearchDropdown({
  projects,
  value,
  onChange,
  placeholder = '프로젝트 검색...',
  emptyLabel = '선택 안함',
  disabled = false,
}: ProjectSearchDropdownProps) {
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

  const valueStr = value === '' ? '' : String(value);
  const filteredProjects = projects
    .filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase().trim())
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  const selectedProject = projects.find((p) => String(p.id) === valueStr);
  const displayLabel = selectedProject ? selectedProject.name : emptyLabel;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <span className={value === '' ? 'text-slate-400 dark:text-slate-500' : ''}>
          {displayLabel}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
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
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearch('');
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700',
                value === '' && 'bg-blue-50 dark:bg-blue-900/30'
              )}
            >
              <span className="text-slate-500 dark:text-slate-400">{emptyLabel}</span>
              {value === '' && <Check className="h-4 w-4 text-blue-600" />}
            </button>
            {filteredProjects.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">검색 결과가 없습니다</div>
            ) : (
              filteredProjects.map((p) => {
                const id = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                const isSelected = value === id || valueStr === String(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onChange(Number(p.id));
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700',
                      isSelected && 'bg-blue-50 dark:bg-blue-900/30'
                    )}
                  >
                    <span className="text-slate-900 dark:text-slate-100 truncate">{p.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
