'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Calendar, FolderKanban, User, FileText, ListTodo, Wallet, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSubmitArtistProposal } from '../hooks';
import type { ArtistProject, ArtistTask, ArtistSettlement, PartnerSettlement } from '../types';

const PROJECT_STATUS_STYLES: Record<string, string> = {
  '준비중': 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
  '기획중': 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
  '진행중': 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  '운영중': 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
  '완료': 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
};

const formatCurrency = (value: number) =>
  `₩ ${value.toLocaleString('ko-KR')}`;

interface ProjectDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ArtistProject | null;
  tasks: ArtistTask[];
  settlements: ArtistSettlement[];
  partnerSettlements: PartnerSettlement[];
  pmName?: string | null;
}

const PROPOSAL_STATUSES = ['준비중', '기획중'];
const RESPONSE_LABELS: Record<string, string> = {
  pending: '검토중',
  accepted: '수락',
  rejected: '거절',
};

export function ProjectDetailSheet({
  open,
  onOpenChange,
  project,
  tasks,
  settlements,
  partnerSettlements,
  pmName,
}: ProjectDetailSheetProps) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const submitProposal = useSubmitArtistProposal();

  if (!project) return null;

  const isProposal = PROPOSAL_STATUSES.includes(project.status);
  const relatedTasks = tasks.filter((t) => t.project_id === project.id);
  const relatedLegacySettlements = settlements.filter((s) => s.project_id === project.id);
  const relatedPartnerSettlements = partnerSettlements.filter(
    (ps) =>
      ps.partner_settlement_projects?.some((p) => p.project_id === project.id)
  );

  const handleResponse = (response: 'accept' | 'reject' | 'pending') => {
    setSubmitting(response);
    submitProposal.mutate(
      { project_id: project.id, response },
      {
        onSettled: () => setSubmitting(null),
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <FolderKanban className="h-5 w-5 text-blue-500" />
            {project.name}
          </SheetTitle>
          <SheetDescription className="text-left">
            프로젝트 상세 및 관련 할일·정산
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded px-2 py-0.5 text-xs font-semibold',
                PROJECT_STATUS_STYLES[project.status] ?? 'bg-slate-100 text-slate-700'
              )}
            >
              {project.status}
            </span>
            {project.category && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {project.category}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>
              {project.start_date ?? '미정'} ~ {project.end_date ?? '미정'}
            </span>
          </div>

          {pmName && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <User className="h-4 w-4 flex-shrink-0" />
              <span>담당 PM: {pmName}</span>
            </div>
          )}

          {isProposal && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                제안 응답
                {project.artist_response && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    ({RESPONSE_LABELS[project.artist_response] ?? project.artist_response})
                    {project.artist_responded_at &&
                      ` · ${format(new Date(project.artist_responded_at), 'yyyy.MM.dd HH:mm', { locale: ko })}`}
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!!submitting || project.artist_response === 'accepted'}
                  onClick={() => handleResponse('accept')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
                    'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
                    'hover:bg-emerald-200 dark:hover:bg-emerald-800/50 disabled:opacity-50'
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  수락
                </button>
                <button
                  type="button"
                  disabled={!!submitting || project.artist_response === 'rejected'}
                  onClick={() => handleResponse('reject')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
                    'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
                    'hover:bg-red-200 dark:hover:bg-red-800/50 disabled:opacity-50'
                  )}
                >
                  <XCircle className="h-4 w-4" />
                  거절
                </button>
                <button
                  type="button"
                  disabled={!!submitting || project.artist_response === 'pending'}
                  onClick={() => handleResponse('pending')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
                    'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
                    'hover:bg-amber-200 dark:hover:bg-amber-800/50 disabled:opacity-50'
                  )}
                >
                  <Clock className="h-4 w-4" />
                  검토중
                </button>
              </div>
            </div>
          )}

          {project.description && (
            <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                <FileText className="h-3 w-3" />
                설명
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {project.description}
              </p>
            </div>
          )}

          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
              <ListTodo className="h-4 w-4" />
              관련 할일 ({relatedTasks.length})
            </h4>
            {relatedTasks.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                이 프로젝트에 연결된 할일이 없습니다.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {relatedTasks.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {t.title}
                    </span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      {t.status} · {format(new Date(t.due_date), 'M/d', { locale: ko })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
              <Wallet className="h-4 w-4" />
              관련 정산
            </h4>
            {relatedLegacySettlements.length === 0 && relatedPartnerSettlements.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                이 프로젝트에 연결된 정산이 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {relatedLegacySettlements.map((s) => (
                  <li
                    key={`legacy-${s.id}`}
                    className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-sm flex justify-between items-center"
                  >
                    <span className="text-slate-800 dark:text-slate-200 truncate">
                      {s.name}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 font-medium flex-shrink-0 ml-2">
                      {formatCurrency(s.actual_amount ?? s.amount)}
                    </span>
                  </li>
                ))}
                {relatedPartnerSettlements.map((ps) => {
                  const projItem = ps.partner_settlement_projects?.find(
                    (p) => p.project_id === project.id
                  );
                  if (!projItem) return null;
                  return (
                    <li
                      key={`partner-${ps.id}-${project.id}`}
                      className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-sm flex justify-between items-center"
                    >
                      <span className="text-slate-600 dark:text-slate-300 text-xs">
                        {format(new Date(ps.period_start), 'yyyy.MM.dd', { locale: ko })} ~{' '}
                        {format(new Date(ps.period_end), 'yyyy.MM.dd', { locale: ko })}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium flex-shrink-0 ml-2">
                        {formatCurrency(projItem.partner_amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
