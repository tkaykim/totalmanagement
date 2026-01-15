'use client';

import { useMemo } from 'react';
import { 
  Clock, 
  CheckSquare, 
  Zap,
  LogIn,
  LogOut,
  Moon
} from 'lucide-react';
import type { ActivityLog } from '../types';
import { cn } from '@/lib/utils';

interface AttendanceLog {
  id: string;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  is_overtime?: boolean;
}

interface DailySummaryProps {
  activities: ActivityLog[];
  attendanceLogs?: AttendanceLog[];
  isLoading?: boolean;
}

export function DailySummary({ activities, attendanceLogs = [], isLoading }: DailySummaryProps) {
  const summary = useMemo(() => {
    // 출퇴근 정보는 attendance_logs 기반으로 (work_date 기준)
    // 가장 최근 기록 사용 (연장근무 등 여러 기록이 있을 수 있음)
    const latestAttendance = attendanceLogs.length > 0 
      ? attendanceLogs.reduce((latest, log) => {
          if (!latest) return log;
          const latestTime = latest.check_in_at ? new Date(latest.check_in_at).getTime() : 0;
          const logTime = log.check_in_at ? new Date(log.check_in_at).getTime() : 0;
          return logTime > latestTime ? log : latest;
        }, attendanceLogs[0])
      : null;

    // 야간근무 여부 확인 (퇴근 시간이 다음 날인 경우)
    const isOvernightWork = latestAttendance?.check_in_at && latestAttendance?.check_out_at
      ? new Date(latestAttendance.check_in_at).toDateString() !== new Date(latestAttendance.check_out_at).toDateString()
      : false;

    const taskCreated = activities.filter(a => a.action_type === 'task_created').length;
    const taskCompleted = activities.filter(a => a.action_type === 'task_completed').length;

    return {
      checkInTime: latestAttendance?.check_in_at 
        ? new Date(latestAttendance.check_in_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        : null,
      checkOutTime: latestAttendance?.check_out_at
        ? new Date(latestAttendance.check_out_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        : null,
      isOvernightWork,
      isOvertime: latestAttendance?.is_overtime || false,
      hasActiveWork: latestAttendance?.check_in_at && !latestAttendance?.check_out_at,
      taskCreated,
      taskCompleted,
      totalActivities: activities.length,
    };
  }, [activities, attendanceLogs]);

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

  // 출근 라벨 결정
  const checkInLabel = summary.isOvertime ? '연장출근' : '출근';
  
  // 퇴근 subValue 결정
  const getCheckOutSubValue = () => {
    if (summary.hasActiveWork) return '근무중';
    if (summary.isOvernightWork) return '(야간)';
    return undefined;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SummaryCard
        icon={<LogIn className="h-4 w-4" />}
        label={checkInLabel}
        value={summary.checkInTime || '-'}
        subValue={summary.checkInTime ? undefined : '미출근'}
      />
      
      <SummaryCard
        icon={summary.isOvernightWork ? <Moon className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
        label="퇴근"
        value={summary.checkOutTime || '-'}
        subValue={getCheckOutSubValue()}
        isWorking={summary.hasActiveWork || false}
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
