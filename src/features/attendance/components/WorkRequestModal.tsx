'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ModalShell, InputField, SelectField, ModalActions } from '@/features/erp/components/modal-components';
import { createWorkRequest, createCorrectionRequest } from '../api';
import type { WorkRequestFormData, CorrectionRequestFormData } from '../types';
import { cn } from '@/lib/utils';
import { getTodayKST } from '@/lib/timezone';

interface WorkRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkRequestModal({ isOpen, onClose }: WorkRequestModalProps) {
  const todayKST = getTodayKST();
  const [activeTab, setActiveTab] = useState<'work' | 'correction'>('work');
  const [workForm, setWorkForm] = useState<WorkRequestFormData>({
    request_type: 'external_work',
    start_date: todayKST,
    end_date: todayKST,
    reason: '',
  });
  const [correctionForm, setCorrectionForm] = useState<CorrectionRequestFormData>({
    correction_type: 'missing_check_in',
    work_date: todayKST,
    reason: '',
  });

  const queryClient = useQueryClient();

  const workMutation = useMutation({
    mutationFn: createWorkRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-requests'] });
      onClose();
    },
  });

  const correctionMutation = useMutation({
    mutationFn: createCorrectionRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-requests'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-logs'] });
      onClose();
    },
  });

  const handleWorkSubmit = () => {
    if (!workForm.start_date || !workForm.end_date || !workForm.reason.trim()) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }
    workMutation.mutate(workForm);
  };

  const handleCorrectionSubmit = () => {
    if (!correctionForm.work_date || !correctionForm.reason.trim()) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    if (correctionForm.correction_type === 'time_change') {
      if (!correctionForm.check_in_time || !correctionForm.check_out_time) {
        alert('출근 시간과 퇴근 시간을 모두 입력해주세요.');
        return;
      }
    } else if (correctionForm.correction_type === 'missing_check_in') {
      if (!correctionForm.check_in_time) {
        alert('출근 시간을 입력해주세요.');
        return;
      }
    } else if (correctionForm.correction_type === 'missing_check_out') {
      if (!correctionForm.check_out_time) {
        alert('퇴근 시간을 입력해주세요.');
        return;
      }
    }

    correctionMutation.mutate(correctionForm);
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      title="근무 신청"
      onClose={onClose}
      footer={
        <ModalActions
          onPrimary={activeTab === 'work' ? handleWorkSubmit : handleCorrectionSubmit}
          onClose={onClose}
          primaryLabel={activeTab === 'work' ? '신청하기' : '정정 신청하기'}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('work')}
            className={cn(
              'px-4 py-2 text-sm font-semibold transition',
              activeTab === 'work'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            근무 신청
          </button>
          <button
            onClick={() => setActiveTab('correction')}
            className={cn(
              'px-4 py-2 text-sm font-semibold transition',
              activeTab === 'correction'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            정정 신청
          </button>
        </div>

        {activeTab === 'work' ? (
          <div className="space-y-4">
            <SelectField
              label="신청 유형"
              value={workForm.request_type}
              onChange={(v) => setWorkForm({ ...workForm, request_type: v as any })}
              options={[
                { value: 'external_work', label: '외근' },
                { value: 'remote_work', label: '재택' },
                { value: 'overtime', label: '연장/야근' },
              ]}
            />
            <InputField
              label="시작 날짜"
              type="date"
              value={workForm.start_date}
              onChange={(v) => setWorkForm({ ...workForm, start_date: v })}
            />
            <InputField
              label="종료 날짜"
              type="date"
              value={workForm.end_date}
              onChange={(v) => setWorkForm({ ...workForm, end_date: v })}
            />
            <InputField
              label="시작 시간 (선택)"
              type="time"
              value={workForm.start_time || ''}
              onChange={(v) => setWorkForm({ ...workForm, start_time: v || undefined })}
            />
            <InputField
              label="종료 시간 (선택)"
              type="time"
              value={workForm.end_time || ''}
              onChange={(v) => setWorkForm({ ...workForm, end_time: v || undefined })}
            />
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-xs text-slate-500 dark:text-slate-400">사유 *</span>
              <textarea
                value={workForm.reason}
                onChange={(e) => setWorkForm({ ...workForm, reason: e.target.value })}
                placeholder="신청 사유를 입력해주세요"
                rows={4}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <SelectField
              label="정정 유형"
              value={correctionForm.correction_type}
              onChange={(v) => setCorrectionForm({ ...correctionForm, correction_type: v as any })}
              options={[
                { value: 'missing_check_in', label: '출근 누락' },
                { value: 'missing_check_out', label: '퇴근 누락' },
                { value: 'time_change', label: '시간 변경' },
              ]}
            />
            <InputField
              label="근무 날짜"
              type="date"
              value={correctionForm.work_date}
              onChange={(v) => setCorrectionForm({ ...correctionForm, work_date: v })}
            />
            {(correctionForm.correction_type === 'missing_check_in' || correctionForm.correction_type === 'time_change') && (
              <InputField
                label="출근 시간 *"
                type="time"
                value={correctionForm.check_in_time || ''}
                onChange={(v) => setCorrectionForm({ ...correctionForm, check_in_time: v || undefined })}
              />
            )}
            {(correctionForm.correction_type === 'missing_check_out' || correctionForm.correction_type === 'time_change') && (
              <InputField
                label="퇴근 시간 *"
                type="time"
                value={correctionForm.check_out_time || ''}
                onChange={(v) => setCorrectionForm({ ...correctionForm, check_out_time: v || undefined })}
              />
            )}
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-xs text-slate-500 dark:text-slate-400">사유 *</span>
              <textarea
                value={correctionForm.reason}
                onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                placeholder="정정 사유를 입력해주세요"
                rows={4}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
              />
            </label>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

