'use client';

import { useEffect } from 'react';
import { useBackHandlerStore } from '@/stores/backHandlerStore';

/**
 * 뒤로가기 버튼 핸들러 등록.
 * handler가 null이 아닐 때 등록되고, null이 되거나 unmount 시 해제됨.
 * 여러 컴포넌트에서 사용 시 나중에 등록된 핸들러가 먼저 실행됨 (스택).
 */
export function useBackHandler(handler: (() => void) | null): void {
  const push = useBackHandlerStore((s) => s.push);

  useEffect(() => {
    if (!handler) return;
    const remove = push(handler);
    return remove;
  }, [handler, push]);
}
