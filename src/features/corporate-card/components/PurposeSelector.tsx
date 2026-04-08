'use client';

import { useMemo } from 'react';
import { useGowidPurposes, useUpdatePurpose } from '../hooks';
import { SearchableDropdown, type DropdownOption } from './SearchableDropdown';

interface PurposeSelectorProps {
  expenseId: number;
  currentPurposeName: string | null;
  canEdit: boolean;
}

export function PurposeSelector({ expenseId, currentPurposeName, canEdit }: PurposeSelectorProps) {
  const { data: purposes } = useGowidPurposes(true);
  const updatePurpose = useUpdatePurpose();

  const purposeOptions: DropdownOption[] = useMemo(() => {
    if (!purposes) return [];
    return purposes.map((p) => ({
      value: String(p.purposeId),
      label: p.name,
      sub: p.category?.name || undefined,
    }));
  }, [purposes]);

  const currentValue = useMemo(() => {
    if (!currentPurposeName || !purposes) return '';
    const found = purposes.find((p) => p.name === currentPurposeName);
    return found ? String(found.purposeId) : '';
  }, [currentPurposeName, purposes]);

  const handleSelect = (val: string) => {
    if (!val) return;
    updatePurpose.mutate({ expenseId, purposeId: Number(val) });
  };

  if (!canEdit) {
    return (
      <div className="text-sm text-slate-700 dark:text-slate-300">
        {currentPurposeName || <span className="text-slate-400">미지정</span>}
      </div>
    );
  }

  return (
    <SearchableDropdown
      options={purposeOptions}
      value={currentValue}
      onChange={handleSelect}
      placeholder="용도 선택..."
      emptyLabel="미지정"
      searchPlaceholder="용도 검색..."
    />
  );
}
