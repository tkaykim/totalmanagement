'use client';

import { Bell, Menu } from 'lucide-react';
import { PeriodSelector, PeriodType } from './PeriodSelector';
import {
  WorkStatusHeader,
  WorkStatus,
} from './WorkStatusHeader';

export interface WorkStatusHookReturn {
  workStatus: WorkStatus;
  currentTime: Date;
  userName: string;
  userPosition: string;
  userInitials: string;
  isChanging: boolean;
  isStatusLoading: boolean;
  showWelcome: boolean;
  welcomeTitle: string;
  welcomeMsg: string;
  showLogoutConfirm: boolean;
  showOvertimeConfirm: boolean;
  setShowLogoutConfirm: (show: boolean) => void;
  setShowOvertimeConfirm: (show: boolean) => void;
  setWorkStatus: (status: WorkStatus) => void;
  triggerWelcome: (title: string, msg: string) => void;
  handleStatusChange: (
    newStatus: WorkStatus,
    onStatusChange?: (status: WorkStatus, previousStatus: WorkStatus) => Promise<void>
  ) => Promise<void>;
  confirmLogout: (
    onStatusChange?: (status: WorkStatus) => Promise<void>,
    onLogout?: () => void
  ) => Promise<void>;
  formatTimeDetail: (date: Date) => string;
  formatDateDetail: (date: Date) => string;
}

interface DashboardHeaderProps {
  title: string;
  onMenuClick?: () => void;
  showMobileMenu?: boolean;
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
  workStatusHook: WorkStatusHookReturn;
  onStatusChange: (status: WorkStatus) => void;
  showMonitoring?: boolean;
  showNotification?: boolean;
  onNotificationClick?: () => void;
}

export function DashboardHeader({
  title,
  onMenuClick,
  showMobileMenu = true,
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
  workStatusHook,
  onStatusChange,
  showMonitoring = true,
  showNotification = true,
  onNotificationClick,
}: DashboardHeaderProps) {

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 min-h-[56px] border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-3 sm:px-4 py-2 sm:py-3 backdrop-blur overflow-x-auto">
      {/* 모바일 햄버거 버튼 */}
      {showMobileMenu && onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* 제목 */}
      <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0">
        {title}
      </h2>

      {/* 기간 선택기 */}
      <PeriodSelector
        periodType={periodType}
        onPeriodTypeChange={onPeriodTypeChange}
        selectedYear={selectedYear}
        onYearChange={onYearChange}
        selectedMonth={selectedMonth}
        onMonthChange={onMonthChange}
        selectedQuarter={selectedQuarter}
        onQuarterChange={onQuarterChange}
        selectedQuarterYear={selectedQuarterYear}
        onQuarterYearChange={onQuarterYearChange}
        customRange={customRange}
        onCustomRangeChange={onCustomRangeChange}
        yearOptions={yearOptions}
      />

      {/* 근무 상태 헤더 - 오른쪽으로 밀기 */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <WorkStatusHeader
          workStatus={workStatusHook.workStatus}
          currentTime={workStatusHook.currentTime}
          userName={workStatusHook.userName}
          userPosition={workStatusHook.userPosition}
          userInitials={workStatusHook.userInitials}
          isChanging={workStatusHook.isChanging}
          onStatusChange={onStatusChange}
          formatTimeDetail={workStatusHook.formatTimeDetail}
          formatDateDetail={workStatusHook.formatDateDetail}
        />
      </div>

      {/* Monitoring */}
      {showMonitoring && (
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 shrink-0">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight text-blue-700 dark:text-blue-300">
            Monitoring
          </span>
        </div>
      )}

      {/* 알림 버튼 */}
      {showNotification && (
        <button
          onClick={onNotificationClick}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 transition hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0"
        >
          <Bell className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
        </button>
      )}
    </header>
  );
}

export { useWorkStatus } from './WorkStatusHeader';
export type { PeriodType } from './PeriodSelector';
