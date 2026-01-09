'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Briefcase,
  CheckSquare,
  Calendar as CalendarIcon,
  Building2,
  CreditCard,
  BookOpen,
  Plus,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  Edit3,
  Clock,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Star,
  Info,
  Paperclip,
  Download,
  Phone,
  Mail,
  LogOut,
  Camera,
  FileText,
  Home,
  User,
  Receipt,
  AlertTriangle,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTodayKST } from '@/lib/timezone';
import type { BU, Artist, Project, ProjectTask, Client, ClientStatus, Event, Manual, ExternalWorker, ExternalWorkerType, FinancialEntry, ArtistStatus, ArtistType } from '@/types/database';
import {
  useArtists,
  useCreateArtist,
  useUpdateArtist,
  useDeleteArtist,
  useDancers,
  useProjects,
  useTasks,
  useFinancialEntries,
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useCreateClientWorker,
  useUpdateClientWorker,
  useDeleteClientWorker,
  useClientWorkers,
  useEvents,
  useManuals,
  useOrgMembers,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useCreateFinancialEntry,
  useUpdateFinancialEntry,
  useDeleteFinancialEntry,
  useCreateTask,
  useUpdateTask,
  useUsers,
  useMentionedComments,
  useMarkCommentAsRead,
  useCommentReads,
} from '@/features/erp/hooks';
import { dbProjectToFrontend, dbTaskToFrontend, dbFinancialToFrontend, frontendFinancialToDb, frontendTaskToDb } from '@/features/erp/utils';
import { CommentSection } from '@/features/comments/components/CommentSection';
import { MentionedCommentsSection } from '@/features/comments/components/MentionedCommentsSection';
import { ProjectModal } from '@/features/erp/components/ProjectModal';
import { DancersView } from './DancersView';
import { ArtistsView } from './ArtistsView';
import { AttendanceManagementView } from '@/features/attendance/components/AttendanceManagementView';

type GrigoEntView =
  | 'dashboard'
  | 'artists'
  | 'dancers'
  | 'projects'
  | 'tasks'
  | 'schedule'
  | 'partners'
  | 'settlements'
  | 'manuals'
  | 'attendance';

