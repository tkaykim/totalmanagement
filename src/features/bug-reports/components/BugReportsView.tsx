'use client';

import { useState } from 'react';
import { Bug, Plus, Clock, User, Check } from 'lucide-react';
import { useBugReports, useUpdateBugReport } from '../hooks';
import {
  BugReport,
  BugReportStatus,
  BUG_STATUS_LABELS,
  BUG_STATUS_COLORS,
} from '../types';
import { BugReportModal } from './BugReportModal';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BugReportsViewProps {
  isAdmin?: boolean;
}

export function BugReportsView({ isAdmin = false }: BugReportsViewProps) {
  const { data: bugReports = [], isLoading } = useBugReports();
  const [showReportModal, setShowReportModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BugReportStatus | 'all'>('all');

  const filteredReports = bugReports.filter((report) =>
    statusFilter === 'all' ? true : report.status === statusFilter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-red-600 mx-auto" />
          <p className="text-sm text-slate-500">버그 리포트 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Bug className="h-6 w-6 text-red-500" />
            버그 리포트
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isAdmin ? '접수된 버그 리포트를 확인하고 처리하세요' : '발견한 버그를 신고해주세요'}
          </p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition"
        >
          <Plus className="h-4 w-4" />
          버그 신고하기
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'resolved'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition',
              statusFilter === status
                ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-800'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            {status === 'all' ? '전체' : BUG_STATUS_LABELS[status]}
            <span className="ml-1.5 opacity-60">
              ({status === 'all' 
                ? bugReports.length 
                : bugReports.filter(r => r.status === status).length})
            </span>
          </button>
        ))}
      </div>

      {filteredReports.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
          <Bug className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-400">
            {statusFilter === 'all' ? '등록된 버그 리포트가 없습니다' : '해당 상태의 리포트가 없습니다'}
          </p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            버그를 발견하셨다면 신고해주세요!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <BugReportCard
              key={report.id}
              report={report}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {showReportModal && (
        <BugReportModal onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}

function BugReportCard({
  report,
  isAdmin,
}: {
  report: BugReport;
  isAdmin: boolean;
}) {
  const updateMutation = useUpdateBugReport();

  const handleToggleStatus = async () => {
    const newStatus: BugReportStatus = report.status === 'pending' ? 'resolved' : 'pending';
    await updateMutation.mutateAsync({ id: report.id, data: { status: newStatus } });
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', BUG_STATUS_COLORS[report.status])}>
              {BUG_STATUS_LABELS[report.status]}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {report.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-500 dark:text-slate-500">발생 상황:</span> {report.situation}
          </p>
          {report.description && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-500 dark:text-slate-500">상세 내용:</span> {report.description}
            </p>
          )}
          {report.improvement_request && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-500 dark:text-slate-500">개선 요청:</span> {report.improvement_request}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            {report.reporter && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {report.reporter.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(report.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
            </span>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={handleToggleStatus}
            disabled={updateMutation.isPending}
            className={cn(
              'flex-shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
              report.status === 'pending'
                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            )}
          >
            {updateMutation.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {report.status === 'pending' ? '개선완료' : '접수됨으로 변경'}
          </button>
        )}
      </div>
    </div>
  );
}
