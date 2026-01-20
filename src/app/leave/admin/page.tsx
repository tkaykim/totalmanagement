'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  RefreshCw,
  Gift,
  Users,
  CheckSquare,
  Calendar,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LeaveApprovalQueue } from '@/features/leave/components/LeaveApprovalQueue';
import { AdminLeaveGrant } from '@/features/leave/components/AdminLeaveGrant';
import { TeamLeaveStats } from '@/features/leave/components/TeamLeaveStats';
import { LeaveRequestList } from '@/features/leave/components/LeaveRequestList';
import {
  getPendingApprovals,
  getTeamLeaveStats,
  getLeaveRequests,
} from '@/features/leave/api';
import type { PendingApprovalItem, TeamLeaveStats as TeamLeaveStatsType } from '@/features/leave/api';
import type { LeaveRequestWithUser } from '@/features/leave/types';

const BU_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'HEAD', label: '본사' },
  { value: 'GRIGO', label: '그리고엔터' },
  { value: 'FLOW', label: '플로우메이커' },
  { value: 'REACT', label: '리액트스튜디오' },
  { value: 'MODOO', label: '모두굿즈' },
  { value: 'AST', label: '아스트컴퍼니' },
];

export default function LeaveAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ role: string; bu_code: string | null } | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingApprovalItem[]>([]);
  const [teamStats, setTeamStats] = useState<TeamLeaveStatsType[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequestWithUser[]>([]);
  const [selectedBu, setSelectedBu] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [grantModalOpen, setGrantModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [pending, stats, requests] = await Promise.all([
        getPendingApprovals(),
        getTeamLeaveStats({ bu_code: selectedBu !== 'all' ? selectedBu : undefined }),
        getLeaveRequests(),
      ]);

      setPendingItems(pending);
      setTeamStats(stats);
      setAllRequests(requests);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    }
  }, [selectedBu]);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: appUser } = await supabase
        .from('app_users')
        .select('role, bu_code')
        .eq('id', user.id)
        .single();

      if (!appUser || !['admin', 'leader'].includes(appUser.role)) {
        router.push('/leave');
        return;
      }

      setCurrentUser(appUser);
      setAuthorized(true);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (authorized) {
      fetchData();
    }
  }, [authorized, fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const isHeadAdmin = currentUser?.role === 'admin' && currentUser?.bu_code === 'HEAD';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            접근 권한이 없습니다
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            관리자만 접근할 수 있는 페이지입니다.
          </p>
          <Link
            href="/leave"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-4 h-14 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-4 backdrop-blur">
        <Link
          href="/leave"
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          휴가 관리
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50">
          <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
            {isHeadAdmin ? '관리자' : '팀 관리자'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              휴가 관리 (관리자)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              휴가 신청 승인, 휴가 부여, 팀원 현황을 관리합니다.
            </p>
          </div>
          {isHeadAdmin && (
            <Button onClick={() => setGrantModalOpen(true)}>
              <Gift className="h-4 w-4 mr-2" />
              휴가 부여
            </Button>
          )}
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

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              승인 대기
              {pendingItems.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                  {pendingItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              팀원 현황
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Calendar className="h-4 w-4" />
              전체 신청
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
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
          </TabsContent>

          <TabsContent value="team" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">팀원 휴가 현황</CardTitle>
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
              <CardContent>
                <TeamLeaveStats stats={teamStats} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">전체 휴가 신청</CardTitle>
              </CardHeader>
              <CardContent>
                <LeaveRequestList
                  requests={allRequests}
                  showRequester
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <AdminLeaveGrant
        open={grantModalOpen}
        onOpenChange={setGrantModalOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}
