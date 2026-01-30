'use client';

import { useState, useMemo } from 'react';
import { Bug, Plus, Clock, User, ChevronRight, Inbox } from 'lucide-react';
import { useBugReports, useUpdateBugReport } from '../hooks';
import {
  BugReport,
  BugReportStatus,
  BUG_STATUS_LABELS,
} from '../types';
import { BugReportModal } from './BugReportModal';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<
  BugReportStatus,
  { label: string; color: string; bgColor: string; borderColor: string; headerBg: string }
> = {
  pending: {
    label: '접수됨',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    headerBg: 'bg-amber-100 dark:bg-amber-900/40',
  },
  resolved: {
    label: '접수완료',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    headerBg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
};

interface BugReportsViewProps {
  isAdmin?: boolean;
}

function BugReportCard({
  report,
  isAdmin,
  onStatusChange,
}: {
  report: BugReport;
  isAdmin: boolean;
  onStatusChange: (id: number, status: BugReportStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const updateMutation = useUpdateBugReport();
  const config = STATUS_CONFIG[report.status];
  const targetStatus: BugReportStatus = report.status === 'pending' ? 'resolved' : 'pending';
  const hasDetail = report.description || report.improvement_request;

  const handleMove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateMutation.mutateAsync({ id: report.id, data: { status: targetStatus } });
    onStatusChange(report.id, targetStatus);
  };

  return (
    <div
      className={cn(
        'group rounded-xl border bg-white dark:bg-slate-800 p-4 transition-all duration-200',
        'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600',
        hasDetail && 'cursor-pointer',
        config.borderColor
      )}
      onClick={hasDetail ? () => setExpanded((e) => !e) : undefined}
    >
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
        {report.title}
      </h3>
      <p className={cn('mt-2 text-xs text-slate-600 dark:text-slate-400', !expanded && 'line-clamp-2')}>
        <span className="font-medium text-slate-500">발생 상황:</span> {report.situation}
      </p>
      {expanded && (
        <div className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-400">
          {report.description && (
            <p>
              <span className="font-medium text-slate-500">상세 내용:</span> {report.description}
            </p>
          )}
          {report.improvement_request && (
            <p>
              <span className="font-medium text-slate-500">개선 요청:</span> {report.improvement_request}
            </p>
          )}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
        {report.reporter && (
          <span className="flex items-center gap-1 truncate">
            <User className="h-3 w-3 flex-shrink-0" />
            {report.reporter.name}
          </span>
        )}
        <span className="flex items-center gap-1 flex-shrink-0">
          <Clock className="h-3 w-3" />
          {format(new Date(report.created_at), 'MM.dd HH:mm', { locale: ko })}
        </span>
        {hasDetail && (
          <span className="ml-auto text-slate-400">
            {expanded ? '접기' : '자세히'}
          </span>
        )}
      </div>

      {isAdmin && (
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleMove}
            disabled={updateMutation.isPending}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
              targetStatus === 'resolved'
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300'
            )}
          >
            {updateMutation.isPending ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current/30 border-t-current" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {BUG_STATUS_LABELS[targetStatus]}로 이동
          </button>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  status,
  reports,
  isAdmin,
  onStatusChange,
}: {
  status: BugReportStatus;
  reports: BugReport[];
  isAdmin: boolean;
  onStatusChange: (id: number, status: BugReportStatus) => void;
}) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col min-w-[280px] sm:min-w-[300px] lg:min-w-0 lg:flex-1">
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2.5 rounded-t-xl',
          config.headerBg
        )}
      >
        <div className="flex items-center gap-2">
          <Inbox className={cn('w-4 h-4', config.color)} />
          <span className={cn('text-sm font-bold', config.color)}>{config.label}</span>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-bold',
            config.bgColor,
            config.color
          )}
        >
          {reports.length}
        </span>
      </div>
      <div
        className={cn(
          'flex-1 p-2 space-y-2 rounded-b-xl border-x border-b overflow-y-auto',
          'bg-slate-50/50 dark:bg-slate-900/30',
          config.borderColor
        )}
        style={{ maxHeight: 'calc(100vh - 320px)', minHeight: '200px' }}
      >
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-xs text-slate-400 dark:text-slate-500">
            <Inbox className="h-8 w-8 mb-2 opacity-40" />
            {status === 'pending' ? '접수 대기 중인 리포트가 없습니다' : '처리 완료된 리포트가 없습니다'}
          </div>
        ) : (
          reports.map((report) => (
            <BugReportCard
              key={report.id}
              report={report}
              isAdmin={isAdmin}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function BugReportsView({ isAdmin = false }: BugReportsViewProps) {
  const { data: bugReports = [], isLoading } = useBugReports();
  const [showReportModal, setShowReportModal] = useState(false);
  const [mobileTab, setMobileTab] = useState<BugReportStatus>('pending');

  const reportsByStatus = useMemo(
    () => ({
      pending: bugReports.filter((r) => r.status === 'pending'),
      resolved: bugReports.filter((r) => r.status === 'resolved'),
    }),
    [bugReports]
  );

  const handleStatusChange = () => {
    // refetch is handled by react-query mutation
  };

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

      {/* 모바일: 탭 전환 */}
      <div className="lg:hidden">
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-4">
          {(['pending', 'resolved'] as const).map((status) => {
            const config = STATUS_CONFIG[status];
            const count = reportsByStatus[status].length;
            const isActive = mobileTab === status;
            return (
              <button
                key={status}
                onClick={() => setMobileTab(status)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all',
                  isActive
                    ? cn('bg-white dark:bg-slate-700 shadow-sm', config.color)
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                <span>{config.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs',
                    isActive ? config.headerBg : 'bg-slate-200 dark:bg-slate-600'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {reportsByStatus[mobileTab].length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-sm text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
              <Inbox className="h-10 w-10 mb-2 opacity-40" />
              {mobileTab === 'pending'
                ? '접수 대기 중인 리포트가 없습니다'
                : '처리 완료된 리포트가 없습니다'}
            </div>
          ) : (
            reportsByStatus[mobileTab].map((report) => (
              <BugReportCard
                key={report.id}
                report={report}
                isAdmin={isAdmin}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </div>
      </div>

      {/* 데스크톱: 칸반 보드 */}
      <div className="hidden lg:flex gap-4">
        {(['pending', 'resolved'] as const).map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            reports={reportsByStatus[status]}
            isAdmin={isAdmin}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {/* 태블릿: 가로 스크롤 칸반 */}
      <div className="hidden sm:flex lg:hidden overflow-x-auto gap-4 pb-4 -mx-4 px-4 snap-x snap-mandatory">
        {(['pending', 'resolved'] as const).map((status) => (
          <div key={status} className="snap-center flex-shrink-0">
            <KanbanColumn
              status={status}
              reports={reportsByStatus[status]}
              isAdmin={isAdmin}
              onStatusChange={handleStatusChange}
            />
          </div>
        ))}
      </div>

      {showReportModal && (
        <BugReportModal onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}
