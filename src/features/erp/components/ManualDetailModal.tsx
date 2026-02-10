'use client';

import { X, BookOpen } from 'lucide-react';
import type { Manual } from '@/types/database';
import { BU_TITLES } from '@/features/erp/types';
import type { BU } from '@/features/erp/types';
import { format } from 'date-fns';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';

interface ManualDetailModalProps {
  manual: Manual | null;
  onClose: () => void;
}

export function ManualDetailModal({ manual, onClose }: ManualDetailModalProps) {
  if (!manual) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/50 flex-shrink-0">
              <BookOpen className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{manual.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-block rounded-md bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                  {BU_TITLES[manual.bu_code as BU] || manual.bu_code}
                </span>
                {manual.category && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{manual.category}</span>
                )}
                {manual.author_name && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">| {manual.author_name}</span>
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  | {format(new Date(manual.updated_at), 'yyyy.MM.dd')}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 transition flex-shrink-0"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <RichTextViewer content={manual.content} />
        </div>
      </div>
    </div>
  );
}
