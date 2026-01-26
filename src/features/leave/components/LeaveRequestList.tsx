'use client';

import { CheckCircle, XCircle, Clock, Trash2, CalendarDays } from 'lucide-react';
import { formatKST } from '@/lib/timezone';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LeaveRequestWithUser, ApprovalStatus } from '../types';
import { LEAVE_REQUEST_TYPE_LABELS, APPROVAL_STATUS_LABELS } from '../types';

interface LeaveRequestListProps {
  requests: LeaveRequestWithUser[];
  isLoading?: boolean;
  onCancel?: (id: string) => void;
  showRequester?: boolean;
}

const statusConfig: Record<ApprovalStatus, { icon: typeof Clock; color: string; mobileColor: string }> = {
  pending: { 
    icon: Clock, 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    mobileColor: 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20'
  },
  approved: { 
    icon: CheckCircle, 
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    mobileColor: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
  },
  rejected: { 
    icon: XCircle, 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    mobileColor: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
  },
};

export function LeaveRequestList({
  requests,
  isLoading,
  onCancel,
  showRequester = false,
}: LeaveRequestListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>휴가 신청 내역이 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      {/* 모바일: 카드 레이아웃 */}
      <div className="md:hidden space-y-3">
        {requests.map((request) => {
          const config = statusConfig[request.status];
          const Icon = config.icon;
          const dateRange = request.start_date === request.end_date
            ? formatKST(request.start_date, 'M월 d일')
            : `${formatKST(request.start_date, 'M/d')} ~ ${formatKST(request.end_date, 'M/d')}`;

          return (
            <div
              key={request.id}
              className={`p-3 rounded-xl border-l-4 ${config.mobileColor} transition-all`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* 상단: 유형 + 상태 */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {LEAVE_REQUEST_TYPE_LABELS[request.leave_type]}
                    </Badge>
                    <Badge className={`${config.color} text-[10px] px-1.5 py-0`}>
                      <Icon className="h-3 w-3 mr-0.5" />
                      {APPROVAL_STATUS_LABELS[request.status]}
                    </Badge>
                  </div>
                  
                  {/* 기간 & 일수 */}
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {dateRange}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 dark:text-slate-300">{request.days_used}일</span>
                  </div>

                  {/* 사유 */}
                  {request.reason && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      {request.reason}
                    </p>
                  )}

                  {/* 신청자 (showRequester일 때만) */}
                  {showRequester && request.requester?.name && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      신청자: {request.requester.name}
                    </p>
                  )}
                </div>

                {/* 취소 버튼 */}
                {onCancel && request.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancel(request.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* 신청일 */}
              <p className="text-[10px] text-slate-400 mt-2">
                신청: {formatKST(request.created_at, 'M/d HH:mm')}
              </p>
            </div>
          );
        })}
      </div>

      {/* 데스크톱: 테이블 레이아웃 */}
      <div className="hidden md:block rounded-lg border dark:border-slate-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800">
              {showRequester && <TableHead>신청자</TableHead>}
              <TableHead>유형</TableHead>
              <TableHead>기간</TableHead>
              <TableHead>일수</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>신청일</TableHead>
              {onCancel && <TableHead className="w-[80px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const config = statusConfig[request.status];
              const Icon = config.icon;

              return (
                <TableRow key={request.id}>
                  {showRequester && (
                    <TableCell className="font-medium">
                      {request.requester?.name || '-'}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline">
                      {LEAVE_REQUEST_TYPE_LABELS[request.leave_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatKST(request.start_date, 'M/d')}
                    {request.start_date !== request.end_date && (
                      <> ~ {formatKST(request.end_date, 'M/d')}</>
                    )}
                  </TableCell>
                  <TableCell>{request.days_used}일</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={request.reason}>
                    {request.reason}
                  </TableCell>
                  <TableCell>
                    <Badge className={config.color}>
                      <Icon className="h-3 w-3 mr-1" />
                      {APPROVAL_STATUS_LABELS[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                    {formatKST(request.created_at, 'M/d HH:mm')}
                  </TableCell>
                  {onCancel && (
                    <TableCell>
                      {request.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancel(request.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
