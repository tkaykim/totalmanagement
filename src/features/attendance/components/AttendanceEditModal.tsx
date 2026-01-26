'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAttendanceLogs, createCorrectionRequest } from '../api';
import { formatWorkTime } from '../lib/workTimeCalculator';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';
import { X, Clock, Coffee, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttendanceLog } from '@/types/database';
import { formatTimeKST, formatKST } from '@/lib/timezone';

const EMPTY_LOGS: AttendanceLog[] = [];

interface AttendanceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
}

export function AttendanceEditModal({ isOpen, onClose, selectedDate }: AttendanceEditModalProps) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    checkInTime: '',
    checkOutTime: '',
    reason: '',
  });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { data: logs = EMPTY_LOGS, isLoading } = useQuery({
    queryKey: ['attendance-logs', selectedDate, selectedDate],
    queryFn: () => getAttendanceLogs({ start_date: selectedDate, end_date: selectedDate }),
    enabled: isOpen && !!selectedDate,
  });

  const correctionMutation = useMutation({
    mutationFn: createCorrectionRequest,
    onSuccess: () => {
      setSubmitStatus('success');
      queryClient.invalidateQueries({ queryKey: ['attendance-logs'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      setTimeout(() => {
        setEditMode(false);
        setSubmitStatus('idle');
      }, 2000);
    },
    onError: () => {
      setSubmitStatus('error');
    },
  });

  const latestLogId = logs[0]?.id;
  const latestCheckIn = logs[0]?.check_in_at;
  const latestCheckOut = logs[0]?.check_out_at;

  useEffect(() => {
    if (logs.length > 0) {
      const latestLog = logs[0];
      setFormData({
        checkInTime: latestLog.check_in_at ? format(parseISO(latestLog.check_in_at), 'HH:mm') : '',
        checkOutTime: latestLog.check_out_at ? format(parseISO(latestLog.check_out_at), 'HH:mm') : '',
        reason: '',
      });
    } else {
      setFormData({
        checkInTime: '',
        checkOutTime: '',
        reason: '',
      });
    }
  }, [latestLogId, latestCheckIn, latestCheckOut, logs.length]);

  if (!isOpen) return null;

  const formatTime = (isoString: string | null | undefined) => {
    return formatTimeKST(isoString);
  };

  const calculateWorkInfo = (logList: AttendanceLog[]) => {
    let totalWorkMinutes = 0;
    let totalBreakMinutes = 0;
    let firstCheckIn: string | null = null;
    let lastCheckOut: string | null = null;

    logList.forEach((log) => {
      if (log.check_in_at) {
        if (!firstCheckIn || log.check_in_at < firstCheckIn) {
          firstCheckIn = log.check_in_at;
        }
      }
      if (log.check_out_at) {
        if (!lastCheckOut || log.check_out_at > lastCheckOut) {
          lastCheckOut = log.check_out_at;
        }
      }

      if (log.check_in_at && log.check_out_at) {
        const checkIn = parseISO(log.check_in_at);
        const checkOut = parseISO(log.check_out_at);
        const minutes = differenceInMinutes(checkOut, checkIn);
        totalWorkMinutes += Math.max(0, minutes);
      }

      if (log.break_minutes) {
        totalBreakMinutes += log.break_minutes;
      }
    });

    const netWorkMinutes = Math.max(0, totalWorkMinutes - totalBreakMinutes);
    const hasOvertime = logList.some((log) => log.is_overtime);

    return {
      firstCheckIn,
      lastCheckOut,
      totalWorkMinutes,
      netWorkMinutes,
      totalBreakMinutes,
      hasOvertime,
    };
  };

  const workInfo = calculateWorkInfo(logs);

  const handleSubmitCorrection = () => {
    if (!formData.reason.trim()) {
      alert('정정 사유를 입력해주세요.');
      return;
    }

    correctionMutation.mutate({
      correction_type: 'time_change',
      work_date: selectedDate,
      check_in_time: formData.checkInTime || undefined,
      check_out_time: formData.checkOutTime || undefined,
      reason: formData.reason,
    });
  };

  const formattedDate = format(parseISO(selectedDate), 'yyyy년 M월 d일 (EEEE)', { locale: ko });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">근무 상세</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{formattedDate}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400">로딩 중...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-slate-400 dark:text-slate-500 mb-4">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>해당 날짜의 근무 기록이 없습니다.</p>
              </div>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  근무시간 추가 신청
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-green-50 dark:bg-green-900/30 p-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">출근</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {formatTime(workInfo.firstCheckIn)}
                  </p>
                </div>
                <div className="rounded-xl bg-red-50 dark:bg-red-900/30 p-4">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">퇴근</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {formatTime(workInfo.lastCheckOut)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 시간</p>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                    {formatWorkTime(workInfo.totalWorkMinutes)}
                  </p>
                </div>
                <div className="rounded-xl bg-orange-50 dark:bg-orange-900/30 p-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-orange-500 mb-1">
                    <Coffee className="h-3 w-3" />
                    <span>휴식</span>
                  </div>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {workInfo.totalBreakMinutes > 0 ? `${workInfo.totalBreakMinutes}분` : '-'}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-4 text-center">
                  <p className="text-xs text-blue-500 dark:text-blue-400 mb-1">순 근무</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-300">
                    {formatWorkTime(workInfo.netWorkMinutes)}
                  </p>
                </div>
              </div>

              {workInfo.hasOvertime && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">연장근무가 포함되어 있습니다.</span>
                </div>
              )}

              {/* Logs Detail */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">상세 기록</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div
                      key={log.id || index}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg',
                        log.is_overtime
                          ? 'bg-orange-50 dark:bg-orange-900/20'
                          : 'bg-slate-50 dark:bg-slate-700/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          #{index + 1}
                        </span>
                        {log.is_overtime && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300 font-semibold">
                            연장
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600 dark:text-green-400">{formatTime(log.check_in_at)}</span>
                        <span className="text-slate-400">~</span>
                        <span className="text-red-600 dark:text-red-400">{formatTime(log.check_out_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                >
                  정정 신청
                </button>
              )}
            </>
          )}

          {/* Edit Mode */}
          {editMode && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">근무시간 정정 신청</h3>
              
              {submitStatus === 'success' ? (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">정정 신청이 완료되었습니다.</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400">출근 시각</label>
                      <input
                        type="time"
                        value={formData.checkInTime}
                        onChange={(e) => setFormData((prev) => ({ ...prev, checkInTime: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400">퇴근 시각</label>
                      <input
                        type="time"
                        value={formData.checkOutTime}
                        onChange={(e) => setFormData((prev) => ({ ...prev, checkOutTime: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400">정정 사유 *</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                      placeholder="정정이 필요한 사유를 입력해주세요"
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {submitStatus === 'error' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>신청 중 오류가 발생했습니다. 다시 시도해주세요.</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setSubmitStatus('idle');
                      }}
                      className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSubmitCorrection}
                      disabled={correctionMutation.isPending}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {correctionMutation.isPending ? '신청 중...' : '정정 신청'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

