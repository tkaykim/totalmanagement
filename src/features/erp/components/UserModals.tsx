'use client';

import { useState } from 'react';
import { ModalShell, InputField, SelectField, ModalActions } from './modal-components';
import { BU, BU_TITLES } from '../types';
import { BU_CODES } from '@/lib/business-units';
import { ChangeLogList } from './ChangeLogList';

/**
 * 새로 줄 수 있는 역할(spec 2절·R21): 관리자·리더·매니저·멤버.
 * viewer·artist는 enum에만 남은 옛 역할이라 선택지에서 뺀다. 이미 그 역할인 계정은 읽기 전용으로 보여 준다.
 */
const ASSIGNABLE_ROLE_OPTIONS = [
  { value: 'admin', label: '관리자' },
  { value: 'leader', label: '리더' },
  { value: 'manager', label: '매니저' },
  { value: 'member', label: '멤버' },
];

const LEGACY_ROLE_LABELS: Record<string, string> = {
  viewer: '뷰어(옛 역할)',
  artist: '아티스트(옛 역할)',
};

function isAssignableRole(role: string | null | undefined): boolean {
  return ASSIGNABLE_ROLE_OPTIONS.some((o) => o.value === role);
}

export function EditUserModal({
  user,
  onClose,
  onSubmit,
  isAdmin = false,
}: {
  user: any;
  onClose: () => void;
  onSubmit: (payload: {
    name?: string;
    email?: string;
    role?: string;
    bu_code?: string;
    position?: string;
    hire_date?: string;
    status?: 'active' | 'dormant' | 'retired';
  }) => Promise<void>;
  isAdmin?: boolean;
}) {
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'member',
    bu_code: user.bu_code || '',
    position: user.position || '',
    hire_date: user.hire_date || '',
    status: (user.status || 'active') as 'active' | 'dormant' | 'retired',
  });
  const [error, setError] = useState<string>('');
  // 옛 역할(viewer·artist 등)인 계정: 역할은 보여 주기만 하고, 저장할 때 역할을 보내지 않는다.
  const legacyRole = !!user.role && !isAssignableRole(user.role) ? String(user.role) : null;
  const [changeLegacyRole, setChangeLegacyRole] = useState(false);
  const showRoleSelect = !legacyRole || changeLegacyRole;

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
        {showRoleSelect ? (
          <SelectField
            label="역할"
            value={isAssignableRole(form.role) ? form.role : ''}
            onChange={(val) => setForm((prev) => ({ ...prev, role: val }))}
            options={[
              ...(isAssignableRole(form.role) ? [] : [{ value: '', label: '역할 선택' }]),
              ...ASSIGNABLE_ROLE_OPTIONS,
            ]}
          />
        ) : (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">역할</span>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <span>{LEGACY_ROLE_LABELS[legacyRole!] ?? legacyRole}</span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setChangeLegacyRole(true);
                    setForm((prev) => ({ ...prev, role: '' }));
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  역할 바꾸기
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">이 역할은 더 이상 새로 줄 수 없습니다. 그대로 두면 바뀌지 않습니다.</p>
          </div>
        )}
        <SelectField
          label="소속사업부"
          value={form.bu_code}
          onChange={(val) => setForm((prev) => ({ ...prev, bu_code: val }))}
          options={[
            { value: '', label: '선택 안함' },
            ...BU_CODES.map((k) => ({
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
        {isAdmin && (
          <InputField
            label="입사일"
            type="date"
            placeholder="입사일을 선택하세요"
            value={form.hire_date}
            onChange={(v) => setForm((prev) => ({ ...prev, hire_date: v }))}
          />
        )}
        {isAdmin && (
          <SelectField
            label="재직 상태"
            value={form.status}
            onChange={(val) => setForm((prev) => ({ ...prev, status: val as 'active' | 'dormant' | 'retired' }))}
            options={[
              { value: 'active', label: '재직' },
              { value: 'dormant', label: '휴면' },
              { value: 'retired', label: '퇴사' },
            ]}
          />
        )}
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      {isAdmin && <ChangeLogList kind="user" id={user?.id} />}
      <ModalActions
        onPrimary={async () => {
          const missingFields: string[] = [];
          if (!form.name) missingFields.push('이름');
          if (showRoleSelect && !isAssignableRole(form.role)) missingFields.push('역할');

          if (missingFields.length > 0) {
            setError(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
            return;
          }

          setError('');
          await onSubmit({
            name: form.name,
            email: form.email || undefined,
            // 옛 역할을 그대로 두면 역할은 보내지 않는다(바뀌지 않음)
            role: showRoleSelect ? form.role : undefined,
            bu_code: form.bu_code || undefined,
            position: form.position || undefined,
            hire_date: isAdmin ? (form.hire_date || undefined) : undefined,
            status: isAdmin ? form.status : undefined,
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
  isAdmin = false,
}: {
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    email: string;
    password: string;
    role?: string;
    bu_code?: string;
    position?: string;
    hire_date?: string;
  }) => Promise<void>;
  isAdmin?: boolean;
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'member',
    bu_code: '',
    position: '',
    hire_date: '',
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
          options={ASSIGNABLE_ROLE_OPTIONS}
        />
        <SelectField
          label="소속사업부"
          value={form.bu_code}
          onChange={(val) => setForm((prev) => ({ ...prev, bu_code: val }))}
          options={[
            { value: '', label: '선택 안함' },
            ...BU_CODES.map((k) => ({
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
        {isAdmin && (
          <InputField
            label="입사일"
            type="date"
            placeholder="입사일을 선택하세요"
            value={form.hire_date}
            onChange={(v) => setForm((prev) => ({ ...prev, hire_date: v }))}
          />
        )}
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
              hire_date: isAdmin ? (form.hire_date || undefined) : undefined,
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
