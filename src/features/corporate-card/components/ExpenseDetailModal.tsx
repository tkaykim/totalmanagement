'use client';

import { useState } from 'react';
import { X, MapPin, CreditCard, Calendar, Receipt, ExternalLink } from 'lucide-react';
import { useExpenseDetail, useUpdateMemo, useUpdateApproval } from '../hooks';
import { useCardAliasMap } from '../hooks/useCardAliasMap';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import { PurposeSelector } from './PurposeSelector';
import { ExpenseCommentSection } from './ExpenseCommentSection';
import { ExpenseParticipantManager } from './ExpenseParticipantManager';
import { ExpenseProjectLinker } from './ExpenseProjectLinker';

interface ExpenseDetailModalProps {
  expenseId: number;
  onClose: () => void;
  canEdit: boolean;
  canApprove: boolean;
  canComment: boolean;
}

function formatGowidDate(dateStr: string, timeStr: string): string {
  if (!dateStr) return '-';
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  const h = timeStr?.slice(0, 2) || '00';
  const mi = timeStr?.slice(2, 4) || '00';
  const s = timeStr?.slice(4, 6) || '00';
  return `${y}.${m}.${d} ${h}:${mi}:${s}`;
}

export function ExpenseDetailModal({
  expenseId,
  onClose,
  canEdit,
  canApprove,
  canComment,
}: ExpenseDetailModalProps) {
  const { data: detail, isLoading } = useExpenseDetail(expenseId);
  const { resolveAlias } = useCardAliasMap();
  const updateMemo = useUpdateMemo();
  const updateApproval = useUpdateApproval();

  const [memo, setMemo] = useState('');
  const [memoInitialized, setMemoInitialized] = useState(false);

  if (detail && !memoInitialized) {
    setMemo(detail.memo || '');
    setMemoInitialized(true);
  }

  const handleSaveMemo = () => {
    updateMemo.mutate({ expenseId, memo });
  };

  const handleApprove = () => {
    updateApproval.mutate({ expenseId, approvalStatus: 'APPROVED' });
  };

  const handleReject = () => {
    updateApproval.mutate({ expenseId, approvalStatus: 'REJECTED' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">결제 상세</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        )}

        {detail && (
          <div className="p-6 space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <ApprovalStatusBadge status={detail.approvalStatus} />
                  {detail.cardApprovalNumber && (
                    <span className="text-xs text-slate-400">승인번호: {detail.cardApprovalNumber}</span>
                  )}
                </div>

                <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-5 w-5 text-blue-400" />
                    <div>
                      <span className="text-sm font-medium">
                        {detail.card?.alias ? resolveAlias(detail.card.alias) : detail.card?.cardName || '-'}
                      </span>
                      {detail.card?.alias && resolveAlias(detail.card.alias) !== detail.card.alias && (
                        <span className="ml-2 text-[10px] text-slate-400">({detail.card.alias})</span>
                      )}
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    ₩{detail.krwAmount.toLocaleString('ko-KR')}
                  </p>
                  {detail.currency !== 'KRW' && (
                    <p className="text-sm text-slate-300 mt-1">
                      {detail.currency} {detail.useAmount.toLocaleString()}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatGowidDate(detail.expenseDate, detail.expenseTime)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{detail.storeName}</p>
                      {detail.storeAddress && (
                        <p className="text-xs text-slate-400">{detail.storeAddress}</p>
                      )}
                      {detail.storeRegistrationNumber && (
                        <p className="text-[10px] text-slate-400">사업자등록번호: {detail.storeRegistrationNumber}</p>
                      )}
                    </div>
                  </div>
                </div>

                {detail.evidenceList && detail.evidenceList.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Receipt className="h-4 w-4" /> 영수증
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {detail.evidenceList.map((ev) => (
                        <a
                          key={ev.evidenceId}
                          href={ev.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {ev.fileName}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 관리 영역 */}
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">용도</label>
                  <PurposeSelector
                    expenseId={expenseId}
                    currentPurposeName={detail.purpose?.name ?? null}
                    canEdit={canEdit}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">메모</label>
                  {canEdit ? (
                    <div className="flex items-start gap-2">
                      <textarea
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        rows={2}
                        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleSaveMemo}
                        disabled={updateMemo.isPending}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        저장
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 dark:text-slate-300">{detail.memo || '-'}</p>
                  )}
                </div>

                <ExpenseProjectLinker
                  expenseId={expenseId}
                  canEdit={canEdit}
                  expenseAmount={detail.krwAmount}
                  expenseStoreName={detail.storeName}
                  expenseDate={detail.expenseDate}
                  cardAlias={detail.card?.alias}
                />

                <ExpenseParticipantManager
                  expenseId={expenseId}
                  participants={detail.participants ?? []}
                  externalUsers={detail.expenseExternalUsers ?? []}
                  canEdit={canEdit}
                />

                {canApprove && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">승인 관리</h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleApprove}
                        disabled={updateApproval.isPending}
                        className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
                      >
                        승인
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={updateApproval.isPending}
                        className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition"
                      >
                        반려
                      </button>
                    </div>
                    {detail.approvedBy && (
                      <p className="text-[10px] text-slate-400">
                        승인자: {detail.approvedBy}
                        {detail.approvedAt && ` (${detail.approvedAt})`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 댓글 */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <ExpenseCommentSection
                expenseId={expenseId}
                comments={detail.comments ?? []}
                canComment={canComment}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
