'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApprovalQueue, approveWorkRequest, rejectWorkRequest } from '../api';
import { CheckCircle2, XCircle, Clock, MapPin, Home, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApprovalQueueItem } from '../types';

const requestTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  external_work: { label: '외근', icon: <MapPin size={16} /> },
  remote_work: { label: '재택', icon: <Home size={16} /> },
  overtime: { label: '연장/야근', icon: <Moon size={16} /> },
  attendance_correction: { label: '정정', icon: <Clock size={16} /> },
};

export function ApprovalQueue() {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const queryClient = useQueryClient();

  const { data: queue, isLoading } = useQuery<ApprovalQueueItem[]>({
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
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-500 dark:text-slate-400">로딩 중...</div>
      </div>
    );
  }

  if (!queue || queue.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">대기 중인 결재 요청이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
        결재 대기 ({queue.length}건)
      </h3>
      <div className="space-y-3">
        {queue.map((item) => {
          const typeConfig = requestTypeLabels[item.request_type] || { label: item.request_type, icon: null };
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      {typeConfig.icon}
                      {typeConfig.label}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.requester_name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <div>
                      {item.start_date === item.end_date
                        ? item.start_date
                        : `${item.start_date} ~ ${item.end_date}`}
                    </div>
                    {item.start_time && item.end_time && (
                      <div>
                        {item.start_time} ~ {item.end_time}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={approveMutation.isPending}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition',
                      'bg-green-600 text-white hover:bg-green-500',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <CheckCircle2 size={16} />
                    승인
                  </button>
                  <button
                    onClick={() => setRejectingId(item.id)}
                    disabled={rejectMutation.isPending}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition',
                      'bg-red-600 text-white hover:bg-red-500',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <XCircle size={16} />
                    반려
                  </button>
                </div>
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                {item.reason}
              </div>

              {rejectingId === item.id && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    반려 사유 *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="반려 사유를 입력해주세요"
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setRejectingId(null);
                        setRejectionReason('');
                      }}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => handleReject(item.id)}
                      disabled={rejectMutation.isPending}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      반려하기
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

