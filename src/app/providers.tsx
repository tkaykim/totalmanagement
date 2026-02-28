// In Next.js, this file would be called: app/providers.tsx
'use client';

// Since QueryClientProvider relies on useContext under the hood, we have to put 'use client' on top
import { useEffect } from 'react';
import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { initPushNotifications, isNativePlatform, retryPushRegistration, initBackButtonHandler } from '@/lib/capacitor';
import { initWebPush, retryWebPushRegistration } from '@/lib/web-push';
import { IOSPushPrompt } from '@/components/IOSPushPrompt';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  // Capacitor 푸시 알림 초기화 + 뒤로가기 버튼 핸들러 (네이티브 앱에서만)
  useEffect(() => {
    if (isNativePlatform()) {
      // 하드웨어 뒤로가기 버튼 핸들러 초기화
      initBackButtonHandler();

      initPushNotifications({
        onRegistration: (token) => {
          console.log('[App] 푸시 토큰 등록됨:', token.substring(0, 20) + '...');
        },
        onNotificationReceived: (notification) => {
          try {
            const data = (notification.data ?? {}) as Record<string, string>;
            const title = (notification.title ?? data.title ?? '알림').trim() || '알림';
            const body = (notification.body ?? data.body ?? '').trim();
            const hasImage = !!(data.image ?? (notification as unknown as { image?: string }).image);
            const description = [body, hasImage ? '[이미지 첨부]' : ''].filter(Boolean).join(' ').trim() || '새 알림이 도착했습니다.';
            // 다음 틱에서 토스트 표시 (React/Toaster 마운트 보장)
            setTimeout(() => {
              toast({ title, description });
            }, 100);
          } catch (e) {
            console.warn('[Push] 토스트 표시 실패:', e);
            toast({ title: '알림', description: '새 알림이 도착했습니다.' });
          }
        },
        onNotificationActionPerformed: (action) => {
          // 알림 클릭 시 특정 페이지로 이동
          const data = action.notification.data;
          if (data?.action_url) {
            // 딥링크 플래그 설정 → page.tsx에서 근무상태 화면 건너뛰기
            try { sessionStorage.setItem('push_deep_link', '1'); } catch { }
            window.location.href = data.action_url;
          }
        },
      });
    } else {
      // 웹/PWA 환경: Web Push 초기화 (iOS PWA 포함)
      initWebPush({
        onNotificationReceived: (payload) => {
          setTimeout(() => {
            toast({
              title: payload.title,
              description: payload.body || '새 알림이 도착했습니다.',
            });
          }, 100);
        },
      });
    }
  }, []);

  // 로그인 후 푸시 토큰 재등록 (로그인 전 토큰 저장 실패 복구)
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // 로그인 완료 → 2초 대기 후 토큰 재등록 (세션 안정화 대기)
        setTimeout(() => {
          if (isNativePlatform()) {
            retryPushRegistration();
          } else {
            retryWebPushRegistration();
          }
        }, 2000);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <IOSPushPrompt />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
