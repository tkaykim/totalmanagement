'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { ModalShell, InputField, SelectField, ModalActions } from './modal-components';
import { BU, BU_TITLES } from '../types';

export function CreateOrgMemberModal({
  onClose,
  onSubmit,
  orgUnits,
  defaultOrgUnitId,
}: {
  onClose: () => void;
  onSubmit: (payload: {
    org_unit_id: number;
    name: string;
    title: string;
    bu_code?: string;
    phone?: string;
    email?: string;
    is_active?: boolean;
    is_leader?: boolean;
  }) => Promise<void>;
  orgUnits: any[];
  defaultOrgUnitId?: number | null;
}) {
  const [form, setForm] = useState({
    org_unit_id: defaultOrgUnitId || orgUnits[0]?.id || 0,
    name: '',
    title: '',
    bu_code: '',
    phone: '',
    email: '',
    is_active: true,
    is_leader: false,
  });
  const [error, setError] = useState<string>('');

  return (
    <ModalShell title="조직 멤버 추가" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="소속 조직"
          value={String(form.org_unit_id)}
          onChange={(val) => setForm((prev) => ({ ...prev, org_unit_id: Number(val) }))}
          options={orgUnits.map((unit) => ({
            value: String(unit.id),
            label: unit.name,
          }))}
        />
        <InputField
          label="이름"
          placeholder="이름을 입력하세요"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="직급"
          placeholder="예: 대표, 실장, 대리"
          value={form.title}
          onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
        />
        <SelectField
          label="소속사업부"
          value={form.bu_code}
          onChange={(val) => setForm((prev) => ({ ...prev, bu_code: val }))}
          options={[
            { value: '', label: '선택 안함' },
            ...(Object.keys(BU_TITLES) as BU[]).map((k) => ({
              value: k,
              label: BU_TITLES[k],
            })),
          ]}
        />
        <InputField
          label="연락처"
          placeholder="전화번호를 입력하세요"
          value={form.phone}
          onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
        />
        <InputField
          label="이메일주소"
          type="email"
          placeholder="이메일을 입력하세요"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="활성화 여부"
            value={form.is_active ? 'true' : 'false'}
            onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'true' }))}
            options={[
              { value: 'true', label: '활성' },
              { value: 'false', label: '비활성' },
            ]}
          />
          <SelectField
            label="리더 여부"
            value={form.is_leader ? 'true' : 'false'}
            onChange={(val) => setForm((prev) => ({ ...prev, is_leader: val === 'true' }))}
            options={[
              { value: 'false', label: '일반' },
              { value: 'true', label: '리더' },
            ]}
          />
        </div>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={async () => {
          const missingFields: string[] = [];
          if (!form.name) missingFields.push('이름');
          if (!form.title) missingFields.push('직급');
          if (!form.org_unit_id) missingFields.push('소속 조직');

          if (missingFields.length > 0) {
            setError(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
            return;
          }

          setError('');
          await onSubmit({
            org_unit_id: form.org_unit_id,
            name: form.name,
            title: form.title,
            bu_code: form.bu_code || undefined,
            phone: form.phone || undefined,
            email: form.email || undefined,
            is_active: form.is_active,
            is_leader: form.is_leader,
          });
        }}
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

export function EditOrgMemberModal({
  member,
  onClose,
  onSubmit,
  orgUnits,
}: {
  member: any;
  onClose: () => void;
  onSubmit: (payload: {
    org_unit_id?: number;
    name?: string;
    title?: string;
    bu_code?: string;
    phone?: string;
    email?: string;
    is_active?: boolean;
    is_leader?: boolean;
  }) => Promise<void>;
  orgUnits: any[];
}) {
  const [form, setForm] = useState({
    org_unit_id: member.org_unit_id || 0,
    name: member.name || '',
    title: member.title || '',
    bu_code: member.bu_code || '',
    phone: member.phone || '',
    email: member.email || '',
    is_active: member.is_active !== undefined ? member.is_active : true,
    is_leader: member.is_leader || false,
  });
  const [error, setError] = useState<string>('');

  return (
    <ModalShell title="조직 멤버 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="소속 조직"
          value={String(form.org_unit_id)}
          onChange={(val) => setForm((prev) => ({ ...prev, org_unit_id: Number(val) }))}
          options={orgUnits.map((unit) => ({
            value: String(unit.id),
            label: unit.name,
          }))}
        />
        <InputField
          label="이름"
          placeholder="이름을 입력하세요"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="직급"
          placeholder="예: 대표, 실장, 대리"
          value={form.title}
          onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
        />
        <SelectField
          label="소속사업부"
          value={form.bu_code}
          onChange={(val) => setForm((prev) => ({ ...prev, bu_code: val }))}
          options={[
            { value: '', label: '선택 안함' },
            ...(Object.keys(BU_TITLES) as BU[]).map((k) => ({
              value: k,
              label: BU_TITLES[k],
            })),
          ]}
        />
        <InputField
          label="연락처"
          placeholder="전화번호를 입력하세요"
          value={form.phone}
          onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
        />
        <InputField
          label="이메일주소"
          type="email"
          placeholder="이메일을 입력하세요"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="활성화 여부"
            value={form.is_active ? 'true' : 'false'}
            onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'true' }))}
            options={[
              { value: 'true', label: '활성' },
              { value: 'false', label: '비활성' },
            ]}
          />
          <SelectField
            label="리더 여부"
            value={form.is_leader ? 'true' : 'false'}
            onChange={(val) => setForm((prev) => ({ ...prev, is_leader: val === 'true' }))}
            options={[
              { value: 'false', label: '일반' },
              { value: 'true', label: '리더' },
            ]}
          />
        </div>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={async () => {
          const missingFields: string[] = [];
          if (!form.name) missingFields.push('이름');
          if (!form.title) missingFields.push('직급');
          if (!form.org_unit_id) missingFields.push('소속 조직');

          if (missingFields.length > 0) {
            setError(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
            return;
          }

          setError('');
          await onSubmit({
            org_unit_id: form.org_unit_id,
            name: form.name,
            title: form.title,
            bu_code: form.bu_code || undefined,
            phone: form.phone || undefined,
            email: form.email || undefined,
            is_active: form.is_active,
            is_leader: form.is_leader,
          });
        }}
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}

