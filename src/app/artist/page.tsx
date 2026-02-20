'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArtistDashboard,
  useArtistDashboard,
  useUpdateArtistTaskStatus,
  ProjectDetailSheet,
  TaskDetailDialog,
  SettlementDetailDialog,
  ArtistNotificationBell,
} from '@/features/artist-dashboard';
import type { ArtistProject, ArtistTask, SettlementDetailPayload } from '@/features/artist-dashboard';
import { RefreshCw, LogOut } from 'lucide-react';
import Link from 'next/link';
import { canAccessArtistPage, type Role, type BuCode } from '@/lib/permissions';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  bu_code: string | null;
  partner_id: number | null;
}

export default function ArtistPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/login');
        return;
      }

      // app_users에서 사용자 정보 가져오기
      const { data: appUser, error: appUserError } = await supabase
        .from('app_users')
        .select('id, name, email, role, bu_code, partner_id')
        .eq('id', authUser.id)
        .single();

      if (appUserError || !appUser) {
        setError('사용자 정보를 불러올 수 없습니다.');
        setLoading(false);
        return;
      }

      // 접근 권한 체크:
      // 1. role이 artist인 경우
      // 2. role이 leader 또는 admin이면서 bu_code가 HEAD인 경우
      const hasAccess = canAccessArtistPage({
        id: appUser.id,
        role: appUser.role as Role,
        bu_code: appUser.bu_code as BuCode | null,
      });

      if (!hasAccess) {
        setError('아티스트 전용 페이지입니다. 접근 권한이 없습니다.');
        setLoading(false);
        return;
      }

      setUser(appUser);
      setLoading(false);
    } catch (err) {
      console.error('Auth check error:', err);
      setError('인증 확인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">접근 불가</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ArtistPageContent user={user} onLogout={handleLogout} />
  );
}

function ArtistPageContent({
  user,
  onLogout,
}: {
  user: UserInfo;
  onLogout: () => void;
}) {
  const { projects, tasks, settlements, refetch } = useArtistDashboard();
  const updateTaskStatus = useUpdateArtistTaskStatus();

  const [selectedProject, setSelectedProject] = useState<ArtistProject | null>(null);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ArtistTask | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [settlementPayload, setSettlementPayload] = useState<SettlementDetailPayload | null>(null);
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);

  const handleProjectClick = (project: ArtistProject) => {
    setSelectedProject(project);
    setProjectSheetOpen(true);
  };

  const handleTaskClick = (task: ArtistTask) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleSettlementClick = (payload: SettlementDetailPayload) => {
    setSettlementPayload(payload);
    setSettlementDialogOpen(true);
  };

  const handleTaskStatusChange = (taskId: number, status: 'todo' | 'in_progress' | 'done') => {
    updateTaskStatus.mutate({ taskId, status });
    setTaskDialogOpen(false);
    setSelectedTask(null);
  };

  const partnerSettlements = settlements?.partnerSettlements ?? [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {user.role === 'artist' ? (
                <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                  GRIGO
                </span>
              ) : (
                <Link href="/" className="text-xl font-black text-slate-900 dark:text-slate-100 hover:text-blue-600 transition">
                  GRIGO
                </Link>
              )}
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                / 아티스트
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ArtistNotificationBell />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {user.name}
              </span>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ArtistDashboard
          userName={user.name}
          onProjectClick={handleProjectClick}
          onTaskClick={handleTaskClick}
          onSettlementClick={handleSettlementClick}
        />
      </main>

      <ProjectDetailSheet
        open={projectSheetOpen}
        onOpenChange={setProjectSheetOpen}
        project={
          selectedProject
            ? (projects?.projects?.find((p) => p.id === selectedProject.id) ?? selectedProject)
            : null
        }
        tasks={tasks?.tasks ?? []}
        settlements={settlements?.settlements ?? []}
        partnerSettlements={partnerSettlements}
        pmName={
          selectedProject
            ? (projects?.projects?.find((p) => p.id === selectedProject.id)?.pm_name ?? selectedProject.pm_name ?? null)
            : undefined
        }
      />

      <TaskDetailDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask}
        onStatusChange={handleTaskStatusChange}
      />

      <SettlementDetailDialog
        open={settlementDialogOpen}
        onOpenChange={setSettlementDialogOpen}
        payload={settlementPayload}
      />
    </div>
  );
}
