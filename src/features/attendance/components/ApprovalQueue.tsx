'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApprovalQueue, approveWorkRequest, rejectWorkRequest } from '../api';
import { CheckCircle2, XCircle, Clock, MapPin, Home, Moon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApprovalQueueItem } from '../types';

const requestTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  external_work: { label: '외근', icon: <MapPin size={12} />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  remote_work: { label: '재택', icon: <Home size={12} />, color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  overtime: { label: '연장', icon: <Moon size={12} />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
  attendance_correction: { label: '정정', icon: <Clock size={12} />, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' },
};

export function ApprovalQueue() {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const queryClient = useQueryClient();

  const { data: queue, isLoading, error } = useQuery<ApprovalQueueItem[]>({
    queryKey: ['approval-queue'],
    queryFn: getApprovalQueue,
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: approveWorkRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      queryClient.invalidateQueries({ queryKey: ['work-requests'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-logs'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectWorkRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      queryClient.invalidateQueries({ queryKey: ['work-requests'] });
      setRejectingId(null);
      setRejectionReason('');
    },
  });

  const handleApprove = (id: string) => {
    if (confirm('이 신청을 승인하시겠습니까?')) {
      approveMutation.mutate(id);
    }
  };

  const handleReject = (id: string) => {
    if (!rejectionReason.trim()) {
      alert('반려 사유를 입력해주세요.');
      return;
    }
    if (confirm('이 신청을 반려하시겠습니까?')) {
      rejectMutation.mutate({ id, reason: rejectionReason });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center text-sm text-red-500">
        오류가 발생했습니다. 잠시 후 다시 시도해주세요.
      </div>
    );
  }

  if (!queue || queue.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        대기 중인 결재 요청이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {queue.map((item) => {
        const typeConfig = requestTypeLabels[item.request_type] || { 
          label: item.request_type, 
          icon: null, 
          color: 'bg-slate-100 text-slate-700' 
        };
        
        return (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              {/* Left: Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0',
                  typeConfig.color
                )}>
                  {typeConfig.icon}
                  {typeConfig.label}
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {item.requester_name}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  {item.start_date === item.end_date
                    ? item.start_date
                    : `${item.start_date} ~ ${item.end_date}`}
                </span>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleApprove(item.id)}
                  disabled={approveMutation.isPending}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition',
                    'bg-green-600 text-white hover:bg-green-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <CheckCircle2 size={12} />
                  승인
                </button>
                <button
                  onClick={() => setRejectingId(rejectingId === item.id ? null : item.id)}
                  disabled={rejectMutation.isPending}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition',
                    rejectingId === item.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <XCircle size={12} />
                  반려
                </button>
              </div>
            </div>

            {/* 사유 표시 */}
            {item.reason && (
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg px-2.5 py-1.5 line-clamp-2">
                {item.reason}
              </p>
            )}

            {/* 반려 사유 입력 */}
            {rejectingId === item.id && (
              <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                    반려 사유 입력
                  </span>
                  <button
                    onClick={() => {
                      setRejectingId(null);
                      setRejectionReason('');
                    }}
                    className="p-0.5 hover:bg-red-100 dark:hover:bg-red-800 rounded"
                  >
                    <X size={12} className="text-red-600" />
                  </button>
                </div>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="반려 사유를 입력해주세요"
                  rows={2}
                  className="w-full rounded-lg border border-red-200 dark:border-red-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300 mb-2"
                />
                <button
                  onClick={() => handleReject(item.id)}
                  disabled={rejectMutation.isPending || !rejectionReason.trim()}
                  className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  반려 처리
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
