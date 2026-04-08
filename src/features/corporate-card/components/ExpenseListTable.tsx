'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { MessageSquare, Paperclip, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import type { GowidExpenseListItem, GowidExpensePageable } from '../types';

interface ExpenseListTableProps {
  data: GowidExpensePageable | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onRowClick: (expenseId: number) => void;
  canApprove: boolean;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
}

function formatGowidDate(dateStr: string, timeStr: string): string {
  if (!dateStr) return '-';
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  const h = timeStr?.slice(0, 2) || '00';
  const mi = timeStr?.slice(2, 4) || '00';
  return `${y}.${m}.${d} ${h}:${mi}`;
}

function formatAmount(amount: number, currency: string): string {
  if (currency === 'KRW') {
    return `₩${amount.toLocaleString('ko-KR')}`;
  }
  return `${currency} ${amount.toLocaleString()} (₩${amount.toLocaleString('ko-KR')})`;
}

export function ExpenseListTable({
  data,
  isLoading,
  page,
  onPageChange,
  onRowClick,
  canApprove,
  selectedIds,
  onSelectionChange,
}: ExpenseListTableProps) {
  const content = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const allSelected = content.length > 0 && content.every((e) => selectedIds.includes(e.expenseId));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !content.some((e) => e.expenseId === id)));
    } else {
      const newIds = content.map((e) => e.expenseId);
      onSelectionChange([...new Set([...selectedIds, ...newIds])]);
    }
  };

  const toggleOne = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <p className="text-sm">조회된 결제내역이 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs text-slate-500 dark:text-slate-400">
              {canApprove && (
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                </th>
              )}
              <th className="px-3 py-3">일시</th>
              <th className="px-3 py-3">사용처</th>
              <th className="px-3 py-3 text-right">금액</th>
              <th className="px-3 py-3">카드</th>
              <th className="px-3 py-3">용도</th>
              <th className="px-3 py-3">상태</th>
              <th className="px-3 py-3 text-center">정보</th>
            </tr>
          </thead>
          <tbody>
            {content.map((item) => (
              <tr
                key={item.expenseId}
                onClick={() => onRowClick(item.expenseId)}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
              >
                {canApprove && (
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.expenseId)}
                      onChange={() => toggleOne(item.expenseId)}
                      className="rounded"
                    />
                  </td>
                )}
                <td className="px-3 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                  {formatGowidDate(item.expenseDate, item.expenseTime)}
                </td>
                <td className="px-3 py-3 max-w-[200px] truncate font-medium text-slate-900 dark:text-white">
                  {item.storeName || '-'}
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap font-semibold text-slate-900 dark:text-white">
                  {formatAmount(item.krwAmount, item.currency)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                  <div className="text-xs">{item.cardAlias || '-'}</div>
                  <div className="text-[10px] text-slate-400">{item.shortCardNumber}</div>
                </td>
                <td className="px-3 py-3 max-w-[120px] truncate text-slate-600 dark:text-slate-400">
                  {item.purpose?.name || <span className="text-slate-300 dark:text-slate-600">미지정</span>}
                </td>
                <td className="px-3 py-3">
                  <ApprovalStatusBadge status={item.approvalStatus} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    {item.commentCount > 0 && (
                      <span className="flex items-center gap-0.5 text-xs">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {item.commentCount}
                      </span>
                    )}
                    {item.participantCount > 0 && (
                      <span className="flex items-center gap-0.5 text-xs">
                        <Users className="h-3.5 w-3.5" />
                        {item.participantCount}
                      </span>
                    )}
                    {item.evidenceCount > 0 && (
                      <span className="flex items-center gap-0.5 text-xs">
                        <Paperclip className="h-3.5 w-3.5" />
                        {item.evidenceCount}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 px-4 py-3">
          <p className="text-xs text-slate-500">
            총 {data?.totalElements?.toLocaleString()}건 / {page + 1} of {totalPages} 페이지
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={data?.last}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
