'use client';

import { useState, useEffect, useMemo } from 'react';
import { Send, Users, Search, X, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { PushResultPanel } from './PushResultPanel';

interface AppUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  bu_code: string;
  position: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  leader: '리더',
  manager: '매니저',
  member: '멤버',
  viewer: '열람자',
  artist: '아티스트',
};

export function PushUserTab() {
  const [users, setUsers] = useState<AppUserItem[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('개인 알림');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [actionUrl, setActionUrl] = useState('/');
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('app_users')
        .select('id, name, email, role, bu_code, position')
        .order('name');
      setUsers((data as AppUserItem[]) || []);
      setUsersLoading(false);
    };
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.bu_code?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectedUsers = useMemo(
    () => users.filter((u) => selectedUserIds.includes(u.id)),
    [users, selectedUserIds]
  );

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError('제목과 메시지를 입력해주세요.');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('최소 1명의 사용자를 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserIds: selectedUserIds,
          title: title.trim(),
          message: message.trim(),
          type,
          actionUrl: actionUrl.trim() || '/',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '전송 실패');

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 사용자 선택 */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          사용자 선택
        </h3>

        {/* 선택된 사용자 뱃지 */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs font-medium"
              >
                {u.name}
                <button onClick={() => toggleUser(u.id)} className="hover:text-orange-900 dark:hover:text-orange-100">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={() => setSelectedUserIds([])}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
            >
              전체 해제
            </button>
          </div>
        )}

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름, 이메일, 사업부로 검색..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-sm outline-none focus:border-orange-300 dark:focus:border-orange-600"
          />
        </div>

        {/* 사용자 목록 */}
        <div className="max-h-[300px] overflow-y-auto space-y-1 border border-slate-100 dark:border-slate-700 rounded-lg">
          {usersLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              사용자 로딩 중...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              검색 결과가 없습니다.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = selectedUserIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left transition',
                    isSelected
                      ? 'bg-orange-50 dark:bg-orange-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  )}
                >
                  <div
                    className={cn(
                      'h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition',
                      isSelected
                        ? 'bg-orange-600 border-orange-600'
                        : 'border-slate-300 dark:border-slate-600'
                    )}
                  >
                    {isSelected && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {u.name}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {u.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      {u.bu_code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/50 text-[10px] font-semibold text-blue-600 dark:text-blue-300">
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          {selectedUserIds.length}명 선택됨
        </p>
      </div>

      {/* 메시지 작성 */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Send className="h-4 w-4 text-orange-500" />
          메시지 작성
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
              알림 유형
            </label>
            <div className="flex gap-2">
              {(['info', 'success', 'warning', 'error'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition',
                    type === t
                      ? t === 'info' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : t === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : t === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  )}
                >
                  {t === 'info' ? '정보' : t === 'success' ? '성공' : t === 'warning' ? '경고' : '오류'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="알림 제목을 입력하세요"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-orange-300 dark:focus:border-orange-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
              메시지
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="알림 내용을 입력하세요"
              rows={3}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-orange-300 dark:focus:border-orange-600 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
              이동 URL (선택)
            </label>
            <input
              type="text"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder="/"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono outline-none focus:border-orange-300 dark:focus:border-orange-600"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={loading || selectedUserIds.length === 0}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition',
            loading || selectedUserIds.length === 0
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/25'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              전송 중...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {selectedUserIds.length}명에게 전송
            </>
          )}
        </button>
      </div>

      {result && <PushResultPanel result={result} />}
    </div>
  );
}
