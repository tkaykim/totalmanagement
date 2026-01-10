'use client';

import { useState, useEffect } from 'react';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { ko } from 'date-fns/locale';
import { X, Repeat, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceSettings {
  type: RecurrenceType;
  interval: number;
  weekDays: number[]; // 0 = 일, 1 = 월, ..., 6 = 토
  endDate: string | null;
  hasEndDate: boolean;
}

interface RecurrenceSelectorProps {
  value: RecurrenceSettings;
  onChange: (settings: RecurrenceSettings) => void;
  startDate: Date;
  disabled?: boolean;
}

const WEEK_DAYS = [
  { value: 0, label: '일' },
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
];

const RECURRENCE_TYPES = [
  { value: 'daily' as const, label: '매일' },
  { value: 'weekly' as const, label: '매주' },
  { value: 'monthly' as const, label: '매월' },
  { value: 'yearly' as const, label: '매년' },
];

export function RecurrenceSelector({
  value,
  onChange,
  startDate,
  disabled = false,
}: RecurrenceSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<RecurrenceSettings>(value);

  useEffect(() => {
    setTempSettings(value);
  }, [value]);

  const handleOpen = () => {
    if (disabled) return;
    setTempSettings(value);
    setIsModalOpen(true);
  };

  const handleConfirm = () => {
    onChange(tempSettings);
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setTempSettings(value);
    setIsModalOpen(false);
  };

  const handleTypeChange = (type: RecurrenceType) => {
    const newSettings = { ...tempSettings, type };
    
    // 기본 설정
    if (type === 'weekly' && newSettings.weekDays.length === 0) {
      newSettings.weekDays = [startDate.getDay()];
    }
    
    if (!newSettings.endDate) {
      const defaultEndDate = type === 'daily' 
        ? addWeeks(startDate, 1)
        : type === 'weekly'
          ? addMonths(startDate, 1)
          : type === 'monthly'
            ? addMonths(startDate, 3)
            : addYears(startDate, 1);
      newSettings.endDate = format(defaultEndDate, 'yyyy-MM-dd');
    }
    
    setTempSettings(newSettings);
  };

  const toggleWeekDay = (day: number) => {
    const newWeekDays = tempSettings.weekDays.includes(day)
      ? tempSettings.weekDays.filter((d) => d !== day)
      : [...tempSettings.weekDays, day].sort();
    
    setTempSettings({ ...tempSettings, weekDays: newWeekDays });
  };

  const getRecurrenceLabel = () => {
    if (value.type === 'none') return '반복 없음';
    
    let label = '';
    switch (value.type) {
      case 'daily':
        label = value.interval === 1 ? '매일' : `${value.interval}일마다`;
        break;
      case 'weekly':
        const dayLabels = value.weekDays.map((d) => WEEK_DAYS[d].label).join(', ');
        label = value.interval === 1 ? `매주 ${dayLabels}` : `${value.interval}주마다 ${dayLabels}`;
        break;
      case 'monthly':
        label = value.interval === 1 ? '매월' : `${value.interval}개월마다`;
        break;
      case 'yearly':
        label = value.interval === 1 ? '매년' : `${value.interval}년마다`;
        break;
    }
    
    if (value.hasEndDate && value.endDate) {
      label += ` (${format(new Date(value.endDate), 'M월 d일')}까지)`;
    }
    
    return label;
  };

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Repeat className="inline w-4 h-4 mr-1" />
          반복
        </label>
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition',
            disabled
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-600',
            value.type !== 'none' && 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
          )}
        >
          <span className={cn(
            'text-sm',
            value.type !== 'none' ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-slate-600 dark:text-slate-400'
          )}>
            {getRecurrenceLabel()}
          </span>
          {value.type !== 'none' && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ type: 'none', interval: 1, weekDays: [], endDate: null, hasEndDate: false });
              }}
              className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-center text-slate-800 dark:text-slate-200">
                {tempSettings.type === 'none' ? '반복' : RECURRENCE_TYPES.find(t => t.value === tempSettings.type)?.label}
              </h3>
            </div>

            <div className="p-5 space-y-5">
              {/* Recurrence Type */}
              <div className="flex justify-center">
                <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
                  {RECURRENCE_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleTypeChange(type.value)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition',
                        tempSettings.type === type.value
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Week Days (for weekly) */}
              {tempSettings.type === 'weekly' && (
                <div className="flex justify-center gap-2">
                  {WEEK_DAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekDay(day.value)}
                      className={cn(
                        'w-10 h-10 rounded-lg text-sm font-medium transition',
                        tempSettings.weekDays.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Interval */}
              {tempSettings.type !== 'none' && (
                <div className="flex items-center justify-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={tempSettings.interval}
                    onChange={(e) => setTempSettings({ ...tempSettings, interval: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-16 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-center text-sm font-medium"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {tempSettings.type === 'daily' && '일 간격으로 반복'}
                    {tempSettings.type === 'weekly' && '주 간격으로 반복'}
                    {tempSettings.type === 'monthly' && '개월 간격으로 반복'}
                    {tempSettings.type === 'yearly' && '년 간격으로 반복'}
                  </span>
                </div>
              )}

              {/* End Date */}
              {tempSettings.type !== 'none' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={tempSettings.hasEndDate}
                      onChange={(e) => setTempSettings({ ...tempSettings, hasEndDate: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">반복 종료일을 설정</span>
                  </label>
                  
                  {tempSettings.hasEndDate && (
                    <div className="flex items-center gap-2 pl-8">
                      <input
                        type="date"
                        value={tempSettings.endDate || ''}
                        onChange={(e) => setTempSettings({ ...tempSettings, endDate: e.target.value })}
                        min={format(startDate, 'yyyy-MM-dd')}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                      />
                      <span className="text-sm text-slate-500 dark:text-slate-400">까지 반복</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-4 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                취소
              </button>
              <div className="w-px bg-slate-200 dark:border-slate-700" />
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const defaultRecurrenceSettings: RecurrenceSettings = {
  type: 'none',
  interval: 1,
  weekDays: [],
  endDate: null,
  hasEndDate: false,
};
