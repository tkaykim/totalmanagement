'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, eachWeekOfInterval, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  FolderKanban,
  CheckSquare,
  Calendar,
  User,
  LogOut,
  X,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Youtube,
  Briefcase,
  Settings,
  FileText,
  PlayCircle,
} from 'lucide-react';
import {
  useMyWorks,
  useUpdateProject,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useUsers,
  useChannels,
  useClients,
} from '@/features/erp/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { dbProjectToFrontend, dbTaskToFrontend, frontendTaskToDb, frontendProjectToDb } from '@/features/erp/utils';
import type { Project, ProjectTask, BU, ProjectStep, Channel, Client } from '@/types/database';
import { cn } from '@/lib/utils';
import { getTodayKST } from '@/lib/timezone';
import { CommentSection } from '@/features/comments/components/CommentSection';

type ProjectItem = {
  id: string;
  bu: string;
  name: string;
  cat: string;
  startDate: string;
  endDate: string;
  status: string;
  pm_id?: string | null;
};

type TaskItem = {
  id: string;
  bu: string;
  projectId: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: 'todo' | 'in-progress' | 'done';
};

type View = 'projects' | 'tasks' | 'schedule';

const BU_TITLES: Record<BU, string> = {
  GRIGO: '그리고 엔터',
  REACT: '리액트 스튜디오',
  FLOW: '플로우메이커',
  AST: '아스트 컴퍼니',
  MODOO: '모두굿즈',
  HEAD: '본사',
};

const BU_CHIP_STYLES: Record<BU, string> = {
  GRIGO: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  REACT: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  FLOW: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  AST: 'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  MODOO: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  HEAD: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

function SidebarButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition',
        active
          ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
          : 'text-slate-300 dark:text-slate-400 hover:bg-slate-800 dark:hover:bg-slate-700 hover:text-white',
      )}
    >
      <span className="w-5 text-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function MyWorksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<View>('projects');
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const { data, isLoading, error } = useMyWorks();
  const { data: usersData } = useUsers();

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userData?.bu_code) {
        // bu_code가 있으면 메인 페이지로 리디렉션
        router.push('/');
        return;
      }

      setUser(userData);
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  // 모든 Hook은 early return 전에 호출되어야 함
  const projects: ProjectItem[] = useMemo(
    () => (data?.projects || []).map((p: Project) => dbProjectToFrontend(p)),
    [data?.projects]
  );
  const tasks: TaskItem[] = useMemo(
    () => (data?.tasks || []).map((t: ProjectTask) => dbTaskToFrontend(t)),
    [data?.tasks]
  );

  // 프로젝트 이름으로 할일 찾기
  const findProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || '-';
  };

  // 날짜별로 할일 그룹화
  const tasksByDate = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const date = task.dueDate;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(task);
      return acc;
    }, {} as Record<string, TaskItem[]>);
  }, [tasks]);

  const sortedDates = useMemo(() => {
    return Object.keys(tasksByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });
  }, [tasksByDate]);

  // 스케줄 뷰를 위한 주간/월간 이동 상태
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 스케줄 뷰를 위한 주간 데이터
  const weekStart = useMemo(() => startOfWeek(currentWeek, { locale: ko }), [currentWeek]);
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { locale: ko }), [currentWeek]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  const tasksByWeekDay = useMemo(() => {
    const result: Record<string, TaskItem[]> = {};
    weekDays.forEach((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      result[dayStr] = tasks.filter((task) => isSameDay(parseISO(task.dueDate), day));
    });
    return result;
  }, [tasks, weekDays]);

  // 월간 스케줄을 위한 데이터
  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  const monthWeeks = useMemo(() => {
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { locale: ko });
    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { locale: ko });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      return days;
    });
  }, [monthStart, monthEnd]);

  const tasksByMonthDay = useMemo(() => {
    const result: Record<string, TaskItem[]> = {};
    monthWeeks.flat().forEach((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      result[dayStr] = tasks.filter((task) => isSameDay(parseISO(task.dueDate), day));
    });
    return result;
  }, [tasks, monthWeeks]);

  // early return은 모든 Hook 호출 후에 수행
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold text-slate-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold text-red-600">오류가 발생했습니다.</div>
          <div className="text-sm text-slate-500">{String(error)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="hidden h-screen w-64 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-slate-900 text-white lg:flex">
        <div className="p-8">
          <button
            onClick={() => setView('projects')}
            className="text-left"
          >
            <p className="text-xl font-bold tracking-tighter text-blue-300">내 작업</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
              My Works
            </p>
          </button>
        </div>
        <nav className="flex-1 space-y-2 px-4">
          <SidebarButton
            label="프로젝트"
            icon={<FolderKanban className="h-4 w-4" />}
            active={view === 'projects'}
            onClick={() => setView('projects')}
          />
          <SidebarButton
            label="할일 관리"
            icon={<CheckSquare className="h-4 w-4" />}
            active={view === 'tasks'}
            onClick={() => setView('tasks')}
          />
          <SidebarButton
            label="스케줄"
            icon={<Calendar className="h-4 w-4" />}
            active={view === 'schedule'}
            onClick={() => setView('schedule')}
          />
        </nav>
        <div className="p-6 pt-0">
          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4">
            <p className="mb-1 text-[10px] uppercase tracking-tighter text-slate-500 dark:text-slate-400">
              Signed in as
            </p>
            <p className="text-sm font-semibold text-blue-100">
              {user?.name || user?.email || '사용자'}
            </p>
            {user?.position && (
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{user.position}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700/60 flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-24 items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-6 backdrop-blur">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {view === 'projects'
                ? '프로젝트'
                : view === 'tasks'
                  ? '할일 관리'
                  : '스케줄'}
            </h2>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl px-4 py-8 space-y-6">
          {view === 'projects' && (
            <ProjectsView projects={projects} onProjectClick={setSelectedProject} data={data} usersData={usersData} />
          )}

          {view === 'tasks' && (
            <TasksView tasks={tasks} findProjectName={findProjectName} />
          )}

          {view === 'schedule' && (
            <ScheduleView
              tasksByWeekDay={tasksByWeekDay}
              weekDays={weekDays}
              tasksByMonthDay={tasksByMonthDay}
              monthWeeks={monthWeeks}
              monthStart={monthStart}
              monthEnd={monthEnd}
              findProjectName={findProjectName}
              currentWeek={currentWeek}
              setCurrentWeek={setCurrentWeek}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              projects={projects}
              onProjectClick={setSelectedProject}
            />
          )}
        </div>
      </main>

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          originalProject={data?.projects?.find((p: Project) => String(p.id) === selectedProject.id)}
          tasks={tasks.filter((t) => t.projectId === selectedProject.id)}
          allTasks={tasks}
          projects={projects}
          user={user}
          onClose={() => setSelectedProject(null)}
          onProjectUpdate={(updatedProject) => {
            setSelectedProject(updatedProject);
          }}
          onTasksUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['my-works'] });
          }}
        />
      )}
    </div>
  );
}