export function CreateExternalWorkerModal({
  onClose,
  onSubmit,
  defaultBu,
}: {
  onClose: () => void;
  onSubmit: (payload: {
    bu_code: BU;
    name: string;
    company_name?: string;
    worker_type?: 'freelancer' | 'company' | 'contractor';
    phone?: string;
    email?: string;
    specialties?: string[];
    notes?: string;
    is_active?: boolean;
  }) => Promise<void>;
  defaultBu?: BU;
}) {
  const [form, setForm] = useState({
    bu_code: defaultBu || 'GRIGO',
    name: '',
    company_name: '',
    worker_type: 'freelancer' as 'freelancer' | 'company' | 'contractor',
    phone: '',
    email: '',
    specialties: [] as string[],
    specialtyInput: '',
    notes: '',
    is_active: true,
  });
  const [error, setError] = useState<string>('');

  const handleAddSpecialty = () => {
    if (form.specialtyInput.trim()) {
      setForm((prev) => ({
        ...prev,
        specialties: [...prev.specialties, prev.specialtyInput.trim()],
        specialtyInput: '',
      }));
    }
  };

  const handleRemoveSpecialty = (index: number) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index),
    }));
  };

  return (
    <ModalShell title="외주 인력 추가" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="소속사업부"
          value={form.bu_code}
          onChange={(val) => setForm((prev) => ({ ...prev, bu_code: val as BU }))}
          options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({
            value: k,
            label: BU_TITLES[k],
          }))}
        />
        <InputField
          label="이름"
          placeholder="이름을 입력하세요"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <SelectField
          label="인력 타입"
          value={form.worker_type}
          onChange={(val) =>
            setForm((prev) => ({ ...prev, worker_type: val as typeof form.worker_type }))
          }
          options={[
            { value: 'freelancer', label: '프리랜서' },
            { value: 'company', label: '외주회사' },
            { value: 'contractor', label: '계약직' },
          ]}
        />
        {form.worker_type === 'company' && (
          <InputField
            label="회사명"
            placeholder="외주회사명을 입력하세요"
            value={form.company_name}
            onChange={(v) => setForm((prev) => ({ ...prev, company_name: v }))}
          />
        )}
        <InputField
          label="연락처"
          placeholder="전화번호를 입력하세요"
          value={form.phone}
          onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
        />
        <InputField
          label="이메일주소"
          type="email"
          placeholder="이메일을 입력하세요"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">전문 분야</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="전문 분야를 입력하고 추가 버튼을 클릭하세요"
              value={form.specialtyInput}
              onChange={(e) => setForm((prev) => ({ ...prev, specialtyInput: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSpecialty();
                }
              }}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddSpecialty}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              추가
            </button>
          </div>
          {form.specialties.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {form.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700"
                >
                  {specialty}
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecialty(index)}
                    className="text-blue-700 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">비고</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            rows={3}
            placeholder="추가 정보를 입력하세요"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <SelectField
            label="활성화 상태"
            value={form.is_active ? 'active' : 'inactive'}
            onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'active' }))}
            options={[
              { value: 'active', label: '활성' },
              { value: 'inactive', label: '비활성' },
            ]}
          />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <ModalActions
        onPrimary={async () => {
          if (!form.name.trim()) {
            setError('이름을 입력해주세요.');
            return;
          }
          setError('');
          await onSubmit({
            bu_code: form.bu_code,
            name: form.name,
            company_name: form.company_name || undefined,
            worker_type: form.worker_type,
            phone: form.phone || undefined,
            email: form.email || undefined,
            specialties: form.specialties.length > 0 ? form.specialties : undefined,
            notes: form.notes || undefined,
            is_active: form.is_active,
          });
        }}
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

