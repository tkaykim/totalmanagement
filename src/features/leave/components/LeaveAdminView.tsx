'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Gift,
  Users,
  CheckSquare,
  Calendar,
  CalendarMinus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LeaveApprovalQueue } from './LeaveApprovalQueue';
import { AdminLeaveGrant } from './AdminLeaveGrant';
import { AdminLeaveUse } from './AdminLeaveUse';
import { TeamLeaveTable } from './TeamLeaveTable';
import { LeaveRequestList } from './LeaveRequestList';
import {
  getPendingApprovals,
  getTeamLeaveStats,
  getLeaveRequests,
  cancelLeaveRequest,
} from '../api';
import type { PendingApprovalItem, TeamLeaveStats as TeamLeaveStatsType } from '../api';
import type { LeaveRequestWithUser } from '../types';

const BU_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'HEAD', label: '본사' },
  { value: 'GRIGO', label: '그리고엔터' },
  { value: 'FLOW', label: '플로우메이커' },
  { value: 'REACT', label: '리액트스튜디오' },
  { value: 'MODOO', label: '모두굿즈' },
  { value: 'AST', label: '아스트컴퍼니' },
];

export function LeaveAdminView() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ role: string; bu_code: string | null } | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingApprovalItem[]>([]);
  const [teamStats, setTeamStats] = useState<TeamLeaveStatsType[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequestWithUser[]>([]);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedBu, setSelectedBu] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [useModalOpen, setUseModalOpen] = useState(false);
  const [preselectedUser, setPreselectedUser] = useState<{ id: string; name: string } | null>(null);
  const [usePreselectedUser, setUsePreselectedUser] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'team' | 'all'>('pending');

  const fetchData = useCallback(async () => {
    try {
      const [pending, stats, requests] = await Promise.all([
        getPendingApprovals(),
        getTeamLeaveStats({
          year: selectedYear,
          bu_code: selectedBu !== 'all' ? selectedBu : undefined,
        }),
        getLeaveRequests({ year: selectedYear }),
      ]);

      setPendingItems(pending);
      setTeamStats(stats);
      setAllRequests(requests);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    }
  }, [selectedBu, selectedYear]);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: appUser } = await supabase
          .from('app_users')
          .select('role, bu_code')
          .eq('id', user.id)
          .single();

        if (appUser) {
          setCurrentUser(appUser);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchData();
    }
  }, [loading, fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const isHeadAdmin = currentUser?.role === 'admin' && currentUser?.bu_code === 'HEAD';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            휴가 관리 (관리자)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            휴가 신청 승인, 휴가 부여, 팀원 현황을 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="연도" />
            </SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          {isHeadAdmin && (
            <>
              <Button variant="outline" onClick={() => setUseModalOpen(true)}>
                <CalendarMinus className="h-4 w-4 mr-2" />
                대리 소진
              </Button>
              <Button onClick={() => setGrantModalOpen(true)}>
                <Gift className="h-4 w-4 mr-2" />
                휴가 부여
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <CheckSquare className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingItems.length}</p>
                <p className="text-sm text-slate-500">승인 대기</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teamStats.length}</p>
                <p className="text-sm text-slate-500">관리 대상 인원</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allRequests.filter(r => r.status === 'approved').length}
                </p>
                <p className="text-sm text-slate-500">이번 달 승인</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            activeTab === 'pending'
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          승인 대기
          {pendingItems.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
              {pendingItems.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            activeTab === 'team'
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          팀원 현황
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            activeTab === 'all'
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          전체 신청
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4 w-full min-w-0">
        {activeTab === 'pending' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">승인 대기 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <LeaveApprovalQueue
                items={pendingItems}
                onRefresh={fetchData}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'team' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">전사 근무관리</CardTitle>
              {currentUser?.role === 'admin' && (
                <Select value={selectedBu} onValueChange={setSelectedBu}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="사업부 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {BU_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent className="w-full min-w-0 overflow-x-auto">
              <TeamLeaveTable
                stats={teamStats}
                onRefresh={fetchData}
                onOpenGrantForUser={(user) => {
                  setPreselectedUser(user);
                  setGrantModalOpen(true);
                }}
                onOpenUseForUser={isHeadAdmin ? (user) => {
                  setUsePreselectedUser(user);
                  setUseModalOpen(true);
                } : undefined}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'all' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">전체 휴가 신청</CardTitle>
            </CardHeader>
            <CardContent>
              <LeaveRequestList
                requests={allRequests}
                showRequester
                onAdminDelete={isHeadAdmin ? async (id) => {
                  try {
                    await cancelLeaveRequest(id);
                    await fetchData();
                  } catch (error) {
                    alert(error instanceof Error ? error.message : '삭제에 실패했습니다.');
                  }
                } : undefined}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <AdminLeaveGrant
        open={grantModalOpen}
        onOpenChange={(open) => {
          setGrantModalOpen(open);
          if (!open) setPreselectedUser(null);
        }}
        onSuccess={fetchData}
        preselectedUser={preselectedUser}
      />
      <AdminLeaveUse
        open={useModalOpen}
        onOpenChange={(open) => {
          setUseModalOpen(open);
          if (!open) setUsePreselectedUser(null);
        }}
        onSuccess={fetchData}
        preselectedUser={usePreselectedUser}
      />
    </div>
  );
}
