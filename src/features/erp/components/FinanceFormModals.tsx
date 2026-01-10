'use client';

import { useState, useRef, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Building2, User, Calculator, Calendar, Tag, FileText, Wallet, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinancialEntry, Project, BU, FinancialEntryStatus } from '@/features/erp/types';

const BU_TITLES: Record<BU, string> = {
  GRIGO: '그리고 엔터',
  REACT: '리액트 스튜디오',
  FLOW: '플로우메이커',
  AST: '아스트 컴퍼니',
  MODOO: '모두굿즈',
  HEAD: '본사',
};

const STATUS_CONFIG = {
  planned: { label: '지급예정', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  paid: { label: '지급완료', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
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
        <div className="absolute top-full left-0 mt-1 z-10 min-w-[140px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
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
    cat: string;
    name: string;
    amount: string;
    date: string;
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
    cat: '',
    name: '',
    amount: '',
    date: '',
    status: 'planned' as FinancialEntryStatus,
    partnerEntityFilter: '' as 'person' | 'organization' | '',
    partnerId: '',
    paymentMethod: '' as 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '',
  });
  const [error, setError] = useState<string>('');
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  const isRevenue = mode === 'revenue';
  const Icon = isRevenue ? TrendingUp : TrendingDown;

  const actualAmount = form.amount && form.paymentMethod
    ? calculateActualAmount(Number(form.amount), form.paymentMethod)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
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
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 transition"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>
          {/* 사업부/프로젝트 칩 - 프로젝트가 미리 선택된 경우에만 헤더에 표시 */}
          {hasPreselectedProject && (
            <div className="flex items-center gap-2">
              <HeaderChipDropdown
                value={form.bu}
                options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({ value: k, label: BU_TITLES[k] }))}
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
                  options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({ value: k, label: BU_TITLES[k] }))}
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

          {/* 금액 + 결제일 */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="금액" icon={Wallet}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₩</span>
                  <Input
                    type="number"
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
                        const newFilter = val as 'person' | 'organization' | '';
                        setForm((prev) => ({
                          ...prev,
                          partnerEntityFilter: newFilter,
                          partnerId: '',
                        }));
                      }}
                      options={[
                        { value: '', label: '전체' },
                        { value: 'organization', label: '회사/조직' },
                        { value: 'person', label: '개인/인력' },
                      ]}
                    />
                  </FormField>
                  <FormField label="지급처" icon={User}>
                    <Select
                      value={form.partnerId}
                      onChange={(v) => setForm((prev) => ({ ...prev, partnerId: v }))}
                      options={(partnersData || [])
                        .filter((p) => !form.partnerEntityFilter || p.entity_type === form.partnerEntityFilter)
                        .map((p) => ({
                          value: String(p.id),
                          label: `${p.entity_type === 'organization' ? '🏢' : '👤'} ${p.display_name}`,
                        }))}
                      placeholder="선택하세요"
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
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            취소
          </button>
          <button
            onClick={async () => {
              setError('');
              const result = await onSubmit({ ...form, type: mode });
              if (result) setError(result);
            }}
            className={cn(
              "px-4 py-2 text-sm font-semibold text-white rounded-lg transition",
              isRevenue ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
            )}
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditFinanceModal({
  entry,
  onClose,
  onSubmit,
  projects,
  partnersData,
  calculateActualAmount,
}: {
  entry: FinancialEntry;
  onClose: () => void;
  onSubmit: (payload: {
    id: string;
    type: 'revenue' | 'expense';
    projectId: string;
    bu: BU;
    cat: string;
    name: string;
    amount: string;
    date: string;
    status: FinancialEntryStatus;
    partnerId?: string;
    paymentMethod?: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '';
  }) => void;
  projects: Project[];
  partnersData?: { id: number; display_name: string; entity_type: string }[];
  calculateActualAmount: (amount: number, paymentMethod: string) => number | null;
}) {
  const entryData = entry as any;
  const partnerId = entryData.partner_id ? String(entryData.partner_id) : '';
  const partnerEntity = partnersData?.find((p) => String(p.id) === partnerId);
  const [form, setForm] = useState({
    projectId: entry.projectId,
    bu: entry.bu,
    type: entry.type,
    cat: entry.category,
    name: entry.name,
    amount: String(entry.amount),
    date: entry.date,
    status: entry.status,
    partnerEntityFilter: (partnerEntity?.entity_type || '') as 'person' | 'organization' | '',
    partnerId: partnerId,
    paymentMethod: (entryData.payment_method || '') as 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '',
  });
  const [showPaymentOptions, setShowPaymentOptions] = useState(!!form.partnerId || !!form.paymentMethod);

  const isRevenue = form.type === 'revenue';
  const Icon = isRevenue ? TrendingUp : TrendingDown;
  const actualAmount = form.amount && form.paymentMethod
    ? calculateActualAmount(Number(form.amount), form.paymentMethod)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
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
                {isRevenue ? '매출' : '지출'} 수정
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 transition"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>
          {/* 사업부/프로젝트 칩 */}
          <div className="flex items-center gap-2">
            <HeaderChipDropdown
              value={form.bu}
              options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({ value: k, label: BU_TITLES[k] }))}
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
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* 타입 선택 */}
          <div className="flex gap-2">
            {(['revenue', 'expense'] as const).map((type) => (
              <button
                key={type}
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

          {/* 금액 + 결제일 */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="금액" icon={Wallet}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₩</span>
                <Input
                  type="number"
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
                        const newFilter = val as 'person' | 'organization' | '';
                        setForm((prev) => ({
                          ...prev,
                          partnerEntityFilter: newFilter,
                          partnerId: '',
                        }));
                      }}
                      options={[
                        { value: '', label: '전체' },
                        { value: 'organization', label: '회사/조직' },
                        { value: 'person', label: '개인/인력' },
                      ]}
                    />
                  </FormField>
                  <FormField label="지급처" icon={User}>
                    <Select
                      value={form.partnerId}
                      onChange={(v) => setForm((prev) => ({ ...prev, partnerId: v }))}
                      options={(partnersData || [])
                        .filter((p) => !form.partnerEntityFilter || p.entity_type === form.partnerEntityFilter)
                        .map((p) => ({
                          value: String(p.id),
                          label: `${p.entity_type === 'organization' ? '🏢' : '👤'} ${p.display_name}`,
                        }))}
                      placeholder="선택하세요"
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            취소
          </button>
          <button
            onClick={() => {
              onSubmit({
                id: entry.id,
                type: form.type,
                projectId: form.projectId,
                bu: form.bu,
                cat: form.cat,
                name: form.name,
                amount: form.amount,
                date: form.date,
                status: form.status,
                partnerId: form.partnerId,
                paymentMethod: form.paymentMethod,
              });
            }}
            className={cn(
              "px-4 py-2 text-sm font-semibold text-white rounded-lg transition",
              isRevenue ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
            )}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
