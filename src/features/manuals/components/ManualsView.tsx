'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, FileText, BookOpen, Edit2, Trash2, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useManuals, useDeleteManual, useUpdateManual } from '@/features/erp/hooks';
import type { Manual } from '@/types/database';
import type { BU } from '@/features/erp/types';
import { BU_TITLES } from '@/features/erp/types';
import { ManualFormModal } from './ManualFormModal';
import { ManualDetailModal } from '@/features/erp/components/ManualDetailModal';
import { DeleteConfirmModal } from '@/features/erp/components/modal-components';
import { format } from 'date-fns';

interface ManualsViewProps {
  currentBu: BU | 'ALL';
  currentUser: {
    id: string;
    role: string;
    bu_code: string | null;
    name?: string;
  } | null;
}

const CATEGORY_OPTIONS = [
  '전체',
  '업무 프로세스',
  '개발',
  '디자인',
  '마케팅',
  '경영/관리',
  '인사/총무',
  '영업',
  '기타',
];

export function ManualsView({ currentBu, currentUser }: ManualsViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [buFilter, setBuFilter] = useState<BU | 'ALL'>(currentBu);
  const [showInactive, setShowInactive] = useState(false);

  const [formModal, setFormModal] = useState<{ mode: 'create' | 'edit'; manual?: Manual } | null>(null);
  const [viewManual, setViewManual] = useState<Manual | null>(null);
  const [deleteManualId, setDeleteManualId] = useState<number | null>(null);

  const { data: manuals = [], isLoading } = useManuals(
    buFilter === 'ALL' ? undefined : buFilter,
    selectedCategory === '전체' ? undefined : selectedCategory,
    showInactive,
  );
  const deleteMutation = useDeleteManual();
  const updateMutation = useUpdateManual();

  const canManage = currentUser && ['admin', 'leader', 'manager'].includes(currentUser.role);

  const filteredManuals = useMemo(() => {
    let result = manuals;

    if (!showInactive) {
      result = result.filter((m: Manual) => m.is_active !== false);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m: Manual) =>
          m.title.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          (m.author_name && m.author_name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [manuals, search, showInactive]);

  const handleDelete = async () => {
    if (!deleteManualId) return;
    try {
      await deleteMutation.mutateAsync(deleteManualId);
      setDeleteManualId(null);
    } catch (error) {
      console.error('Failed to delete manual:', error);
    }
  };

  const handleToggleActive = async (manual: Manual) => {
    try {
      await updateMutation.mutateAsync({
        id: manual.id,
        data: { is_active: !manual.is_active },
      });
    } catch (error) {
      console.error('Failed to toggle manual active state:', error);
    }
  };

  const buOptions: (BU | 'ALL')[] = ['ALL', 'GRIGO', 'REACT', 'FLOW', 'AST', 'MODOO', 'HEAD'];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            매뉴얼 관리
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            업무 매뉴얼을 검색하고 관리합니다. 할일에 매뉴얼을 연결하여 업무 가이드로 활용하세요.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setFormModal({ mode: 'create' })}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            매뉴얼 작성
          </button>
        )}
      </div>

      {/* 필터/검색 */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="매뉴얼 제목, 카테고리, 작성자로 검색..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          {canManage && (
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition whitespace-nowrap',
                showInactive
                  ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              )}
            >
              {showInactive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              비활성 포함
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* BU 필터 */}
          <div className="flex flex-wrap gap-1">
            {buOptions.map((b) => (
              <button
                key={b}
                onClick={() => setBuFilter(b)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition',
                  buFilter === b
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                )}
              >
                {b === 'ALL' ? '전체' : BU_TITLES[b]}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* 카테고리 필터 */}
          <div className="flex flex-wrap gap-1">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition',
                  selectedCategory === cat
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 매뉴얼 목록 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-indigo-500" />
        </div>
      ) : filteredManuals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {search ? '검색 결과가 없습니다.' : '등록된 매뉴얼이 없습니다.'}
          </p>
          {canManage && !search && (
            <button
              onClick={() => setFormModal({ mode: 'create' })}
              className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              첫 매뉴얼 작성하기
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredManuals.map((manual: Manual) => (
            <ManualCard
              key={manual.id}
              manual={manual}
              canManage={!!canManage}
              onView={() => setViewManual(manual)}
              onEdit={() => setFormModal({ mode: 'edit', manual })}
              onDelete={() => setDeleteManualId(manual.id)}
              onToggleActive={() => handleToggleActive(manual)}
            />
          ))}
        </div>
      )}

      {/* 매뉴얼 상세 보기 모달 */}
      {viewManual && (
        <ManualDetailModal manual={viewManual} onClose={() => setViewManual(null)} />
      )}

      {/* 매뉴얼 작성/수정 모달 */}
      {formModal && (
        <ManualFormModal
          mode={formModal.mode}
          manual={formModal.manual}
          currentUser={currentUser}
          onClose={() => setFormModal(null)}
        />
      )}

      {/* 삭제 확인 모달 */}
      {deleteManualId && (
        <DeleteConfirmModal
          title="매뉴얼 삭제"
          message="정말로 이 매뉴얼을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 연결된 할일에서도 매뉴얼이 제거됩니다."
          onConfirm={handleDelete}
          onCancel={() => setDeleteManualId(null)}
        />
      )}
    </div>
  );
}

function ManualCard({
  manual,
  canManage,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  manual: Manual;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const isInactive = manual.is_active === false;
  const blockCount = getBlockCount(manual.content);

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-white dark:bg-slate-800 transition hover:shadow-md overflow-hidden',
        isInactive
          ? 'border-slate-300 dark:border-slate-600 opacity-60'
          : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
      )}
    >
      {/* 헤더 */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-block rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                {BU_TITLES[manual.bu_code as BU] || manual.bu_code}
              </span>
              <span className="inline-block rounded-md bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                {manual.category}
              </span>
              {isInactive && (
                <span className="inline-block rounded-md bg-red-50 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-bold text-red-500">
                  비활성
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
              {manual.title}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="px-4 pb-3 flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
        {manual.author_name && (
          <span>작성: {manual.author_name}</span>
        )}
        <span>{format(new Date(manual.updated_at), 'yyyy.MM.dd')}</span>
        {blockCount > 0 && <span>{blockCount}개 블록</span>}
      </div>

      {/* 액션 버튼 */}
      <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-2 flex items-center gap-1">
        <button
          onClick={onView}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition flex-1 justify-center"
        >
          <Eye className="h-3.5 w-3.5" />
          보기
        </button>
        {canManage && (
          <>
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex-1 justify-center"
            >
              <Edit2 className="h-3.5 w-3.5" />
              수정
            </button>
            <button
              onClick={onToggleActive}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition"
              title={isInactive ? '활성화' : '비활성화'}
            >
              {isInactive ? <ToggleLeft className="h-3.5 w-3.5" /> : <ToggleRight className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function getBlockCount(content: unknown): number {
  if (!content || typeof content !== 'object') return 0;
  if (Array.isArray(content)) return content.length;
  const c = content as Record<string, unknown>;
  if (Array.isArray(c.blocks)) return c.blocks.length;
  if (Array.isArray(c.steps)) return c.steps.length;
  return 0;
}
