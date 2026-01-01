'use client';

import { User, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Artist } from '@/types/database';

interface ArtistProfileCardProps {
  artist: Artist;
  visaStatus: {
    start: string;
    end: string;
    daysRemaining: number;
    isExpired: boolean;
    isExpiringSoon: boolean;
  } | null;
}

export function ArtistProfileCard({ artist, visaStatus }: ArtistProfileCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4 sm:p-6">
      <div className="flex items-start gap-4 sm:gap-6">
        <div className="flex-shrink-0">
          <div className="h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <User className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{artist.name}</h1>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                타입
              </p>
              <p className="text-sm text-slate-900 dark:text-slate-100">{artist.type === 'individual' ? '개인' : '팀'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                상태
              </p>
              <span
                className={cn(
                  'inline-block px-2 py-1 rounded text-xs font-semibold',
                  artist.status === 'Active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                )}
              >
                {artist.status}
              </span>
            </div>
            {artist.role && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  역할
                </p>
                <p className="text-sm text-slate-900 dark:text-slate-100">{artist.role}</p>
              </div>
            )}
            {artist.nationality && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  국적
                </p>
                <p className="text-sm text-slate-900 dark:text-slate-100">{artist.nationality}</p>
              </div>
            )}
          </div>

          {/* 비자 기간 정보 */}
          {visaStatus && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  비자 기간
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">시작일</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {format(parseISO(visaStatus.start), 'yyyy-MM-dd', { locale: ko })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">만료일</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {format(parseISO(visaStatus.end), 'yyyy-MM-dd', { locale: ko })}
                  </p>
                </div>
                <div className="ml-auto">
                  {visaStatus.isExpired ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs font-semibold">
                      <AlertTriangle className="h-3 w-3" />
                      만료됨
                    </span>
                  ) : visaStatus.isExpiringSoon ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 text-xs font-semibold">
                      <AlertTriangle className="h-3 w-3" />
                      {visaStatus.daysRemaining}일 후 만료
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs font-semibold">
                      <CheckCircle2 className="h-3 w-3" />
                      {visaStatus.daysRemaining}일 남음
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

