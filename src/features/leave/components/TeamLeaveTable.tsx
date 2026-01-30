'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ArrowUpDown, ArrowUp, ArrowDown, UserX } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { TeamLeaveStats as TeamLeaveStatsType } from '../api';
import { formatLeaveDays } from '../lib/format-leave-days';

type SortKey = 'name' | 'hire_date';
type SortDir = 'asc' | 'desc';

interface TeamLeaveTableProps {
  stats: TeamLeaveStatsType[];
  onNoLeaveUsers?: () => void;
  onRefresh?: () => void;
  /** 이름 클릭 시 휴가 부여 모달 열기 (대상자 사전 지정) */
  onOpenGrantForUser?: (user: { id: string; name: string }) => void;
}

export function TeamLeaveTable({
  stats,
  onNoLeaveUsers,
  onRefresh,
  onOpenGrantForUser,
}: TeamLeaveTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showOnlyNoLeave, setShowOnlyNoLeave] = useState(false);

  const noLeaveUsers = useMemo(
    () =>
      stats.filter(
        (s) =>
          (s.total_generated ?? s.annual_total + s.compensatory_total + s.special_total) === 0
      ),
    [stats]
  );

  const displayStats = showOnlyNoLeave ? noLeaveUsers : stats;

  const sortedStats = useMemo(() => {
    const list = [...displayStats];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = (a.user_name ?? '').localeCompare(b.user_name ?? '');
      } else {
        const da = a.hire_date ? new Date(a.hire_date).getTime() : 0;
        const db = b.hire_date ? new Date(b.hire_date).getTime() : 0;
        cmp = da - db;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [displayStats, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleNoLeaveClick = () => {
    if (noLeaveUsers.length === 0) return;
    setShowOnlyNoLeave((prev) => !prev);
    onNoLeaveUsers?.();
  };

  return (
    <div className="space-y-4">
      <div className="w-full min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <Table className="w-full min-w-[1400px]">
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/80">
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap min-w-[140px]"
                onClick={() => toggleSort('name')}
              >
                <span className="inline-flex items-center gap-1">
                  이름
                  {sortKey === 'name' ? (
                    sortDir === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap min-w-[110px]"
                onClick={() => toggleSort('hire_date')}
              >
                <span className="inline-flex items-center gap-1">
                  입사일
                  {sortKey === 'hire_date' ? (
                    sortDir === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </span>
              </TableHead>
              <TableHead className="text-center whitespace-nowrap min-w-[100px]">올해 생성</TableHead>
              <TableHead className="text-center whitespace-nowrap min-w-[80px]" colSpan={3}>
                생성내역
              </TableHead>
              <TableHead className="text-center whitespace-nowrap min-w-[80px]" colSpan={9}>
                사용현황
              </TableHead>
              <TableHead className="text-center whitespace-nowrap min-w-[100px]">잔여</TableHead>
            </TableRow>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="min-w-[140px]" />
              <TableHead className="min-w-[110px]" />
              <TableHead className="min-w-[100px]" />
              <TableHead className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">
                정기
              </TableHead>
              <TableHead className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">
                포상
              </TableHead>
              <TableHead className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">
                기타
              </TableHead>
              <TableHead className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">
                연차
              </TableHead>
              <TableHead className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">
                월차
              </TableHead>
              <TableHead className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">
                경조사
              </TableHead>
              <TableHead className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">
                병가
              </TableHead>
              <TableHead className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">
                공가
              </TableHead>
              <TableHead className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">
                여름 휴가
              </TableHead>
              <TableHead className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">
                대체 휴가
              </TableHead>
              <TableHead className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">
                병원
              </TableHead>
              <TableHead className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">
                명절
              </TableHead>
              <TableHead className="min-w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStats.map((stat) => {
              const totalGen =
                stat.total_generated ??
                stat.annual_total + stat.compensatory_total + stat.special_total;
              const totalRem =
                stat.total_remaining ??
                stat.annual_remaining + stat.compensatory_remaining + stat.special_remaining;
              const shortId = stat.user_id.slice(0, 6);
              return (
                <TableRow key={stat.user_id}>
                  <TableCell className="font-medium whitespace-nowrap min-w-[140px]">
                    <button
                      type="button"
                      className="text-left underline-offset-4 hover:underline text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 rounded"
                      onClick={() => onOpenGrantForUser?.({ id: stat.user_id, name: stat.user_name ?? '' })}
                    >
                      {stat.user_name} ({shortId}…)
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-400 min-w-[110px]">
                    {stat.hire_date
                      ? format(new Date(stat.hire_date), 'yyyy-MM-dd')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap min-w-[100px]">
                    {formatLeaveDays(totalGen)}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap min-w-[80px]">
                    {formatLeaveDays(stat.grant_regular ?? 0)}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap min-w-[80px]">
                    {formatLeaveDays(stat.grant_reward ?? 0)}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap min-w-[80px]">
                    {formatLeaveDays(stat.grant_other ?? 0)}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap min-w-[80px]">
                    {formatLeaveDays(stat.usage_annual ?? stat.annual_used ?? 0)}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap min-w-[80px]">
                    {formatLeaveDays(stat.usage_monthly ?? 0)}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap min-w-[80px]">0일</TableCell>
                  <TableCell className="text-center whitespace-nowrap min-w-[80px]">0일</TableCell>
                  <TableCell className="text-center whitespace-nowrap min-w-[80px]">0일</TableCell>
                  <TableCell className="text-center whitespace-nowrap min-w-[80px]">0일</TableCell>
                  <TableCell className="text-center whitespace-nowrap min-w-[80px]">
                    {formatLeaveDays(stat.usage_compensatory ?? stat.compensatory_used ?? 0)}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap min-w-[80px]">0일</TableCell>
                  <TableCell className="text-center whitespace-nowrap min-w-[80px]">
                    {formatLeaveDays(stat.usage_special ?? stat.special_used ?? 0)}
                  </TableCell>
                  <TableCell className="text-center font-medium whitespace-nowrap min-w-[100px]">
                    {formatLeaveDays(totalRem)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          총 인원 : {stats.length}
          {showOnlyNoLeave && ` (휴가 미생성자 ${noLeaveUsers.length}명만 표시)`}
        </p>
        {noLeaveUsers.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-slate-600 dark:text-slate-400"
            onClick={handleNoLeaveClick}
          >
            <UserX className="h-4 w-4 mr-2" />
            {showOnlyNoLeave ? '전체 보기' : `휴가 미생성자 (${noLeaveUsers.length})`}
          </Button>
        )}
      </div>
    </div>
  );
}
