'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BU_SELECT_OPTIONS, getBuName, isBuCode, type BuCode } from '@/lib/business-units';

/**
 * 가입 신청 목록 (spec R21). 본사 관리자에게만 렌더링한다(서버도 본사 관리자만 허용).
 * 승인 시 사업부(7개)와 역할(admin·leader·manager·member)을 지정한다.
 */

type SignupRequest = {
  id: string;
  name: string | null;
  email: string | null;
  status: 'pending' | 'rejected' | string;
  requested_bu_code: string | null;
  signup_message: string | null;
  signup_requested_at: string | null;
  approved_at: string | null;
  created_at: string | null;
};

type ApprovableRole = 'admin' | 'leader' | 'manager' | 'member';

const ROLE_OPTIONS: ReadonlyArray<{ value: ApprovableRole; label: string }> = [
  { value: 'member', label: '멤버' },
  { value: 'manager', label: '매니저' },
  { value: 'leader', label: '리더' },
  { value: 'admin', label: '관리자' },
];

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

export function SignupRequestsPanel() {
  const queryClient = useQueryClient();
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, { bu_code: BuCode | ''; role: ApprovableRole }>>({});
  const [showRejected, setShowRejected] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users/signup-requests', { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body?.error === 'string' ? body.error : '목록을 불러오지 못했습니다.');
      const list: SignupRequest[] = Array.isArray(body.requests) ? body.requests : [];
      setRequests(list);
      setChoices((prev) => {
        const next = { ...prev };
        for (const r of list) {
          if (!next[r.id]) {
            next[r.id] = { bu_code: isBuCode(r.requested_bu_code) ? r.requested_bu_code : '', role: 'member' };
          }
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (req: SignupRequest, action: 'approve' | 'reject') => {
    const choice = choices[req.id];
    if (action === 'approve') {
      if (!choice?.bu_code) {
        setError('승인할 사업부를 선택하세요.');
        return;
      }
      const roleLabel = ROLE_OPTIONS.find((o) => o.value === choice.role)?.label ?? choice.role;
      if (!window.confirm(`${req.name ?? req.email}님을 ${getBuName(choice.bu_code)} ${roleLabel}(으)로 승인할까요?`)) return;
    } else if (!window.confirm(`${req.name ?? req.email}님의 가입 신청을 거절할까요?`)) {
      return;
    }

    setBusyId(req.id);
    setError('');
    try {
      const res = await fetch(`/api/users/signup-requests/${req.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'approve' ? JSON.stringify({ bu_code: choice.bu_code, role: choice.role }) : undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body?.error === 'string' ? body.error : '처리에 실패했습니다.');
      await load();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : '처리에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const rejected = requests.filter((r) => r.status === 'rejected');
  const visible = showRejected ? rejected : pending;

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">가입 신청</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">본사 관리자만 보고 처리합니다. 승인 시 사업부와 역할을 지정합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => setShowRejected(false)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-semibold transition',
                !showRejected ? 'bg-white dark:bg-slate-700 text-blue-600 shadow' : 'text-slate-600 dark:text-slate-400',
              )}
            >
              대기 {pending.length}
            </button>
            <button
              type="button"
              onClick={() => setShowRejected(true)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-semibold transition',
                showRejected ? 'bg-white dark:bg-slate-700 text-blue-600 shadow' : 'text-slate-600 dark:text-slate-400',
              )}
            >
              거절 {rejected.length}
            </button>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-2 rounded-lg bg-red-50 dark:bg-red-900/30 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-white/60 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
            <tr>
              <th className="px-3 py-2 font-bold">신청일</th>
              <th className="px-3 py-2 font-bold">이름</th>
              <th className="px-3 py-2 font-bold">이메일</th>
              <th className="px-3 py-2 font-bold">희망 사업부</th>
              <th className="px-3 py-2 font-bold">남길 말</th>
              {!showRejected ? (
                <>
                  <th className="px-3 py-2 font-bold">승인 사업부</th>
                  <th className="px-3 py-2 font-bold">역할</th>
                  <th className="px-3 py-2 font-bold">처리</th>
                </>
              ) : (
                <th className="px-3 py-2 font-bold">거절일</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading && requests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-xs text-slate-400">불러오는 중...</td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-xs text-slate-400">
                  {showRejected ? '거절된 신청이 없습니다.' : '대기 중인 가입 신청이 없습니다.'}
                </td>
              </tr>
            ) : (
              visible.map((r) => {
                const choice = choices[r.id] ?? { bu_code: '', role: 'member' as ApprovableRole };
                const busy = busyId === r.id;
                return (
                  <tr key={r.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500">{formatDateTime(r.signup_requested_at ?? r.created_at)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">{r.name || '-'}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{r.email || '-'}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{getBuName(r.requested_bu_code) || '-'}</td>
                    <td className="px-3 py-2 max-w-[220px] whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">
                      {r.signup_message || '-'}
                    </td>
                    {!showRejected ? (
                      <>
                        <td className="px-3 py-2">
                          <select
                            value={choice.bu_code}
                            disabled={busy}
                            onChange={(e) =>
                              setChoices((prev) => ({ ...prev, [r.id]: { ...choice, bu_code: e.target.value as BuCode | '' } }))
                            }
                            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px]"
                          >
                            <option value="">선택</option>
                            {BU_SELECT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={choice.role}
                            disabled={busy}
                            onChange={(e) =>
                              setChoices((prev) => ({ ...prev, [r.id]: { ...choice, role: e.target.value as ApprovableRole } }))
                            }
                            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px]"
                          >
                            {ROLE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => act(r, 'approve')}
                              disabled={busy}
                              className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              <Check className="h-3 w-3" />
                              승인
                            </button>
                            <button
                              type="button"
                              onClick={() => act(r, 'reject')}
                              disabled={busy}
                              className="flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 disabled:opacity-50"
                            >
                              <X className="h-3 w-3" />
                              거절
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{formatDateTime(r.approved_at)}</td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
