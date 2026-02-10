'use client';

import { useState, useMemo } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  ClipboardList,
  ArrowLeft,
} from 'lucide-react';
import { useAdminWorkLogOverview } from '../hooks';
import { AdminWorkLogDetail } from './AdminWorkLogDetail';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AdminWorkLogUserStatus } from '../types';

type FilterType = 'all' | 'submitted' | 'not_submitted';
type BuFilter = 'all' | string;

export function AdminWorkLogView() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [buFilter, setBuFilter] = useState<BuFilter>('all');

  const { data: overview, isLoading } = useAdminWorkLogOverview(selectedDate);

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
  const displayDate = format(new Date(selectedDate), "M'월' d'일'", { locale: ko });
  const displayDay = format(new Date(selectedDate), 'EEEE', { locale: ko });

  const buCodes = useMemo(() => {
    if (!overview?.users) return [];
    const codes = new Set(
      overview.users
        .map(u => u.user.bu_code)
        .filter((code): code is string => !!code)
    );
    return Array.from(codes).sort();
  }, [overview?.users]);

  const filteredUsers = useMemo(() => {
    if (!overview?.users) return [];

    return overview.users.filter(item => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = item.user.name?.toLowerCase().includes(query);
        const matchEmail = item.user.email?.toLowerCase().includes(query);
        if (!matchName && !matchEmail) return false;
      }

      if (filterType === 'submitted' && !item.has_submitted) return false;
      if (filterType === 'not_submitted' && item.has_submitted) return false;

      if (buFilter !== 'all' && item.user.bu_code !== buFilter) return false;

      return true;
    });
  }, [overview?.users, searchQuery, filterType, buFilter]);

  const handlePrevDay = () => {
    setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  if (selectedUserId) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Button
          variant="ghost"
          onClick={() => setSelectedUserId(null)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {"목록으로 돌아가기"}
        </Button>
        <AdminWorkLogDetail
          userId={selectedUserId}
          date={selectedDate}
          onBack={() => setSelectedUserId(null)}
          onDateChange={setSelectedDate}
        />
      </div>
    );
  }

  const submittedCount = overview?.submitted_count ?? 0;
  const totalUsers = overview?.total_users ?? 0;
  const submissionRate = totalUsers > 0 ? Math.round((submittedCount / totalUsers) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={handlePrevDay} className="h-9 w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-center flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">
                  {displayDate}
                  <span className="text-muted-foreground font-normal ml-2">{displayDay}</span>
                </h2>
              </div>
              {isToday && <Badge variant="secondary">{"오늘"}</Badge>}
            </div>

            <div className="flex items-center gap-2">
              {!isToday && (
                <Button variant="outline" size="sm" onClick={handleToday}>
                  {"오늘"}
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={handleNextDay} className="h-9 w-9">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">{"전체 인원"}</span>
            </div>
            <span className="text-xl font-semibold">{totalUsers}{"명"}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium">{"제출 완료"}</span>
            </div>
            <span className="text-xl font-semibold text-green-600">{submittedCount}{"명"}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium">{"미제출"}</span>
            </div>
            <span className="text-xl font-semibold text-red-600">{totalUsers - submittedCount}{"명"}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <ClipboardList className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium">{"제출률"}</span>
            </div>
            <span className="text-xl font-semibold text-blue-600">{submissionRate}%</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름 또는 이메일로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-1">
              {([
                { value: 'all' as FilterType, label: '전체' },
                { value: 'submitted' as FilterType, label: '제출' },
                { value: 'not_submitted' as FilterType, label: '미제출' },
              ]).map(item => (
                <Button
                  key={item.value}
                  variant={filterType === item.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            {buCodes.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                <Button
                  variant={buFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBuFilter('all')}
                >
                  {"전체 BU"}
                </Button>
                {buCodes.map(code => (
                  <Button
                    key={code}
                    variant={buFilter === code ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBuFilter(code)}
                  >
                    {code}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" />
            {"인원별 업무일지 현황"}
            <Badge variant="secondary" className="ml-auto">
              {filteredUsers.length}{"명"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-3 bg-muted rounded w-32" />
                  </div>
                  <div className="h-6 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{"해당하는 인원이 없습니다"}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredUsers.map(item => (
                <UserRow
                  key={item.user.id}
                  item={item}
                  onClick={() => setSelectedUserId(item.user.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({ item, onClick }: { item: AdminWorkLogUserStatus; onClick: () => void }) {
  const { user, has_submitted, work_log } = item;

  const initials = (user.name || user.email || '?')
    .split(' ')
    .map(s => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors text-left"
    >
      <div className={cn(
        'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold',
        has_submitted
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      )}>
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{user.name || user.email}</span>
          {user.bu_code && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 flex-shrink-0">
              {user.bu_code}
            </Badge>
          )}
          {user.position && (
            <span className="text-xs text-muted-foreground hidden sm:inline">{user.position}</span>
          )}
        </div>
        {has_submitted && work_log?.summary && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {work_log.summary}
          </p>
        )}
      </div>

      <div className="flex-shrink-0">
        {has_submitted ? (
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {"제출"}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20">
            <XCircle className="h-3 w-3 mr-1" />
            {"미제출"}
          </Badge>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}
