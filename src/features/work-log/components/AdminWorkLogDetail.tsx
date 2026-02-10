'use client';

import { format, subDays, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  History,
  FileText,
  BarChart3,
  User,
} from 'lucide-react';
import {
  useAdminUserWorkLog,
  useAdminActivityLogs,
  useAdminAttendanceLogs,
} from '../hooks';
import { ActivityTimeline } from './ActivityTimeline';
import { DailySummary } from './DailySummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AdminWorkLogDetailProps {
  userId: string;
  date: string;
  onBack: () => void;
  onDateChange: (date: string) => void;
}

export function AdminWorkLogDetail({ userId, date, onBack, onDateChange }: AdminWorkLogDetailProps) {
  const { data: detail, isLoading: detailLoading } = useAdminUserWorkLog(userId, date);
  const { data: activities = [], isLoading: activitiesLoading } = useAdminActivityLogs(userId, date);
  const { data: attendanceLogs = [], isLoading: attendanceLoading } = useAdminAttendanceLogs(userId, date);

  const isToday = date === format(new Date(), 'yyyy-MM-dd');
  const displayDate = format(new Date(date), "M'월' d'일'", { locale: ko });
  const displayDay = format(new Date(date), 'EEEE', { locale: ko });

  const handlePrevDay = () => {
    onDateChange(format(subDays(new Date(date), 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    onDateChange(format(addDays(new Date(date), 1), 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    onDateChange(format(new Date(), 'yyyy-MM-dd'));
  };

  const user = detail?.user;
  const workLog = detail?.work_log;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 사용자 정보 헤더 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              {detailLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-5 bg-muted rounded w-24" />
                  <div className="h-3 bg-muted rounded w-36" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{user?.name || user?.email || '사용자'}</h2>
                    {user?.bu_code && (
                      <Badge variant="outline">{user.bu_code}</Badge>
                    )}
                    {user?.role && (
                      <Badge variant="secondary" className="text-xs">{user.role}</Badge>
                    )}
                  </div>
                  {user?.position && (
                    <p className="text-sm text-muted-foreground">{user.position}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 날짜 네비게이션 */}
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

      {/* 해당일 요약 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            {displayDate}{" 요약"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DailySummary
            activities={activities}
            attendanceLogs={attendanceLogs}
            isLoading={activitiesLoading || attendanceLoading}
          />
        </CardContent>
      </Card>

      {/* 업무일지 + 활동 타임라인 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 업무 일지 (읽기 전용) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {"업무 일지"}
              {workLog ? (
                <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
                  {"제출됨"}
                </Badge>
              ) : (
                <Badge variant="outline" className="ml-auto text-red-600 border-red-300">
                  {"미제출"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {detailLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-28 bg-muted rounded-lg" />
                <div className="h-24 bg-muted rounded-lg" />
                <div className="h-24 bg-muted rounded-lg" />
              </div>
            ) : workLog ? (
              <ReadOnlyWorkLog workLog={workLog} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">
                  {"이 날짜에 작성된 업무일지가 없습니다"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 활동 타임라인 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-muted-foreground" />
              {"활동 타임라인"}
              {activities.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {activities.length}{"건"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-[500px] overflow-y-auto pr-1 -mr-1">
              <ActivityTimeline activities={activities} isLoading={activitiesLoading} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ReadOnlyWorkLogProps {
  workLog: {
    summary: string | null;
    notes: string | null;
    tomorrow_plan: string | null;
    updated_at: string;
  };
}

function ReadOnlyWorkLog({ workLog }: ReadOnlyWorkLogProps) {
  return (
    <div className="space-y-5">
      {/* 오늘 업무 요약 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{"오늘 업무 요약"}</label>
        <div className="rounded-lg border bg-muted/30 p-3 min-h-[80px]">
          {workLog.summary ? (
            <p className="text-sm whitespace-pre-wrap">{workLog.summary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{"작성된 내용이 없습니다"}</p>
          )}
        </div>
      </div>

      {/* 특이사항 / 메모 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{"특이사항 / 메모"}</label>
        <div className="rounded-lg border bg-muted/30 p-3 min-h-[60px]">
          {workLog.notes ? (
            <p className="text-sm whitespace-pre-wrap">{workLog.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{"작성된 내용이 없습니다"}</p>
          )}
        </div>
      </div>

      {/* 내일 할 일 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{"내일 할 일"}</label>
        <div className="rounded-lg border bg-muted/30 p-3 min-h-[60px]">
          {workLog.tomorrow_plan ? (
            <p className="text-sm whitespace-pre-wrap">{workLog.tomorrow_plan}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{"작성된 내용이 없습니다"}</p>
          )}
        </div>
      </div>

      {/* 마지막 수정 시간 */}
      <p className="text-center text-xs text-muted-foreground">
        {"마지막 저장: "}{new Date(workLog.updated_at).toLocaleString('ko-KR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  );
}
