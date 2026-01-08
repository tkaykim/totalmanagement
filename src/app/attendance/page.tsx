'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '@/features/erp/api';
import { AttendanceDashboard } from '@/features/attendance/components/AttendanceDashboard';
import { WorkRequestModal } from '@/features/attendance/components/WorkRequestModal';
import { ApprovalQueue } from '@/features/attendance/components/ApprovalQueue';
import { isManager } from '@/features/attendance/lib/permissions';
import type { AppUser } from '@/types/database';
import { cn } from '@/lib/utils';

export default function AttendancePage() {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'approval'>('dashboard');

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const currentUser = usersData?.currentUser as AppUser | undefined;
  const canApprove = isManager(currentUser);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">근태 관리</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">출퇴근 기록 및 근무 신청을 관리합니다</p>
        </div>

        {canApprove && (
          <div className="mb-6 flex gap-2 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                'px-4 py-2 text-sm font-semibold transition',
                activeTab === 'dashboard'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              대시보드
            </button>
            <button
              onClick={() => setActiveTab('approval')}
              className={cn(
                'px-4 py-2 text-sm font-semibold transition',
                activeTab === 'approval'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              결재 관리
            </button>
          </div>
        )}

        {activeTab === 'dashboard' ? (
          <AttendanceDashboard onRequestCorrection={() => setShowRequestModal(true)} />
        ) : (
          <ApprovalQueue />
        )}

        <WorkRequestModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
        />
      </div>
    </div>
  );
}

