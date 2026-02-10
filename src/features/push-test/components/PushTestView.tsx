'use client';

import { useState } from 'react';
import { Bell, Send, Users, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PushAllTab } from './PushAllTab';
import { PushUserTab } from './PushUserTab';
import { PushConditionalTab } from './PushConditionalTab';
import { PushStatusPanel } from './PushStatusPanel';

type TabType = 'all' | 'user' | 'conditional';

const TABS: { id: TabType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'all',
    label: '전체 푸시',
    icon: <Send className="h-4 w-4" />,
    description: '모든 사용자에게 푸시 알림을 전송합니다.',
  },
  {
    id: 'user',
    label: '특정 사용자 푸시',
    icon: <Users className="h-4 w-4" />,
    description: '선택한 사용자에게만 푸시 알림을 전송합니다.',
  },
  {
    id: 'conditional',
    label: '조건부 푸시',
    icon: <Filter className="h-4 w-4" />,
    description: '역할, 사업부 등 조건에 맞는 사용자에게 푸시를 전송합니다.',
  },
];

export function PushTestView() {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/50">
            <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              푸시 알림 테스트
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              FCM + 인앱 알림을 테스트해 볼 수 있습니다. (Admin 전용)
            </p>
          </div>
        </div>
      </div>

      {/* 푸시 상태 패널 */}
      <PushStatusPanel />

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/25'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 설명 */}
      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-4 py-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {TABS.find((t) => t.id === activeTab)?.description}
        </p>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'all' && <PushAllTab />}
      {activeTab === 'user' && <PushUserTab />}
      {activeTab === 'conditional' && <PushConditionalTab />}
    </div>
  );
}
