'use client';

import { ReactNode } from 'react';
import { WorkStatusFullScreen } from './WorkStatusFullScreen';
import {
  useWorkStatus,
  WorkStatusHeader,
  WorkStatusWelcomeModal,
  WorkStatusLogoutModal,
  WorkStatusOvertimeModal,
} from './WorkStatusHeader';
import type { WorkStatus } from './WorkStatusHeader';

interface WorkStatusWrapperProps {
  children: ReactNode;
  currentUser?: {
    id: string;
    name?: string;
    email?: string;
    profile?: {
      name?: string;
      position?: string;
      role?: string;
    };
  };
  onLogout?: () => void;
}

export function WorkStatusWrapper({ children, currentUser, onLogout }: WorkStatusWrapperProps) {
  const workStatusHook = useWorkStatus();

  // 상태 로딩 중
  if (workStatusHook.isStatusLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
        <p className="text-slate-400">근무 상태 확인 중...</p>
      </div>
    );
  }

  // OFF_WORK 또는 BREAK 상태일 때는 전체 화면 페이지만 표시
  if (workStatusHook.workStatus === 'OFF_WORK' || workStatusHook.workStatus === 'BREAK') {
    return (
      <>
        <WorkStatusFullScreen
          workStatus={workStatusHook.workStatus}
          currentTime={workStatusHook.currentTime}
          userName={workStatusHook.userName}
          userInitials={workStatusHook.userInitials}
          isChanging={workStatusHook.isChanging}
          onStatusChange={(status) => {
            workStatusHook.handleStatusChange(status);
          }}
          formatTimeDetail={workStatusHook.formatTimeDetail}
          formatDateDetail={workStatusHook.formatDateDetail}
        />
        <WorkStatusWelcomeModal
          showWelcome={workStatusHook.showWelcome}
          welcomeTitle={workStatusHook.welcomeTitle}
          welcomeMsg={workStatusHook.welcomeMsg}
        />
        <WorkStatusLogoutModal
          showLogoutConfirm={workStatusHook.showLogoutConfirm}
          isChanging={workStatusHook.isChanging}
          onCancel={() => workStatusHook.setShowLogoutConfirm(false)}
          onConfirm={async () => {
            await workStatusHook.confirmLogout();
            onLogout?.();
          }}
        />
        <WorkStatusOvertimeModal
          show={workStatusHook.showOvertimeConfirm}
          isChanging={workStatusHook.isChanging}
          onCancel={() => workStatusHook.setShowOvertimeConfirm(false)}
          onConfirm={() => workStatusHook.confirmOvertime()}
        />
      </>
    );
  }

  // 정상 작업 중일 때는 children 렌더링
  return <>{children}</>;
}

// 헤더에 표시할 상태 컴포넌트 export
export function useWorkStatusForHeader() {
  return useWorkStatus();
}

export { WorkStatusHeader };
export type { WorkStatus };