export function EditExternalWorkerModal({
  worker,
  onClose,
  onSubmit,
}: {
  worker: any;
  onClose: () => void;
  onSubmit: (payload: {
    bu_code?: BU;
    name?: string;
    company_name?: string;
    worker_type?: 'freelancer' | 'company' | 'contractor';
    phone?: string;
    email?: string;
    specialties?: string[];
    notes?: string;
    is_active?: boolean;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    bu_code: worker.bu_code || 'GRIGO',
    name: worker.name || '',
    company_name: worker.company_name || '',
    worker_type: (worker.worker_type || 'freelancer') as 'freelancer' | 'company' | 'contractor',
    phone: worker.phone || '',
    email: worker.email || '',
    specialties: (worker.specialties || []) as string[],
    specialtyInput: '',
    notes: worker.notes || '',
    is_active: worker.is_active !== undefined ? worker.is_active : true,
  });
  const [error, setError] = useState<string>('');

  const handleAddSpecialty = () => {
    if (form.specialtyInput.trim()) {
      setForm((prev) => ({
        ...prev,
        specialties: [...prev.specialties, prev.specialtyInput.trim()],
        specialtyInput: '',
      }));
    }
  };

  const handleRemoveSpecialty = (index: number) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index),
    }));
  };

  return (
    <ModalShell title="외주 인력 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="소속사업부"
          value={form.bu_code}
          onChange={(val) => setForm((prev) => ({ ...prev, bu_code: val as BU }))}
          options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({
            value: k,
            label: BU_TITLES[k],
          }))}
        />
        <InputField
          label="이름"
          placeholder="이름을 입력하세요"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <SelectField
          label="인력 타입"
          value={form.worker_type}
          onChange={(val) =>
            setForm((prev) => ({ ...prev, worker_type: val as typeof form.worker_type }))
          }
          options={[
            { value: 'freelancer', label: '프리랜서' },
            { value: 'company', label: '외주회사' },
            { value: 'contractor', label: '계약직' },
          ]}
        />
        {form.worker_type === 'company' && (
          <InputField
            label="회사명"
            placeholder="외주회사명을 입력하세요"
            value={form.company_name}
            onChange={(v) => setForm((prev) => ({ ...prev, company_name: v }))}
          />
        )}
        <InputField
          label="연락처"
          placeholder="전화번호를 입력하세요"
          value={form.phone}
          onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
        />
        <InputField
          label="이메일주소"
          type="email"
          placeholder="이메일을 입력하세요"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">전문 분야</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="전문 분야를 입력하고 추가 버튼을 클릭하세요"
              value={form.specialtyInput}
              onChange={(e) => setForm((prev) => ({ ...prev, specialtyInput: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSpecialty();
                }
              }}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddSpecialty}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              추가
            </button>
          </div>
          {form.specialties.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {form.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700"
                >
                  {specialty}
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecialty(index)}
                    className="text-blue-700 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">비고</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            rows={3}
            placeholder="추가 정보를 입력하세요"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <SelectField
            label="활성화 상태"
            value={form.is_active ? 'active' : 'inactive'}
            onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'active' }))}
            options={[
              { value: 'active', label: '활성' },
              { value: 'inactive', label: '비활성' },
            ]}
          />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <ModalActions
        onPrimary={async () => {
          if (!form.name.trim()) {
            setError('이름을 입력해주세요.');
            return;
          }
          setError('');
          await onSubmit({
            bu_code: form.bu_code,
            name: form.name,
            company_name: form.company_name || undefined,
            worker_type: form.worker_type,
            phone: form.phone || undefined,
            email: form.email || undefined,
            specialties: form.specialties.length > 0 ? form.specialties : undefined,
            notes: form.notes || undefined,
            is_active: form.is_active,
          });
        }}
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}
