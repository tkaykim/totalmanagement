'use client';

import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown, Building2, User, Lock, AlertTriangle, Trash2 } from 'lucide-react';
import { ModalShell, InputField, SelectField, ModalActions } from './modal-components';
import { checkFinancePermission, type FinancePermission } from '@/features/erp/lib/financePermissions';
import type { AppUser, Project } from '@/types/database';

type BU = 'GRIGO' | 'REACT' | 'FLOW' | 'AST' | 'MODOO' | 'HEAD';
type PaymentMethod = 'vat_supply' | 'vat_total' | 'tax_free' | 'withholding' | 'card_payment';
type FinancialStatus = 'planned' | 'paid' | 'canceled';

const BU_TITLES: Record<BU, string> = {
  GRIGO: '그리고 엔터',
  REACT: '리액트 스튜디오',
  FLOW: '플로우메이커',
  AST: '아스트 컴퍼니',
  MODOO: '모두굿즈',
  HEAD: '본사',
};

// 매출용 증빙 유형 레이블
const REVENUE_PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  vat_supply: '세금계산서 (공급가액 입력)',
  vat_total: '카드매출 (합계 입력, 역계산)',
  tax_free: '면세 계산서',
  withholding: '원천징수 (3.3%)',
  card_payment: '기타 현금/수표',
};

// 지출용 증빙 유형 레이블
const EXPENSE_PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  vat_supply: '세금계산서 (공급가액 입력)',
  vat_total: '법인카드 (합계 입력, 역계산)',
  tax_free: '면세 계산서',
  withholding: '원천징수 (3.3%)',
  card_payment: '기타 현금/수표',
};

const STATUS_LABELS: Record<FinancialStatus, string> = {
  planned: '지급예정',
  paid: '지급완료',
  canceled: '취소',
};

type FinanceEntry = {
  id: string;
  project_id: string;
  bu_code: BU;
  kind: 'revenue' | 'expense';
  category: string;
  name: string;
  amount: number;
  occurred_at: string;
  status: FinancialStatus;
  partner_company_id?: number | null;
  partner_worker_id?: number | null;
  payment_method?: PaymentMethod | null;
  actual_amount?: number | null;
  created_by?: string; // 작성자 ID
};

