'use client';

import { useState, useEffect } from 'react';
import { Monitor, Users, MapPin, Coffee, LogOut, Play, Zap, Sparkles, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type WorkStatus = 'OFF_WORK' | 'WORKING' | 'MEETING' | 'OUTSIDE' | 'BREAK' | 'OVERTIME';

interface WorkStatusHeaderProps {
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
  onStatusChange?: (status: WorkStatus) => Promise<void>;
  onLogout?: () => void;
}

const WELCOME_MESSAGES = [
  '오늘도 힘차게 시작해봐요! 화이팅! 🚀',
  '좋은 아침입니다! 멋진 하루가 될 거예요 ✨',
  'GRIGO의 에너지를 보여주세요! 💪',
  '오늘 하루도 산뜻하게 출발! 🌞',
  '준비되셨나요? 오늘도 대박 납시다! 💎',
];

const STATUS_CONFIG = {
  WORKING: {
    label: '업무중',
    icon: Monitor,
    activeColor: 'bg-green-600 text-white shadow-green-200 shadow-lg ring-2 ring-green-600 ring-offset-2',
    inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700',
  },
  MEETING: {
    label: '미팅',
    icon: Users,
    activeColor: 'bg-red-500 text-white shadow-red-200 shadow-lg ring-2 ring-red-500 ring-offset-2',
    inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700',
  },
  OUTSIDE: {
    label: '외근',
    icon: MapPin,
    activeColor: 'bg-blue-500 text-white shadow-blue-200 shadow-lg ring-2 ring-blue-500 ring-offset-2',
    inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700',
  },
  BREAK: {
    label: '휴식',
    icon: Coffee,
    activeColor: 'bg-orange-400 text-white shadow-orange-200 shadow-lg ring-2 ring-orange-400 ring-offset-2',
    inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700',
  },
};

export function useWorkStatus(currentUser?: WorkStatusHeaderProps['currentUser']) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workStatus, setWorkStatus] = useState<WorkStatus>('OFF_WORK');
  const [isChanging, setIsChanging] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState('');
  const [welcomeTitle, setWelcomeTitle] = useState('환영합니다!');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showOvertimeConfirm, setShowOvertimeConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      setIsStatusLoading(true);
      try {
        // 출퇴근 상태 가져오기
        const attendanceRes = await fetch('/api/attendance/status');
        let isCheckedIn = false;
        let isCheckedOut = false;
        let hasCheckedOut = false;

        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          isCheckedIn = attendanceData.isCheckedIn;
          isCheckedOut = attendanceData.isCheckedOut;
          hasCheckedOut = attendanceData.hasCheckedOut;
        }

        // 실시간 근무 상태 가져오기
        const workStatusRes = await fetch('/api/attendance/work-status');
        let realtimeStatus: WorkStatus = 'OFF_WORK';
        if (workStatusRes.ok) {
          const workStatusData = await workStatusRes.json();
          if (workStatusData.status && workStatusData.status !== 'OFF_WORK') {
            realtimeStatus = workStatusData.status as WorkStatus;
          }
        }

        // 상태 결정 로직
        if (isCheckedIn && !isCheckedOut) {
          // 출근 중인 경우, 실시간 상태 사용
          if (realtimeStatus !== 'OFF_WORK') {
            setWorkStatus(realtimeStatus);
          } else {
            setWorkStatus('WORKING');
          }
        } else if (hasCheckedOut) {
          setShowOvertimeConfirm(true);
          setWorkStatus('OFF_WORK');
        } else {
          setWorkStatus('OFF_WORK');
        }
      } catch (error) {
        console.error('Failed to fetch status:', error);
      } finally {
        setIsStatusLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const formatTimeDetail = (date: Date) => {
    return format(date, 'HH:mm:ss', { locale: ko });
  };

  const formatDateDetail = (date: Date) => {
    return format(date, 'M월 d일 EEEE', { locale: ko });
  };

  const triggerWelcome = (title: string, msg: string) => {
    setWelcomeTitle(title);
    setWelcomeMsg(msg);
    setShowWelcome(true);
    setTimeout(() => setShowWelcome(false), 3500);
  };

  const handleStatusChange = async (newStatus: WorkStatus, onStatusChange?: (status: WorkStatus, previousStatus: WorkStatus) => Promise<void>) => {
    if (newStatus === workStatus) return;

    if (newStatus === 'OFF_WORK') {
      setShowLogoutConfirm(true);
      return;
    }

    const previousStatus = workStatus;
    setIsChanging(true);
    try {
      if (onStatusChange) {
        await onStatusChange(newStatus, previousStatus);
      }

      // 실시간 상태를 user_work_status 테이블에 저장
      await fetch('/api/attendance/work-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (previousStatus === 'OFF_WORK' && newStatus === 'WORKING') {
        triggerWelcome('출근 완료!', WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]);
      }

      if (previousStatus === 'BREAK' && newStatus === 'WORKING') {
        triggerWelcome('업무 복귀!', '잘 쉬고 오셨나요? 다시 화이팅 해봅시다! 🔥');
      }

      setWorkStatus(newStatus);
    } catch (error) {
      console.error('Status change error:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const confirmLogout = async (onStatusChange?: (status: WorkStatus) => Promise<void>, onLogout?: () => void) => {
    setIsChanging(true);
    try {
      if (onStatusChange) {
        await onStatusChange('OFF_WORK');
      }
      
      // 실시간 상태를 OFF_WORK로 업데이트
      await fetch('/api/attendance/work-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'OFF_WORK' }),
      });
      
      setWorkStatus('OFF_WORK');
      setShowLogoutConfirm(false);
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const userName = currentUser?.profile?.name || currentUser?.name || currentUser?.email || '사용자';
  const userPosition = currentUser?.profile?.position || '';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return {
    workStatus,
    currentTime,
    userName,
    userPosition,
    userInitials,
    isChanging,
    isStatusLoading,
    showWelcome,
    welcomeTitle,
    welcomeMsg,
    showLogoutConfirm,
    showOvertimeConfirm,
    setShowLogoutConfirm,
    setShowOvertimeConfirm,
    setWorkStatus,
    triggerWelcome,
    handleStatusChange,
    confirmLogout,
    formatTimeDetail,
    formatDateDetail,
  };
}

export function WorkStatusHeader({
  workStatus,
  currentTime,
  userName,
  userPosition,
  userInitials,
  isChanging,
  onStatusChange,
  formatTimeDetail,
  formatDateDetail,
}: {
  workStatus: WorkStatus;
  currentTime: Date;
  userName: string;
  userPosition: string;
  userInitials: string;
  isChanging: boolean;
  onStatusChange: (status: WorkStatus) => void;
  formatTimeDetail: (date: Date) => string;
  formatDateDetail: (date: Date) => string;
}) {
  const currentStatusConfig = STATUS_CONFIG[workStatus as keyof typeof STATUS_CONFIG];
  const CurrentIcon = currentStatusConfig?.icon || Monitor;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="hidden md:flex flex-col justify-center px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm min-w-[130px]">
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          {formatDateDetail(currentTime)}
        </span>
        <span className="text-xl font-bold text-slate-800 dark:text-slate-200 font-mono tabular-nums tracking-tight flex items-center gap-1">
          <Clock size={14} className="text-slate-500 dark:text-slate-400" />
          {formatTimeDetail(currentTime)}
        </span>
      </div>

      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-1.5 md:gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 px-1.5 min-w-max">
          <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-xs shadow-md">
            {userInitials}
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">{userName}</div>
            {userPosition && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{userPosition}</div>
            )}
          </div>
        </div>

        <div className="hidden md:block h-7 w-px bg-slate-100 dark:bg-slate-700"></div>

        {/* 모바일: 드롭다운 */}
        <div className="md:hidden w-full">
          <Select
            value={workStatus}
            onValueChange={(value) => onStatusChange(value as WorkStatus)}
            disabled={isChanging}
          >
            <SelectTrigger className="w-full h-9 text-sm">
              <div className="flex items-center gap-2">
                <CurrentIcon size={14} />
                <SelectValue>
                  {currentStatusConfig?.label || '상태 선택'}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const status = key as WorkStatus;
                const Icon = config.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon size={14} />
                      {config.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* PC: 버튼들 */}
        <div className="hidden md:flex items-center gap-1 p-0.5">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const status = key as WorkStatus;
            const isActive = workStatus === status;
            const Icon = config.icon;

            return (
              <button
                key={key}
                onClick={() => onStatusChange(status)}
                disabled={isChanging}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap',
                  isActive ? config.activeColor : config.inactiveColor,
                  !isActive && 'border',
                  isChanging && 'opacity-50 cursor-not-allowed',
                )}
              >
                <Icon size={14} className={isActive ? 'animate-pulse' : 'text-slate-400 dark:text-slate-500'} />
                {config.label}
              </button>
            );
          })}
        </div>

        <div className="hidden md:block h-7 w-px bg-slate-100 dark:bg-slate-700"></div>

        <button
          onClick={() => onStatusChange('OFF_WORK')}
          disabled={isChanging}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors whitespace-nowrap ml-auto md:ml-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut size={14} />
          <span className="hidden md:inline">퇴근</span>
        </button>
      </div>
    </div>
  );
}


