'use client';

import { useMemo } from 'react';
import { useGowidCards } from '../hooks';

export function useCardAliasMap() {
  const { data: cards } = useGowidCards();

  const aliasMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!cards) return map;
    for (const card of cards) {
      if (card.erp_alias) {
        map.set(card.gowid_alias, card.erp_alias);
      }
    }
    return map;
  }, [cards]);

  const resolveAlias = (gowidAlias: string): string => {
    return aliasMap.get(gowidAlias) || gowidAlias;
  };

  return { aliasMap, resolveAlias, cards };
}
