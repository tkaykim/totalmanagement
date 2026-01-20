'use client';

import { CalendarDays, Clock, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeaveBalanceSummary } from '../types';

interface LeaveBalanceCardProps {
  summary: LeaveBalanceSummary;
  isLoading?: boolean;
}

export function LeaveBalanceCard({ summary, isLoading }: LeaveBalanceCardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const leaveTypes = [
    {
      key: 'annual' as const,
      label: '연차',
      icon: CalendarDays,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      key: 'compensatory' as const,
      label: '대체휴무',
      icon: Clock,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
    },
    {
      key: 'special' as const,
      label: '특별휴가',
      icon: Gift,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {leaveTypes.map(({ key, label, icon: Icon, color, bgColor }) => {
        const data = summary[key];
        return (
          <Card key={key} className={`${bgColor} border-0`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <Icon className={`h-4 w-4 ${color}`} />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
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
  );
}