export function WorkStatusWelcomeModal({
  showWelcome,
  welcomeTitle,
  welcomeMsg,
}: {
  showWelcome: boolean;
  welcomeTitle: string;
  welcomeMsg: string;
}) {
  if (!showWelcome) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl rounded-2xl p-8 max-w-md text-center border-2 border-blue-100 dark:border-blue-900 animate-in zoom-in fade-in slide-in-from-bottom-10 duration-500">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <Sparkles size={32} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{welcomeTitle}</h3>
        <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">{welcomeMsg}</p>
      </div>
    </div>
  );
}

export function WorkStatusLogoutModal({
  showLogoutConfirm,
  isChanging,
  onCancel,
  onConfirm,
}: {
  showLogoutConfirm: boolean;
  isChanging: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!showLogoutConfirm) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[101] backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut size={32} />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">퇴근 하시겠습니까?</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
            오늘 하루도 수고하셨습니다!<br />
            정말 퇴근 처리할까요?
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              disabled={isChanging}
              className="flex-1 py-3 text-sm font-bold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              네, 퇴근합니다
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkStatusOvertimeModal({
  show,
  isChanging,
  onCancel,
  onConfirm,
}: {
  show: boolean;
  isChanging: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[101] backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap size={32} />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">연장근무 재개</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
            이미 퇴근처리 하셨습니다.<br />
            다시 근무를 재개하시나요?
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isChanging}
              className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              disabled={isChanging}
              className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              예, 재개하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
