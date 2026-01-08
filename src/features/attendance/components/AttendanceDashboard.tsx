'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAttendanceStatus } from '../api';
import { CheckInButton } from './CheckInButton';
import { CheckOutButton } from './CheckOutButton';
import { AttendanceStatusCard } from './AttendanceStatusCard';
import { WorkStatusButtons } from './WorkStatusButtons';
import { WelcomeToast, getRandomWelcomeMessage } from './WelcomeToast';
import { Calendar, FileEdit } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttendanceStatus } from '../types';

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
  
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useQuery<AttendanceStatus>({
    queryKey: ['attendance-status'],
    queryFn: getAttendanceStatus,
    refetchInterval: 30000,
  });

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

  return (
    <div className="space-y-6">
      <WelcomeToast
        isOpen={showWelcome}
        title={welcomeTitle}
        message={welcomeMessage}
        onClose={() => setShowWelcome(false)}
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
            <CheckInButton />
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

