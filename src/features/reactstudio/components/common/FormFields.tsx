'use client';

import { cn } from '@/lib/utils';

export function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  if (type === 'date') {
    return (
      <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange('')}
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded transition',
                value === ''
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              미정
            </button>
          )}
        </div>
        <input
          type="date"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30 disabled:bg-gray-100 dark:bg-slate-800 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
        />
      </label>
    );
  }

  if (type === 'textarea') {
    return (
      <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</span>
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={4}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30 disabled:bg-gray-100 dark:bg-slate-800 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
        />
      </label>
    );
  }

  return (
    <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
      <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
      <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}



