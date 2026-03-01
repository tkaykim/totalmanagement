'use client';

import { Sparkles, User, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ChatMessagePayload = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  plan?: Record<string, unknown>;
  /** 실행 시 API에 넘길 instruction (plan이 있을 때만) */
  instructionForExecute?: string;
  created?: {
    project_id?: number;
    name?: string;
    bu_code?: string;
    pm_id?: string | null;
    task_id?: number;
    title?: string;
    project_name?: string;
    financial_id?: number;
    kind?: string;
    amount?: number;
  };
};

type AiChatMessageProps = {
  message: ChatMessagePayload;
  onExecute?: () => void;
  isExecuting?: boolean;
};

export function AiChatMessage({ message, onExecute, isExecuting }: AiChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 py-3',
        isUser ? 'flex-row-reverse' : ''
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-slate-200 dark:bg-slate-600'
            : 'bg-violet-100 dark:bg-violet-900/50'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        ) : (
          <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        )}
      </div>
      <div className={cn('min-w-0 flex-1 space-y-1', isUser ? 'text-right' : '')}>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {isUser ? '나' : 'AI'}
        </p>
        <div
          className={cn(
            'rounded-xl px-3 py-2.5 text-sm whitespace-pre-wrap',
            isUser
              ? 'bg-violet-100 dark:bg-violet-900/30 text-slate-800 dark:text-slate-200'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          )}
        >
          {message.content}
        </div>
        {!isUser && message.plan && onExecute && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onExecute}
              disabled={isExecuting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              실행
            </button>
          </div>
        )}
        {!isUser && message.created && (
          <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30 px-3 py-2 text-xs text-violet-700 dark:text-violet-300">
            <span className="font-medium">반영 완료</span>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              {message.created.name != null && message.created.bu_code != null && (
                <>프로젝트: {message.created.name} · {message.created.bu_code}{message.created.pm_id ? ' · PM 지정됨' : ''}</>
              )}
              {message.created.task_id != null && message.created.title != null && (
                <>할일: {message.created.title}{message.created.project_name ? ` [${message.created.project_name}]` : ''}</>
              )}
              {message.created.financial_id != null && message.created.name != null && (
                <>재무: {message.created.name}{message.created.amount != null ? ` ${Number(message.created.amount).toLocaleString()}원` : ''}</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
