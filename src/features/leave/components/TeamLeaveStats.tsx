'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Pencil } from 'lucide-react';
import type { TeamLeaveStats as TeamLeaveStatsType } from '../api';
import { UserHireDateModal } from './UserHireDateModal';

const BU_DISPLAY_NAMES: Record<string, string> = {
  HEAD: '본사',
  GRIGO: '그리고엔터',
  FLOW: '플로우메이커',
  REACT: '리액트스튜디오',
  MODOO: '모두굿즈',
  AST: '아스트컴퍼니',
};

interface TeamLeaveStatsProps {
  stats: TeamLeaveStatsType[];
  isLoading?: boolean;
  onRefresh?: () => void;
  showHireDateEdit?: boolean;
}

export function TeamLeaveStats({ stats, isLoading, onRefresh, showHireDateEdit = true }: TeamLeaveStatsProps) {
  const [editingUser, setEditingUser] = useState<{
    id: string;
    name: string;
    hire_date: string | null;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>표시할 팀원이 없습니다.</p>
      </div>
    );
  }

  const handleHireDateSuccess = () => {
    setEditingUser(null);
    onRefresh?.();
  };

  return (
    <>
      <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800">
              <TableHead>이름</TableHead>
              <TableHead>사업부</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>입사일</span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col">
                  <span>연차</span>
                  <span className="text-xs text-slate-400">(잔여/총)</span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col">
                  <span>대체휴무</span>
                  <span className="text-xs text-slate-400">(잔여/총)</span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col">
                  <span>특별휴가</span>
                  <span className="text-xs text-slate-400">(잔여/총)</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((stat) => (
              <TableRow key={stat.user_id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{stat.user_name}</p>
                    {stat.position && (
                      <p className="text-xs text-slate-500">{stat.position}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {stat.bu_code ? (
                    <Badge variant="outline">{BU_DISPLAY_NAMES[stat.bu_code] || stat.bu_code}</Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {stat.hire_date ? (
                      <span className="text-sm">
                        {format(new Date(stat.hire_date), 'yyyy.MM.dd')}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">미설정</span>
                    )}
                    {showHireDateEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setEditingUser({
                          id: stat.user_id,
                          name: stat.user_name,
                          hire_date: stat.hire_date,
                        })}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className={stat.annual_remaining <= 0 ? 'text-red-500' : 'text-emerald-600'}>
                    {stat.annual_remaining}
                  </span>
                  <span className="text-slate-400">/{stat.annual_total}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={stat.compensatory_remaining <= 0 ? 'text-slate-400' : 'text-emerald-600'}>
                    {stat.compensatory_remaining}
                  </span>
                  <span className="text-slate-400">/{stat.compensatory_total}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={stat.special_remaining <= 0 ? 'text-slate-400' : 'text-purple-600'}>
                    {stat.special_remaining}
                  </span>
                  <span className="text-slate-400">/{stat.special_total}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingUser && (
        <UserHireDateModal
          open={true}
          onOpenChange={(open) => !open && setEditingUser(null)}
          userId={editingUser.id}
          userName={editingUser.name}
          currentHireDate={editingUser.hire_date}
          onSuccess={handleHireDateSuccess}
        />
      )}
    </>
  );
}
