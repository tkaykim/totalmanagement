'use client';

import { LogOut, LayoutDashboard, FolderKanban, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

type MyProfileView = 'dashboard' | 'projects' | 'settlements';

interface MyProfileSidebarProps {
  currentView: MyProfileView;
  onViewChange: (view: MyProfileView) => void;
  userName?: string;
  onLogout: () => void;
}

export function MyProfileSidebar({ currentView, onViewChange, userName, onLogout }: MyProfileSidebarProps) {
  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-slate-900 text-white">
      <div className="p-8">
        <p className="text-xl font-bold tracking-tighter text-blue-300">내 프로필</p>
        <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">My Profile</p>
      </div>

      <nav className="flex-1 space-y-2 px-4">
        <button
          onClick={() => onViewChange('dashboard')}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition',
            currentView === 'dashboard'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-300 dark:text-slate-400 hover:bg-slate-800 dark:hover:bg-slate-700 hover:text-white',
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>대시보드</span>
        </button>
        <button
          onClick={() => onViewChange('projects')}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition',
            currentView === 'projects'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-300 dark:text-slate-400 hover:bg-slate-800 dark:hover:bg-slate-700 hover:text-white',
          )}
        >
          <FolderKanban className="h-5 w-5" />
          <span>프로젝트</span>
        </button>
        <button
          onClick={() => onViewChange('settlements')}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition',
            currentView === 'settlements'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-300 dark:text-slate-400 hover:bg-slate-800 dark:hover:bg-slate-700 hover:text-white',
          )}
        >
          <CreditCard className="h-5 w-5" />
          <span>정산현황</span>
        </button>
      </nav>

      <div className="p-6 pt-0">
        <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4">
          <p className="mb-1 text-[10px] uppercase tracking-tighter text-slate-500 dark:text-slate-400">Signed in as</p>
          <p className="text-sm font-semibold text-blue-100">{userName || '사용자'}</p>
        </div>
        <button
          onClick={onLogout}
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700/60 flex items-center justify-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}

