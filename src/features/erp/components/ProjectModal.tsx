'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { ModalShell, InputField, SelectField, ModalActions } from './modal-components';

type BU = 'GRIGO' | 'REACT' | 'FLOW' | 'AST' | 'MODOO' | 'HEAD';

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
};

export function ProjectModal({
  project,
  onClose,
  onSubmit,
  defaultBu,
  usersData,
  partnerCompaniesData,
  partnerWorkersData,
  placeholders,
}: ProjectModalProps) {
  const isEditMode = !!project;
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
    <ModalShell title={isEditMode ? '프로젝트 수정' : '프로젝트 등록'} onClose={onClose}>
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
      </div>
      <ModalActions onPrimary={handleSubmit} onClose={onClose} primaryLabel={isEditMode ? '수정' : '등록'} />
    </ModalShell>
  );
}

