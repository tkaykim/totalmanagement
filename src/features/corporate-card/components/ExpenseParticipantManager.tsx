'use client';

import { useState, useMemo } from 'react';
import { Plus, X, UserPlus, Save } from 'lucide-react';
import { useGowidMembers, useUpdateParticipants } from '../hooks';
import { SearchableMultiSelect, type MultiSelectOption } from './SearchableMultiSelect';
import type { GowidUserVo, GowidExternalUser, GowidParticipant } from '../types';

interface ExpenseParticipantManagerProps {
  expenseId: number;
  participants: GowidUserVo[] | GowidParticipant[];
  externalUsers: GowidExternalUser[];
  canEdit: boolean;
}

export function ExpenseParticipantManager({
  expenseId,
  participants,
  externalUsers,
  canEdit,
}: ExpenseParticipantManagerProps) {
  const { data: members } = useGowidMembers();
  const updateParticipants = useUpdateParticipants();

  const [showAddExternal, setShowAddExternal] = useState(false);
  const [extName, setExtName] = useState('');
  const [extCompany, setExtCompany] = useState('');

  const currentParticipantIds = participants
    .map((p) => ('userId' in p ? (p as GowidParticipant).userId : 0))
    .filter(Boolean);

  const [selectedIds, setSelectedIds] = useState<number[]>(currentParticipantIds);
  const [extUsers, setExtUsers] = useState<GowidExternalUser[]>(externalUsers);

  const memberOptions: MultiSelectOption[] = useMemo(() => {
    if (!members) return [];
    return members
      .filter((m) => m.status === 'NORMAL')
      .map((m) => ({
        value: m.userId,
        label: m.userName,
        sub: m.department?.name || undefined,
      }));
  }, [members]);

  const handleSave = () => {
    updateParticipants.mutate({
      expenseId,
      participantIds: selectedIds,
      externalUsers: extUsers,
    });
  };

  const handleAddExternal = () => {
    if (!extName.trim()) return;
    setExtUsers([...extUsers, { name: extName.trim(), company: extCompany.trim() }]);
    setExtName('');
    setExtCompany('');
    setShowAddExternal(false);
  };

  const handleRemoveExternal = (idx: number) => {
    setExtUsers(extUsers.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          참석자
        </h4>
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={updateParticipants.isPending}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 flex items-center gap-1"
          >
            <Save className="h-3 w-3" />
            저장
          </button>
        )}
      </div>

      {canEdit && (
        <SearchableMultiSelect
          options={memberOptions}
          selectedValues={selectedIds}
          onChange={setSelectedIds}
          placeholder="참석자 검색 및 선택..."
          searchPlaceholder="이름, 부서 검색..."
        />
      )}

      {!canEdit && participants.length === 0 && (
        <p className="text-xs text-slate-400">참석자 없음</p>
      )}

      {!canEdit && participants.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {participants.map((p, i) => (
            <span key={i} className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">
              {'userName' in p ? p.userName : ''}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">외부 참석자</span>
          {canEdit && (
            <button
              onClick={() => setShowAddExternal(true)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              <UserPlus className="h-3 w-3" /> 추가
            </button>
          )}
        </div>

        {extUsers.length === 0 && (
          <p className="text-[11px] text-slate-400">없음</p>
        )}

        {extUsers.map((eu, i) => (
          <div key={i} className="flex items-center justify-between rounded bg-slate-50 dark:bg-slate-800 px-2 py-1">
            <span className="text-xs text-slate-700 dark:text-slate-300">
              {eu.name} {eu.company && `(${eu.company})`}
            </span>
            {canEdit && (
              <button onClick={() => handleRemoveExternal(i)} className="text-slate-400 hover:text-red-500">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {showAddExternal && (
          <div className="flex items-center gap-1 mt-1">
            <input
              type="text"
              placeholder="이름"
              value={extName}
              onChange={(e) => setExtName(e.target.value)}
              className="flex-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
            />
            <input
              type="text"
              placeholder="소속"
              value={extCompany}
              onChange={(e) => setExtCompany(e.target.value)}
              className="flex-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
            />
            <button onClick={handleAddExternal} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">
              <Plus className="h-3 w-3" />
            </button>
            <button onClick={() => setShowAddExternal(false)} className="text-slate-400">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