function ProjectsView({
  projects,
  onProjectClick,
  data,
  usersData,
}: {
  projects: ProjectItem[];
  onProjectClick: (project: ProjectItem) => void;
  data?: { projects?: Project[]; tasks?: ProjectTask[]; user?: any };
  usersData?: { users: any[]; currentUser: any };
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <FolderKanban className="h-5 w-5 text-blue-500" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">내 프로젝트</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">({projects.length}개)</span>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">참여 중인 프로젝트가 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const originalProject = data?.projects?.find((p: Project) => String(p.id) === project.id);
            const buCode = originalProject?.bu_code as BU | undefined;

            return (
              <button
                key={project.id}
                onClick={() => onProjectClick(project)}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800 text-left w-full"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                      {project.name}
                    </h3>
                    {buCode && BU_TITLES[buCode] && (
                      <span className={cn('mt-1 inline-block rounded-md border px-2 py-0.5 text-[9px] font-semibold', BU_CHIP_STYLES[buCode])}>
                        {BU_TITLES[buCode]}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-[10px] font-semibold flex-shrink-0',
                      project.status === '진행중' || project.status === '운영중'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : project.status === '완료'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                    )}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">카테고리:</span>
                    <span>{project.cat}</span>
                  </div>
                  {project.startDate && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">시작일:</span>
                      <span>{format(parseISO(project.startDate), 'yyyy-MM-dd', { locale: ko })}</span>
                    </div>
                  )}
                  {project.endDate && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">종료일:</span>
                      <span>{format(parseISO(project.endDate), 'yyyy-MM-dd', { locale: ko })}</span>
                    </div>
                  )}
                  {project.pm_id && usersData?.users && (() => {
                    const pmUser = usersData.users.find((u: any) => u.id === project.pm_id);
                    return pmUser ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">PM:</span>
                        <span>{pmUser.name}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TasksView({
  tasks,
  findProjectName,
}: {
  tasks: TaskItem[];
  findProjectName: (projectId: string) => string;
}) {
  // 날짜별로 할일 그룹화
  const tasksByDate = tasks.reduce((acc, task) => {
    const date = task.dueDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(task);
    return acc;
  }, {} as Record<string, TaskItem[]>);

  const sortedDates = Object.keys(tasksByDate).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <CheckSquare className="h-5 w-5 text-emerald-500" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">내 할일</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">({tasks.length}개)</span>
      </div>

          {tasks.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">할당된 할일이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => {
                const dateTasks = tasksByDate[date];
                const isPast = new Date(date) < new Date();
                const isToday = format(new Date(date), 'yyyy-MM-dd') === getTodayKST();

                return (
                  <div
                    key={date}
                    className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div
                      className={cn(
                        'flex items-center gap-2 border-b border-slate-200 px-6 py-3 dark:border-slate-700',
                        isToday && 'bg-blue-50 dark:bg-blue-900/20',
                        isPast && !isToday && 'bg-red-50 dark:bg-red-900/20',
                      )}
                    >
                      <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {format(parseISO(date), 'yyyy년 MM월 dd일 (E)', { locale: ko })}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          오늘
                        </span>
                      )}
                      {isPast && !isToday && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          지연
                        </span>
                      )}
                      <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                        {dateTasks.length}개
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {dateTasks.map((task) => (
                        <div key={task.id} className="px-6 py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                  {task.title}
                                </h4>
                                <span
                                  className={cn(
                                    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                    task.status === 'done'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                      : task.status === 'in-progress'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                                  )}
                                >
                                  {task.status === 'done'
                                    ? '완료'
                                    : task.status === 'in-progress'
                                      ? '진행중'
                                      : '할일'}
                                </span>
                              </div>
                              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                <span className="font-semibold">프로젝트:</span> {findProjectName(task.projectId)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
    </section>
  );
}

function ScheduleView({
  tasksByWeekDay,
  weekDays,
  tasksByMonthDay,
  monthWeeks,
  monthStart,
  monthEnd,
  findProjectName,
  currentWeek,
  setCurrentWeek,
  currentMonth,
  setCurrentMonth,
  projects,
  onProjectClick,
}: {
  tasksByWeekDay: Record<string, TaskItem[]>;
  weekDays: Date[];
  tasksByMonthDay: Record<string, TaskItem[]>;
  monthWeeks: Date[][];
  monthStart: Date;
  monthEnd: Date;
  findProjectName: (projectId: string) => string;
  currentWeek: Date;
  setCurrentWeek: (date: Date) => void;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  projects: ProjectItem[];
  onProjectClick: (project: ProjectItem) => void;
}) {
  const [scheduleType, setScheduleType] = useState<'week' | 'month'>('week');

  const handlePrevWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    if (scheduleType === 'week') {
      setCurrentWeek(new Date());
    } else {
      setCurrentMonth(new Date());
    }
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">스케줄</h2>
          {scheduleType === 'week' && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              ({format(weekDays[0], 'yyyy-MM-dd')} ~ {format(weekDays[weekDays.length - 1], 'yyyy-MM-dd')})
            </span>
          )}
          {scheduleType === 'month' && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              ({format(monthStart, 'yyyy년 MM월', { locale: ko })})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={scheduleType === 'week' ? handlePrevWeek : handlePrevMonth}
              className="rounded-l-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              title={scheduleType === 'week' ? '이전 주' : '이전 월'}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              오늘
            </button>
            <button
              onClick={scheduleType === 'week' ? handleNextWeek : handleNextMonth}
              className="rounded-r-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              title={scheduleType === 'week' ? '다음 주' : '다음 월'}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => setScheduleType('week')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-semibold transition',
                scheduleType === 'week'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
              )}
            >
              주간
            </button>
            <button
              onClick={() => setScheduleType('month')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-semibold transition',
                scheduleType === 'month'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
              )}
            >
              월간
            </button>
          </div>
        </div>
      </div>

      {scheduleType === 'week' ? (
        <WeekScheduleView
          tasksByWeekDay={tasksByWeekDay}
          weekDays={weekDays}
          findProjectName={findProjectName}
          projects={projects}
          onProjectClick={onProjectClick}
        />
      ) : (
        <MonthScheduleView
          tasksByMonthDay={tasksByMonthDay}
          monthWeeks={monthWeeks}
          monthStart={monthStart}
          findProjectName={findProjectName}
          projects={projects}
          onProjectClick={onProjectClick}
        />
      )}
    </section>
  );
}

function WeekScheduleView({
  tasksByWeekDay,
  weekDays,
  findProjectName,
  projects,
  onProjectClick,
}: {
  tasksByWeekDay: Record<string, TaskItem[]>;
  weekDays: Date[];
  findProjectName: (projectId: string) => string;
  projects: ProjectItem[];
  onProjectClick: (project: ProjectItem) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-7">
        {weekDays.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByWeekDay[dayStr] || [];
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dayStr}
              className={cn(
                'rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800',
                isToday && 'ring-2 ring-blue-500',
              )}
            >
              <div
                className={cn(
                  'border-b border-slate-200 px-4 py-3 dark:border-slate-700',
                  isToday && 'bg-blue-50 dark:bg-blue-900/20',
                )}
              >
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {format(day, 'E', { locale: ko })}
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                  {format(day, 'd')}
                </div>
                {isToday && (
                  <span className="mt-1 inline-block rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                    오늘
                  </span>
                )}
              </div>
              <div className="max-h-[400px] space-y-2 overflow-y-auto p-3">
                {dayTasks.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-4">
                    할일 없음
                  </p>
                ) : (
                  dayTasks.map((task) => {
                    const project = projects.find((p) => p.id === task.projectId);
                    return (
                      <button
                        key={task.id}
                        onClick={() => project && onProjectClick(project)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-left transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800"
                      >
                        <div className="mb-1 flex items-center gap-1">
                          <span
                            className={cn(
                              'rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
                              task.status === 'done'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : task.status === 'in-progress'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                            )}
                          >
                            {task.status === 'done'
                              ? '완료'
                              : task.status === 'in-progress'
                                ? '진행중'
                                : '할일'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                          {task.title}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {findProjectName(task.projectId)}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
  );
}

function MonthScheduleView({
  tasksByMonthDay,
  monthWeeks,
  monthStart,
  findProjectName,
  projects,
  onProjectClick,
}: {
  tasksByMonthDay: Record<string, TaskItem[]>;
  monthWeeks: Date[][];
  monthStart: Date;
  findProjectName: (projectId: string) => string;
  projects: ProjectItem[];
  onProjectClick: (project: ProjectItem) => void;
}) {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
        {dayNames.map((day) => (
          <div
            key={day}
            className="border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      {monthWeeks.map((week, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
          {week.map((day, dayIdx) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByMonthDay[dayStr] || [];
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = format(day, 'yyyy-MM') === format(monthStart, 'yyyy-MM');

            return (
              <div
                key={dayIdx}
                className={cn(
                  'min-h-[120px] border-r border-slate-200 dark:border-slate-700 p-2 last:border-r-0',
                  !isCurrentMonth && 'bg-slate-50/50 dark:bg-slate-900/50',
                  isToday && 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500',
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      isToday
                        ? 'text-blue-600 dark:text-blue-400'
                        : isCurrentMonth
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-400 dark:text-slate-500',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                      {dayTasks.length}
                    </span>
                  )}
                </div>
                <div className="space-y-1 max-h-[80px] overflow-y-auto">
                  {dayTasks.slice(0, 3).map((task) => {
                    const project = projects.find((p) => p.id === task.projectId);
                    return (
                      <button
                        key={task.id}
                        onClick={() => project && onProjectClick(project)}
                        className="w-full rounded border border-slate-200 bg-slate-50 p-1 text-left transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800"
                      >
                        <p className="text-[9px] font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                          {task.title}
                        </p>
                        <p className="text-[8px] text-slate-500 dark:text-slate-400 truncate">
                          {findProjectName(task.projectId)}
                        </p>
                      </button>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <p className="text-[8px] text-slate-500 dark:text-slate-400">
                      +{dayTasks.length - 3}개 더
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ProjectDetailModal({
  project,
  originalProject,
  tasks,
  allTasks,
  projects,
  user,
  onClose,
  onProjectUpdate,
  onTasksUpdate,
  usersData,
}: {
  project: ProjectItem;
  originalProject?: Project;
  tasks: TaskItem[];
  allTasks: TaskItem[];
  projects: ProjectItem[];
  user?: any;
  onClose: () => void;
  onProjectUpdate: (updatedProject: ProjectItem) => void;
  onTasksUpdate: () => void;
  usersData?: { users: any[]; currentUser: any };
}) {
  const isReactProject = originalProject?.bu_code === 'REACT';
  const { data: channelsData } = useChannels(isReactProject ? 'REACT' : undefined);
  const { data: clientsData } = useClients(isReactProject ? 'REACT' : undefined);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: project.name,
    cat: project.cat,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    pm_id: project.pm_id || '',
    projectType: (originalProject as any)?.client_id ? 'external' as 'channel' | 'external' : 'channel' as 'channel' | 'external',
    channel_id: '',
    client_id: String((originalProject as any)?.client_id || ''),
    active_steps: ((originalProject as any)?.active_steps || []) as ProjectStep[],
    plan_date: (originalProject as any)?.plan_date || null,
    script_date: (originalProject as any)?.script_date || null,
    shoot_date: (originalProject as any)?.shoot_date || null,
    edit1_date: (originalProject as any)?.edit1_date || null,
    edit_final_date: (originalProject as any)?.edit_final_date || null,
    release_date: (originalProject as any)?.release_date || null,
  });

  // REACT 프로젝트일 때 채널 ID 초기화
  useEffect(() => {
    if (isReactProject && channelsData && !(originalProject as any)?.client_id) {
      const channel = channelsData.find((c: Channel) => c.name === project.cat);
      if (channel) {
        setEditForm((prev) => ({ ...prev, channel_id: String(channel.id) }));
      }
    }
  }, [isReactProject, channelsData, project.cat, originalProject]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [newTaskForm, setNewTaskForm] = useState<{
    title: string;
    assignee: string;
    dueDate: string;
    status: 'todo' | 'in-progress' | 'done';
  }>({
    title: '',
    assignee: '',
    dueDate: '',
    status: 'todo',
  });
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(tasks);

  // tasks가 변경되면 로컬 상태도 업데이트
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const queryClient = useQueryClient();
  const updateProjectMutation = useUpdateProject();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // 본인이 PM이거나 참여자인지 확인
  const canEdit = useMemo(() => {
    if (!user || !originalProject) return false;
    const userId = user.id;
    const userName = user.name;

    // PM인 경우
    if (originalProject.pm_id === userId) {
      return true;
    }

    // Participants에 포함된 경우
    if (originalProject.participants && Array.isArray(originalProject.participants)) {
      return originalProject.participants.some((participant: any) => {
        return participant.user_id === userId || (participant.is_pm === true && participant.user_id === userId);
      });
    }

    return false;
  }, [user, originalProject]);

  const todoCount = localTasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = localTasks.filter((t) => t.status === 'in-progress').length;
  const doneCount = localTasks.filter((t) => t.status === 'done').length;

  // D-Day 변경 시 자동 계산 (REACT 프로젝트용)
  const handleReleaseDateChange = (releaseDate: string) => {
    if (!releaseDate) {
      setEditForm((prev) => ({ ...prev, release_date: null }));
      return;
    }
    
    const date = new Date(releaseDate);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const addDays = (d: Date, days: number) => {
      const newDate = new Date(d);
      newDate.setDate(d.getDate() + days);
      return newDate;
    };

    const calculatedDates = {
      release_date: releaseDate,
      edit_final_date: formatDate(addDays(date, -1)),
      edit1_date: formatDate(addDays(date, -3)),
      shoot_date: formatDate(addDays(date, -7)),
      script_date: formatDate(addDays(date, -9)),
      plan_date: formatDate(addDays(date, -11)),
    };
    
    setEditForm((prev) => ({
      ...prev,
      ...calculatedDates,
    }));
  };
  
  // 단계 토글 (REACT 프로젝트용)
  const toggleStep = (step: ProjectStep) => {
    const currentSteps = editForm.active_steps || [];
    const newSteps = currentSteps.includes(step)
      ? currentSteps.filter((s) => s !== step)
      : [...currentSteps, step];
    setEditForm((prev) => ({ ...prev, active_steps: newSteps }));
  };
  
  const selectedClient = editForm.client_id ? clientsData?.find((c: Client) => c.id === Number(editForm.client_id)) : null;
  const selectedChannel = editForm.channel_id ? channelsData?.find((c: Channel) => c.id === Number(editForm.channel_id)) : null;
  const buChannels = channelsData?.filter((c: Channel) => c.bu_code === 'REACT') || [];

  const handleSaveProject = async () => {
    if (!originalProject) return;
    try {
      const baseData = frontendProjectToDb({
        bu: project.bu as BU,
        name: editForm.name,
        cat: editForm.cat,
        startDate: editForm.startDate,
        endDate: editForm.release_date || editForm.endDate,
        status: editForm.status,
        pm_id: (editForm as any).pm_id || null,
      });
      
      // REACT 프로젝트인 경우 추가 필드 포함
      const dbData = isReactProject ? {
        ...baseData,
        client_id: editForm.client_id ? Number(editForm.client_id) : undefined,
        active_steps: editForm.active_steps || [],
        plan_date: editForm.plan_date,
        script_date: editForm.script_date,
        shoot_date: editForm.shoot_date,
        edit1_date: editForm.edit1_date,
        edit_final_date: editForm.edit_final_date,
        release_date: editForm.release_date,
      } as any : baseData;
      
      await updateProjectMutation.mutateAsync({ id: Number(project.id), data: dbData });
      queryClient.invalidateQueries({ queryKey: ['my-works'] });
      const updatedProject: ProjectItem = {
        ...project,
        ...editForm,
      };
      onProjectUpdate(updatedProject);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('프로젝트 수정에 실패했습니다.');
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskForm.title.trim()) {
      alert('할일 제목을 입력해주세요.');
      return;
    }
    try {
      const dbData = frontendTaskToDb({
        projectId: project.id,
        bu: project.bu as BU,
        title: newTaskForm.title,
        assignee: newTaskForm.assignee,
        dueDate: newTaskForm.dueDate || getTodayKST(),
        status: newTaskForm.status,
      });
      const createdTask = await createTaskMutation.mutateAsync(dbData);
      const newTask: TaskItem = dbTaskToFrontend(createdTask);
      setLocalTasks((prev) => [...prev, newTask]);
      queryClient.invalidateQueries({ queryKey: ['my-works'] });
      onTasksUpdate();
      setNewTaskForm({ title: '', assignee: '', dueDate: '', status: 'todo' });
      setIsTaskModalOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('할일 생성에 실패했습니다.');
    }
  };

  const handleUpdateTask = async (task: TaskItem) => {
    try {
      const dbData = frontendTaskToDb({
        projectId: task.projectId,
        bu: task.bu as BU,
        title: task.title,
        assignee: task.assignee,
        dueDate: task.dueDate,
        status: task.status,
      });
      const updatedTask = await updateTaskMutation.mutateAsync({ id: Number(task.id), data: dbData });
      const updatedTaskItem: TaskItem = dbTaskToFrontend(updatedTask);
      setLocalTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTaskItem : t)));
      queryClient.invalidateQueries({ queryKey: ['my-works'] });
      onTasksUpdate();
      setEditingTask(null);
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('할일 수정에 실패했습니다.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('할일을 삭제하시겠습니까?')) return;
    try {
      await deleteTaskMutation.mutateAsync(Number(taskId));
      setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
      queryClient.invalidateQueries({ queryKey: ['my-works'] });
      onTasksUpdate();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('할일 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">프로젝트 상세보기</h3>
          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <Pencil className="h-4 w-4" />
                수정
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">프로젝트명</label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            ) : (
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{project.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">상태</label>
              {isEditing ? (
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="준비중">준비중</option>
                  <option value="기획중">기획중</option>
                  <option value="진행중">진행중</option>
                  <option value="운영중">운영중</option>
                  <option value="완료">완료</option>
                </select>
              ) : (
                <p className="mt-1">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                      project.status === '진행중' || project.status === '운영중'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : project.status === '완료'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                    )}
                  >
                    {project.status}
                  </span>
                </p>
              )}
            </div>
            {project.cat && (
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">카테고리</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.cat}
                    onChange={(e) => setEditForm({ ...editForm, cat: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                ) : (
                  <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{project.cat}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {project.startDate && (
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">시작일</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                ) : (
                  <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                    {format(parseISO(project.startDate), 'yyyy-MM-dd', { locale: ko })}
                  </p>
                )}
              </div>
            )}
            {project.endDate && (
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">종료일</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                ) : (
                  <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                    {format(parseISO(project.endDate), 'yyyy-MM-dd', { locale: ko })}
                  </p>
                )}
              </div>
            )}
          </div>

          {project.pm_id && usersData?.users && (() => {
            const pmUser = usersData.users.find((u: any) => u.id === project.pm_id);
            return pmUser ? (
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">PM</label>
                {isEditing ? (
                  <select
                    value={editForm.pm_id}
                    onChange={(e) => setEditForm({ ...editForm, pm_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">선택 안함</option>
                    {usersData.users.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{pmUser.name}</p>
                )}
              </div>
            ) : null;
          })()}

          {/* REACT 프로젝트 전용 섹션 */}
          {isReactProject && (
            <>
              {/* 프로젝트 타입 표시 */}
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <label className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">프로젝트 유형</label>
                {isEditing ? (
                  <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, projectType: 'channel', client_id: '' }))}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-colors',
                        editForm.projectType === 'channel'
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-600'
                          : 'text-slate-400 dark:text-slate-500',
                      )}
                    >
                      <Youtube className="w-4 h-4" />
                      채널 프로젝트
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, projectType: 'external', channel_id: '' }))}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-colors',
                        editForm.projectType === 'external'
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-600'
                          : 'text-slate-400 dark:text-slate-500',
                      )}
                    >
                      <Briefcase className="w-4 h-4" />
                      외주 프로젝트
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                    <div
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold',
                        editForm.projectType === 'channel'
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-600'
                          : 'text-slate-400 dark:text-slate-500',
                      )}
                    >
                      <Youtube className="w-4 h-4" />
                      채널 프로젝트
                    </div>
                    <div
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold',
                        editForm.projectType === 'external'
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-600'
                          : 'text-slate-400 dark:text-slate-500',
                      )}
                    >
                      <Briefcase className="w-4 h-4" />
                      외주 프로젝트
                    </div>
                  </div>
                )}
              </div>

              {/* 채널/클라이언트 선택 */}
              {isEditing && (
                <>
                  {editForm.projectType === 'channel' && (
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">채널 선택</label>
                      <select
                        value={editForm.channel_id}
                        onChange={(e) => {
                          const channel = channelsData?.find((c: Channel) => c.id === Number(e.target.value));
                          setEditForm((prev) => ({
                            ...prev,
                            channel_id: e.target.value,
                            cat: channel?.name || prev.cat,
                          }));
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="">채널을 선택하세요</option>
                        {buChannels.map((c: Channel) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {editForm.projectType === 'external' && (
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">클라이언트</label>
                      <select
                        value={editForm.client_id}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, client_id: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="">클라이언트를 선택하세요</option>
                        {clientsData?.map((c: Client) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.company_name_ko || c.company_name_en || ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* 진행 단계 설정 */}
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <label className="mb-3 block text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  진행 단계 설정
                </label>
                {isEditing ? (
                  <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                    {[
                      { id: 'plan' as ProjectStep, label: '기획' },
                      { id: 'script' as ProjectStep, label: '대본' },
                      { id: 'shoot' as ProjectStep, label: '촬영' },
                      { id: 'edit' as ProjectStep, label: '편집' },
                    ].map((step) => {
                      const isActive = editForm.active_steps?.includes(step.id);
                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => toggleStep(step.id)}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-colors',
                            isActive
                              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-600'
                              : 'text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700',
                          )}
                        >
                          {isActive ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <X className="w-4 h-4" />}
                          {step.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                    {[
                      { id: 'plan' as ProjectStep, label: '기획' },
                      { id: 'script' as ProjectStep, label: '대본' },
                      { id: 'shoot' as ProjectStep, label: '촬영' },
                      { id: 'edit' as ProjectStep, label: '편집' },
                    ].map((step) => {
                      const isActive = editForm.active_steps?.includes(step.id);
                      return (
                        <div
                          key={step.id}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold',
                            isActive
                              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-600'
                              : 'text-slate-400 dark:text-slate-500',
                          )}
                        >
                          {isActive ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <X className="w-4 h-4" />}
                          {step.label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 주요 일정 관리 */}
              {editForm.active_steps && editForm.active_steps.length > 0 && (
                <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                  <label className="mb-3 block text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    주요 일정 관리
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      {editForm.active_steps.includes('plan') && (
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                            기획 확정 (D-11)
                          </label>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editForm.plan_date || ''}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, plan_date: e.target.value || null }))}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                          ) : (
                            <p className="text-sm text-slate-900 dark:text-slate-100">
                              {editForm.plan_date ? format(parseISO(editForm.plan_date), 'yyyy-MM-dd', { locale: ko }) : '-'}
                            </p>
                          )}
                        </div>
                      )}
                      {editForm.active_steps.includes('script') && (
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                            대본 확정 (D-9)
                          </label>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editForm.script_date || ''}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, script_date: e.target.value || null }))}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                          ) : (
                            <p className="text-sm text-slate-900 dark:text-slate-100">
                              {editForm.script_date ? format(parseISO(editForm.script_date), 'yyyy-MM-dd', { locale: ko }) : '-'}
                            </p>
                          )}
                        </div>
                      )}
                      {editForm.active_steps.includes('shoot') && (
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                            촬영 확정 (D-7)
                          </label>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editForm.shoot_date || ''}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, shoot_date: e.target.value || null }))}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                          ) : (
                            <p className="text-sm text-slate-900 dark:text-slate-100">
                              {editForm.shoot_date ? format(parseISO(editForm.shoot_date), 'yyyy-MM-dd', { locale: ko }) : '-'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {editForm.active_steps.includes('edit') && (
                        <>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                              1차 편집 확정 (D-3)
                            </label>
                            {isEditing ? (
                              <input
                                type="date"
                                value={editForm.edit1_date || ''}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, edit1_date: e.target.value || null }))}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              />
                            ) : (
                              <p className="text-sm text-slate-900 dark:text-slate-100">
                                {editForm.edit1_date ? format(parseISO(editForm.edit1_date), 'yyyy-MM-dd', { locale: ko }) : '-'}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                              최종 편집 확정 (D-1)
                            </label>
                            {isEditing ? (
                              <input
                                type="date"
                                value={editForm.edit_final_date || ''}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, edit_final_date: e.target.value || null }))}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              />
                            ) : (
                              <p className="text-sm text-slate-900 dark:text-slate-100">
                                {editForm.edit_final_date ? format(parseISO(editForm.edit_final_date), 'yyyy-MM-dd', { locale: ko }) : '-'}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
                        <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {editForm.client_id ? '최종 납품' : '업로드'} 예정일 (기준일)
                        </label>
                        {isEditing ? (
                          <>
                            <input
                              type="date"
                              value={editForm.release_date || ''}
                              onChange={(e) => handleReleaseDateChange(e.target.value)}
                              className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-red-500 dark:border-red-800 dark:bg-slate-800 dark:text-slate-100"
                            />
                            <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">
                              * 날짜 변경 시 D-Day 역산하여 전체 일정 자동 조정
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {editForm.release_date ? format(parseISO(editForm.release_date), 'yyyy-MM-dd', { locale: ko }) : '-'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 제작 자산 관리 */}
              {editForm.active_steps && editForm.active_steps.length > 0 && (originalProject as any)?.assets && (
                <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                  <label className="mb-3 block text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    제작 자산 관리
                  </label>
                  <div className="space-y-2">
                    {editForm.active_steps.includes('script') && (originalProject as any).assets?.script && (
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">대본 (Script)</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {(originalProject as any).assets.script.version || '미등록'}
                              {(originalProject as any).assets.script.status === 'completed' && ' • 최종확인됨'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {editForm.active_steps.includes('edit') && (originalProject as any).assets?.video && (
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                        <div className="flex items-center gap-3">
                          <PlayCircle className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">최종 편집본 (Master)</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {(originalProject as any).assets.video.version || '편집중'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {isEditing && (
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    name: project.name,
                    cat: project.cat,
                    status: project.status,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    pm_id: project.pm_id || '',
                    projectType: (originalProject as any)?.client_id ? 'external' as 'channel' | 'external' : 'channel' as 'channel' | 'external',
                    channel_id: '',
                    client_id: String((originalProject as any)?.client_id || ''),
                    active_steps: ((originalProject as any)?.active_steps || []) as ProjectStep[],
                    plan_date: (originalProject as any)?.plan_date || null,
                    script_date: (originalProject as any)?.script_date || null,
                    shoot_date: (originalProject as any)?.shoot_date || null,
                    edit1_date: (originalProject as any)?.edit1_date || null,
                    edit_final_date: (originalProject as any)?.edit_final_date || null,
                    release_date: (originalProject as any)?.release_date || null,
                  });
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                취소
              </button>
              <button
                onClick={handleSaveProject}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          )}

          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <label className="mb-3 block text-xs font-semibold text-slate-500 dark:text-slate-400">할일 통계</label>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60">
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">할일</p>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{todoCount}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                <p className="mb-1 text-xs text-blue-600 dark:text-blue-400">진행중</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{inProgressCount}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/30">
                <p className="mb-1 text-xs text-emerald-600 dark:text-emerald-400">완료</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{doneCount}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="mb-3 flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                관련 할일 ({localTasks.length})
              </label>
              {canEdit && (
                <button
                  onClick={() => setIsTaskModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  할일 추가
                </button>
              )}
            </div>
            {localTasks.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {localTasks.map((task) => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
                  const isEditingThisTask = editingTask?.id === task.id;
                  
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'rounded-lg border p-3',
                        isOverdue
                          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60',
                      )}
                    >
                      {isEditingThisTask ? (
                        <TaskEditForm
                          task={editingTask!}
                          users={usersData?.users || []}
                          onSave={(updatedTask) => {
                            handleUpdateTask(updatedTask);
                          }}
                          onCancel={() => setEditingTask(null)}
                        />
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{task.title}</p>
                            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                              {task.assignee ? (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">{task.assignee}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">담당자 미정</span>
                              )}
                              {task.dueDate && (
                                <span className={cn(isOverdue && 'font-semibold text-red-600 dark:text-red-400')}>
                                  마감: {task.dueDate}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-xs font-semibold',
                                task.status === 'done'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : task.status === 'in-progress'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                              )}
                            >
                              {task.status === 'done'
                                ? '완료'
                                : task.status === 'in-progress'
                                  ? '진행중'
                                  : '할일'}
                            </span>
                            {canEdit && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setEditingTask(task)}
                                  className="rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                                  title="수정"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-red-600 dark:hover:bg-slate-700 dark:hover:text-red-400"
                                  title="삭제"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">등록된 할일이 없습니다.</p>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <label className="mb-3 block text-xs font-semibold text-slate-500 dark:text-slate-400">댓글</label>
            <CommentSection entityType="project" entityId={Number(project.id)} />
          </div>
        </div>
      </div>

      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">할일 추가</h3>
              <button
                onClick={() => {
                  setIsTaskModalOpen(false);
                  setNewTaskForm({ title: '', assignee: '', dueDate: '', status: 'todo' });
                }}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">제목</label>
                <input
                  type="text"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="할일 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">담당자</label>
                <input
                  type="text"
                  value={newTaskForm.assignee}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, assignee: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="담당자 이름을 입력하세요"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">마감일</label>
                <input
                  type="date"
                  value={newTaskForm.dueDate}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">상태</label>
                <select
                  value={newTaskForm.status}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, status: e.target.value as 'todo' | 'in-progress' | 'done' })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="todo">할일</option>
                  <option value="in-progress">진행중</option>
                  <option value="done">완료</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    setIsTaskModalOpen(false);
                    setNewTaskForm({ title: '', assignee: '', dueDate: '', status: 'todo' });
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateTask}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskEditForm({
  task,
  users,
  onSave,
  onCancel,
}: {
  task: TaskItem;
  users: any[];
  onSave: (task: TaskItem) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<{
    title: string;
    assignee: string;
    dueDate: string;
    status: 'todo' | 'in-progress' | 'done';
  }>({
    title: task.title,
    assignee: task.assignee,
    dueDate: task.dueDate,
    status: task.status,
  });

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">제목</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">담당자</label>
        <input
          type="text"
          value={form.assignee}
          onChange={(e) => setForm({ ...form, assignee: e.target.value })}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">마감일</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">상태</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as 'todo' | 'in-progress' | 'done' })}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="todo">할일</option>
            <option value="in-progress">진행중</option>
            <option value="done">완료</option>
          </select>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          취소
        </button>
        <button
          onClick={() => onSave({ ...task, ...form })}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          저장
        </button>
      </div>
    </div>
  );
}

