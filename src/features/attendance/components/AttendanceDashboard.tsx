'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAttendanceStatus, type AutoCheckoutWarning } from '../api';
import { CheckInButton } from './CheckInButton';
import { CheckOutButton } from './CheckOutButton';
import { AttendanceStatusCard } from './AttendanceStatusCard';
import { WorkStatusButtons } from './WorkStatusButtons';
import { WelcomeToast, getRandomWelcomeMessage } from './WelcomeToast';
import { MissedCheckoutModal } from './MissedCheckoutModal';
import { Calendar, FileEdit, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttendanceStatus, PendingAutoCheckoutRecord } from '../types';

type WorkStatus = 'WORKING' | 'MEETING' | 'OUTSIDE' | 'BREAK';

interface AttendanceDashboardProps {
  onRequestCorrection?: () => void;
}

export function AttendanceDashboard({ onRequestCorrection }: AttendanceDashboardProps) {
  const [workStatus, setWorkStatus] = useState<WorkStatus>('WORKING');
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeTitle, setWelcomeTitle] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [previousCheckedIn, setPreviousCheckedIn] = useState(false);
  const [autoCheckoutWarning, setAutoCheckoutWarning] = useState<AutoCheckoutWarning | null>(null);
  const [showMissedCheckoutModal, setShowMissedCheckoutModal] = useState(false);
  const [pendingAutoCheckouts, setPendingAutoCheckouts] = useState<PendingAutoCheckoutRecord[]>([]);
  const [shownPendingIds, setShownPendingIds] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useQuery<AttendanceStatus>({
    queryKey: ['attendance-status'],
    queryFn: getAttendanceStatus,
    refetchInterval: 30000,
  });

  // 접속 시 또는 새로운 미확인 자동 퇴근 기록이 있으면 모달 표시
  // 로그인 상태에서 자정을 넘겨도 새로운 기록이 추가되면 모달이 다시 표시됨
  useEffect(() => {
    if (status?.pendingAutoCheckouts && status.pendingAutoCheckouts.length > 0) {
      // 아직 표시하지 않은 새로운 기록이 있는지 확인
      const newRecords = status.pendingAutoCheckouts.filter(
        (r) => !shownPendingIds.has(r.id)
      );
      
      if (newRecords.length > 0) {
        setPendingAutoCheckouts(status.pendingAutoCheckouts);
        setShowMissedCheckoutModal(true);
        // 표시된 ID들을 기록
        setShownPendingIds((prev) => {
          const next = new Set(prev);
          status.pendingAutoCheckouts.forEach((r) => next.add(r.id));
          return next;
        });
      }
    }
  }, [status?.pendingAutoCheckouts, shownPendingIds]);

  useEffect(() => {
    if (status) {
      const wasCheckedIn = previousCheckedIn;
      const isNowCheckedIn = status.isCheckedIn;
      
      if (!wasCheckedIn && isNowCheckedIn) {
        setWelcomeTitle('출근 완료!');
        setWelcomeMessage(getRandomWelcomeMessage());
        setShowWelcome(true);
      }
      
      setPreviousCheckedIn(isNowCheckedIn);
    }
  }, [status?.isCheckedIn, previousCheckedIn]);

  const handleStatusChange = async (newStatus: WorkStatus) => {
    setWorkStatus(newStatus);
  };

  const handleLogout = () => {
    // CheckOutButton이 자체적으로 확인 모달을 표시하므로 여기서는 처리하지 않음
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-500 dark:text-slate-400">로딩 중...</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-500 dark:text-slate-400">근태 정보를 불러올 수 없습니다.</div>
      </div>
    );
  }

  const handleMissedCheckoutModalClose = () => {
    setShowMissedCheckoutModal(false);
    // 모달 닫힌 후 상태 새로고침
    queryClient.invalidateQueries({ queryKey: ['attendance-status'] });
  };

  return (
    <div className="space-y-6">
      <WelcomeToast
        isOpen={showWelcome}
        title={welcomeTitle}
        message={welcomeMessage}
        onClose={() => setShowWelcome(false)}
      />

      <MissedCheckoutModal
        isOpen={showMissedCheckoutModal}
        onClose={handleMissedCheckoutModalClose}
        pendingCheckouts={pendingAutoCheckouts}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">근태 관리</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {new Date().toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </p>
        </div>
      </div>

      <AttendanceStatusCard status={status} />

      {autoCheckoutWarning && autoCheckoutWarning.logs && autoCheckoutWarning.logs.length > 0 && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-800 dark:text-orange-300">
                퇴근 기록 누락 알림
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                다음 날짜에 퇴근 기록이 없어 시스템에서 자동으로 18:00에 퇴근 처리되었습니다.
                정정 신청을 통해 실제 퇴근 시간으로 수정해 주세요.
              </p>
              <ul className="mt-2 space-y-1">
                {autoCheckoutWarning.logs.slice(0, 5).map((log) => (
                  <li key={log.id} className="text-xs text-orange-600 dark:text-orange-500">
                    • {log.work_date}
                  </li>
                ))}
                {autoCheckoutWarning.logs.length > 5 && (
                  <li className="text-xs text-orange-600 dark:text-orange-500">
                    • 외 {autoCheckoutWarning.logs.length - 5}건
                  </li>
                )}
              </ul>
              {onRequestCorrection && (
                <button
                  onClick={() => {
                    onRequestCorrection();
                  }}
                  className={cn(
                    'mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                    'bg-orange-600 hover:bg-orange-500 text-white active:scale-95'
                  )}
                >
                  <FileEdit size={16} />
                  근무시간 정정 신청
                </button>
              )}
            </div>
            <button
              onClick={() => setAutoCheckoutWarning(null)}
              className="text-orange-400 hover:text-orange-600 dark:text-orange-500 dark:hover:text-orange-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {status.isCheckedIn && !status.isCheckedOut && (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">근무 상태</h3>
          <WorkStatusButtons
            currentStatus={workStatus}
            onStatusChange={handleStatusChange}
            showLogout={false}
          />
        </div>
      )}

      <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">출퇴근</h3>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {!status.isCheckedIn ? (
            <CheckInButton 
              onAutoCheckoutWarning={(warning) => {
                if (warning) {
                  setAutoCheckoutWarning(warning);
                  // 정정 신청 모달 자동 열기
                  if (onRequestCorrection) {
                    setTimeout(() => {
                      onRequestCorrection();
                    }, 100);
                  }
                }
              }}
            />
          ) : !status.isCheckedOut ? (
            <CheckOutButton />
          ) : (
            <div className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700">
              <Calendar size={20} />
              오늘의 출퇴근이 완료되었습니다
            </div>
          )}
        </div>
      </div>

      {onRequestCorrection && (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">근태 정정</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            출퇴근 시간을 놓치셨나요? 정정 신청을 통해 수정할 수 있습니다.
          </p>
          <button
            onClick={onRequestCorrection}
            className={cn(
              'flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all',
              'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
              'hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95'
            )}
          >
            <FileEdit size={20} />
            정정 신청하기
          </button>
        </div>
      )}
    </div>
  );
}

