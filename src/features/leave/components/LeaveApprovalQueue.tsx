'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

const BU_DISPLAY_NAMES: Record<string, string> = {
  HEAD: '본사',
  GRIGO: '그리고엔터',
  FLOW: '플로우메이커',
  REACT: '리액트스튜디오',
  MODOO: '모두굿즈',
  AST: '아스트컴퍼니',
};
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  approveLeaveRequest,
  rejectLeaveRequest,
  approveCompensatoryRequest,
  rejectCompensatoryRequest,
} from '../api';
import type { PendingApprovalItem } from '../api';
import { LEAVE_REQUEST_TYPE_LABELS } from '../types';

interface LeaveApprovalQueueProps {
  items: PendingApprovalItem[];
  isLoading?: boolean;
  onRefresh: () => void;
}

export function LeaveApprovalQueue({ items, isLoading, onRefresh }: LeaveApprovalQueueProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingApprovalItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async (item: PendingApprovalItem) => {
    setProcessing(item.id);
    try {
      if (item.type === 'leave') {
        await approveLeaveRequest(item.id);
      } else {
        await approveCompensatoryRequest(item.id);
      }
      onRefresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : '승인에 실패했습니다.');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectClick = (item: PendingApprovalItem) => {
    setSelectedItem(item);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedItem || !rejectionReason.trim()) return;

    setProcessing(selectedItem.id);
    try {
      if (selectedItem.type === 'leave') {
        await rejectLeaveRequest(selectedItem.id, rejectionReason);
      } else {
        await rejectCompensatoryRequest(selectedItem.id, rejectionReason);
      }
      setRejectModalOpen(false);
      onRefresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : '반려에 실패했습니다.');
    } finally {
      setProcessing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>처리할 승인 대기 항목이 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800">
              <TableHead>신청자</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>기간</TableHead>
              <TableHead>일수</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>신청일</TableHead>
              <TableHead className="w-[150px]">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={`${item.type}-${item.id}`}>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.requester_name}</p>
                    {item.requester_bu_code && (
                      <p className="text-xs text-slate-500">{BU_DISPLAY_NAMES[item.requester_bu_code] || item.requester_bu_code}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {item.type === 'compensatory'
                      ? '대체휴무 생성'
                      : LEAVE_REQUEST_TYPE_LABELS[item.request_type as keyof typeof LEAVE_REQUEST_TYPE_LABELS] || item.request_type
                    }
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.start_date && item.end_date ? (
                    <>
                      {format(new Date(item.start_date), 'M/d', { locale: ko })}
                      {item.start_date !== item.end_date && (
                        <> ~ {format(new Date(item.end_date), 'M/d', { locale: ko })}</>
                      )}
                    </>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{item.days}일</TableCell>
                <TableCell className="max-w-[200px] truncate" title={item.reason}>
                  {item.reason}
                </TableCell>
                <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                  {format(new Date(item.created_at), 'M/d HH:mm', { locale: ko })}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(item)}
                      disabled={processing === item.id}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {processing === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectClick(item)}
                      disabled={processing === item.id}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>신청 반려</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>반려 사유</Label>
              <Textarea
                placeholder="반려 사유를 입력하세요"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || processing !== null}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              반려
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
