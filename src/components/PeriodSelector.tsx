'use client';

import { cn } from '@/lib/utils';

export type PeriodType = 'all' | 'year' | 'quarter' | 'month' | 'custom';

interface PeriodSelectorProps {
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  selectedQuarter: number;
  onQuarterChange: (quarter: number) => void;
  selectedQuarterYear: number;
  onQuarterYearChange: (year: number) => void;
  customRange: { start?: string; end?: string };
  onCustomRangeChange: (key: 'start' | 'end', value: string) => void;
  yearOptions: number[];
  className?: string;
}

const PERIOD_LABELS: Record<PeriodType, string> = {
  month: '월별',
  quarter: '분기별',
  year: '연도별',
  custom: '직접선택',
  all: '전체 기간',
};

const PERIOD_ORDER: PeriodType[] = ['month', 'quarter', 'year', 'custom', 'all'];

export function PeriodSelector({
  periodType,
  onPeriodTypeChange,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  selectedQuarter,
  onQuarterChange,
  selectedQuarterYear,
  onQuarterYearChange,
  customRange,
  onCustomRangeChange,
  yearOptions,
  className,
}: PeriodSelectorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* 기간 선택 탭들 */}
      <div className="hidden md:flex items-center gap-1 shrink-0">
        {PERIOD_ORDER.map((type) => (
          <button
            key={type}
            onClick={() => onPeriodTypeChange(type)}
            className={cn(
              'rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold transition whitespace-nowrap',
              periodType === type
                ? 'bg-slate-900 dark:bg-slate-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            {PERIOD_LABELS[type]}
          </button>
        ))}
      </div>

      {/* 조건부 선택 UI */}
      <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0">
        {periodType === 'year' && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              연도:
            </label>
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          </div>
        )}

        {periodType === 'quarter' && (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                연도:
              </label>
              <select
                value={selectedQuarterYear}
                onChange={(e) => onQuarterYearChange(Number(e.target.value))}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                분기:
              </label>
              <select
                value={selectedQuarter}
                onChange={(e) => onQuarterChange(Number(e.target.value))}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1분기</option>
                <option value={2}>2분기</option>
                <option value={3}>3분기</option>
                <option value={4}>4분기</option>
              </select>
            </div>
          </>
        )}

        {periodType === 'month' && (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                월:
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => onMonthChange(Number(e.target.value))}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {month}월
                  </option>
                ))}
              </select>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          </>
        )}

        {periodType === 'custom' && (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                시작일:
              </label>
              <input
                type="date"
                value={customRange.start ?? ''}
                onChange={(e) => onCustomRangeChange('start', e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px]"
              />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                종료일:
              </label>
              <input
                type="date"
                value={customRange.end ?? ''}
                onChange={(e) => onCustomRangeChange('end', e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px]"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
