'use client';

import { useState } from 'react';
import { Sparkles, FileText, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AiWorkInsightView() {
  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const [instruction, setInstruction] = useState('');
  const [commandResult, setCommandResult] = useState<string | null>(null);
  const [commandCreated, setCommandCreated] = useState<{
    project_id: number;
    name: string;
    bu_code: string;
    pm_id: string | null;
  } | null>(null);
  const [commandLoading, setCommandLoading] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);

  const fetchDailyReport = async () => {
    setReportError(null);
    setReport(null);
    setReportLoading(true);
    try {
      const res = await fetch('/api/ai/daily-report');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load report');
      setReport(data.report ?? '');
    } catch (e) {
      setReportError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setReportLoading(false);
    }
  };

  const sendInstruction = async () => {
    const trimmed = instruction.trim();
    if (!trimmed) return;
    setCommandError(null);
    setCommandResult(null);
    setCommandCreated(null);
    setCommandLoading(true);
    try {
      const res = await fetch('/api/ai/execute-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to process');
      setCommandResult(data.message ?? '');
      if (data.created) {
        setCommandCreated(data.created);
      }
    } catch (e) {
      setCommandError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setCommandLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
            <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              업무파악, 지시 AI
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              오늘 업무 요약 보고를 생성하고, 지시문을 입력하면 AI가 해석·제안합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 오늘 업무 파악 */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-slate-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">
            오늘 업무 파악
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          DB 기준으로 사업부별 프로젝트·지연 할일·담당자 부하를 요약한 보고를 생성합니다.
        </p>
        <button
          onClick={fetchDailyReport}
          disabled={reportLoading}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
            reportLoading
              ? 'bg-slate-200 dark:bg-slate-600 text-slate-500 cursor-not-allowed'
              : 'bg-violet-600 text-white hover:bg-violet-700'
          )}
        >
          {reportLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              생성 중…
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              보고 생성
            </>
          )}
        </button>
        {reportError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{reportError}</p>
        )}
        {report && (
          <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              AI 보고
            </p>
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {report}
            </div>
          </div>
        )}
      </section>

      {/* 지시 AI */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Send className="h-5 w-5 text-slate-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">
            지시 AI
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          프로젝트 생성/삭제, 할일 추가·수정·삭제, 재무 조회·등록 등. 예: &quot;인천대 프로젝트에 할일 &#39;견적 발송&#39; 3/15까지 김동현에게&quot;, &quot;FLAVA 재무 현황 알려줘&quot;
        </p>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="예: 모두굿즈에 2026 봄 단체복 프로젝트 추가하고 PM은 김동현으로 해줘"
          className="w-full min-h-[100px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          disabled={commandLoading}
        />
        <button
          onClick={sendInstruction}
          disabled={commandLoading || !instruction.trim()}
          className={cn(
            'mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
            commandLoading || !instruction.trim()
              ? 'bg-slate-200 dark:bg-slate-600 text-slate-500 cursor-not-allowed'
              : 'bg-violet-600 text-white hover:bg-violet-700'
          )}
        >
          {commandLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              처리 중…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              지시 보내기
            </>
          )}
        </button>
        {commandError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{commandError}</p>
        )}
        {commandResult && (
          <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              AI 응답
            </p>
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {commandResult}
            </div>
            {commandCreated && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
                  프로젝트 생성됨
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {commandCreated.name} · {commandCreated.bu_code}
                  {commandCreated.pm_id ? ' · PM 지정됨' : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
