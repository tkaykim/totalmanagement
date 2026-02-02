'use client';

import { useState } from 'react';
import { useTaskTemplates, useDeleteTaskTemplate } from '../hooks';
import { BU_TITLES, type BU } from '@/features/erp/types';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BuTabs } from '@/features/erp/components/BuTabs';
import { TaskTemplateFormModal } from './TaskTemplateFormModal';

export function TaskTemplateView({ currentBu, currentUserBu }: { currentBu: BU; currentUserBu?: BU | null }) {
  const [selectedBu, setSelectedBu] = useState<BU>(currentBu);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const { data: templates, isLoading } = useTaskTemplates(selectedBu);
  const deleteMutation = useDeleteTaskTemplate();

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setIsFormModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
    setEditingTemplate(null);
  };

  const handleBuChange = (bu: BU | 'ALL') => {
    if (bu !== 'ALL') setSelectedBu(bu);
  };

  return (
    <section className="space-y-6">
      <BuTabs bu={selectedBu} onChange={handleBuChange} prefix="TEMPLATE" showAll={false} />
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          할일 템플릿 관리
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
      ) : !templates || templates.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          템플릿이 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">
                      {template.name}
                    </h3>
                  </div>
                  <span className="inline-block rounded-md bg-blue-50 dark:bg-blue-900/50 px-2 py-1 text-[10px] font-semibold text-blue-600 dark:text-blue-300">
                    {BU_TITLES[template.bu_code]}
                  </span>
                </div>
                {currentUserBu === template.bu_code && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              {template.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  {template.description}
                </p>
              )}
              
              <div className="space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-500">
                  타입: <span className="font-semibold">{template.template_type}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500">
                  할일 수: <span className="font-semibold">{(template.tasks || []).length}개</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormModalOpen && (
        <TaskTemplateFormModal
          template={editingTemplate}
          defaultBu={currentUserBu || selectedBu}
          onClose={handleCloseForm}
        />
      )}
    </section>
  );
}
