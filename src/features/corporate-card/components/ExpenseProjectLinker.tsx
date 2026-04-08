'use client';

import { useMemo, useState } from 'react';
import { FolderKanban, Link2, Unlink, ArrowRightLeft, Receipt, Check } from 'lucide-react';
import { useProjects } from '@/features/erp/hooks';
import { useExpenseProjectLink, useLinkProject, useUnlinkProject } from '../hooks';
import { SearchableDropdown, type DropdownOption } from './SearchableDropdown';
import { BU_LABELS, type BU } from '@/features/erp/types';

interface ExpenseProjectLinkerProps {
  expenseId: number;
  canEdit: boolean;
  expenseAmount: number;
  expenseStoreName: string;
  expenseDate: string;
  cardAlias?: string;
}

export function ExpenseProjectLinker({
  expenseId,
  canEdit,
  expenseAmount,
  expenseStoreName,
  expenseDate,
  cardAlias,
}: ExpenseProjectLinkerProps) {
  const { data: link, isLoading } = useExpenseProjectLink(expenseId);
  const { data: projects } = useProjects();
  const linkProject = useLinkProject();
  const unlinkProject = useUnlinkProject();
  const [showChangeDropdown, setShowChangeDropdown] = useState(false);

  const projectOptions: DropdownOption[] = useMemo(() => {
    if (!projects) return [];
    return projects.map((p) => ({
      value: String(p.id),
      label: p.name,
      sub: BU_LABELS[p.bu_code as BU] || p.bu_code,
    }));
  }, [projects]);

  const handleLink = (val: string) => {
    if (!val) return;
    linkProject.mutate({
      expenseId,
      project_id: Number(val),
      expense_amount: expenseAmount,
      expense_store_name: expenseStoreName,
      expense_date: expenseDate,
      card_alias: cardAlias,
    });
    setShowChangeDropdown(false);
  };

  const handleUnlink = () => {
    if (!confirm('프로젝트 연결을 해제하면 해당 프로젝트의 지출 내역도 함께 삭제됩니다. 계속하시겠습니까?')) return;
    unlinkProject.mutate(expenseId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <FolderKanban className="h-4 w-4" />
        <span>로딩중...</span>
      </div>
    );
  }

  if (link) {
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block">연결된 프로젝트</label>
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            <FolderKanban className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
                {link.project_name || `프로젝트 #${link.project_id}`}
              </p>
              {link.project_bu && (
                <p className="text-[10px] text-blue-500 dark:text-blue-400">
                  {BU_LABELS[link.project_bu as BU] || link.project_bu}
                </p>
              )}
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowChangeDropdown(!showChangeDropdown)}
                  disabled={linkProject.isPending}
                  className="rounded p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition disabled:opacity-50"
                  title="프로젝트 변경"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleUnlink}
                  disabled={unlinkProject.isPending}
                  className="rounded p-1 text-blue-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                  title="연결 해제"
                >
                  <Unlink className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {link.financial_entry_id && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border-t border-blue-200 dark:border-blue-800">
              <Check className="h-3 w-3 text-green-600" />
              <span className="text-[10px] text-green-700 dark:text-green-400 font-medium">
                프로젝트 지출로 연동됨
              </span>
              {link.expense_amount && (
                <span className="text-[10px] text-green-600 dark:text-green-500 ml-auto">
                  ₩{link.expense_amount.toLocaleString('ko-KR')}
                </span>
              )}
            </div>
          )}
        </div>

        {showChangeDropdown && canEdit && (
          <div className="mt-1">
            <SearchableDropdown
              options={projectOptions.filter((p) => p.value !== String(link.project_id))}
              value=""
              onChange={handleLink}
              placeholder="변경할 프로젝트 선택..."
              emptyLabel="취소"
              searchPlaceholder="프로젝트명 검색..."
            />
          </div>
        )}

        {link.linked_by_name && (
          <p className="text-[10px] text-slate-400">
            연결자: {link.linked_by_name}
          </p>
        )}
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block">연결된 프로젝트</label>
        <p className="text-sm text-slate-400">없음</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
        <Link2 className="h-3.5 w-3.5" />
        프로젝트 연결
      </label>
      <SearchableDropdown
        options={projectOptions}
        value=""
        onChange={handleLink}
        placeholder="프로젝트 검색 및 연결..."
        emptyLabel="연결 안함"
        searchPlaceholder="프로젝트명 검색..."
      />
      <p className="text-[10px] text-slate-400">
        <Receipt className="h-3 w-3 inline mr-0.5" />
        연결 시 해당 프로젝트에 ₩{expenseAmount.toLocaleString('ko-KR')} 지출로 자동 등록됩니다.
      </p>
    </div>
  );
}
