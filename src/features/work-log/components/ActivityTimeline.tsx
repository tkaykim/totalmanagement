'use client';

import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  FolderPlus, 
  FileEdit, 
  RefreshCw, 
  ListPlus, 
  UserPlus, 
  ArrowRightLeft, 
  CheckCircle2,
  Coins,
  LogIn,
  LogOut,
  Circle,
  Clock,
  Pencil
} from 'lucide-react';
import type { ActivityLog, ActivityActionType } from '../types';
import { ACTION_TYPE_LABELS } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ActivityTimelineProps {
  activities: ActivityLog[];
  isLoading?: boolean;
}

export function ActivityTimeline({ activities, isLoading }: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
            <div className="h-5 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Circle className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-sm font-medium text-muted-foreground">
          아직 기록된 활동이 없습니다
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          프로젝트, 할일, 출퇴근 활동이 자동으로 기록됩니다
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 타임라인 연결선 */}
      <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />
      
      <div className="space-y-1 relative">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}

const ACTION_ICONS: Record<ActivityActionType, React.ReactNode> = {
  project_created: <FolderPlus className="h-3.5 w-3.5" />,
  project_updated: <FileEdit className="h-3.5 w-3.5" />,
  project_status_changed: <RefreshCw className="h-3.5 w-3.5" />,
  task_created: <ListPlus className="h-3.5 w-3.5" />,
  task_assigned: <UserPlus className="h-3.5 w-3.5" />,
  task_status_changed: <ArrowRightLeft className="h-3.5 w-3.5" />,
  task_completed: <CheckCircle2 className="h-3.5 w-3.5" />,
  financial_created: <Coins className="h-3.5 w-3.5" />,
  financial_updated: <Coins className="h-3.5 w-3.5" />,
  check_in: <LogIn className="h-3.5 w-3.5" />,
  check_out: <LogOut className="h-3.5 w-3.5" />,
  auto_check_out: <Clock className="h-3.5 w-3.5" />,
  attendance_corrected: <Pencil className="h-3.5 w-3.5" />,
};

function ActivityItem({ activity }: { activity: ActivityLog }) {
  const icon = ACTION_ICONS[activity.action_type] || <Circle className="h-3.5 w-3.5" />;
  const label = ACTION_TYPE_LABELS[activity.action_type] || activity.action_type;
  const time = format(parseISO(activity.occurred_at), 'HH:mm', { locale: ko });

  const getIconStyle = () => {
    switch (activity.action_type) {
      case 'check_in':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'check_out':
        return 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
      case 'auto_check_out':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      case 'attendance_corrected':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      case 'task_completed':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'project_created':
      case 'task_created':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'financial_created':
      case 'financial_updated':
        return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getDetailText = () => {
    const metadata = activity.metadata || {};
    
    switch (activity.action_type) {
      case 'project_status_changed':
      case 'task_status_changed':
        return (
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
              {String(metadata.old_status)}
            </Badge>
            <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              {String(metadata.new_status)}
            </Badge>
          </div>
        );
      case 'financial_created':
        const kind = metadata.kind === 'revenue' ? '매출' : '지출';
        const amount = typeof metadata.amount === 'number' 
          ? `₩${metadata.amount.toLocaleString()}`
          : '';
        return (
          <Badge 
            variant="outline" 
            className={cn(
              'mt-1 text-[10px]',
              metadata.kind === 'revenue' 
                ? 'text-blue-600 border-blue-200'
                : 'text-rose-600 border-rose-200'
            )}
          >
            {kind} {amount}
          </Badge>
        );
      default:
        return null;
    }
  };

  const detailElement = getDetailText();

  return (
    <div className="flex items-start gap-3 py-2 px-1 rounded-lg hover:bg-muted/50 transition-colors">
      {/* 아이콘 */}
      <div className={cn(
        'relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
        getIconStyle()
      )}>
        {icon}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            {label}
          </span>
        </div>
        {activity.entity_title && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {activity.entity_title}
          </p>
        )}
        {detailElement}
      </div>

      {/* 시간 */}
      <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
        {time}
      </span>
    </div>
  );
}
