'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateManual, useUpdateManual } from '@/features/erp/hooks';
import type { Manual } from '@/types/database';
import type { BU } from '@/features/erp/types';
import { BU_TITLES } from '@/features/erp/types';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { contentToHtml } from '@/components/ui/rich-text-viewer';

interface ManualFormModalProps {
  mode: 'create' | 'edit';
  manual?: Manual;
  currentUser: {
    id: string;
    role: string;
    bu_code: string | null;
    name?: string;
  } | null;
  onClose: () => void;
}

const CATEGORY_OPTIONS = [
  '업무 프로세스',
  '개발',
  '디자인',
  '마케팅',
  '경영/관리',
  '인사/총무',
  '영업',
  '기타',
];

const BU_OPTIONS: BU[] = ['GRIGO', 'REACT', 'FLOW', 'AST', 'MODOO', 'HEAD'];

/** 기존 콘텐츠를 HTML 문자열로 변환 (에디터 초기값용) */
function getInitialHtml(manual?: Manual): string {
  if (!manual?.content) return '';
  // 이미 HTML 형식
  if (typeof manual.content === 'object' && !Array.isArray(manual.content) && typeof (manual.content as any).html === 'string') {
    return (manual.content as any).html;
  }
  // 기타 레거시 형식 → HTML로 변환
  return contentToHtml(manual.content);
}

export function ManualFormModal({ mode, manual, currentUser, onClose }: ManualFormModalProps) {
  const [title, setTitle] = useState(manual?.title || '');
  const [category, setCategory] = useState(manual?.category || CATEGORY_OPTIONS[0]);
  const [buCode, setBuCode] = useState<BU>(
    (manual?.bu_code as BU) || (currentUser?.bu_code as BU) || 'GRIGO'
  );
  const [htmlContent, setHtmlContent] = useState(() => getInitialHtml(manual));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const createMutation = useCreateManual();
  const updateMutation = useUpdateManual();

  const handleSave = async () => {
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    const stripped = htmlContent.replace(/<[^>]*>/g, '').trim();
    if (!stripped) {
      setError('내용을 입력해주세요.');
      return;
    }

    setError('');
    setSaving(true);

    const content = { html: htmlContent };

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          bu_code: buCode,
          title: title.trim(),
          category,
          content,
          author_id: currentUser?.id,
          author_name: currentUser?.name,
        });
      } else if (manual) {
        await updateMutation.mutateAsync({
          id: manual.id,
          data: {
            title: title.trim(),
            category,
            bu_code: buCode,
            content,
          },
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save manual:', err);
      setError('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {mode === 'create' ? '매뉴얼 작성' : '매뉴얼 수정'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 transition"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="매뉴얼 제목을 입력하세요"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">사업부</label>
              <select
                value={buCode}
                onChange={(e) => setBuCode(e.target.value as BU)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              >
                {BU_OPTIONS.map((b) => (
                  <option key={b} value={b}>{BU_TITLES[b]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* TipTap 에디터 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              내용 <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              content={htmlContent}
              onChange={setHtmlContent}
              placeholder="매뉴얼 내용을 입력하세요. 이미지 드래그 앤 드롭, 유튜브 영상 삽입 가능합니다."
            />
          </div>
        </div>

        {/* 하단 */}
        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between shrink-0">
          {error && (
            <p className="text-xs font-medium text-red-500">{error}</p>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'create' ? '작성 완료' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
