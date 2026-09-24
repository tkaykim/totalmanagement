'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Building2, User, Calculator, Calendar, Tag, FileText, Wallet, ChevronDown, Check, Search, Users, MapPin, ExternalLink, MessageCircle, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, BU, FinancialEntryStatus } from '@/features/erp/types';
import { CommentSection } from '@/features/comments/components/CommentSection';
import { BU_CODES, BU_NAMES as BU_TITLES } from '@/lib/business-units';
import { getTodayKST } from '@/lib/timezone';
import type { AppUser as PermAppUser } from '@/lib/permissions';
import { ChangeLogList } from './ChangeLogList';
import {
  FINANCE_STATUS_LABELS,
  defaultPaidAtDate,
  getAvailableTransitions,
  getFinanceEntryActions,
  isDueDateRequired,
  isPaidAtVisible,
  validateFinanceDateForm,
  type FinanceEntryView,
} from '../finance-ui';

// 지급처 유형별 아이콘 및 라벨 설정
const ENTITY_TYPE_CONFIG = {
  person: { icon: User, label: '개인/인력', emoji: '👤' },
  organization: { icon: Building2, label: '회사/조직', emoji: '🏢' },
  team: { icon: Users, label: '팀', emoji: '👥' },
  venue: { icon: MapPin, label: '장소', emoji: '📍' },
} as const;

type EntityType = keyof typeof ENTITY_TYPE_CONFIG | '';

const STATUS_CONFIG = {
  planned: { label: '예정', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  paid: { label: '완료', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
  canceled: { label: '취소', color: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
};

function FormField({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon?: typeof Tag;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      readOnly={readOnly}
      className={cn(
        "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900",
        readOnly && "bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed",
        className
      )}
    />
  );
}

function formatWithCommas(value: string): string {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

function stripCommas(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  className,
}: {
  value: string;
  onChange: (rawValue: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatWithCommas(value)}
      onChange={(e) => onChange(stripCommas(e.target.value))}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900",
        className
      )}
    />
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// 검색 가능한 드롭다운 컴포넌트
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '검색하세요',
  emptyMessage = '결과가 없습니다',
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; emoji?: string }[];
  placeholder?: string;
  emptyMessage?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [options, searchQuery]);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* 선택된 값 또는 트리거 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm text-left outline-none transition flex items-center justify-between",
          isOpen && "border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900"
        )}
      >
        <span className={cn(!selectedOption && "text-slate-400")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <X className="h-3 w-3 text-slate-400" />
            </button>
          )}
          <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", isOpen && "rotate-180")} />
        </div>
      </button>

      {/* 드롭다운 패널 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
          {/* 검색 입력 */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색..."
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* 옵션 목록 */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between",
                    value === opt.value && "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  )}
                >
                  <span>{opt.label}</span>
                  {value === opt.value && <Check className="h-4 w-4" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusButton({
  status,
  currentStatus,
  onClick,
}: {
  status: FinancialEntryStatus;
  currentStatus: FinancialEntryStatus;
  onClick: () => void;
}) {
  const config = STATUS_CONFIG[status];
  const isActive = currentStatus === status;
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 py-2 text-xs font-medium rounded-lg transition",
        isActive ? config.color : "bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
      )}
    >
      {config.label}
    </button>
  );
}

