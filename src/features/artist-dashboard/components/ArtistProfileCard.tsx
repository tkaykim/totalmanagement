'use client';

import { differenceInCalendarDays, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { User, Calendar, Globe, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArtistProfile } from '../types';

function formatDday(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const days = differenceInCalendarDays(date, today);
  if (days < 0) return `만료 (${Math.abs(days)}일 경과)`;
  if (days === 0) return 'D-day';
  return `D-${days}`;
}

function ddayClassName(dateStr: string | null | undefined): string {
  if (!dateStr) return 'text-slate-500 dark:text-slate-400';
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const days = differenceInCalendarDays(date, today);
  if (days < 0) return 'text-red-600 dark:text-red-400 font-semibold';
  if (days <= 30) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-slate-600 dark:text-slate-300';
}

interface ArtistProfileCardProps {
  profile: ArtistProfile | null | undefined;
  isLoading?: boolean;
}

export function ArtistProfileCard({ profile, isLoading }: ArtistProfileCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const displayName =
    profile.display_name || profile.name_ko || profile.name_en || '아티스트';
  const subName = [profile.name_ko, profile.name_en]
    .filter(Boolean)
    .filter((n) => n !== displayName)[0];

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt=""
              className="h-14 w-14 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
              <User className="h-7 w-7" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {displayName}
            </h2>
            {subName && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {subName}
              </p>
            )}
            {profile.nationality && (
              <p className="flex items-center gap-1 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                <Globe className="h-3 w-3" />
                {profile.nationality}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 sm:gap-6 text-sm border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-700 pt-4 sm:pt-0 sm:pl-6">
          {(profile.contract_start != null || profile.contract_end != null) && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                <Calendar className="h-3.5 w-3.5" />
                계약 기간
              </p>
              <p className="text-slate-800 dark:text-slate-200">
                {profile.contract_start
                  ? format(new Date(profile.contract_start), 'yyyy.MM.dd', { locale: ko })
                  : '?'}{' '}
                ~{' '}
                {profile.contract_end
                  ? format(new Date(profile.contract_end), 'yyyy.MM.dd', { locale: ko })
                  : '?'}
              </p>
              {profile.contract_end && (
                <p className={cn('text-xs mt-0.5', ddayClassName(profile.contract_end))}>
                  {formatDday(profile.contract_end)}
                </p>
              )}
            </div>
          )}

          {(profile.visa_type != null || profile.visa_expiry != null) && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                비자
              </p>
              <p className="text-slate-800 dark:text-slate-200">
                {profile.visa_type ?? '-'}{' '}
                {profile.visa_expiry &&
                  `(${format(new Date(profile.visa_expiry), 'yyyy.MM.dd', { locale: ko })})`}
              </p>
              {profile.visa_expiry && (
                <p className={cn('text-xs mt-0.5', ddayClassName(profile.visa_expiry))}>
                  {formatDday(profile.visa_expiry)}
                </p>
              )}
            </div>
          )}

          {profile.job_titles && profile.job_titles.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                <Briefcase className="h-3.5 w-3.5" />
                분류
              </p>
              <p className="text-slate-800 dark:text-slate-200">
                {profile.job_titles.join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
