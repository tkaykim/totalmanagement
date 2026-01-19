'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTeamStats } from '../api';
import { formatWorkTime } from '../lib/workTimeCalculator';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMonthlyStatsProps {
  onSelectUser: (userId: string) => void;
  selectedUserId?: string;
}

const BU_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'HEAD', label: '본사' },
  { value: 'GRIGO', label: '그리고엔터' },
  { value: 'FLOW', label: '플로우메이커' },
  { value: 'REACT', label: '리액트스튜디오' },
  { value: 'MODOO', label: '모두굿즈' },
  { value: 'AST', label: 'AST컴퍼니' },
];

export function TeamMonthlyStats({ onSelectUser, selectedUserId }: TeamMonthlyStatsProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBu, setSelectedBu] = useState('all');
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data, isLoading } = useQuery({
    queryKey: ['team-stats', year, month, selectedBu],
    queryFn: () => getTeamStats({ year, month, bu_code: selectedBu }),
  });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const goToThisMonth = () => {
    setCurrentDate(new Date());
  };

  const summary = useMemo(() => {
    if (!data?.stats || data.stats.length === 0) {
      return { totalMembers: 0, avgWorkMinutes: 0, totalLateCount: 0 };
    }

    const totalMembers = data.stats.length;
    const membersWithWork = data.stats.filter((s) => s.totalWorkMinutes > 0);
    const totalMinutes = data.stats.reduce((sum, s) => sum + s.totalWorkMinutes, 0);
    const avgWorkMinutes = membersWithWork.length > 0 ? Math.round(totalMinutes / membersWithWork.length) : 0;
    const totalLateCount = data.stats.reduce((sum, s) => sum + s.lateCount, 0);

    return { totalMembers, avgWorkMinutes, totalLateCount };
  }, [data?.stats]);

  const getBuLabel = (buCode: string | null) => {
    const bu = BU_OPTIONS.find((b) => b.value === buCode);
    return bu?.label || buCode || '-';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
          <button
            onClick={goToThisMonth}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
          >
            이번 달
          </button>
        </div>

        <select
          value={selectedBu}
          onChange={(e) => setSelectedBu(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          {BU_OPTIONS.map((bu) => (
            <option key={bu.value} value={bu.value}>
              {bu.label}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">총 인원</span>
          </div>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{summary.totalMembers}명</p>
        </div>
        <div className="rounded-xl bg-green-50 dark:bg-green-900/30 p-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">평균 근무시간</span>
          </div>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatWorkTime(summary.avgWorkMinutes)}</p>
        </div>
        <div className="rounded-xl bg-orange-50 dark:bg-orange-900/30 p-4">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs font-medium">총 지각</span>
          </div>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{summary.totalLateCount}회</p>
        </div>
      </div>

      {/* Team Member Stats Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">이름</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">소속</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">직책</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">근무일</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">총 근무시간</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">일평균</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">지각/조퇴</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    로딩 중...
                  </td>
                </tr>
              ) : data?.stats && data.stats.length > 0 ? (
                data.stats.map((member) => (
                  <tr
                    key={member.user_id}
                    onClick={() => onSelectUser(member.user_id)}
                    className={cn(
                      'border-b border-slate-100 dark:border-slate-700 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50',
                      selectedUserId === member.user_id && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className={cn(
                        'font-medium',
                        selectedUserId === member.user_id 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-slate-900 dark:text-slate-100'
                      )}>
                        {member.user_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {getBuLabel(member.bu_code)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {member.position || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300">
                      {member.totalWorkDays}일
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatWorkTime(member.totalWorkMinutes)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-400">
                      {formatWorkTime(member.averageWorkMinutes)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span className={cn(
                        member.lateCount > 0 || member.earlyLeaveCount > 0 
                          ? 'text-orange-600 dark:text-orange-400' 
                          : 'text-slate-500 dark:text-slate-500'
                      )}>
                        {member.lateCount} / {member.earlyLeaveCount}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    데이터가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        * 특정 직원을 클릭하면 해당 직원의 상세 근무 기록을 볼 수 있습니다
      </p>
    </div>
  );
}
