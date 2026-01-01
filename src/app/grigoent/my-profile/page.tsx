'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { parseISO, format, startOfYear, endOfYear, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { AlertTriangle, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyArtistProfile } from '@/features/erp/hooks';
import type { Project } from '@/types/database';
import { MyProfileSidebar } from '@/features/grigoent/components/MyProfileSidebar';
import { ArtistDashboardView } from '@/features/grigoent/components/ArtistDashboardView';
import { ArtistProjectsView } from '@/features/grigoent/components/ArtistProjectsView';
import { ArtistSettlementView } from '@/features/grigoent/components/ArtistSettlementView';
import { ProjectDetailModal } from '@/features/grigoent/components/ProjectDetailModal';
import { Sheet, SheetContent } from '@/components/ui/sheet';

type MyProfileView = 'dashboard' | 'projects' | 'settlements';

const isDateInRange = (date: string, start?: string, end?: string) => {
  if (!start || !end) return true;
  const target = parseISO(date);
  return isWithinInterval(target, { start: parseISO(start), end: parseISO(end) });
};

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState<MyProfileView>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data, isLoading, error } = useMyArtistProfile();

  // 날짜 필터 상태
  const [periodType, setPeriodType] = useState<'all' | 'year' | 'quarter' | 'month' | 'custom'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [selectedQuarterYear, setSelectedQuarterYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [customRange, setCustomRange] = useState<{ start?: string; end?: string }>({});

  // 활성 기간 계산
  const activePeriod = useMemo(() => {
    if (periodType === 'all') {
      return { start: undefined, end: undefined };
    }

    if (periodType === 'custom') {
      return { start: customRange.start, end: customRange.end };
    }

    if (periodType === 'year') {
      const yearStart = format(startOfYear(new Date(selectedYear, 0, 1)), 'yyyy-MM-dd');
      const yearEnd = format(endOfYear(new Date(selectedYear, 11, 31)), 'yyyy-MM-dd');
      return { start: yearStart, end: yearEnd };
    }

    if (periodType === 'quarter') {
      const startMonth = (selectedQuarter - 1) * 3;
      const endMonth = selectedQuarter * 3 - 1;
      const quarterStart = format(new Date(selectedQuarterYear, startMonth, 1), 'yyyy-MM-dd');
      const quarterEnd = format(new Date(selectedQuarterYear, endMonth + 1, 0), 'yyyy-MM-dd');
      return { start: quarterStart, end: quarterEnd };
    }

    if (periodType === 'month') {
      const monthStart = format(startOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd');
      return { start: monthStart, end: monthEnd };
    }

    return { start: undefined, end: undefined };
  }, [periodType, selectedYear, selectedQuarter, selectedQuarterYear, selectedMonth, customRange.start, customRange.end]);

  // 연도 옵션 생성
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const maxYear = Math.max(currentYear, 2027);
    return Array.from({ length: maxYear - 2021 + 1 }, (_, i) => 2021 + i).reverse();
  }, []);

  const handlePeriodTypeChange = (type: 'all' | 'year' | 'quarter' | 'month' | 'custom') => {
    setPeriodType(type);
    if (type !== 'custom') {
      setCustomRange({ start: undefined, end: undefined });
    }
  };

  const handleDateChange = (key: 'start' | 'end', value: string) => {
    setCustomRange((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/login');
        return;
      }

      const { data: appUser } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!appUser) {
        router.push('/login');
        return;
      }

      // role이 artist가 아니거나 artist_id가 없으면 grigoent 페이지로 리디렉션
      if (appUser.role !== 'artist' || !appUser.artist_id) {
        router.push('/grigoent');
        return;
      }

      setUser({ ...authUser, profile: appUser });
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">오류가 발생했습니다</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {error ? String(error) : '데이터를 불러올 수 없습니다'}
          </p>
        </div>
      </div>
    );
  }

  const artist = data.artist;
  const viewTitles = {
    dashboard: '대시보드',
    projects: '프로젝트',
    settlements: '정산현황',
  };

  const handleViewChange = (view: MyProfileView) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* 데스크톱 사이드바 */}
      <div className="hidden lg:block">
        <MyProfileSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          userName={user?.profile?.name || user?.email || '사용자'}
          onLogout={handleLogout}
        />
      </div>

      {/* 모바일 사이드바 드로어 */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-64 p-0 bg-slate-900 text-white border-l border-slate-700">
          <MyProfileSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            userName={user?.profile?.name || user?.email || '사용자'}
            onLogout={handleLogout}
          />
        </SheetContent>
      </Sheet>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-auto min-h-[auto] items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-3 sm:px-6 py-3 sm:py-4 backdrop-blur">
          <div className="flex items-start gap-2 sm:gap-3 flex-1 w-full">
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 sm:mb-3">{viewTitles[currentView]}</h2>
              <div className="flex flex-col gap-2 sm:gap-3">
                {/* 토글 버튼 - 모바일에서는 스크롤 가능 */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <button
                    onClick={() => handlePeriodTypeChange('month')}
                    className={cn(
                      'rounded-lg px-3 py-2 text-xs sm:text-[11px] font-semibold transition whitespace-nowrap flex-shrink-0',
                      periodType === 'month'
                        ? 'bg-slate-900 dark:bg-slate-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    월별
                  </button>
                  <button
                    onClick={() => handlePeriodTypeChange('quarter')}
                    className={cn(
                      'rounded-lg px-3 py-2 text-xs sm:text-[11px] font-semibold transition whitespace-nowrap flex-shrink-0',
                      periodType === 'quarter'
                        ? 'bg-slate-900 dark:bg-slate-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    분기별
                  </button>
                  <button
                    onClick={() => handlePeriodTypeChange('year')}
                    className={cn(
                      'rounded-lg px-3 py-2 text-xs sm:text-[11px] font-semibold transition whitespace-nowrap flex-shrink-0',
                      periodType === 'year'
                        ? 'bg-slate-900 dark:bg-slate-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    연도별
                  </button>
                  <button
                    onClick={() => handlePeriodTypeChange('custom')}
                    className={cn(
                      'rounded-lg px-3 py-2 text-xs sm:text-[11px] font-semibold transition whitespace-nowrap flex-shrink-0',
                      periodType === 'custom'
                        ? 'bg-slate-900 dark:bg-slate-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    직접선택
                  </button>
                  <button
                    onClick={() => handlePeriodTypeChange('all')}
                    className={cn(
                      'rounded-lg px-3 py-2 text-xs sm:text-[11px] font-semibold transition whitespace-nowrap flex-shrink-0',
                      periodType === 'all'
                        ? 'bg-slate-900 dark:bg-slate-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    전체 기간
                  </button>
                </div>

                {/* 조건부 선택 UI */}
                {periodType === 'year' && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">연도:</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px]"
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
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-xs sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">연도:</label>
                      <select
                        value={selectedQuarterYear}
                        onChange={(e) => setSelectedQuarterYear(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px]"
                      >
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}년
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">분기:</label>
                      <select
                        value={selectedQuarter}
                        onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px]"
                      >
                        <option value={1}>1분기 (1-3월)</option>
                        <option value={2}>2분기 (4-6월)</option>
                        <option value={3}>3분기 (7-9월)</option>
                        <option value={4}>4분기 (10-12월)</option>
                      </select>
                    </div>
                  </div>
                )}

                {periodType === 'month' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-xs sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">월:</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px]"
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
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px]"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}년
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {periodType === 'custom' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-xs sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">시작일:</label>
                      <input
                        type="date"
                        value={customRange.start ?? ''}
                        onChange={(e) => handleDateChange('start', e.target.value)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-xs sm:text-[11px] text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">종료일:</label>
                      <input
                        type="date"
                        value={customRange.end ?? ''}
                        onChange={(e) => handleDateChange('end', e.target.value)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-xs sm:text-[11px] text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* 모바일 햄버거 버튼 - 우측 */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-8">
          {currentView === 'dashboard' && (
            <ArtistDashboardView
              artist={artist}
              projects={data.projects}
              financialEntries={data.financialEntries}
              financialSummary={data.financialSummary}
              activePeriod={activePeriod}
            />
          )}

          {currentView === 'projects' && (
            <ArtistProjectsView
              projects={data.projects}
              artist={artist}
              onProjectClick={setSelectedProject}
              activePeriod={activePeriod}
            />
          )}

          {currentView === 'settlements' && (
            <ArtistSettlementView
              projects={data.projects}
              financialEntries={data.financialEntries}
              financialSummary={data.financialSummary}
              activePeriod={activePeriod}
            />
          )}
        </div>
      </main>

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          financialEntries={data.financialEntries.filter((f) => f.project_id === selectedProject.id)}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}
