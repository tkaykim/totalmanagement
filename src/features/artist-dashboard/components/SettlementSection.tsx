'use client';

import { useState } from 'react';
import { Wallet, Calendar, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ArtistSettlement, PartnerSettlement, SettlementDetailPayload, SettlementTab } from '../types';

interface SettlementSectionProps {
  settlements: ArtistSettlement[];
  partnerSettlements?: PartnerSettlement[];
  summary: {
    draft?: { count: number; amount: number };
    confirmed?: { count: number; amount: number };
    planned?: { count: number; amount: number };
    paid: { count: number; amount: number };
    canceled?: { count: number; amount: number };
    total: { count: number; amount: number };
    this_month?: { count: number; amount: number };
  };
  onSettlementClick?: (payload: SettlementDetailPayload) => void;
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  draft: {
    label: '작성중',
    bg: 'bg-gray-100 dark:bg-gray-900/50',
    text: 'text-gray-700 dark:text-gray-300',
  },
  confirmed: {
    label: '확정',
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-700 dark:text-blue-300',
  },
  planned: {
    label: '예정',
    bg: 'bg-yellow-100 dark:bg-yellow-900/50',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
  paid: {
    label: '완료',
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  canceled: {
    label: '취소',
    bg: 'bg-red-100 dark:bg-red-900/50',
    text: 'text-red-700 dark:text-red-300',
  },
};

const formatCurrency = (value: number) =>
  `₩ ${value.toLocaleString('ko-KR')}`;

export function SettlementSection({ 
  settlements, 
  partnerSettlements = [],
  summary,
  onSettlementClick 
}: SettlementSectionProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'confirmed' | 'paid'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'partner' | 'legacy'>(
    partnerSettlements.length > 0 ? 'partner' : 'legacy'
  );

  // 새로운 정산 시스템
  const filteredPartnerSettlements = activeTab === 'all' 
    ? partnerSettlements.filter((s) => s.status !== 'draft')
    : partnerSettlements.filter((s) => s.status === activeTab);

  // 기존 정산 (하위 호환성)
  const filteredSettlements = activeTab === 'all' 
    ? settlements.filter((s) => s.status !== 'canceled')
    : settlements.filter((s) => s.status === (activeTab === 'confirmed' ? 'planned' : activeTab));

  // 월별 그룹핑 (기존)
  const groupedByMonth = filteredSettlements.reduce((acc, settlement) => {
    const monthKey = format(new Date(settlement.occurred_at), 'yyyy-MM');
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(settlement);
    return acc;
  }, {} as Record<string, ArtistSettlement[]>);

  const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-indigo-500" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">정산 내역</h3>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-4">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
            {partnerSettlements.length > 0 ? '확정 대기' : '예정'}
          </p>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
            {formatCurrency(summary.confirmed?.amount || summary.planned?.amount || 0)}
          </p>
          <p className="text-xs text-blue-500 dark:text-blue-400">
            {summary.confirmed?.count || summary.planned?.count || 0}건
          </p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 p-4">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
            정산 완료
          </p>
          <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
            {formatCurrency(summary.paid.amount)}
          </p>
          <p className="text-xs text-emerald-500 dark:text-emerald-400">
            {summary.paid.count}건
          </p>
        </div>
      </div>

      {/* 탭 */}
      <div className="mb-4 flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
            activeTab === 'all'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
          )}
        >
          전체
        </button>
        <button
          onClick={() => setActiveTab('confirmed')}
          className={cn(
            'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
            activeTab === 'confirmed'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
          )}
        >
          확정 ({summary.confirmed?.count || summary.planned?.count || 0})
        </button>
        <button
          onClick={() => setActiveTab('paid')}
          className={cn(
            'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
            activeTab === 'paid'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
          )}
        >
          완료 ({summary.paid.count})
        </button>
      </div>

