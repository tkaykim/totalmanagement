'use client';

import { useState } from 'react';
import { Plus, X, Users, Settings, CalendarIcon, CheckSquare, Edit3, Trash2 } from 'lucide-react';
import type { BU, Client, Channel, ProjectStep } from '@/types/database';
import { ModalShell, ModalActions, InputField, SelectField } from '../common';
import { formatUserName, formatPartnerWorkerName, calculateDatesFromRelease } from '../../lib';

interface CreateProjectModalProps {
  bu: BU;
  clients: Client[];
  orgMembers: any[];
  appUsers: any[];
  externalWorkers: any[];
  partnerWorkers: any[];
  partnerCompanies?: any[];
  channels: Channel[];
  onClose: () => void;
  onSubmit: (data: {
    bu: BU;
    name: string;
    description?: string | null;
    cat?: string | null;
    channel_id?: number | null;
    startDate: string;
    endDate: string;
    status: string;
    client_id?: number | null;
    pm_ids?: string[];
    active_steps?: ProjectStep[];
    release_date?: string | null;
    plan_date?: string | null;
    script_date?: string | null;
    shoot_date?: string | null;
    edit1_date?: string | null;
    edit_final_date?: string | null;
    participants?: Array<{ user_id?: string; partner_worker_id?: number; partner_company_id?: number; role: string; is_pm: boolean }>;
  }) => void;
  onOpenClientModal: () => void;
  onOpenEditClientModal: (client: Client) => void;
  onDeleteClient: (clientId: number) => void;
}