// 상수 정의
const VISA_TYPES = ['N/A (내국인)', 'E-6 (예술흥행)', 'F-2 (거주)', 'F-4 (재외동포)'];
const MANUAL_CATEGORIES = ['All', '전사 공통/ERP', '아티스트 관리', '행정/비자', '현장/제작', '재무/정산'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

function StatusBadge({ type, text }: { type?: string; text: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    ongoing: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    planning: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    completed: 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400',
    paused: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
    warning: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
    danger: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    vip: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    default: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300',
  };

  const key = type?.toLowerCase() || 'default';

  return (
    <span className={cn('px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter', styles[key] || styles.default)}>
      {text}
    </span>
  );
}

function Modal({ isOpen, onClose, title, children, size = 'md' }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' }) {
  if (!isOpen) return null;
  const sizeClasses = {
    md: 'max-w-lg',
    lg: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={cn('bg-white dark:bg-slate-800 rounded-[2rem] w-full', sizeClasses[size], 'shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]')}>
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 flex-shrink-0">
          <h3 className="font-black text-lg text-gray-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={18} className="text-gray-500 dark:text-slate-400" />
          </button>
        </div>
        <div className="p-0 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function GrigoEntDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const bu: BU = 'GRIGO';
  const [activeTab, setActiveTab] = useState<GrigoEntView>('dashboard');
  const [activeManual, setActiveManual] = useState<Manual | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        router.push('/login');
        return;
      }

      const { data: appUser } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // GRIGO 사업부가 아니고 본사도 아닌 경우 접근 불가
      if (appUser?.bu_code && appUser.bu_code !== 'GRIGO' && appUser.bu_code !== 'HEAD') {
        // 본인 사업부 ERP로 리디렉션
        if (appUser.bu_code === 'AST') {
          router.push('/astcompany');
        } else if (appUser.bu_code === 'REACT') {
          router.push('/reactstudio');
        } else if (appUser.bu_code === 'FLOW') {
          router.push('/flow');
        } else if (appUser.bu_code === 'MODOO') {
          router.push('/modoo');
        }
        return;
      }

      setUser({ ...authUser, profile: appUser });
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // API 데이터 로딩
  const { data: artistsData = [] } = useArtists(bu);
  const { data: projectsData = [] } = useProjects(bu);
  const { data: tasksData = [] } = useTasks(bu);
  const { data: clientsData = [] } = useClients(bu);
  const { data: eventsData = [] } = useEvents(bu);
  const { data: manualsData = [] } = useManuals(bu);
  const { data: financialData = [] } = useFinancialEntries({ bu });
  const { data: orgData = [] } = useOrgMembers();
  const { data: usersData } = useUsers();
  const { data: dancersData = [] } = useDancers(bu);

  // Mutation hooks
  const createArtistMutation = useCreateArtist();
  const updateArtistMutation = useUpdateArtist();
  const deleteArtistMutation = useDeleteArtist();
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();
  const createClientWorkerMutation = useCreateClientWorker();
  const updateClientWorkerMutation = useUpdateClientWorker();
  const deleteClientWorkerMutation = useDeleteClientWorker();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const createFinancialEntryMutation = useCreateFinancialEntry();
  const updateFinancialEntryMutation = useUpdateFinancialEntry();
  const deleteFinancialEntryMutation = useDeleteFinancialEntry();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();

  // 데이터 변환
  const artists = useMemo(() => artistsData, [artistsData]);
  const projects = useMemo(() => projectsData.map(dbProjectToFrontend), [projectsData]);
  const tasks = useMemo(() => tasksData.map(dbTaskToFrontend), [tasksData]);
  const partners = useMemo(() => clientsData, [clientsData]);
  const manuals = useMemo(() => manualsData, [manualsData]);
  const financials = useMemo(() => financialData.map(dbFinancialToFrontend), [financialData]);
  
  // 정산 데이터 변환 (financial_entries에서 계산)
  const settlements = useMemo(() => {
    const revenues = financialData.filter((f) => f.kind === 'revenue').map(dbFinancialToFrontend);
    return revenues.map((r) => ({
      id: r.id,
      title: r.name,
      date: r.date,
      totalAmount: r.amount,
      dancerFee: Math.round(r.amount * 0.7), // 70%
      companyFee: Math.round(r.amount * 0.3), // 30%
      status: r.status === 'paid' ? 'Completed' : 'Pending',
    }));
  }, [financialData]);

  // 대시보드 통계 계산
  const urgentVisas = useMemo(() => {
    const today = new Date();
    return artists.filter((d) => {
      const visaEnd = d.visa_end;
      if (!visaEnd || visaEnd === '9999-12-31' || visaEnd === 'N/A') return false;
      const diff = (new Date(visaEnd).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 60;
    });
  }, [artists]);

  const totalRevenue = useMemo(() => {
    return settlements.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [settlements]);

  const totalExpense = useMemo(() => {
    const expenses = financialData.filter((f) => f.kind === 'expense').map(dbFinancialToFrontend);
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [financialData]);

  const netProfit = useMemo(() => {
    return totalRevenue - totalExpense;
  }, [totalRevenue, totalExpense]);

  const inProgressProjects = useMemo(() => {
    return projects.filter((p) => p.status === '진행중' || p.status === '운영중' || p.status === '기획중');
  }, [projects]);

  const activeTasks = useMemo(() => {
    return tasks.filter((t) => t.status !== 'done');
  }, [tasks]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    return eventsData
      .filter((e) => new Date(e.event_date) >= today)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 5);
  }, [eventsData]);

  const activeClients = useMemo(() => {
    return partners.filter((c) => c.status === 'active');
  }, [partners]);

  // Views
  const DashboardView = () => {
    const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<'all' | 'my'>('all');
    
    const filteredActiveTasks = useMemo(() => {
      let filtered = activeTasks;
      if (taskAssigneeFilter === 'my' && user?.profile?.name) {
        filtered = filtered.filter((t) => t.assignee === user.profile.name);
      }
      return filtered;
    }, [activeTasks, taskAssigneeFilter, user]);
    
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('projects')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('projects');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-2xl">
                <Briefcase size={22} />
              </div>
              <span className="text-[10px] font-black text-green-500 dark:text-green-300 bg-green-50 dark:bg-green-900/50 px-2 py-1 rounded-full uppercase tracking-widest">Active</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Total Projects</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-slate-100 mt-1">{projects.length}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">진행중: {inProgressProjects.length}건</p>
            </div>
          </div>
          <div
            className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('artists')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('artists');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-2xl">
                <Users size={22} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Total Artists</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-slate-100 mt-1">{artists.length}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">활성: {artists.filter((a) => a.status === 'Active').length}명</p>
            </div>
          </div>
          <div
            className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between border-red-100 dark:border-red-900/50 hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('artists')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('artists');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded-2xl">
                <ShieldCheck size={22} />
              </div>
              {urgentVisas.length > 0 && <span className="w-3 h-3 bg-red-50 dark:bg-red-900/500 rounded-full animate-ping"></span>}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Visa Critical</p>
              <h3 className={cn('text-3xl font-black mt-1', urgentVisas.length > 0 ? 'text-red-600 dark:text-red-300' : 'text-gray-900 dark:text-slate-100')}>{urgentVisas.length}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">60일 이내 만료</p>
            </div>
          </div>
          <div
            className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('settlements')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('settlements');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 rounded-2xl">
                <DollarSign size={22} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Monthly Rev.</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-slate-100 mt-1">₩{(totalRevenue / 10000).toLocaleString()}만</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">순이익: ₩{(netProfit / 10000).toLocaleString()}만</p>
            </div>
          </div>
        </div>

        {/* 추가 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('dancers')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('dancers');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 rounded-2xl">
                <UserPlus size={22} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">댄서</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-slate-100 mt-1">-</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">관리</p>
            </div>
          </div>
          <div
            className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('partners')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('partners');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 rounded-2xl">
                <Building2 size={22} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">거래처</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-slate-100 mt-1">{partners.length}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">활성: {activeClients.length}개</p>
            </div>
          </div>
          <div
            className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('tasks')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('tasks');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300 rounded-2xl">
                <CheckSquare size={22} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">진행 중 업무</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-slate-100 mt-1">{activeTasks.length}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">완료: {tasks.filter((t) => t.status === 'done').length}건</p>
            </div>
          </div>
          <div
            className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('settlements')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('settlements');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-pink-50 dark:bg-pink-900/50 text-pink-600 dark:text-pink-300 rounded-2xl">
                <Receipt size={22} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">총 지출</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-slate-100 mt-1">₩{(totalExpense / 10000).toLocaleString()}만</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">정산 완료: {settlements.filter((s) => s.status === 'Completed').length}건</p>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 프로젝트 & 일정 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 진행 중인 프로젝트 */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">진행 중인 프로젝트</h3>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="text-sm text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-400 font-bold"
                >
                  전체 보기 →
                </button>
              </div>
              <div className="space-y-3">
                {inProgressProjects.length > 0 ? (
                  inProgressProjects.slice(0, 5).map((project) => {
                    const projectFinancials = financialData.filter((f) => String(f.project_id) === project.id);
                    const projectRevenue = projectFinancials.filter((f) => f.kind === 'revenue').reduce((sum, f) => sum + f.amount, 0);
                    const projectExpense = projectFinancials.filter((f) => f.kind === 'expense').reduce((sum, f) => sum + f.amount, 0);
                    const projectClient = project.client_id ? partners.find((c) => c.id === project.client_id) : null;

                    return (
                      <div
                        key={project.id}
                        onClick={() => setActiveTab('projects')}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-black text-gray-900 dark:text-slate-100 text-sm">{project.name}</h4>
                            <StatusBadge type={project.status.toLowerCase()} text={project.status} />
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-slate-400 mt-2">
                            {(project as any).pm_name && <span>PM: {(project as any).pm_name}</span>}
                            {projectClient && <span>클라이언트: {(projectClient as any).company_name_ko || (projectClient as any).company_name_en || '-'}</span>}
                            <span>매출: ₩{(projectRevenue / 10000).toLocaleString()}만</span>
                            <span>지출: ₩{(projectExpense / 10000).toLocaleString()}만</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-indigo-600 dark:hover:text-indigo-400 dark:text-indigo-300 transition-colors" />
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm font-bold">진행 중인 프로젝트가 없습니다.</div>
                )}
              </div>
            </div>

            {/* 주요 일정 */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">다가오는 일정</h3>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="text-sm text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-400 font-bold"
                >
                  전체 보기 →
                </button>
              </div>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-slate-900 rounded-2xl transition-colors border border-gray-100 dark:border-slate-700 cursor-pointer group"
                    >
                      <div className="w-16 text-center mr-4 flex-shrink-0">
                        <div className="text-xs text-gray-500 dark:text-slate-400 font-bold">
                          {new Date(event.event_date).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'w-1 h-12 rounded-full mr-4 flex-shrink-0',
                          event.event_type === 'shoot' ? 'bg-red-50 dark:bg-red-900/500' : event.event_type === 'meeting' ? 'bg-blue-50 dark:bg-blue-900/500' : 'bg-purple-50 dark:bg-purple-900/500'
                        )}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-gray-900 dark:text-slate-100 text-sm truncate">{event.title}</h4>
                        {event.description && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center mt-1 truncate">
                            <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{event.description}</span>
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-indigo-600 dark:hover:text-indigo-400 dark:text-indigo-300 transition-colors flex-shrink-0" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm font-bold">등록된 일정이 없습니다.</div>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 할 일 & 비자 알림 */}
          <div className="space-y-6">
            {/* 할 일 */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">할 일</h3>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="text-sm text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-400 font-bold"
                >
                  전체 보기 →
                </button>
              </div>
              {/* 할일 필터 */}
              <div className="mb-4 flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  onClick={() => setTaskAssigneeFilter('all')}
                  className={cn(
                    'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                    taskAssigneeFilter === 'all'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
                  )}
                >
                  전체 할일 보기
                </button>
                <button
                  onClick={() => setTaskAssigneeFilter('my')}
                  className={cn(
                    'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                    taskAssigneeFilter === 'my'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
                  )}
                >
                  내 할일만 보기
                </button>
              </div>
              <div className="space-y-3">
                {filteredActiveTasks.length > 0 ? (
                  filteredActiveTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors cursor-pointer"
                      onClick={() => setActiveTab('tasks')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full font-bold',
                              task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600 dark:text-yellow-300' : 'bg-blue-100 text-blue-600 dark:text-blue-300'
                            )}
                          >
                            {task.priority || 'medium'}
                          </span>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              task.status === 'todo' ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300' : task.status === 'in-progress' ? 'bg-blue-100 text-blue-600 dark:text-blue-300' : 'bg-green-100 text-green-600'
                            )}
                          >
                            {task.status === 'todo' ? '할 일' : task.status === 'in-progress' ? '진행 중' : '완료'}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-2">{task.title}</p>
                        {task.assignee && (
                          <div className="flex items-center text-xs text-gray-500 dark:text-slate-400">
                            <User className="w-3 h-3 mr-1" />
                            <span className="font-bold">{task.assignee}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center text-xs text-gray-400 dark:text-slate-500 mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{task.dueDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm font-bold">등록된 할 일이 없습니다.</div>
                )}
              </div>
            </div>

            {/* 비자 만료 임박 알림 */}
            {urgentVisas.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/50 rounded-[2rem] shadow-sm border border-red-100 dark:border-red-900/50 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-300" />
                  <h3 className="text-lg font-black text-red-900 dark:text-red-200">비자 만료 임박</h3>
                </div>
                <div className="space-y-3">
                  {urgentVisas.slice(0, 3).map((artist) => {
                    const visaEnd = artist.visa_end || '9999-12-31';
                    const daysLeft = Math.ceil((new Date(visaEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <div key={artist.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-red-200 dark:border-red-900/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-black text-sm text-gray-900 dark:text-slate-100">{artist.name}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{artist.visa_type || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-red-600 dark:text-red-300">{daysLeft}일 남음</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{visaEnd}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {urgentVisas.length > 3 && (
                  <button
                    onClick={() => setActiveTab('artists')}
                    className="w-full mt-4 text-sm text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-400 font-bold"
                  >
                    전체 보기 ({urgentVisas.length}건) →
                  </button>
                )}
              </div>
            )}

            {/* 멘션된 댓글 */}
            <MentionedCommentsSection />
          </div>
        </div>
      </div>
    );
  };

  const ProjectsView = () => {
    const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isProjectModalOpen, setProjectModalOpen] = useState(false);
    const [editProject, setEditProject] = useState<any>(null);
    const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
    const [financeModalOpen, setFinanceModalOpen] = useState<{ mode: 'revenue' | 'expense'; projectId: number } | null>(null);
    const [editFinance, setEditFinance] = useState<any>(null);
    const [deleteFinanceId, setDeleteFinanceId] = useState<number | null>(null);
    const [taskModalOpen, setTaskModalOpen] = useState<{ projectId: string } | null>(null);
    const [editTask, setEditTask] = useState<any>(null);
    const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

    const filteredProjects = useMemo(() => {
      if (!searchQuery) return projects;
      const query = searchQuery.toLowerCase();
      return projects.filter((p) => 
        p.name.toLowerCase().includes(query) ||
        p.cat.toLowerCase().includes(query) ||
        (p.client_id && partners.find((c) => c.id === p.client_id)?.company_name_ko.toLowerCase().includes(query))
      );
    }, [projects, searchQuery, partners]);

    const handleCreateProject = async (data: {
      bu: BU;
      name: string;
      cat: string;
      startDate?: string;
      endDate?: string;
      status: string;
      client_id?: number;
      artist_id?: number;
      pm_name?: string | null;
      participants?: Array<{ dancer_id?: number; role: string; is_pm: boolean; user_id?: string; external_worker_id?: number }>;
    }) => {
      try {
        const payload: any = {
          bu_code: data.bu,
          name: data.name,
          category: data.cat,
          status: data.status,
          start_date: data.startDate || null,
          end_date: data.endDate || null,
        };

        if (data.client_id !== undefined) {
          payload.client_id = data.client_id;
        }

        if (data.artist_id !== undefined && data.artist_id !== null) {
          payload.artist_id = data.artist_id;
        }

        if (data.pm_name !== undefined) {
          payload.pm_name = data.pm_name || null;
        }

        if (data.participants !== undefined) {
          payload.participants = data.participants;
        }

        await createProjectMutation.mutateAsync(payload);
        setProjectModalOpen(false);
      } catch (error: any) {
        console.error('Failed to create project:', error);
        const errorMessage = error?.message || '프로젝트 등록 중 오류가 발생했습니다.';
        alert(errorMessage);
      }
    };

    const handleUpdateProject = async (id: number, data: {
      bu: BU;
      name: string;
      cat: string;
      startDate?: string;
      endDate?: string;
      status: string;
      client_id?: number;
      artist_id?: number;
      pm_name?: string | null;
      participants?: Array<{ dancer_id?: number; role: string; is_pm: boolean; user_id?: string; external_worker_id?: number }>;
    }) => {
      try {
        await updateProjectMutation.mutateAsync({
          id,
          data: {
            bu_code: data.bu,
            name: data.name,
            category: data.cat,
            status: data.status,
            start_date: data.startDate || null,
            end_date: data.endDate || null,
            client_id: data.client_id,
            ...(data.artist_id !== undefined && { artist_id: data.artist_id || null }),
            ...(data.pm_name !== undefined && { pm_name: data.pm_name || null }),
            ...(data.participants !== undefined && { participants: data.participants }),
          },
        });
        setEditProject(null);
      } catch (error) {
        console.error('Failed to update project:', error);
        alert('프로젝트 수정 중 오류가 발생했습니다.');
      }
    };

    const handleDeleteProject = async (id: number) => {
      try {
        await deleteProjectMutation.mutateAsync(id);
        setDeleteProjectId(null);
      } catch (error) {
        console.error('Failed to delete project:', error);
        alert('프로젝트 삭제 중 오류가 발생했습니다.');
      }
    };

    const handleCreateFinance = async (data: {
      projectId: string;
      bu: BU;
      type: 'revenue' | 'expense';
      category: string;
      name: string;
      amount: number;
      date: string;
      status: 'planned' | 'paid' | 'canceled';
    }) => {
      try {
        await createFinancialEntryMutation.mutateAsync(frontendFinancialToDb(data));
        setFinanceModalOpen(null);
      } catch (error) {
        console.error('Failed to create financial entry:', error);
        alert('재무 항목 등록 중 오류가 발생했습니다.');
      }
    };

    const handleUpdateFinance = async (id: number, data: {
      projectId: string;
      bu: BU;
      type: 'revenue' | 'expense';
      category: string;
      name: string;
      amount: number;
      date: string;
      status: 'planned' | 'paid' | 'canceled';
    }) => {
      try {
        await updateFinancialEntryMutation.mutateAsync({
          id,
          data: frontendFinancialToDb(data),
        });
        setEditFinance(null);
      } catch (error) {
        console.error('Failed to update financial entry:', error);
        alert('재무 항목 수정 중 오류가 발생했습니다.');
      }
    };

    const handleDeleteFinance = async (id: number) => {
      try {
        await deleteFinancialEntryMutation.mutateAsync(id);
        setDeleteFinanceId(null);
      } catch (error) {
        console.error('Failed to delete financial entry:', error);
        alert('재무 항목 삭제 중 오류가 발생했습니다.');
      }
    };

    const handleCreateTask = async (data: {
      projectId: string;
      bu: BU;
      title: string;
      assignee: string;
      dueDate: string;
      status?: 'todo' | 'in-progress' | 'done';
    }) => {
      try {
        await createTaskMutation.mutateAsync(frontendTaskToDb(data));
        setTaskModalOpen(null);
      } catch (error) {
        console.error('Failed to create task:', error);
        alert('할 일 등록 중 오류가 발생했습니다.');
      }
    };

    const handleUpdateTask = async (id: number, data: {
      projectId: string;
      bu: BU;
      title: string;
      assignee: string;
      dueDate: string;
      status?: 'todo' | 'in-progress' | 'done';
    }) => {
      try {
        await updateTaskMutation.mutateAsync({
          id,
          data: frontendTaskToDb(data),
        });
        setEditTask(null);
      } catch (error) {
        console.error('Failed to update task:', error);
        alert('할 일 수정 중 오류가 발생했습니다.');
      }
    };

    const handleDeleteTask = async (id: number) => {
      try {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete task');
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setDeleteTaskId(null);
      } catch (error) {
        console.error('Failed to delete task:', error);
        alert('할 일 삭제 중 오류가 발생했습니다.');
      }
    };

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tighter">프로젝트 관리</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">진행 중인 모든 프로젝트의 예산 및 일정을 총괄합니다.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm gap-4">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
            />
          </div>
          <button
            onClick={() => setProjectModalOpen(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4 mr-2" /> 새 프로젝트
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">프로젝트명</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">클라이언트</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">PM</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">카테고리</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">순이익</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">마감일</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.map((project) => {
                const projectClient = project.client_id ? partners.find((c) => c.id === project.client_id) : null;
                const projectRevenues = financials.filter((f) => f.projectId === project.id && f.type === 'revenue');
                const projectExpenses = financials.filter((f) => f.projectId === project.id && f.type === 'expense');
                const budget = projectRevenues.reduce((sum, r) => sum + r.amount, 0);
                const totalExpenses = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
                const projectTasks = tasks.filter((t) => t.projectId === project.id);
                const isExpanded = expandedProjectId === project.id;

                return (
                  <>
                    <tr
                      key={project.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors cursor-pointer group"
                      onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-slate-100 group-hover:text-indigo-600 dark:hover:text-indigo-400 dark:text-indigo-300 transition-colors">
                              {project.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                        {projectClient?.company_name_ko || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                        {(project as any).pm_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                        {project.cat}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300 font-mono">
                        {formatCurrency(budget - totalExpenses)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{project.endDate}</td>
                      <td className="px-6 py-4">
                        <StatusBadge type={project.status.toLowerCase()} text={project.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditProject(project);
                            }}
                            className="text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 dark:text-indigo-300"
                            title="수정"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteProjectId(project.id);
                            }}
                            className="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:text-red-300"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${project.id}-accordion`}>
                        <td colSpan={8} className="px-6 py-4 bg-gray-50 dark:bg-slate-900">
                          <div className="space-y-4">
                            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
                              <div className="flex justify-between items-center mb-3">
                                <h5 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                                  <CheckSquare className="w-4 h-4" /> 할 일 ({projectTasks.length}건)
                                </h5>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTaskModalOpen({ projectId: project.id });
                                  }}
                                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> 할 일 추가
                                </button>
                              </div>
                              <div className="space-y-2">
                                {projectTasks.length > 0 ? (
                                  projectTasks.map((task) => (
                                    <div
                                      key={task.id}
                                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-900 rounded border border-gray-100 dark:border-slate-700 group"
                                    >
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-800 dark:text-slate-200">{task.title}</div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">
                                          {task.assignee} • {task.dueDate}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <StatusBadge
                                          type={task.status === 'done' ? 'completed' : task.status === 'in-progress' ? 'ongoing' : 'planning'}
                                          text={task.status === 'done' ? '완료' : task.status === 'in-progress' ? '진행중' : '할 일'}
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditTask(task);
                                          }}
                                          className="text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 dark:text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="수정"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteTaskId(task.id);
                                          }}
                                          className="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="삭제"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                                    등록된 할 일이 없습니다.
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-semibold text-gray-800 dark:text-slate-200">매출 및 지출 관리</h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFinanceModalOpen({ mode: 'revenue', projectId: Number(project.id) });
                                  }}
                                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> 매출 추가
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFinanceModalOpen({ mode: 'expense', projectId: Number(project.id) });
                                  }}
                                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> 지출 추가
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <h5 className="font-semibold text-green-700 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" /> 매출
                                  </h5>
                                  <span className="text-sm font-bold text-green-600">
                                    총 {formatCurrency(budget)}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {projectRevenues.length > 0 ? (
                                    projectRevenues.map((revenue) => (
                                      <div
                                        key={revenue.id}
                                        className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/50 rounded border border-green-100"
                                      >
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-800 dark:text-slate-200">
                                            {revenue.name}
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-slate-400">
                                            {revenue.category} • {revenue.date}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-bold text-green-600">
                                            {formatCurrency(revenue.amount)}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditFinance(revenue);
                                            }}
                                            className="text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 dark:text-indigo-300"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteFinanceId(Number(revenue.id));
                                            }}
                                            className="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:text-red-300"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                                      등록된 매출이 없습니다.
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <h5 className="font-semibold text-red-700 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> 지출
                                  </h5>
                                  <span className="text-sm font-bold text-red-600 dark:text-red-300">
                                    총 {formatCurrency(totalExpenses)}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {projectExpenses.length > 0 ? (
                                    projectExpenses.map((expense) => (
                                      <div
                                        key={expense.id}
                                        className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/50 rounded border border-red-100 dark:border-red-900/50"
                                      >
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-800 dark:text-slate-200">
                                            {expense.name}
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-slate-400">
                                            {expense.category} • {expense.date}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-bold text-red-600 dark:text-red-300">
                                            {formatCurrency(expense.amount)}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditFinance(expense);
                                            }}
                                            className="text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 dark:text-indigo-300"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteFinanceId(Number(expense.id));
                                            }}
                                            className="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:text-red-300"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                                      등록된 지출이 없습니다.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="bg-indigo-50 dark:bg-indigo-900/50 rounded-lg border border-indigo-200 p-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-indigo-900">순이익</span>
                                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-300">
                                  {formatCurrency(budget - totalExpenses)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 dark:text-slate-500 text-sm">
                    {searchQuery ? '검색 결과가 없습니다.' : '등록된 프로젝트가 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 프로젝트 모달들 */}
        {isProjectModalOpen && (
          <ProjectModal
            defaultBu={bu}
            usersData={{ users: (usersData as any)?.users || [], currentUser: (usersData as any)?.currentUser || null }}
            partnerCompaniesData={partners}
            partnerWorkersData={[]}
            placeholders={{
              projectName: '예: 2025 콘서트 안무',
              category: '예: 안무제작, 뮤직비디오, 콘서트',
              description: '안무/콘서트/뮤비 프로젝트 설명을 입력하세요',
            }}
            onClose={() => setProjectModalOpen(false)}
            onSubmit={async (data) => {
              await handleCreateProject({
                bu: data.bu,
                name: data.name,
                cat: data.cat,
                startDate: data.startDate,
                endDate: data.endDate,
                status: data.status || '준비중',
                client_id: data.partner_company_id || undefined,
                artist_id: data.artist_id || undefined,
                pm_name: null,
                participants: data.participants?.map((p) => ({
                  user_id: p.user_id,
                  external_worker_id: p.partner_worker_id,
                  role: p.role || 'participant',
                  is_pm: false,
                })),
              });
            }}
          />
        )}

        {editProject && (
          <ProjectModal
            project={{
              id: editProject.id,
              bu: editProject.bu || bu,
              name: editProject.name,
              cat: editProject.cat,
              startDate: editProject.startDate,
              endDate: editProject.endDate,
              status: editProject.status,
              pm_id: editProject.pm_id,
              participants: editProject.participants,
            }}
            defaultBu={bu}
            usersData={{ users: (usersData as any)?.users || [], currentUser: (usersData as any)?.currentUser || null }}
            partnerCompaniesData={partners}
            partnerWorkersData={[]}
            placeholders={{
              projectName: '예: 2025 콘서트 안무',
              category: '예: 안무제작, 뮤직비디오, 콘서트',
              description: '안무/콘서트/뮤비 프로젝트 설명을 입력하세요',
            }}
            onClose={() => setEditProject(null)}
            onSubmit={async (data) => {
              await handleUpdateProject(Number(editProject.id), {
                bu: data.bu,
                name: data.name,
                cat: data.cat,
                startDate: data.startDate,
                endDate: data.endDate,
                status: data.status || '준비중',
                client_id: data.partner_company_id || undefined,
                artist_id: data.artist_id || undefined,
                pm_name: null,
                participants: data.participants?.map((p) => ({
                  user_id: p.user_id,
                  external_worker_id: p.partner_worker_id,
                  role: p.role || 'participant',
                  is_pm: false,
                })),
              });
            }}
          />
        )}

        {deleteProjectId && (
          <DeleteConfirmModal
            title="프로젝트 삭제"
            message="정말 이 프로젝트를 삭제하시겠습니까?"
            onConfirm={() => handleDeleteProject(Number(deleteProjectId))}
            onCancel={() => setDeleteProjectId(null)}
          />
        )}

        {/* 재무 모달들 */}
        {financeModalOpen && (
          <FinanceModal
            mode={financeModalOpen.mode}
            projectId={String(financeModalOpen.projectId)}
            bu={bu}
            projects={projects}
            onClose={() => setFinanceModalOpen(null)}
            onSubmit={handleCreateFinance}
          />
        )}

        {editFinance && (
          <FinanceModal
            entry={editFinance}
            bu={bu}
            projects={projects}
            onClose={() => setEditFinance(null)}
            onSubmit={(data) => handleUpdateFinance(Number(editFinance.id), data)}
          />
        )}

        {deleteFinanceId && (
          <DeleteConfirmModal
            title="재무 항목 삭제"
            message="정말 이 재무 항목을 삭제하시겠습니까?"
            onConfirm={() => handleDeleteFinance(deleteFinanceId)}
            onCancel={() => setDeleteFinanceId(null)}
          />
        )}

        {/* 할 일 모달들 */}
        {taskModalOpen && (
          <TaskModal
            projectId={taskModalOpen.projectId}
            bu={bu}
            projects={projects}
            users={(usersData as any)?.users || []}
            onClose={() => setTaskModalOpen(null)}
            onSubmit={handleCreateTask}
          />
        )}

        {editTask && (
          <TaskModal
            task={editTask}
            bu={bu}
            projects={projects}
            users={(usersData as any)?.users || []}
            onClose={() => setEditTask(null)}
            onSubmit={(data) => handleUpdateTask(Number(editTask.id), data)}
          />
        )}

        {deleteTaskId && (
          <DeleteConfirmModal
            title="할 일 삭제"
            message="정말 이 할 일을 삭제하시겠습니까?"
            onConfirm={() => handleDeleteTask(Number(deleteTaskId))}
            onCancel={() => setDeleteTaskId(null)}
          />
        )}
      </div>
    );
  };


  // Finance Modal Component
  const FinanceModal = ({
    entry,
    mode,
    projectId,
    bu,
    projects,
    onClose,
    onSubmit,
  }: {
    entry?: any;
    mode?: 'revenue' | 'expense';
    projectId?: string;
    bu: BU;
    projects: any[];
    onClose: () => void;
    onSubmit: (data: {
      projectId: string;
      bu: BU;
      type: 'revenue' | 'expense';
      category: string;
      name: string;
      amount: number;
      date: string;
      status: 'planned' | 'paid' | 'canceled';
    }) => void;
  }) => {
    const [form, setForm] = useState({
      projectId: entry?.projectId || projectId || projects[0]?.id || '',
      category: entry?.category || '',
      name: entry?.name || '',
      amount: entry?.amount ? String(entry.amount) : '',
      date: entry?.date || getTodayKST(),
      status: entry?.status || 'planned',
    });

    const financeType = entry?.type || mode || 'revenue';

    return (
      <ModalShell title={entry ? '재무 항목 수정' : financeType === 'revenue' ? '매출 등록' : '지출 등록'} onClose={onClose}>
        <div className="grid grid-cols-1 gap-3">
          <SelectField
            label="프로젝트"
            value={form.projectId}
            onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
          />
          <InputField
            label="카테고리"
            placeholder="예: 안무제작, 인건비"
            value={form.category}
            onChange={(v) => setForm((prev) => ({ ...prev, category: v }))}
          />
          <InputField
            label="항목명"
            placeholder="항목 이름"
            value={form.name}
            onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <InputField
              label="금액"
              type="number"
              placeholder="0"
              value={form.amount}
              onChange={(v) => setForm((prev) => ({ ...prev, amount: v }))}
            />
            <InputField
              label="날짜"
              type="date"
              value={form.date}
              onChange={(v) => setForm((prev) => ({ ...prev, date: v }))}
            />
          </div>
          <SelectField
            label="상태"
            value={form.status}
            onChange={(val) => setForm((prev) => ({ ...prev, status: val as any }))}
            options={[
              { value: 'planned', label: '예정' },
              { value: 'paid', label: '지급완료' },
              { value: 'canceled', label: '취소' },
            ]}
          />
        </div>
        <ModalActions
          onPrimary={() => {
            const project = projects.find((p) => p.id === form.projectId);
            if (!project) return;
            onSubmit({
              projectId: form.projectId,
              bu: project.bu,
              type: financeType,
              category: form.category,
              name: form.name,
              amount: Number(form.amount),
              date: form.date,
              status: form.status as 'planned' | 'paid' | 'canceled',
            });
          }}
          onClose={onClose}
          primaryLabel={entry ? '수정' : '등록'}
        />
      </ModalShell>
    );
  };

  const TasksView = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editTask, setEditTask] = useState<any | null>(null);
    const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
    const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<'all' | 'my'>('all');

    const handleCreateTask = async (data: {
      projectId: string;
      bu: BU;
      title: string;
      assignee: string;
      dueDate: string;
      status?: 'todo' | 'in-progress' | 'done';
    }) => {
      try {
        await createTaskMutation.mutateAsync(frontendTaskToDb(data));
        setIsCreateModalOpen(false);
      } catch (error) {
        console.error('Failed to create task:', error);
        alert('할 일 등록 중 오류가 발생했습니다.');
      }
    };

    const handleUpdateTask = async (id: number, data: {
      projectId: string;
      bu: BU;
      title: string;
      assignee: string;
      dueDate: string;
      status?: 'todo' | 'in-progress' | 'done';
    }) => {
      try {
        await updateTaskMutation.mutateAsync({
          id,
          data: frontendTaskToDb(data),
        });
        setEditTask(null);
      } catch (error) {
        console.error('Failed to update task:', error);
        alert('할 일 수정 중 오류가 발생했습니다.');
      }
    };

    const handleDeleteTask = async (id: number) => {
      try {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete task');
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setDeleteTaskId(null);
      } catch (error) {
        console.error('Failed to delete task:', error);
        alert('할 일 삭제 중 오류가 발생했습니다.');
      }
    };

    const handleToggleStatus = async (task: any) => {
      const nextStatus =
        task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'done';

      try {
        await updateTaskMutation.mutateAsync({
          id: Number(task.id),
          data: { status: nextStatus },
        });
      } catch (error) {
        console.error('Failed to update task status:', error);
        alert('상태 변경 중 오류가 발생했습니다.');
      }
    };

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tighter">업무 및 할일</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">실시간 칸반 보드로 업무 진척도를 통제합니다.</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            할 일 추가
          </button>
        </div>

        {/* 할일 필터 */}
        <div className="flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          <button
            onClick={() => setTaskAssigneeFilter('all')}
            className={cn(
              'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
              taskAssigneeFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
            )}
          >
            전체 할일 보기
          </button>
          <button
            onClick={() => setTaskAssigneeFilter('my')}
            className={cn(
              'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
              taskAssigneeFilter === 'my'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
            )}
          >
            내 할일만 보기
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'To Do', value: 'todo' },
            { label: 'In Progress', value: 'in-progress' },
            { label: 'Done', value: 'done' },
          ].map(({ label, value }) => (
            <div key={value} className="bg-gray-100 dark:bg-slate-800/40 rounded-[2.5rem] p-4 min-h-[600px]">
              <div className="px-4 py-3 flex justify-between items-center mb-6">
                <h5 className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">{label}</h5>
                <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm text-gray-400 dark:text-slate-500">
                  {tasks.filter((t) => t.status === value).length}
                </span>
              </div>
              <div className="space-y-4">
                {tasks
                  .filter((t) => {
                    // 상태 필터
                    if (t.status !== value) return false;
                    // 담당자 필터
                    if (taskAssigneeFilter === 'my' && user?.profile?.name) {
                      return t.assignee === user.profile.name;
                    }
                    return true;
                  })
                  .map((t) => {
                    const assigneeName = t.assignee || '미지정';

                    return (
                      <div key={t.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 group transition-all">
                        <div className="flex justify-between mb-3">
                          <span
                            className={cn(
                              'text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter',
                              t.priority === 'high'
                                ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300'
                                : t.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-600 dark:text-yellow-300'
                                : 'bg-blue-100 text-blue-600 dark:text-blue-300',
                            )}
                          >
                            {t.priority || 'medium'}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditTask(t)}
                              className="text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 dark:text-indigo-300"
                              title="수정"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(t)}
                              className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 dark:text-indigo-300"
                              title="상태 변경"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTaskId(Number(t.id))}
                              className="text-red-300 hover:text-red-500"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-2 leading-relaxed">{t.title}</p>

                        {t.tag && (
                          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/50 px-3 py-2 rounded-xl mb-4">
                            <BookOpen size={14} className="text-indigo-600 dark:text-indigo-300" />
                            <span className="text-[10px] font-bold text-indigo-700 truncate">{t.tag}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-gray-500 dark:text-slate-400">
                              {assigneeName[0]}
                            </div>
                            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">{assigneeName}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-300 italic">{t.dueDate}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* 할 일 모달들 */}
        {isCreateModalOpen && (
          <TaskModal
            bu={bu}
            projects={projects}
            users={(usersData as any)?.users || []}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateTask}
          />
        )}

        {editTask && (
          <TaskModal
            task={editTask}
            bu={bu}
            projects={projects}
            users={(usersData as any)?.users || []}
            onClose={() => setEditTask(null)}
            onSubmit={(data) => handleUpdateTask(Number(editTask.id), data)}
          />
        )}

        {deleteTaskId !== null && (
          <DeleteConfirmModal
            title="할 일 삭제"
            message="정말 이 할 일을 삭제하시겠습니까?"
            onConfirm={() => handleDeleteTask(deleteTaskId)}
            onCancel={() => setDeleteTaskId(null)}
          />
        )}
      </div>
    );
  };

  const ScheduleView = () => {
    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tighter">일정/캘린더</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">프로젝트 일정 및 이벤트를 캘린더로 확인합니다.</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-700 p-8">
          <div className="text-center py-20 text-gray-400 dark:text-slate-500 font-bold">캘린더 뷰 (추후 구현 예정)</div>
        </div>
      </div>
    );
  };

  const PartnersView = () => {
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [isClientModalOpen, setClientModalOpen] = useState(false);
    const [isEditClientModalOpen, setEditClientModalOpen] = useState<Client | null>(null);
    const [deleteClientId, setDeleteClientId] = useState<number | null>(null);
    const [isClientWorkerModalOpen, setClientWorkerModalOpen] = useState<number | null>(null);
    const [isGlobalClientWorkerModalOpen, setGlobalClientWorkerModalOpen] = useState(false);
    const [isEditClientWorkerModalOpen, setEditClientWorkerModalOpen] = useState<{ companyId: number; workerId: number } | null>(null);
    const [deleteClientWorkerId, setDeleteClientWorkerId] = useState<number | null>(null);
    const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
    const buClients = clientsData.filter((c) => c.bu_code === bu);

    const filteredClients = useMemo(() => {
      if (!clientSearchQuery.trim()) return buClients;

      const query = clientSearchQuery.toLowerCase().trim();
      return buClients.filter((client) => {
        const companyNameKo = ((client as any).company_name_ko || '').toLowerCase();
        const companyNameEn = ((client as any).company_name_en || '').toLowerCase();
        const industry = (client.industry || '').toLowerCase();
        const representativeName = ((client as any).representative_name || '').toLowerCase();
        const businessRegNumber = ((client as any).business_registration_number || '').toLowerCase();

        return (
          companyNameKo.includes(query) ||
          companyNameEn.includes(query) ||
          industry.includes(query) ||
          representativeName.includes(query) ||
          businessRegNumber.includes(query)
        );
      });
    }, [buClients, clientSearchQuery]);

    const toggleExpand = (id: number) => {
      setExpandedId(expandedId === id ? null : id);
    };

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tighter">거래처/파트너 DB</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">협력사 및 클라이언트 연락망을 리스트로 관리합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setClientModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
              클라이언트 등록
            </button>
            <button
              onClick={() => setGlobalClientWorkerModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
              담당자 추가
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="클라이언트 검색..."
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-gray-50 dark:bg-slate-900 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-5">클라이언트 / 업종</th>
                  <th className="px-6 py-5">담당자</th>
                  <th className="px-6 py-5">대표자</th>
                  <th className="px-6 py-5">최근 미팅</th>
                  <th className="px-6 py-5 text-right">상태</th>
                  <th className="px-6 py-5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => {
                    const clientProjects = projects.filter((p) => (p as any).client_id === client.id);
                    const clientRevenues = financials.filter(
                      (f) => clientProjects.some((p) => p.id === f.projectId) && f.type === 'revenue'
                    );
                    const totalSpent = clientRevenues.reduce((sum, r) => sum + r.amount, 0);

                    const ClientWorkersList = () => {
                      const { data: workers = [] } = useClientWorkers(client.id);
                      const [workerSearchQuery, setWorkerSearchQuery] = useState<string>('');

                      const filteredWorkers = useMemo(() => {
                        if (!workerSearchQuery.trim()) return workers;

                        const query = workerSearchQuery.toLowerCase().trim();
                        return workers.filter((worker: any) => {
                          const nameKo = (worker.name_ko || '').toLowerCase();
                          const nameEn = (worker.name_en || '').toLowerCase();
                          const phone = (worker.phone || '').toLowerCase();
                          const email = (worker.email || '').toLowerCase();

                          return (
                            nameKo.includes(query) ||
                            nameEn.includes(query) ||
                            phone.includes(query) ||
                            email.includes(query)
                          );
                        });
                      }, [workers, workerSearchQuery]);

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-500">담당자</h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setClientWorkerModalOpen(client.id);
                              }}
                              className="rounded-lg bg-indigo-50 dark:bg-indigo-900/50 px-2 py-1 text-[10px] font-black text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 flex items-center gap-1"
                            >
                              <Plus size={10} />
                              담당자 추가
                            </button>
                          </div>
                          {workers.length > 0 && (
                            <div className="mb-2">
                              <input
                                type="text"
                                placeholder="담당자 검색..."
                                value={workerSearchQuery}
                                onChange={(e) => setWorkerSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          )}
                          {filteredWorkers.length > 0 ? (
                            <div className="space-y-1.5">
                              {filteredWorkers.map((worker: any) => (
                                <div
                                  key={worker.id}
                                  className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-slate-900 px-3 py-2 text-xs"
                                >
                                  <div>
                                    <p className="font-bold text-gray-800 dark:text-slate-200">
                                      {worker.name_ko || worker.name_en || '-'}
                                    </p>
                                    <p className="font-mono text-[11px] text-gray-500 dark:text-slate-400">
                                      {worker.phone || ''}
                                      {worker.phone && worker.email && ' • '}
                                      {worker.email || ''}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditClientWorkerModalOpen({ companyId: client.id, workerId: worker.id });
                                      }}
                                      className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[10px] font-black text-gray-500 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 dark:text-indigo-300"
                                    >
                                      수정
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteClientWorkerId(worker.id);
                                      }}
                                      className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[10px] font-black text-red-500 hover:border-red-300 hover:text-red-600 dark:text-red-300"
                                    >
                                      삭제
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-4 text-center">
                              <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                                {workerSearchQuery ? '검색 결과가 없습니다.' : '등록된 담당자가 없습니다.'}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    };

                    const ClientWorkersCount = () => {
                      const { data: workers = [] } = useClientWorkers(client.id);
                      const count = workers.length;

                      if (count === 0) {
                        return <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">담당자 없음</span>;
                      }

                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-bold text-gray-700 dark:text-slate-300">
                          <Users size={10} />
                          담당자 {count}명
                        </span>
                      );
                    };

                    return (
                      <React.Fragment key={client.id}>
                        <tr
                          onClick={() => toggleExpand(client.id)}
                          className={cn(
                            'cursor-pointer transition-colors',
                            expandedId === client.id ? 'bg-indigo-50 dark:bg-indigo-900/50/30' : 'hover:bg-gray-50 dark:hover:bg-slate-900'
                          )}
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <ChevronDown
                                className={cn(
                                  'w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform',
                                  expandedId === client.id && 'rotate-180',
                                )}
                              />
                              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm bg-gray-900">
                                {((client as any).company_name_ko || (client as any).company_name_en || '-').substring(0, 1)}
                              </div>
                              <div>
                                <p className="font-black text-gray-900 dark:text-slate-100 text-sm">
                                  {(client as any).company_name_ko || (client as any).company_name_en || '-'}
                                </p>
                                <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400">{client.industry || 'N/A'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <ClientWorkersCount />
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-gray-900 dark:text-slate-100">
                            {(client as any).representative_name || 'N/A'}
                          </td>
                          <td className="px-6 py-5 text-xs text-gray-500 dark:text-slate-400 font-mono">
                            {client.last_meeting_date || '-'}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <StatusBadge type={client.status === 'active' ? 'active' : 'default'} text={client.status} />
                          </td>
                          <td className="px-6 py-5 text-gray-400 dark:text-slate-500">
                            {expandedId === client.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </td>
                        </tr>
                        {expandedId === client.id && (
                          <tr className="bg-gray-50 dark:bg-slate-900/50">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-500 mb-2">
                                    회사 정보
                                  </h4>
                                  {(client as any).business_registration_number && (
                                    <div className="flex items-center text-xs text-gray-700 dark:text-slate-300">
                                      <span className="text-gray-500 dark:text-slate-400 mr-2">사업자등록번호:</span>
                                      {(client as any).business_registration_number}
                                    </div>
                                  )}
                                  {(client as any).representative_name && (
                                    <div className="flex items-center text-xs text-gray-700 dark:text-slate-300">
                                      <span className="text-gray-500 dark:text-slate-400 mr-2">대표자:</span>
                                      {(client as any).representative_name}
                                    </div>
                                  )}
                                  {client.last_meeting_date && (
                                    <div className="flex items-center text-xs text-gray-700 dark:text-slate-300">
                                      <span className="text-gray-500 dark:text-slate-400 mr-2">최근 미팅:</span>
                                      {client.last_meeting_date}
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-500 mb-2">
                                    거래 현황
                                  </h4>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 dark:text-slate-400">진행 프로젝트</span>
                                    <span className="font-bold">{clientProjects.length} 건</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 dark:text-slate-400">총 매출액</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-300">
                                      {formatCurrency(totalSpent)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col justify-end items-start md:items-end gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditClientModalOpen(client);
                                    }}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors text-gray-700 dark:text-slate-300"
                                  >
                                    정보 수정
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteClientId(client.id);
                                    }}
                                    className="px-4 py-2 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded-xl text-sm font-bold hover:bg-red-100 dark:bg-red-900/50 transition-colors"
                                  >
                                    삭제
                                  </button>
                                </div>
                                <div className="md:col-span-3 mt-4">
                                  <ClientWorkersList />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">
                      {clientSearchQuery ? '검색 결과가 없습니다.' : '등록된 클라이언트가 없습니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isClientModalOpen && (
          <CreateClientModal
            bu={bu}
            onClose={() => setClientModalOpen(false)}
            onSubmit={async (data) => {
              try {
                await createClientMutation.mutateAsync(data as any);
                setClientModalOpen(false);
              } catch (error) {
                console.error('Failed to create client:', error);
              }
            }}
          />
        )}

        {isEditClientModalOpen && (
          <EditClientModal
            client={isEditClientModalOpen}
            onClose={() => setEditClientModalOpen(null)}
            onSubmit={async (data) => {
              try {
                await updateClientMutation.mutateAsync({
                  id: isEditClientModalOpen.id,
                  data: data as any,
                });
                setEditClientModalOpen(null);
              } catch (error) {
                console.error('Failed to update client:', error);
              }
            }}
          />
        )}

        {deleteClientId && (
          <DeleteConfirmModal
            title="클라이언트 삭제"
            message="정말로 이 클라이언트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
            onConfirm={async () => {
              try {
                await deleteClientMutation.mutateAsync(deleteClientId);
                setDeleteClientId(null);
              } catch (error) {
                console.error('Failed to delete client:', error);
              }
            }}
            onCancel={() => setDeleteClientId(null)}
          />
        )}

        {isClientWorkerModalOpen && (
          <CreateClientWorkerModal
            clientCompanyId={isClientWorkerModalOpen}
            onClose={() => setClientWorkerModalOpen(null)}
            onSubmit={async (data) => {
              try {
                await createClientWorkerMutation.mutateAsync(data);
                setClientWorkerModalOpen(null);
              } catch (error) {
                console.error('Failed to create client worker:', error);
              }
            }}
          />
        )}

        {isGlobalClientWorkerModalOpen && (
          <CreateClientWorkerModal
            clients={clientsData as Client[]}
            onClose={() => setGlobalClientWorkerModalOpen(false)}
            onSubmit={async (data) => {
              try {
                await createClientWorkerMutation.mutateAsync(data);
                setGlobalClientWorkerModalOpen(false);
              } catch (error) {
                console.error('Failed to create client worker:', error);
              }
            }}
          />
        )}

        {isEditClientWorkerModalOpen && (() => {
          const { data: workers = [] } = useClientWorkers(isEditClientWorkerModalOpen.companyId);
          const worker = workers.find((w: any) => w.id === isEditClientWorkerModalOpen.workerId);
          return worker ? (
            <EditClientWorkerModal
              clientCompanyId={isEditClientWorkerModalOpen.companyId}
              worker={worker}
              onClose={() => setEditClientWorkerModalOpen(null)}
              onSubmit={async (data) => {
                try {
                  await updateClientWorkerMutation.mutateAsync({
                    id: isEditClientWorkerModalOpen.workerId,
                    data,
                  });
                  setEditClientWorkerModalOpen(null);
                } catch (error) {
                  console.error('Failed to update client worker:', error);
                }
              }}
            />
          ) : null;
        })()}

        {deleteClientWorkerId && (
          <DeleteConfirmModal
            title="담당자 삭제"
            message="정말로 이 담당자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
            onConfirm={async () => {
              try {
                await deleteClientWorkerMutation.mutateAsync(deleteClientWorkerId);
                setDeleteClientWorkerId(null);
              } catch (error) {
                console.error('Failed to delete client worker:', error);
              }
            }}
            onCancel={() => setDeleteClientWorkerId(null)}
          />
        )}
      </div>
    );
  };

  const SettlementsView = () => {
    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tighter">정산 및 회계</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">안무 제작비 및 아티스트 지급 내역을 관리합니다.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-2">Total Monthly Rev.</p>
            <h4 className="text-4xl font-black">₩{(totalRevenue / 10000).toLocaleString()}만</h4>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-400">
              <TrendingUp size={14} /> +18.4% Trend
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-700 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Artist Share (70%)</p>
            <h4 className="text-3xl font-black text-gray-800 dark:text-slate-200">₩{(settlements.reduce((sum, s) => sum + s.dancerFee, 0) / 10000).toLocaleString()}만</h4>
          </div>
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-700 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Net Profit (30%)</p>
            <h4 className="text-3xl font-black text-indigo-600 dark:text-indigo-300">₩{(settlements.reduce((sum, s) => sum + s.companyFee, 0) / 10000).toLocaleString()}만</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-900 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700">
              <tr>
                <th className="px-8 py-5">Item / Settlement Date</th>
                <th className="px-8 py-5">Total Amount</th>
                <th className="px-8 py-5 text-red-500">Artist Fee</th>
                <th className="px-8 py-5 text-indigo-600 dark:text-indigo-300">Company Net</th>
                <th className="px-8 py-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {settlements.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-bold text-sm text-gray-900 dark:text-slate-100">{s.title}</p>
                    <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">{s.date}</p>
                  </td>
                  <td className="px-8 py-5 text-xs font-black text-gray-800 dark:text-slate-200">₩{s.totalAmount.toLocaleString()}</td>
                  <td className="px-8 py-5 text-xs font-bold text-red-500">- ₩{s.dancerFee.toLocaleString()}</td>
                  <td className="px-8 py-5 text-xs font-black text-indigo-600 dark:text-indigo-300">₩{s.companyFee.toLocaleString()}</td>
                  <td className="px-8 py-5 text-right">
                    <StatusBadge type={s.status === 'Completed' ? 'active' : 'warning'} text={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
      </div>
    );
  };

  const ManualsView = () => {
    const [selectedCategory, setSelectedCategory] = useState('All');

    const filteredManuals = useMemo(() => {
      return selectedCategory === 'All' ? manuals : manuals.filter((m) => m.category === selectedCategory);
    }, [manuals, selectedCategory]);

    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tighter">SOP & Manual Center</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">실무 표준 절차 및 업무 가이드라인 (ERP Only)</p>
          </div>
        </div>

        <div className="flex flex-1 gap-8 overflow-hidden">
          <div className="w-64 flex-shrink-0 overflow-y-auto pr-2">
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-4 border border-gray-100 dark:border-slate-700 shadow-sm h-full">
              <h3 className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-4 mt-2">Categories</h3>
              <div className="space-y-1">
                {MANUAL_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all group',
                      selectedCategory === c ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-900 hover:text-gray-900 dark:text-slate-100'
                    )}
                  >
                    <span className="flex items-center gap-3">
                      {c === 'All' && <LayoutDashboard size={16} />}
                      {c === '전사 공통/ERP' && <FileText size={16} />}
                      {c === '아티스트 관리' && <Star size={16} />}
                      {c === '행정/비자' && <ShieldCheck size={16} />}
                      {c === '현장/제작' && <Camera size={16} />}
                      {c === '재무/정산' && <DollarSign size={16} />}
                      {c}
                    </span>
                    {selectedCategory === c && <ChevronRight size={14} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 gap-4">
              {filteredManuals.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setActiveManual(m)}
                  className="bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border border-gray-100 dark:border-slate-700 shadow-sm hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-6">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors',
                        m.category === '전사 공통/ERP' ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300' : '',
                        m.category === '아티스트 관리' ? 'bg-purple-50 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300' : '',
                        m.category === '행정/비자' ? 'bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-300' : '',
                        m.category === '현장/제작' ? 'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300' : 'bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-slate-300'
                      )}
                    >
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-900 dark:text-slate-100 mb-1 group-hover:text-indigo-600 dark:hover:text-indigo-400 dark:text-indigo-300 transition-colors">{m.title}</h3>
                      <div className="flex items-center gap-3">
                        <StatusBadge type="default" text={m.category} />
                        <span className="text-xs text-gray-400 dark:text-slate-500 font-medium flex items-center gap-1">
                          <Clock size={10} /> {new Date(m.updated_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 pr-4">
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Author</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-slate-300">{m.author_name || '관리자'}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-100 dark:bg-slate-800 hidden md:block"></div>
                    <div className="flex items-center gap-1 text-gray-400 dark:text-slate-500">
                      <Clock size={14} />
                      <span className="text-xs font-bold">{new Date(m.updated_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
              {filteredManuals.length === 0 && (
                <div className="py-20 text-center text-gray-400 dark:text-slate-500 font-bold bg-white dark:bg-slate-800 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-slate-700">등록된 매뉴얼이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ManualDetailModal = ({ manual, onClose }: { manual: Manual | null; onClose: () => void }) => {
    if (!manual) return null;

    // content가 JSONB이므로 배열로 처리
    const contentArray = Array.isArray(manual.content) ? manual.content : typeof manual.content === 'string' ? JSON.parse(manual.content) : [];

    return (
      <Modal isOpen={!!manual} onClose={onClose} title={manual.title} size="lg">
        <div className="flex flex-col h-full bg-white dark:bg-slate-800">
          <div className="p-8 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                  manual.category === '전사 공통/ERP' ? 'bg-indigo-100 text-indigo-700' : '',
                  manual.category === '아티스트 관리' ? 'bg-purple-100 text-purple-700' : '',
                  manual.category === '행정/비자' ? 'bg-red-100 dark:bg-red-900/50 text-red-700' : '',
                  manual.category === '현장/제작' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'
                )}
              >
                {manual.category}
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500 font-bold">Last updated: {new Date(manual.updated_at).toLocaleDateString('ko-KR')}</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100 mb-2">{manual.title}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">작성자: {manual.author_name || '관리자'}</p>
          </div>

          <div className="p-8 space-y-8">
            <div className="space-y-6">
              {contentArray.length > 0 ? (
                contentArray.map((item: any, idx: number) => (
                  <div key={idx} className={cn('p-5 rounded-2xl border transition-all', item.type === 'warning' ? 'bg-red-50 dark:bg-red-900/50 border-red-100 dark:border-red-900/50' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:shadow-md')}>
                    <div className="flex gap-4">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg shadow-sm',
                          item.type === 'step' ? 'bg-indigo-600 text-white' : '',
                          item.type === 'check' ? 'bg-green-50 dark:bg-green-900/500 text-white' : '',
                          item.type === 'warning' ? 'bg-red-50 dark:bg-red-900/500 text-white' : '',
                          item.type === 'info' ? 'bg-blue-50 dark:bg-blue-900/500 text-white' : '',
                          item.type === 'star' ? 'bg-amber-400 text-white' : ''
                        )}
                      >
                        {item.type === 'step' && idx + 1}
                        {item.type === 'check' && <CheckSquare size={18} />}
                        {item.type === 'warning' && <AlertCircle size={18} />}
                        {item.type === 'info' && <Info size={18} />}
                        {item.type === 'star' && <Star size={18} fill="currentColor" />}
                      </div>
                      <div>
                        <h4 className={cn('font-black text-base mb-1.5', item.type === 'warning' ? 'text-red-700' : 'text-gray-900 dark:text-slate-100')}>{item.title || item.text}</h4>
                        <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">{item.desc || item.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400 dark:text-slate-500">매뉴얼 내용이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'artists':
        return <ArtistsView bu={bu} />;
      case 'dancers':
        return <DancersView bu={bu} />;
      case 'projects':
        return <ProjectsView />;
      case 'tasks':
        return <TasksView />;
      case 'schedule':
        return <ScheduleView />;
      case 'partners':
        return <PartnersView />;
      case 'settlements':
        return <SettlementsView />;
      case 'attendance':
        return <AttendanceManagementView />;
      case 'manuals':
        return <ManualsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8F9FD] dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-900 dark:selection:text-indigo-100 overflow-hidden">
      <aside className="w-72 bg-gray-950 flex flex-col shadow-2xl z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10 group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl italic shadow-lg shadow-indigo-500/30 group-hover:rotate-6 transition-transform">G</div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none text-white">그리고</h1>
              <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">Entertainment</span>
            </div>
          </div>

          <nav className="space-y-1">
            {user?.profile?.bu_code === 'HEAD' && (
              <>
                <button
                  onClick={() => router.push('/')}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[13px] font-black transition-all text-gray-500 dark:text-slate-400 hover:text-gray-200 hover:bg-white dark:bg-slate-800/5 border border-white/10"
                >
                  <Home size={18} />
                  통합 ERP로 이동
                </button>
                <div className="h-px bg-white dark:bg-slate-800/10 my-2"></div>
              </>
            )}
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: '통합 대시보드' },
              { id: 'artists', icon: Users, label: '전속 아티스트 관리' },
              { id: 'dancers', icon: UserPlus, label: '댄서 관리' },
              { id: 'projects', icon: Briefcase, label: '프로젝트 관리' },
              { id: 'tasks', icon: CheckSquare, label: '업무 및 할일' },
              { id: 'schedule', icon: CalendarIcon, label: '일정/캘린더' },
              { id: 'partners', icon: Building2, label: '거래처 관리' },
              { id: 'settlements', icon: CreditCard, label: '정산/회계' },
              { id: 'attendance', icon: Clock, label: '근무시간 관리' },
              { id: 'manuals', icon: BookOpen, label: '매뉴얼/가이드' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as GrigoEntView)}
                className={cn(
                  'w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[13px] font-black transition-all',
                  activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-gray-500 dark:text-slate-400 hover:text-gray-200 hover:bg-white dark:bg-slate-800/5'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 pt-0">
          <div className="rounded-2xl border border-white/10 bg-white dark:bg-slate-800/5 p-4">
            <p className="mb-1 text-[10px] uppercase tracking-tighter text-gray-500 dark:text-slate-400">Signed in as</p>
            <p className="text-sm font-semibold text-gray-200">
              {user?.profile?.name || user?.email || '사용자'}
            </p>
            {user?.profile?.position && (
              <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">{user.profile.position}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-xl border border-white/10 bg-white dark:bg-slate-800/5 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-red-50 dark:bg-red-900/500/10 hover:text-red-400 flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700 flex items-center justify-between px-10 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Workspace</h2>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="text-sm font-black text-gray-900 dark:text-slate-100 capitalize tracking-tight">{activeTab} Section</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 rounded-full text-[10px] font-black text-gray-500 dark:text-slate-400">
              <div className="w-1.5 h-1.5 bg-green-50 dark:bg-green-900/500 rounded-full animate-pulse"></div>
              SYSTEM ONLINE
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-[#F9FAFF]/50">
          <div className="max-w-7xl mx-auto pb-20">{renderView()}</div>
        </div>

        <ManualDetailModal manual={activeManual} onClose={() => setActiveManual(null)} />
      </main>
    </div>
  );
}

// ============================================
// Modal Components
// ============================================

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 flex-shrink-0">
          <h3 className="font-black text-lg text-gray-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={18} className="text-gray-500 dark:text-slate-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
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
      <label className="space-y-1.5">
        <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <input
          type="date"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
        />
      </label>
    );
  }

  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
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
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
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
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
      >
        취소
      </button>
      <button
        onClick={onPrimary}
        className="px-4 py-2 rounded-xl bg-indigo-600 text-sm font-black text-white hover:bg-indigo-700 transition-colors"
      >
        {primaryLabel}
      </button>
    </div>
  );
}

// Artist Modal
function ArtistModal({
  artist,
  artists,
  onClose,
  onSubmit,
}: {
  artist?: Artist | null;
  artists: Artist[];
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type?: ArtistType;
    team_id?: number;
    nationality?: string;
    visa_type?: string;
    contract_start: string;
    contract_end: string;
    visa_start?: string;
    visa_end?: string;
    role?: string;
    status?: ArtistStatus;
  }) => void;
}) {
  const [form, setForm] = useState({
    name: artist?.name || '',
    type: (artist?.type || 'individual') as ArtistType,
    team_id: artist?.team_id ? String(artist.team_id) : '',
    nationality: artist?.nationality || '',
    visa_type: artist?.visa_type || '',
    contract_start: artist?.contract_start || '',
    contract_end: artist?.contract_end || '',
    visa_start: artist?.visa_start || '',
    visa_end: artist?.visa_end || '',
    role: artist?.role || '',
    status: (artist?.status || 'Active') as ArtistStatus,
  });

  // 팀 목록 필터링 (type이 'team'인 아티스트만, 현재 편집 중인 아티스트 제외)
  const teamOptions = artists.filter(
    (a) => a.type === 'team' && (!artist || a.id !== artist.id)
  );

  const handleSubmit = () => {
    if (!form.name || !form.contract_start || !form.contract_end) {
      alert('이름, 계약 시작일, 계약 종료일은 필수 항목입니다.');
      return;
    }
    onSubmit({
      ...form,
      team_id: form.team_id ? Number(form.team_id) : undefined,
    });
  };

  return (
    <ModalShell title={artist ? '아티스트 수정' : '아티스트 추가'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="이름 *"
            value={form.name}
            onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
            placeholder="아티스트 이름"
          />
          <SelectField
            label="타입 *"
            value={form.type}
            onChange={(v) => {
              const newType = v as ArtistType;
              setForm((prev) => ({
                ...prev,
                type: newType,
                // 타입이 'team'으로 변경되면 team_id 초기화
                team_id: newType === 'team' ? '' : prev.team_id,
              }));
            }}
            options={[
              { value: 'individual', label: '개인' },
              { value: 'team', label: '팀' },
            ]}
          />
        </div>

        {form.type === 'individual' && teamOptions.length > 0 && (
          <SelectField
            label="소속팀"
            value={form.team_id}
            onChange={(v) => setForm((prev) => ({ ...prev, team_id: v }))}
            options={[
              { value: '', label: '선택 안함' },
              ...teamOptions.map((t) => ({ value: String(t.id), label: t.name })),
            ]}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="국적"
            value={form.nationality}
            onChange={(v) => setForm((prev) => ({ ...prev, nationality: v }))}
            placeholder="예: KOR, JPN, USA"
          />
          <InputField
            label="역할"
            value={form.role}
            onChange={(v) => setForm((prev) => ({ ...prev, role: v }))}
            placeholder="예: 댄스팀 한야, 전속 안무가"
          />
        </div>

        <SelectField
          label="비자 유형"
          value={form.visa_type}
          onChange={(v) => setForm((prev) => ({ ...prev, visa_type: v }))}
          options={[
            { value: '', label: '선택 안함' },
            { value: 'N/A (내국인)', label: 'N/A (내국인)' },
            { value: 'E-6 (예술흥행)', label: 'E-6 (예술흥행)' },
            { value: 'F-2 (거주)', label: 'F-2 (거주)' },
            { value: 'F-4 (재외동포)', label: 'F-4 (재외동포)' },
          ]}
        />

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="계약 시작일 *"
            type="date"
            value={form.contract_start}
            onChange={(v) => setForm((prev) => ({ ...prev, contract_start: v }))}
          />
          <InputField
            label="계약 종료일 *"
            type="date"
            value={form.contract_end}
            onChange={(v) => setForm((prev) => ({ ...prev, contract_end: v }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="비자 시작일"
            type="date"
            value={form.visa_start}
            onChange={(v) => setForm((prev) => ({ ...prev, visa_start: v }))}
          />
          <InputField
            label="비자 종료일"
            type="date"
            value={form.visa_end}
            onChange={(v) => setForm((prev) => ({ ...prev, visa_end: v }))}
          />
        </div>

        <SelectField
          label="상태"
          value={form.status}
          onChange={(v) => setForm((prev) => ({ ...prev, status: v as ArtistStatus }))}
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
            { value: 'Archived', label: 'Archived' },
          ]}
        />

        <ModalActions onPrimary={handleSubmit} onClose={onClose} primaryLabel={artist ? '수정' : '등록'} />
      </div>
    </ModalShell>
  );
}

// DancerModal은 DancersView.tsx에서 관리

// Client Modals
function CreateClientModal({
  bu,
  onClose,
  onSubmit,
}: {
  bu: BU;
  onClose: () => void;
  onSubmit: (data: Partial<Client>) => void;
}) {
  const [form, setForm] = useState({
    company_name_en: '',
    company_name_ko: '',
    industry: '',
    business_registration_number: '',
    representative_name: '',
    status: 'active' as 'active' | 'inactive' | 'archived',
    last_meeting_date: '',
    business_registration_file: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    const nameEnTrimmed = form.company_name_en.trim();
    const nameKoTrimmed = form.company_name_ko.trim();

    if (!nameEnTrimmed && !nameKoTrimmed) {
      setError('회사명 (영어) 또는 회사명 (한글) 중 하나는 입력해주세요.');
      return;
    }

    const toNullIfEmpty = (value: string) => (value.trim() === '' ? null : value.trim());

    onSubmit({
      bu_code: bu,
      company_name_en: nameEnTrimmed || null,
      company_name_ko: nameKoTrimmed || null,
      industry: toNullIfEmpty(form.industry),
      business_registration_number: toNullIfEmpty(form.business_registration_number),
      representative_name: toNullIfEmpty(form.representative_name),
      status: form.status,
      last_meeting_date: toNullIfEmpty(form.last_meeting_date),
      business_registration_file: toNullIfEmpty(form.business_registration_file),
    } as any);
  };

  return (
    <ModalShell title="클라이언트 회사 등록" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="회사명 (한글)"
            placeholder="회사명 (한글)"
            value={form.company_name_ko}
            onChange={(v) => setForm((prev) => ({ ...prev, company_name_ko: v }))}
          />
          <InputField
            label="회사명 (영어)"
            placeholder="Company Name (English)"
            value={form.company_name_en}
            onChange={(v) => setForm((prev) => ({ ...prev, company_name_en: v }))}
          />
          <InputField
            label="업종"
            placeholder="예: 엔터테인먼트"
            value={form.industry}
            onChange={(v) => setForm((prev) => ({ ...prev, industry: v }))}
          />
          <InputField
            label="사업자등록번호"
            placeholder="123-45-67890"
            value={form.business_registration_number}
            onChange={(v) => setForm((prev) => ({ ...prev, business_registration_number: v }))}
          />
          <InputField
            label="대표자명"
            placeholder="대표자 이름"
            value={form.representative_name}
            onChange={(v) => setForm((prev) => ({ ...prev, representative_name: v }))}
          />
          <InputField
            label="최근 미팅일"
            type="date"
            value={form.last_meeting_date}
            onChange={(v) => setForm((prev) => ({ ...prev, last_meeting_date: v }))}
          />
          <InputField
            label="사업자등록증 첨부"
            placeholder="파일 URL 또는 경로"
            value={form.business_registration_file}
            onChange={(v) => setForm((prev) => ({ ...prev, business_registration_file: v }))}
          />
          <SelectField
            label="상태"
            value={form.status}
            onChange={(val) => setForm((prev) => ({ ...prev, status: val as any }))}
            options={[
              { value: 'active', label: '활성' },
              { value: 'inactive', label: '비활성' },
              { value: 'archived', label: '보관됨' },
            ]}
          />
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-900/50 px-3 py-2">
            <p className="text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}
        <ModalActions
          onPrimary={handleSubmit}
          onClose={onClose}
          primaryLabel="등록"
        />
      </div>
    </ModalShell>
  );
}

function EditClientModal({
  client,
  onClose,
  onSubmit,
}: {
  client: Client;
  onClose: () => void;
  onSubmit: (data: Partial<Client>) => void;
}) {
  const [form, setForm] = useState({
    company_name_en: (client as any).company_name_en || '',
    company_name_ko: (client as any).company_name_ko || '',
    industry: client.industry || '',
    business_registration_number: (client as any).business_registration_number || '',
    representative_name: (client as any).representative_name || '',
    status: client.status,
    last_meeting_date: client.last_meeting_date || '',
    business_registration_file: (client as any).business_registration_file || '',
  });
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    const nameEnTrimmed = form.company_name_en.trim();
    const nameKoTrimmed = form.company_name_ko.trim();

    if (!nameEnTrimmed && !nameKoTrimmed) {
      setError('회사명 (영어) 또는 회사명 (한글) 중 하나는 입력해주세요.');
      return;
    }

    const toNullIfEmpty = (value: string) => (value.trim() === '' ? null : value.trim());

    onSubmit({
      company_name_en: nameEnTrimmed || null,
      company_name_ko: nameKoTrimmed || null,
      industry: toNullIfEmpty(form.industry),
      business_registration_number: toNullIfEmpty(form.business_registration_number),
      representative_name: toNullIfEmpty(form.representative_name),
      status: form.status,
      last_meeting_date: toNullIfEmpty(form.last_meeting_date),
      business_registration_file: toNullIfEmpty(form.business_registration_file),
    } as any);
  };

  return (
    <ModalShell title="클라이언트 회사 수정" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="회사명 (한글)"
            placeholder="회사명 (한글)"
            value={form.company_name_ko}
            onChange={(v) => setForm((prev) => ({ ...prev, company_name_ko: v }))}
          />
          <InputField
            label="회사명 (영어)"
            placeholder="Company Name (English)"
            value={form.company_name_en}
            onChange={(v) => setForm((prev) => ({ ...prev, company_name_en: v }))}
          />
          <InputField
            label="업종"
            placeholder="예: 엔터테인먼트"
            value={form.industry}
            onChange={(v) => setForm((prev) => ({ ...prev, industry: v }))}
          />
          <InputField
            label="사업자등록번호"
            placeholder="123-45-67890"
            value={form.business_registration_number}
            onChange={(v) => setForm((prev) => ({ ...prev, business_registration_number: v }))}
          />
          <InputField
            label="대표자명"
            placeholder="대표자 이름"
            value={form.representative_name}
            onChange={(v) => setForm((prev) => ({ ...prev, representative_name: v }))}
          />
          <InputField
            label="최근 미팅일"
            type="date"
            value={form.last_meeting_date}
            onChange={(v) => setForm((prev) => ({ ...prev, last_meeting_date: v }))}
          />
          <InputField
            label="사업자등록증 첨부"
            placeholder="파일 URL 또는 경로"
            value={form.business_registration_file}
            onChange={(v) => setForm((prev) => ({ ...prev, business_registration_file: v }))}
          />
          <SelectField
            label="상태"
            value={form.status}
            onChange={(val) => setForm((prev) => ({ ...prev, status: val as any }))}
            options={[
              { value: 'active', label: '활성' },
              { value: 'inactive', label: '비활성' },
              { value: 'archived', label: '보관됨' },
            ]}
          />
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-900/50 px-3 py-2">
            <p className="text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}
        <ModalActions
          onPrimary={handleSubmit}
          onClose={onClose}
          primaryLabel="수정"
        />
      </div>
    </ModalShell>
  );
}

// Client Worker Modals
function CreateClientWorkerModal({
  clientCompanyId,
  clients,
  onClose,
  onSubmit,
}: {
  clientCompanyId?: number;
  clients?: Client[];
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [form, setForm] = useState({
    name_en: '',
    name_ko: '',
    phone: '',
    email: '',
    business_card_file: '',
  });
  const [selectedClientId, setSelectedClientId] = useState<string>(clientCompanyId ? String(clientCompanyId) : '');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    const nameEnTrimmed = form.name_en.trim();
    const nameKoTrimmed = form.name_ko.trim();

    if (!nameEnTrimmed && !nameKoTrimmed) {
      setError('이름 (영어) 또는 이름 (한글) 중 하나는 입력해주세요.');
      return;
    }

    const toNullIfEmpty = (value: string) => (value.trim() === '' ? null : value.trim());
    const effectiveCompanyId = clientCompanyId ?? (selectedClientId ? Number(selectedClientId) : null);

    onSubmit({
      client_company_id: effectiveCompanyId,
      name_en: nameEnTrimmed || null,
      name_ko: nameKoTrimmed || null,
      phone: toNullIfEmpty(form.phone),
      email: toNullIfEmpty(form.email),
      business_card_file: toNullIfEmpty(form.business_card_file),
    });
  };

  return (
    <ModalShell title="담당자 등록" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {!clientCompanyId && (
            <SelectField
              label="소속"
              value={selectedClientId}
              onChange={(val) => setSelectedClientId(val)}
              options={[
                { value: '', label: '소속 선택 안함' },
                ...(clients ?? []).map((c) => ({
                  value: String(c.id),
                  label: (c as any).company_name_ko || (c as any).company_name_en || '-',
                })),
              ]}
            />
          )}
          <InputField
            label="이름 (한글)"
            placeholder="이름 (한글)"
            value={form.name_ko}
            onChange={(v) => setForm((prev) => ({ ...prev, name_ko: v }))}
          />
          <InputField
            label="이름 (영어)"
            placeholder="Name (English)"
            value={form.name_en}
            onChange={(v) => setForm((prev) => ({ ...prev, name_en: v }))}
          />
          <InputField
            label="연락처"
            placeholder="010-0000-0000"
            value={form.phone}
            onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
          />
          <InputField
            label="이메일주소"
            type="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
          />
          <InputField
            label="명함 첨부"
            placeholder="파일 URL 또는 경로"
            value={form.business_card_file}
            onChange={(v) => setForm((prev) => ({ ...prev, business_card_file: v }))}
          />
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-900/50 px-3 py-2">
            <p className="text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}
        <ModalActions
          onPrimary={handleSubmit}
          onClose={onClose}
          primaryLabel="등록"
        />
      </div>
    </ModalShell>
  );
}

function EditClientWorkerModal({
  clientCompanyId,
  worker,
  onClose,
  onSubmit,
}: {
  clientCompanyId: number;
  worker: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [form, setForm] = useState({
    name_en: worker.name_en || '',
    name_ko: worker.name_ko || '',
    phone: worker.phone || '',
    email: worker.email || '',
    business_card_file: worker.business_card_file || '',
  });
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    const nameEnTrimmed = form.name_en.trim();
    const nameKoTrimmed = form.name_ko.trim();

    if (!nameEnTrimmed && !nameKoTrimmed) {
      setError('이름 (영어) 또는 이름 (한글) 중 하나는 입력해주세요.');
      return;
    }

    const toNullIfEmpty = (value: string) => (value.trim() === '' ? null : value.trim());

    onSubmit({
      name_en: nameEnTrimmed || null,
      name_ko: nameKoTrimmed || null,
      phone: toNullIfEmpty(form.phone),
      email: toNullIfEmpty(form.email),
      business_card_file: toNullIfEmpty(form.business_card_file),
    });
  };

  return (
    <ModalShell title="담당자 수정" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="이름 (한글)"
            placeholder="이름 (한글)"
            value={form.name_ko}
            onChange={(v) => setForm((prev) => ({ ...prev, name_ko: v }))}
          />
          <InputField
            label="이름 (영어)"
            placeholder="Name (English)"
            value={form.name_en}
            onChange={(v) => setForm((prev) => ({ ...prev, name_en: v }))}
          />
          <InputField
            label="연락처"
            placeholder="010-0000-0000"
            value={form.phone}
            onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
          />
          <InputField
            label="이메일주소"
            type="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
          />
          <InputField
            label="명함 첨부"
            placeholder="파일 URL 또는 경로"
            value={form.business_card_file}
            onChange={(v) => setForm((prev) => ({ ...prev, business_card_file: v }))}
          />
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-900/50 px-3 py-2">
            <p className="text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}
        <ModalActions
          onPrimary={handleSubmit}
          onClose={onClose}
          primaryLabel="수정"
        />
      </div>
    </ModalShell>
  );
}

// Task Modal Component
function TaskModal({
  task,
  projectId,
  bu,
  projects,
  users,
  onClose,
  onSubmit,
}: {
  task?: any;
  projectId?: string;
  bu: BU;
  projects: any[];
  users: any[];
  onClose: () => void;
  onSubmit: (data: {
    projectId: string;
    bu: BU;
    title: string;
    assignee: string;
    dueDate: string;
    status?: 'todo' | 'in-progress' | 'done';
  }) => void;
}) {
  const userOptions = (users || []).filter((u) => u && u.name).map((u) => u.name as string);
  const initialAssignee = task?.assignee || '';
  const isInitialFromUser = !!initialAssignee && userOptions.includes(initialAssignee);

  const [form, setForm] = useState({
    projectId: task?.projectId || projectId || projects[0]?.id || '',
    title: task?.title || '',
    assigneeUser: isInitialFromUser ? initialAssignee : '',
    assigneeCustom: isInitialFromUser ? '' : initialAssignee,
    dueDate: task?.dueDate || '',
    status: task?.status || 'todo',
  });

  return (
    <ModalShell title={task ? '할 일 수정' : '할 일 등록'} onClose={onClose}>
      <div className="grid grid-cols-1 gap-3">
        <SelectField
          label="프로젝트"
          value={form.projectId}
          onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
        />
        <InputField
          label="업무 제목"
          placeholder="업무 제목"
          value={form.title}
          onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
        />
        <SelectField
          label="담당자 (사내 사용자)"
          value={form.assigneeUser}
          onChange={(val) => setForm((prev) => ({ ...prev, assigneeUser: val }))}
          options={[
            { value: '', label: '선택 안함' },
            ...userOptions.map((name) => ({ value: name, label: name })),
          ]}
        />
        <InputField
          label="담당자 (직접 입력)"
          placeholder="담당자 이름을 직접 입력"
          value={form.assigneeCustom}
          onChange={(v) => setForm((prev) => ({ ...prev, assigneeCustom: v }))}
        />
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
            onChange={(val) => setForm((prev) => ({ ...prev, status: val as any }))}
            options={[
              { value: 'todo', label: '할 일' },
              { value: 'in-progress', label: '진행 중' },
              { value: 'done', label: '완료' },
            ]}
          />
        </div>
      </div>
      <ModalActions
        onPrimary={() => {
          const assignee = form.assigneeCustom || form.assigneeUser || '';
          onSubmit({
            projectId: form.projectId,
            bu,
            title: form.title,
            assignee,
            dueDate: form.dueDate,
            status: form.status as 'todo' | 'in-progress' | 'done',
          });
        }}
        onClose={onClose}
        primaryLabel={task ? '수정' : '등록'}
      />
      {task?.id && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
          <CommentSection entityType="task" entityId={Number(task.id)} />
        </div>
      )}
    </ModalShell>
  );
}

// Delete Confirm Modal
function DeleteConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <h3 className="font-black text-lg text-gray-900 dark:text-slate-100">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">{message}</p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-xl bg-red-600 text-sm font-black text-white hover:bg-red-700 transition-colors"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


