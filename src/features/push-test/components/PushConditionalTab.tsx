'use client';

import { useState } from 'react';
import { Send, Filter, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PushResultPanel } from './PushResultPanel';

const ROLES = [
  { value: 'admin', label: '관리자' },
  { value: 'leader', label: '리더' },
  { value: 'manager', label: '매니저' },
  { value: 'member', label: '멤버' },
  { value: 'viewer', label: '열람자' },
  { value: 'artist', label: '아티스트' },
];

const BU_CODES = [
  { value: 'HEAD', label: '본사 (HEAD)' },
  { value: 'GRIGO', label: '그리고 엔터 (GRIGO)' },
  { value: 'REACT', label: '리액트 스튜디오 (REACT)' },
  { value: 'FLOW', label: '플로우메이커 (FLOW)' },
  { value: 'AST', label: '아스트 컴퍼니 (AST)' },
  { value: 'MODOO', label: '모두굿즈 (MODOO)' },
];

export function PushConditionalTab() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedBuCodes, setSelectedBuCodes] = useState<string[]>([]);
  const [title, setTitle] = useState('조건부 알림');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [actionUrl, setActionUrl] = useState('/');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleBuCode = (bu: string) => {
    setSelectedBuCodes((prev) =>
      prev.includes(bu) ? prev.filter((b) => b !== bu) : [...prev, bu]
    );
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError('제목과 메시지를 입력해주세요.');
      return;
    }
    if (selectedRoles.length === 0 && selectedBuCodes.length === 0) {
      setError('최소 하나의 역할 또는 사업부를 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/push/conditional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          type,
          actionUrl: actionUrl.trim() || '/',
          conditions: {
            roles: selectedRoles.length > 0 ? selectedRoles : undefined,
            buCodes: selectedBuCodes.length > 0 ? selectedBuCodes : undefined,
          },
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

  const hasCondition = selectedRoles.length > 0 || selectedBuCodes.length > 0;

  return (
    <div className="space-y-4">
      {/* 조건 설정 */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Filter className="h-4 w-4 text-purple-500" />
          조건 설정
        </h3>

        {/* 역할 선택 */}
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 block">
            역할 필터 (선택한 역할에 해당하는 사용자에게 전송)
          </label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => {
              const isSelected = selectedRoles.includes(role.value);
              return (
                <button
                  key={role.value}
                  onClick={() => toggleRole(role.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition',
                    isSelected
                      ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  {isSelected && '✓ '}{role.label}
                </button>
              );
            })}
          </div>
          {selectedRoles.length > 0 && (
            <button
              onClick={() => setSelectedRoles([])}
              className="mt-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
            >
              역할 필터 초기화
            </button>
          )}
        </div>

        {/* 사업부 선택 */}
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 block">
            사업부 필터 (선택한 사업부 소속 사용자에게 전송)
          </label>
          <div className="flex flex-wrap gap-2">
            {BU_CODES.map((bu) => {
              const isSelected = selectedBuCodes.includes(bu.value);
              return (
                <button
                  key={bu.value}
                  onClick={() => toggleBuCode(bu.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition',
                    isSelected
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  {isSelected && '✓ '}{bu.label}
                </button>
              );
            })}
          </div>
          {selectedBuCodes.length > 0 && (
            <button
              onClick={() => setSelectedBuCodes([])}
              className="mt-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
            >
              사업부 필터 초기화
            </button>
          )}
        </div>

        {/* 현재 조건 요약 */}
        {hasCondition && (
          <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 px-4 py-3">
            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
              현재 조건 요약
            </p>
            <div className="text-[11px] text-purple-600 dark:text-purple-400 space-y-0.5">
              {selectedRoles.length > 0 && (
                <p>역할: {selectedRoles.map(r => ROLES.find(role => role.value === r)?.label).join(', ')}</p>
              )}
              {selectedBuCodes.length > 0 && (
                <p>사업부: {selectedBuCodes.map(b => BU_CODES.find(bu => bu.value === b)?.label).join(', ')}</p>
              )}
              {selectedRoles.length > 0 && selectedBuCodes.length > 0 && (
                <p className="text-[10px] text-purple-500 dark:text-purple-400 mt-1">
                  * 역할 AND 사업부 조건 모두 만족하는 사용자에게 전송됩니다.
                </p>
              )}
            </div>
          </div>
        )}
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
          disabled={loading || !hasCondition}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition',
            loading || !hasCondition
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
              조건부 전송
            </>
          )}
        </button>
      </div>

      {result && <PushResultPanel result={result} />}
    </div>
  );
}
