'use client';

import { CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PushResultPanelProps {
  result: Record<string, unknown>;
}

export function PushResultPanel({ result }: PushResultPanelProps) {
  const isSuccess = result.success === true;
  const targetCount = (result.targetCount as number) ?? 0;
  const matchedUsers = (result.matchedUsers as Array<{ id: string; name: string; role: string; bu_code: string }>) ?? [];

  return (
    <div
      className={cn(
        'rounded-xl border p-6 space-y-3',
        isSuccess
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
          : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
      )}
    >
      <div className="flex items-center gap-2">
        {isSuccess ? (
          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        )}
        <h4
          className={cn(
            'text-sm font-bold',
            isSuccess ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
          )}
        >
          {isSuccess ? '전송 완료' : '전송 실패'}
        </h4>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Users className="h-3.5 w-3.5 flex-shrink-0" />
          <span>대상: {targetCount}명</span>
        </div>

        {result.message && (
          <p className="text-slate-500 dark:text-slate-400">{String(result.message)}</p>
        )}

        {/* 조건부 전송 시 매칭된 사용자 목록 */}
        {matchedUsers.length > 0 && matchedUsers.length <= 30 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold">
              전송 대상 목록 ({matchedUsers.length}명)
            </summary>
            <div className="mt-2 max-h-[200px] overflow-y-auto space-y-1">
              {matchedUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 border border-slate-100 dark:border-slate-700"
                >
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{u.name}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                    {u.bu_code}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/50 text-[9px] font-semibold text-blue-600 dark:text-blue-300">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* JSON 상세 결과 */}
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold">
            상세 응답 (JSON)
          </summary>
          <pre className="mt-2 rounded-lg bg-slate-900 dark:bg-slate-950 text-emerald-300 dark:text-emerald-400 p-3 text-[10px] overflow-x-auto max-h-[200px] overflow-y-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
