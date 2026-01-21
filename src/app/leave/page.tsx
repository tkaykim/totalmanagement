'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CalendarDays, 
  Plus, 
  Clock, 
  ArrowLeft, 
  History,
  RefreshCw,
  Settings
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaveBalanceCard } from '@/features/leave/components/LeaveBalanceCard';
import { LeaveRequestModal } from '@/features/leave/components/LeaveRequestModal';
import { LeaveRequestList } from '@/features/leave/components/LeaveRequestList';
import { CompensatoryRequestModal } from '@/features/leave/components/CompensatoryRequestModal';
import { LeaveHistory } from '@/features/leave/components/LeaveHistory';
import {
  getLeaveBalanceSummary,
  getLeaveRequests,
  getLeaveGrants,
  getCompensatoryRequests,
  cancelLeaveRequest,
} from '@/features/leave/api';
import type { 
  LeaveBalanceSummary, 
  LeaveRequestWithUser, 
  LeaveGrantWithUser,
  CompensatoryRequestWithUser 
} from '@/features/leave/types';

export default function LeavePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; bu_code: string | null } | null>(null);
  const [balanceSummary, setBalanceSummary] = useState<LeaveBalanceSummary>({
    annual: { total: 0, used: 0, remaining: 0 },
    compensatory: { total: 0, used: 0, remaining: 0 },
    special: { total: 0, used: 0, remaining: 0 },
  });
  const [requests, setRequests] = useState<LeaveRequestWithUser[]>([]);
  const [grants, setGrants] = useState<LeaveGrantWithUser[]>([]);
  const [compRequests, setCompRequests] = useState<CompensatoryRequestWithUser[]>([]);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [summary, requestsData, grantsData, compData] = await Promise.all([
        getLeaveBalanceSummary(),
        getLeaveRequests(),
        getLeaveGrants(),
        getCompensatoryRequests(),
      ]);

      setBalanceSummary(summary);
      setRequests(requestsData);
      setGrants(grantsData);
      setCompRequests(compData);
    } catch (error) {
      console.error('Failed to fetch leave data:', error);
    }
  }, []);

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
        .select('id, role, bu_code')
        .eq('id', user.id)
        .single();

      if (!appUser) {
        router.push('/login');
        return;
      }

      setCurrentUser(appUser);
      setLoading(false);
      await fetchData();
    };

    checkAuth();
  }, [router, fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCancelRequest = async (id: string) => {
    if (!confirm('휴가 신청을 취소하시겠습니까?')) return;

    try {
      await cancelLeaveRequest(id);
      await fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : '휴가 신청 취소에 실패했습니다.');
    }
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'leader';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-4 h-14 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-4 backdrop-blur">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          대시보드
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          {isAdmin && (
            <Link href="/leave/admin">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                관리
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {/* 모바일 헤더 */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-start justify-between gap-2 md:items-center">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                휴가 관리
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5 md:mt-1">
                연차, 대체휴무, 특별휴가 신청
              </p>
            </div>
            {/* 데스크톱 액션 버튼 */}
            <div className="hidden md:flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCompModalOpen(true)}
              >
                <Clock className="h-4 w-4 mr-2" />
                대체휴무 신청
              </Button>
              <Button onClick={() => setLeaveModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                휴가 신청
              </Button>
            </div>
          </div>
        </div>

        {/* Balance Cards */}
        <LeaveBalanceCard summary={balanceSummary} />

        {/* 모바일 액션 버튼 - FAB 스타일 */}
        <div className="md:hidden fixed bottom-4 right-4 z-30 flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCompModalOpen(true)}
            className="h-12 w-12 rounded-full p-0 shadow-lg bg-white dark:bg-slate-800 border-2"
          >
            <Clock className="h-5 w-5" />
          </Button>
          <Button
            size="sm"
            onClick={() => setLeaveModalOpen(true)}
            className="h-14 w-14 rounded-full p-0 shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="requests" className="mt-6 md:mt-8">
          {/* 모바일용 탭: 작고 컴팩트하게 */}
          <TabsList className="w-full md:w-auto grid grid-cols-3 md:flex h-auto p-1">
            <TabsTrigger 
              value="requests" 
              className="gap-1.5 py-2 px-2 md:px-4 text-xs md:text-sm"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">신청 내역</span>
              <span className="sm:hidden">신청</span>
            </TabsTrigger>
            <TabsTrigger 
              value="compensatory" 
              className="gap-1.5 py-2 px-2 md:px-4 text-xs md:text-sm"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">대체휴무</span>
              <span className="sm:hidden">대체</span>
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="gap-1.5 py-2 px-2 md:px-4 text-xs md:text-sm"
            >
              <History className="h-4 w-4" />
              이력
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            {/* 모바일: 카드 없이 직접 표시, 데스크톱: 카드로 감싸기 */}
            <div className="md:hidden">
              <LeaveRequestList
                requests={requests}
                onCancel={handleCancelRequest}
              />
            </div>
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle className="text-lg">휴가 사용 신청</CardTitle>
              </CardHeader>
              <CardContent>
                <LeaveRequestList
                  requests={requests}
                  onCancel={handleCancelRequest}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compensatory" className="mt-4">
            {/* 모바일: 직접 표시 */}
            <div className="md:hidden">
              {compRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">대체휴무 생성 신청 내역이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {compRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`p-3 rounded-xl border-l-4 ${
                        req.status === 'pending'
                          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                          : req.status === 'approved'
                          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-red-400 bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{req.days}일 신청</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              req.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                                : req.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                            }`}>
                              {req.status === 'pending' ? '대기' : req.status === 'approved' ? '승인' : '반려'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {req.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* 데스크톱: 카드 */}
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle className="text-lg">대체휴무 생성 신청</CardTitle>
              </CardHeader>
              <CardContent>
                {compRequests.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>대체휴무 생성 신청 내역이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {compRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{req.days}일 신청</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {req.reason}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            req.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {req.status === 'pending' ? '대기' : req.status === 'approved' ? '승인' : '반려'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {/* 모바일: 직접 표시 */}
            <div className="md:hidden">
              <LeaveHistory grants={grants} requests={requests} />
            </div>
            {/* 데스크톱: 카드 */}
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle className="text-lg">휴가 부여/사용 이력</CardTitle>
              </CardHeader>
              <CardContent>
                <LeaveHistory grants={grants} requests={requests} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 모바일에서 FAB 버튼 영역 확보 */}
        <div className="h-24 md:hidden" />
      </main>

      {/* Modals */}
      <LeaveRequestModal
        open={leaveModalOpen}
        onOpenChange={setLeaveModalOpen}
        onSuccess={fetchData}
        balanceSummary={balanceSummary}
      />

      <CompensatoryRequestModal
        open={compModalOpen}
        onOpenChange={setCompModalOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}
