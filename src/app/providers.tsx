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
import { initPushNotifications, isNativePlatform } from '@/lib/capacitor';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';

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

  // Capacitor 푸시 알림 초기화 (네이티브 앱에서만)
  useEffect(() => {
    if (isNativePlatform()) {
      initPushNotifications({
        onRegistration: (token) => {
          console.log('[App] 푸시 토큰 등록됨:', token.substring(0, 20) + '...');
        },
        onNotificationReceived: (notification) => {
          try {
            const data = (notification.data ?? {}) as Record<string, string>;
            const title = notification.title ?? data.title ?? '알림';
            const body = notification.body ?? data.body ?? '';
            const hasImage = !!(data.image ?? (notification as unknown as { image?: string }).image);
            const description = [body, hasImage ? '[이미지 첨부]' : ''].filter(Boolean).join(' ') || undefined;
            // 다음 틱에서 토스트 표시 (React/Toaster 마운트 보장)
            setTimeout(() => {
              toast({ title, description });
            }, 0);
          } catch (e) {
            console.warn('[Push] 토스트 표시 실패:', e);
            toast({ title: '알림', description: '새 알림이 도착했습니다.' });
          }
        },
        onNotificationActionPerformed: (action) => {
          // 알림 클릭 시 특정 페이지로 이동
          const data = action.notification.data;
          if (data?.action_url) {
            window.location.href = data.action_url;
          }
        },
      });
    }
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
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
