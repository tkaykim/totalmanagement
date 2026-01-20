'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
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

const statusConfig: Record<ApprovalStatus, { icon: typeof Clock; color: string }> = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  approved: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  rejected: { icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
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
    <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
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
                  {format(new Date(request.start_date), 'M/d', { locale: ko })}
                  {request.start_date !== request.end_date && (
                    <> ~ {format(new Date(request.end_date), 'M/d', { locale: ko })}</>
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
                  {format(new Date(request.created_at), 'M/d HH:mm', { locale: ko })}
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
  );
}
