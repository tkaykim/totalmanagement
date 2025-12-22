'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  BarChart3,
  Bell,
  BookOpen,
  ChartLine,
  Check,
  CheckSquare,
  Coins,
  DollarSign,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Users,
  X,
  Pencil,
  Trash2,
  LogOut,
  ArrowLeft,
  UserCircle,
  Building2,
  Briefcase,
  Wrench,
  MapPin,
  UserCog,
  Settings,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format, isWithinInterval, parseISO, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import { cn, slugToBu } from '@/lib/utils';
import {
  useProjects,
  useTasks,
  useFinancialEntries,
  useCreateProject,
  useCreateTask,
  useCreateFinancialEntry,
  useUpdateTask,
  useUpdateProject,
  useDeleteProject,
  useUpdateFinancialEntry,
  useOrgMembers,
  useUsers,
} from '@/features/erp/hooks';
import {
  dbProjectToFrontend,
  dbTaskToFrontend,
  dbFinancialToFrontend,
  frontendProjectToDb,
  frontendTaskToDb,
  frontendFinancialToDb,
} from '@/features/erp/utils';
import type { BU } from '@/types/database';

type View = 
  | 'dashboard' 
  | 'projects' 
  | 'settlement' 
  | 'tasks'
  | 'artists'      // 소속 아티스트 관리 (GRIGO)
  | 'vendors'      // 거래처 관리 (공통)
  | 'outsourcing'  // 외주 관리 (GRIGO, REACT)
  | 'equipment'    // 장비 관리 (REACT)
  | 'venues'       // 공연장 관리 (FLOW)
  | 'staff'        // 스태프 관리 (FLOW)
  | 'creators'     // 크리에이터 관리 (AST)
  | 'pricing';     // 단가 설정 (MODOO)

type Project = {
  id: string;
  bu: BU;
  name: string;
  cat: string;
  startDate: string;
  endDate: string;
  status: string;
};

type FinancialEntryStatus = 'planned' | 'paid' | 'canceled';

type FinancialEntry = {
  id: string;
  projectId: string;
  bu: BU;
  type: 'revenue' | 'expense';
  category: string;
  name: string;
  amount: number;
  date: string;
  status: FinancialEntryStatus;
};

type TaskItem = {
  id: string;
  bu: BU;
  projectId: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: 'todo' | 'in-progress' | 'done';
};

const BU_TITLES: Record<BU, string> = {
  GRIGO: '그리고 엔터',
  REACT: '리액트 스튜디오',
  FLOW: '플로우메이커',
  AST: '아스트 컴퍼니',
  MODOO: '모두굿즈',
  HEAD: '본사',
};

const BU_LABELS: Record<BU, string> = {
  GRIGO: 'GRIGO',
  REACT: 'REACT',
  FLOW: 'FLOW',
  AST: 'AST',
  MODOO: 'MODOO',
  HEAD: 'HEAD',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

function isDateInRange(date: string, start?: string, end?: string): boolean {
  if (!start && !end) return true;
  const dateObj = parseISO(date);
  if (start && end) {
    return isWithinInterval(dateObj, { start: parseISO(start), end: parseISO(end) });
  }
  if (start) {
    return dateObj >= parseISO(start);
  }
  if (end) {
    return dateObj <= parseISO(end);
  }
  return true;
}

function StatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-tight text-slate-500">{title}</p>
        <div className={cn('rounded-full bg-slate-100 p-2', accent)}>{icon}</div>
      </div>
      <p className={cn('text-2xl font-black', accent)}>{formatCurrency(value)}</p>
    </div>
  );
}

