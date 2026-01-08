'use client';

import { useState, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Plus, Eye, EyeOff, Lock } from 'lucide-react';
import { ModalShell, InputField, SelectField, ModalActions } from './modal-components';
import { checkFinancePermission } from '@/features/erp/lib/financePermissions';
import type { AppUser, Project as ProjectType } from '@/types/database';

type BU = 'GRIGO' | 'REACT' | 'FLOW' | 'AST' | 'MODOO' | 'HEAD';
type FinancePermission = 'none' | 'view' | 'edit';

type FinanceEntry = {
  id: string;
  kind: 'revenue' | 'expense';
  category: string;
  name: string;
  amount: number;
  status: string;
  occurred_at: string;
};

const BU_TITLES: Record<BU, string> = {
  GRIGO: '그리고 엔터',
  REACT: '리액트 스튜디오',
  FLOW: '플로우메이커',
  AST: '아스트 컴퍼니',
  MODOO: '모두굿즈',
  HEAD: '본사',
};

type Project = {
  id: string;
  bu: BU;
  name: string;
  cat: string;
  startDate: string;
  endDate: string;
  status: string;
  pm_id?: string | null;
  participants?: Array<{ user_id?: string; partner_worker_id?: number; partner_company_id?: number; role: string }>;
};

type ProjectModalProps = {
  project?: Project;
  onClose: () => void;
  onSubmit: (payload: {
    id?: string;
    name: string;
    bu: BU;
    cat: string;
    startDate: string;
    endDate: string;
    description?: string | null;
    pm_id?: string | null;
    partner_company_id?: number | null;
    partner_worker_id?: number | null;
    artist_id?: number | null;
    channel_id?: number | null;
    status?: string;
    participants?: Array<{ user_id?: string; partner_worker_id?: number; partner_company_id?: number; role?: string }>;
  }) => void;
  defaultBu: BU;
  usersData?: { users: any[]; currentUser: any };
  partnerCompaniesData?: any[];
  partnerWorkersData?: any[];
  placeholders?: {
    projectName?: string;
    category?: string;
    description?: string;
  };
  financeData?: FinanceEntry[];
  financePermission?: FinancePermission;
  onAddRevenue?: () => void;
  onAddExpense?: () => void;
  onViewFinanceDetail?: (entry: FinanceEntry) => void;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export function ProjectModal({
  project,
  onClose,
  onSubmit,
  defaultBu,
  usersData,
  partnerCompaniesData,
  partnerWorkersData,
  placeholders,
  financeData,
  financePermission: externalFinancePermission,
  onAddRevenue,
  onAddExpense,
  onViewFinanceDetail,
}: ProjectModalProps) {
  const isEditMode = !!project;
  const currentUser = usersData?.currentUser as AppUser | null;

  // 재무 권한 자동 계산 (외부에서 전달된 값이 없으면 currentUser 기반으로 계산)
  const computedFinancePermission: FinancePermission = useMemo(() => {
    // 외부에서 명시적으로 전달된 경우 그 값 사용
    if (externalFinancePermission !== undefined) {
      return externalFinancePermission;
    }

    // currentUser가 없으면 권한 없음
    if (!currentUser) {
      return 'none';
    }

    // 프로젝트 정보를 ProjectType 형태로 변환
    const projectData: ProjectType | null = project ? {
      id: parseInt(project.id) || 0,
      bu_code: project.bu,
      name: project.name,
      category: project.cat,
      status: project.status as any,
      start_date: project.startDate,
      end_date: project.endDate,
      pm_id: project.pm_id,
      participants: project.participants?.map(p => ({
        user_id: p.user_id,
        partner_worker_id: p.partner_worker_id,
        partner_company_id: p.partner_company_id,
        role: p.role,
        is_pm: false,
      })),
      created_at: '',
      updated_at: '',
    } : null;

    // 권한 체크
    const permission = checkFinancePermission({
      currentUser,
      entry: null,
      project: projectData,
      targetBu: project?.bu || defaultBu,
    });

    // viewer 또는 접근 불가
    if (!permission.canRead) {
      return 'none';
    }

    // 수정 가능 (admin, manager, 또는 PM/참여자)
    if (permission.canCreate || permission.canUpdate) {
      return 'edit';
    }

    // 열람만 가능
    return 'view';
  }, [currentUser, project, defaultBu, externalFinancePermission]);

  const canViewFinance = computedFinancePermission === 'view' || computedFinancePermission === 'edit';
  const canEditFinance = computedFinancePermission === 'edit';

  const financeSummary = financeData?.reduce(
    (acc, entry) => {
      if (entry.kind === 'revenue') {
        acc.totalRevenue += entry.amount;
        acc.revenueCount += 1;
      } else {
        acc.totalExpense += entry.amount;
        acc.expenseCount += 1;
      }
      return acc;
    },
    { totalRevenue: 0, totalExpense: 0, revenueCount: 0, expenseCount: 0 }
  ) || { totalRevenue: 0, totalExpense: 0, revenueCount: 0, expenseCount: 0 };
  const projectParticipants = (project as any)?.participants || [];

  const [form, setForm] = useState({
    name: project?.name || '',
    bu: project?.bu || defaultBu,
    cat: project?.cat || '',
    startDate: project?.startDate || '',
    endDate: project?.endDate || '',
    description: (project as any)?.description || '',
    pm_id: (project as any)?.pm_id || '',
    partner_company_id: String((project as any)?.partner_company_id || ''),
    partner_worker_id: String((project as any)?.partner_worker_id || ''),
    artist_id: String((project as any)?.artist_id || ''),
    channel_id: String((project as any)?.channel_id || ''),
    status: project?.status || '준비중',
  });

  const [selectedParticipants, setSelectedParticipants] = useState<
    Array<{ type: 'user' | 'partner_worker' | 'partner_company'; id: string | number; name: string }>
  >(() => {
    if (!project) return [];
    return projectParticipants
      .map((p: any) => {
        if (p.user_id) {
          const user = usersData?.users.find((u: any) => u.id === p.user_id);
          return user ? { type: 'user' as const, id: user.id, name: user.name } : null;
        } else if (p.partner_worker_id) {
          const worker = partnerWorkersData?.find((w: any) => w.id === p.partner_worker_id);
          return worker
            ? {
                type: 'partner_worker' as const,
                id: worker.id,
                name: worker.name_ko || worker.name_en || worker.name || '',
              }
            : null;
        } else if (p.partner_company_id) {
          const company = partnerCompaniesData?.find((c: any) => c.id === p.partner_company_id);
          return company
            ? {
                type: 'partner_company' as const,
                id: company.id,
                name: company.company_name_ko || company.company_name_en || '',
              }
            : null;
        }
        return null;
      })
      .filter((p: any) => p !== null) as Array<{
      type: 'user' | 'partner_worker' | 'partner_company';
      id: string | number;
      name: string;
    }>;
  });

  const [participantSelectType, setParticipantSelectType] = useState<'user' | 'partner_worker' | 'partner_company'>('user');
  const [participantSelectId, setParticipantSelectId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleAddParticipant = () => {
    if (!participantSelectId) return;

    if (participantSelectType === 'user') {
      const user = usersData?.users.find((u: any) => u.id === participantSelectId);
      if (user && !selectedParticipants.some((p) => p.type === 'user' && p.id === user.id)) {
        setSelectedParticipants((prev) => [...prev, { type: 'user', id: user.id, name: user.name }]);
        setParticipantSelectId('');
      }
    } else if (participantSelectType === 'partner_worker') {
      const worker = partnerWorkersData?.find((w: any) => w.id === Number(participantSelectId));
      if (worker && !selectedParticipants.some((p) => p.type === 'partner_worker' && p.id === worker.id)) {
        setSelectedParticipants((prev) => [
          ...prev,
          {
            type: 'partner_worker',
            id: worker.id,
            name: worker.name_ko || worker.name_en || worker.name || '',
          },
        ]);
        setParticipantSelectId('');
      }
    } else if (participantSelectType === 'partner_company') {
      const company = partnerCompaniesData?.find((c: any) => c.id === Number(participantSelectId));
      if (company && !selectedParticipants.some((p) => p.type === 'partner_company' && p.id === company.id)) {
        setSelectedParticipants((prev) => [
          ...prev,
          {
            type: 'partner_company',
            id: company.id,
            name: company.company_name_ko || company.company_name_en || '',
          },
        ]);
        setParticipantSelectId('');
      }
    }
  };

  const handleRemoveParticipant = (index: number) => {
    setSelectedParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!form.name || !form.cat) {
      setError('프로젝트명과 카테고리는 필수 항목입니다.');
      return;
    }

    setError('');
    const participants = selectedParticipants.map((p) => ({
      user_id: p.type === 'user' ? (p.id as string) : undefined,
      partner_worker_id: p.type === 'partner_worker' ? (p.id as number) : undefined,
      partner_company_id: p.type === 'partner_company' ? (p.id as number) : undefined,
      role: 'participant',
    }));

    onSubmit({
      ...(isEditMode && { id: project.id }),
      name: form.name,
      bu: form.bu,
      cat: form.cat,
      startDate: form.startDate,
      endDate: form.endDate,
      description: form.description || null,
      pm_id: form.pm_id || null,
      partner_company_id: form.partner_company_id ? Number(form.partner_company_id) : null,
      partner_worker_id: form.partner_worker_id ? Number(form.partner_worker_id) : null,
      artist_id: form.artist_id ? Number(form.artist_id) : null,
      channel_id: form.channel_id ? Number(form.channel_id) : null,
      status: form.status,
      participants,
    });
  };

  return (
    <ModalShell
      title={isEditMode ? '프로젝트 수정' : '프로젝트 등록'}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-900"
          >
            닫기
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {isEditMode ? '수정' : '등록'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* 1. 사업부 선택 */}
          <SelectField
            label="사업부"
            value={form.bu}
            onChange={(val) => setForm((prev) => ({ ...prev, bu: val as BU }))}
            options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({ value: k, label: BU_TITLES[k] }))}
          />

          {/* 2. 제목 (프로젝트명) */}
          <InputField label="프로젝트명 *" placeholder={placeholders?.projectName || "프로젝트 이름"} value={form.name} onChange={(v) => setForm((prev) => ({ ...prev, name: v }))} />

          {/* 3. 카테고리 */}
          <InputField label="카테고리 *" placeholder={placeholders?.category || "예: 안무제작"} value={form.cat} onChange={(v) => setForm((prev) => ({ ...prev, cat: v }))} />

          {/* 4. 설명 */}
          <div className="md:col-span-2">
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-xs text-slate-500 dark:text-slate-400">설명</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={placeholders?.description || "프로젝트 설명을 입력하세요"}
                rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
              />
            </label>
          </div>

          {/* 5. PM */}
          <SelectField
            label="PM"
            value={form.pm_id}
            onChange={(val) => setForm((prev) => ({ ...prev, pm_id: val }))}
            options={[
              { value: '', label: '선택 안함' },
              ...((usersData?.users ?? [])
                .map((u: any) => ({ value: u.id || '', label: u.name || '' }))
                .filter((o: any) => o.value)),
            ]}
          />

          {/* 6. 상태 */}
          <SelectField
            label="상태"
            value={form.status}
            onChange={(val) => setForm((prev) => ({ ...prev, status: val }))}
            options={[
              { value: '준비중', label: '준비중' },
              { value: '기획중', label: '기획중' },
              { value: '진행중', label: '진행중' },
              { value: '운영중', label: '운영중' },
              { value: '완료', label: '완료' },
            ]}
          />

          {/* 기타 필드들 */}
          <SelectField
            label="파트너 회사"
            value={form.partner_company_id}
            onChange={(val) => setForm((prev) => ({ ...prev, partner_company_id: val }))}
            options={[
              { value: '', label: '선택 안함' },
              ...((partnerCompaniesData ?? [])
                .map((c: any) => ({ value: String(c.id || ''), label: c.company_name_ko || c.company_name_en || '' }))
                .filter((o: any) => o.value)),
            ]}
          />
          <SelectField
            label="파트너 인력"
            value={form.partner_worker_id}
            onChange={(val) => setForm((prev) => ({ ...prev, partner_worker_id: val }))}
            options={[
              { value: '', label: '선택 안함' },
              ...((partnerWorkersData ?? [])
                .map((w: any) => ({ value: String(w.id || ''), label: w.name_ko || w.name_en || w.name || '' }))
                .filter((o: any) => o.value)),
            ]}
          />
          <div className="grid grid-cols-2 gap-2">
            <InputField
              label="시작일"
              type="date"
              value={form.startDate}
              onChange={(v) => setForm((prev) => ({ ...prev, startDate: v }))}
            />
            <InputField
              label="종료일"
              type="date"
              value={form.endDate}
              onChange={(v) => setForm((prev) => ({ ...prev, endDate: v }))}
            />
          </div>
        </div>

        {/* 7. 참여자 선택 섹션 */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">참여자 관리</label>
          <div className="flex gap-2 mb-3">
            <select
              value={participantSelectType}
              onChange={(e) => {
                setParticipantSelectType(e.target.value as 'user' | 'partner_worker' | 'partner_company');
                setParticipantSelectId('');
              }}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="user">내부 사용자</option>
              <option value="partner_worker">파트너 인력</option>
              <option value="partner_company">파트너 회사</option>
            </select>
            <select
              value={participantSelectId}
              onChange={(e) => setParticipantSelectId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="">선택하세요</option>
              {participantSelectType === 'user'
                ? (usersData?.users ?? [])
                    .filter((u: any) => !selectedParticipants.some((p) => p.type === 'user' && p.id === u.id))
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))
                : participantSelectType === 'partner_worker'
                  ? (partnerWorkersData ?? [])
                      .filter((w: any) => !selectedParticipants.some((p) => p.type === 'partner_worker' && p.id === w.id))
                      .map((w: any) => (
                        <option key={w.id} value={w.id}>
                          {w.name_ko || w.name_en || w.name || ''}
                        </option>
                      ))
                  : (partnerCompaniesData ?? [])
                      .filter((c: any) => !selectedParticipants.some((p) => p.type === 'partner_company' && p.id === c.id))
                      .map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.company_name_ko || c.company_name_en || ''}
                        </option>
                      ))}
            </select>
            <button
              type="button"
              onClick={handleAddParticipant}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
            >
              추가
            </button>
          </div>
          {selectedParticipants.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">선택된 참여자:</p>
              <div className="flex flex-wrap gap-2">
                {selectedParticipants.map((p, index) => (
                  <span
                    key={`${p.type}-${p.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium"
                  >
                    {p.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(index)}
                      className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 8. 재무 현황 섹션 - 수정 모드일 때만 표시 */}
        {isEditMode && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <TrendingUp className="h-4 w-4 text-green-500" />
                재무 현황
              </label>
              {computedFinancePermission === 'none' && (
                <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <Lock className="h-3 w-3" />
                  열람 권한 없음
                </span>
              )}
            </div>

            {computedFinancePermission === 'none' ? (
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 text-center">
                <EyeOff className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  재무 정보 열람 권한이 없습니다.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  관리자에게 문의하세요.
                </p>
              </div>
            ) : (
              <>
                {/* 재무 요약 */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">매출</span>
                    </div>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">
                      ₩{formatCurrency(financeSummary.totalRevenue)}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">{financeSummary.revenueCount}건</p>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">지출</span>
                    </div>
                    <p className="text-lg font-bold text-red-700 dark:text-red-300">
                      ₩{formatCurrency(financeSummary.totalExpense)}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">{financeSummary.expenseCount}건</p>
                  </div>
                </div>

                {/* 손익 */}
                <div className={`rounded-lg p-3 mb-4 ${
                  financeSummary.totalRevenue - financeSummary.totalExpense >= 0
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">손익</span>
                    <span className={`text-lg font-bold ${
                      financeSummary.totalRevenue - financeSummary.totalExpense >= 0
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-orange-700 dark:text-orange-300'
                    }`}>
                      {financeSummary.totalRevenue - financeSummary.totalExpense >= 0 ? '+' : ''}
                      ₩{formatCurrency(financeSummary.totalRevenue - financeSummary.totalExpense)}
                    </span>
                  </div>
                </div>

                {/* 최근 거래 내역 */}
                {financeData && financeData.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">최근 거래 (최대 5건)</p>
                    <div className="space-y-1">
                      {financeData.slice(0, 5).map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => onViewFinanceDetail?.(entry)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                        >
                          <div className="flex items-center gap-2">
                            {entry.kind === 'revenue' ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span className="text-xs text-slate-600 dark:text-slate-400">{entry.category}</span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{entry.name}</span>
                          </div>
                          <span className={`text-xs font-semibold ${
                            entry.kind === 'revenue' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {entry.kind === 'revenue' ? '+' : '-'}₩{formatCurrency(entry.amount)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 재무 등록 버튼 - 편집 권한이 있을 때만 */}
                {canEditFinance && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onAddRevenue}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
                    >
                      <Plus className="h-4 w-4" />
                      매출 등록
                    </button>
                    <button
                      type="button"
                      onClick={onAddExpense}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
                    >
                      <Plus className="h-4 w-4" />
                      지출 등록
                    </button>
                  </div>
                )}

                {/* 열람만 가능한 경우 안내 */}
                {computedFinancePermission === 'view' && (
                  <div className="flex items-center justify-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-2">
                    <Eye className="h-3 w-3" />
                    열람만 가능 (등록/수정 권한 없음)
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

