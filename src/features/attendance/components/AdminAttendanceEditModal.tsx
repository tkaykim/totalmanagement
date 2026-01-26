'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';
import { X, Clock, Save, AlertCircle, CheckCircle, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatWorkTime } from '../lib/workTimeCalculator';
import { formatTimeKST } from '@/lib/timezone';

interface UserAttendance {
  user_id: string;
  name: string;
  email: string;
  role: string;
  bu_code: string | null;
  position: string | null;
  display_status: string;
  realtime_status: string | null;
  first_check_in: string | null;
  last_check_out: string | null;
  is_overtime: boolean;
  logs_count: number;
}

interface AttendanceLog {
  id: string;
  user_id: string;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  is_overtime: boolean;
  is_modified: boolean;
  modification_reason: string | null;
  status: string;
}

interface AdminAttendanceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAttendance | null;
  selectedDate: string;
}

async function fetchUserLogs(userId: string, date: string): Promise<AttendanceLog[]> {
  const params = new URLSearchParams({
    user_id: userId,
    start_date: date,
    end_date: date,
  });
  const res = await fetch(`/api/attendance/logs?${params}`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

async function updateAttendanceLog(
  logId: string,
  data: { check_in_time?: string | null; check_out_time?: string | null; modification_reason?: string }
) {
  const res = await fetch(`/api/attendance/logs/${logId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update');
  }
  return res.json();
}

async function deleteAttendanceLog(logId: string) {
  const res = await fetch(`/api/attendance/logs/${logId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete');
  }
  return res.json();
}

async function createAttendanceLog(data: {
  user_id: string;
  work_date: string;
  check_in_time?: string;
  check_out_time?: string;
}) {
  const res = await fetch('/api/attendance/admin/create-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create');
  }
  return res.json();
}

export function AdminAttendanceEditModal({
  isOpen,
  onClose,
  user,
  selectedDate,
}: AdminAttendanceEditModalProps) {
  const queryClient = useQueryClient();
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ checkInTime: '', checkOutTime: '' });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLogData, setNewLogData] = useState({ checkInTime: '', checkOutTime: '' });

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-user-logs', user?.user_id, selectedDate],
    queryFn: () => fetchUserLogs(user!.user_id, selectedDate),
    enabled: isOpen && !!user,
  });

  const updateMutation = useMutation({
    mutationFn: ({ logId, data }: { logId: string; data: any }) => updateAttendanceLog(logId, data),
    onSuccess: () => {
      setSubmitStatus('success');
      queryClient.invalidateQueries({ queryKey: ['admin-user-logs'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-admin-overview'] });
      setTimeout(() => {
        setEditingLogId(null);
        setSubmitStatus('idle');
      }, 1500);
    },
    onError: (error: any) => {
      setSubmitStatus('error');
      setErrorMessage(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAttendanceLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-logs'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-admin-overview'] });
      refetch();
    },
    onError: (error: any) => {
      alert(`삭제 실패: ${error.message}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: createAttendanceLog,
    onSuccess: () => {
      setSubmitStatus('success');
      queryClient.invalidateQueries({ queryKey: ['admin-user-logs'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-admin-overview'] });
      setTimeout(() => {
        setShowAddForm(false);
        setNewLogData({ checkInTime: '', checkOutTime: '' });
        setSubmitStatus('idle');
        refetch();
      }, 1500);
    },
    onError: (error: any) => {
      setSubmitStatus('error');
      setErrorMessage(error.message);
    },
  });

  useEffect(() => {
    if (!isOpen) {
      setEditingLogId(null);
      setSubmitStatus('idle');
      setErrorMessage('');
      setShowAddForm(false);
      setNewLogData({ checkInTime: '', checkOutTime: '' });
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const formatTime = (isoString: string | null | undefined) => {
    return formatTimeKST(isoString);
  };

  const calculateTotalWorkMinutes = () => {
    let total = 0;
    logs.forEach((log) => {
      if (log.check_in_at && log.check_out_at) {
        const minutes = differenceInMinutes(parseISO(log.check_out_at), parseISO(log.check_in_at));
        total += Math.max(0, minutes);
      }
    });
    return total;
  };

  const handleEdit = (log: AttendanceLog) => {
    setEditingLogId(log.id);
    setFormData({
      checkInTime: log.check_in_at ? format(parseISO(log.check_in_at), 'HH:mm') : '',
      checkOutTime: log.check_out_at ? format(parseISO(log.check_out_at), 'HH:mm') : '',
    });
    setSubmitStatus('idle');
    setErrorMessage('');
  };

  const handleSave = () => {
    if (!editingLogId) return;

    updateMutation.mutate({
      logId: editingLogId,
      data: {
        check_in_time: formData.checkInTime || null,
        check_out_time: formData.checkOutTime || null,
      },
    });
  };

  const handleDelete = (logId: string) => {
    if (confirm('정말로 이 출퇴근 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      deleteMutation.mutate(logId);
    }
  };

  const handleAddLog = () => {
    if (!newLogData.checkInTime && !newLogData.checkOutTime) {
      setSubmitStatus('error');
      setErrorMessage('출근 또는 퇴근 시각을 입력해주세요.');
      return;
    }

    createMutation.mutate({
      user_id: user!.user_id,
      work_date: selectedDate,
      check_in_time: newLogData.checkInTime || undefined,
      check_out_time: newLogData.checkOutTime || undefined,
    });
  };

  const formattedDate = format(parseISO(selectedDate), 'yyyy년 M월 d일 (EEEE)', { locale: ko });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              출퇴근 기록 관리
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {user.name} · {formattedDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400">
              로딩 중...
            </div>
          ) : logs.length === 0 && !showAddForm ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="mb-4">해당 날짜의 근무 기록이 없습니다.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                새 기록 추가
              </button>
            </div>
          ) : logs.length === 0 && showAddForm ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                새 출퇴근 기록 추가
              </h3>
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400">
                      출근 시각
                    </label>
                    <input
                      type="time"
                      value={newLogData.checkInTime}
                      onChange={(e) =>
                        setNewLogData((prev) => ({ ...prev, checkInTime: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400">
                      퇴근 시각
                    </label>
                    <input
                      type="time"
                      value={newLogData.checkOutTime}
                      onChange={(e) =>
                        setNewLogData((prev) => ({ ...prev, checkOutTime: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {submitStatus === 'success' && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs mb-3">
                    <CheckCircle className="h-4 w-4" />
                    <span>기록이 추가되었습니다.</span>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errorMessage || '추가 중 오류가 발생했습니다.'}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewLogData({ checkInTime: '', checkOutTime: '' });
                      setSubmitStatus('idle');
                    }}
                    className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddLog}
                    disabled={createMutation.isPending}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    {createMutation.isPending ? '추가 중...' : '추가'}
                  </button>
                </div>
              </div>
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
                    {formatTime(user.first_check_in)}
                  </p>
                </div>
                <div className="rounded-xl bg-red-50 dark:bg-red-900/30 p-4">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">퇴근</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {formatTime(user.last_check_out)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-4 text-center">
                <p className="text-xs text-blue-500 dark:text-blue-400 mb-1">총 근무 시간</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-300">
                  {formatWorkTime(calculateTotalWorkMinutes())}
                </p>
              </div>

              {/* Logs List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    상세 기록 ({logs.length}건)
                  </h3>
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      새 기록 추가
                    </button>
                  )}
                </div>

                {/* Add Form */}
                {showAddForm && (
                  <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 mb-2">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 dark:text-slate-400">
                          출근 시각
                        </label>
                        <input
                          type="time"
                          value={newLogData.checkInTime}
                          onChange={(e) =>
                            setNewLogData((prev) => ({ ...prev, checkInTime: e.target.value }))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 dark:text-slate-400">
                          퇴근 시각
                        </label>
                        <input
                          type="time"
                          value={newLogData.checkOutTime}
                          onChange={(e) =>
                            setNewLogData((prev) => ({ ...prev, checkOutTime: e.target.value }))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>

                    {submitStatus === 'success' && editingLogId === null && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs mb-3">
                        <CheckCircle className="h-4 w-4" />
                        <span>기록이 추가되었습니다.</span>
                      </div>
                    )}

                    {submitStatus === 'error' && editingLogId === null && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs mb-3">
                        <AlertCircle className="h-4 w-4" />
                        <span>{errorMessage || '추가 중 오류가 발생했습니다.'}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setNewLogData({ checkInTime: '', checkOutTime: '' });
                          setSubmitStatus('idle');
                        }}
                        className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleAddLog}
                        disabled={createMutation.isPending}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        {createMutation.isPending ? '추가 중...' : '추가'}
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {logs.map((log, index) => {
                    const isEditing = editingLogId === log.id;

                    return (
                      <div
                        key={log.id}
                        className={cn(
                          'p-4 rounded-xl border transition',
                          isEditing
                            ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                            : log.is_overtime
                            ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              #{index + 1}
                            </span>
                            {log.is_overtime && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300 font-semibold">
                                연장
                              </span>
                            )}
                            {log.is_modified && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 font-semibold">
                                수정됨
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {!isEditing && (
                              <>
                                <button
                                  onClick={() => handleEdit(log)}
                                  className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => handleDelete(log.id)}
                                  disabled={deleteMutation.isPending}
                                  className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs text-slate-500 dark:text-slate-400">
                                  출근 시각
                                </label>
                                <input
                                  type="time"
                                  value={formData.checkInTime}
                                  onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, checkInTime: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-slate-500 dark:text-slate-400">
                                  퇴근 시각
                                </label>
                                <input
                                  type="time"
                                  value={formData.checkOutTime}
                                  onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, checkOutTime: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              </div>
                            </div>

                            {submitStatus === 'success' && (
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs">
                                <CheckCircle className="h-4 w-4" />
                                <span>저장되었습니다.</span>
                              </div>
                            )}

                            {submitStatus === 'error' && (
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs">
                                <AlertCircle className="h-4 w-4" />
                                <span>{errorMessage || '저장 중 오류가 발생했습니다.'}</span>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingLogId(null);
                                  setSubmitStatus('idle');
                                }}
                                className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                              >
                                취소
                              </button>
                              <button
                                onClick={handleSave}
                                disabled={updateMutation.isPending}
                                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
                              >
                                <Save className="h-4 w-4" />
                                {updateMutation.isPending ? '저장 중...' : '저장'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 dark:text-slate-400">출근:</span>
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {formatTime(log.check_in_at)}
                              </span>
                            </div>
                            <span className="text-slate-300 dark:text-slate-600">→</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 dark:text-slate-400">퇴근:</span>
                              <span className="font-semibold text-red-600 dark:text-red-400">
                                {formatTime(log.check_out_at)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
