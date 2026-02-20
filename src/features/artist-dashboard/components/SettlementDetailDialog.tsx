'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Wallet, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArtistSettlement, PartnerSettlement, SettlementDetailPayload } from '../types';

const formatCurrency = (value: number) =>
  `₩ ${value.toLocaleString('ko-KR')}`;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  vat_included: '부가세 포함',
  tax_free: '면세',
  withholding: '원천징수 3.3%',
  actual_payment: '실지급액',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '작성중',
  confirmed: '확정',
  planned: '예정',
  paid: '완료',
  canceled: '취소',
};

interface SettlementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: SettlementDetailPayload | null;
}

function LegacySettlementContent({ data }: { data: ArtistSettlement }) {
  const supplyAmount = data.amount;
  const actualAmount = data.actual_amount ?? data.amount;
  const taxAmount = supplyAmount - actualAmount;
  const paymentLabel = PAYMENT_METHOD_LABELS[data.payment_method ?? ''] ?? data.payment_method ?? '-';

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          세금 유형
        </h4>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {paymentLabel}
        </p>
      </div>

      <div className="rounded-lg border-2 border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/20 p-4 space-y-2">
        <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          공급가 → 세금 → 실지급액
        </h4>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {formatCurrency(supplyAmount)}
          </span>
          <span className="text-slate-500 dark:text-slate-400">(공급가)</span>
          {taxAmount !== 0 && (
            <>
              <span className="text-slate-400">−</span>
              <span className="text-slate-600 dark:text-slate-300">
                {formatCurrency(taxAmount)} (세금)
              </span>
            </>
          )}
          <span className="text-slate-400">=</span>
          <span className="font-bold text-blue-700 dark:text-blue-300">
            {formatCurrency(actualAmount)} (실지급액)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-xs">카테고리</span>
          <p className="font-medium text-slate-800 dark:text-slate-200">{data.category}</p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-xs">발생일</span>
          <p className="font-medium text-slate-800 dark:text-slate-200">
            {format(new Date(data.occurred_at), 'yyyy.MM.dd', { locale: ko })}
          </p>
        </div>
        <div className="col-span-2">
          <span className="text-slate-500 dark:text-slate-400 block text-xs">프로젝트</span>
          <p className="font-medium text-slate-800 dark:text-slate-200">
            {data.projects?.name ?? '미지정'}
          </p>
        </div>
      </div>

      {data.memo && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400">메모</span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
            {data.memo}
          </p>
        </div>
      )}
    </div>
  );
}

function PartnerSettlementContent({ data }: { data: PartnerSettlement }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4">
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400">정산 기간</span>
          <p className="font-medium text-slate-800 dark:text-slate-200">
            {format(new Date(data.period_start), 'yyyy.MM.dd', { locale: ko })} ~{' '}
            {format(new Date(data.period_end), 'yyyy.MM.dd', { locale: ko })}
          </p>
        </div>
        <span className={cn(
          'rounded px-2 py-0.5 text-xs font-semibold',
          data.status === 'paid' && 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
          data.status === 'confirmed' && 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
          data.status === 'draft' && 'bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300'
        )}>
          {STATUS_LABELS[data.status] ?? data.status}
        </span>
      </div>

      <div className="rounded-lg border-2 border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/20 p-4">
        <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
          실지급액
        </h4>
        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
          {formatCurrency(data.partner_amount)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400 block">총 매출</span>
          <p className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(data.total_revenue)}</p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block">총 지출</span>
          <p className="font-medium text-red-500 dark:text-red-400">{formatCurrency(data.total_expense)}</p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block">순수익</span>
          <p className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(data.net_profit)}</p>
        </div>
      </div>

      {data.partner_settlement_projects && data.partner_settlement_projects.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">프로젝트별 내역</p>
          {data.partner_settlement_projects.map((proj) => (
            <div
              key={proj.id}
              className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0"
            >
              <span className="text-slate-700 dark:text-slate-300">{proj.project?.name ?? `프로젝트 #${proj.project_id}`}</span>
              <div className="flex gap-2">
                <span className="text-slate-400">{proj.share_rate}%</span>
                <span className="font-medium text-violet-600 dark:text-violet-400">
                  {formatCurrency(proj.partner_amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.memo && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400">메모</span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
            {data.memo}
          </p>
        </div>
      )}
    </div>
  );
}

export function SettlementDetailDialog({
  open,
  onOpenChange,
  payload,
}: SettlementDetailDialogProps) {
  if (!payload) return null;

  const isLegacy = payload.type === 'legacy';
  const title = isLegacy
    ? payload.data.name
    : `${format(new Date(payload.data.period_start), 'yyyy.MM.dd', { locale: ko })} ~ ${format(new Date(payload.data.period_end), 'yyyy.MM.dd', { locale: ko })} 정산`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <Wallet className="h-5 w-5 text-indigo-500" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-left">
            {isLegacy ? '정산 상세 및 세금 계산' : '파트너 정산 상세'}
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          {isLegacy ? (
            <LegacySettlementContent data={payload.data} />
          ) : (
            <PartnerSettlementContent data={payload.data} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
