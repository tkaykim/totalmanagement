'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, FileText, Send, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiChatMessage, type ChatMessagePayload } from './AiChatMessage';

export function AiWorkInsightView() {
  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

  const sendMessage = async (executePayload?: { instruction: string; plan: Record<string, unknown> }) => {
    const isExecute = !!executePayload;
    const instruction = (executePayload?.instruction ?? input).trim();
    if (!instruction) return;

    setError(null);
    if (!isExecute) {
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', content: instruction },
      ]);
      setInput('');
    }

    setLoading(true);
    try {
      const payload: {
        instruction: string;
        execute: boolean;
        plan?: Record<string, unknown>;
        messages?: { role: string; content: string }[];
      } = {
        instruction,
        execute: isExecute,
      };
      if (isExecute && executePayload?.plan) {
        payload.plan = executePayload.plan;
      }
      if (!isExecute && messages.length > 0) {
        payload.messages = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
      }

      const res = await fetch('/api/ai/execute-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to process');

      const replyContent = data.message ?? '';
      const hasPlan = data.executed === false && data.plan;
      const created = data.created ?? undefined;

      if (isExecute) {
        setMessages((prev) => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx].role === 'assistant' && next[lastIdx].plan) {
            next[lastIdx] = {
              ...next[lastIdx],
              content: replyContent,
              plan: undefined,
              instructionForExecute: undefined,
              created,
            };
          } else {
            next.push({
              id: `a-${Date.now()}`,
              role: 'assistant',
              content: replyContent,
              created,
            });
          }
          return next;
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: replyContent,
            plan: hasPlan ? data.plan : undefined,
            instructionForExecute: hasPlan ? instruction : undefined,
            created,
          },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      if (!isExecute) {
        setMessages((prev) => prev.slice(0, -1));
        setInput(instruction);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = (message: ChatMessagePayload) => {
    if (message.plan && message.instructionForExecute) {
      sendMessage({ instruction: message.instructionForExecute, plan: message.plan });
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const lastAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant'
    ? messages[messages.length - 1]
    : null;
  const pendingPlanMessage = lastAssistant?.plan ? lastAssistant : null;

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
              대화 맥락을 유지하며 상태 분석·제안을 받고, 지시하면 실행 계획 후 반영할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

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

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
              지시 AI (대화형)
            </h3>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              대화 초기화
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          이전 대화를 기억합니다. 상태 분석·해소 방안 제안을 요청하거나, 지시 후 확인하면 실행할 수 있습니다.
        </p>

        <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 min-h-[280px] max-h-[420px] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {messages.length === 0 && !loading && (
              <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                메시지를 입력하고 보내면 AI가 맥락을 유지하며 답합니다.
                <br />
                예: &quot;지금 김동현 바빠?&quot;, &quot;OO 프로젝트 상황 어때?&quot;
              </p>
            )}
            {messages.map((msg) => (
              <AiChatMessage
                key={msg.id}
                message={msg}
                onExecute={
                  msg.role === 'assistant' && msg.plan
                    ? () => handleExecute(msg)
                    : undefined
                }
                isExecuting={loading && pendingPlanMessage?.id === msg.id}
              />
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                </div>
                <div className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-500">
                  처리 중…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 p-3">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim()) sendMessage();
                  }
                }}
                placeholder="질문이나 지시를 입력하세요 (Enter로 전송, Shift+Enter 줄바꿈)"
                rows={2}
                className="min-h-[52px] flex-1 resize-none rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className={cn(
                  'self-end rounded-lg p-2.5 transition-colors',
                  loading || !input.trim()
                    ? 'bg-slate-200 dark:bg-slate-600 text-slate-500 cursor-not-allowed'
                    : 'bg-violet-600 text-white hover:bg-violet-700'
                )}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </section>
    </div>
  );
}
