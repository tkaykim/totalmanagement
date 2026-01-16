'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, CheckCircle, Wallet, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateSettlement } from '../hooks';
import type { PartnerSettlement, SettlementStatus } from '../types';
import { SETTLEMENT_STATUS_LABELS, SETTLEMENT_STATUS_COLORS } from '../types';

interface SettlementDetailModalProps {
  settlement: PartnerSettlement;
  onClose: () => void;
}

export function SettlementDetailModal({
  settlement,
  onClose,
}: SettlementDetailModalProps) {
  const updateMutation = useUpdateSettlement();
  const [memo, setMemo] = useState(settlement.memo || '');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleStatusChange = async (newStatus: SettlementStatus) => {
    await updateMutation.mutateAsync({
      id: settlement.id,
      status: newStatus,
    });
  };

  const handleMemoSave = async () => {
    await updateMutation.mutateAsync({
      id: settlement.id,
      memo,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 flex-shrink-0" />
            정산서 상세
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                {settlement.partnerName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {format(new Date(settlement.periodStart), 'yyyy년 M월 d일', { locale: ko })}
                {' ~ '}
                {format(new Date(settlement.periodEnd), 'yyyy년 M월 d일', { locale: ko })}
              </p>
            </div>
            <span
              className={cn(
                'inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-semibold self-start flex-shrink-0',
                SETTLEMENT_STATUS_COLORS[settlement.status]
              )}
            >
              {SETTLEMENT_STATUS_LABELS[settlement.status]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400">총 매출</p>
              <p className="text-sm sm:text-lg font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(settlement.totalRevenue)}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400">총 지출</p>
              <p className="text-sm sm:text-lg font-bold text-red-700 dark:text-red-300">
                {formatCurrency(settlement.totalExpense)}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400">순수익</p>
              <p className="text-sm sm:text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(settlement.netProfit)}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
              <p className="text-[10px] sm:text-xs text-violet-600 dark:text-violet-400">파트너 정산액</p>
              <p className="text-sm sm:text-lg font-bold text-violet-700 dark:text-violet-300">
                {formatCurrency(settlement.partnerAmount)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm sm:text-base">프로젝트별 내역</h3>
            
            {/* 모바일: 카드 레이아웃 */}
            <div className="block sm:hidden space-y-2">
              {settlement.projects.length === 0 ? (
                <div className="p-4 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  프로젝트 내역이 없습니다.
                </div>
              ) : (
                <>
                  {settlement.projects.map((project) => (
                    <div key={project.id} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm truncate flex-1">{project.projectName}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] ml-2 flex-shrink-0">
                          {project.shareRate}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">매출: </span>
                          <span className="text-blue-600 font-medium">{formatCurrency(project.revenue)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">지출: </span>
                          <span className="text-red-500 font-medium">{formatCurrency(project.expense)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">순수익: </span>
                          <span className="text-emerald-600 font-medium">{formatCurrency(project.netProfit)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">파트너 몫: </span>
                          <span className="text-violet-600 font-semibold">{formatCurrency(project.partnerAmount)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-600">
                    <div className="font-bold text-sm mb-2">합계</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">매출: </span>
                        <span className="text-blue-600 font-bold">{formatCurrency(settlement.totalRevenue)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">지출: </span>
                        <span className="text-red-500 font-bold">{formatCurrency(settlement.totalExpense)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">순수익: </span>
                        <span className="text-emerald-600 font-bold">{formatCurrency(settlement.netProfit)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">파트너 몫: </span>
                        <span className="text-violet-600 font-bold">{formatCurrency(settlement.partnerAmount)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 데스크탑: 테이블 레이아웃 */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">프로젝트</th>
                    <th className="px-4 py-2 text-right font-semibold">매출</th>
                    <th className="px-4 py-2 text-right font-semibold">지출</th>
                    <th className="px-4 py-2 text-right font-semibold">순수익</th>
                    <th className="px-4 py-2 text-center font-semibold">비율</th>
                    <th className="px-4 py-2 text-right font-semibold">파트너 몫</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {settlement.projects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-slate-400">
                        프로젝트 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    settlement.projects.map((project) => (
                      <tr key={project.id}>
                        <td className="px-4 py-2 font-medium">{project.projectName}</td>
                        <td className="px-4 py-2 text-right text-blue-600">
                          {formatCurrency(project.revenue)}
                        </td>
                        <td className="px-4 py-2 text-right text-red-500">
                          {formatCurrency(project.expense)}
                        </td>
                        <td className="px-4 py-2 text-right text-emerald-600">
                          {formatCurrency(project.netProfit)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                            {project.shareRate}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-violet-600">
                          {formatCurrency(project.partnerAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-600">
                  <tr>
                    <td className="px-4 py-2 font-bold">합계</td>
                    <td className="px-4 py-2 text-right font-bold text-blue-600">
                      {formatCurrency(settlement.totalRevenue)}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-red-500">
                      {formatCurrency(settlement.totalExpense)}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-emerald-600">
                      {formatCurrency(settlement.netProfit)}
                    </td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-right font-bold text-violet-600">
                      {formatCurrency(settlement.partnerAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">메모</label>
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="정산 관련 메모..."
              rows={2}
            />
            {memo !== (settlement.memo || '') && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMemoSave}
                disabled={updateMutation.isPending}
              >
                메모 저장
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex gap-2">
              {settlement.status === 'draft' && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('confirmed')}
                  disabled={updateMutation.isPending}
                  className="flex-1 sm:flex-none text-sm"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  확정
                </Button>
              )}
              {settlement.status === 'confirmed' && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('paid')}
                  disabled={updateMutation.isPending}
                  className="flex-1 sm:flex-none text-sm"
                >
                  <Wallet className="h-4 w-4 mr-1" />
                  지급 완료
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint} className="flex-1 sm:flex-none text-sm">
                <Printer className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">인쇄</span>
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none text-sm">
                닫기
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
