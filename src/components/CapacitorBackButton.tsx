'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useRouter } from 'next/navigation';
import { useBackHandlerStore } from '@/stores/backHandlerStore';
import { isNativePlatform } from '@/lib/capacitor';

/**
 * Android 뒤로가기 버튼 핸들링.
 * 등록된 핸들러가 있으면 실행, 없으면 history.back().
 * history가 없으면 앱 종료 방지 (아무 동작 안 함).
 */
export function CapacitorBackButton() {
  const router = useRouter();
  const getTop = useBackHandlerStore((s) => s.getTop);

  useEffect(() => {
    if (!isNativePlatform()) return;

    const listener = App.addListener('backButton', () => {
      const handler = getTop();
      if (handler) {
        handler();
        return;
      }
      if (window.history.length > 1) {
        router.back();
        return;
      }
      // history가 없으면 아무 동작 안 함 (앱 종료 방지)
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [getTop, router]);

  return null;
}
