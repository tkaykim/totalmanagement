'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock, History, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCorrectionHistory, type CorrectionHistoryItem } from '../api';

function formatTime(t: string | null): string {
  if (!t) return '-';
  if (t.length <= 5) return t;
  return t.slice(0, 5);
}

export function CorrectionHistory() {
  const { data: history = [], isLoading, error } = useQuery({
    queryKey: ['correction-history'],
    queryFn: getCorrectionHistory,
    refetchInterval: 60000,
  });

  if (error) {
    return (
      <div className="py-3 text-center text-xs text-red-500">
        정정 이력 조회에 실패했습니다.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-3 text-center text-xs text-slate-500">
        정정 이력 로딩 중...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        승인/반려된 정정 이력이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[280px] overflow-y-auto">
      {history.map((item: CorrectionHistoryItem) => (
        <div
          key={item.id}
          className={cn(
            'rounded-lg border p-2.5 text-xs',
            item.status === 'approved'
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20'
              : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20'
          )}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {item.requester_name}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              {item.status === 'approved' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              )}
              <span
                className={cn(
                  'font-medium',
                  item.status === 'approved'
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-red-700 dark:text-red-300'
                )}
              >
                {item.status === 'approved' ? '승인' : '반려'}
              </span>
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Clock className="h-3 w-3 shrink-0" />
            <span>
              {item.start_date === item.end_date
                ? item.start_date
                : `${item.start_date} ~ ${item.end_date}`}
              {(item.start_time || item.end_time) && (
                <span className="ml-1 font-medium text-slate-700 dark:text-slate-300">
                  정정 요청: {formatTime(item.start_time)} ~ {formatTime(item.end_time)}
                </span>
              )}
            </span>
          </div>
          {item.reason && (
            <p className="mt-1 text-slate-500 dark:text-slate-400 line-clamp-2 pl-5">
              {item.reason}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
