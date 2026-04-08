'use client';

import { useState, useMemo } from 'react';
import { CreditCard, Plus, Pencil, Trash2, Save, X, RefreshCw, Download, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGowidCards,
  useUpsertGowidCard,
  useUpdateGowidCard,
  useDeleteGowidCard,
  useExpenses,
} from '../hooks';
import type { GowidCard } from '../types';

export function CardAliasManager() {
  const { data: cards, isLoading } = useGowidCards();
  const { data: expensesData } = useExpenses({ page: 0, size: 100 });
  const upsertCard = useUpsertGowidCard();
  const updateCard = useUpdateGowidCard();
  const deleteCard = useDeleteGowidCard();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editUserName, setEditUserName] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newGowidAlias, setNewGowidAlias] = useState('');
  const [newShortNumber, setNewShortNumber] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newErpAlias, setNewErpAlias] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  const uniqueCardsFromExpenses = useMemo(() => {
    if (!expensesData?.content) return [];
    const seen = new Set<string>();
    const result: { gowid_alias: string; short_card_number: string; card_user_name: string }[] = [];
    for (const item of expensesData.content) {
      if (!item.cardAlias || seen.has(item.cardAlias)) continue;
      seen.add(item.cardAlias);
      result.push({
        gowid_alias: item.cardAlias,
        short_card_number: item.shortCardNumber,
        card_user_name: item.cardUserName || '',
      });
    }
    return result;
  }, [expensesData]);

  const registeredAliases = new Set(cards?.map((c) => c.gowid_alias) ?? []);
  const unregisteredCards = uniqueCardsFromExpenses.filter(
    (c) => !registeredAliases.has(c.gowid_alias)
  );

  const filteredCards = useMemo(() => {
    if (!cards) return [];
    if (!searchTerm.trim()) return cards;
    const term = searchTerm.toLowerCase();
    return cards.filter(
      (c) =>
        c.gowid_alias.toLowerCase().includes(term) ||
        c.erp_alias?.toLowerCase().includes(term) ||
        c.card_user_name?.toLowerCase().includes(term) ||
        c.short_card_number?.includes(term)
    );
  }, [cards, searchTerm]);

  const handleAutoRegisterAll = () => {
    for (const card of unregisteredCards) {
      upsertCard.mutate({
        gowid_alias: card.gowid_alias,
        short_card_number: card.short_card_number,
        card_user_name: card.card_user_name,
      });
    }
  };

  const handleStartEdit = (card: GowidCard) => {
    setEditingId(card.id);
    setEditAlias(card.erp_alias || '');
    setEditNotes(card.notes || '');
    setEditUserName(card.card_user_name || '');
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateCard.mutate(
      { id: editingId, erp_alias: editAlias, notes: editNotes, card_user_name: editUserName },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('이 카드 등록을 삭제하시겠습니까?')) {
      deleteCard.mutate(id);
    }
  };

  const handleAdd = () => {
    if (!newGowidAlias.trim()) return;
    upsertCard.mutate(
      {
        gowid_alias: newGowidAlias.trim(),
        short_card_number: newShortNumber.trim() || undefined,
        card_user_name: newUserName.trim() || undefined,
        erp_alias: newErpAlias.trim() || undefined,
        notes: newNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowAddForm(false);
          setNewGowidAlias('');
          setNewShortNumber('');
          setNewUserName('');
          setNewErpAlias('');
          setNewNotes('');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unregisteredCards.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <Download className="h-4 w-4" />
              미등록 카드 {unregisteredCards.length}장 발견
            </h4>
            <button
              onClick={handleAutoRegisterAll}
              disabled={upsertCard.isPending}
              className="text-xs rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition flex items-center gap-1"
            >
              <RefreshCw className={cn('h-3 w-3', upsertCard.isPending && 'animate-spin')} />
              전체 자동 등록
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {unregisteredCards.map((c) => (
              <button
                key={c.gowid_alias}
                onClick={() =>
                  upsertCard.mutate({
                    gowid_alias: c.gowid_alias,
                    short_card_number: c.short_card_number,
                    card_user_name: c.card_user_name,
                  })
                }
                className="flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
              >
                <CreditCard className="h-3 w-3 text-amber-600" />
                <span className="font-medium text-slate-700 dark:text-slate-300">{c.gowid_alias}</span>
                <span className="text-slate-400">({c.short_card_number})</span>
                <Plus className="h-3 w-3 text-amber-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            등록된 카드 ({cards?.length ?? 0})
          </h4>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 transition flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            수동 등록
          </button>
        </div>

        {showAddForm && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-medium text-slate-500 mb-1 block">Gowid 별칭 *</label>
                <input
                  type="text"
                  value={newGowidAlias}
                  onChange={(e) => setNewGowidAlias(e.target.value)}
                  placeholder="Gowid 카드 별칭"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 mb-1 block">카드번호 뒤 4자리</label>
                <input
                  type="text"
                  value={newShortNumber}
                  onChange={(e) => setNewShortNumber(e.target.value)}
                  placeholder="0000"
                  maxLength={4}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 mb-1 block">카드 사용자</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="사용자명"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 mb-1 block">ERP 별칭</label>
                <input
                  type="text"
                  value={newErpAlias}
                  onChange={(e) => setNewErpAlias(e.target.value)}
                  placeholder="ERP에서 표시할 이름"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 mb-1 block">메모</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="관리 메모"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!newGowidAlias.trim() || upsertCard.isPending}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  등록
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-500"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {(cards?.length ?? 0) > 3 && (
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="카드 검색..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 py-1.5 text-sm"
              />
            </div>
          </div>
        )}

        {(!cards || cards.length === 0) && (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <CreditCard className="h-8 w-8 mb-2" />
            <p className="text-sm">등록된 카드가 없습니다.</p>
            <p className="text-xs mt-1">지출내역에서 자동으로 카드를 등록하거나 수동으로 추가하세요.</p>
          </div>
        )}

        {filteredCards.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                  <th className="px-4 py-2 text-left">Gowid 별칭</th>
                  <th className="px-4 py-2 text-left">카드번호</th>
                  <th className="px-4 py-2 text-left">사용자</th>
                  <th className="px-4 py-2 text-left">ERP 별칭</th>
                  <th className="px-4 py-2 text-left">메모</th>
                  <th className="px-4 py-2 text-center w-24">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((card) =>
                  editingId === card.id ? (
                    <tr key={card.id} className="border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10">
                      <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">
                        {card.gowid_alias}
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        {card.short_card_number ? `****${card.short_card_number}` : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editUserName}
                          onChange={(e) => setEditUserName(e.target.value)}
                          className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editAlias}
                          onChange={(e) => setEditAlias(e.target.value)}
                          placeholder="ERP 별칭 입력"
                          className="w-full rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="메모"
                          className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={handleSaveEdit}
                            disabled={updateCard.isPending}
                            className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={card.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">
                        {card.gowid_alias}
                      </td>
                      <td className="px-4 py-2 text-slate-500 text-xs font-mono">
                        {card.short_card_number ? `****${card.short_card_number}` : '-'}
                      </td>
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                        {card.card_user_name || '-'}
                      </td>
                      <td className="px-4 py-2">
                        {card.erp_alias ? (
                          <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                            {card.erp_alias}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">미설정</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-400 text-xs max-w-[150px] truncate">
                        {card.notes || '-'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStartEdit(card)}
                            className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                            title="수정"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(card.id)}
                            disabled={deleteCard.isPending}
                            className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