type FinanceModalProps = {
  mode: 'revenue' | 'expense';
  projectId: string;
  projectName?: string;
  defaultBu: BU;
  entry?: FinanceEntry;
  partnerCompaniesData?: any[];
  partnerWorkersData?: any[];
  currentUser?: AppUser | null; // 현재 로그인 사용자
  project?: Project | null; // 프로젝트 정보 (PM 체크용)
  onClose: () => void;
  onSubmit: (payload: {
    id?: string;
    project_id: string;
    bu_code: BU;
    kind: 'revenue' | 'expense';
    category: string;
    name: string;
    amount: number;
    occurred_at: string;
    status: FinancialStatus;
    partner_company_id?: number | null;
    partner_worker_id?: number | null;
    payment_method?: PaymentMethod | null;
    actual_amount?: number | null;
    created_by?: string; // 작성자 ID
  }) => void;
  onDelete?: (entryId: string) => void; // 삭제 핸들러
  placeholders?: {
    category?: string;
    name?: string;
  };
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

function SmartCalculator({
  amount,
  paymentMethod,
  mode,
}: {
  amount: number;
  paymentMethod: PaymentMethod | '';
  mode: 'revenue' | 'expense';
}) {
  const calculation = useMemo(() => {
    if (!amount || !paymentMethod) return null;

    switch (paymentMethod) {
      // 세금계산서 (공급가액 입력 → 정계산)
      case 'vat_supply':
        const vatFromSupply = Math.round(amount * 0.1);
        const totalFromSupply = amount + vatFromSupply;
        return {
          type: 'VAT_FORWARD',
          description: '공급가액 기준 정계산',
          lines: [
            { label: '공급가액 (입력값)', value: amount },
            { label: '부가세 (10%)', value: vatFromSupply },
            { label: '합계 (청구/지급액)', value: totalFromSupply, highlight: true },
          ],
        };

      // 카드매출/법인카드 (합계 입력 → 역계산)
      case 'vat_total':
        const supplyFromTotal = Math.round(amount / 1.1);
        const vatFromTotal = amount - supplyFromTotal;
        return {
          type: 'VAT_REVERSE',
          description: mode === 'revenue' 
            ? '카드결제 금액 기준 역계산 (VAT 포함)' 
            : '법인카드 사용금액 기준 역계산 (VAT 포함)',
          lines: [
            { label: mode === 'revenue' ? '카드결제 금액 (입력값)' : '법인카드 사용액 (입력값)', value: amount },
            { label: '공급가액 (역산)', value: supplyFromTotal },
            { label: '부가세 (역산)', value: vatFromTotal },
            { label: '실제 매출/지출액', value: supplyFromTotal, highlight: true, note: '※ 장부에는 공급가액 기준 기재' },
          ],
        };

      // 면세 계산서
      case 'tax_free':
        return {
          type: 'TAX_FREE',
          description: '면세 거래 (VAT 0%)',
          lines: [
            { label: '공급가액', value: amount },
            { label: '부가세', value: 0 },
            { label: '합계', value: amount, highlight: true },
          ],
        };

      // 원천징수 (지급총액 입력 → 세금/실지급액 계산)
      case 'withholding':
        const withholdingTax = Math.round(amount * 0.033);
        const actualPay = amount - withholdingTax;
        return {
          type: 'WITHHOLDING',
          description: '원천징수 3.3% 적용',
          lines: [
            { label: '지급 총액 (입력값)', value: amount },
            { label: '원천징수 (3.3%)', value: withholdingTax },
            { label: '실지급액', value: actualPay, highlight: true },
          ],
        };

      // 기타 현금/수표 (VAT 없음)
      case 'card_payment':
        return {
          type: 'CASH',
          description: '기타 현금/수표 거래',
          lines: [
            { label: '거래 금액', value: amount, highlight: true },
          ],
        };

      default:
        return null;
    }
  }, [amount, paymentMethod, mode]);

  if (!calculation) return null;

  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Smart Calculator
        </span>
      </div>
      {calculation.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {calculation.description}
        </p>
      )}
      <div className="space-y-2">
        {calculation.lines.map((line, index) => (
          <div key={index}>
            <div
              className={`flex justify-between text-sm ${
                line.highlight
                  ? 'font-bold text-blue-600 dark:text-blue-400 pt-2 border-t border-slate-200 dark:border-slate-600'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>{line.label}</span>
              <span>₩{formatCurrency(line.value)}</span>
            </div>
            {(line as any).note && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {(line as any).note}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinanceModal({
  mode,
  projectId,
  projectName,
  defaultBu,
  entry,
  partnerCompaniesData,
  partnerWorkersData,
  currentUser,
  project,
  onClose,
  onSubmit,
  onDelete,
  placeholders,
}: FinanceModalProps) {
  const isEditMode = !!entry;

  // 권한 체크
  const permission: FinancePermission = useMemo(() => {
    // entry를 FinancialEntry 타입으로 변환
    const financialEntry = entry ? {
      id: parseInt(entry.id) || 0,
      project_id: parseInt(entry.project_id) || 0,
      bu_code: entry.bu_code,
      kind: entry.kind,
      category: entry.category,
      name: entry.name,
      amount: entry.amount,
      occurred_at: entry.occurred_at,
      status: entry.status,
      partner_company_id: entry.partner_company_id,
      partner_worker_id: entry.partner_worker_id,
      payment_method: entry.payment_method as any,
      actual_amount: entry.actual_amount,
      created_by: entry.created_by,
      created_at: '',
      updated_at: '',
    } : null;
    
    return checkFinancePermission({
      currentUser: currentUser || null,
      entry: financialEntry,
      project: project || null,
      targetBu: defaultBu,
    });
  }, [currentUser, entry, project, defaultBu]);

  // 수정 모드에서 권한 체크
  const canEdit = isEditMode ? permission.canUpdate : permission.canCreate;
  const canDelete = permission.canDelete;

  const [form, setForm] = useState({
    bu_code: entry?.bu_code || defaultBu,
    category: entry?.category || '',
    name: entry?.name || '',
    amount: entry?.amount?.toString() || '',
    occurred_at: entry?.occurred_at || '',
    status: entry?.status || 'planned' as FinancialStatus,
    partnerType: entry?.partner_company_id ? 'company' : entry?.partner_worker_id ? 'worker' : '' as 'company' | 'worker' | '',
    partner_company_id: entry?.partner_company_id?.toString() || '',
    partner_worker_id: entry?.partner_worker_id?.toString() || '',
    payment_method: entry?.payment_method || '' as PaymentMethod | '',
  });

  const [error, setError] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const amountNum = parseInt(form.amount) || 0;

  const calculateActualAmount = (): number | null => {
    if (!form.payment_method || !amountNum) return null;
    
    switch (form.payment_method) {
      case 'withholding':
        // 원천징수: 실지급액 = 지급총액 - 3.3%
        return Math.round(amountNum * 0.967);
      case 'vat_supply':
        // 세금계산서(공급가액 입력): 실제 금액 = 공급가액 + VAT
        return Math.round(amountNum * 1.1);
      case 'vat_total':
        // 카드매출/법인카드(합계 입력): 실제 공급가액 = 합계 / 1.1 (역계산)
        return Math.round(amountNum / 1.1);
      case 'tax_free':
      case 'card_payment':
        return amountNum;
      default:
        return null;
    }
  };

  const handleSubmit = () => {
    // 권한 체크
    if (!canEdit) {
      setError(permission.reason || '수정 권한이 없습니다.');
      return;
    }

    if (!form.category || !form.name || !form.amount) {
      setError('구분, 항목명, 금액은 필수 항목입니다.');
      return;
    }

    setError('');
    const actualAmount = calculateActualAmount();

    onSubmit({
      ...(isEditMode && entry && { id: entry.id }),
      project_id: projectId,
      bu_code: form.bu_code,
      kind: mode,
      category: form.category,
      name: form.name,
      amount: parseInt(form.amount),
      occurred_at: form.occurred_at || new Date().toISOString().split('T')[0],
      status: form.status,
      partner_company_id: form.partnerType === 'company' && form.partner_company_id ? parseInt(form.partner_company_id) : null,
      partner_worker_id: form.partnerType === 'worker' && form.partner_worker_id ? parseInt(form.partner_worker_id) : null,
      payment_method: form.payment_method || null,
      actual_amount: actualAmount,
      created_by: isEditMode ? entry?.created_by : currentUser?.id, // 새 항목은 현재 사용자 ID
    });
  };

  const handleDelete = () => {
    if (!canDelete || !entry || !onDelete) return;
    onDelete(entry.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const categoryPlaceholder = mode === 'revenue'
    ? placeholders?.category || '예: 광고수익, 출연료, 저작권료'
    : placeholders?.category || '예: 인건비, 제작비, 장비비';

  const namePlaceholder = mode === 'revenue'
    ? placeholders?.name || '예: 1차 선금, 광고 정산'
    : placeholders?.name || '예: 1차 결제, 인건비 지급';

  return (
    <ModalShell
      title={
        <div className="flex items-center gap-2">
          {mode === 'revenue' ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
          <span>{isEditMode ? (mode === 'revenue' ? '매출 수정' : '지출 수정') : (mode === 'revenue' ? '매출 등록' : '지출 등록')}</span>
        </div>
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* 권한 없음 경고 */}
        {!canEdit && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 flex items-start gap-3">
            <Lock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">읽기 전용</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {permission.reason || '이 항목을 수정할 권한이 없습니다.'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* 프로젝트 정보 표시 */}
        {projectName && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-2">
            <p className="text-xs text-blue-600 dark:text-blue-400">연결된 프로젝트</p>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">{projectName}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SelectField
            label="사업부"
            value={form.bu_code}
            onChange={(val) => setForm((prev) => ({ ...prev, bu_code: val as BU }))}
            options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({
              value: k,
              label: BU_TITLES[k],
            }))}
            disabled={!canEdit}
          />

          <InputField
            label="구분 *"
            placeholder={categoryPlaceholder}
            value={form.category}
            onChange={(v) => setForm((prev) => ({ ...prev, category: v }))}
            disabled={!canEdit}
          />

          <InputField
            label="항목명 *"
            placeholder={namePlaceholder}
            value={form.name}
            onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
            disabled={!canEdit}
          />

          <InputField
            label="금액 *"
            type="number"
            placeholder="금액을 입력하세요"
            value={form.amount}
            onChange={(v) => setForm((prev) => ({ ...prev, amount: v }))}
            disabled={!canEdit}
          />

          <InputField
            label="결제일"
            type="date"
            value={form.occurred_at}
            onChange={(v) => setForm((prev) => ({ ...prev, occurred_at: v }))}
            disabled={!canEdit}
          />

          <SelectField
            label="상태"
            value={form.status}
            onChange={(v) => setForm((prev) => ({ ...prev, status: v as FinancialStatus }))}
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            disabled={!canEdit}
          />
        </div>

        {/* 증빙/지급방식 선택 */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            증빙/지급 방식
          </label>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {(Object.entries(mode === 'revenue' ? REVENUE_PAYMENT_METHOD_LABELS : EXPENSE_PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => canEdit && setForm((prev) => ({ ...prev, payment_method: value }))}
                disabled={!canEdit}
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition ${
                  form.payment_method === value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Smart Calculator */}
        {amountNum > 0 && form.payment_method && (
          <SmartCalculator amount={amountNum} paymentMethod={form.payment_method} mode={mode} />
        )}

        {/* 거래처 선택 */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {mode === 'revenue' ? '매출처' : '지급처'}
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400">유형</label>
              <select
                value={form.partnerType}
                onChange={(e) => {
                  const newType = e.target.value as 'company' | 'worker' | '';
                  setForm((prev) => ({
                    ...prev,
                    partnerType: newType,
                    partner_company_id: newType !== 'company' ? '' : prev.partner_company_id,
                    partner_worker_id: newType !== 'worker' ? '' : prev.partner_worker_id,
                  }));
                }}
                disabled={!canEdit}
                className={`w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="">선택 안함</option>
                <option value="company">회사</option>
                <option value="worker">인력</option>
              </select>
            </div>

            {form.partnerType === 'company' && (
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {mode === 'revenue' ? '매출처 회사' : '지급처 회사'}
                </label>
                <select
                  value={form.partner_company_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, partner_company_id: e.target.value }))}
                  disabled={!canEdit}
                  className={`w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <option value="">선택하세요</option>
                  {(partnerCompaniesData || []).map((company: any) => (
                    <option key={company.id} value={company.id}>
                      {company.company_name_ko || company.company_name_en || `회사 #${company.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.partnerType === 'worker' && (
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {mode === 'revenue' ? '매출처 인력' : '지급처 인력'}
                </label>
                <select
                  value={form.partner_worker_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, partner_worker_id: e.target.value }))}
                  disabled={!canEdit}
                  className={`w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <option value="">선택하세요</option>
                  {(partnerWorkersData || []).map((worker: any) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name_ko || worker.name_en || worker.name || `인력 #${worker.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 삭제 확인 다이얼로그 */}
        {showDeleteConfirm && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  정말 삭제하시겠습니까?
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  이 작업은 되돌릴 수 없습니다.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 액션 버튼 영역 */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
        {/* 삭제 버튼 (수정 모드이고 삭제 권한 있을 때만) */}
        <div>
          {isEditMode && canDelete && onDelete && !showDeleteConfirm && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </button>
          )}
        </div>

        {/* 등록/수정/닫기 버튼 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            {canEdit ? '취소' : '닫기'}
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
            >
              {isEditMode ? '수정' : '등록'}
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

