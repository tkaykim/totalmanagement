'use client';

import { Bell, Menu } from 'lucide-react';
import { PeriodSelector, PeriodType } from './PeriodSelector';
import {
  useWorkStatus,
  WorkStatusHeader,
  WorkStatusWelcomeModal,
  WorkStatusLogoutModal,
  WorkStatusOvertimeModal,
} from './WorkStatusHeader';

interface DashboardHeaderProps {
  title: string;
  onMenuClick?: () => void;
  showMobileMenu?: boolean;
  showMonitoring?: boolean;
  showNotification?: boolean;
  onNotificationClick?: () => void;
  showPeriodSelector?: boolean;
  // 기간 선택 props - 외부에서 제어
  periodType?: PeriodType;
  onPeriodTypeChange?: (type: PeriodType) => void;
  selectedYear?: number;
  onYearChange?: (year: number) => void;
  selectedMonth?: number;
  onMonthChange?: (month: number) => void;
  selectedQuarter?: number;
  onQuarterChange?: (quarter: number) => void;
  selectedQuarterYear?: number;
  onQuarterYearChange?: (year: number) => void;
  customRange?: { start?: string; end?: string };
  onCustomRangeChange?: (key: 'start' | 'end', value: string) => void;
  yearOptions?: number[];
}

export function DashboardHeader({
  title,
  onMenuClick,
  showMobileMenu = true,
  showMonitoring = true,
  showNotification = true,
  onNotificationClick,
  showPeriodSelector = true,
  periodType = 'month',
  onPeriodTypeChange,
  selectedYear = new Date().getFullYear(),
  onYearChange,
  selectedMonth = new Date().getMonth() + 1,
  onMonthChange,
  selectedQuarter = Math.ceil((new Date().getMonth() + 1) / 3),
  onQuarterChange,
  selectedQuarterYear = new Date().getFullYear(),
  onQuarterYearChange,
  customRange = {},
  onCustomRangeChange,
  yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i),
}: DashboardHeaderProps) {

  // Work status - 내부에서 직접 hook 호출 (자체적으로 API에서 사용자 정보와 상태를 가져옴)
  const workStatus = useWorkStatus();

  return (
    <>
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
        {showPeriodSelector && onPeriodTypeChange && onYearChange && onMonthChange && onQuarterChange && onQuarterYearChange && onCustomRangeChange && (
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
        )}

        {/* 근무 상태 헤더 */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <WorkStatusHeader
            workStatus={workStatus.workStatus}
            currentTime={workStatus.currentTime}
            userName={workStatus.userName}
            userPosition={workStatus.userPosition}
            userInitials={workStatus.userInitials}
            isChanging={workStatus.isChanging}
            onStatusChange={workStatus.handleStatusChange}
            formatTimeDetail={workStatus.formatTimeDetail}
            formatDateDetail={workStatus.formatDateDetail}
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

      {/* Work Status Modals - 자체 렌더링 */}
      <WorkStatusWelcomeModal 
        showWelcome={workStatus.showWelcome}
        welcomeTitle={workStatus.welcomeTitle}
        welcomeMsg={workStatus.welcomeMsg}
      />
      <WorkStatusLogoutModal 
        showLogoutConfirm={workStatus.showLogoutConfirm}
        isChanging={workStatus.isChanging}
        onCancel={() => workStatus.setShowLogoutConfirm(false)}
        onConfirm={workStatus.confirmLogout}
      />
      <WorkStatusOvertimeModal 
        show={workStatus.showOvertimeConfirm}
        isChanging={workStatus.isChanging}
        onCancel={() => workStatus.setShowOvertimeConfirm(false)}
        onConfirm={workStatus.confirmOvertime}
      />
    </>
  );
}

export type { PeriodType } from './PeriodSelector';
