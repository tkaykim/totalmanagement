'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, Clock, AlertCircle, Info, CheckCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
  created_at: string;
}

interface NotificationResponse {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
}

const TYPE_ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: AlertCircle,
};

const TYPE_COLORS = {
  info: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
  success: 'text-green-500 bg-green-50 dark:bg-green-900/30',
  warning: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
  error: 'text-red-500 bg-red-50 dark:bg-red-900/30',
};

const TYPE_BORDER_COLORS = {
  info: 'border-l-blue-500',
  success: 'border-l-green-500',
  warning: 'border-l-amber-500',
  error: 'border-l-red-500',
};

export function NotificationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchNotifications = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await fetch('/api/notifications?limit=50');
      if (res.ok) {
        const data: NotificationResponse = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(), 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const notification = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
      setIsOpen(false);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className="relative flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 transition hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0 active:scale-95"
          aria-label="알림"
        >
          <Bell className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-slate-600 dark:text-slate-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-red-500 text-[11px] sm:text-[10px] font-bold text-white animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent 
        side="right" 
        className="w-full sm:w-[420px] p-0 flex flex-col bg-white dark:bg-slate-900"
      >
        <SheetHeader className="px-4 sm:px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  알림
                </SheetTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {unreadCount > 0 ? `${unreadCount}개의 읽지 않은 알림` : '모든 알림을 읽었습니다'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchNotifications(true)}
                disabled={refreshing}
                className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700 transition"
                title="새로고침"
              >
                <RefreshCw className={cn("h-4 w-4 text-slate-600 dark:text-slate-400", refreshing && "animate-spin")} />
              </button>
            </div>
          </div>
        </SheetHeader>

        {unreadCount > 0 && (
          <div className="px-4 sm:px-5 py-2 border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10">
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition"
            >
              <CheckCheck size={16} />
              모두 읽음 처리
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-sm text-slate-500">알림을 불러오는 중...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Bell size={28} className="opacity-50" />
              </div>
              <p className="text-base font-medium">알림이 없습니다</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">새로운 알림이 오면 여기에 표시됩니다</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {unreadNotifications.length > 0 && (
                <div>
                  <div className="px-4 sm:px-5 py-2 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      읽지 않음 ({unreadNotifications.length})
                    </p>
                  </div>
                  <ul>
                    {unreadNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onMarkAsRead={handleMarkAsRead}
                        onDelete={handleDelete}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {readNotifications.length > 0 && (
                <div>
                  <div className="px-4 sm:px-5 py-2 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      읽음 ({readNotifications.length})
                    </p>
                  </div>
                  <ul>
                    {readNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onMarkAsRead={handleMarkAsRead}
                        onDelete={handleDelete}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onMarkAsRead: (id: number, e?: React.MouseEvent) => void;
  onDelete: (id: number, e?: React.MouseEvent) => void;
}

function NotificationItem({ notification, onClick, onMarkAsRead, onDelete }: NotificationItemProps) {
  const Icon = TYPE_ICONS[notification.type] || Info;
  const colorClass = TYPE_COLORS[notification.type] || TYPE_COLORS.info;
  const borderColor = TYPE_BORDER_COLORS[notification.type] || TYPE_BORDER_COLORS.info;

  return (
    <li
      className={cn(
        'relative border-l-4 transition-all duration-200',
        borderColor,
        !notification.read 
          ? 'bg-blue-50/70 dark:bg-blue-900/20 hover:bg-blue-100/70 dark:hover:bg-blue-900/30' 
          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
      )}
    >
      <button
        onClick={onClick}
        className="w-full text-left px-4 sm:px-5 py-4 active:bg-slate-100 dark:active:bg-slate-800"
      >
        <div className="flex gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm', colorClass)}>
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0 pr-16">
            <div className="flex items-start gap-2">
              <p className={cn(
                'text-sm leading-tight',
                !notification.read ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
              )}>
                {notification.title}
              </p>
              {!notification.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-0.5 shadow-sm shadow-blue-500/50" />
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {notification.message}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1.5">
              <Clock size={12} />
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ko })}
            </p>
          </div>
        </div>
      </button>

      <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex gap-1.5">
        {!notification.read && (
          <button
            onClick={(e) => onMarkAsRead(notification.id, e)}
            className="p-2.5 sm:p-2 rounded-lg bg-white dark:bg-slate-700 shadow-md hover:bg-green-50 dark:hover:bg-green-900/30 border border-slate-200 dark:border-slate-600 transition active:scale-95"
            title="읽음 처리"
          >
            <Check size={14} className="text-green-600 dark:text-green-400" />
          </button>
        )}
        <button
          onClick={(e) => onDelete(notification.id, e)}
          className="p-2.5 sm:p-2 rounded-lg bg-white dark:bg-slate-700 shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 border border-slate-200 dark:border-slate-600 transition active:scale-95"
          title="삭제"
        >
          <Trash2 size={14} className="text-red-500 dark:text-red-400" />
        </button>
      </div>
    </li>
  );
}
