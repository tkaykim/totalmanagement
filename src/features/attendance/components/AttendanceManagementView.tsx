'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '@/features/erp/api';
import { AttendanceCalendar } from './AttendanceCalendar';
import { AttendanceEditModal } from './AttendanceEditModal';
import { TeamMonthlyStats } from './TeamMonthlyStats';
import { canViewAllAttendance } from '../lib/permissions';
import { Clock, FileEdit, Users, CalendarDays, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppUser } from '@/types/database';

interface AttendanceManagementViewProps {
  onRequestCorrection?: () => void;
}

type ViewMode = 'personal' | 'team' | 'member-detail';

export function AttendanceManagementView({ onRequestCorrection }: AttendanceManagementViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('personal');
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const [selectedMemberName, setSelectedMemberName] = useState<string | undefined>();

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const currentUser = usersData?.currentUser as AppUser | undefined;
  const allUsers = usersData?.users as AppUser[] | undefined;
  const isAdminHead = canViewAllAttendance(currentUser);

  const selectedUserName = useMemo(() => {
    if (!selectedMemberId || !allUsers) return undefined;
    const user = allUsers.find((u) => u.id === selectedMemberId);
    return user?.name;
  }, [selectedMemberId, allUsers]);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setIsDetailModalOpen(true);
  };

  const handleSelectMember = (userId: string) => {
    const user = allUsers?.find((u) => u.id === userId);
    setSelectedMemberId(userId);
    setSelectedMemberName(user?.name);
    setViewMode('member-detail');
  };

  const handleBackToTeamView = () => {
    setViewMode('team');
    setSelectedMemberId(undefined);
    setSelectedMemberName(undefined);
  };

  const handleBackToPersonalView = () => {
    setViewMode('personal');
    setSelectedMemberId(undefined);
    setSelectedMemberName(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            근무시간 관리
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {viewMode === 'personal' && '월별 근무시간을 확인하고 정정 신청할 수 있습니다.'}
            {viewMode === 'team' && '팀원들의 월별 근무시간을 확인할 수 있습니다.'}
            {viewMode === 'member-detail' && selectedMemberName && `${selectedMemberName}님의 근무시간을 확인합니다.`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* admin+HEAD 전용: 뷰 모드 전환 */}
          {isAdminHead && viewMode !== 'member-detail' && (
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                onClick={() => setViewMode('personal')}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition flex items-center gap-1.5',
                  viewMode === 'personal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <CalendarDays className="h-4 w-4" />
                내 기록
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition flex items-center gap-1.5',
                  viewMode === 'team'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <Users className="h-4 w-4" />
                팀 현황
              </button>
            </div>
          )}

          {viewMode === 'member-detail' && (
            <button
              onClick={handleBackToTeamView}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition',
                'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
                'hover:bg-slate-200 dark:hover:bg-slate-600'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              팀 현황으로
            </button>
          )}

          {onRequestCorrection && viewMode === 'personal' && (
            <button
              onClick={onRequestCorrection}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition',
                'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
                'hover:bg-slate-200 dark:hover:bg-slate-600'
              )}
            >
              <FileEdit className="h-4 w-4" />
              정정 신청
            </button>
          )}
        </div>
      </div>

      {/* Personal View - 본인 캘린더 */}
      {viewMode === 'personal' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <AttendanceCalendar onSelectDate={handleSelectDate} />
        </div>
      )}

      {/* Team View - 팀 전체 월별 현황 */}
      {viewMode === 'team' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <TeamMonthlyStats
            onSelectUser={handleSelectMember}
            selectedUserId={selectedMemberId}
          />
        </div>
      )}

      {/* Member Detail View - 특정 멤버의 캘린더 */}
      {viewMode === 'member-detail' && selectedMemberId && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <AttendanceCalendar
            onSelectDate={handleSelectDate}
            userId={selectedMemberId}
            userName={selectedMemberName}
          />
        </div>
      )}

      {/* Detail Modal */}
      {selectedDate && (
        <AttendanceEditModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}
