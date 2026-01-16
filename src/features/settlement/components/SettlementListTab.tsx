'use client';

import { useState, useMemo } from 'react';
import { Plus, FileText, Search, Filter, ChevronDown, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePartnerSettlements, useDeleteSettlement, usePartnerOptions } from '../hooks';
import type { PartnerSettlement, SettlementStatus } from '../types';
import { SETTLEMENT_STATUS_LABELS, SETTLEMENT_STATUS_COLORS } from '../types';
import { CreateSettlementModal } from './CreateSettlementModal';
import { SettlementDetailModal } from './SettlementDetailModal';

export function SettlementListTab() {
  const { data: settlements = [], isLoading } = usePartnerSettlements();
  const { data: partners = [] } = usePartnerOptions();
  const deleteMutation = useDeleteSettlement();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SettlementStatus | 'all'>('all');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<PartnerSettlement | null>(null);

  const filteredSettlements = useMemo(() => {
    return settlements.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (partnerFilter !== 'all' && String(s.partnerId) !== partnerFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!s.partnerName.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [settlements, statusFilter, partnerFilter, searchTerm]);

  const handleDelete = async (settlement: PartnerSettlement) => {
    if (!window.confirm(`${settlement.partnerName}의 정산서를 삭제하시겠습니까?`)) return;
    await deleteMutation.mutateAsync(settlement.id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 필터 영역 - 모바일 최적화 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="파트너명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[110px] sm:w-[130px]">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="draft">작성중</SelectItem>
              <SelectItem value="confirmed">확정</SelectItem>
              <SelectItem value="paid">지급완료</SelectItem>
            </SelectContent>
          </Select>

          <Select value={partnerFilter} onValueChange={setPartnerFilter}>
            <SelectTrigger className="w-[130px] sm:w-[180px]">
              <SelectValue placeholder="파트너" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 파트너</SelectItem>
              {partners.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => setIsCreateModalOpen(true)} className="ml-auto sm:ml-0">
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">정산서 생성</span>
          </Button>
        </div>
      </div>

      {/* 모바일: 카드 레이아웃 */}
      <div className="block sm:hidden space-y-3">
        {filteredSettlements.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            정산서가 없습니다.
          </div>
        ) : (
          filteredSettlements.map((settlement) => (
            <div
              key={settlement.id}
              className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50"
              onClick={() => setSelectedSettlement(settlement)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {settlement.partnerName}
                    </h4>
                    <span
                      className={cn(
                        'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0',
                        SETTLEMENT_STATUS_COLORS[settlement.status]
                      )}
                    >
                      {SETTLEMENT_STATUS_LABELS[settlement.status]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {format(new Date(settlement.periodStart), 'yy.MM.dd', { locale: ko })}
                    {' ~ '}
                    {format(new Date(settlement.periodEnd), 'yy.MM.dd', { locale: ko })}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSettlement(settlement);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {settlement.status === 'draft' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(settlement);
                      }}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-xs text-slate-500">순수익</p>
                  <span
                    className={cn(
                      'font-semibold text-sm',
                      settlement.netProfit >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {formatCurrency(settlement.netProfit)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">파트너 몫</p>
                  <span className="font-semibold text-sm text-violet-600 dark:text-violet-400">
                    {formatCurrency(settlement.partnerAmount)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 데스크탑: 테이블 레이아웃 */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="w-full text-sm min-w-[650px]">
          <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">파트너</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">기간</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">순수익</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">파트너 몫</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">상태</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredSettlements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  정산서가 없습니다.
                </td>
              </tr>
            ) : (
              filteredSettlements.map((settlement) => (
                <tr
                  key={settlement.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedSettlement(settlement)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {settlement.partnerName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {format(new Date(settlement.periodStart), 'yyyy.MM.dd', { locale: ko })}
                    {' ~ '}
                    {format(new Date(settlement.periodEnd), 'yyyy.MM.dd', { locale: ko })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'font-semibold',
                        settlement.netProfit >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {formatCurrency(settlement.netProfit)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-violet-600 dark:text-violet-400">
                    {formatCurrency(settlement.partnerAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                        SETTLEMENT_STATUS_COLORS[settlement.status]
                      )}
                    >
                      {SETTLEMENT_STATUS_LABELS[settlement.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSettlement(settlement);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {settlement.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(settlement);
                          }}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isCreateModalOpen && (
        <CreateSettlementModal onClose={() => setIsCreateModalOpen(false)} />
      )}

      {selectedSettlement && (
        <SettlementDetailModal
          settlement={selectedSettlement}
          onClose={() => setSelectedSettlement(null)}
        />
      )}
    </div>
  );
}