export function CreateProjectModal({
  bu,
  clients,
  orgMembers,
  appUsers,
  externalWorkers,
  partnerWorkers,
  partnerCompanies,
  channels,
  onClose,
  onSubmit,
  onOpenClientModal,
  onOpenEditClientModal,
  onDeleteClient,
}: CreateProjectModalProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    cat: '',
    channel_id: '',
    startDate: '',
    endDate: '',
    status: '준비중',
    client_id: '',
    pm_ids: [] as string[],
    active_steps: [] as ProjectStep[],
    release_date: '',
  });
  const [selectedParticipants, setSelectedParticipants] = useState<Array<{ type: 'user' | 'partner_worker' | 'partner_company'; id: string | number; name: string }>>([]);
  const [participantSelectType, setParticipantSelectType] = useState<'user' | 'partner_worker' | 'partner_company'>('user');
  const [participantSelectId, setParticipantSelectId] = useState<string>('');

  const handleAddParticipant = () => {
    if (!participantSelectId) return;

    if (participantSelectType === 'user') {
      const user = appUsers.find((u: any) => u.id === participantSelectId);
      if (user && !selectedParticipants.some((p) => p.type === 'user' && p.id === user.id)) {
        setSelectedParticipants((prev) => [...prev, { type: 'user', id: user.id, name: formatUserName(user) }]);
        setParticipantSelectId('');
      }
    } else if (participantSelectType === 'partner_worker') {
      const worker = partnerWorkers.find((w: any) => w.id === Number(participantSelectId));
      if (worker && !selectedParticipants.some((p) => p.type === 'partner_worker' && p.id === worker.id)) {
        setSelectedParticipants((prev) => [...prev, { type: 'partner_worker', id: worker.id, name: formatPartnerWorkerName(worker) }]);
        setParticipantSelectId('');
      }
    } else if (participantSelectType === 'partner_company') {
      const company = (partnerCompanies || []).find((c: any) => c.id === Number(participantSelectId));
      if (company && !selectedParticipants.some((p) => p.type === 'partner_company' && p.id === company.id)) {
        const companyName = company.company_name_ko || company.company_name_en || `회사 #${company.id}`;
        setSelectedParticipants((prev) => [...prev, { type: 'partner_company', id: company.id, name: companyName }]);
        setParticipantSelectId('');
      }
    }
  };

  const handleRemoveParticipant = (index: number) => {
    setSelectedParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedClient = form.client_id ? clients.find((c) => c.id === Number(form.client_id)) : null;
  const selectedChannel = form.channel_id ? channels.find((c) => c.id === Number(form.channel_id)) : null;
  const buChannels = channels.filter((c) => c.bu_code === bu);

  const handleReleaseDateChange = (releaseDate: string) => {
    const calculatedDates = calculateDatesFromRelease(releaseDate);
    setForm((prev) => ({
      ...prev,
      release_date: releaseDate,
      endDate: releaseDate,
      ...calculatedDates,
    }));
  };

  const toggleStep = (step: ProjectStep) => {
    const currentSteps = form.active_steps || [];
    const newSteps = currentSteps.includes(step)
      ? currentSteps.filter((s) => s !== step)
      : [...currentSteps, step];
    setForm((prev) => ({ ...prev, active_steps: newSteps }));
  };

  return (
    <ModalShell
      title="프로젝트 등록"
      onClose={onClose}
      actions={
        <ModalActions
          onPrimary={() => {
            if (!form.name.trim()) {
              alert('프로젝트 제목은 필수입니다.');
              return;
            }
            
            const calculatedDates = form.release_date ? calculateDatesFromRelease(form.release_date) : {};
            const participants = selectedParticipants.map((p) => ({
              user_id: p.type === 'user' ? (p.id as string) : undefined,
              partner_worker_id: p.type === 'partner_worker' ? (p.id as number) : undefined,
              partner_company_id: p.type === 'partner_company' ? (p.id as number) : undefined,
              role: 'participant',
              is_pm: false,
            }));
            
            onSubmit({
              bu,
              name: form.name.trim(),
              description: form.description.trim() || null,
              cat: form.cat.trim() || null,
              channel_id: form.channel_id ? Number(form.channel_id) : null,
              startDate: form.startDate,
              endDate: form.release_date || form.endDate,
              status: form.status,
              client_id: form.client_id ? Number(form.client_id) : null,
              pm_ids: form.pm_ids,
              active_steps: form.active_steps,
              release_date: form.release_date || null,
              participants,
              ...calculatedDates,
            });
          }}
          onClose={onClose}
          primaryLabel="등록"
        />
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <InputField
            label="프로젝트 제목 *"
            placeholder="프로젝트 제목을 입력하세요"
            value={form.name}
            onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <span className="text-xs text-slate-500 dark:text-slate-400">프로젝트 설명 (선택사항)</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="프로젝트에 대한 설명을 입력하세요"
              rows={3}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 resize-none"
            />
          </label>
        </div>

        <div className="md:col-span-2">
          <SelectField
            label="채널 선택 (선택사항)"
            value={form.channel_id}
            onChange={(val) => {
              const channel = channels.find((c) => c.id === Number(val));
              setForm((prev) => ({
                ...prev,
                channel_id: val,
                cat: channel?.name || prev.cat,
              }));
            }}
            options={[
              { value: '', label: '선택 안함' },
              ...buChannels.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <SelectField
                label="클라이언트 (선택사항)"
                value={form.client_id}
                onChange={(val) => setForm((prev) => ({ ...prev, client_id: val }))}
                options={[
                  { value: '', label: '선택 안함' },
                  ...clients.map((c) => ({ value: String(c.id), label: c.company_name_ko || c.company_name_en || '' })),
                ]}
              />
            </div>
            <div className="flex gap-2 pb-0.5">
              <button
                type="button"
                onClick={onOpenClientModal}
                className="px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                새로 만들기
              </button>
              {selectedClient && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenEditClientModal(selectedClient)}
                    className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteClient(selectedClient.id)}
                    className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <InputField
          label="카테고리 (선택사항)"
          placeholder="예: 안무제작"
          value={form.cat}
          onChange={(v) => setForm((prev) => ({ ...prev, cat: v }))}
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
        <SelectField
          label="상태"
          value={form.status}
          onChange={(val) => setForm((prev) => ({ ...prev, status: val }))}
          options={[
            { value: '준비중', label: '준비중' },
            { value: '진행중', label: '진행중' },
            { value: '운영중', label: '운영중' },
            { value: '기획중', label: '기획중' },
            { value: '완료', label: '완료' },
          ]}
        />
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 block">PM / 감독 (다수 선택 가능)</label>
          <div className="space-y-2">
            <select
              value=""
              onChange={(e) => {
                const userId = e.target.value;
                if (userId && !form.pm_ids.includes(userId)) {
                  setForm((prev) => ({ ...prev, pm_ids: [...prev.pm_ids, userId] }));
                  e.target.value = '';
                }
              }}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
            >
              <option value="">PM을 선택하세요</option>
              {appUsers
                .filter((u: any) => !form.pm_ids.includes(u.id))
                .map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {formatUserName(u)}
                  </option>
                ))}
            </select>
            {form.pm_ids.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.pm_ids.map((pmId) => {
                  const pm = appUsers.find((u: any) => u.id === pmId);
                  if (!pm) return null;
                  return (
                    <span
                      key={pmId}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium"
                    >
                      {formatUserName(pm)}
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, pm_ids: prev.pm_ids.filter((id) => id !== pmId) }))}
                        className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
        <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-3">
          <Users className="w-4 h-4" /> 참여자 관리
        </h3>
        <div className="flex gap-2 mb-3">
          <select
            value={participantSelectType}
            onChange={(e) => {
              setParticipantSelectType(e.target.value as 'user' | 'partner_worker' | 'partner_company');
              setParticipantSelectId('');
            }}
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="user">내부 직원 (app_users)</option>
            <option value="partner_worker">파트너 인력 (partner_worker)</option>
            <option value="partner_company">파트너 회사 (partner_company)</option>
          </select>
          <select
            value={participantSelectId}
            onChange={(e) => setParticipantSelectId(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="">선택하세요</option>
            {participantSelectType === 'user'
              ? appUsers
                  .filter((u: any) => !selectedParticipants.some((p) => p.type === 'user' && p.id === u.id))
                  .map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {formatUserName(u)}
                    </option>
                  ))
              : participantSelectType === 'partner_worker'
                ? partnerWorkers
                    .filter((w: any) => !selectedParticipants.some((p) => p.type === 'partner_worker' && p.id === w.id))
                    .map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {formatPartnerWorkerName(w)}
                      </option>
                    ))
                : (partnerCompanies || [])
                    .filter((c: any) => !selectedParticipants.some((p) => p.type === 'partner_company' && p.id === c.id))
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name_ko || c.company_name_en || `회사 #${c.id}`}
                      </option>
                    ))}
          </select>
          <button
            type="button"
            onClick={handleAddParticipant}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold transition hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>
        {selectedParticipants.length > 0 && (
          <div className="space-y-2 mb-3">
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
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
        <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4" /> 진행 단계 설정
        </h3>
        <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-2 rounded-lg">
          {[
            { id: 'plan' as ProjectStep, label: '기획' },
            { id: 'script' as ProjectStep, label: '대본' },
            { id: 'shoot' as ProjectStep, label: '촬영' },
            { id: 'edit' as ProjectStep, label: '편집' }
          ].map(step => {
            const isActive = form.active_steps?.includes(step.id);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => toggleStep(step.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 shadow-sm border border-gray-200 dark:border-slate-700'
                    : 'text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:bg-slate-700'
                }`}
              >
                {isActive ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <X className="w-4 h-4" />}
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      {form.active_steps && form.active_steps.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-3">
            <CalendarIcon className="w-4 h-4" /> 주요 일정 관리
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              {form.active_steps.includes('plan') && (
                <InputField
                  label="기획 확정 (D-11)"
                  type="date"
                  value={form.startDate}
                  onChange={(v) => setForm((prev) => ({ ...prev, startDate: v }))}
                />
              )}
              {form.active_steps.includes('script') && (
                <InputField
                  label="대본 확정 (D-9)"
                  type="date"
                  value=""
                  onChange={() => {}}
                  disabled
                />
              )}
              {form.active_steps.includes('shoot') && (
                <InputField
                  label="촬영 확정 (D-7)"
                  type="date"
                  value=""
                  onChange={() => {}}
                  disabled
                />
              )}
            </div>
            <div className="space-y-3">
              {form.active_steps.includes('edit') && (
                <>
                  <InputField
                    label="1차 편집 확정 (D-3)"
                    type="date"
                    value=""
                    onChange={() => {}}
                    disabled
                  />
                  <InputField
                    label="최종 편집 확정 (D-1)"
                    type="date"
                    value=""
                    onChange={() => {}}
                    disabled
                  />
                </>
              )}
              <div className="bg-red-50 p-3 rounded-lg">
                <InputField
                  label={`${form.client_id ? '최종 납품' : '업로드'} 예정일 (기준일)`}
                  type="date"
                  value={form.release_date}
                  onChange={(v) => handleReleaseDateChange(v)}
                />
                <p className="text-[10px] text-red-500 mt-1">* 날짜 변경 시 D-Day 역산하여 전체 일정 자동 조정</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

