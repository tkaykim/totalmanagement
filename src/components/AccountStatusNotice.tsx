'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, XCircle, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/**
 * 승인 대기·거절 계정 안내 화면 (spec R20).
 * 이 화면 말고 다른 화면·데이터는 보이지 않는다(데이터 차단은 서버 가드·RLS가 한다).
 */
export type AccountNoticeStatus = 'pending' | 'rejected';

export function isAccountNoticeStatus(value: unknown): value is AccountNoticeStatus {
  return value === 'pending' || value === 'rejected';
}

const COPY: Record<AccountNoticeStatus, { title: string; lines: string[] }> = {
  pending: {
    title: '승인 대기 중',
    lines: ['가입 신청이 접수되었습니다.', '본사 관리자가 승인하면 ERP를 이용할 수 있습니다.'],
  },
  rejected: {
    title: '가입이 거절됨',
    lines: ['가입 신청이 거절되었습니다.', '문의가 있으면 본사 관리자에게 연락해 주세요.'],
  },
};

export function AccountStatusNotice({ status, name }: { status: AccountNoticeStatus; name?: string | null }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const copy = COPY[status];
  const Icon = status === 'pending' ? Clock : XCircle;

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center shadow-lg">
        <div
          className={
            status === 'pending'
              ? 'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300'
              : 'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
          }
        >
          <Icon className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">{copy.title}</h1>
        {name && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{name}님</p>}
        <div className="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-300">
          {copy.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={signingOut}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
