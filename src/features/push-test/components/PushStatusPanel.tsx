'use client';

import { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, RefreshCw, Smartphone, Globe, Bell, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isNativePlatform, requestPermissionAndRegister } from '@/lib/capacitor';
import { requestWebPushPermission, isWebPushSupported, getNotificationPermission } from '@/lib/web-push';

interface TokenInfo {
  id: string;
  platform: string;
  isActive: boolean;
  tokenPreview: string;
  createdAt: string;
  updatedAt: string;
}

interface PushStatus {
  firebaseConfigured: boolean;
  edgeFunctionAvailable?: boolean;
  userId: string;
  totalTokens: number;
  activeTokens: number;
  tokens?: TokenInfo[];
}

export function PushStatusPanel() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestingPermission, setRequestingPermission] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/push/test');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '상태 조회 실패');
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // 플랫폼별 활성 토큰 수 계산
  const activeTokens = status?.tokens?.filter(t => t.isActive) || [];
  const androidCount = activeTokens.filter(t => t.platform === 'android').length;
  const webCount = activeTokens.filter(t => t.platform === 'web').length;
  const iosCount = activeTokens.filter(t => t.platform === 'ios').length;

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Push 상태 확인 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4">
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <XCircle className="h-4 w-4" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">시스템 상태</span>
        </div>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
        >
          <RefreshCw className="h-3 w-3" />
          새로고침
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Firebase 상태 */}
        <div className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 border',
          status?.firebaseConfigured
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
        )}>
          {status?.firebaseConfigured ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Firebase Admin</p>
            <p className={cn(
              'text-[10px]',
              status?.firebaseConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            )}>
              {status?.firebaseConfigured ? '연결됨' : '미설정 → Supabase send-push 사용'}
            </p>
          </div>
        </div>

        {/* 내 사용자 ID */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 border bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
          <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">내 사용자 ID</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[150px]">
              {status?.userId ? `${status.userId.substring(0, 8)}...` : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* 배포 환경 경고 */}
      {!status?.firebaseConfigured && (
        <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 px-3 py-2 text-[10px] text-amber-800 dark:text-amber-200 space-y-1">
          {status?.edgeFunctionAvailable === false ? (
            <>
              <strong>배포에서 푸시가 안 오는 이유:</strong> Vercel에 <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code>, <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>가 설정되어 있어야 Edge Function(send-push) 호출이 가능합니다.
            </>
          ) : (
            <>
              <strong>배포 링크에서 푸시가 안 올 때:</strong> Supabase Edge Function(send-push)으로 발송합니다. Supabase 대시보드 → Edge Functions → Secrets에 Firebase 시크릿을 설정해 주세요.
            </>
          )}
        </div>
      )}

      {/* 플랫폼별 등록 디바이스 */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
          등록된 디바이스 (내 계정)
        </p>
        <div className="grid grid-cols-3 gap-2">
          {/* Android */}
          <div className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 border',
            androidCount > 0
              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50'
              : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
          )}>
            <Smartphone className={cn(
              'h-4 w-4 flex-shrink-0',
              androidCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'
            )} />
            <div>
              <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Android</p>
              <p className={cn(
                'text-sm font-bold',
                androidCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'
              )}>
                {androidCount}
              </p>
            </div>
          </div>

          {/* Web (PWA) */}
          <div className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 border',
            webCount > 0
              ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50'
              : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
          )}>
            <Globe className={cn(
              'h-4 w-4 flex-shrink-0',
              webCount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
            )} />
            <div>
              <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Web/PWA</p>
              <p className={cn(
                'text-sm font-bold',
                webCount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
              )}>
                {webCount}
              </p>
            </div>
          </div>

          {/* iOS */}
          <div className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 border',
            iosCount > 0
              ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900/50'
              : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
          )}>
            <Monitor className={cn(
              'h-4 w-4 flex-shrink-0',
              iosCount > 0 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'
            )} />
            <div>
              <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">iOS</p>
              <p className={cn(
                'text-sm font-bold',
                iosCount > 0 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'
              )}>
                {iosCount}
              </p>
            </div>
          </div>
        </div>

        {/* 토큰 상세 목록 */}
        {activeTokens.length > 0 && (
          <div className="mt-2 space-y-1">
            {activeTokens.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
                    t.platform === 'android'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                      : t.platform === 'web'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300'
                  )}>
                    {t.platform}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {t.tokenPreview}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400">
                  {new Date(t.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTokens.length === 0 && (
          <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
            등록된 디바이스가 없습니다. 아래 버튼으로 알림을 허용해 주세요.
          </p>
        )}
      </div>

      {/* 알림 허용 버튼 */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
        {/* 네이티브 앱 알림 허용 */}
        {isNativePlatform() && (
          <button
            type="button"
            onClick={async () => {
              setRequestingPermission(true);
              try {
                const granted = await requestPermissionAndRegister();
                if (granted) await fetchStatus();
              } finally {
                setRequestingPermission(false);
              }
            }}
            disabled={requestingPermission}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800/50 disabled:opacity-50"
          >
            {requestingPermission ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Smartphone className="h-3.5 w-3.5" />
            )}
            {requestingPermission ? '요청 중...' : '네이티브 알림 허용'}
          </button>
        )}

        {/* 웹/PWA 알림 허용 */}
        {!isNativePlatform() && isWebPushSupported() && (
          <button
            type="button"
            onClick={async () => {
              setRequestingPermission(true);
              try {
                const granted = await requestWebPushPermission();
                if (granted) {
                  // 토큰 등록 후 상태 갱신까지 약간 대기
                  await new Promise(r => setTimeout(r, 1500));
                  await fetchStatus();
                }
              } finally {
                setRequestingPermission(false);
              }
            }}
            disabled={requestingPermission}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50 disabled:opacity-50"
          >
            {requestingPermission ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            {requestingPermission ? '등록 중...' : getNotificationPermission() === 'granted' ? '웹 토큰 재등록' : '웹 알림 허용'}
          </button>
        )}

        <p className="w-full text-[10px] text-slate-500 dark:text-slate-400 mt-1">
          {isNativePlatform()
            ? '알림 팝업이 안 뜬다면 기기 설정 → 앱 → 알림에서 허용해 주세요.'
            : '웹/PWA에서 알림이 안 온다면 위 버튼을 눌러 토큰을 재등록하세요.'}
        </p>
      </div>
    </div>
  );
}
