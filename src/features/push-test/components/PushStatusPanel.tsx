'use client';

import { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, RefreshCw, Smartphone, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isNativePlatform, requestPermissionAndRegister } from '@/lib/capacitor';

interface PushStatus {
  firebaseConfigured: boolean;
  userId: string;
  totalTokens: number;
  activeTokens: number;
  tokens?: {
    id: string;
    platform: string;
    isActive: boolean;
    tokenPreview: string;
    createdAt: string;
    updatedAt: string;
  }[];
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Firebase 상태 */}
        <div className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 border',
          status?.firebaseConfigured
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
            : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
        )}>
          {status?.firebaseConfigured ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          )}
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Firebase Admin</p>
            <p className={cn(
              'text-[10px]',
              status?.firebaseConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}>
              {status?.firebaseConfigured ? '연결됨' : '미설정'}
            </p>
          </div>
        </div>

        {/* 등록된 토큰 */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 border bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
          <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">등록된 디바이스</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              활성 {status?.activeTokens ?? 0}개 / 전체 {status?.totalTokens ?? 0}개
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

      {/* 네이티브 앱에서 알림 허용 버튼 (토큰이 없을 때 또는 항상 노출) */}
      {isNativePlatform() && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
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
              <Bell className="h-3.5 w-3.5" />
            )}
            {requestingPermission ? '요청 중...' : '알림 허용 요청'}
          </button>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
            알림 팝업이 안 뜬다면 위 버튼을 누르거나, 기기 설정 → 앱 → 알림에서 허용해 주세요.
          </p>
        </div>
      )}
    </div>
  );
}
