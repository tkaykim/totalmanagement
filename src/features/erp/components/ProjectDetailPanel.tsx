'use client';

import { useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import type { Project, TaskItem } from '../types';
import { ProjectDetailHeader } from './ProjectDetailHeader';
import { ProjectDetailInfo } from './ProjectDetailInfo';
import { ProjectDetailTasks } from './ProjectDetailTasks';
import { ProjectDetailActions } from './ProjectDetailActions';
import { CommentSection } from '@/features/comments/components/CommentSection';

interface ProjectDetailPanelProps {
  project: Project;
  tasks: TaskItem[];
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
}

export function ProjectDetailPanel({
  project,
  tasks,
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
}: ProjectDetailPanelProps) {
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
            {(onAddTask || onAddRevenue || onAddExpense) && (
              <ProjectDetailActions
                onAddTask={onAddTask || (() => {})}
                onAddRevenue={onAddRevenue || (() => {})}
                onAddExpense={onAddExpense || (() => {})}
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
