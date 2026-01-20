'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  CalendarDays, 
  Plus, 
  Clock, 
  History,
  RefreshCw,
  Settings
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaveBalanceCard } from './LeaveBalanceCard';
import { LeaveRequestModal } from './LeaveRequestModal';
import { LeaveRequestList } from './LeaveRequestList';
import { CompensatoryRequestModal } from './CompensatoryRequestModal';
import { LeaveHistory } from './LeaveHistory';
import {
  getLeaveBalanceSummary,
  getLeaveRequests,
  getLeaveGrants,
  getCompensatoryRequests,
  cancelLeaveRequest,
} from '../api';
import type { 
  LeaveBalanceSummary, 
  LeaveRequestWithUser, 
  LeaveGrantWithUser,
  CompensatoryRequestWithUser 
} from '../types';

interface LeaveManagementViewProps {
  onNavigateToAdmin?: () => void;
}

export function LeaveManagementView({ onNavigateToAdmin }: LeaveManagementViewProps) {
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
  const [activeTab, setActiveTab] = useState<'requests' | 'compensatory' | 'history'>('requests');

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

      if (user) {
        const { data: appUser } = await supabase
          .from('app_users')
          .select('id, role, bu_code')
          .eq('id', user.id)
          .single();

        if (appUser) {
          setCurrentUser(appUser);
        }
      }
      setLoading(false);
      await fetchData();
    };

    checkAuth();
  }, [fetchData]);

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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            휴가 관리
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            연차, 대체휴무, 특별휴가를 신청하고 관리하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          {isAdmin && onNavigateToAdmin && (
            <Button variant="outline" size="sm" onClick={onNavigateToAdmin}>
              <Settings className="h-4 w-4 mr-2" />
              관리
            </Button>
          )}
        </div>
      </div>

      {/* Balance Cards */}
      <LeaveBalanceCard summary={balanceSummary} />

      {/* Action Buttons */}
      <div className="flex gap-2 mt-6">
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

      {/* Tab Buttons */}
      <div className="flex gap-2 mt-6 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            activeTab === 'requests'
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          신청 내역
        </button>
        <button
          onClick={() => setActiveTab('compensatory')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            activeTab === 'compensatory'
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          대체휴무 신청
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            activeTab === 'history'
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <History className="h-4 w-4" />
          이력
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'requests' && (
          <Card>
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
        )}

        {activeTab === 'compensatory' && (
          <Card>
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
        )}

        {activeTab === 'history' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">휴가 부여/사용 이력</CardTitle>
            </CardHeader>
            <CardContent>
              <LeaveHistory grants={grants} requests={requests} />
            </CardContent>
          </Card>
        )}
      </div>

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
