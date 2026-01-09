'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Users,
  Monitor,
  LogOut as LogOutIcon,
  Coffee,
  ChevronLeft,
  ChevronRight,
  Building2,
  Zap,
  RefreshCw,
  UserX,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApprovalQueue } from './ApprovalQueue';

type DisplayWorkStatus = 'OFF_WORK' | 'WORKING' | 'CHECKED_OUT' | 'AWAY' | 'OVERTIME';

interface UserAttendance {
  user_id: string;
  name: string;
  email: string;
  role: string;
  bu_code: string | null;
  position: string | null;
  display_status: DisplayWorkStatus;
  realtime_status: string | null;
  first_check_in: string | null;
  last_check_out: string | null;
  is_overtime: boolean;
  logs_count: number;
}

interface OverviewStats {
  total: number;
  working: number;
  checked_out: number;
  off_work: number;
  away: number;
  overtime: number;
}

interface OverviewResponse {
  date: string;
  is_today: boolean;
  stats: OverviewStats;
  users: UserAttendance[];
}

const BU_LABELS: Record<string, string> = {
  GRIGO: '그리고엔터',
  FLOW: '플로우메이커',
  REACT: '리액트스튜디오',
  MODOO: '모두굿즈',
  AST: 'AST COMPANY',
  HEAD: '본사',
};

const STATUS_CONFIG: Record<DisplayWorkStatus, {
  label: string;
  icon: any;
  bgColor: string;
  textColor: string;
  dotColor: string;
}> = {
  WORKING: {
    label: '근무중',
    icon: Monitor,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    dotColor: 'bg-green-500',
  },
  CHECKED_OUT: {
    label: '퇴근',
    icon: LogOutIcon,
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-600 dark:text-slate-400',
    dotColor: 'bg-slate-400',
  },
  OFF_WORK: {
    label: '미출근',
    icon: UserX,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    dotColor: 'bg-red-500',
  },
  AWAY: {
    label: '자리비움',
    icon: Coffee,
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    dotColor: 'bg-orange-500',
  },
  OVERTIME: {
    label: '연장근무중',
    icon: Zap,
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-400',
    dotColor: 'bg-purple-500',
  },
};

