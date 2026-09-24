'use client';

import { useState, useEffect, useCallback } from 'react';
import { Monitor, Users, MapPin, Coffee, LogOut, Zap, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { formatKST, formatTimeKST } from '@/lib/timezone';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getBuName } from '@/lib/business-units';

export type WorkStatus = 'OFF_WORK' | 'WORKING' | 'MEETING' | 'OUTSIDE' | 'BREAK' | 'OVERTIME';


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

interface AutoCheckoutLog {
  id: string;
  work_date: string;
  check_in_at: string;
  check_out_at: string;
}

interface AutoCheckoutWarning {
  type: 'auto_checkout_history';
  message: string;
  logs: AutoCheckoutLog[];
}

export function useWorkStatus() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workStatus, setWorkStatus] = useState<WorkStatus>('OFF_WORK');
  const [isChanging, setIsChanging] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState('');
  const [welcomeTitle, setWelcomeTitle] = useState('환영합니다!');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showOvertimeConfirm, setShowOvertimeConfirm] = useState(false);
  const [showAutoCheckoutWarning, setShowAutoCheckoutWarning] = useState(false);
  const [autoCheckoutLogs, setAutoCheckoutLogs] = useState<AutoCheckoutLog[]>([]);

  // 사용자 정보 상태
  const [userName, setUserName] = useState('');
  const [userPosition, setUserPosition] = useState('');
  const [userInitials, setUserInitials] = useState('U');

  // 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 사용자 정보 로드 (자체적으로 API에서 가져옴)
  useEffect(() => {
    const fetchUserInfo = async () => {
      setIsUserLoading(true);
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          const { data: appUser } = await supabase
            .from('app_users')
            .select('name, position, bu_code')
            .eq('id', authUser.id)
            .single();

          if (appUser) {
            const name = appUser.name || authUser.email || '사용자';
            setUserName(name);

            // BU 이름과 직급을 조합하여 표시
            const buName = getBuName(appUser.bu_code);
            const position = appUser.position || '';
            
            if (buName && position) {
              setUserPosition(`${buName} / ${position}`);
            } else if (buName) {
              setUserPosition(buName);
            } else if (position) {
              setUserPosition(position);
            } else {
              setUserPosition('');
            }

            // 이니셜 계산
            const initials = name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U';
            setUserInitials(initials);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      } finally {
        setIsUserLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  // 근무 상태 로드 (자체적으로 API에서 가져옴)
  useEffect(() => {
    const fetchStatus = async () => {
      setIsStatusLoading(true);
      try {
        // 출퇴근 상태 가져오기 (활성 근무 기록 기준 - 날짜 무관)
        const attendanceRes = await fetch('/api/attendance/status');
        let isCheckedIn = false;
        let isCheckedOut = false;
        let hasCheckedOut = false;
        let isOvernightWork = false;

        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          isCheckedIn = attendanceData.isCheckedIn;
          isCheckedOut = attendanceData.isCheckedOut;
          hasCheckedOut = attendanceData.hasCheckedOut;
          isOvernightWork = attendanceData.isOvernightWork || false;
        }

        // 실시간 근무 상태 가져오기 (user_work_status 테이블)
        const workStatusRes = await fetch('/api/attendance/work-status');
        let realtimeStatus: WorkStatus = 'OFF_WORK';
        if (workStatusRes.ok) {
          const workStatusData = await workStatusRes.json();
          if (workStatusData.status && workStatusData.status !== 'OFF_WORK') {
            realtimeStatus = workStatusData.status as WorkStatus;
          }
        }

        // 강제 퇴근 이력 확인 (로그인 직후 확인)
        const autoCheckoutRes = await fetch('/api/attendance/pending-auto-checkouts');
        if (autoCheckoutRes.ok) {
          const autoCheckoutData = await autoCheckoutRes.json();
          if (autoCheckoutData.logs && autoCheckoutData.logs.length > 0) {
            setAutoCheckoutLogs(autoCheckoutData.logs);
            setShowAutoCheckoutWarning(true);
          }
        }

        // 상태 결정 로직:
        // 1. 활성 근무 기록이 있으면 (isCheckedIn && !isCheckedOut) 근무 상태 유지
        //    - 자정이 지난 경우(isOvernightWork)도 동일하게 처리
        // 2. 활성 근무 없고 오늘 퇴근 기록만 있으면 연장근무 여부 확인
        // 3. 둘 다 없으면 미출근(OFF_WORK) 상태
        if (isCheckedIn && !isCheckedOut) {
          // 활성 근무 중 (자정이 지나도 근무 유지)
          if (realtimeStatus !== 'OFF_WORK') {
            setWorkStatus(realtimeStatus);
          } else {
            setWorkStatus('WORKING');
          }
        } else if (hasCheckedOut && !isOvernightWork) {
          // 오늘 퇴근 완료 - 연장근무 여부 확인
          setShowOvertimeConfirm(true);
          setWorkStatus('OFF_WORK');
        } else {
          // 미출근 상태
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

  const formatTimeDetail = useCallback((date: Date) => {
    return formatKST(date, 'HH:mm:ss');
  }, []);

  const formatDateDetail = useCallback((date: Date) => {
    return formatKST(date, 'M월 d일 EEEE');
  }, []);

  const triggerWelcome = useCallback((title: string, msg: string) => {
    setWelcomeTitle(title);
    setWelcomeMsg(msg);
    setShowWelcome(true);
    setTimeout(() => setShowWelcome(false), 3500);
  }, []);

  // 근무 상태 변경 (자체적으로 API 호출)
  const handleStatusChange = useCallback(async (newStatus: WorkStatus) => {
    if (newStatus === workStatus) return;

    if (newStatus === 'OFF_WORK') {
      setShowLogoutConfirm(true);
      return;
    }

    const previousStatus = workStatus;
    setIsChanging(true);
    try {
      // 실시간 상태를 user_work_status 테이블에 저장
      const res = await fetch('/api/attendance/work-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update work status');
      }

      // 출근 처리 (OFF_WORK -> WORKING)
      if (previousStatus === 'OFF_WORK' && newStatus === 'WORKING') {
        // 출근 API 호출
        const checkInRes = await fetch('/api/attendance/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (checkInRes.ok) {
          const checkInData = await checkInRes.json();
          
          // 강제 퇴근 이력이 있으면 경고 모달 표시
          if (checkInData._warning && checkInData._warning.type === 'auto_checkout_history') {
            setAutoCheckoutLogs(checkInData._warning.logs || []);
            setShowAutoCheckoutWarning(true);
          }
        }
        
        triggerWelcome('출근 완료!', WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]);
      }

      // 휴식 복귀 (BREAK -> WORKING)
      if (previousStatus === 'BREAK' && newStatus === 'WORKING') {
        triggerWelcome('업무 복귀!', '잘 쉬고 오셨나요? 다시 화이팅 해봅시다! 🔥');
      }

      setWorkStatus(newStatus);
    } catch (error) {
      console.error('Status change error:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsChanging(false);
    }
  }, [workStatus, triggerWelcome]);

  // 퇴근 확인 후 처리 (자체적으로 API 호출) + 로그아웃
  const confirmLogout = useCallback(async () => {
    setIsChanging(true);
    try {
      // 실시간 상태를 OFF_WORK로 업데이트
      await fetch('/api/attendance/work-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'OFF_WORK' }),
      });

      // 퇴근 API 호출
      await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      setWorkStatus('OFF_WORK');
      setShowLogoutConfirm(false);

      // Supabase 로그아웃 후 로그인 페이지로 리다이렉트
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      alert('퇴근 처리 중 오류가 발생했습니다.');
    } finally {
      setIsChanging(false);
    }
  }, []);

  // 연장근무 재개 (자체적으로 API 호출)
  const confirmOvertime = useCallback(async () => {
    setIsChanging(true);
    try {
      // 연장근무 상태로 변경
      await fetch('/api/attendance/work-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'OVERTIME' }),
      });

      // 연장근무 체크인 API 호출
      await fetch('/api/attendance/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      setWorkStatus('OVERTIME');
      setShowOvertimeConfirm(false);
      triggerWelcome('연장근무 시작!', '힘내세요! 화이팅! 💪');
    } catch (error) {
      console.error('Overtime error:', error);
      alert('연장근무 처리 중 오류가 발생했습니다.');
    } finally {
      setIsChanging(false);
    }
  }, [triggerWelcome]);

  // 강제 퇴근 기록 하나 확인 처리 (시간 수정 없이)
  const confirmOneAutoCheckout = useCallback(async (logId: string) => {
    try {
      const res = await fetch(`/api/attendance/logs/${logId}/correct-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip_correction: true }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '확인 처리에 실패했습니다.');
      }
      
      // 확인된 로그 제거
      setAutoCheckoutLogs(prev => {
        const newLogs = prev.filter(log => log.id !== logId);
        // 남은 로그가 없으면 모달 닫기
        if (newLogs.length === 0) {
          setShowAutoCheckoutWarning(false);
        }
        return newLogs;
      });
    } catch (error) {
      console.error('Confirm auto checkout error:', error);
      alert(error instanceof Error ? error.message : '확인 처리에 실패했습니다.');
    }
  }, []);

  // 강제 퇴근 기록에 대한 정정 신청 (관리자 승인 필요)
  const requestCorrectionForAutoCheckout = useCallback(async (
    logId: string, 
    workDate: string, 
    checkInTime: string, 
    checkOutTime: string, 
    reason: string
  ) => {
    try {
      // 1. 정정 신청 생성 (work_requests 테이블)
      const correctionRes = await fetch('/api/attendance/work-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: 'attendance_correction',
          start_date: workDate,
          end_date: workDate,
          start_time: checkInTime,
          end_time: checkOutTime,
          reason: `[자동퇴근 정정] ${reason}`,
        }),
      });
      
      if (!correctionRes.ok) {
        const data = await correctionRes.json();
        throw new Error(data.error || '정정 신청에 실패했습니다.');
      }
      
      // 2. 해당 기록을 user_confirmed = true로 업데이트 (신청했으므로 확인한 것으로 간주)
      await fetch(`/api/attendance/logs/${logId}/correct-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip_correction: true }),
      });
      
      alert('정정 신청이 완료되었습니다. 관리자 승인 후 반영됩니다.');
      
      // 신청 완료된 로그 제거
      setAutoCheckoutLogs(prev => {
        const newLogs = prev.filter(log => log.id !== logId);
        if (newLogs.length === 0) {
          setShowAutoCheckoutWarning(false);
        }
        return newLogs;
      });
    } catch (error) {
      console.error('Request correction error:', error);
      alert(error instanceof Error ? error.message : '정정 신청에 실패했습니다.');
    }
  }, []);

  // 모달 닫기 (나중에 처리)
  const dismissAutoCheckoutWarning = useCallback(() => {
    setShowAutoCheckoutWarning(false);
  }, []);

  return {
    workStatus,
    currentTime,
    userName,
    userPosition,
    userInitials,
    isChanging,
    isStatusLoading,
    isUserLoading,
    showWelcome,
    welcomeTitle,
    welcomeMsg,
    showLogoutConfirm,
    showOvertimeConfirm,
    showAutoCheckoutWarning,
    autoCheckoutLogs,
    setShowLogoutConfirm,
    setShowOvertimeConfirm,
    setShowAutoCheckoutWarning,
    setWorkStatus,
    triggerWelcome,
    handleStatusChange,
    confirmLogout,
    confirmOvertime,
    confirmOneAutoCheckout,
    requestCorrectionForAutoCheckout,
    dismissAutoCheckoutWarning,
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

      {/* 모바일: 한 줄 배치 */}
      <div className="md:hidden bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <div className="flex items-center gap-2 px-1.5">
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">{userName || '사용자'}</div>
            {userPosition && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate">{userPosition}</div>
            )}
          </div>
        </div>

        <Select
          value={workStatus}
          onValueChange={(value) => {
            if (value === 'OFF_WORK_ACTION') {
              onStatusChange('OFF_WORK');
            } else {
              onStatusChange(value as WorkStatus);
            }
          }}
          disabled={isChanging}
        >
          <SelectTrigger className="h-8 text-xs px-2 min-w-[100px] max-w-[120px]">
            <div className="flex items-center gap-1.5">
              <CurrentIcon size={12} />
              <SelectValue>
                {currentStatusConfig?.label || '상태 선택'}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
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
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
            <SelectItem value="OFF_WORK_ACTION">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <LogOut size={14} />
                퇴근하기
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* PC: 기존 레이아웃 */}
      <div className="hidden md:flex bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 items-center gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 px-1.5 min-w-max">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">{userName || '사용자'}</div>
            {userPosition && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{userPosition}</div>
            )}
          </div>
        </div>

        <div className="h-7 w-px bg-slate-100 dark:bg-slate-700"></div>

        <div className="flex items-center gap-1 p-0.5">
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

        <div className="h-7 w-px bg-slate-100 dark:bg-slate-700"></div>

        <button
          onClick={() => onStatusChange('OFF_WORK')}
          disabled={isChanging}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut size={14} />
          퇴근
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

interface AutoCheckoutLogItem {
  id: string;
  work_date: string;
  check_in_at: string;
  check_out_at: string;
}

export function WorkStatusAutoCheckoutWarningModal({
  show,
  logs,
  onConfirmOne,
  onRequestCorrection,
  onDismiss,
}: {
  show: boolean;
  logs: AutoCheckoutLogItem[];
  onConfirmOne: (logId: string) => Promise<void>;
  onRequestCorrection: (logId: string, workDate: string, checkInTime: string, checkOutTime: string, reason: string) => Promise<void>;
  onDismiss: () => void;
}) {
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  if (!show || logs.length === 0) return null;

  const formatDateTime = (dateTimeStr: string) => {
    return formatTimeKST(dateTimeStr);
  };

  const formatDate = (dateStr: string) => {
    return formatKST(dateStr, 'M월 d일 (E)');
  };

  const handleConfirm = async (logId: string) => {
    setIsProcessing(logId);
    try {
      await onConfirmOne(logId);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleStartEdit = (logId: string, currentCheckOut: string) => {
    setEditingLogId(logId);
    const time = new Date(currentCheckOut);
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    setEditTime(`${hours}:${minutes}`);
    setEditReason('시스템 강제 퇴근 시간 정정');
  };

  const handleSubmitCorrection = async (log: AutoCheckoutLogItem) => {
    if (!editTime) {
      alert('퇴근 시간을 입력해주세요.');
      return;
    }
    if (!editReason.trim()) {
      alert('정정 사유를 입력해주세요.');
      return;
    }
    
    setIsProcessing(log.id);
    try {
      const checkInTime = formatDateTime(log.check_in_at);
      await onRequestCorrection(log.id, log.work_date, checkInTime, editTime, editReason);
      setEditingLogId(null);
      setEditTime('');
      setEditReason('');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditTime('');
    setEditReason('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[101] backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">미확인 퇴근 기록 ({logs.length}건)</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">시스템에 의해 자동 퇴근 처리된 기록입니다</p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4 max-h-96 overflow-y-auto">
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              기록이 맞으면 <strong>확인 완료</strong>를, 수정이 필요하면 <strong>정정 신청</strong>을 해주세요.
            </p>
            <ul className="space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{formatDate(log.work_date)}</span>
                    <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                      자동 퇴근
                    </span>
                  </div>
                  
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    <div className="flex justify-between">
                      <span>출근: {formatDateTime(log.check_in_at)}</span>
                      <span>퇴근: {formatDateTime(log.check_out_at)}</span>
                    </div>
                  </div>

                  {editingLogId === log.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">실제 퇴근:</label>
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-600 dark:text-slate-400">정정 사유:</label>
                        <textarea
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          placeholder="정정 사유를 입력해주세요"
                          rows={2}
                          className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSubmitCorrection(log)}
                          disabled={isProcessing === log.id}
                          className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                        >
                          {isProcessing === log.id ? '신청중...' : '정정 신청하기'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(log.id, log.check_out_at)}
                        disabled={isProcessing === log.id}
                        className="flex-1 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg disabled:opacity-50"
                      >
                        정정 신청
                      </button>
                      <button
                        onClick={() => handleConfirm(log.id)}
                        disabled={isProcessing === log.id}
                        className="flex-1 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                      >
                        {isProcessing === log.id ? '처리중...' : '확인 완료'}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={onDismiss}
            className="w-full py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
          >
            나중에 처리하기
          </button>
        </div>
      </div>
    </div>
  );
}
