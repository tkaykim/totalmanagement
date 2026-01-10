'use client';

import { useMemo } from 'react';
import { 
  Clock, 
  CheckSquare, 
  Zap,
  LogIn,
  LogOut
} from 'lucide-react';
import type { ActivityLog } from '../types';
import { cn } from '@/lib/utils';

interface DailySummaryProps {
  activities: ActivityLog[];
  isLoading?: boolean;
}

export function DailySummary({ activities, isLoading }: DailySummaryProps) {
  const summary = useMemo(() => {
    const checkIn = activities.find(a => a.action_type === 'check_in');
    const checkOut = activities.find(a => a.action_type === 'check_out');
    const taskCreated = activities.filter(a => a.action_type === 'task_created').length;
    const taskCompleted = activities.filter(a => a.action_type === 'task_completed').length;

    return {
      checkInTime: checkIn 
        ? new Date(checkIn.occurred_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        : null,
      checkOutTime: checkOut
        ? new Date(checkOut.occurred_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        : null,
      taskCreated,
      taskCompleted,
      totalActivities: activities.length,
    };
  }, [activities]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="rounded-lg border bg-card p-4 animate-pulse"
          >
            <div className="h-4 w-4 bg-muted rounded mb-3" />
            <div className="h-3 bg-muted rounded w-1/2 mb-2" />
            <div className="h-5 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SummaryCard
        icon={<LogIn className="h-4 w-4" />}
        label="출근"
        value={summary.checkInTime || '-'}
        subValue={summary.checkInTime ? undefined : '미출근'}
      />
      
      <SummaryCard
        icon={<LogOut className="h-4 w-4" />}
        label="퇴근"
        value={summary.checkOutTime || '-'}
        subValue={summary.checkInTime && !summary.checkOutTime ? '근무중' : undefined}
        isWorking={summary.checkInTime !== null && summary.checkOutTime === null}
      />
      
      <SummaryCard
        icon={<CheckSquare className="h-4 w-4" />}
        label="할일"
        value={`${summary.taskCompleted}`}
        subValue={`완료 / ${summary.taskCreated} 생성`}
      />
      
      <SummaryCard
        icon={<Zap className="h-4 w-4" />}
        label="총 활동"
        value={`${summary.totalActivities}`}
        subValue="건"
      />
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  isWorking?: boolean;
}

function SummaryCard({ icon, label, value, subValue, isWorking }: SummaryCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-semibold text-foreground">
          {value}
        </span>
        {subValue && (
          <span className={cn(
            'text-xs',
            isWorking ? 'text-green-600 font-medium' : 'text-muted-foreground'
          )}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}
