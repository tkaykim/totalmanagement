'use client';

import { useState } from 'react';
import { CreditCard, FileWarning, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExpenses, useNotSubmittedExpenses } from '../hooks';
import { useCardAliasMap } from '../hooks/useCardAliasMap';
import { ExpenseFilters } from './ExpenseFilters';
import { ExpenseListTable } from './ExpenseListTable';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { BulkActionBar } from './BulkActionBar';
import { GowidUserMappingManager } from './GowidUserMappingManager';
import { CardAliasManager } from './CardAliasManager';
import type { ExpenseSearchCriteria } from '../types';

type Tab = 'expenses' | 'not-submitted' | 'settings';

interface CorporateCardViewProps {
  userRole: string;
}

export function CorporateCardView({ userRole }: CorporateCardViewProps) {
  const [tab, setTab] = useState<Tab>('expenses');
  const [criteria, setCriteria] = useState<ExpenseSearchCriteria>({});
  const [page, setPage] = useState(0);
  const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [notSubmittedPage, setNotSubmittedPage] = useState(0);

  const { resolveAlias } = useCardAliasMap();
  const isAdmin = userRole === 'admin';
  const isLeader = userRole === 'leader';
  const canEdit = isAdmin || isLeader || userRole === 'manager' || userRole === 'member';
  const canApprove = isAdmin;
  const canComment = canEdit;

  const { data: expensesData, isLoading: expensesLoading } = useExpenses({
    ...criteria,
    page,
    size: 20,
  });

  const { data: notSubmittedData, isLoading: notSubmittedLoading } = useNotSubmittedExpenses(
    notSubmittedPage,
    20
  );

  const tabs: { key: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: 'expenses', label: '전체 내역', icon: <CreditCard className="h-4 w-4" /> },
    { key: 'not-submitted', label: '미제출', icon: <FileWarning className="h-4 w-4" /> },
    { key: 'settings', label: '설정', icon: <Settings className="h-4 w-4" />, adminOnly: true },
  ];

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs
          .filter((t) => !t.adminOnly || isAdmin)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition',
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              {t.icon}
              {t.label}
              {t.key === 'not-submitted' && notSubmittedData && notSubmittedData.totalElements > 0 && (
                <span className="rounded-full bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                  {notSubmittedData.totalElements}
                </span>
              )}
            </button>
          ))}
      </div>

      {/* 전체 내역 탭 */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          <ExpenseFilters
            criteria={criteria}
            onCriteriaChange={(c) => {
              setCriteria(c);
              setPage(0);
            }}
          />

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <ExpenseListTable
              data={expensesData}
              isLoading={expensesLoading}
              page={page}
              onPageChange={setPage}
              onRowClick={(id) => setSelectedExpenseId(id)}
              canApprove={canApprove}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </div>

          <BulkActionBar
            selectedIds={selectedIds}
            onClear={() => setSelectedIds([])}
            canApprove={canApprove}
          />
        </div>
      )}

      {/* 미제출 탭 */}
      {tab === 'not-submitted' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          {notSubmittedLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : notSubmittedData && notSubmittedData.content.length > 0 ? (
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs text-slate-500">
                    <th className="px-4 py-3">일시</th>
                    <th className="px-4 py-3">사용처</th>
                    <th className="px-4 py-3 text-right">금액</th>
                    <th className="px-4 py-3">카드</th>
                  </tr>
                </thead>
                <tbody>
                  {notSubmittedData.content.map((item) => (
                    <tr key={item.expenseId} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.expenseDate.slice(0, 4)}.{item.expenseDate.slice(4, 6)}.{item.expenseDate.slice(6, 8)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.storeName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        ₩{item.krwAmount.toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {resolveAlias(item.cardAlias)} ({item.shortCardNumber})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {notSubmittedData.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 border-t border-slate-200 dark:border-slate-700 py-3">
                  <button
                    onClick={() => setNotSubmittedPage((p) => Math.max(0, p - 1))}
                    disabled={notSubmittedPage === 0}
                    className="rounded-lg px-3 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    이전
                  </button>
                  <span className="text-xs text-slate-400">
                    {notSubmittedPage + 1} / {notSubmittedData.totalPages}
                  </span>
                  <button
                    onClick={() => setNotSubmittedPage((p) => p + 1)}
                    disabled={notSubmittedData.last}
                    className="rounded-lg px-3 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    다음
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <FileWarning className="h-10 w-10 mb-2" />
              <p className="text-sm">미제출 영수증이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* 설정 탭 (admin만) */}
      {tab === 'settings' && isAdmin && (
        <div className="space-y-8">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              카드 별칭 관리
            </h3>
            <CardAliasManager />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-3">
              사용자 매핑
            </h3>
            <GowidUserMappingManager />
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {selectedExpenseId !== null && (
        <ExpenseDetailModal
          expenseId={selectedExpenseId}
          onClose={() => setSelectedExpenseId(null)}
          canEdit={canEdit}
          canApprove={canApprove}
          canComment={canComment}
        />
      )}
    </div>
  );
}
