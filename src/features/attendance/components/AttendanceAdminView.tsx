'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Zap,
  UserX,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Edit3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTodayKST } from '@/lib/timezone';
import { ApprovalQueue } from './ApprovalQueue';
import { AdminAttendanceEditModal } from './AdminAttendanceEditModal';
import { getApprovalQueue } from '../api';
import type { ApprovalQueueItem } from '../types';

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

interface CurrentUserInfo {
  id: string;
  role: string;
  bu_code: string | null;
  canEdit: boolean;
}

interface OverviewResponse {
  date: string;
  is_today: boolean;
  stats: OverviewStats;
  users: UserAttendance[];
  currentUser: CurrentUserInfo;
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
  const [selectedDate, setSelectedDate] = useState(getTodayKST());
  const [selectedBu, setSelectedBu] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showApprovalQueue, setShowApprovalQueue] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAttendance | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // 결재 대기 항목 쿼리
  const { data: approvalQueueData } = useQuery<ApprovalQueueItem[]>({
    queryKey: ['approval-queue'],
    queryFn: getApprovalQueue,
    refetchInterval: 30000,
  });

  // 결재 대기 항목이 있으면 자동으로 열고, 없으면 닫음
  useEffect(() => {
    if (approvalQueueData) {
      setShowApprovalQueue(approvalQueueData.length > 0);
    }
  }, [approvalQueueData]);

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
    setSelectedDate(getTodayKST());
  };

  const handleUserClick = (user: UserAttendance) => {
    // canEdit 권한이 있는 경우에만 모달 열기
    if (data?.currentUser?.canEdit) {
      setSelectedUser(user);
      setShowEditModal(true);
    }
  };

  const canEdit = data?.currentUser?.canEdit ?? false;

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
    refetch();
  };

  const formattedDate = format(parseISO(selectedDate), 'yyyy년 M월 d일 (EEEE)', { locale: ko });
  const isToday = selectedDate === getTodayKST();

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>오류가 발생했습니다: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Date Navigation & Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>

          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 px-2">
            {formattedDate}
          </span>

          <button
            onClick={handleNextDay}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>

          {!isToday && (
            <button
              onClick={handleToday}
              className="ml-2 px-2 py-1 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition"
            >
              오늘
            </button>
          )}
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        {/* BU Filter */}
        <select
          value={selectedBu}
          onChange={(e) => setSelectedBu(e.target.value)}
          className="text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 사업부</option>
          {Object.entries(BU_LABELS).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>

        {/* Approval Queue Toggle */}
        {approvalQueueData && approvalQueueData.length > 0 && (
          <button
            onClick={() => setShowApprovalQueue(!showApprovalQueue)}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800 transition"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            결재대기 ({approvalQueueData.length})
            {showApprovalQueue ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Stats Cards - Compact */}
      {data?.stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { key: '', label: '전체', count: data.stats.total, icon: Users, color: 'blue' },
            { key: 'WORKING', label: '근무중', count: data.stats.working, icon: Monitor, color: 'green' },
            { key: 'CHECKED_OUT', label: '퇴근', count: data.stats.checked_out, icon: LogOutIcon, color: 'slate' },
            { key: 'OFF_WORK', label: '미출근', count: data.stats.off_work, icon: UserX, color: 'red' },
            { key: 'AWAY', label: '자리비움', count: data.stats.away, icon: Coffee, color: 'orange' },
            { key: 'OVERTIME', label: '연장근무', count: data.stats.overtime, icon: Zap, color: 'purple' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = statusFilter === item.key;
            return (
              <div
                key={item.key}
                onClick={() => setStatusFilter(item.key)}
                className={cn(
                  'rounded-xl p-2.5 border cursor-pointer transition',
                  isActive
                    ? `bg-${item.color}-50 dark:bg-${item.color}-900/30 border-${item.color}-300 dark:border-${item.color}-700`
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                )}
              >
                <div className={cn('flex items-center gap-1.5 mb-0.5', `text-${item.color}-600 dark:text-${item.color}-400`)}>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
                <p className={cn('text-lg font-bold', `text-${item.color}-700 dark:text-${item.color}-300`)}>
                  {item.count}명
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Approval Queue Section - Collapsible */}
      {approvalQueueData && approvalQueueData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
          <button
            onClick={() => setShowApprovalQueue(!showApprovalQueue)}
            className="w-full px-3 py-2 flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
          >
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                결재 대기함
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {approvalQueueData.length}
              </span>
            </div>
            {showApprovalQueue ? (
              <ChevronUp className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            )}
          </button>
          {showApprovalQueue && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-700">
              <ApprovalQueue />
            </div>
          )}
        </div>
      )}

      {/* User List */}
      {isLoading ? (
        <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
          로딩 중...
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByBu).map(([buCode, users]) => (
            <div
              key={buCode}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
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
                      onClick={() => handleUserClick(user)}
                      className={cn(
                        'px-4 py-2.5 flex items-center justify-between transition',
                        canEdit
                          ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer group'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={cn(
                            'w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 transition',
                            canEdit && 'group-hover:ring-2 group-hover:ring-blue-400'
                          )}>
                            {user.name?.slice(0, 2) || 'U'}
                          </div>
                          <span
                            className={cn(
                              'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800',
                              statusConfig.dotColor
                            )}
                          />
                        </div>
                        <div>
                          <p className={cn(
                            'text-sm font-semibold text-slate-900 dark:text-slate-100 transition',
                            canEdit && 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                          )}>
                            {user.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {user.position || user.role}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">출근</p>
                          <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                            {formatTime(user.first_check_in)}
                          </p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">퇴근</p>
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                            {formatTime(user.last_check_out)}
                          </p>
                        </div>
                        <div
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold min-w-[72px] justify-center',
                            statusConfig.bgColor,
                            statusConfig.textColor
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </div>
                        {canEdit && (
                          <Edit3 className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              해당하는 직원이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* Admin Edit Modal */}
      <AdminAttendanceEditModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        user={selectedUser}
        selectedDate={selectedDate}
      />
    </div>
  );
}