      {/* 정산 목록 - 새 시스템 */}
      {partnerSettlements.length > 0 && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {filteredPartnerSettlements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400 dark:text-slate-500">
                정산 내역이 없습니다.
              </p>
            </div>
          ) : (
            filteredPartnerSettlements.map((settlement) => {
              const statusConfig = STATUS_STYLES[settlement.status] || STATUS_STYLES.draft;
              const isExpanded = expandedId === settlement.id;

              return (
                <div
                  key={settlement.id}
                  className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setExpandedId(isExpanded ? null : settlement.id);
                      onSettlementClick?.({ type: 'partner', data: settlement });
                    }}
                    className="flex items-center justify-between w-full p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <FileText className="h-3 w-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {format(new Date(settlement.period_start), 'yyyy.MM.dd', { locale: ko })} ~ {format(new Date(settlement.period_end), 'yyyy.MM.dd', { locale: ko })}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {settlement.partner_settlement_projects?.length || 0}개 프로젝트
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'rounded px-2 py-0.5 text-[10px] font-semibold',
                        statusConfig.bg,
                        statusConfig.text
                      )}>
                        {statusConfig.label}
                      </span>
                      <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                        {formatCurrency(settlement.partner_amount)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <div className="grid grid-cols-3 gap-2 pt-3 text-xs mb-3">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">총 매출</span>
                          <p className="font-medium text-blue-600">{formatCurrency(settlement.total_revenue)}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">총 지출</span>
                          <p className="font-medium text-red-500">{formatCurrency(settlement.total_expense)}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">순수익</span>
                          <p className="font-medium text-emerald-600">{formatCurrency(settlement.net_profit)}</p>
                        </div>
                      </div>
                      
                      {settlement.partner_settlement_projects && settlement.partner_settlement_projects.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">프로젝트별 내역</p>
                          {settlement.partner_settlement_projects.map((proj) => (
                            <div key={proj.id} className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                              <span className="text-slate-600 dark:text-slate-300">{proj.project?.name}</span>
                              <div className="flex gap-2">
                                <span className="text-slate-400">{proj.share_rate}%</span>
                                <span className="font-medium text-violet-600">{formatCurrency(proj.partner_amount)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {settlement.memo && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                          <span className="text-xs text-slate-500 dark:text-slate-400">메모</span>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{settlement.memo}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 기존 정산 목록 (하위 호환성) */}
      {partnerSettlements.length === 0 && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {filteredSettlements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400 dark:text-slate-500">
                정산 내역이 없습니다.
              </p>
            </div>
          ) : (
            sortedMonths.map((monthKey) => {
              const monthSettlements = groupedByMonth[monthKey];
              const monthTotal = monthSettlements.reduce(
                (sum, s) => sum + (s.actual_amount || s.amount || 0), 
                0
              );
              const monthLabel = format(new Date(monthKey + '-01'), 'yyyy년 M월', { locale: ko });

              return (
                <div key={monthKey} className="space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {monthLabel}
                    </h4>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {formatCurrency(monthTotal)}
                    </span>
                  </div>
                  
                  {monthSettlements.map((settlement) => {
                    const statusConfig = STATUS_STYLES[settlement.status] || STATUS_STYLES.planned;
                    const isExpanded = expandedId === settlement.id;

                    return (
                      <div
                        key={settlement.id}
                        className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            setExpandedId(isExpanded ? null : settlement.id);
                            onSettlementClick?.({ type: 'legacy', data: settlement });
                          }}
                          className="flex items-center justify-between w-full p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(settlement.occurred_at), 'M/d')}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                {settlement.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {settlement.projects?.name || '프로젝트 미지정'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'rounded px-2 py-0.5 text-[10px] font-semibold',
                              statusConfig.bg,
                              statusConfig.text
                            )}>
                              {statusConfig.label}
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(settlement.actual_amount || settlement.amount)}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-0 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">카테고리</span>
                                <p className="font-medium text-slate-700 dark:text-slate-300">{settlement.category}</p>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">지급 방식</span>
                                <p className="font-medium text-slate-700 dark:text-slate-300">
                                  {settlement.payment_method === 'vat_included' && '부가세 포함'}
                                  {settlement.payment_method === 'tax_free' && '면세'}
                                  {settlement.payment_method === 'withholding' && '원천징수 3.3%'}
                                  {settlement.payment_method === 'actual_payment' && '실지급액'}
                                  {!settlement.payment_method && '-'}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">공급가</span>
                                <p className="font-medium text-slate-700 dark:text-slate-300">
                                  {formatCurrency(settlement.amount)}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">실지급액</span>
                                <p className="font-medium text-slate-700 dark:text-slate-300">
                                  {formatCurrency(settlement.actual_amount || settlement.amount)}
                                </p>
                              </div>
                              {settlement.memo && (
                                <div className="col-span-2">
                                  <span className="text-slate-500 dark:text-slate-400">메모</span>
                                  <p className="font-medium text-slate-700 dark:text-slate-300">{settlement.memo}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
