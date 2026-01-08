'use client';

import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Clapperboard,
  Youtube,
  Calendar as CalendarIcon,
  Camera,
  Users,
  Briefcase,
  Receipt,
  CheckSquare,
  BookOpen,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactStudioView } from '../types';

interface SidebarProps {
  activeTab: ReactStudioView;
  onTabChange: (tab: ReactStudioView) => void;
  user?: any;
  onLogout: () => void;
}

const menuItems = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'projects', label: '프로젝트 관리', icon: Clapperboard },
  { id: 'channels', label: '채널 관리', icon: Youtube },
  { id: 'schedule', label: '일정/캘린더', icon: CalendarIcon },
  { id: 'equipment', label: '장비 관리', icon: Camera },
  { id: 'hr', label: '스태프/외주', icon: Users },
  { id: 'clients', label: '클라이언트', icon: Briefcase },
  { id: 'finance', label: '정산/회계', icon: Receipt },
  { id: 'tasks', label: '업무/할일', icon: CheckSquare },
  { id: 'manuals', label: '매뉴얼/가이드', icon: BookOpen },
];

export function Sidebar({ activeTab, onTabChange, user, onLogout }: SidebarProps) {
  const router = useRouter();

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl flex-shrink-0 z-20">
      <div className="p-6 flex items-center space-x-2 border-b border-slate-800 h-16">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <span className="font-bold text-white">R</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight">React Studio</h1>
      </div>

      {user?.profile?.bu_code === 'HEAD' && (
        <div className="px-3 pt-4 pb-2 border-b border-slate-800">
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-700"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0 mr-3" />
            <span className="text-sm font-medium whitespace-nowrap">통합 ERP로 이동</span>
          </button>
        </div>
      )}

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as ReactStudioView)}
            className={cn(
              'w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 group relative',
              activeTab === item.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-800 hover:text-white'
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0 mr-3" />
            <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto p-6 pt-0">
        <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4">
          <p className="mb-1 text-[10px] uppercase tracking-tighter text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Signed in as
          </p>
          <p className="text-sm font-semibold text-blue-100">
            {user?.profile?.name || user?.email || '사용자'}
          </p>
          {user?.profile?.position && (
            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{user.profile.position}</p>
          )}
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



