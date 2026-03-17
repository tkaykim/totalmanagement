'use client';

import { X, Pencil, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BU, Project } from '../types';

const BU_TITLES: Record<BU, string> = {
  GRIGO: '그리고 엔터',
  REACT: '리액트 스튜디오',
  FLOW: '플로우메이커',
  AST: '아스트 컴퍼니',
  MODOO: '모두굿즈',
  HEAD: '본사',
};

const STATUS_COLORS: Record<string, string> = {
  '준비중': 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  '기획중': 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
  '진행중': 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  '운영중': 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
  '보류': 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
  '완료': 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
};

interface ProjectDetailHeaderProps {
  project: Project;
  taskCount: number;
  usersData?: { users: any[]; currentUser: any };
  partnerWorkersData?: any[];
  partnerCompaniesData?: any[];
  onEdit: () => void;
  onClose: () => void;
  onStatusChange?: (status: string) => void;
}

function resolvePmName(pmId: string | null | undefined, usersData?: { users: any[] }): string {
  if (!pmId) return '미지정';
  const pm = usersData?.users?.find((u: any) => u.id === pmId);
  return pm?.name || '미지정';
}

function resolveParticipantNames(
  participants: Project['participants'],
  usersData?: { users: any[] },
  partnerWorkersData?: any[],
  partnerCompaniesData?: any[],
): string[] {
  if (!participants || participants.length === 0) return [];
  return participants
    .map((p) => {
      if (p.user_id) {
        return usersData?.users?.find((u: any) => u.id === p.user_id)?.name || null;
      }
      if (p.partner_worker_id) {
        const w = partnerWorkersData?.find((w: any) => w.id === p.partner_worker_id);
        return w?.name_ko || w?.name_en || w?.name || null;
      }
      if (p.partner_company_id) {
        const c = partnerCompaniesData?.find((c: any) => c.id === p.partner_company_id);
        return c?.company_name_ko || c?.company_name_en || null;
      }
      return null;
    })
    .filter((name): name is string => name !== null);
}

export function ProjectDetailHeader({
  project,
  taskCount,
  usersData,
  partnerWorkersData,
  partnerCompaniesData,
  onEdit,
  onClose,
  onStatusChange,
}: ProjectDetailHeaderProps) {
  const pmName = resolvePmName(project.pm_id, usersData);
  const participantNames = resolveParticipantNames(
    project.participants,
    usersData,
    partnerWorkersData,
    partnerCompaniesData,
  );

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-700 dark:to-blue-600 px-4 sm:px-6 py-4 text-white shadow-lg">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] sm:text-xs font-bold backdrop-blur-sm whitespace-nowrap">
            {BU_TITLES[project.bu]}
          </span>
          <h2 className="text-base sm:text-lg font-bold truncate">{project.name}</h2>
          <span className="rounded-full bg-emerald-400/30 px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold whitespace-nowrap">
            할일 {taskCount}개
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-white/80">
          {onStatusChange ? (
            <div className="relative inline-flex items-center">
              <select
                value={project.status}
                onChange={(e) => onStatusChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'appearance-none rounded-md px-2 py-0.5 pr-5 text-[10px] sm:text-xs font-semibold cursor-pointer border-0 outline-none',
                  STATUS_COLORS[project.status] || 'bg-slate-100 text-slate-600',
                )}
              >
                {Object.keys(STATUS_COLORS).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1 h-2.5 w-2.5 pointer-events-none opacity-60" />
            </div>
          ) : (
            <span className={cn('rounded-md px-2 py-0.5 text-[10px] sm:text-xs font-semibold', STATUS_COLORS[project.status] || 'bg-slate-100 text-slate-600')}>
              {project.status}
            </span>
          )}
          <span className="text-white/50">|</span>
          <span className="font-medium">
            PM: <span className="text-white">{pmName}</span>
          </span>
          {participantNames.length > 0 && (
            <>
              <span className="text-white/50">|</span>
              <span className="font-medium truncate max-w-[200px] sm:max-w-[350px]">
                참여: <span className="text-white">{participantNames.join(', ')}</span>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
        <button
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25 backdrop-blur-sm"
          title="프로젝트 수정"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25 backdrop-blur-sm"
          title="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