function HeaderChipDropdown({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label || '선택';

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition"
      >
        {selectedLabel}
        <ChevronDown className={cn("h-3 w-3 transition", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between",
                value === opt.value && "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              )}
            >
              {opt.label}
              {value === opt.value && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 기한·입금일 입력 (R14): 예정이면 기한 필수, 완료로 저장하면 입금·지급일(기본값 오늘, 수정 가능) */
function FinanceDateFields({
  status,
  dueDate,
  paidAtDate,
  paidAtRequired = true,
  onDueDateChange,
  onPaidAtDateChange,
}: {
  status: FinancialEntryStatus;
  dueDate: string;
  paidAtDate: string;
  paidAtRequired?: boolean;
  onDueDateChange: (v: string) => void;
  onPaidAtDateChange: (v: string) => void;
}) {
  const dueRequired = isDueDateRequired(status);
  const showPaidAt = isPaidAtVisible(status);
  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField label={dueRequired ? '기한 *' : '기한 (선택)'} icon={Calendar}>
        <Input type="date" value={dueDate} onChange={onDueDateChange} />
      </FormField>
      {showPaidAt ? (
        <FormField label={paidAtRequired ? '입금·지급일 *' : '입금·지급일'} icon={Calendar}>
          <Input type="date" value={paidAtDate} onChange={onPaidAtDateChange} />
        </FormField>
      ) : (
        <div className="self-end pb-2 text-[11px] text-slate-400 dark:text-slate-500">
          {status === 'planned' ? '예정 건은 받을·줄 기한이 필요합니다.' : '취소 건은 날짜 없이 저장됩니다.'}
        </div>
      )}
    </div>
  );
}

export function CreateFinanceModal({
  mode,
  onClose,
  onSubmit,
  projects,
  partnersData,
  calculateActualAmount,
  defaultProjectId,
}: {
  mode: 'revenue' | 'expense';
  onClose: () => void;
  onSubmit: (payload: {
    type: 'revenue' | 'expense';
    projectId: string;
    bu: BU;
    entryScope: 'external' | 'internal_allocation';
    counterpartyBu?: BU | '';
    memo?: string;
    cat: string;
    name: string;
    amount: string;
    date: string;
    dueDate: string;
    paidAtDate: string;
    status: FinancialEntryStatus;
    partnerId?: string;
    paymentMethod?: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '';
  }) => Promise<string | null>;
  projects: Project[];
  partnersData?: { id: number; display_name: string; entity_type: string }[];
  calculateActualAmount: (amount: number, paymentMethod: string) => number | null;
  defaultProjectId?: string | null;
}) {
  const defaultProject = defaultProjectId
    ? projects.find((p) => p.id === defaultProjectId)
    : null;
  const hasPreselectedProject = !!defaultProjectId;

  const [form, setForm] = useState({
    projectId: defaultProject?.id ?? '',
    bu: defaultProject?.bu ?? 'GRIGO',
    entryScope: 'external' as 'external' | 'internal_allocation',
    counterpartyBu: '' as BU | '',
    memo: '',
    cat: '',
    name: '',
    amount: '',
    date: '',
    dueDate: '',
    paidAtDate: getTodayKST(),
    status: 'planned' as FinancialEntryStatus,
    partnerEntityFilter: '' as EntityType,
    partnerId: '',
    paymentMethod: '' as 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '',
  });

  // 지급처 옵션 생성 (필터링 + 검색용)
  const partnerOptions = useMemo(() => {
    return (partnersData || [])
      .filter((p) => !form.partnerEntityFilter || p.entity_type === form.partnerEntityFilter)
      .map((p) => {
        const config = ENTITY_TYPE_CONFIG[p.entity_type as keyof typeof ENTITY_TYPE_CONFIG];
        return {
          value: String(p.id),
          label: `${config?.emoji || '❓'} ${p.display_name}`,
        };
      });
  }, [partnersData, form.partnerEntityFilter]);
  const [error, setError] = useState<string>('');
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRevenue = mode === 'revenue';
  const Icon = isRevenue ? TrendingUp : TrendingDown;

  const actualAmount = form.amount && form.paymentMethod
    ? calculateActualAmount(Number(form.amount), form.paymentMethod)
    : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={cn(
          "px-6 py-4",
          isRevenue ? "bg-blue-50 dark:bg-blue-900/20" : "bg-red-50 dark:bg-red-900/20"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                isRevenue ? "bg-blue-100 dark:bg-blue-900/50" : "bg-red-100 dark:bg-red-900/50"
              )}>
                <Icon className={cn("h-4 w-4", isRevenue ? "text-blue-600" : "text-red-600")} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {isRevenue ? '매출 등록' : '지출 등록'}
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>
          {/* 사업부/프로젝트 칩 - 프로젝트가 미리 선택된 경우에만 헤더에 표시 */}
          {hasPreselectedProject && (
            <div className="flex items-center gap-2">
              <HeaderChipDropdown
                value={form.bu}
                options={BU_CODES.map((k) => ({ value: k, label: BU_TITLES[k] }))}
                onChange={(val) => {
                  const nextBu = val as BU;
                  const firstProject = projects.find((p) => p.bu === nextBu)?.id ?? '';
                  setForm((prev) => ({ ...prev, bu: nextBu, projectId: firstProject || prev.projectId }));
                }}
              />
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <HeaderChipDropdown
                value={form.projectId}
                options={projects.filter((p) => p.bu === form.bu).map((p) => ({ value: p.id, label: p.name }))}
                onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
              />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* 사업부/프로젝트 선택 - 프로젝트가 미리 선택되지 않은 경우 바디에 표시 */}
          {!hasPreselectedProject && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="사업부">
                <Select
                  value={form.bu}
                  onChange={(val) => {
                    const nextBu = val as BU;
                    setForm((prev) => ({ ...prev, bu: nextBu, projectId: '' }));
                  }}
                  options={BU_CODES.map((k) => ({ value: k, label: BU_TITLES[k] }))}
                />
              </FormField>
              <FormField label="프로젝트">
                <Select
                  value={form.projectId}
                  onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
                  options={[
                    { value: '', label: '프로젝트 선택' },
                    ...projects.filter((p) => p.bu === form.bu).map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </FormField>
            </div>
          )}

          {/* 항목명 + 구분 */}
          <div className="space-y-3">
            <FormField label="항목명" icon={FileText}>
              <Input
                value={form.name}
                onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
                placeholder="항목명을 입력하세요"
              />
            </FormField>
            <FormField label="구분" icon={Tag}>
              <Input
                value={form.cat}
                onChange={(v) => setForm((prev) => ({ ...prev, cat: v }))}
                placeholder="예: 선금, 광고비, 인건비"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="거래 범위">
              <Select
                value={form.entryScope}
                onChange={(value) => setForm((prev) => ({
                  ...prev,
                  entryScope: value as 'external' | 'internal_allocation',
                  counterpartyBu: value === 'internal_allocation' ? prev.counterpartyBu : '',
                }))}
                options={[
                  { value: 'external', label: '외부 거래' },
                  { value: 'internal_allocation', label: '내부배부(사업부 간)' },
                ]}
              />
            </FormField>
            <FormField label="상대 사업부">
              <Select
                value={form.counterpartyBu}
                onChange={(value) => setForm((prev) => ({ ...prev, counterpartyBu: value as BU | '' }))}
                placeholder={form.entryScope === 'internal_allocation' ? '상대 사업부 선택' : '외부 거래는 선택하지 않음'}
                options={BU_CODES
                  .filter((code) => code !== form.bu)
                  .map((code) => ({ value: code, label: BU_TITLES[code] }))}
              />
            </FormField>
          </div>

          <FormField label="메모" icon={FileText}>
            <textarea
              value={form.memo}
              onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
              placeholder="거래 성격, 입금·지급 근거, Clobe 거래 ID 등을 기록하세요"
              rows={3}
              className="w-full resize-y rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
            />
          </FormField>

          {/* 금액 + 결제일 */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="금액" icon={Wallet}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₩</span>
                  <CurrencyInput
                    value={form.amount}
                    onChange={(v) => setForm((prev) => ({ ...prev, amount: v }))}
                    placeholder="0"
                    className="pl-7"
                  />
                </div>
              </FormField>
              <FormField label="결제일" icon={Calendar}>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(v) => setForm((prev) => ({ ...prev, date: v }))}
                />
              </FormField>
            </div>

          {/* 상태 선택 */}
          <FormField label="상태">
            <div className="flex gap-2">
              {(['planned', 'paid', 'canceled'] as const).map((status) => (
                <StatusButton
                  key={status}
                  status={status}
                  currentStatus={form.status}
                  onClick={() => setForm((prev) => ({ ...prev, status }))}
                />
              ))}
            </div>
          </FormField>

          {/* 기한·입금일 (R14) */}
          <FinanceDateFields
            status={form.status}
            dueDate={form.dueDate}
            paidAtDate={form.paidAtDate}
            onDueDateChange={(v) => setForm((prev) => ({ ...prev, dueDate: v }))}
            onPaidAtDateChange={(v) => setForm((prev) => ({ ...prev, paidAtDate: v }))}
          />

          {/* 지급 상세 (토글) */}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <button
              type="button"
              onClick={() => setShowPaymentOptions(!showPaymentOptions)}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition"
            >
              {showPaymentOptions ? '▼ 지급 상세 접기' : '▶ 지급 상세 펼치기'}
            </button>

            {showPaymentOptions && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="지급처 유형" icon={Building2}>
                    <Select
                      value={form.partnerEntityFilter}
                      onChange={(val) => {
                        const newFilter = val as EntityType;
                        setForm((prev) => ({
                          ...prev,
                          partnerEntityFilter: newFilter,
                          partnerId: '',
                        }));
                      }}
                      options={[
                        { value: '', label: '전체' },
                        { value: 'organization', label: '🏢 회사/조직' },
                        { value: 'person', label: '👤 개인/인력' },
                        { value: 'team', label: '👥 팀' },
                        { value: 'venue', label: '📍 장소' },
                      ]}
                    />
                  </FormField>
                  <FormField label="지급처" icon={User}>
                    <SearchableSelect
                      value={form.partnerId}
                      onChange={(v) => setForm((prev) => ({ ...prev, partnerId: v }))}
                      options={partnerOptions}
                      placeholder="지급처 검색"
                      emptyMessage="지급처를 찾을 수 없습니다"
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="지급 방식" icon={Calculator}>
                    <Select
                      value={form.paymentMethod}
                      onChange={(v) => setForm((prev) => ({ ...prev, paymentMethod: v as any }))}
                      options={[
                        { value: '', label: '선택하세요' },
                        { value: 'vat_included', label: '부가세 포함 (+10%)' },
                        { value: 'tax_free', label: '면세 (0%)' },
                        { value: 'withholding', label: '원천징수 (-3.3%)' },
                        { value: 'actual_payment', label: '실지급액' },
                      ]}
                    />
                  </FormField>
                  <FormField label="실지급액">
                    <div className={cn(
                      "px-3 py-2 rounded-lg text-sm font-bold",
                      actualAmount
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                        : "bg-slate-50 dark:bg-slate-700/50 text-slate-400"
                    )}>
                      {actualAmount ? `₩${actualAmount.toLocaleString()}` : '-'}
                    </div>
                  </FormField>
                </div>
              </div>
            )}
          </div>

          {/* 에러 */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={async () => {
              if (isSubmitting) return;
              setError('');
              const dateError = validateFinanceDateForm({
                originalStatus: null,
                status: form.status,
                dueDate: form.dueDate,
                paidAtDate: form.paidAtDate,
              });
              if (dateError) {
                setError(dateError);
                return;
              }
              if (form.entryScope === 'internal_allocation' && !form.counterpartyBu) {
                setError('내부배부는 상대 사업부를 선택해야 합니다.');
                return;
              }
              setIsSubmitting(true);
              try {
                const result = await onSubmit({ ...form, type: mode });
                if (result) setError(result);
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className={cn(
              "px-4 py-2 text-sm font-semibold text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
              isRevenue ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
            )}
          >
            {isSubmitting && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSubmitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditFinanceModal({
  entry,
  currentUser,
  onClose,
  onSubmit,
  onDelete,
  projects,
  partnersData,
  calculateActualAmount,
  onGoToProject,
}: {
  entry: FinanceEntryView;
  /** 로그인 사용자(권한 판정용). 없으면 보기 전용 */
  currentUser: PermAppUser | null;
  onClose: () => void;
  /** 성공이면 null, 실패면 사용자에게 보여 줄 문구 */
  onSubmit: (payload: {
    id: string;
    type: 'revenue' | 'expense';
    projectId: string;
    bu: BU;
    entryScope: 'external' | 'internal_allocation';
    counterpartyBu?: BU | '';
    memo?: string;
    cat: string;
    name: string;
    amount: string;
    date: string;
    dueDate: string;
    paidAtDate: string;
    status: FinancialEntryStatus;
    partnerId?: string;
    paymentMethod?: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '';
  }) => Promise<string | null>;
  /** 성공이면 null, 실패면 사용자에게 보여 줄 문구 */
  onDelete?: (id: string) => Promise<string | null>;
  projects: Project[];
  partnersData?: { id: number; display_name: string; entity_type: string }[];
  calculateActualAmount: (amount: number, paymentMethod: string) => number | null;
  onGoToProject?: (projectId: string) => void;
}) {
  const partnerId = entry.partner_id ? String(entry.partner_id) : '';
  const partnerEntity = partnersData?.find((p) => String(p.id) === partnerId);
  const actions = useMemo(() => getFinanceEntryActions(currentUser, entry), [currentUser, entry]);
  const transitions = useMemo(() => getAvailableTransitions(actions), [actions]);
  const readOnly = !actions.canEdit;

  const [form, setForm] = useState({
    projectId: entry.projectId,
    bu: entry.bu,
    entryScope: entry.entry_scope || 'external',
    counterpartyBu: entry.counterparty_bu || '',
    memo: entry.memo || '',
    type: entry.type,
    cat: entry.category,
    name: entry.name,
    amount: String(entry.amount),
    date: entry.date,
    dueDate: entry.due_date || '',
    paidAtDate: defaultPaidAtDate(entry.paid_at, getTodayKST()),
    status: entry.status,
    partnerEntityFilter: (partnerEntity?.entity_type || '') as EntityType,
    partnerId: partnerId,
    paymentMethod: (entry.payment_method || '') as 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '',
  });
  const [showPaymentOptions, setShowPaymentOptions] = useState(!!form.partnerId || !!form.paymentMethod);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  const statusChanged = form.status !== entry.status;
  const canDelete = !!onDelete && actions.canDelete && entry.status === 'planned';

  // 사업부 이동은 관리자·원래 사업부 리더만(R13). 권한이 없으면 현재 사업부만 고를 수 있다.
  const buOptions = (actions.canMoveBu ? [...BU_CODES] : [entry.bu]).map((k) => ({ value: k, label: BU_TITLES[k] }));

  // 지급처 옵션 생성 (필터링 + 검색용)
  const editPartnerOptions = useMemo(() => {
    return (partnersData || [])
      .filter((p) => !form.partnerEntityFilter || p.entity_type === form.partnerEntityFilter)
      .map((p) => {
        const config = ENTITY_TYPE_CONFIG[p.entity_type as keyof typeof ENTITY_TYPE_CONFIG];
        return {
          value: String(p.id),
          label: `${config?.emoji || '❓'} ${p.display_name}`,
        };
      });
  }, [partnersData, form.partnerEntityFilter]);

  const isRevenue = form.type === 'revenue';
  const Icon = isRevenue ? TrendingUp : TrendingDown;
  const actualAmount = form.amount && form.paymentMethod
    ? calculateActualAmount(Number(form.amount), form.paymentMethod)
    : null;

  const handleSave = async () => {
    if (isSubmitting || readOnly) return;
    setError('');
    const missing: string[] = [];
    if (!form.name) missing.push('항목명');
    if (!form.cat) missing.push('구분');
    if (!form.amount) missing.push('금액');
    if (missing.length > 0) {
      setError(`다음 항목을 입력해주세요: ${missing.join(', ')}`);
      return;
    }
    const dateError = validateFinanceDateForm({
      originalStatus: entry.status,
      status: form.status,
      dueDate: form.dueDate,
      paidAtDate: form.paidAtDate,
    });
    if (dateError) {
      setError(dateError);
      return;
    }
    if (form.entryScope === 'internal_allocation' && !form.counterpartyBu) {
      setError('내부배부는 상대 사업부를 선택해야 합니다.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await onSubmit({
        id: entry.id,
        type: form.type,
        projectId: form.projectId,
        bu: form.bu,
        entryScope: form.entryScope,
        counterpartyBu: form.counterpartyBu as BU | '',
        memo: form.memo,
        cat: form.cat,
        name: form.name,
        amount: form.amount,
        date: form.date,
        dueDate: form.dueDate,
        paidAtDate: form.paidAtDate,
        status: form.status,
        partnerId: form.partnerId,
        paymentMethod: form.paymentMethod,
      });
      if (result) setError(result);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={cn(
          "px-6 py-4",
          isRevenue ? "bg-blue-50 dark:bg-blue-900/20" : "bg-red-50 dark:bg-red-900/20"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                isRevenue ? "bg-blue-100 dark:bg-blue-900/50" : "bg-red-100 dark:bg-red-900/50"
              )}>
                <Icon className={cn("h-4 w-4", isRevenue ? "text-blue-600" : "text-red-600")} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {isRevenue ? '매출' : '지출'} {readOnly ? '상세' : '수정'}
              </h3>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_CONFIG[entry.status].color)}>
                {FINANCE_STATUS_LABELS[entry.status]}
              </span>
              {entry.entry_scope === 'internal_allocation' && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                  내부
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>
          {/* 사업부/프로젝트 칩 */}
          {readOnly ? (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>{BU_TITLES[form.bu] ?? form.bu}</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span>{projects.find((p) => p.id === form.projectId)?.name ?? '-'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <HeaderChipDropdown
                value={form.bu}
                options={buOptions}
                onChange={(val) => {
                  const nextBu = val as BU;
                  setForm((prev) => ({
                    ...prev,
                    bu: nextBu,
                    counterpartyBu: prev.counterpartyBu === nextBu ? '' : prev.counterpartyBu,
                  }));
                }}
              />
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <HeaderChipDropdown
                value={form.projectId}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
              />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {readOnly && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              보기 전용입니다. 수정은 등록자, 이 행 사업부의 리더, 관리자만 할 수 있습니다.
            </div>
          )}

          <fieldset disabled={readOnly || isSubmitting} className="space-y-4 disabled:opacity-80">
            {/* 타입 선택 */}
            <div className="flex gap-2">
              {(['revenue', 'expense'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, type }))}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-lg transition flex items-center justify-center gap-2",
                    form.type === type
                      ? type === 'revenue'
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                      : "bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  )}
                >
                  {type === 'revenue' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {type === 'revenue' ? '매출' : '지출'}
                </button>
              ))}
            </div>

            {/* 항목명 + 구분 */}
            <div className="space-y-3">
              <FormField label="항목명" icon={FileText}>
                <Input
                  value={form.name}
                  onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
                  placeholder="항목명을 입력하세요"
                />
              </FormField>
              <FormField label="구분" icon={Tag}>
                <Input
                  value={form.cat}
                  onChange={(v) => setForm((prev) => ({ ...prev, cat: v }))}
                  placeholder="예: 선금, 광고비, 인건비"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="거래 범위">
                <Select
                  value={form.entryScope}
                  onChange={(value) => setForm((prev) => ({
                    ...prev,
                    entryScope: value as 'external' | 'internal_allocation',
                    counterpartyBu: value === 'internal_allocation' ? prev.counterpartyBu : '',
                  }))}
                  options={[
                    { value: 'external', label: '외부 거래' },
                    { value: 'internal_allocation', label: '내부배부(사업부 간)' },
                  ]}
                />
              </FormField>
              <FormField label="상대 사업부">
                <Select
                  value={form.counterpartyBu}
                  onChange={(value) => setForm((prev) => ({ ...prev, counterpartyBu: value as BU | '' }))}
                  placeholder={form.entryScope === 'internal_allocation' ? '상대 사업부 선택' : '외부 거래는 선택하지 않음'}
                  options={BU_CODES
                    .filter((code) => code !== form.bu)
                    .map((code) => ({ value: code, label: BU_TITLES[code] }))}
                />
              </FormField>
            </div>

            <FormField label="메모" icon={FileText}>
              <textarea
                value={form.memo}
                onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
                placeholder="거래 성격, 입금·지급 근거, Clobe 거래 ID 등을 기록하세요"
                rows={3}
                className="w-full resize-y rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
              />
            </FormField>

            {/* 금액 + 결제일 */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="금액" icon={Wallet}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₩</span>
                  <CurrencyInput
                    value={form.amount}
                    onChange={(v) => setForm((prev) => ({ ...prev, amount: v }))}
                    className="pl-7"
                  />
                </div>
              </FormField>
              <FormField label="결제일" icon={Calendar}>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(v) => setForm((prev) => ({ ...prev, date: v }))}
                />
              </FormField>
            </div>

            {/* 상태 변경 (R12): 권한이 있는 전이만 버튼으로 보인다. 저장해야 반영된다. */}
            <FormField label="상태">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={cn('rounded-full px-2 py-0.5 font-semibold', STATUS_CONFIG[entry.status].color)}>
                    현재: {FINANCE_STATUS_LABELS[entry.status]}
                  </span>
                  {statusChanged && (
                    <>
                      <span className="text-slate-400">→</span>
                      <span className={cn('rounded-full px-2 py-0.5 font-semibold', STATUS_CONFIG[form.status].color)}>
                        저장 시: {FINANCE_STATUS_LABELS[form.status]}
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, status: entry.status }))}
                        className="text-slate-500 underline hover:text-slate-700 dark:text-slate-400"
                      >
                        변경 안 함
                      </button>
                    </>
                  )}
                </div>
                {transitions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {transitions.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, status: prev.status === t.to ? entry.status : t.to }))}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                          form.status === t.to && statusChanged
                            ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </FormField>

            {/* 기한·입금일 (R14) */}
            <FinanceDateFields
              status={form.status}
              dueDate={form.dueDate}
              paidAtDate={form.paidAtDate}
              paidAtRequired={entry.status !== 'paid'}
              onDueDateChange={(v) => setForm((prev) => ({ ...prev, dueDate: v }))}
              onPaidAtDateChange={(v) => setForm((prev) => ({ ...prev, paidAtDate: v }))}
            />

            {/* 지급 상세 */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <button
                type="button"
                onClick={() => setShowPaymentOptions(!showPaymentOptions)}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition"
              >
                {showPaymentOptions ? '▼ 지급 상세 접기' : '▶ 지급 상세 펼치기'}
              </button>

              {showPaymentOptions && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="지급처 유형" icon={Building2}>
                      <Select
                        value={form.partnerEntityFilter}
                        onChange={(val) => {
                          const newFilter = val as EntityType;
                          setForm((prev) => ({
                            ...prev,
                            partnerEntityFilter: newFilter,
                            partnerId: '',
                          }));
                        }}
                        options={[
                          { value: '', label: '전체' },
                          { value: 'organization', label: '🏢 회사/조직' },
                          { value: 'person', label: '👤 개인/인력' },
                          { value: 'team', label: '👥 팀' },
                          { value: 'venue', label: '📍 장소' },
                        ]}
                      />
                    </FormField>
                    <FormField label="지급처" icon={User}>
                      <SearchableSelect
                        value={form.partnerId}
                        onChange={(v) => setForm((prev) => ({ ...prev, partnerId: v }))}
                        options={editPartnerOptions}
                        placeholder="지급처 검색"
                        emptyMessage="지급처를 찾을 수 없습니다"
                      />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="지급 방식" icon={Calculator}>
                      <Select
                        value={form.paymentMethod}
                        onChange={(v) => setForm((prev) => ({ ...prev, paymentMethod: v as any }))}
                        options={[
                          { value: '', label: '선택하세요' },
                          { value: 'vat_included', label: '부가세 포함 (+10%)' },
                          { value: 'tax_free', label: '면세 (0%)' },
                          { value: 'withholding', label: '원천징수 (-3.3%)' },
                          { value: 'actual_payment', label: '실지급액' },
                        ]}
                      />
                    </FormField>
                    <FormField label="실지급액">
                      <div className={cn(
                        "px-3 py-2 rounded-lg text-sm font-bold",
                        actualAmount
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-slate-50 dark:bg-slate-700/50 text-slate-400"
                      )}>
                        {actualAmount ? `₩${actualAmount.toLocaleString()}` : '-'}
                      </div>
                    </FormField>
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          {/* 에러 (서버 400·403·404·409 문구 포함) */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* 변경 기록 (R18). 스위치가 꺼졌거나 권한이 없으면 아무것도 보이지 않는다. */}
          {actions.canViewChanges && (
            <ChangeLogList kind="financial-entry" id={entry.id} className="border-t border-slate-100 dark:border-slate-700 pt-4" />
          )}

          {/* 댓글 섹션 */}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              <MessageCircle className="h-4 w-4" />
              댓글
            </div>
            <CommentSection entityType="financial" entityId={Number(entry.id)} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onGoToProject && form.projectId && (
              <button
                onClick={() => {
                  onGoToProject(form.projectId);
                }}
                disabled={isSubmitting || isDeleting}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ExternalLink className="h-4 w-4" />
                프로젝트 상세
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting || isDeleting}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition border border-red-200 dark:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting || isDeleting}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              닫기
            </button>
            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={isSubmitting || isDeleting}
                className={cn(
                  "px-4 py-2 text-sm font-semibold text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
                  isRevenue ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
                )}
              >
                {isSubmitting && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSubmitting ? '저장 중...' : '저장'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 (예정 행만) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">항목 삭제</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">이 작업은 되돌릴 수 없습니다</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold">&ldquo;{entry.name}&rdquo;</span> 항목을 정말 삭제하시겠습니까?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                예정 건만 삭제할 수 있습니다. 완료·취소 건은 삭제하지 않고 상태로 정정합니다.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (isDeleting || !onDelete) return;
                  setIsDeleting(true);
                  try {
                    const result = await onDelete(entry.id);
                    if (result) setError(result);
                  } finally {
                    setIsDeleting(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