function QuickAction({
  title,
  icon,
  onClick,
}: {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </div>
      <span className="text-sm font-semibold text-slate-800">{title}</span>
    </button>
  );
}

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
          ? 'bg-white text-blue-600 shadow-sm'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white',
      )}
    >
      <span className="w-5 text-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function DashboardView({
  totals,
  tasks,
  projects,
  bu,
}: {
  totals: { totalRev: number; totalExp: number; totalProfit: number };
  tasks: TaskItem[];
  projects: Project[];
  bu: BU;
}) {
  const buProjects = projects.filter((p) => p.bu === bu);
  const buTasks = tasks.filter((t) => t.bu === bu);

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="선택 기간 총 매출"
          value={totals.totalRev}
          icon={<DollarSign className="h-5 w-5 text-blue-500" />}
          accent="text-blue-600"
        />
        <StatCard
          title="선택 기간 총 지출"
          value={totals.totalExp}
          icon={<Coins className="h-5 w-5 text-red-500" />}
          accent="text-red-500"
        />
        <StatCard
          title="선택 기간 순이익"
          value={totals.totalProfit}
          icon={<ChartLine className="h-5 w-5 text-emerald-500" />}
          accent="text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-slate-800">프로젝트 현황</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-tight text-slate-400">
                  {BU_LABELS[bu]}
                </p>
                <p className="text-sm font-black text-slate-800">{BU_TITLES[bu]}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {buProjects.length} Active Projects
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-blue-600">
                  {formatCurrency(
                    buProjects.reduce((sum, p) => {
                      // 프로젝트별 매출/지출 계산은 실제 데이터에서 가져와야 함
                      return sum;
                    }, 0),
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
          <div className="mb-4 sm:mb-6 flex items-center gap-2">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
            <h3 className="text-base sm:text-lg font-bold text-slate-800">최근 업무 현황</h3>
          </div>
          <div className="space-y-3">
            {buTasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">
                    {task.assignee[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                      {task.title}
                    </p>
                    <p className="mt-1 text-[9px] sm:text-[10px] text-slate-400 truncate">
                      {task.assignee} •{' '}
                      {projects.find((p) => p.id === task.projectId)?.name ?? '미지정 프로젝트'} •{' '}
                      {task.dueDate}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-900 px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight text-white whitespace-nowrap flex-shrink-0">
                  {task.status === 'todo' ? 'TODO' : task.status === 'in-progress' ? 'IN PROGRESS' : 'DONE'}
                </span>
              </div>
            ))}
            {buTasks.length === 0 && (
              <div className="text-center py-8 text-sm text-slate-400">
                등록된 할일이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectsView({
  bu,
  projects,
  revenues,
  expenses,
  onOpenModal,
  onOpenTaskModal,
  onEditFinance,
  onEditTask,
  onEditProject,
  onDeleteProject,
  tasks,
}: {
  bu: BU;
  projects: Project[];
  revenues: FinancialEntry[];
  expenses: FinancialEntry[];
  onOpenModal: (id: string) => void;
  onOpenTaskModal: (projectId: string) => void;
  onEditFinance: (entry: FinancialEntry) => void;
  onEditTask: (task: TaskItem) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  tasks: TaskItem[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const buProjects = projects.filter((p) => p.bu === bu);

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        {buProjects.length === 0 ? (
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="px-4 sm:px-6 py-8 sm:py-12 text-center">
              <p className="text-xs sm:text-sm font-semibold text-slate-400">
                현재 진행중인 프로젝트가 없습니다.
              </p>
            </div>
          </div>
        ) : (
          buProjects.map((p) => {
            const projectTasks = tasks.filter((t) => t.projectId === p.id);
            const projectRevenues = revenues.filter((r) => r.projectId === p.id);
            const projectExpenses = expenses.filter((e) => e.projectId === p.id);
            const revTotal = projectRevenues.reduce((sum, r) => sum + r.amount, 0);
            const expTotal = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
            const profit = revTotal - expTotal;
            const opened = openId === p.id;

            return (
              <div
                key={p.id}
                className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
                  <button
                    onClick={() => setOpenId(opened ? null : p.id)}
                    className="flex flex-1 items-center justify-between text-left"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{p.name}</p>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-slate-600 whitespace-nowrap">
                          {p.cat}
                        </span>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-emerald-700 whitespace-nowrap">
                          할일 {projectTasks.length}개
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {p.startDate} ~ {p.endDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                      <div className="text-right text-[9px] sm:text-[11px]">
                        <p className="font-semibold text-blue-600 whitespace-nowrap">{formatCurrency(revTotal)}</p>
                        <p className="text-red-500 whitespace-nowrap">- {formatCurrency(expTotal)}</p>
                        <p className="font-semibold text-emerald-600 whitespace-nowrap">
                          {profit >= 0 ? '+' : ''}
                          {formatCurrency(profit)}
                        </p>
                      </div>
                      <span className="text-[10px] sm:text-xs text-slate-400 whitespace-nowrap">
                        {opened ? '접기 ▲' : '펼치기 ▼'}
                      </span>
                    </div>
                  </button>
                  <div className="ml-2 sm:ml-4 flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditProject(p);
                      }}
                      className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-blue-600"
                      title="프로젝트 수정"
                    >
                      <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(p.id);
                      }}
                      className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-red-600"
                      title="프로젝트 삭제"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </div>
                {opened && (
                  <div className="border-t border-slate-100 px-3 sm:px-6 py-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800">프로젝트 상세</h4>
                      <button
                        onClick={() => onOpenTaskModal(p.id)}
                        className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] sm:text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                      >
                        <Plus className="h-3 w-3" />
                        할일 추가
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-2">매출 내역</p>
                        <div className="space-y-2">
                          {projectRevenues.length === 0 ? (
                            <p className="text-[10px] text-slate-400">등록된 매출이 없습니다.</p>
                          ) : (
                            projectRevenues.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] sm:text-xs font-semibold text-slate-800 truncate">
                                    {r.name}
                                  </p>
                                  <p className="text-[9px] text-slate-400">{r.category} • {r.date}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <p className="text-[10px] sm:text-xs font-bold text-blue-600">
                                    {formatCurrency(r.amount)}
                                  </p>
                                  <button
                                    onClick={() => onEditFinance(r)}
                                    className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-2">지출 내역</p>
                        <div className="space-y-2">
                          {projectExpenses.length === 0 ? (
                            <p className="text-[10px] text-slate-400">등록된 지출이 없습니다.</p>
                          ) : (
                            projectExpenses.map((e) => (
                              <div
                                key={e.id}
                                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] sm:text-xs font-semibold text-slate-800 truncate">
                                    {e.name}
                                  </p>
                                  <p className="text-[9px] text-slate-400">{e.category} • {e.date}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <p className="text-[10px] sm:text-xs font-bold text-red-600">
                                    {formatCurrency(e.amount)}
                                  </p>
                                  <button
                                    onClick={() => onEditFinance(e)}
                                    className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-2">할일 목록</p>
                      <div className="space-y-2">
                        {projectTasks.length === 0 ? (
                          <p className="text-[10px] text-slate-400">등록된 할일이 없습니다.</p>
                        ) : (
                          projectTasks.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-xs font-semibold text-slate-800 truncate">
                                  {t.title}
                                </p>
                                <p className="text-[9px] text-slate-400">{t.assignee} • {t.dueDate}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight text-white">
                                  {t.status === 'todo' ? 'TODO' : t.status === 'in-progress' ? 'IN PROGRESS' : 'DONE'}
                                </span>
                                <button
                                  onClick={() => onEditTask(t)}
                                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function TasksView({
  bu,
  tasks,
  projects,
  onStatusChange,
  onEditTask,
}: {
  bu: BU;
  tasks: TaskItem[];
  projects: Project[];
  onStatusChange: (taskId: string, status: TaskItem['status']) => void;
  onEditTask: (task: TaskItem) => void;
}) {
  const buTasks = tasks.filter((t) => t.bu === bu);
  const todoTasks = buTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = buTasks.filter((t) => t.status === 'in-progress');
  const doneTasks = buTasks.filter((t) => t.status === 'done');

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">할 일</h3>
          <div className="space-y-3">
            {todoTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 cursor-pointer transition hover:border-blue-200"
                onClick={() => onEditTask(task)}
              >
                <p className="text-xs font-bold text-slate-800">{task.title}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {task.assignee} • {projects.find((p) => p.id === task.projectId)?.name ?? '미지정'} • {task.dueDate}
                </p>
              </div>
            ))}
            {todoTasks.length === 0 && (
              <p className="text-center py-4 text-[10px] text-slate-400">할 일이 없습니다.</p>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">진행 중</h3>
          <div className="space-y-3">
            {inProgressTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 cursor-pointer transition hover:border-blue-200"
                onClick={() => onEditTask(task)}
              >
                <p className="text-xs font-bold text-slate-800">{task.title}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {task.assignee} • {projects.find((p) => p.id === task.projectId)?.name ?? '미지정'} • {task.dueDate}
                </p>
              </div>
            ))}
            {inProgressTasks.length === 0 && (
              <p className="text-center py-4 text-[10px] text-slate-400">진행 중인 작업이 없습니다.</p>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">완료</h3>
          <div className="space-y-3">
            {doneTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 cursor-pointer transition hover:border-blue-200"
                onClick={() => onEditTask(task)}
              >
                <p className="text-xs font-bold text-slate-800">{task.title}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {task.assignee} • {projects.find((p) => p.id === task.projectId)?.name ?? '미지정'} • {task.dueDate}
                </p>
              </div>
            ))}
            {doneTasks.length === 0 && (
              <p className="text-center py-4 text-[10px] text-slate-400">완료된 작업이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-100 bg-white p-12 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Settings className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-800">{title}</h3>
          <p className="text-sm text-slate-500">이 기능은 곧 구현될 예정입니다.</p>
        </div>
      </div>
    </section>
  );
}

function SettlementView({
  bu,
  rows,
  projects,
  onEditFinance,
}: {
  bu: BU;
  rows: { revRows: FinancialEntry[]; expRows: FinancialEntry[] };
  projects: Project[];
  onEditFinance: (entry: FinancialEntry) => void;
}) {
  const buProjectIds = projects.filter((p) => p.bu === bu).map((p) => p.id);
  const revRows = rows.revRows.filter((r) => buProjectIds.includes(r.projectId));
  const expRows = rows.expRows.filter((e) => buProjectIds.includes(e.projectId));

  const totalRevenue = revRows.reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = expRows.reduce((sum, e) => sum + e.amount, 0);
  const totalProfit = totalRevenue - totalExpense;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="총 매출"
          value={totalRevenue}
          icon={<DollarSign className="h-5 w-5 text-blue-500" />}
          accent="text-blue-600"
        />
        <StatCard
          title="총 지출"
          value={totalExpense}
          icon={<Coins className="h-5 w-5 text-red-500" />}
          accent="text-red-500"
        />
        <StatCard
          title="순이익"
          value={totalProfit}
          icon={<ChartLine className="h-5 w-5 text-emerald-500" />}
          accent="text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">매출 내역</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {revRows.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-400">등록된 매출이 없습니다.</p>
            ) : (
              revRows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{r.name}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {projects.find((p) => p.id === r.projectId)?.name ?? '미지정'} • {r.category} • {r.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-sm font-bold text-blue-600">{formatCurrency(r.amount)}</p>
                    <button
                      onClick={() => onEditFinance(r)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">지출 내역</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {expRows.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-400">등록된 지출이 없습니다.</p>
            ) : (
              expRows.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{e.name}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {projects.find((p) => p.id === e.projectId)?.name ?? '미지정'} • {e.category} • {e.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-sm font-bold text-red-600">{formatCurrency(e.amount)}</p>
                    <button
                      onClick={() => onEditFinance(e)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function BusinessUnitPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const bu = slugToBu(slug);

  const [view, setView] = useState<View>('dashboard');
  const [periodType, setPeriodType] = useState<'all' | 'year' | 'quarter' | 'month' | 'custom'>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [selectedQuarterYear, setSelectedQuarterYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [customRange, setCustomRange] = useState<{ start?: string; end?: string }>({});
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  if (!bu) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-800">잘못된 사업부입니다.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const { data: projectsData = [], isLoading: projectsLoading } = useProjects();
  const { data: tasksData = [] } = useTasks(bu);
  const { data: orgData = [] } = useOrgMembers();
  const { data: usersData } = useUsers();

  const projects = useMemo(() => projectsData.map(dbProjectToFrontend), [projectsData]);
  const tasks = useMemo(() => tasksData.map(dbTaskToFrontend), [tasksData]);

  const createProjectMutation = useCreateProject();
  const createTaskMutation = useCreateTask();
  const createFinancialMutation = useCreateFinancialEntry();
  const updateTaskMutation = useUpdateTask();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const updateFinancialMutation = useUpdateFinancialEntry();

  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [isFinanceModalOpen, setFinanceModalOpen] = useState<null | 'revenue' | 'expense'>(null);
  const [isEditFinanceModalOpen, setEditFinanceModalOpen] = useState<FinancialEntry | null>(null);
  const [isEditTaskModalOpen, setEditTaskModalOpen] = useState<TaskItem | null>(null);
  const [isEditProjectModalOpen, setEditProjectModalOpen] = useState<Project | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [modalProjectId, setModalProjectId] = useState<string | null>(null);
  const [taskModalProjectId, setTaskModalProjectId] = useState<string | undefined>(undefined);
  const [formState, setFormState] = useState<{
    type: 'revenue' | 'expense';
    cat: string;
    name: string;
    amount: string;
    date: string;
  }>({
    type: 'revenue',
    cat: '',
    name: '',
    amount: '',
    date: '',
  });
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: appUser } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', user.id)
        .single();

      // 해당 사업부가 아니고 본사도 아닌 경우 접근 불가
      if (bu && appUser?.bu_code && appUser.bu_code !== bu && appUser.bu_code !== 'HEAD') {
        // 본인 사업부 ERP로 리디렉션
        if (appUser.bu_code === 'AST') {
          router.push('/astcompany');
        } else if (appUser.bu_code === 'GRIGO') {
          router.push('/grigoent');
        } else if (appUser.bu_code === 'REACT') {
          router.push('/reactstudio');
        } else if (appUser.bu_code === 'FLOW') {
          router.push('/flow');
        } else if (appUser.bu_code === 'MODOO') {
          router.push('/modoo');
        }
        return;
      }

      setUser({ ...user, profile: appUser });
      setLoading(false);
    };

    checkUser();
  }, [router, bu]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const activePeriod = useMemo(() => {
    if (periodType === 'all') {
      return { start: undefined, end: undefined };
    }
    
    if (periodType === 'custom') {
      return { start: customRange.start, end: customRange.end };
    }
    
    if (periodType === 'year') {
      const yearStart = format(startOfYear(new Date(selectedYear, 0, 1)), 'yyyy-MM-dd');
      const yearEnd = format(endOfYear(new Date(selectedYear, 11, 31)), 'yyyy-MM-dd');
      return { start: yearStart, end: yearEnd };
    }
    
    if (periodType === 'quarter') {
      const startMonth = (selectedQuarter - 1) * 3;
      const endMonth = selectedQuarter * 3 - 1;
      const quarterStart = format(new Date(selectedQuarterYear, startMonth, 1), 'yyyy-MM-dd');
      const quarterEnd = format(new Date(selectedQuarterYear, endMonth + 1, 0), 'yyyy-MM-dd');
      return { start: quarterStart, end: quarterEnd };
    }
    
    if (periodType === 'month') {
      const monthStart = format(startOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd');
      return { start: monthStart, end: monthEnd };
    }
    
    return { start: undefined, end: undefined };
  }, [periodType, selectedYear, selectedQuarter, selectedQuarterYear, selectedMonth, customRange.start, customRange.end]);

  const { data: financialData = [] } = useFinancialEntries({
    startDate: activePeriod.start,
    endDate: activePeriod.end,
  });

  const allFinancial = useMemo(() => financialData.map(dbFinancialToFrontend) as FinancialEntry[], [financialData]);
  const revenues = useMemo(() => allFinancial.filter((f) => f.type === 'revenue'), [allFinancial]);
  const expenses = useMemo(() => allFinancial.filter((f) => f.type === 'expense'), [allFinancial]);

  const filteredRevenues = revenues;
  const filteredExpenses = expenses;

  const totals = useMemo(() => {
    const buProjectIds = projects.filter((p) => p.bu === bu).map((p) => p.id);
    const totalRev = filteredRevenues
      .filter((r) => buProjectIds.includes(r.projectId))
      .reduce((sum, r) => sum + r.amount, 0);
    const totalExp = filteredExpenses
      .filter((e) => buProjectIds.includes(e.projectId))
      .reduce((sum, e) => sum + e.amount, 0);
    return { totalRev, totalExp, totalProfit: totalRev - totalExp };
  }, [bu, filteredExpenses, filteredRevenues, projects]);

  const currentProjects = useMemo(
    () => projects.filter((p) => p.bu === bu),
    [bu, projects],
  );

  const settlementRows = useMemo(() => {
    const buProjectIds = projects.filter((p) => p.bu === bu).map((p) => p.id);
    const revRows = filteredRevenues.filter((r) => buProjectIds.includes(r.projectId));
    const expRows = filteredExpenses.filter((e) => buProjectIds.includes(e.projectId));
    return { revRows, expRows };
  }, [bu, filteredExpenses, filteredRevenues, projects]);

  const handlePeriodTypeChange = (type: 'all' | 'year' | 'quarter' | 'month' | 'custom') => {
    setPeriodType(type);
    if (type !== 'custom') {
      setCustomRange({ start: undefined, end: undefined });
    }
  };

  const handleDateChange = (key: 'start' | 'end', value: string) => {
    setCustomRange((prev) => ({ ...prev, [key]: value }));
  };

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 2021 + 1 }, (_, i) => 2021 + i).reverse();
  }, []);

  const handleCreateProject = async (payload: {
    name: string;
    cat: string;
    startDate: string;
    endDate: string;
    status: string;
  }) => {
    try {
      const dbData = frontendProjectToDb({
        ...payload,
        bu,
      });
      await createProjectMutation.mutateAsync(dbData);
      setProjectModalOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleCreateTask = async (payload: {
    projectId: string;
    title: string;
    assignee: string;
    dueDate: string;
    status: TaskItem['status'];
  }) => {
    try {
      const dbData = frontendTaskToDb({
        ...payload,
        bu,
      });
      await createTaskMutation.mutateAsync(dbData);
      setTaskModalOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleCreateFinance = async (payload: {
    type: 'revenue' | 'expense';
    projectId: string;
    cat: string;
    name: string;
    amount: string;
    date: string;
    status: FinancialEntryStatus;
  }) => {
    try {
      const dbData = frontendFinancialToDb({
        ...payload,
        amount: Number(payload.amount),
        bu,
      });
      await createFinancialMutation.mutateAsync(dbData);
      setFinanceModalOpen(null);
    } catch (error) {
      console.error('Failed to create financial entry:', error);
    }
  };

  const handleUpdateFinance = async (payload: {
    id: string;
    type: 'revenue' | 'expense';
    projectId: string;
    cat: string;
    name: string;
    amount: string;
    date: string;
    status: FinancialEntryStatus;
  }) => {
    try {
      const dbData = {
        kind: payload.type,
        category: payload.cat,
        name: payload.name,
        amount: Number(payload.amount),
        occurred_at: payload.date,
        status: payload.status,
      };
      await updateFinancialMutation.mutateAsync({ id: Number(payload.id), data: dbData });
      setEditFinanceModalOpen(null);
    } catch (error) {
      console.error('Failed to update financial entry:', error);
    }
  };

  const handleUpdateTask = async (payload: {
    id: string;
    title: string;
    projectId: string;
    assignee: string;
    dueDate: string;
    status: TaskItem['status'];
  }) => {
    try {
      const dbData = frontendTaskToDb({
        ...payload,
        bu,
      });
      await updateTaskMutation.mutateAsync({ id: Number(payload.id), data: dbData });
      setEditTaskModalOpen(null);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleUpdateProject = async (payload: {
    id: string;
    name: string;
    cat: string;
    startDate: string;
    endDate: string;
    status: string;
  }) => {
    try {
      const dbData = {
        name: payload.name,
        category: payload.cat,
        start_date: payload.startDate,
        end_date: payload.endDate,
        status: payload.status,
      };
      await updateProjectMutation.mutateAsync({ id: Number(payload.id), data: dbData });
      setEditProjectModalOpen(null);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
      try {
        await deleteProjectMutation.mutateAsync(Number(id));
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 mx-auto" />
          <p className="text-sm text-slate-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden h-screen w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-white lg:flex">
        <div className="p-8">
          <div className="text-left">
            <p className="text-xl font-bold tracking-tighter text-blue-300">{BU_TITLES[bu]}</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
              Business Unit Dashboard
            </p>
          </div>
          {user?.profile?.bu_code === 'HEAD' && (
            <button
              onClick={() => router.push('/')}
              className="mt-4 w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-700 transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-sm font-medium">통합 ERP로 이동</span>
            </button>
          )}
        </div>
        <nav className="flex-1 space-y-2 px-4 overflow-y-auto">
          <SidebarButton
            label="대시보드"
            icon={<LayoutDashboard className="h-4 w-4" />}
            active={view === 'dashboard'}
            onClick={() => setView('dashboard')}
          />
          <SidebarButton
            label="프로젝트 관리"
            icon={<FolderKanban className="h-4 w-4" />}
            active={view === 'projects'}
            onClick={() => setView('projects')}
          />
          <SidebarButton
            label="정산 관리"
            icon={<Coins className="h-4 w-4" />}
            active={view === 'settlement'}
            onClick={() => setView('settlement')}
          />
          <SidebarButton
            label="할일 관리"
            icon={<CheckSquare className="h-4 w-4" />}
            active={view === 'tasks'}
            onClick={() => setView('tasks')}
          />
          
          {/* 그리고엔터 (GRIGO) 전용 탭 */}
          {bu === 'GRIGO' && (
            <>
              <div className="my-4 border-t border-slate-700"></div>
              <SidebarButton
                label="소속 아티스트 관리"
                icon={<UserCircle className="h-4 w-4" />}
                active={view === 'artists'}
                onClick={() => setView('artists')}
              />
              <SidebarButton
                label="거래처 관리"
                icon={<Building2 className="h-4 w-4" />}
                active={view === 'vendors'}
                onClick={() => setView('vendors')}
              />
              <SidebarButton
                label="외주 관리"
                icon={<Briefcase className="h-4 w-4" />}
                active={view === 'outsourcing'}
                onClick={() => setView('outsourcing')}
              />
            </>
          )}

          {/* 리액트 스튜디오 (REACT) 전용 탭 */}
          {bu === 'REACT' && (
            <>
              <div className="my-4 border-t border-slate-700"></div>
              <SidebarButton
                label="장비 관리"
                icon={<Wrench className="h-4 w-4" />}
                active={view === 'equipment'}
                onClick={() => setView('equipment')}
              />
              <SidebarButton
                label="외주 관리"
                icon={<Briefcase className="h-4 w-4" />}
                active={view === 'outsourcing'}
                onClick={() => setView('outsourcing')}
              />
            </>
          )}

          {/* 플로우메이커 (FLOW) 전용 탭 */}
          {bu === 'FLOW' && (
            <>
              <div className="my-4 border-t border-slate-700"></div>
              <SidebarButton
                label="공연장 관리"
                icon={<MapPin className="h-4 w-4" />}
                active={view === 'venues'}
                onClick={() => setView('venues')}
              />
              <SidebarButton
                label="거래처 관리"
                icon={<Building2 className="h-4 w-4" />}
                active={view === 'vendors'}
                onClick={() => setView('vendors')}
              />
              <SidebarButton
                label="스태프 관리"
                icon={<UserCog className="h-4 w-4" />}
                active={view === 'staff'}
                onClick={() => setView('staff')}
              />
            </>
          )}

          {/* 아스트 컴퍼니 (AST) 전용 탭 */}
          {bu === 'AST' && (
            <>
              <div className="my-4 border-t border-slate-700"></div>
              <SidebarButton
                label="크리에이터 관리"
                icon={<UserCircle className="h-4 w-4" />}
                active={view === 'creators'}
                onClick={() => setView('creators')}
              />
              <SidebarButton
                label="거래처 관리"
                icon={<Building2 className="h-4 w-4" />}
                active={view === 'vendors'}
                onClick={() => setView('vendors')}
              />
            </>
          )}

          {/* 모두굿즈 (MODOO) 전용 탭 */}
          {bu === 'MODOO' && (
            <>
              <div className="my-4 border-t border-slate-700"></div>
              <SidebarButton
                label="거래처 관리"
                icon={<Building2 className="h-4 w-4" />}
                active={view === 'vendors'}
                onClick={() => setView('vendors')}
              />
              <SidebarButton
                label="단가 설정"
                icon={<Settings className="h-4 w-4" />}
                active={view === 'pricing'}
                onClick={() => setView('pricing')}
              />
            </>
          )}
        </nav>
        <div className="mt-auto p-6 pt-0">
          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4">
            <p className="mb-1 text-[10px] uppercase tracking-tighter text-slate-500">
              Signed in as
            </p>
            <p className="text-sm font-semibold text-blue-100">
              {user?.profile?.name || user?.email || '사용자'}
            </p>
            {user?.profile?.position && (
              <p className="mt-1 text-[10px] text-slate-400">{user.profile.position}</p>
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
        <header className="sticky top-0 z-20 flex h-24 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur">
          <div>
            <div className="flex items-center gap-3">
              {user?.profile?.bu_code === 'HEAD' && (
                <button
                  onClick={() => router.push('/')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <h2 className="text-lg font-bold text-slate-800">
                {view === 'dashboard'
                  ? '대시보드'
                  : view === 'projects'
                    ? '프로젝트 관리'
                    : view === 'settlement'
                      ? '정산 관리'
                      : view === 'tasks'
                        ? '할일 관리'
                        : view === 'artists'
                          ? '소속 아티스트 관리'
                          : view === 'vendors'
                            ? '거래처 관리'
                            : view === 'outsourcing'
                              ? '외주 관리'
                              : view === 'equipment'
                                ? '장비 관리'
                                : view === 'venues'
                                  ? '공연장 관리'
                                  : view === 'staff'
                                    ? '스태프 관리'
                                    : view === 'creators'
                                      ? '크리에이터 관리'
                                      : view === 'pricing'
                                        ? '단가 설정'
                                        : '관리'}
              </h2>
            </div>
            <div className="mt-2 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePeriodTypeChange('all')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                    periodType === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  전체 기간
                </button>
                <button
                  onClick={() => handlePeriodTypeChange('year')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                    periodType === 'year'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  연도
                </button>
                <button
                  onClick={() => handlePeriodTypeChange('quarter')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                    periodType === 'quarter'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  분기
                </button>
                <button
                  onClick={() => handlePeriodTypeChange('month')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                    periodType === 'month'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  월별
                </button>
                <button
                  onClick={() => handlePeriodTypeChange('custom')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                    periodType === 'custom'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  직접선택
                </button>
              </div>

              {periodType === 'year' && (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-slate-600">연도:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}년
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {periodType === 'quarter' && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-600">연도:</label>
                    <select
                      value={selectedQuarterYear}
                      onChange={(e) => setSelectedQuarterYear(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}년
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-600">분기:</label>
                    <select
                      value={selectedQuarter}
                      onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>1분기 (1-3월)</option>
                      <option value={2}>2분기 (4-6월)</option>
                      <option value={3}>3분기 (7-9월)</option>
                      <option value={4}>4분기 (10-12월)</option>
                    </select>
                  </div>
                </div>
              )}

              {periodType === 'month' && (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-slate-600">월:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>
                        {month}월
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}년
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {periodType === 'custom' && (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-slate-600">시작일:</label>
                  <input
                    type="date"
                    value={customRange.start ?? ''}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]"
                  />
                  <label className="text-[11px] font-semibold text-slate-600">종료일:</label>
                  <input
                    type="date"
                    value={customRange.end ?? ''}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              <span className="text-[11px] font-bold uppercase tracking-tight text-blue-700">
                {BU_TITLES[bu]} Dashboard
              </span>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 transition hover:bg-slate-200">
              <Bell className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl px-4 py-8 space-y-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <QuickAction
              title="프로젝트 등록"
              icon={<FolderKanban className="h-4 w-4" />}
              onClick={() => setProjectModalOpen(true)}
            />
            <QuickAction
              title="할 일 등록"
              icon={<Check className="h-4 w-4" />}
              onClick={() => {
                setTaskModalProjectId(currentProjects[0]?.id);
                setTaskModalOpen(true);
              }}
            />
            <QuickAction
              title="매출 등록"
              icon={<DollarSign className="h-4 w-4" />}
              onClick={() => setFinanceModalOpen('revenue')}
            />
            <QuickAction
              title="지출 등록"
              icon={<Coins className="h-4 w-4" />}
              onClick={() => setFinanceModalOpen('expense')}
            />
          </div>

          {view === 'dashboard' && (
            <DashboardView totals={totals} tasks={tasks} projects={projects} bu={bu} />
          )}
          {view === 'projects' && (
            <ProjectsView
              bu={bu}
              projects={projects}
              revenues={filteredRevenues}
              expenses={filteredExpenses}
              onOpenModal={(id) => setModalProjectId(id)}
              onOpenTaskModal={(projectId) => {
                setTaskModalProjectId(projectId);
                setTaskModalOpen(true);
              }}
              onEditFinance={(entry) => setEditFinanceModalOpen(entry)}
              onEditTask={(task) => setEditTaskModalOpen(task)}
              onEditProject={(project) => setEditProjectModalOpen(project)}
              onDeleteProject={handleDeleteProject}
              tasks={tasks}
            />
          )}
          {view === 'settlement' && (
            <SettlementView
              bu={bu}
              rows={settlementRows}
              projects={projects}
              onEditFinance={(entry) => setEditFinanceModalOpen(entry)}
            />
          )}
          {view === 'tasks' && (
            <TasksView
              bu={bu}
              tasks={tasks}
              projects={projects}
              onStatusChange={(taskId, status) => {
                const task = tasks.find((t) => t.id === taskId);
                if (task) {
                  handleUpdateTask({
                    id: taskId,
                    title: task.title,
                    projectId: task.projectId,
                    assignee: task.assignee,
                    dueDate: task.dueDate,
                    status,
                  });
                }
              }}
              onEditTask={(task) => setEditTaskModalOpen(task)}
            />
          )}
          {view === 'artists' && <PlaceholderView title="소속 아티스트 관리" />}
          {view === 'vendors' && <PlaceholderView title="거래처 관리" />}
          {view === 'outsourcing' && <PlaceholderView title="외주 관리" />}
          {view === 'equipment' && <PlaceholderView title="장비 관리" />}
          {view === 'venues' && <PlaceholderView title="공연장 관리" />}
          {view === 'staff' && <PlaceholderView title="스태프 관리" />}
          {view === 'creators' && <PlaceholderView title="크리에이터 관리" />}
          {view === 'pricing' && <PlaceholderView title="단가 설정" />}
        </div>
      </main>

      {/* Modals */}
      {isProjectModalOpen && (
        <CreateProjectModal
          onClose={() => setProjectModalOpen(false)}
          onSubmit={handleCreateProject}
          defaultBu={bu}
        />
      )}
      {isEditProjectModalOpen && (
        <EditProjectModal
          project={isEditProjectModalOpen}
          onClose={() => setEditProjectModalOpen(null)}
          onSubmit={handleUpdateProject}
        />
      )}
      {isTaskModalOpen && (
        <CreateTaskModal
          onClose={() => setTaskModalOpen(false)}
          onSubmit={async (payload) => {
            await handleCreateTask({
              ...payload,
              status: 'todo',
            });
          }}
          defaultBu={bu}
          projects={currentProjects}
          defaultProjectId={taskModalProjectId}
          orgData={orgData}
          usersData={usersData}
        />
      )}
      {isEditTaskModalOpen && (
        <EditTaskModal
          task={isEditTaskModalOpen}
          onClose={() => setEditTaskModalOpen(null)}
          onSubmit={handleUpdateTask}
          projects={projects}
          orgData={orgData}
          usersData={usersData}
        />
      )}
      {isFinanceModalOpen && (
        <CreateFinanceModal
          mode={isFinanceModalOpen}
          onClose={() => setFinanceModalOpen(null)}
          onSubmit={async (payload) => {
            await handleCreateFinance(payload);
          }}
          projects={currentProjects}
        />
      )}
      {isEditFinanceModalOpen && (
        <EditFinanceModal
          entry={isEditFinanceModalOpen}
          onClose={() => setEditFinanceModalOpen(null)}
          onSubmit={handleUpdateFinance}
          projects={projects}
        />
      )}
    </div>
  );
}

// Modal Components
function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-container active fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  if (type === 'date') {
    return (
      <label className="space-y-1 text-sm font-semibold text-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{label}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded transition',
              value === '' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            )}
          >
            미정
          </button>
        </div>
        <input
          type="date"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
        />
      </label>
    );
  }
  
  return (
    <label className="space-y-1 text-sm font-semibold text-slate-700">
      <span className="text-xs text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-1 text-sm font-semibold text-slate-700">
      <span className="text-xs text-slate-500">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.value === '__PLACEHOLDER__'}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModalActions({
  onPrimary,
  onClose,
  primaryLabel,
}: {
  onPrimary: () => void;
  onClose: () => void;
  primaryLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button
        onClick={onClose}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
      >
        닫기
      </button>
      <button
        onClick={onPrimary}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        {primaryLabel}
      </button>
    </div>
  );
}

function CreateProjectModal({
  onClose,
  onSubmit,
  defaultBu,
}: {
  onClose: () => void;
  onSubmit: (payload: { name: string; cat: string; startDate: string; endDate: string; status: string }) => void;
  defaultBu: BU;
}) {
  const [form, setForm] = useState({
    name: '',
    cat: '',
    startDate: '',
    endDate: '',
    status: '준비중',
  });

  return (
    <ModalShell title="프로젝트 등록" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="카테고리"
          placeholder="예: 안무제작"
          value={form.cat}
          onChange={(v) => setForm((prev) => ({ ...prev, cat: v }))}
        />
        <InputField
          label="프로젝트명"
          placeholder="프로젝트 이름"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <InputField
            label="시작일"
            type="date"
            value={form.startDate}
            onChange={(v) => setForm((prev) => ({ ...prev, startDate: v }))}
          />
          <InputField
            label="종료일"
            type="date"
            value={form.endDate}
            onChange={(v) => setForm((prev) => ({ ...prev, endDate: v }))}
          />
        </div>
        <SelectField
          label="상태"
          value={form.status}
          onChange={(val) => setForm((prev) => ({ ...prev, status: val }))}
          options={[
            { value: '준비중', label: '준비중' },
            { value: '진행중', label: '진행중' },
            { value: '운영중', label: '운영중' },
            { value: '기획중', label: '기획중' },
            { value: '완료', label: '완료' },
          ]}
        />
      </div>
      <ModalActions
        onPrimary={() => onSubmit(form)}
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

function EditProjectModal({
  project,
  onClose,
  onSubmit,
}: {
  project: Project;
  onClose: () => void;
  onSubmit: (payload: {
    id: string;
    name: string;
    cat: string;
    startDate: string;
    endDate: string;
    status: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    cat: project.cat,
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
  });

  return (
    <ModalShell title="프로젝트 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="카테고리"
          placeholder="예: 안무제작"
          value={form.cat}
          onChange={(v) => setForm((prev) => ({ ...prev, cat: v }))}
        />
        <InputField
          label="프로젝트명"
          placeholder="프로젝트 이름"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <InputField
            label="시작일"
            type="date"
            value={form.startDate}
            onChange={(v) => setForm((prev) => ({ ...prev, startDate: v }))}
          />
          <InputField
            label="종료일"
            type="date"
            value={form.endDate}
            onChange={(v) => setForm((prev) => ({ ...prev, endDate: v }))}
          />
        </div>
        <SelectField
          label="상태"
          value={form.status}
          onChange={(val) => setForm((prev) => ({ ...prev, status: val }))}
          options={[
            { value: '준비중', label: '준비중' },
            { value: '진행중', label: '진행중' },
            { value: '운영중', label: '운영중' },
            { value: '기획중', label: '기획중' },
            { value: '완료', label: '완료' },
          ]}
        />
      </div>
      <ModalActions
        onPrimary={() => onSubmit({ ...form, id: project.id })}
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}

function CreateTaskModal({
  onClose,
  onSubmit,
  defaultBu,
  projects,
  defaultProjectId,
  orgData,
  usersData,
}: {
  onClose: () => void;
  onSubmit: (payload: { title: string; projectId: string; assignee: string; dueDate: string }) => Promise<void>;
  defaultBu: BU;
  projects: Project[];
  defaultProjectId?: string;
  orgData: any[];
  usersData?: { users: any[]; currentUser: any };
}) {
  const [form, setForm] = useState({
    title: '',
    projectId: defaultProjectId ?? projects[0]?.id ?? '',
    assignee: '',
    dueDate: '',
  });
  const [assigneeMode, setAssigneeMode] = useState<'select' | 'custom'>('select');
  const [error, setError] = useState<string>('');

  const memberNames = useMemo(() => {
    const names = new Set<string>();
    orgData.forEach((unit) => {
      (unit.members || []).forEach((m: any) => {
        if (m.name) names.add(m.name);
      });
    });
    if (usersData?.users) {
      usersData.users.forEach((user: any) => {
        if (user.name) names.add(user.name);
      });
    }
    return Array.from(names).sort();
  }, [orgData, usersData]);

  const assigneeOptions = useMemo(() => {
    return [
      ...memberNames.map((name) => ({ value: name, label: name })),
      { value: '__CUSTOM__', label: '직접 입력' },
    ];
  }, [memberNames]);

  return (
    <ModalShell title="할 일 등록" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="제목"
          placeholder="할 일 제목"
          value={form.title}
          onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
        />
        <SelectField
          label="프로젝트"
          value={form.projectId}
          onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
        />
        {assigneeMode === 'select' ? (
          <div className="space-y-1">
            <SelectField
              label="담당자"
              value={form.assignee || '__PLACEHOLDER__'}
              onChange={(val) => {
                if (val === '__CUSTOM__') {
                  setAssigneeMode('custom');
                  setForm((prev) => ({ ...prev, assignee: '' }));
                } else if (val !== '__PLACEHOLDER__') {
                  setForm((prev) => ({ ...prev, assignee: val.trim() }));
                }
              }}
              options={[
                { value: '__PLACEHOLDER__', label: '담당자를 선택하세요' },
                ...assigneeOptions,
              ]}
            />
            <button
              type="button"
              onClick={() => {
                setAssigneeMode('custom');
                setForm((prev) => ({ ...prev, assignee: '' }));
              }}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
            >
              직접 입력하기
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <InputField
              label="담당자"
              placeholder="이름을 직접 입력"
              value={form.assignee}
              onChange={(v) => setForm((prev) => ({ ...prev, assignee: v }))}
            />
            <button
              type="button"
              onClick={() => {
                setAssigneeMode('select');
                if (!memberNames.includes(form.assignee)) {
                  setForm((prev) => ({ ...prev, assignee: '' }));
                }
              }}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
            >
              목록에서 선택
            </button>
          </div>
        )}
        <InputField
          label="마감일"
          type="date"
          value={form.dueDate}
          onChange={(v) => setForm((prev) => ({ ...prev, dueDate: v }))}
        />
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={async () => {
          setError('');
          if (!form.title || !form.assignee || !form.projectId) {
            setError('모든 필드를 입력해주세요.');
            return;
          }
          await onSubmit({
            title: form.title,
            projectId: form.projectId,
            assignee: form.assignee.trim(),
            dueDate: form.dueDate,
          });
        }}
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

function EditTaskModal({
  task,
  onClose,
  onSubmit,
  projects,
  orgData,
  usersData,
}: {
  task: TaskItem;
  onClose: () => void;
  onSubmit: (payload: {
    id: string;
    title: string;
    projectId: string;
    assignee: string;
    dueDate: string;
    status: TaskItem['status'];
  }) => void;
  projects: Project[];
  orgData: any[];
  usersData?: { users: any[]; currentUser: any };
}) {
  const memberNames = useMemo(() => {
    const names = new Set<string>();
    orgData.forEach((unit) => {
      (unit.members || []).forEach((m: any) => {
        if (m.name) names.add(m.name);
      });
    });
    if (usersData?.users) {
      usersData.users.forEach((user: any) => {
        if (user.name) names.add(user.name);
      });
    }
    return Array.from(names).sort();
  }, [orgData, usersData]);

  const isAssigneeInList = memberNames.includes(task.assignee);
  const [assigneeMode, setAssigneeMode] = useState<'select' | 'custom'>(isAssigneeInList ? 'select' : 'custom');

  const [form, setForm] = useState({
    title: task.title,
    projectId: task.projectId,
    assignee: task.assignee,
    dueDate: task.dueDate,
    status: task.status,
  });

  const assigneeOptions = useMemo(() => {
    return [
      ...memberNames.map((name) => ({ value: name, label: name })),
      { value: '__CUSTOM__', label: '직접 입력' },
    ];
  }, [memberNames]);

  return (
    <ModalShell title="할 일 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="제목"
          placeholder="할 일 제목"
          value={form.title}
          onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
        />
        <SelectField
          label="프로젝트"
          value={form.projectId}
          onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
          options={projects
            .filter((p) => p.bu === task.bu)
            .map((p) => ({ value: p.id, label: p.name }))}
        />
        {assigneeMode === 'select' ? (
          <div className="space-y-1">
            <SelectField
              label="담당자"
              value={form.assignee || '__PLACEHOLDER__'}
              onChange={(val) => {
                if (val === '__CUSTOM__') {
                  setAssigneeMode('custom');
                  setForm((prev) => ({ ...prev, assignee: '' }));
                } else if (val !== '__PLACEHOLDER__') {
                  setForm((prev) => ({ ...prev, assignee: val.trim() }));
                }
              }}
              options={[
                { value: '__PLACEHOLDER__', label: '담당자를 선택하세요' },
                ...assigneeOptions,
              ]}
            />
            <button
              type="button"
              onClick={() => {
                setAssigneeMode('custom');
                setForm((prev) => ({ ...prev, assignee: '' }));
              }}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
            >
              직접 입력하기
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <InputField
              label="담당자"
              placeholder="이름을 직접 입력"
              value={form.assignee}
              onChange={(v) => setForm((prev) => ({ ...prev, assignee: v }))}
            />
            <button
              type="button"
              onClick={() => {
                setAssigneeMode('select');
                if (!memberNames.includes(form.assignee)) {
                  setForm((prev) => ({ ...prev, assignee: '' }));
                }
              }}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
            >
              목록에서 선택
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <InputField
            label="마감일"
            type="date"
            value={form.dueDate}
            onChange={(v) => setForm((prev) => ({ ...prev, dueDate: v }))}
          />
          <SelectField
            label="상태"
            value={form.status}
            onChange={(v) => setForm((prev) => ({ ...prev, status: v as TaskItem['status'] }))}
            options={[
              { value: 'todo', label: 'TODO' },
              { value: 'in-progress', label: 'IN PROGRESS' },
              { value: 'done', label: 'DONE' },
            ]}
          />
        </div>
      </div>
      <ModalActions
        onPrimary={() => {
          onSubmit({ ...form, id: task.id });
        }}
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}

function CreateFinanceModal({
  mode,
  onClose,
  onSubmit,
  projects,
}: {
  mode: 'revenue' | 'expense';
  onClose: () => void;
  onSubmit: (payload: {
    type: 'revenue' | 'expense';
    projectId: string;
    bu: BU;
    cat: string;
    name: string;
    amount: string;
    date: string;
    status: FinancialEntryStatus;
  }) => Promise<void>;
  projects: Project[];
}) {
  const [form, setForm] = useState({
    projectId: projects[0]?.id ?? '',
    bu: projects[0]?.bu ?? 'GRIGO',
    cat: '',
    name: '',
    amount: '',
    date: '',
    status: 'planned' as FinancialEntryStatus,
  });
  const [error, setError] = useState<string>('');

  return (
    <ModalShell title={mode === 'revenue' ? '매출 등록' : '지출 등록'} onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="프로젝트"
          value={form.projectId}
          onChange={(val) => {
            const project = projects.find((p) => p.id === val);
            setForm((prev) => ({
              ...prev,
              projectId: val,
              bu: project?.bu ?? prev.bu,
            }));
          }}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
        />
        <InputField
          label="구분"
          placeholder="예: 안무제작"
          value={form.cat}
          onChange={(v) => setForm((prev) => ({ ...prev, cat: v }))}
        />
        <InputField
          label="항목명"
          placeholder="항목 이름"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="금액"
          type="number"
          placeholder="0"
          value={form.amount}
          onChange={(v) => setForm((prev) => ({ ...prev, amount: v }))}
        />
        <InputField
          label="결제일"
          type="date"
          value={form.date}
          onChange={(v) => setForm((prev) => ({ ...prev, date: v }))}
        />
        <SelectField
          label="상태"
          value={form.status}
          onChange={(val) => setForm((prev) => ({ ...prev, status: val as FinancialEntryStatus }))}
          options={[
            { value: 'planned', label: '지급예정' },
            { value: 'paid', label: '지급완료' },
            { value: 'canceled', label: '취소' },
          ]}
        />
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={async () => {
          setError('');
          if (!form.projectId || !form.cat || !form.name || !form.amount) {
            setError('모든 필드를 입력해주세요.');
            return;
          }
          await onSubmit({
            type: mode,
            projectId: form.projectId,
            bu: form.bu,
            cat: form.cat,
            name: form.name,
            amount: form.amount,
            date: form.date || new Date().toISOString().split('T')[0],
            status: form.status,
          });
        }}
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

function EditFinanceModal({
  entry,
  onClose,
  onSubmit,
  projects,
}: {
  entry: FinancialEntry;
  onClose: () => void;
  onSubmit: (payload: {
    id: string;
    type: 'revenue' | 'expense';
    projectId: string;
    bu: BU;
    cat: string;
    name: string;
    amount: string;
    date: string;
    status: FinancialEntryStatus;
  }) => void;
  projects: Project[];
}) {
  const [form, setForm] = useState({
    projectId: entry.projectId,
    bu: entry.bu,
    type: entry.type,
    cat: entry.category,
    name: entry.name,
    amount: String(entry.amount),
    date: entry.date,
    status: entry.status,
  });

  return (
    <ModalShell title="매출/지출 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="프로젝트"
          value={form.projectId}
          onChange={(val) => {
            const project = projects.find((p) => p.id === val);
            setForm((prev) => ({
              ...prev,
              projectId: val,
              bu: project?.bu ?? prev.bu,
            }));
          }}
          options={projects
            .filter((p) => p.bu === form.bu)
            .map((p) => ({ value: p.id, label: p.name }))}
        />
        <InputField
          label="구분"
          placeholder="예: 안무제작"
          value={form.cat}
          onChange={(v) => setForm((prev) => ({ ...prev, cat: v }))}
        />
        <InputField
          label="항목명"
          placeholder="항목 이름"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="금액"
          type="number"
          placeholder="0"
          value={form.amount}
          onChange={(v) => setForm((prev) => ({ ...prev, amount: v }))}
        />
        <InputField
          label="결제일"
          type="date"
          value={form.date}
          onChange={(v) => setForm((prev) => ({ ...prev, date: v }))}
        />
        <SelectField
          label="상태"
          value={form.status}
          onChange={(val) => setForm((prev) => ({ ...prev, status: val as FinancialEntryStatus }))}
          options={[
            { value: 'planned', label: '지급예정' },
            { value: 'paid', label: '지급완료' },
            { value: 'canceled', label: '취소' },
          ]}
        />
      </div>
      <ModalActions
        onPrimary={() => {
          onSubmit({
            id: entry.id,
            type: form.type,
            projectId: form.projectId,
            bu: form.bu,
            cat: form.cat,
            name: form.name,
            amount: form.amount,
            date: form.date,
            status: form.status,
          });
        }}
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}



