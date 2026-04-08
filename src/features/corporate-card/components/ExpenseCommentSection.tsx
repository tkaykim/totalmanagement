'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Send } from 'lucide-react';
import { useAddComment } from '../hooks';
import type { GowidCommentVo } from '../types';

interface ExpenseCommentSectionProps {
  expenseId: number;
  comments: GowidCommentVo[];
  canComment: boolean;
}

export function ExpenseCommentSection({ expenseId, comments, canComment }: ExpenseCommentSectionProps) {
  const [text, setText] = useState('');
  const addComment = useAddComment();

  const handleSubmit = () => {
    if (!text.trim()) return;
    addComment.mutate(
      { expenseId, comment: text.trim() },
      { onSuccess: () => setText('') }
    );
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        댓글 ({comments.length})
      </h4>

      {comments.length === 0 && (
        <p className="text-xs text-slate-400">아직 댓글이 없습니다.</p>
      )}

      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {comments.map((c, i) => (
          <div key={i} className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {c.author?.userName || '알 수 없음'}
              </span>
              <span className="text-[10px] text-slate-400">
                {c.createdAt ? format(parseISO(c.createdAt), 'yyyy.MM.dd HH:mm') : ''}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{c.content}</p>
          </div>
        ))}
      </div>

      {canComment && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="댓글을 입력하세요..."
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || addComment.isPending}
            className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
