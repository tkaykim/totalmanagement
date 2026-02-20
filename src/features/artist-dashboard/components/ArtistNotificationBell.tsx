'use client';

import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useArtistNotifications, useMarkNotificationsRead } from '../hooks';
import { cn } from '@/lib/utils';

export function ArtistNotificationBell() {
  const { data, isLoading } = useArtistNotifications({ limit: 20 });
  const markRead = useMarkNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="알림"
        >
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <div className="flex items-center justify-between px-2 py-2 border-b border-slate-100 dark:border-slate-700">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            알림
          </span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markRead.mutate({ mark_all: true })}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              모두 읽음
            </button>
          )}
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              로딩 중...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              알림이 없습니다.
            </div>
          ) : (
            <ul className="py-1">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'px-3 py-2.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0',
                    !n.is_read && 'bg-blue-50/50 dark:bg-blue-900/10'
                  )}
                >
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {format(new Date(n.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
