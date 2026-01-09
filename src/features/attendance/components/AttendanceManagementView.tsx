'use client';

import { useState } from 'react';
import { AttendanceCalendar } from './AttendanceCalendar';
import { AttendanceEditModal } from './AttendanceEditModal';
import { Clock, FileEdit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttendanceManagementViewProps {
  onRequestCorrection?: () => void;
}

export function AttendanceManagementView({ onRequestCorrection }: AttendanceManagementViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            근무시간 관리
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            월별 근무시간을 확인하고 정정 신청할 수 있습니다.
          </p>
        </div>
        {onRequestCorrection && (
          <button
            onClick={onRequestCorrection}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition',
              'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
              'hover:bg-slate-200 dark:hover:bg-slate-600'
            )}
          >
            <FileEdit className="h-4 w-4" />
            정정 신청
          </button>
        )}
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <AttendanceCalendar onSelectDate={handleSelectDate} />
      </div>

      {/* Detail Modal */}
      {selectedDate && (
        <AttendanceEditModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}

