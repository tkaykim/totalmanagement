'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarPlus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { LeaveGrantWithUser, LeaveRequestWithUser } from '../types';
import { LEAVE_TYPE_LABELS, LEAVE_GRANT_TYPE_LABELS, LEAVE_REQUEST_TYPE_LABELS } from '../types';

interface LeaveHistoryProps {
  grants: LeaveGrantWithUser[];
  requests: LeaveRequestWithUser[];
  isLoading?: boolean;
}

type HistoryItem = {
  id: string | number;
  type: 'grant' | 'use';
  date: string;
  leaveType: string;
  days: number;
  description: string;
};

export function LeaveHistory({ grants, requests, isLoading }: LeaveHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // 부여와 사용 내역을 통합하여 정렬
  const history: HistoryItem[] = [];

  for (const grant of grants) {
    history.push({
      id: `grant-${grant.id}`,
      type: 'grant',
      date: grant.granted_at,
      leaveType: LEAVE_TYPE_LABELS[grant.leave_type],
      days: grant.days,
      description: `${LEAVE_GRANT_TYPE_LABELS[grant.grant_type]}${grant.reason ? ` - ${grant.reason}` : ''}`,
    });
  }

  for (const request of requests.filter(r => r.status === 'approved')) {
    history.push({
      id: `use-${request.id}`,
      type: 'use',
      date: request.approved_at || request.created_at,
      leaveType: LEAVE_REQUEST_TYPE_LABELS[request.leave_type],
      days: request.days_used,
      description: request.reason,
    });
  }

  // 날짜 기준 내림차순 정렬
  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <CalendarPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>휴가 이력이 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      {/* 모바일: 카드 레이아웃 */}
      <div className="md:hidden space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            className={`p-3 rounded-xl border-l-4 ${
              item.type === 'grant'
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* 상단: 구분 + 유형 + 일수 */}
                <div className="flex items-center gap-2 flex-wrap">
                  {item.type === 'grant' ? (
                    <span className="inline-flex items-center text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <ArrowDownLeft className="h-3 w-3 mr-0.5" />
                      부여
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium text-blue-700 dark:text-blue-400">
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      사용
                    </span>
                  )}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {item.leaveType}
                  </Badge>
                </div>

                {/* 내용 */}
                {item.description && (
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1.5 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>

              {/* 일수 */}
              <div className={`text-right shrink-0 ${
                item.type === 'grant' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
              }`}>
                <span className="text-lg font-bold">
                  {item.type === 'grant' ? '+' : '-'}{item.days}
                </span>
                <span className="text-xs ml-0.5">일</span>
              </div>
            </div>

            {/* 날짜 */}
            <p className="text-[10px] text-slate-400 mt-2">
              {format(new Date(item.date), 'yyyy년 M월 d일', { locale: ko })}
            </p>
          </div>
        ))}
      </div>

      {/* 데스크톱: 테이블 레이아웃 */}
      <div className="hidden md:block rounded-lg border dark:border-slate-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800">
              <TableHead className="w-[100px]">구분</TableHead>
              <TableHead>날짜</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>일수</TableHead>
              <TableHead>내용</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.type === 'grant' ? (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <ArrowDownLeft className="h-3 w-3 mr-1" />
                      부여
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      사용
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-slate-500 dark:text-slate-400">
                  {format(new Date(item.date), 'yyyy.M.d', { locale: ko })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{item.leaveType}</Badge>
                </TableCell>
                <TableCell className={item.type === 'grant' ? 'text-emerald-600' : 'text-blue-600'}>
                  {item.type === 'grant' ? '+' : '-'}{item.days}일
                </TableCell>
                <TableCell className="max-w-[300px] truncate" title={item.description}>
                  {item.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
