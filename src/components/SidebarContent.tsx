'use client';

import { memo } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Coins,
  CheckSquare,
  ClipboardList,
  Users,
  Clock,
  CalendarDays,
  Building,
  Package,
  Car,
  Bug,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { View } from '@/features/erp/types';

interface SidebarButtonProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

function SidebarButton({ label, icon, active, onClick }: SidebarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm transition-all duration-200",
        active
          ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg"
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

interface SidebarContentProps {
  view: View;
  setView: (view: View) => void;
  user: {
    profile?: {
      name?: string;
      position?: string;
    };
    email?: string;
  } | null;
  visibleMenus: string[];
  handleLogout: () => void;
  onItemClick?: () => void;
}

export const SidebarContent = memo(function SidebarContent({
  view,
  setView,
  user,
  visibleMenus,
  handleLogout,
  onItemClick,
}: SidebarContentProps) {
  const handleMenuClick = (newView: View) => {
    setView(newView);
    onItemClick?.();
  };

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 - 고정 */}
      <div className="shrink-0 p-4 sm:p-8">
        <button
          onClick={() => handleMenuClick('dashboard')}
          className="text-left"
        >
          <p className="text-lg sm:text-xl font-bold tracking-tighter text-blue-300">GRIGO ERP</p>
          <p className="mt-1 text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Management System
          </p>
        </button>
      </div>
      
      {/* 메뉴 영역 - 스크롤 가능 */}
      <nav className="flex-1 overflow-y-auto space-y-2 px-2 sm:px-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {/* 대시보드 - 모든 사용자 */}
        {visibleMenus.includes('dashboard') && (
          <SidebarButton
            label="대시보드"
            icon={<LayoutDashboard className="h-4 w-4" />}
            active={view === 'dashboard'}
            onClick={() => handleMenuClick('dashboard')}
          />
        )}
        {/* 프로젝트 관리 - admin, leader, manager */}
        {visibleMenus.includes('projects') && (
          <SidebarButton
            label="프로젝트 관리"
            icon={<FolderKanban className="h-4 w-4" />}
            active={view === 'projects'}
            onClick={() => handleMenuClick('projects')}
          />
        )}
        {/* 정산 관리 - admin, leader, manager */}
        {visibleMenus.includes('settlement') && (
          <SidebarButton
            label="정산 관리"
            icon={<Coins className="h-4 w-4" />}
            active={view === 'settlement'}
            onClick={() => handleMenuClick('settlement')}
          />
        )}
        {/* 할일 관리 - 모든 사용자 */}
        {visibleMenus.includes('tasks') && (
          <SidebarButton
            label="할일 관리"
            icon={<CheckSquare className="h-4 w-4" />}
            active={view === 'tasks'}
            onClick={() => handleMenuClick('tasks')}
          />
        )}
        {/* 업무일지 - 모든 사용자 */}
        <SidebarButton
          label="업무일지"
          icon={<ClipboardList className="h-4 w-4" />}
          active={view === 'workLog'}
          onClick={() => handleMenuClick('workLog')}
        />
        {/* 조직 현황 - admin, leader */}
        {visibleMenus.includes('organization') && (
          <SidebarButton
            label="조직 현황"
            icon={<Users className="h-4 w-4" />}
            active={view === 'organization'}
            onClick={() => handleMenuClick('organization')}
          />
        )}
        {/* 파트너 관리 - admin, leader, manager */}
        {visibleMenus.includes('organization') && (
          <SidebarButton
            label="파트너 관리"
            icon={<Users className="h-4 w-4" />}
            active={view === 'partners'}
            onClick={() => handleMenuClick('partners')}
          />
        )}
        {/* 전속 아티스트 관리 - GRIGO, HEAD 사업부 */}
        {visibleMenus.includes('exclusiveArtists') && (
          <SidebarButton
            label="전속 아티스트"
            icon={<Users className="h-4 w-4" />}
            active={view === 'exclusiveArtists'}
            onClick={() => handleMenuClick('exclusiveArtists')}
          />
        )}
        {/* 근무시간 관리 - 모든 사용자 */}
        {visibleMenus.includes('attendance') && (
          <SidebarButton
            label="근무시간 관리"
            icon={<Clock className="h-4 w-4" />}
            active={view === 'attendance'}
            onClick={() => handleMenuClick('attendance')}
          />
        )}
        {/* 휴가 관리 - 모든 사용자 */}
        {visibleMenus.includes('leave') && (
          <SidebarButton
            label="휴가 관리"
            icon={<CalendarDays className="h-4 w-4" />}
            active={view === 'leave'}
            onClick={() => handleMenuClick('leave')}
          />
        )}
        
        {/* 예약 관리 - 탭 형태 */}
        <div className="mt-2 pt-2 border-t border-slate-700">
          <p className="px-2 sm:px-3 py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            예약 관리
          </p>
          <SidebarButton
            label="회의실 예약"
            icon={<Building className="h-4 w-4" />}
            active={view === 'meetingRooms'}
            onClick={() => handleMenuClick('meetingRooms')}
          />
          <SidebarButton
            label="장비 대여"
            icon={<Package className="h-4 w-4" />}
            active={view === 'equipment'}
            onClick={() => handleMenuClick('equipment')}
          />
          <SidebarButton
            label="차량 일지"
            icon={<Car className="h-4 w-4" />}
            active={view === 'vehicles'}
            onClick={() => handleMenuClick('vehicles')}
          />
        </div>
        
        {/* 버그 리포트 */}
        <div className="mt-2 pt-2 border-t border-slate-700">
          <SidebarButton
            label="버그 리포트"
            icon={<Bug className="h-4 w-4" />}
            active={view === 'bugReports'}
            onClick={() => handleMenuClick('bugReports')}
          />
        </div>
        
        {/* 관리자/리더 전용 메뉴 */}
        {(visibleMenus.includes('attendanceAdmin') || visibleMenus.includes('leaveAdmin')) && (
          <div className="mt-2 pt-2 border-t border-slate-700 pb-2">
            <p className="px-2 sm:px-3 py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              관리자 전용
            </p>
            {visibleMenus.includes('attendanceAdmin') && (
              <button
                onClick={() => handleMenuClick('attendanceAdmin')}
                className={cn(
                  "w-full flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm transition-all duration-200 mb-1",
                  view === 'attendanceAdmin'
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                )}
              >
                <Users className="h-4 w-4" />
                <span className="font-medium whitespace-nowrap">전체 근무현황</span>
              </button>
            )}
            {visibleMenus.includes('leaveAdmin') && (
              <button
                onClick={() => handleMenuClick('leaveAdmin')}
                className={cn(
                  "w-full flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm transition-all duration-200",
                  view === 'leaveAdmin'
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                )}
              >
                <CalendarDays className="h-4 w-4" />
                <span className="font-medium whitespace-nowrap">휴가 승인/관리</span>
              </button>
            )}
          </div>
        )}
        
        {/* nav 내부 하단 패딩 */}
        <div className="pb-4" />
      </nav>
      
      {/* 하단 사용자 정보 - 고정 */}
      <div className="shrink-0 border-t border-slate-700 p-4 sm:p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-3 sm:p-4">
          <p className="mb-1 text-[9px] sm:text-[10px] uppercase tracking-tighter text-slate-500 dark:text-slate-400">
            Signed in as
          </p>
          <p className="text-xs sm:text-sm font-semibold text-blue-100">
            {user?.profile?.name || user?.email || '사용자'}
          </p>
          {user?.profile?.position && (
            <p className="mt-1 text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500">{user.profile.position}</p>
          )}
        </div>
        <button
          onClick={() => {
            handleLogout();
            onItemClick?.();
          }}
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 transition hover:bg-slate-700/60 flex items-center justify-center gap-2"
        >
          <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
});
