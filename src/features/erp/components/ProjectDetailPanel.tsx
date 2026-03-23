'use client';

import { useEffect, useRef, useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import type { Project, TaskItem, FinancialEntry } from '../types';
import type { AppUser, Project as DbProject } from '@/types/database';
import { checkFinancePermission } from '@/features/erp/lib/financePermissions';
import { ProjectDetailHeader } from './ProjectDetailHeader';
import { ProjectDetailInfo } from './ProjectDetailInfo';
import { ProjectDetailTasks } from './ProjectDetailTasks';
import { ProjectDetailActions } from './ProjectDetailActions';
import { ProjectDetailFinance } from './ProjectDetailFinance';
import { CommentSection } from '@/features/comments/components/CommentSection';

type FinancePermissionLevel = 'none' | 'view' | 'edit';

interface ProjectDetailPanelProps {
  project: Project;
  tasks: TaskItem[];
  financeData?: FinancialEntry[];
  usersData?: { users: any[]; currentUser: any };
  partnerWorkersData?: any[];
  partnerCompaniesData?: any[];
  onClose: () => void;
  onEdit: () => void;
  onStatusChange?: (status: string) => void;
  onTaskClick?: (task: TaskItem) => void;
  onTaskStatusChange?: (taskId: string, status: TaskItem['status']) => void;
  onAddTask?: () => void;
  onAddRevenue?: () => void;
  onAddExpense?: () => void;
  onFinanceClick?: (entry: FinancialEntry) => void;
}

export function ProjectDetailPanel({
  project,
  tasks,
  financeData = [],
  usersData,
  partnerWorkersData,
  partnerCompaniesData,
  onClose,
  onEdit,
  onStatusChange,
  onTaskClick,
  onTaskStatusChange,
  onAddTask,
  onAddRevenue,
  onAddExpense,
  onFinanceClick,
}: ProjectDetailPanelProps) {
  const currentUser = usersData?.currentUser as AppUser | null;

  const financePermission: FinancePermissionLevel = useMemo(() => {
    if (!currentUser) return 'none';

    const projectData: DbProject | null = {
      id: parseInt(project.id) || 0,
      bu_code: project.bu,
      name: project.name,
      category: project.cat,
      status: project.status as any,
      start_date: project.startDate,
      end_date: project.endDate,
      pm_id: project.pm_id,
      participants: project.participants?.map((p) => ({
        user_id: p.user_id,
        partner_worker_id: p.partner_worker_id,
        partner_company_id: p.partner_company_id,
        role: p.role,
        is_pm: false,
      })),
      created_at: '',
      updated_at: '',
    };

    const permission = checkFinancePermission({
      currentUser,
      entry: null,
      project: projectData,
      targetBu: project.bu,
    });

    if (!permission.canRead) return 'none';
    if (permission.canCreate || permission.canUpdate) return 'edit';
    return 'view';
  }, [currentUser, project]);

  const canViewFinance = financePermission === 'view' || financePermission === 'edit';
  const canEditFinance = financePermission === 'edit';
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let closedByPopState = false;
    history.pushState({ projectDetail: true }, '');
    const handlePopState = () => {
      closedByPopState = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (!closedByPopState) {
        history.back();
      }
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex w-full h-full bg-slate-50 dark:bg-slate-900">
        {/* 좌측: 프로젝트 정보 + 칸반 할일 */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          <div className="flex-shrink-0 p-3 sm:p-4 pb-0 space-y-3">
            <ProjectDetailHeader
              project={project}
              taskCount={tasks.length}
              usersData={usersData}
              partnerWorkersData={partnerWorkersData}
              partnerCompaniesData={partnerCompaniesData}
              onEdit={onEdit}
              onClose={onClose}
              onStatusChange={onStatusChange}
            />
            <ProjectDetailInfo project={project} />
            <ProjectDetailActions
              onAddTask={onAddTask || (() => {})}
              onAddRevenue={canEditFinance ? (onAddRevenue || (() => {})) : undefined}
              onAddExpense={canEditFinance ? (onAddExpense || (() => {})) : undefined}
            />
            {canViewFinance && financeData.length > 0 && (
              <ProjectDetailFinance
                financeData={financeData}
                onFinanceClick={onFinanceClick}
              />
            )}
          </div>
          <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 pt-3">
            <ProjectDetailTasks
              tasks={tasks}
              usersData={usersData}
              onTaskClick={onTaskClick}
              onTaskStatusChange={onTaskStatusChange}
            />
          </div>
        </div>

        {/* 우측: 댓글 */}
        <div className="hidden md:flex flex-col w-[340px] lg:w-[380px] xl:w-[420px] border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
            <MessageCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              댓글
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <CommentSection
              entityType="project"
              entityId={Number(project.id)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
