'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getLeaveLogs, type LeaveGrantLogItem, type LeaveLogsResponse } from '../api';
import {
  LEAVE_TYPE_LABELS,
  LEAVE_GRANT_TYPE_LABELS,
  LEAVE_REQUEST_TYPE_LABELS,
} from '../types';
import { formatKST } from '@/lib/timezone';

type LogSubTab = 'creation' | 'usage';

interface LeaveCreationUsageLogProps {
  year: number;
  /** 연도 선택기 표시 및 변경 콜백 (미전달 시 상단 연도와 동일하게 사용) */
  onYearChange?: (year: number) => void;
}

export function LeaveCreationUsageLog({
  year,
  onYearChange,
}: LeaveCreationUsageLogProps) {
  const [data, setData] = useState<LeaveLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<LogSubTab>('creation');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLeaveLogs({ year });
      setData(res);
    } catch (error) {
      console.error('Failed to fetch leave logs:', error);
      setData({ grants: [], usages: [] });
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  const grants = data?.grants ?? [];
  const usages = data?.usages ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setSubTab('creation')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              subTab === 'creation'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <ArrowDownLeft className="h-4 w-4" />
            생성 로그
            {grants.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full">
                {grants.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('usage')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              subTab === 'usage'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="h-4 w-4" />
            소진 로그
            {usages.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-full">
                {usages.length}
              </span>
            )}
          </button>
        </div>
        {onYearChange && (
          <Select
            value={String(year)}
            onValueChange={(v) => onYearChange(parseInt(v, 10))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="연도" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {subTab === 'creation' && (
        <CreationLogTable grants={grants} isLoading={loading} />
      )}
      {subTab === 'usage' && (
        <UsageLogTable usages={usages} isLoading={loading} />
      )}
    </div>
  );
}

function CreationLogTable({
  grants,
  isLoading,
}: {
  grants: LeaveGrantLogItem[];
  isLoading: boolean;
}) {
  const leaveTypeLabels: Record<string, string> = LEAVE_TYPE_LABELS;
  const grantTypeLabels: Record<string, string> = LEAVE_GRANT_TYPE_LABELS;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100" />
        </div>
      </div>
    );
  }

  if (grants.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-500 dark:text-slate-400">
        <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>해당 연도 휴가 생성 내역이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">생성 일시</TableHead>
            <TableHead className="whitespace-nowrap">대상자</TableHead>
            <TableHead className="whitespace-nowrap">휴가 유형</TableHead>
            <TableHead className="whitespace-nowrap text-right">일수</TableHead>
            <TableHead className="whitespace-nowrap">생성 사유</TableHead>
            <TableHead className="whitespace-nowrap">부여자</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grants.map((g) => (
            <TableRow key={g.id}>
              <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-400">
                {formatKST(g.granted_at, 'yyyy.MM.dd HH:mm')}
              </TableCell>
              <TableCell className="font-medium">
                {g.recipient?.name ?? '-'}
              </TableCell>
              <TableCell>
                {leaveTypeLabels[g.leave_type] ?? g.leave_type}
              </TableCell>
              <TableCell className="text-right">{Number(g.days)}일</TableCell>
              <TableCell className="max-w-[200px]">
                <span className="text-slate-600 dark:text-slate-400">
                  {grantTypeLabels[g.grant_type] ?? g.grant_type}
                  {g.reason ? ` - ${g.reason}` : ''}
                </span>
              </TableCell>
              <TableCell className="text-slate-600 dark:text-slate-400">
                {g.granter?.name ?? '시스템'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function UsageLogTable({
  usages,
  isLoading,
}: {
  usages: LeaveLogsResponse['usages'];
  isLoading: boolean;
}) {
  const requestTypeLabels: Record<string, string> = LEAVE_REQUEST_TYPE_LABELS;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100" />
        </div>
      </div>
    );
  }

  if (usages.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-500 dark:text-slate-400">
        <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>해당 연도 휴가 사용(소진) 내역이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">승인 일시</TableHead>
            <TableHead className="whitespace-nowrap">사용자</TableHead>
            <TableHead className="whitespace-nowrap">휴가 유형</TableHead>
            <TableHead className="whitespace-nowrap text-right">일수</TableHead>
            <TableHead className="whitespace-nowrap">사용 기간</TableHead>
            <TableHead className="whitespace-nowrap">사유</TableHead>
            <TableHead className="whitespace-nowrap">승인자</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usages.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-400">
                {u.approved_at
                  ? formatKST(u.approved_at, 'yyyy.MM.dd HH:mm')
                  : '-'}
              </TableCell>
              <TableCell className="font-medium">
                {u.requester?.name ?? '-'}
              </TableCell>
              <TableCell>
                {requestTypeLabels[u.leave_type] ?? u.leave_type}
              </TableCell>
              <TableCell className="text-right">{Number(u.days_used)}일</TableCell>
              <TableCell className="whitespace-nowrap">
                {u.start_date} ~ {u.end_date}
              </TableCell>
              <TableCell className="max-w-[200px] truncate" title={u.reason}>
                {u.reason || '-'}
              </TableCell>
              <TableCell className="text-slate-600 dark:text-slate-400">
                {u.approver?.name ?? '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
