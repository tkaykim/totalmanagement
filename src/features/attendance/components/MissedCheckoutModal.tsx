'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertTriangle, Clock, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { correctCheckoutTime, confirmAutoCheckout } from '../api';
import type { PendingAutoCheckoutRecord } from '../types';

interface MissedCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingCheckouts: PendingAutoCheckoutRecord[];
}

export function MissedCheckoutModal({
  isOpen,
  onClose,
  pendingCheckouts,
}: MissedCheckoutModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [checkOutTime, setCheckOutTime] = useState('');
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const currentRecord = pendingCheckouts[currentIndex];
  const remainingRecords = pendingCheckouts.filter((r) => !processedIds.has(r.id));

  useEffect(() => {
    if (currentRecord) {
      // 기본값으로 자동 퇴근 시간 설정
      const autoCheckoutTime = parseISO(currentRecord.check_out_at);
      setCheckOutTime(format(autoCheckoutTime, 'HH:mm'));
    }
  }, [currentRecord]);

  useEffect(() => {
    // 모달이 열리면 첫 번째 미처리 기록으로 이동
    if (isOpen && pendingCheckouts.length > 0) {
      const firstUnprocessedIndex = pendingCheckouts.findIndex(
        (r) => !processedIds.has(r.id)
      );
      if (firstUnprocessedIndex !== -1) {
        setCurrentIndex(firstUnprocessedIndex);
      }
    }
  }, [isOpen, pendingCheckouts, processedIds]);

  const correctMutation = useMutation({
    mutationFn: ({ logId, time }: { logId: string; time: string }) =>
      correctCheckoutTime(logId, time),
    onSuccess: (_, variables) => {
      setProcessedIds((prev) => new Set(prev).add(variables.logId));
      queryClient.invalidateQueries({ queryKey: ['attendance-status'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-logs'] });
      moveToNextOrClose();
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (logId: string) => confirmAutoCheckout(logId),
    onSuccess: (_, logId) => {
      setProcessedIds((prev) => new Set(prev).add(logId));
      queryClient.invalidateQueries({ queryKey: ['attendance-status'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-logs'] });
      moveToNextOrClose();
    },
  });

  const moveToNextOrClose = () => {
    const nextIndex = pendingCheckouts.findIndex(
      (r, i) => i > currentIndex && !processedIds.has(r.id)
    );
    if (nextIndex !== -1) {
      setCurrentIndex(nextIndex);
    } else {
      // 모든 기록 처리 완료
      onClose();
    }
  };

  const handleSubmit = () => {
    if (!currentRecord || !checkOutTime) return;
    correctMutation.mutate({ logId: currentRecord.id, time: checkOutTime });
  };

  const handleSkip = () => {
    if (!currentRecord) return;
    confirmMutation.mutate(currentRecord.id);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < pendingCheckouts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (!isOpen || !currentRecord || remainingRecords.length === 0) {
    return null;
  }

  const checkInTime = parseISO(currentRecord.check_in_at);
  const autoCheckoutTime = parseISO(currentRecord.check_out_at);
  const workDate = currentRecord.work_date;

  const isLoading = correctMutation.isPending || confirmMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-orange-500 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={24} />
              <h2 className="text-lg font-bold">퇴근 기록 누락</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-orange-100 mt-1">
            {remainingRecords.length}건의 미확인 퇴근 기록이 있습니다
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Navigation */}
          {pendingCheckouts.length > 1 && (
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  currentIndex === 0
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                )}
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {currentIndex + 1} / {pendingCheckouts.length}
              </span>
              <button
                onClick={handleNext}
                disabled={currentIndex === pendingCheckouts.length - 1}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  currentIndex === pendingCheckouts.length - 1
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                )}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Record Info */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-4">
            <div className="text-center mb-3">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {format(parseISO(workDate), 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-400">출근 시간</span>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {format(checkInTime, 'HH:mm')}
                </div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">자동 퇴근 처리</span>
                <div className="font-semibold text-orange-600 dark:text-orange-400">
                  {format(autoCheckoutTime, 'HH:mm')}
                </div>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          {processedIds.has(currentRecord.id) && (
            <div className="flex items-center justify-center gap-2 mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
              <Check size={16} />
              <span className="text-sm font-medium">처리 완료</span>
            </div>
          )}

          {/* Input */}
          {!processedIds.has(currentRecord.id) && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  실제 퇴근 시간을 입력해주세요
                </label>
                <div className="relative">
                  <Clock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className={cn(
                      'w-full pl-10 pr-4 py-3 rounded-lg border text-lg font-mono',
                      'border-slate-200 dark:border-slate-600',
                      'bg-white dark:bg-slate-700',
                      'text-slate-900 dark:text-slate-100',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500'
                    )}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  자동 퇴근 처리된 시간: {format(autoCheckoutTime, 'HH:mm')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  disabled={isLoading}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-xl font-semibold transition-all',
                    'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
                    'hover:bg-slate-200 dark:hover:bg-slate-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {confirmMutation.isPending ? '처리 중...' : '그대로 확인'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !checkOutTime}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-xl font-semibold transition-all',
                    'bg-blue-600 text-white',
                    'hover:bg-blue-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {correctMutation.isPending ? '저장 중...' : '시간 수정'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
