'use client';

import { useState } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  History,
  FileText,
  BarChart3
} from 'lucide-react';
import { useActivityLogs, useWorkLog, useSaveWorkLog } from '../hooks';
import { ActivityTimeline } from './ActivityTimeline';
import { WorkLogForm } from './WorkLogForm';
import { DailySummary } from './DailySummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function WorkLogView() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'timeline' | 'form'>('timeline');
  
  const { data: activities = [], isLoading: activitiesLoading } = useActivityLogs(selectedDate);
  const { data: workLog, isLoading: workLogLoading } = useWorkLog(selectedDate);
  const saveWorkLogMutation = useSaveWorkLog();

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
  const displayDate = format(new Date(selectedDate), 'M월 d일', { locale: ko });
  const displayDay = format(new Date(selectedDate), 'EEEE', { locale: ko });

  const handlePrevDay = () => {
    setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSaveWorkLog = async (data: { log_date?: string; summary?: string; notes?: string; tomorrow_plan?: string }) => {
    await saveWorkLogMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 날짜 네비게이션 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevDay}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-center flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">
                  {displayDate}
                  <span className="text-muted-foreground font-normal ml-2">
                    {displayDay}
                  </span>
                </h2>
              </div>
              {isToday && (
                <Badge variant="secondary">오늘</Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isToday && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                >
                  오늘
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextDay}
                className="h-9 w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 오늘의 요약 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            오늘의 요약
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DailySummary activities={activities} isLoading={activitiesLoading} />
        </CardContent>
      </Card>

      {/* 모바일 탭 네비게이션 */}
      <div className="flex gap-2 lg:hidden">
        <Button
          variant={activeTab === 'timeline' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => setActiveTab('timeline')}
        >
          <History className="h-4 w-4 mr-2" />
          활동 타임라인
        </Button>
        <Button
          variant={activeTab === 'form' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => setActiveTab('form')}
        >
          <FileText className="h-4 w-4 mr-2" />
          업무 일지
        </Button>
      </div>

      {/* 데스크탑: 그리드 레이아웃, 모바일: 탭 기반 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 활동 타임라인 */}
        <Card className={cn('lg:block', activeTab !== 'timeline' && 'hidden')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-muted-foreground" />
              활동 타임라인
              {activities.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {activities.length}건
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

        {/* 업무 일지 작성 */}
        <Card className={cn('lg:block', activeTab !== 'form' && 'hidden')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              업무 일지
              {workLog && (
                <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
                  저장됨
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {workLogLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-28 bg-muted rounded-lg" />
                <div className="h-24 bg-muted rounded-lg" />
                <div className="h-24 bg-muted rounded-lg" />
              </div>
            ) : (
              <WorkLogForm
                workLog={workLog}
                onSave={handleSaveWorkLog}
                isSaving={saveWorkLogMutation.isPending}
                selectedDate={selectedDate}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
