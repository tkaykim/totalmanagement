'use client';

import { useState, useEffect } from 'react';
import { Play, Users, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { PUSH_SCENARIOS, type PushScenario } from '../constants/push-scenarios';

const CATEGORY_LABELS: Record<string, string> = {
  project: '프로젝트',
  task: '할일',
  comment: '댓글',
  message: '메시지',
  attendance: '출퇴근',
  due: '마감일',
  assignment: '배정',
  admin: '관리자',
};

export function PushScenarioTab() {
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [sendToSelf, setSendToSelf] = useState(true);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ scenarioId: string; success: boolean; message?: string } | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('app_users')
        .select('id, name, email')
        .order('name');
      setUsers((data as { id: string; name: string; email: string }[]) || []);
    };
    fetchUsers();
  }, []);

  const handleSend = async (scenario: PushScenario) => {
    setSendingId(scenario.id);
    setResult(null);
    try {
      const res = await fetch('/api/push/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.id,
          targetUserId: sendToSelf ? undefined : (targetUserId.trim() || undefined),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '전송 실패');
      setResult({ scenarioId: scenario.id, success: true, message: `대상: ${sendToSelf ? '나에게' : '선택 사용자'}` });
    } catch (e) {
      setResult({
        scenarioId: scenario.id,
        success: false,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">테스트 발송 대상</span>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="target"
              checked={sendToSelf}
              onChange={() => setSendToSelf(true)}
              className="rounded-full border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">나에게</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="target"
              checked={!sendToSelf}
              onChange={() => setSendToSelf(false)}
              className="rounded-full border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">특정 사용자</span>
          </label>
          {!sendToSelf && (
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm outline-none focus:border-orange-300 dark:focus:border-orange-600 max-w-[200px]"
            >
              <option value="">선택</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {result && (
        <div
          className={cn(
            'rounded-xl border p-4 flex items-center gap-2',
            result.success
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
          )}
        >
          {result.success ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          )}
          <span className={cn('text-sm font-medium', result.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300')}>
            {result.success ? '발송 완료' : result.message}
          </span>
        </div>
      )}

      <div className="space-y-3">
        {PUSH_SCENARIOS.map((scenario) => (
          <div
            key={scenario.id}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{scenario.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    {CATEGORY_LABELS[scenario.category] ?? scenario.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{scenario.description}</p>
                <div className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Info className="h-3 w-3 flex-shrink-0" />
                  <span>발송 대상: {scenario.targetAudience}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
                  제목: {scenario.title} / 본문: {scenario.body.slice(0, 50)}…
                </p>
              </div>
              <button
                onClick={() => handleSend(scenario)}
                disabled={sendingId !== null}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition flex-shrink-0',
                  sendingId === scenario.id
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                )}
              >
                {sendingId === scenario.id ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    전송 중
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    테스트 발송
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
