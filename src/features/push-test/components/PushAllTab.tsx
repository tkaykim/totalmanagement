'use client';

import { useState } from 'react';
import { Send, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PushResultPanel } from './PushResultPanel';

export function PushAllTab() {
  const [title, setTitle] = useState('전체 공지');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [actionUrl, setActionUrl] = useState('/');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError('제목과 메시지를 입력해주세요.');
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
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Send className="h-4 w-4 text-orange-500" />
          전체 사용자 푸시 전송
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
          disabled={loading}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition',
            loading
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
              전체 사용자에게 전송
            </>
          )}
        </button>
      </div>

      {result && <PushResultPanel result={result} />}
    </div>
  );
}
