'use client';

import { CalendarDays, Clock, Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { LeaveBalanceSummary } from '../types';

interface LeaveBalanceCardProps {
  summary: LeaveBalanceSummary;
  isLoading?: boolean;
}

export function LeaveBalanceCard({ summary, isLoading }: LeaveBalanceCardProps) {
  if (isLoading) {
    return (
      <>
        {/* 모바일: 가로 스크롤 */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:hidden scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-[140px] p-3 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2" />
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-12" />
            </div>
          ))}
        </div>
        {/* 데스크톱: 그리드 */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-2" />
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  const leaveTypes = [
    {
      key: 'annual' as const,
      label: '연차',
      icon: CalendarDays,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      ringColor: 'ring-blue-200 dark:ring-blue-800',
    },
    {
      key: 'compensatory' as const,
      label: '대체휴무',
      icon: Clock,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
      ringColor: 'ring-emerald-200 dark:ring-emerald-800',
    },
    {
      key: 'special' as const,
      label: '특별휴가',
      icon: Gift,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/30',
      ringColor: 'ring-purple-200 dark:ring-purple-800',
    },
  ];

  return (
    <>
      {/* 모바일: 컴팩트 가로 스크롤 카드 */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:hidden scrollbar-hide">
        {leaveTypes.map(({ key, label, icon: Icon, color, bgColor }) => {
          const data = summary[key];
          const usagePercent = data.total > 0 ? (data.used / data.total) * 100 : 0;
          return (
            <div
              key={key}
              className={`flex-shrink-0 min-w-[130px] p-3 rounded-xl ${bgColor} relative overflow-hidden`}
            >
              {/* 프로그레스 바 (배경) */}
              <div
                className={`absolute bottom-0 left-0 h-1 ${color.replace('text-', 'bg-')} transition-all duration-300`}
                style={{ width: `${usagePercent}%` }}
              />
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className={`text-2xl font-bold ${color}`}>{data.remaining}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">일</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {data.total}일 중 {data.used}일 사용
              </p>
            </div>
          );
        })}
      </div>

      {/* 데스크톱: 기존 그리드 레이아웃 */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        {leaveTypes.map(({ key, label, icon: Icon, color, bgColor }) => {
          const data = summary[key];
          return (
            <Card key={key} className={`${bgColor} border-0`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  {label}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-bold ${color}`}>
                    {data.remaining}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">일</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  총 {data.total}일 중 {data.used}일 사용
                </p>
                <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-300`}
                    style={{ width: `${data.total > 0 ? (data.used / data.total) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
