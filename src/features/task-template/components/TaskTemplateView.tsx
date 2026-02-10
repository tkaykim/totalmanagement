'use client';

import { useState, useMemo } from 'react';
import { useTaskTemplates, useDeleteTaskTemplate } from '../hooks';
import { BU_TITLES, type BU } from '@/features/erp/types';
import { Plus, Edit, Trash2, FileText, Search, ListChecks, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BuTabs } from '@/features/erp/components/BuTabs';
import { TaskTemplateFormModal } from './TaskTemplateFormModal';
import { TaskTemplateDetailModal } from './TaskTemplateDetailModal';
import type { TaskTemplate } from '@/types/database';
import { cn } from '@/lib/utils';

export function TaskTemplateView({ currentBu, currentUserBu }: { currentBu: BU | 'ALL'; currentUserBu?: BU | null }) {
  const [selectedBu, setSelectedBu] = useState<BU | 'ALL'>(currentBu);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<TaskTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const queryBu = selectedBu === 'ALL' ? undefined : selectedBu;
  const { data: templates, isLoading } = useTaskTemplates(queryBu);
  const deleteMutation = useDeleteTaskTemplate();

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((t) =>
      t.name.toLowerCase().includes(query) ||
      (t.description ?? '').toLowerCase().includes(query) ||
      t.template_type.toLowerCase().includes(query) ||
      BU_TITLES[t.bu_code].toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  const handleEdit = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirmId);
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
    setDeleteConfirmId(null);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
    setEditingTemplate(null);
  };

  const handleBuChange = (bu: BU | 'ALL') => {
    setSelectedBu(bu);
  };

  return (
    <section className="space-y-6">
      <BuTabs bu={selectedBu} onChange={handleBuChange} prefix="TEMPLATE" showAll={true} />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <Input
            type="search"
            placeholder="템플릿명, 설명, 유형, 사업부로 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 sm:h-10 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 dark:text-slate-200">
          {selectedBu === 'ALL' ? '전체' : BU_TITLES[selectedBu]} 할일 템플릿 관리
          <span className="ml-2 text-sm font-semibold text-slate-400 dark:text-slate-500">
            총 {filteredTemplates.length}건
          </span>
        </h2>
        {currentUserBu && (
          <Button
            onClick={() => setIsFormModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            템플릿 추가
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">로딩 중...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">
            {searchQuery ? '검색 결과가 없습니다.' : '등록된 템플릿이 없습니다.'}
          </p>
          <p className="text-xs text-slate-400">
            {searchQuery
              ? '다른 검색어로 다시 시도해보세요.'
              : '반복되는 업무 흐름을 템플릿으로 만들어 프로젝트에 빠르게 적용해보세요.'}
          </p>
          {!searchQuery && currentUserBu && (
            <Button
              onClick={() => setIsFormModalOpen(true)}
              className="mt-4 gap-1.5"
              size="sm"
            >
              <Plus className="h-3.5 w-3.5" />
              첫 템플릿 만들기
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const taskCount = (template.tasks || []).length;
            const highCount = (template.tasks || []).filter(t => t.priority === 'high').length;
            const maxDay = taskCount > 0 ? Math.max(...template.tasks.map(t => t.days_before)) : 0;

            return (
              <div
                key={template.id}
                onClick={() => setViewingTemplate(template)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 active:scale-[0.98] group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex-shrink-0">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {template.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block rounded-md bg-blue-50 dark:bg-blue-900/50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-300">
                        {BU_TITLES[template.bu_code]}
                      </span>
                      <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {template.template_type}
                      </span>
                    </div>
                  </div>
                  {currentUserBu === template.bu_code && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEdit(template)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                        title="수정"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, template.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400"
                        title="삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                
                {template.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}
                
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <ListChecks className="h-3 w-3" />
                    <span className="font-semibold">{taskCount}개</span>
                    <span>할일</span>
                  </div>
                  {highCount > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-rose-500">
                      <AlertTriangle className="h-3 w-3" />
                      <span>높음 {highCount}건</span>
                    </div>
                  )}
                  {maxDay > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-blue-500">
                      <Clock className="h-3 w-3" />
                      <span>D-{maxDay}부터</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur" onClick={() => setDeleteConfirmId(null)}>
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  템플릿 삭제
                </h3>
                <p className="text-sm text-slate-500">
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              정말 이 템플릿을 삭제하시겠습니까? 삭제된 템플릿은 복구할 수 없으며, 이미 생성된 할일에는 영향을 주지 않습니다.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {viewingTemplate && (
        <TaskTemplateDetailModal
          template={viewingTemplate}
          onClose={() => setViewingTemplate(null)}
          onEdit={currentUserBu === viewingTemplate.bu_code ? () => {
            const t = viewingTemplate;
            setViewingTemplate(null);
            handleEdit(t);
          } : undefined}
        />
      )}

      {isFormModalOpen && (
        <TaskTemplateFormModal
          template={editingTemplate}
          defaultBu={currentUserBu || (selectedBu === 'ALL' ? 'GRIGO' : selectedBu)}
          onClose={handleCloseForm}
        />
      )}
    </section>
  );
}
