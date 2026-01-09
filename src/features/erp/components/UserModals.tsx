'use client';

import { useState } from 'react';
import { ModalShell, InputField, SelectField, ModalActions } from './modal-components';
import { BU, BU_TITLES } from '../types';

export function EditUserModal({
  user,
  onClose,
  onSubmit,
}: {
  user: any;
  onClose: () => void;
  onSubmit: (payload: {
    name?: string;
    email?: string;
    role?: string;
    bu_code?: string;
    position?: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'member',
    bu_code: user.bu_code || '',
    position: user.position || '',
  });
  const [error, setError] = useState<string>('');

  return (
    <ModalShell title="회원 정보 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="이름"
          placeholder="이름을 입력하세요"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="이메일"
          type="email"
          placeholder="이메일을 입력하세요"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <SelectField
          label="역할"
          value={form.role}
          onChange={(val) => setForm((prev) => ({ ...prev, role: val }))}
          options={[
            { value: 'admin', label: '관리자' },
            { value: 'manager', label: '매니저' },
            { value: 'member', label: '멤버' },
            { value: 'viewer', label: '뷰어' },
            { value: 'artist', label: '아티스트' },
          ]}
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
          label="직급"
          placeholder="예: 대표, 실장, 대리"
          value={form.position}
          onChange={(v) => setForm((prev) => ({ ...prev, position: v }))}
        />
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

          if (missingFields.length > 0) {
            setError(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
            return;
          }

          setError('');
          await onSubmit({
            name: form.name,
            email: form.email || undefined,
            role: form.role,
            bu_code: form.bu_code || undefined,
            position: form.position || undefined,
          });
        }}
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}

export function CreateUserModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    email: string;
    password: string;
    role?: string;
    bu_code?: string;
    position?: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'member',
    bu_code: '',
    position: '',
  });
  const [error, setError] = useState<string>('');

  return (
    <ModalShell title="회원 생성" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="이름"
          placeholder="이름을 입력하세요"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="이메일"
          type="email"
          placeholder="이메일을 입력하세요"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <InputField
          label="비밀번호"
          type="password"
          placeholder="비밀번호를 입력하세요 (최소 6자)"
          value={form.password}
          onChange={(v) => setForm((prev) => ({ ...prev, password: v }))}
        />
        <InputField
          label="비밀번호 확인"
          type="password"
          placeholder="비밀번호를 다시 입력하세요"
          value={form.confirmPassword}
          onChange={(v) => setForm((prev) => ({ ...prev, confirmPassword: v }))}
        />
        <SelectField
          label="역할"
          value={form.role}
          onChange={(val) => setForm((prev) => ({ ...prev, role: val }))}
          options={[
            { value: 'admin', label: '관리자' },
            { value: 'manager', label: '매니저' },
            { value: 'member', label: '멤버' },
            { value: 'viewer', label: '뷰어' },
            { value: 'artist', label: '아티스트' },
          ]}
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
          label="직급"
          placeholder="예: 대표, 실장, 대리"
          value={form.position}
          onChange={(v) => setForm((prev) => ({ ...prev, position: v }))}
        />
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
          if (!form.email) missingFields.push('이메일');
          if (!form.password) missingFields.push('비밀번호');
          if (!form.confirmPassword) missingFields.push('비밀번호 확인');

          if (missingFields.length > 0) {
            setError(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
            return;
          }

          if (form.password !== form.confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
          }

          if (form.password.length < 6) {
            setError('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
          }

          setError('');
          try {
            await onSubmit({
              name: form.name,
              email: form.email,
              password: form.password,
              role: form.role,
              bu_code: form.bu_code || undefined,
              position: form.position || undefined,
            });
          } catch (err: any) {
            setError(err.message || '회원 생성 중 오류가 발생했습니다.');
          }
        }}
        onClose={onClose}
        primaryLabel="생성"
      />
    </ModalShell>
  );
}