async function fetchOverview(date: string, buCode?: string): Promise<OverviewResponse> {
  const params = new URLSearchParams({ date });
  if (buCode) params.append('bu_code', buCode);

  const res = await fetch(`/api/attendance/admin/overview?${params}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch overview');
  }
  return res.json();
}

export function AttendanceAdminView() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBu, setSelectedBu] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showApprovalQueue, setShowApprovalQueue] = useState(true);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['attendance-admin-overview', selectedDate, selectedBu],
    queryFn: () => fetchOverview(selectedDate, selectedBu || undefined),
    refetchInterval: 30000,
  });

  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    if (!statusFilter) return data.users;
    return data.users.filter((u) => u.display_status === statusFilter);
  }, [data?.users, statusFilter]);

  const groupedByBu = useMemo(() => {
    const groups: Record<string, UserAttendance[]> = {};
    filteredUsers.forEach((user) => {
      const bu = user.bu_code || 'UNKNOWN';
      if (!groups[bu]) groups[bu] = [];
      groups[bu].push(user);
    });
    return groups;
  }, [filteredUsers]);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    try {
      return format(parseISO(isoString), 'HH:mm');
    } catch {
      return '-';
    }
  };

  const handlePrevDay = () => {
    const date = parseISO(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(format(date, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const date = parseISO(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(format(date, 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const formattedDate = format(parseISO(selectedDate), 'yyyy년 M월 d일 (EEEE)', { locale: ko });
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>오류가 발생했습니다: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            전체 근무현황
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            전체 직원들의 출퇴근 현황을 확인할 수 있습니다.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          <RefreshCw className="h-4 w-4" />
          새로고침
        </button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
        <button
          onClick={handlePrevDay}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </button>

        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {formattedDate}
          </span>
          {!isToday && (
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              오늘
            </button>
          )}
        </div>

        <button
          onClick={handleNextDay}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {/* 전체 */}
          <div
            onClick={() => setStatusFilter('')}
            className={cn(
              'rounded-2xl p-4 border cursor-pointer transition',
              statusFilter === ''
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
            )}
          >
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">전체</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {data.stats.total}명
            </p>
          </div>

          {/* 근무중 */}
          <div
            onClick={() => setStatusFilter('WORKING')}
            className={cn(
              'rounded-2xl p-4 border cursor-pointer transition',
              statusFilter === 'WORKING'
                ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-green-300'
            )}
          >
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
              <Monitor className="h-4 w-4" />
              <span className="text-xs font-medium">근무중</span>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {data.stats.working}명
            </p>
          </div>

          {/* 퇴근 */}
          <div
            onClick={() => setStatusFilter('CHECKED_OUT')}
            className={cn(
              'rounded-2xl p-4 border cursor-pointer transition',
              statusFilter === 'CHECKED_OUT'
                ? 'bg-slate-200 dark:bg-slate-600 border-slate-400 dark:border-slate-500'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400'
            )}
          >
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
              <LogOutIcon className="h-4 w-4" />
              <span className="text-xs font-medium">퇴근</span>
            </div>
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
              {data.stats.checked_out}명
            </p>
          </div>

          {/* 미출근 */}
          <div
            onClick={() => setStatusFilter('OFF_WORK')}
            className={cn(
              'rounded-2xl p-4 border cursor-pointer transition',
              statusFilter === 'OFF_WORK'
                ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-300'
            )}
          >
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
              <UserX className="h-4 w-4" />
              <span className="text-xs font-medium">미출근</span>
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">
              {data.stats.off_work}명
            </p>
          </div>

          {/* 자리비움 */}
          <div
            onClick={() => setStatusFilter('AWAY')}
            className={cn(
              'rounded-2xl p-4 border cursor-pointer transition',
              statusFilter === 'AWAY'
                ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300'
            )}
          >
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
              <Coffee className="h-4 w-4" />
              <span className="text-xs font-medium">자리비움</span>
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {data.stats.away}명
            </p>
          </div>

          {/* 연장근무 */}
          <div
            onClick={() => setStatusFilter('OVERTIME')}
            className={cn(
              'rounded-2xl p-4 border cursor-pointer transition',
              statusFilter === 'OVERTIME'
                ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-300'
            )}
          >
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-medium">연장근무</span>
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {data.stats.overtime}명
            </p>
          </div>
        </div>
      )}

      {/* Approval Queue Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => setShowApprovalQueue(!showApprovalQueue)}
          className="w-full px-6 py-4 flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
        >
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              결재 대기함
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              (근무 생성/수정 요청 승인 및 반려)
            </span>
          </div>
          {showApprovalQueue ? (
            <ChevronUp className="h-5 w-5 text-slate-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-500" />
          )}
        </button>
        {showApprovalQueue && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-700">
            <ApprovalQueue />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-500" />
          <select
            value={selectedBu}
            onChange={(e) => setSelectedBu(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 사업부</option>
            {Object.entries(BU_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* User List */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">
          로딩 중...
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByBu).map(([buCode, users]) => (
            <div
              key={buCode}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  {BU_LABELS[buCode] || buCode} ({users.length}명)
                </h3>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {users.map((user) => {
                  const statusConfig = STATUS_CONFIG[user.display_status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={user.user_id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-200">
                            {user.name?.slice(0, 2) || 'U'}
                          </div>
                          <span
                            className={cn(
                              'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800',
                              statusConfig.dotColor
                            )}
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {user.position || user.role}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">출근</p>
                          <p className="font-semibold text-green-600 dark:text-green-400">
                            {formatTime(user.first_check_in)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">퇴근</p>
                          <p className="font-semibold text-red-600 dark:text-red-400">
                            {formatTime(user.last_check_out)}
                          </p>
                        </div>
                        <div
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold min-w-[90px] justify-center',
                            statusConfig.bgColor,
                            statusConfig.textColor
                          )}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusConfig.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              해당하는 직원이 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
