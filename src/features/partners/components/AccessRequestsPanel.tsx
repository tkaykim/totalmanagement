'use client';

import { useState } from 'react';
import { Check, X, Clock, AlertCircle, ChevronDown, User, Building2, UsersRound, MapPin, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAccessRequests,
  useApproveAccessRequest,
  useRejectAccessRequest,
} from '../hooks/usePartners';
import { AccessRequest, PartnerEntityType } from '../types';

const ENTITY_TYPE_ICON_MAP: Record<PartnerEntityType, React.ReactNode> = {
  person: <User className="w-5 h-5" />,
  organization: <Building2 className="w-5 h-5" />,
  team: <UsersRound className="w-5 h-5" />,
  venue: <MapPin className="w-5 h-5" />,
  brand: <Tag className="w-5 h-5" />,
};
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function AccessRequestsPanel() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [validUntil, setValidUntil] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { toast } = useToast();
  const { data: requests = [], isLoading } = useAccessRequests(statusFilter);
  const approveMutation = useApproveAccessRequest();
  const rejectMutation = useRejectAccessRequest();

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      await approveMutation.mutateAsync({
        requestId: selectedRequest.id,
        data: validUntil ? { valid_until: validUntil } : undefined,
      });
      toast({ title: '열람 신청이 승인되었습니다' });
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      setValidUntil('');
    } catch (error) {
      toast({
        title: '오류가 발생했습니다',
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      await rejectMutation.mutateAsync({
        requestId: selectedRequest.id,
        data: { reason: rejectReason },
      });
      toast({ title: '열람 신청이 거절되었습니다' });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
    } catch (error) {
      toast({
        title: '오류가 발생했습니다',
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  const openApproveDialog = (request: AccessRequest) => {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (request: AccessRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const filterOptions = [
    { value: 'pending', label: '대기 중' },
    { value: 'approved', label: '승인됨' },
    { value: 'rejected', label: '거절됨' },
    { value: 'all', label: '전체' },
  ];

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
          >
            {filterOptions.find(f => f.value === statusFilter)?.label}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showFilterDropdown && (
            <div className="absolute left-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10">
              {filterOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setStatusFilter(opt.value); setShowFilterDropdown(false); }}
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700",
                    statusFilter === opt.value && "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-slate-500">
          <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
          <p>열람 신청이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  {request.partner?.entity_type && ENTITY_TYPE_ICON_MAP[request.partner.entity_type]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{request.partner?.display_name}</span>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {request.requester?.name} ({request.requester_bu_code})가 열람 요청
                  </p>
                  {request.reason && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      사유: {request.reason}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDistanceToNow(new Date(request.created_at), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </p>
                </div>
              </div>

              {request.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openApproveDialog(request)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-green-200 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    <Check className="w-4 h-4" /> 승인
                  </button>
                  <button
                    onClick={() => openRejectDialog(request)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="w-4 h-4" /> 거절
                  </button>
                </div>
              )}

              {request.status === 'rejected' && request.rejection_reason && (
                <p className="text-sm text-red-500 max-w-xs truncate">
                  거절 사유: {request.rejection_reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showFilterDropdown && (
        <div className="fixed inset-0 z-0" onClick={() => setShowFilterDropdown(false)} />
      )}

      {/* Approve Dialog */}
      {approveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">열람 신청 승인</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {selectedRequest?.requester?.name}님의 {selectedRequest?.partner?.display_name} 열람 신청을 승인합니다.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">열람 유효기간 (선택)</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
                <p className="text-xs text-slate-500">비워두면 영구적으로 열람할 수 있습니다</p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setApproveDialogOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  취소
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {approveMutation.isPending ? '처리 중...' : '승인'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">열람 신청 거절</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {selectedRequest?.requester?.name}님의 {selectedRequest?.partner?.display_name} 열람 신청을 거절합니다.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">거절 사유</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="거절 사유를 입력해주세요 (선택)"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRejectDialogOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  취소
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                  className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? '처리 중...' : '거절'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  };

  const labels: Record<string, string> = {
    pending: '대기 중',
    approved: '승인됨',
    rejected: '거절됨',
  };

  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    approved: <Check className="w-3 h-3" />,
    rejected: <X className="w-3 h-3" />,
  };

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", styles[status] || styles.pending)}>
      {icons[status]} {labels[status] || status}
    </span>
  );
}
