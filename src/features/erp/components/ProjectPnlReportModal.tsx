'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  Save,
  Lightbulb,
  Wrench,
  StickyNote,
  Loader2,
  RefreshCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { ProjectPnlReportWithProfit } from '@/types/database';

interface PnlReportApiResponse {
  data: ProjectPnlReportWithProfit | null;
  aggregated: {
    actual_revenue: number;
    actual_expense: number;
  };
}

interface ProjectPnlReportModalProps {
  projectId: number;
  projectName: string;
  /** 프로젝트의 종료일(또는 행사일). 회고 시점 표시용 */
  projectEndDate?: string;
  /** 보고서 저장 후 콜백 */
  onSaved?: () => void;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  {
    value: 'draft',
    label: '작성 중',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  {
    value: 'finalized',
    label: '확정',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
] as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function calculateRate(numerator: number, denominator: number): number | null {
  if (!denominator || denominator === 0) return null;
  return Math.round(((numerator - denominator) / denominator) * 1000) / 10;
}

export function ProjectPnlReportModal({
  projectId,
  projectName,
  projectEndDate,
  onSaved,
  onClose,
}: ProjectPnlReportModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [aggregated, setAggregated] = useState({ actual_revenue: 0, actual_expense: 0 });
  const [form, setForm] = useState({
    target_revenue: 0,
    target_expense: 0,
    actual_revenue: 0,
    actual_expense: 0,
    highlights: '',
    improvements: '',
    additional_notes: '',
    status: 'draft' as 'draft' | 'finalized',
  });
  const [existing, setExisting] = useState<ProjectPnlReportWithProfit | null>(null);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/pnl-report`);
      if (!res.ok) throw new Error('보고서 조회 실패');
      const json = (await res.json()) as PnlReportApiResponse;
      setAggregated(json.aggregated);
      if (json.data) {
        setExisting(json.data);
        setForm({
          target_revenue: Number(json.data.target_revenue) || 0,
          target_expense: Number(json.data.target_expense) || 0,
          actual_revenue: Number(json.data.actual_revenue) || 0,
          actual_expense: Number(json.data.actual_expense) || 0,
          highlights: json.data.highlights ?? '',
          improvements: json.data.improvements ?? '',
          additional_notes: json.data.additional_notes ?? '',
          status: json.data.status,
        });
      } else {
        // 신규 작성: 자동 집계된 값을 actual에 미리 채워줌
        setForm((prev) => ({
          ...prev,
          actual_revenue: json.aggregated.actual_revenue,
          actual_expense: json.aggregated.actual_expense,
        }));
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: '보고서 불러오기 실패',
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /** 자동 집계값으로 actual 필드 동기화 */
  const handleSyncFromFinance = () => {
    setForm((prev) => ({
      ...prev,
      actual_revenue: aggregated.actual_revenue,
      actual_expense: aggregated.actual_expense,
    }));
    toast({
      title: '재무 데이터 동기화',
      description: 'financial_entries 합계로 실적을 갱신했습니다.',
    });
  };

  const handleSave = async (statusOverride?: 'draft' | 'finalized') => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        status: statusOverride ?? form.status,
      };
      const res = await fetch(`/api/projects/${projectId}/pnl-report`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || '저장 실패');
      }
      toast({
        title: payload.status === 'finalized' ? 'P&L 보고서 확정' : 'P&L 보고서 저장',
        description: payload.status === 'finalized'
          ? '확정 상태로 저장되었습니다.'
          : '작성 중 상태로 저장되었습니다.',
      });
      onSaved?.();
      onClose();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsSaving(false);
    }
  };

  /** 파생 지표 */
  const derived = useMemo(() => {
    const targetNet = form.target_revenue - form.target_expense;
    const actualNet = form.actual_revenue - form.actual_expense;
    const revenueRate = calculateRate(form.actual_revenue, form.target_revenue);
    const expenseRate = calculateRate(form.actual_expense, form.target_expense);
    const profitMargin = form.actual_revenue > 0
      ? Math.round((actualNet / form.actual_revenue) * 1000) / 10
      : null;
    return { targetNet, actualNet, revenueRate, expenseRate, profitMargin };
  }, [form]);

  const isFinalized = form.status === 'finalized';
  const aggregatedDiffers =
    aggregated.actual_revenue !== form.actual_revenue ||
    aggregated.actual_expense !== form.actual_expense;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/30 dark:to-emerald-900/30 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="rounded-xl bg-white/70 dark:bg-slate-700/70 p-2.5 flex-shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
                  P&L 회고 보고서
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {projectName}
                  {projectEndDate ? ` · ${projectEndDate} 종료` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                  STATUS_OPTIONS.find((o) => o.value === form.status)?.color,
                )}
              >
                {STATUS_OPTIONS.find((o) => o.value === form.status)?.label}
              </span>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 dark:bg-slate-600/80 text-slate-500 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              불러오는 중...
            </div>
          ) : (
            <>
              {/* 1. 목표 vs 실적 */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    1. 목표 vs 실적
                  </h3>
                  <button
                    onClick={handleSyncFromFinance}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                      aggregatedDiffers
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
                    )}
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    재무 데이터로 채우기
                    {aggregatedDiffers && (
                      <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px]">
                        실시간 ₩{formatCurrency(aggregated.actual_revenue - aggregated.actual_expense)}
                      </span>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 매출 */}
                  <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-900/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
                      <TrendingUp className="h-4 w-4" />
                      매출
                    </div>
                    <CurrencyField
                      label="목표 매출"
                      value={form.target_revenue}
                      onChange={(v) => setForm((prev) => ({ ...prev, target_revenue: v }))}
                      disabled={isFinalized}
                      colorClass="text-blue-700 dark:text-blue-300"
                    />
                    <CurrencyField
                      label="실제 매출"
                      value={form.actual_revenue}
                      onChange={(v) => setForm((prev) => ({ ...prev, actual_revenue: v }))}
                      disabled={isFinalized}
                      colorClass="text-blue-700 dark:text-blue-300"
                      hint={`자동 집계: ₩${formatCurrency(aggregated.actual_revenue)}`}
                    />
                    {derived.revenueRate !== null && (
                      <div className="flex items-center justify-between pt-1 border-t border-blue-100 dark:border-blue-900">
                        <span className="text-xs text-slate-500">목표 대비</span>
                        <span
                          className={cn(
                            'text-sm font-bold',
                            derived.revenueRate >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400',
                          )}
                        >
                          {derived.revenueRate >= 0 ? '+' : ''}
                          {derived.revenueRate.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 지출 */}
                  <div className="rounded-xl border border-rose-100 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-900/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
                      <TrendingDown className="h-4 w-4" />
                      지출
                    </div>
                    <CurrencyField
                      label="목표 지출"
                      value={form.target_expense}
                      onChange={(v) => setForm((prev) => ({ ...prev, target_expense: v }))}
                      disabled={isFinalized}
                      colorClass="text-rose-700 dark:text-rose-300"
                    />
                    <CurrencyField
                      label="실제 지출"
                      value={form.actual_expense}
                      onChange={(v) => setForm((prev) => ({ ...prev, actual_expense: v }))}
                      disabled={isFinalized}
                      colorClass="text-rose-700 dark:text-rose-300"
                      hint={`자동 집계: ₩${formatCurrency(aggregated.actual_expense)}`}
                    />
                    {derived.expenseRate !== null && (
                      <div className="flex items-center justify-between pt-1 border-t border-rose-100 dark:border-rose-900">
                        <span className="text-xs text-slate-500">목표 대비</span>
                        <span
                          className={cn(
                            'text-sm font-bold',
                            derived.expenseRate <= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400',
                          )}
                        >
                          {derived.expenseRate >= 0 ? '+' : ''}
                          {derived.expenseRate.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 순이익 요약 */}
                <div className="rounded-xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-900/10 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">목표 순이익</p>
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                        ₩{formatCurrency(derived.targetNet)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">실제 순이익</p>
                      <p
                        className={cn(
                          'text-lg font-bold',
                          derived.actualNet >= 0
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-rose-700 dark:text-rose-300',
                        )}
                      >
                        ₩{formatCurrency(derived.actualNet)}
                      </p>
                    </div>
                  </div>
                  {derived.profitMargin !== null && (
                    <div className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-900 text-center">
                      <span className="text-xs text-slate-500 mr-2">순이익률</span>
                      <span
                        className={cn(
                          'text-base font-bold',
                          derived.profitMargin >= 0
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-rose-700 dark:text-rose-300',
                        )}
                      >
                        {derived.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. 회고 - 좋았던 점 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  2. 좋았던 점
                </h3>
                <textarea
                  value={form.highlights}
                  onChange={(e) => setForm((prev) => ({ ...prev, highlights: e.target.value }))}
                  disabled={isFinalized}
                  placeholder="이번 프로젝트에서 잘된 점, 성공 요인, 인상적이었던 순간 등을 기록하세요."
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 resize-none"
                />
              </section>

              {/* 3. 회고 - 개선점 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-500" />
                  3. 개선점
                </h3>
                <textarea
                  value={form.improvements}
                  onChange={(e) => setForm((prev) => ({ ...prev, improvements: e.target.value }))}
                  disabled={isFinalized}
                  placeholder="다음 프로젝트에서 개선해야 할 점, 부족했던 부분, 새 시도 아이디어 등을 기록하세요."
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 resize-none"
                />
              </section>

              {/* 4. 기타 메모 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-slate-500" />
                  4. 기타 메모 (선택)
                </h3>
                <textarea
                  value={form.additional_notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, additional_notes: e.target.value }))}
                  disabled={isFinalized}
                  placeholder="공유할 만한 인사이트, 외부 협력사 평가, 다음 분기 액션 아이템 등."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 resize-none"
                />
              </section>

              {existing && (
                <p className="text-xs text-slate-400 text-right">
                  마지막 수정: {new Date(existing.updated_at).toLocaleString('ko-KR')}
                  {existing.finalized_at && ` · 확정: ${new Date(existing.finalized_at).toLocaleString('ko-KR')}`}
                </p>
              )}
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              {isFinalized ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  확정된 보고서는 수정이 잠겨 있습니다. 다시 편집하려면 상태를 변경하세요.
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  확정 후에는 자동으로 수정이 잠깁니다.
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isFinalized && (
                <button
                  onClick={() =>
                    setForm((prev) => ({ ...prev, status: 'draft' }))
                  }
                  disabled={isSaving}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  편집 잠금 해제
                </button>
              )}
              <button
                onClick={() => handleSave('draft')}
                disabled={isSaving || isLoading}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                임시 저장
              </button>
              <button
                onClick={() => handleSave('finalized')}
                disabled={isSaving || isLoading || isFinalized}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isFinalized ? '이미 확정됨' : '보고서 확정'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CurrencyFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  colorClass?: string;
  hint?: string;
}

function CurrencyField({ label, value, onChange, disabled, colorClass, hint }: CurrencyFieldProps) {
  const [raw, setRaw] = useState<string>(formatCurrency(value));

  useEffect(() => {
    setRaw(formatCurrency(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(/[^0-9]/g, '');
    setRaw(next ? Number(next).toLocaleString('ko-KR') : '');
    onChange(next ? Number(next) : 0);
  };

  return (
    <div className="space-y-1">
      <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{label}</label>
      <div className="flex items-center gap-1.5">
        <span className={cn('text-sm font-bold', colorClass)}>₩</span>
        <input
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-2.5 py-1.5 text-sm font-bold text-right outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60',
            colorClass,
          )}
        />
      </div>
      {hint && <p className="text-[10px] text-slate-400 text-right">{hint}</p>}
    </div>
  );
}
