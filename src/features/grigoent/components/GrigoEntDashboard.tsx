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
import type { BU, Artist, Project, ProjectTask, Client, ClientStatus, Event, Manual, ExternalWorker, ExternalWorkerType, FinancialEntry, ArtistStatus, ArtistType, ClientType } from '@/types/database';
import {
  useArtists,
  useCreateArtist,
  useUpdateArtist,
  useDeleteArtist,
  useProjects,
  useTasks,
  useFinancialEntries,
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useEvents,
  useManuals,
  useExternalWorkers,
  useCreateExternalWorker,
  useUpdateExternalWorker,
  useDeleteExternalWorker,
  useOrgMembers,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useCreateFinancialEntry,
  useUpdateFinancialEntry,
  useDeleteFinancialEntry,
  useCreateTask,
  useUpdateTask,
} from '@/features/erp/hooks';
import { dbProjectToFrontend, dbTaskToFrontend, dbFinancialToFrontend, frontendFinancialToDb, frontendTaskToDb } from '@/features/erp/utils';

type GrigoEntView =
  | 'dashboard'
  | 'artists'
  | 'freelancers'
  | 'projects'
  | 'tasks'
  | 'schedule'
  | 'partners'
  | 'settlements'
  | 'manuals';

// 상수 정의
const VISA_TYPES = ['N/A (내국인)', 'E-6 (예술흥행)', 'F-2 (거주)', 'F-4 (재외동포)'];
const MANUAL_CATEGORIES = ['All', '전사 공통/ERP', '아티스트 관리', '행정/비자', '현장/제작', '재무/정산'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

function StatusBadge({ type, text }: { type?: string; text: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    ongoing: 'bg-blue-100 text-blue-700',
    planning: 'bg-purple-100 text-purple-700',
    completed: 'bg-gray-100 text-gray-500',
    paused: 'bg-yellow-100 text-yellow-700',
    warning: 'bg-orange-100 text-orange-700',
    danger: 'bg-red-100 text-red-700',
    vip: 'bg-amber-100 text-amber-700',
    default: 'bg-gray-100 text-gray-700',
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
      <div className={cn('bg-white rounded-[2rem] w-full', sizeClasses[size], 'shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]')}>
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
          <h3 className="font-black text-lg text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={18} className="text-gray-500" />
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
  const { data: externalWorkersData = [] } = useExternalWorkers(bu);
  const { data: projectsData = [] } = useProjects(bu);
  const { data: tasksData = [] } = useTasks(bu);
  const { data: clientsData = [] } = useClients(bu);
  const { data: eventsData = [] } = useEvents(bu);
  const { data: manualsData = [] } = useManuals(bu);
  const { data: financialData = [] } = useFinancialEntries({ bu });
  const { data: orgData = [] } = useOrgMembers();

  // Mutation hooks
  const createArtistMutation = useCreateArtist();
  const updateArtistMutation = useUpdateArtist();
  const deleteArtistMutation = useDeleteArtist();
  const createExternalWorkerMutation = useCreateExternalWorker();
  const updateExternalWorkerMutation = useUpdateExternalWorker();
  const deleteExternalWorkerMutation = useDeleteExternalWorker();
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();
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
  const freelancers = useMemo(() => externalWorkersData.filter((w) => w.worker_type === 'freelancer'), [externalWorkersData]);
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
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('projects')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('projects');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Briefcase size={22} />
              </div>
              <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-full uppercase tracking-widest">Active</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Projects</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{projects.length}</h3>
              <p className="text-xs text-gray-500 mt-1">진행중: {inProgressProjects.length}건</p>
            </div>
          </div>
          <div
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('artists')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('artists');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Users size={22} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Artists</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{artists.length}</h3>
              <p className="text-xs text-gray-500 mt-1">활성: {artists.filter((a) => a.status === 'Active').length}명</p>
            </div>
          </div>
          <div
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between border-red-100 hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('artists')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('artists');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                <ShieldCheck size={22} />
              </div>
              {urgentVisas.length > 0 && <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Visa Critical</p>
              <h3 className={cn('text-3xl font-black mt-1', urgentVisas.length > 0 ? 'text-red-600' : 'text-gray-900')}>{urgentVisas.length}</h3>
              <p className="text-xs text-gray-500 mt-1">60일 이내 만료</p>
            </div>
          </div>
          <div
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('settlements')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('settlements');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <DollarSign size={22} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Rev.</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">₩{(totalRevenue / 10000).toLocaleString()}만</h3>
              <p className="text-xs text-gray-500 mt-1">순이익: ₩{(netProfit / 10000).toLocaleString()}만</p>
            </div>
          </div>
        </div>

        {/* 추가 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('freelancers')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('freelancers');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                <UserPlus size={22} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">외주 댄서</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{freelancers.length}</h3>
              <p className="text-xs text-gray-500 mt-1">활성: {freelancers.filter((f) => f.is_active).length}명</p>
            </div>
          </div>
          <div
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('partners')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('partners');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                <Building2 size={22} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">거래처</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{partners.length}</h3>
              <p className="text-xs text-gray-500 mt-1">활성: {activeClients.length}개</p>
            </div>
          </div>
          <div
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('tasks')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('tasks');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl">
                <CheckSquare size={22} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">진행 중 업무</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{activeTasks.length}</h3>
              <p className="text-xs text-gray-500 mt-1">완료: {tasks.filter((t) => t.status === 'done').length}건</p>
            </div>
          </div>
          <div
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('settlements')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab('settlements');
            }}
          >
            <div className="flex justify-between mb-2">
              <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl">
                <Receipt size={22} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">총 지출</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">₩{(totalExpense / 10000).toLocaleString()}만</h3>
              <p className="text-xs text-gray-500 mt-1">정산 완료: {settlements.filter((s) => s.status === 'Completed').length}건</p>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 프로젝트 & 일정 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 진행 중인 프로젝트 */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-gray-900">진행 중인 프로젝트</h3>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-bold"
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
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 cursor-pointer transition-colors group"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-black text-gray-900 text-sm">{project.name}</h4>
                            <StatusBadge type={project.status.toLowerCase()} text={project.status} />
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                            {projectClient && <span>클라이언트: {projectClient.name}</span>}
                            <span>매출: ₩{(projectRevenue / 10000).toLocaleString()}만</span>
                            <span>지출: ₩{(projectExpense / 10000).toLocaleString()}만</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm font-bold">진행 중인 프로젝트가 없습니다.</div>
                )}
              </div>
            </div>

            {/* 주요 일정 */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-gray-900">다가오는 일정</h3>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  전체 보기 →
                </button>
              </div>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-gray-100 cursor-pointer group"
                    >
                      <div className="w-16 text-center mr-4 flex-shrink-0">
                        <div className="text-xs text-gray-500 font-bold">
                          {new Date(event.event_date).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'w-1 h-12 rounded-full mr-4 flex-shrink-0',
                          event.event_type === 'shoot' ? 'bg-red-500' : event.event_type === 'meeting' ? 'bg-blue-500' : 'bg-purple-500'
                        )}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-gray-900 text-sm truncate">{event.title}</h4>
                        {event.description && (
                          <p className="text-xs text-gray-500 flex items-center mt-1 truncate">
                            <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{event.description}</span>
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors flex-shrink-0" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm font-bold">등록된 일정이 없습니다.</div>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 할 일 & 비자 알림 */}
          <div className="space-y-6">
            {/* 할 일 */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-gray-900">할 일</h3>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  전체 보기 →
                </button>
              </div>
              <div className="space-y-3">
                {activeTasks.length > 0 ? (
                  activeTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setActiveTab('tasks')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full font-bold',
                              task.priority === 'high' ? 'bg-red-100 text-red-600' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                            )}
                          >
                            {task.priority || 'medium'}
                          </span>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              task.status === 'todo' ? 'bg-gray-100 text-gray-600' : task.status === 'in-progress' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                            )}
                          >
                            {task.status === 'todo' ? '할 일' : task.status === 'in-progress' ? '진행 중' : '완료'}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-800 mb-2">{task.title}</p>
                        {task.assignee && (
                          <div className="flex items-center text-xs text-gray-500">
                            <User className="w-3 h-3 mr-1" />
                            <span className="font-bold">{task.assignee}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center text-xs text-gray-400 mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{task.dueDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm font-bold">등록된 할 일이 없습니다.</div>
                )}
              </div>
            </div>

            {/* 비자 만료 임박 알림 */}
            {urgentVisas.length > 0 && (
              <div className="bg-red-50 rounded-[2rem] shadow-sm border border-red-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-black text-red-900">비자 만료 임박</h3>
                </div>
                <div className="space-y-3">
                  {urgentVisas.slice(0, 3).map((artist) => {
                    const visaEnd = artist.visa_end || '9999-12-31';
                    const daysLeft = Math.ceil((new Date(visaEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <div key={artist.id} className="bg-white p-3 rounded-xl border border-red-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-black text-sm text-gray-900">{artist.name}</p>
                            <p className="text-xs text-gray-500">{artist.visa_type || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-red-600">{daysLeft}일 남음</p>
                            <p className="text-xs text-gray-500">{visaEnd}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {urgentVisas.length > 3 && (
                  <button
                    onClick={() => setActiveTab('artists')}
                    className="w-full mt-4 text-sm text-red-600 hover:text-red-800 font-bold"
                  >
                    전체 보기 ({urgentVisas.length}건) →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ArtistsView = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editArtist, setEditArtist] = useState<Artist | null>(null);
    const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
    const [expandedIndividuals, setExpandedIndividuals] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');
    const [filterNationality, setFilterNationality] = useState<string>('');
    const [showFilter, setShowFilter] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 필터 드롭다운 닫기
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
          setShowFilter(false);
        }
      };

      if (showFilter) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showFilter]);

    // 검색 및 필터링
    const filteredArtists = useMemo(() => {
      let result = artists;

      // 검색 필터링
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        result = result.filter((artist) => {
          // 이름 검색
          if (artist.name.toLowerCase().includes(query)) return true;
          
          // 국적 검색
          if (artist.nationality?.toLowerCase().includes(query)) return true;
          
          // 역할 검색
          if (artist.role?.toLowerCase().includes(query)) return true;
          
          // 소속팀 검색 (팀 이름 검색)
          if (artist.type === 'individual' && artist.team_id) {
            const team = artists.find((a) => a.id === artist.team_id && a.type === 'team');
            if (team?.name.toLowerCase().includes(query)) return true;
          }
          
          return false;
        });
      }

      // 상태 필터
      if (filterStatus) {
        result = result.filter((artist) => artist.status === filterStatus);
      }

      // 타입 필터
      if (filterType) {
        result = result.filter((artist) => artist.type === filterType);
      }

      // 국적 필터
      if (filterNationality) {
        result = result.filter((artist) => artist.nationality === filterNationality);
      }

      return result;
    }, [artists, searchQuery, filterStatus, filterType, filterNationality]);

    // 고유한 국적 목록 추출
    const uniqueNationalities = useMemo(() => {
      const nationalities = artists
        .map((a) => a.nationality)
        .filter((n): n is string => !!n);
      return Array.from(new Set(nationalities)).sort();
    }, [artists]);

    // 팀과 개인 아티스트를 분리하고 그룹화
    const { teams, unaffiliatedIndividuals } = useMemo(() => {
      const teamsList = filteredArtists.filter((a) => a.type === 'team');
      const individuals = filteredArtists.filter((a) => a.type === 'individual');
      
      // 필터링된 개인 아티스트가 속한 팀 ID들을 찾기
      const teamIdsWithFilteredMembers = new Set(
        individuals
          .filter((ind) => ind.team_id)
          .map((ind) => ind.team_id!)
      );
      
      // 필터링된 개인 멤버가 있지만 팀 자체는 필터링되지 않은 경우를 위해
      // 원본 artists에서 해당 팀들을 가져와서 포함
      const additionalTeams = artists.filter(
        (a) => a.type === 'team' && teamIdsWithFilteredMembers.has(a.id) && !teamsList.some((t) => t.id === a.id)
      );
      
      // 모든 관련 팀 (필터링된 팀 + 추가된 팀)
      const allRelevantTeams = [...teamsList, ...additionalTeams];
      
      // 각 팀에 소속된 개인 아티스트들을 그룹화
      const teamsWithMembers = allRelevantTeams.map((team) => ({
        team,
        members: individuals.filter((ind) => ind.team_id === team.id),
      }));

      // 소속되지 않은 개인 아티스트들
      const unaffiliated = individuals.filter((ind) => !ind.team_id);

      return {
        teams: teamsWithMembers,
        unaffiliatedIndividuals: unaffiliated,
      };
    }, [filteredArtists, artists]);

    // 검색어가 있고 필터링된 멤버가 있는 팀들을 자동으로 펼치기
    useEffect(() => {
      if (searchQuery.trim()) {
        // 필터링된 개인 아티스트들
        const filteredIndividuals = filteredArtists.filter((a) => a.type === 'individual' && a.team_id);
        
        // 필터링된 멤버가 속한 팀 ID들
        const teamIdsWithFilteredMembers = new Set(
          filteredIndividuals.map((ind) => ind.team_id!)
        );
        
        // 해당 팀들을 자동으로 펼치기
        if (teamIdsWithFilteredMembers.size > 0) {
          setExpandedTeams((prev) => {
            const next = new Set(prev);
            teamIdsWithFilteredMembers.forEach((teamId) => {
              next.add(teamId);
            });
            return next;
          });
        }
      } else {
        // 검색어가 없으면 모든 팀 접기
        setExpandedTeams(new Set());
      }
    }, [searchQuery, filteredArtists]);

    const handleDelete = async (id: number) => {
      if (confirm('정말 삭제하시겠습니까?')) {
        try {
          await deleteArtistMutation.mutateAsync(id);
        } catch (error) {
          console.error('Failed to delete artist:', error);
          alert('삭제 중 오류가 발생했습니다.');
        }
      }
    };

    const handleCreate = async (data: {
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
    }) => {
      try {
        await createArtistMutation.mutateAsync({
          bu_code: bu,
          ...data,
        });
        setIsCreateModalOpen(false);
      } catch (error) {
        console.error('Failed to create artist:', error);
        alert('등록 중 오류가 발생했습니다.');
      }
    };

    const handleUpdate = async (id: number, data: Partial<Artist>) => {
      try {
        await updateArtistMutation.mutateAsync({ id, data });
        setEditArtist(null);
      } catch (error) {
        console.error('Failed to update artist:', error);
        alert('수정 중 오류가 발생했습니다.');
      }
    };

    // 아티스트 행 렌더링 함수
    const renderArtistRow = (artist: Artist) => {
      const today = new Date();
      const visaEnd = artist.visa_end || '9999-12-31';
      const isVisaUrgent = visaEnd !== '9999-12-31' && visaEnd !== 'N/A' && (new Date(visaEnd).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 60;
      const isContractUrgent = artist.contract_end && (new Date(artist.contract_end).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 60;

      return (
        <tr key={artist.id} className="hover:bg-gray-50/50 transition-colors group">
          <td className="px-6 py-5">
            <div className="flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm', artist.role?.includes('한야') ? 'bg-black' : 'bg-gradient-to-br from-indigo-500 to-purple-600')}>
                {artist.name[0]}
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm">{artist.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500">개인</span>
                  {artist.role && (
                    <>
                      <span className="text-gray-300 text-[10px]">/</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{artist.role}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </td>
          <td className="px-6 py-5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-700">{artist.nationality || 'N/A'}</span>
              <span className="text-gray-300 text-[10px]">/</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">{artist.visa_type || 'N/A'}</span>
            </div>
          </td>
          <td className="px-6 py-5 bg-indigo-50/10">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-indigo-400 uppercase">Start</span>
                <span className="text-xs font-bold text-gray-700">{artist.contract_start}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-indigo-400 uppercase">End</span>
                <span className={cn('text-xs font-black', isContractUrgent ? 'text-red-500' : 'text-gray-900')}>{artist.contract_end}</span>
              </div>
            </div>
          </td>
          <td className="px-6 py-5 bg-red-50/10">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-red-400 uppercase">Start</span>
                <span className="text-xs font-bold text-gray-700">{artist.visa_start || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-red-400 uppercase">End</span>
                <span className={cn('text-xs font-black', isVisaUrgent ? 'text-red-500' : 'text-gray-900')}>{visaEnd === '9999-12-31' ? '무기한' : visaEnd || 'N/A'}</span>
              </div>
            </div>
          </td>
          <td className="px-6 py-5 text-right">
            <StatusBadge type={artist.status === 'Active' ? 'active' : 'default'} text={artist.status} />
          </td>
          <td className="px-6 py-5">
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setEditArtist(artist)} className="text-gray-300 hover:text-indigo-500 transition-colors">
                <Edit3 size={16} />
              </button>
              <button onClick={() => handleDelete(artist.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </td>
        </tr>
      );
    };

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">전속 아티스트 관리</h2>
            <p className="text-sm text-gray-500 font-medium">아티스트의 신상 정보, 계약, 비자 상태를 통합 관리합니다.</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            아티스트 추가
          </button>
        </div>
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="이름, 국적, 소속팀 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={cn(
                  'p-3 bg-white border rounded-2xl transition-colors',
                  (filterStatus || filterType || filterNationality) || showFilter
                    ? 'border-indigo-300 text-indigo-600 bg-indigo-50'
                    : 'border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200'
                )}
              >
                <Filter size={20} />
              </button>
              {showFilter && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50 min-w-[280px]">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">상태</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                      >
                        <option value="">전체</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">타입</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                      >
                        <option value="">전체</option>
                        <option value="individual">개인</option>
                        <option value="team">팀</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">국적</label>
                      <select
                        value={filterNationality}
                        onChange={(e) => setFilterNationality(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                      >
                        <option value="">전체</option>
                        {uniqueNationalities.map((nat) => (
                          <option key={nat} value={nat}>
                            {nat}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(filterStatus || filterType || filterNationality) && (
                      <button
                        onClick={() => {
                          setFilterStatus('');
                          setFilterType('');
                          setFilterNationality('');
                        }}
                        className="w-full px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        필터 초기화
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5">Artist / Role</th>
                  <th className="px-6 py-5">Nation / Visa</th>
                  <th className="px-6 py-5 bg-indigo-50/30 text-indigo-600">Contract Period</th>
                  <th className="px-6 py-5 bg-red-50/30 text-red-600">Visa Period</th>
                  <th className="px-6 py-5 text-right">Status</th>
                  <th className="px-6 py-5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* 팀 아코디언 */}
                {teams.map(({ team, members }) => {
                  const isExpanded = expandedTeams.has(team.id);
                  const toggleExpand = () => {
                    setExpandedTeams((prev) => {
                      const next = new Set(prev);
                      if (next.has(team.id)) {
                        next.delete(team.id);
                      } else {
                        next.add(team.id);
                      }
                      return next;
                    });
                  };

                  const today = new Date();
                  const visaEnd = team.visa_end || '9999-12-31';
                  const isVisaUrgent = visaEnd !== '9999-12-31' && visaEnd !== 'N/A' && (new Date(visaEnd).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 60;
                  const isContractUrgent = team.contract_end && (new Date(team.contract_end).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 60;

                  return (
                    <React.Fragment key={team.id}>
                      <tr
                        onClick={toggleExpand}
                        className="cursor-pointer hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 text-gray-400 transition-transform',
                                isExpanded && 'rotate-180'
                              )}
                            />
                            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm', team.role?.includes('한야') ? 'bg-black' : 'bg-gradient-to-br from-indigo-500 to-purple-600')}>
                              {team.name[0]}
                            </div>
                            <div>
                              <p className="font-black text-gray-900 text-sm">{team.name}</p>
                              <span className="text-[10px] font-bold text-gray-500">팀 {members.length > 0 && `(${members.length}명)`}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-gray-700">{team.nationality || 'N/A'}</span>
                            <span className="text-gray-300 text-[10px]">/</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">{team.visa_type || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 bg-indigo-50/10">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black text-indigo-400 uppercase">Start</span>
                              <span className="text-xs font-bold text-gray-700">{team.contract_start}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black text-indigo-400 uppercase">End</span>
                              <span className={cn('text-xs font-black', isContractUrgent ? 'text-red-500' : 'text-gray-900')}>{team.contract_end}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 bg-red-50/10">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black text-red-400 uppercase">Start</span>
                              <span className="text-xs font-bold text-gray-700">{team.visa_start || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black text-red-400 uppercase">End</span>
                              <span className={cn('text-xs font-black', isVisaUrgent ? 'text-red-500' : 'text-gray-900')}>{visaEnd === '9999-12-31' ? '무기한' : visaEnd || 'N/A'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <StatusBadge type={team.status === 'Active' ? 'active' : 'default'} text={team.status} />
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setEditArtist(team)} className="text-gray-300 hover:text-indigo-500 transition-colors">
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => handleDelete(team.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && members.length > 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-0 bg-gray-50/30">
                            <div className="pl-16 pr-6 py-4">
                              <table className="w-full">
                                <tbody className="divide-y divide-gray-100">
                                  {members.map((member) => renderArtistRow(member))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                      {isExpanded && members.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 pl-16 bg-gray-50/30 text-gray-400 text-xs">
                            소속된 멤버가 없습니다.
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* 소속되지 않은 개인 아티스트 (아코디언으로 표시) */}
                {unaffiliatedIndividuals.map((artist) => {
                  const isExpanded = expandedIndividuals.has(artist.id);
                  const toggleExpand = () => {
                    setExpandedIndividuals((prev) => {
                      const next = new Set(prev);
                      if (next.has(artist.id)) {
                        next.delete(artist.id);
                      } else {
                        next.add(artist.id);
                      }
                      return next;
                    });
                  };

                  return (
                    <React.Fragment key={artist.id}>
                      <tr
                        onClick={toggleExpand}
                        className="cursor-pointer hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 text-gray-400 transition-transform',
                                isExpanded && 'rotate-180'
                              )}
                            />
                            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm', artist.role?.includes('한야') ? 'bg-black' : 'bg-gradient-to-br from-indigo-500 to-purple-600')}>
                              {artist.name[0]}
                            </div>
                            <div>
                              <p className="font-black text-gray-900 text-sm">{artist.name}</p>
                              <span className="text-[10px] font-bold text-gray-500">개인</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-gray-700">{artist.nationality || 'N/A'}</span>
                            <span className="text-gray-300 text-[10px]">/</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">{artist.visa_type || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 bg-indigo-50/10">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black text-indigo-400 uppercase">Start</span>
                              <span className="text-xs font-bold text-gray-700">{artist.contract_start}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black text-indigo-400 uppercase">End</span>
                              <span className="text-xs font-black text-gray-900">{artist.contract_end}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 bg-red-50/10">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black text-red-400 uppercase">Start</span>
                              <span className="text-xs font-bold text-gray-700">{artist.visa_start || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black text-red-400 uppercase">End</span>
                              <span className="text-xs font-black text-gray-900">{artist.visa_end === '9999-12-31' ? '무기한' : artist.visa_end || 'N/A'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <StatusBadge type={artist.status === 'Active' ? 'active' : 'default'} text={artist.status} />
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setEditArtist(artist)} className="text-gray-300 hover:text-indigo-500 transition-colors">
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => handleDelete(artist.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-6 py-0 bg-gray-50/30">
                            <div className="pl-16 pr-6 py-4">
                              {/* 개인 아티스트는 상세 정보 표시 (추가 정보가 필요하면 여기에 추가) */}
                              <div className="text-xs text-gray-500">
                                {artist.role && (
                                  <div className="mb-2">
                                    <span className="font-bold text-gray-700">역할:</span> {artist.role}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* 빈 상태 */}
                {artists.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest">
                      등록된 아티스트가 없습니다.
                    </td>
                  </tr>
                )}
                {artists.length > 0 && filteredArtists.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isCreateModalOpen && (
          <ArtistModal
            artists={artists}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreate}
          />
        )}

        {editArtist && (
          <ArtistModal
            artist={editArtist}
            artists={artists}
            onClose={() => setEditArtist(null)}
            onSubmit={(data) => handleUpdate(editArtist.id, data)}
          />
        )}
      </div>
    );
  };

  const FreelancersView = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editFreelancer, setEditFreelancer] = useState<ExternalWorker | null>(null);

    const handleDelete = async (id: number) => {
      if (confirm('정말 삭제하시겠습니까?')) {
        try {
          await deleteExternalWorkerMutation.mutateAsync(id);
        } catch (error) {
          console.error('Failed to delete freelancer:', error);
          alert('삭제 중 오류가 발생했습니다.');
        }
      }
    };

    const handleCreate = async (data: {
      name: string;
      company_name?: string;
      worker_type?: ExternalWorkerType;
      phone?: string;
      email?: string;
      specialties?: string[];
      notes?: string;
      is_active?: boolean;
    }) => {
      try {
        await createExternalWorkerMutation.mutateAsync({
          bu_code: bu,
          ...data,
        });
        setIsCreateModalOpen(false);
      } catch (error) {
        console.error('Failed to create freelancer:', error);
        alert('등록 중 오류가 발생했습니다.');
      }
    };

    const handleUpdate = async (id: number, data: Partial<ExternalWorker>) => {
      try {
        await updateExternalWorkerMutation.mutateAsync({ id, data });
        setEditFreelancer(null);
      } catch (error) {
        console.error('Failed to update freelancer:', error);
        alert('수정 중 오류가 발생했습니다.');
      }
    };

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">외주 댄서 관리</h2>
            <p className="text-sm text-gray-500 font-medium">외주 댄서 정보 및 작업 이력을 관리합니다.</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            외주 댄서 추가
          </button>
        </div>
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="이름, 전화번호, 장르 검색..." />
            </div>
            <button className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-400 hover:text-indigo-600 transition-colors">
              <Filter size={20} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5">Name</th>
                  <th className="px-6 py-5">Contact</th>
                  <th className="px-6 py-5">Specialties</th>
                  <th className="px-6 py-5 text-right">Status</th>
                  <th className="px-6 py-5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {freelancers.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-black text-sm">
                          {f.name[0]}
                        </div>
                        <span className="font-black text-sm text-gray-900">{f.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        {f.phone && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Phone size={12} />
                            <span>{f.phone}</span>
                          </div>
                        )}
                        {f.email && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Mail size={12} />
                            <span>{f.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-1.5 flex-wrap">
                        {f.specialties && f.specialties.length > 0 ? (
                          f.specialties.map((s, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-bold">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <StatusBadge type={f.is_active ? 'active' : 'default'} text={f.is_active ? 'Active' : 'Inactive'} />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setEditFreelancer(f)} className="text-gray-300 hover:text-indigo-500 transition-colors">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => handleDelete(f.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {freelancers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest">
                      등록된 외주 댄서가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isCreateModalOpen && (
          <FreelancerModal
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreate}
          />
        )}

        {editFreelancer && (
          <FreelancerModal
            freelancer={editFreelancer}
            onClose={() => setEditFreelancer(null)}
            onSubmit={(data) => handleUpdate(editFreelancer.id, data)}
          />
        )}
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
        (p.client_id && partners.find((c) => c.id === p.client_id)?.name.toLowerCase().includes(query))
      );
    }, [projects, searchQuery, partners]);

    const handleCreateProject = async (data: {
      bu: BU;
      name: string;
      cat: string;
      startDate: string;
      endDate: string;
      status: string;
      client_id?: number;
      artist_id?: number;
    }) => {
      try {
        const payload: any = {
          bu_code: data.bu,
          name: data.name,
          category: data.cat,
          status: data.status,
          start_date: data.startDate,
          end_date: data.endDate,
        };

        if (data.client_id !== undefined) {
          payload.client_id = data.client_id;
        }

        if (data.artist_id !== undefined && data.artist_id !== null) {
          payload.artist_id = data.artist_id;
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
      startDate: string;
      endDate: string;
      status: string;
      client_id?: number;
      artist_id?: number;
    }) => {
      try {
        await updateProjectMutation.mutateAsync({
          id,
          data: {
            bu_code: data.bu,
            name: data.name,
            category: data.cat,
            status: data.status,
            start_date: data.startDate,
            end_date: data.endDate,
            client_id: data.client_id,
            ...(data.artist_id !== undefined && { artist_id: data.artist_id || null }),
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
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">프로젝트 관리</h2>
            <p className="text-sm text-gray-500 font-medium">진행 중인 모든 프로젝트의 예산 및 일정을 총괄합니다.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm gap-4">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
            />
          </div>
          <button
            onClick={() => setProjectModalOpen(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4 mr-2" /> 새 프로젝트
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">프로젝트명</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">클라이언트</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">카테고리</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">예산</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">마감일</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">관리</th>
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
                      className="hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                          <div>
                            <div className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {project.name}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">CODE: {project.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {projectClient?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {project.cat}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {formatCurrency(budget)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{project.endDate}</td>
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
                            className="text-gray-400 hover:text-indigo-600"
                            title="수정"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteProjectId(project.id);
                            }}
                            className="text-gray-400 hover:text-red-600"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${project.id}-accordion`}>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-semibold text-gray-800">매출 및 지출 관리</h4>
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
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
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
                                        className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-100"
                                      >
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-800">
                                            {revenue.name}
                                          </div>
                                          <div className="text-xs text-gray-500">
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
                                            className="text-gray-400 hover:text-indigo-600"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteFinanceId(Number(revenue.id));
                                            }}
                                            className="text-gray-400 hover:text-red-600"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-gray-400 text-center py-4">
                                      등록된 매출이 없습니다.
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <h5 className="font-semibold text-red-700 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> 지출
                                  </h5>
                                  <span className="text-sm font-bold text-red-600">
                                    총 {formatCurrency(totalExpenses)}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {projectExpenses.length > 0 ? (
                                    projectExpenses.map((expense) => (
                                      <div
                                        key={expense.id}
                                        className="flex justify-between items-center p-2 bg-red-50 rounded border border-red-100"
                                      >
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-800">
                                            {expense.name}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {expense.category} • {expense.date}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-bold text-red-600">
                                            {formatCurrency(expense.amount)}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditFinance(expense);
                                            }}
                                            className="text-gray-400 hover:text-indigo-600"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteFinanceId(Number(expense.id));
                                            }}
                                            className="text-gray-400 hover:text-red-600"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-gray-400 text-center py-4">
                                      등록된 지출이 없습니다.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-indigo-900">순이익</span>
                                <span className="text-lg font-bold text-indigo-600">
                                  {formatCurrency(budget - totalExpenses)}
                                </span>
                              </div>
                            </div>

                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <div className="flex justify-between items-center mb-3">
                                <h5 className="font-semibold text-gray-800 flex items-center gap-2">
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
                                      className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100 group"
                                    >
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-800">{task.title}</div>
                                        <div className="text-xs text-gray-500">
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
                                          className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="수정"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteTaskId(task.id);
                                          }}
                                          className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="삭제"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-sm text-gray-400 text-center py-4">
                                    등록된 할 일이 없습니다.
                                  </div>
                                )}
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
                  <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
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
            bu={bu}
            clients={partners}
            artists={artists}
            onClose={() => setProjectModalOpen(false)}
            onSubmit={handleCreateProject}
          />
        )}

        {editProject && (
          <ProjectModal
            project={editProject}
            bu={bu}
            clients={partners}
            artists={artists}
            onClose={() => setEditProject(null)}
            onSubmit={(data) => handleUpdateProject(Number(editProject.id), data)}
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
            onClose={() => setTaskModalOpen(null)}
            onSubmit={handleCreateTask}
          />
        )}

        {editTask && (
          <TaskModal
            task={editTask}
            bu={bu}
            projects={projects}
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

  // Project Modal Component
  const ProjectModal = ({
    project,
    bu,
    clients,
    artists,
    onClose,
    onSubmit,
  }: {
    project?: any;
    bu: BU;
    clients: Client[];
    artists: Artist[];
    onClose: () => void;
    onSubmit: (data: {
      bu: BU;
      name: string;
      cat: string;
      startDate: string;
      endDate: string;
      status: string;
      client_id?: number;
      artist_id?: number;
    }) => void;
  }) => {
    const [form, setForm] = useState({
      name: project?.name || '',
      cat: project?.cat || '',
      startDate: project?.startDate || '',
      endDate: project?.endDate || '',
      status: project?.status || '기획중',
      client_id: project?.client_id ? String(project.client_id) : '',
      artist_id: project?.artist_id ? String(project.artist_id) : '',
    });

    return (
      <ModalShell title={project ? '프로젝트 수정' : '프로젝트 등록'} onClose={onClose}>
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
              { value: '기획중', label: '기획중' },
              { value: '진행중', label: '진행중' },
              { value: '운영중', label: '운영중' },
              { value: '완료', label: '완료' },
            ]}
          />
          <div className="md:col-span-2">
            <SelectField
              label="클라이언트"
              value={form.client_id}
              onChange={(val) => setForm((prev) => ({ ...prev, client_id: val }))}
              options={[
                { value: '', label: '선택 안함' },
                ...clients.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
            />
          </div>
          <div className="md:col-span-2">
            <SelectField
              label="관련 아티스트"
              value={form.artist_id}
              onChange={(val) => setForm((prev) => ({ ...prev, artist_id: val }))}
              options={[
                { value: '', label: '선택 안함' },
                ...artists.map((a) => ({ value: String(a.id), label: a.name })),
              ]}
            />
          </div>
        </div>
        <ModalActions
          onPrimary={() =>
            onSubmit({
              bu,
              name: form.name,
              cat: form.cat,
              startDate: form.startDate,
              endDate: form.endDate,
              status: form.status,
              client_id: form.client_id ? Number(form.client_id) : undefined,
              artist_id: form.artist_id ? Number(form.artist_id) : undefined,
            })
          }
          onClose={onClose}
          primaryLabel={project ? '수정' : '등록'}
        />
      </ModalShell>
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
      date: entry?.date || new Date().toISOString().split('T')[0],
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
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">업무 및 할일</h2>
            <p className="text-sm text-gray-500 font-medium">실시간 칸반 보드로 업무 진척도를 통제합니다.</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            할 일 추가
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'To Do', value: 'todo' },
            { label: 'In Progress', value: 'in-progress' },
            { label: 'Done', value: 'done' },
          ].map(({ label, value }) => (
            <div key={value} className="bg-gray-100/40 rounded-[2.5rem] p-4 min-h-[600px]">
              <div className="px-4 py-3 flex justify-between items-center mb-6">
                <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</h5>
                <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm text-gray-400">
                  {tasks.filter((t) => t.status === value).length}
                </span>
              </div>
              <div className="space-y-4">
                {tasks
                  .filter((t) => t.status === value)
                  .map((t) => {
                    const assigneeName = t.assignee || '미지정';

                    return (
                      <div key={t.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 group transition-all">
                        <div className="flex justify-between mb-3">
                          <span
                            className={cn(
                              'text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter',
                              t.priority === 'high'
                                ? 'bg-red-100 text-red-600'
                                : t.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-blue-100 text-blue-600',
                            )}
                          >
                            {t.priority || 'medium'}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditTask(t)}
                              className="text-gray-300 hover:text-indigo-600"
                              title="수정"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(t)}
                              className="text-indigo-400 hover:text-indigo-600"
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
                        <p className="text-sm font-bold text-gray-800 mb-2 leading-relaxed">{t.title}</p>

                        {t.tag && (
                          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-xl mb-4">
                            <BookOpen size={14} className="text-indigo-600" />
                            <span className="text-[10px] font-bold text-indigo-700 truncate">{t.tag}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500">
                              {assigneeName[0]}
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase">{assigneeName}</span>
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
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateTask}
          />
        )}

        {editTask && (
          <TaskModal
            task={editTask}
            bu={bu}
            projects={projects}
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
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">일정/캘린더</h2>
            <p className="text-sm text-gray-500 font-medium">프로젝트 일정 및 이벤트를 캘린더로 확인합니다.</p>
          </div>
        </div>
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
          <div className="text-center py-20 text-gray-400 font-bold">캘린더 뷰 (추후 구현 예정)</div>
        </div>
      </div>
    );
  };

  const PartnersView = () => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editClient, setEditClient] = useState<Client | null>(null);
    const [deleteClientId, setDeleteClientId] = useState<number | null>(null);
    const [createInitial, setCreateInitial] = useState<{
      client_type?: ClientType;
      team_id?: number;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');
    const [filterIndustry, setFilterIndustry] = useState<string>('');
    const [showFilter, setShowFilter] = useState(false);
    const filterRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
          setShowFilter(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    const toggleExpand = (id: string) => {
      if (expandedId === id) setExpandedId(null);
      else setExpandedId(id);
    };

    const handleCreate = async (data: Partial<Client>) => {
      try {
        await createClientMutation.mutateAsync({
          bu_code: bu,
          name: data.name || '',
          industry: data.industry,
          contact_person: data.contact_person,
          phone: data.phone,
          email: data.email,
          address: data.address,
          status: data.status || 'active',
          last_meeting_date: data.last_meeting_date,
          client_type: data.client_type,
          team_id: data.team_id ?? null,
        });
        setIsCreateModalOpen(false);
      } catch (error) {
        console.error('Failed to create client:', error);
        alert('등록 중 오류가 발생했습니다.');
      }
    };

    const handleUpdate = async (id: number, data: Partial<Client>) => {
      try {
        await updateClientMutation.mutateAsync({
          id,
          data: {
            name: data.name,
            industry: data.industry,
            contact_person: data.contact_person,
            phone: data.phone,
            email: data.email,
            address: data.address,
            status: data.status,
            last_meeting_date: data.last_meeting_date,
            client_type: data.client_type,
            team_id: data.team_id ?? null,
          },
        });
        setEditClient(null);
      } catch (error) {
        console.error('Failed to update client:', error);
        alert('수정 중 오류가 발생했습니다.');
      }
    };

    const handleDelete = async (id: number) => {
      try {
        await deleteClientMutation.mutateAsync(id);
        setDeleteClientId(null);
      } catch (error) {
        console.error('Failed to delete client:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    };

    const uniqueIndustries = useMemo(
      () =>
        Array.from(
          new Set(
            partners
              .map((p) => p.industry)
              .filter((v): v is string => Boolean(v && v.trim())),
          ),
        ),
      [partners],
    );

    const filteredPartners = useMemo(() => {
      const query = searchQuery.trim().toLowerCase();

      return partners.filter((p) => {
        if (filterStatus && p.status !== filterStatus) return false;
        if (filterType && (p.client_type || 'individual') !== filterType) return false;
        if (filterIndustry && p.industry !== filterIndustry) return false;

        if (!query) return true;

        const name = p.name?.toLowerCase() || '';
        const industry = p.industry?.toLowerCase() || '';
        const contact = p.contact_person?.toLowerCase() || '';

        return (
          name.includes(query) ||
          industry.includes(query) ||
          contact.includes(query)
        );
      });
    }, [partners, searchQuery, filterStatus, filterType, filterIndustry]);

    const { teamsOnly, teamsWithMembers, topLevelIndividuals } = useMemo(() => {
      const allTeams = filteredPartners.filter((p) => p.client_type === 'team');
      const allIndividuals = filteredPartners.filter(
        (p) => p.client_type !== 'team' || !p.client_type,
      );

      const grouped = allTeams.map((team) => ({
        team,
        members: allIndividuals.filter((m) => m.team_id === team.id),
      }));

      const individualsWithoutTeam = allIndividuals.filter((m) => !m.team_id);

      return {
        teamsOnly: allTeams,
        teamsWithMembers: grouped,
        topLevelIndividuals: individualsWithoutTeam,
      };
    }, [filteredPartners]);

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">거래처/파트너 DB</h2>
            <p className="text-sm text-gray-500 font-medium">협력사 및 클라이언트 연락망을 리스트로 관리합니다.</p>
          </div>
          <button
            onClick={() => {
              setCreateInitial(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            거래처 추가
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="회사명, 업종, 담당자 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={cn(
                  'p-3 bg-white border rounded-2xl transition-colors',
                  (filterStatus || filterType || filterIndustry) || showFilter
                    ? 'border-indigo-300 text-indigo-600 bg-indigo-50'
                    : 'border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200',
                )}
              >
                <Filter size={20} />
              </button>
              {showFilter && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50 min-w-[280px] space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">상태</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                    >
                      <option value="">전체</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">계정 타입</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                    >
                      <option value="">전체</option>
                      <option value="team">팀 계정</option>
                      <option value="individual">개인 계정</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">업종</label>
                    <select
                      value={filterIndustry}
                      onChange={(e) => setFilterIndustry(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                    >
                      <option value="">전체</option>
                      {uniqueIndustries.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(filterStatus || filterType || filterIndustry) && (
                    <button
                      onClick={() => {
                        setFilterStatus('');
                        setFilterType('');
                        setFilterIndustry('');
                      }}
                      className="w-full px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      필터 초기화
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5">Client / Type</th>
                  <th className="px-6 py-5">Industry</th>
                  <th className="px-6 py-5">Manager / Contact</th>
                  <th className="px-6 py-5">Last Meeting</th>
                  <th className="px-6 py-5 text-right">Status</th>
                  <th className="px-6 py-5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
              {/* 팀 계정 + 소속 개인 계정 */}
              {teamsWithMembers.map(({ team, members }) => (
                <React.Fragment key={`team-${team.id}`}>
                  <tr
                    onClick={() => toggleExpand(String(team.id))}
                    className={cn(
                      'cursor-pointer transition-colors',
                      expandedId === String(team.id) ? 'bg-indigo-50/30' : 'hover:bg-gray-50'
                    )}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 text-gray-400 transition-transform',
                            expandedId === String(team.id) && 'rotate-180',
                          )}
                        />
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm bg-gray-900">
                          {team.name[0]}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm">{team.name}</p>
                          <span className="text-[10px] font-bold text-gray-500">
                            팀 계정
                            {members.length > 0 && ` (${members.length}명)`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-gray-500">{team.industry || 'N/A'}</td>
                    <td className="px-6 py-5 text-xs font-bold text-gray-900">{team.contact_person || 'N/A'}</td>
                    <td className="px-6 py-5 text-xs text-gray-500 font-mono">{team.last_meeting_date || '-'}</td>
                    <td className="px-6 py-5 text-right">
                      <StatusBadge type={team.status === 'active' ? 'active' : 'default'} text={team.status} />
                    </td>
                    <td className="px-6 py-5 text-gray-400">
                      {expandedId === String(team.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                  </tr>
                  {expandedId === String(team.id) && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm animate-in slide-in-from-top-2 duration-200">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-500">
                              <Mail size={14} />
                              <span className="font-bold">Email:</span>
                              <span className="font-mono text-gray-900">{team.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              <Phone size={14} />
                              <span className="font-bold">Direct:</span>
                              <span className="font-mono text-gray-900">{team.phone || 'N/A'}</span>
                            </div>
                            {team.address && (
                              <div className="flex items-center gap-2 text-gray-500">
                                <span className="font-bold">Address:</span>
                                <span className="text-gray-900">{team.address}</span>
                              </div>
                            )}
                            {team.last_meeting_date && (
                              <div className="flex items-center gap-2 text-gray-500">
                                <span className="font-bold">최근 미팅:</span>
                                <span className="text-gray-900">{team.last_meeting_date}</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div className="rounded-2xl border border-gray-200 bg-white p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-400">
                                  소속 직원 / 담당자 ({members.length})
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCreateInitial({ client_type: 'individual', team_id: team.id });
                                    setIsCreateModalOpen(true);
                                  }}
                                  className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-600 hover:bg-indigo-100"
                                >
                                  개인 추가
                                </button>
                              </div>
                              {members.length > 0 ? (
                                <div className="space-y-1.5">
                                  {members.map((m) => (
                                    <div
                                      key={m.id}
                                      className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs"
                                    >
                                      <div>
                                        <p className="font-bold text-gray-800">
                                          {m.contact_person || m.name}
                                        </p>
                                        <p className="font-mono text-[11px] text-gray-500">
                                          {m.email || m.phone || '-'}
                                        </p>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditClient(m);
                                        }}
                                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-black text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
                                      >
                                        수정
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="py-6 text-center">
                                  <p className="text-xs text-gray-400 font-medium">등록된 멤버가 없습니다.</p>
                                  <p className="text-[10px] text-gray-400 mt-1">위의 "개인 추가" 버튼을 눌러 멤버를 추가하세요.</p>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end items-center gap-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditClient(team);
                                }}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors text-gray-700"
                              >
                                정보 수정
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteClientId(team.id);
                                }}
                                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {/* 팀에 속하지 않은 개인 계정 */}
              {topLevelIndividuals.map((p) => (
                <React.Fragment key={`client-${p.id}`}>
                  <tr
                    onClick={() => toggleExpand(String(p.id))}
                    className={cn(
                      'cursor-pointer transition-colors',
                      expandedId === String(p.id) ? 'bg-indigo-50/30' : 'hover:bg-gray-50'
                    )}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 text-gray-400 transition-transform',
                            expandedId === String(p.id) && 'rotate-180',
                          )}
                        />
                        <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-sm shadow-sm">
                          {p.name[0]}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm">{p.name}</p>
                          <span className="text-[10px] font-bold text-gray-500">개인 계정</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-gray-500">{p.industry || 'N/A'}</td>
                    <td className="px-6 py-5 text-xs font-bold text-gray-900">{p.contact_person || 'N/A'}</td>
                    <td className="px-6 py-5 text-xs text-gray-500 font-mono">{p.last_meeting_date || '-'}</td>
                    <td className="px-6 py-5 text-right">
                      <StatusBadge type={p.status === 'active' ? 'active' : 'default'} text={p.status} />
                    </td>
                    <td className="px-6 py-5 text-gray-400">
                      {expandedId === String(p.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                  </tr>
                  {expandedId === String(p.id) && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm animate-in slide-in-from-top-2 duration-200">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-500">
                              <Mail size={14} />
                              <span className="font-bold">Email:</span>
                              <span className="font-mono text-gray-900">{p.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              <Phone size={14} />
                              <span className="font-bold">Direct:</span>
                              <span className="font-mono text-gray-900">{p.phone || 'N/A'}</span>
                            </div>
                            {p.address && (
                              <div className="flex items-center gap-2 text-gray-500">
                                <span className="font-bold">Address:</span>
                                <span className="text-gray-900">{p.address}</span>
                              </div>
                            )}
                            {p.last_meeting_date && (
                              <div className="flex items-center gap-2 text-gray-500">
                                <span className="font-bold">최근 미팅:</span>
                                <span className="text-gray-900">{p.last_meeting_date}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col justify-end items-start md:items-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditClient(p);
                              }}
                              className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors text-gray-700"
                            >
                              정보 수정
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteClientId(p.id);
                              }}
                              className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest">
                    No Partners Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

        {isCreateModalOpen && (
          <ClientModal
            teams={teamsOnly}
            initialClientType={createInitial?.client_type}
            initialTeamId={createInitial?.team_id}
            onClose={() => {
              setIsCreateModalOpen(false);
              setCreateInitial(null);
            }}
            onSubmit={handleCreate}
          />
        )}

        {editClient && (
          <ClientModal
            client={editClient}
            teams={teamsOnly}
            onClose={() => setEditClient(null)}
            onSubmit={(data) => handleUpdate(editClient.id, data)}
          />
        )}

        {deleteClientId && (
          <DeleteConfirmModal
            title="거래처 삭제"
            message="정말 이 거래처를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
            onConfirm={() => handleDelete(deleteClientId)}
            onCancel={() => setDeleteClientId(null)}
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
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">정산 및 회계</h2>
            <p className="text-sm text-gray-500 font-medium">안무 제작비 및 아티스트 지급 내역을 관리합니다.</p>
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
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Artist Share (70%)</p>
            <h4 className="text-3xl font-black text-gray-800">₩{(settlements.reduce((sum, s) => sum + s.dancerFee, 0) / 10000).toLocaleString()}만</h4>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Net Profit (30%)</p>
            <h4 className="text-3xl font-black text-indigo-600">₩{(settlements.reduce((sum, s) => sum + s.companyFee, 0) / 10000).toLocaleString()}만</h4>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-8 py-5">Item / Settlement Date</th>
                <th className="px-8 py-5">Total Amount</th>
                <th className="px-8 py-5 text-red-500">Artist Fee</th>
                <th className="px-8 py-5 text-indigo-600">Company Net</th>
                <th className="px-8 py-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {settlements.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-bold text-sm text-gray-900">{s.title}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase">{s.date}</p>
                  </td>
                  <td className="px-8 py-5 text-xs font-black text-gray-800">₩{s.totalAmount.toLocaleString()}</td>
                  <td className="px-8 py-5 text-xs font-bold text-red-500">- ₩{s.dancerFee.toLocaleString()}</td>
                  <td className="px-8 py-5 text-xs font-black text-indigo-600">₩{s.companyFee.toLocaleString()}</td>
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
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">SOP & Manual Center</h2>
            <p className="text-sm text-gray-500 font-medium">실무 표준 절차 및 업무 가이드라인 (ERP Only)</p>
          </div>
        </div>

        <div className="flex flex-1 gap-8 overflow-hidden">
          <div className="w-64 flex-shrink-0 overflow-y-auto pr-2">
            <div className="bg-white rounded-[2rem] p-4 border border-gray-100 shadow-sm h-full">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-4 mt-2">Categories</h3>
              <div className="space-y-1">
                {MANUAL_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all group',
                      selectedCategory === c ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
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
                  className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-6">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors',
                        m.category === '전사 공통/ERP' ? 'bg-indigo-50 text-indigo-600' : '',
                        m.category === '아티스트 관리' ? 'bg-purple-50 text-purple-600' : '',
                        m.category === '행정/비자' ? 'bg-red-50 text-red-600' : '',
                        m.category === '현장/제작' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-600'
                      )}
                    >
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{m.title}</h3>
                      <div className="flex items-center gap-3">
                        <StatusBadge type="default" text={m.category} />
                        <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                          <Clock size={10} /> {new Date(m.updated_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 pr-4">
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Author</p>
                      <p className="text-xs font-bold text-gray-700">{m.author_name || '관리자'}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-100 hidden md:block"></div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock size={14} />
                      <span className="text-xs font-bold">{new Date(m.updated_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
              {filteredManuals.length === 0 && (
                <div className="py-20 text-center text-gray-400 font-bold bg-white rounded-[2rem] border-2 border-dashed border-gray-200">등록된 매뉴얼이 없습니다.</div>
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
        <div className="flex flex-col h-full bg-white">
          <div className="p-8 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                  manual.category === '전사 공통/ERP' ? 'bg-indigo-100 text-indigo-700' : '',
                  manual.category === '아티스트 관리' ? 'bg-purple-100 text-purple-700' : '',
                  manual.category === '행정/비자' ? 'bg-red-100 text-red-700' : '',
                  manual.category === '현장/제작' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                )}
              >
                {manual.category}
              </span>
              <span className="text-xs text-gray-400 font-bold">Last updated: {new Date(manual.updated_at).toLocaleDateString('ko-KR')}</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">{manual.title}</h2>
            <p className="text-sm text-gray-500 font-medium">작성자: {manual.author_name || '관리자'}</p>
          </div>

          <div className="p-8 space-y-8">
            <div className="space-y-6">
              {contentArray.length > 0 ? (
                contentArray.map((item: any, idx: number) => (
                  <div key={idx} className={cn('p-5 rounded-2xl border transition-all', item.type === 'warning' ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100 hover:shadow-md')}>
                    <div className="flex gap-4">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg shadow-sm',
                          item.type === 'step' ? 'bg-indigo-600 text-white' : '',
                          item.type === 'check' ? 'bg-green-500 text-white' : '',
                          item.type === 'warning' ? 'bg-red-500 text-white' : '',
                          item.type === 'info' ? 'bg-blue-500 text-white' : '',
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
                        <h4 className={cn('font-black text-base mb-1.5', item.type === 'warning' ? 'text-red-700' : 'text-gray-900')}>{item.title || item.text}</h4>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">{item.desc || item.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">매뉴얼 내용이 없습니다.</div>
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
        return <ArtistsView />;
      case 'freelancers':
        return <FreelancersView />;
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
      case 'manuals':
        return <ManualsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8F9FD] text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
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
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[13px] font-black transition-all text-gray-500 hover:text-gray-200 hover:bg-white/5 border border-white/10"
                >
                  <Home size={18} />
                  통합 ERP로 이동
                </button>
                <div className="h-px bg-white/10 my-2"></div>
              </>
            )}
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: '통합 대시보드' },
              { id: 'artists', icon: Users, label: '전속 아티스트 관리' },
              { id: 'freelancers', icon: UserPlus, label: '외주 댄서 관리' },
              { id: 'projects', icon: Briefcase, label: '프로젝트 관리' },
              { id: 'tasks', icon: CheckSquare, label: '업무 및 할일' },
              { id: 'schedule', icon: CalendarIcon, label: '일정/캘린더' },
              { id: 'partners', icon: Building2, label: '거래처 관리' },
              { id: 'settlements', icon: CreditCard, label: '정산/회계' },
              { id: 'manuals', icon: BookOpen, label: '매뉴얼/가이드' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as GrigoEntView)}
                className={cn(
                  'w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[13px] font-black transition-all',
                  activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 pt-0">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="mb-1 text-[10px] uppercase tracking-tighter text-gray-500">Signed in as</p>
            <p className="text-sm font-semibold text-gray-200">
              {user?.profile?.name || user?.email || '사용자'}
            </p>
            {user?.profile?.position && (
              <p className="mt-1 text-[10px] text-gray-400">{user.profile.position}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-10 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Workspace</h2>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="text-sm font-black text-gray-900 capitalize tracking-tight">{activeTab} Section</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-[10px] font-black text-gray-500">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
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
      <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
          <h3 className="font-black text-lg text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={18} className="text-gray-500" />
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
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        <input
          type="date"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </label>
    );
  }

  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
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

// Freelancer Modal
function FreelancerModal({
  freelancer,
  onClose,
  onSubmit,
}: {
  freelancer?: ExternalWorker | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    company_name?: string;
    worker_type?: ExternalWorkerType;
    phone?: string;
    email?: string;
    specialties?: string[];
    notes?: string;
    is_active?: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    name: freelancer?.name || '',
    company_name: freelancer?.company_name || '',
    worker_type: (freelancer?.worker_type || 'freelancer') as ExternalWorkerType,
    phone: freelancer?.phone || '',
    email: freelancer?.email || '',
    specialties: (freelancer?.specialties || []).join(', '),
    notes: freelancer?.notes || '',
    is_active: freelancer?.is_active !== undefined ? freelancer.is_active : true,
  });

  const handleSubmit = () => {
    if (!form.name) {
      alert('이름은 필수 항목입니다.');
      return;
    }
    onSubmit({
      ...form,
      specialties: form.specialties ? form.specialties.split(',').map((s) => s.trim()).filter(Boolean) : [],
    });
  };

  return (
    <ModalShell title={freelancer ? '외주 댄서 수정' : '외주 댄서 추가'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="이름 *"
            value={form.name}
            onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
            placeholder="외주 댄서 이름"
          />
          <InputField
            label="회사명"
            value={form.company_name}
            onChange={(v) => setForm((prev) => ({ ...prev, company_name: v }))}
            placeholder="회사명 (선택사항)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="타입"
            value={form.worker_type}
            onChange={(v) => setForm((prev) => ({ ...prev, worker_type: v as ExternalWorkerType }))}
            options={[
              { value: 'freelancer', label: 'Freelancer' },
              { value: 'company', label: 'Company' },
              { value: 'contractor', label: 'Contractor' },
            ]}
          />
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">상태</span>
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">활성</span>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="전화번호"
            value={form.phone}
            onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
            placeholder="010-1234-5678"
          />
          <InputField
            label="이메일"
            type="email"
            value={form.email}
            onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
            placeholder="email@example.com"
          />
        </div>

        <InputField
          label="전문 분야 (쉼표로 구분)"
          value={form.specialties}
          onChange={(v) => setForm((prev) => ({ ...prev, specialties: v }))}
          placeholder="예: 힙합, 팝핑, 왁킹"
        />

        <label className="space-y-1.5">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">메모</span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="추가 정보 및 메모"
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </label>

        <ModalActions onPrimary={handleSubmit} onClose={onClose} primaryLabel={freelancer ? '수정' : '등록'} />
      </div>
    </ModalShell>
  );
}

// Client Modal
function ClientModal({
  client,
  teams,
  initialClientType,
  initialTeamId,
  onClose,
  onSubmit,
}: {
  client?: Client | null;
  teams: Client[];
  initialClientType?: ClientType;
  initialTeamId?: number;
  onClose: () => void;
  onSubmit: (data: Partial<Client>) => void;
}) {
  const [form, setForm] = useState({
    name: client?.name || '',
    industry: client?.industry || '',
    contact_person: client?.contact_person || '',
    phone: client?.phone || '',
    email: client?.email || '',
    address: client?.address || '',
    status: (client?.status || 'active') as ClientStatus,
    last_meeting_date: client?.last_meeting_date || '',
    client_type: (client?.client_type || initialClientType || 'individual') as ClientType,
    team_id: client?.team_id
      ? String(client.team_id)
      : initialTeamId
      ? String(initialTeamId)
      : '',
  });

  const handleSubmit = () => {
    if (!form.name) {
      alert('거래처명은 필수 항목입니다.');
      return;
    }
    onSubmit({
      ...form,
      team_id: form.team_id ? Number(form.team_id) : undefined,
    });
  };

  return (
    <ModalShell title={client ? '거래처 수정' : '거래처 추가'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="계정 타입"
            value={form.client_type}
            onChange={(v) =>
              setForm((prev) => ({
                ...prev,
                client_type: v as ClientType,
                team_id: v === 'team' ? '' : prev.team_id,
                contact_person: v === 'individual' ? '' : prev.contact_person,
              }))
            }
            options={[
              { value: 'individual', label: '개인 계정 (직원/담당자)' },
              { value: 'team', label: '팀 계정 (회사/조직)' },
            ]}
          />
          {form.client_type === 'individual' && (
            <SelectField
              label="소속 팀 (선택)"
              value={form.team_id}
              onChange={(v) => setForm((prev) => ({ ...prev, team_id: v }))}
              options={[
                { value: '', label: '소속 팀 없음' },
                ...teams.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                })),
              ]}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label={form.client_type === 'individual' ? '이름 *' : '회사/팀명 *'}
            value={form.name}
            onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
            placeholder={form.client_type === 'individual' ? '개인 이름을 입력하세요' : '회사 또는 팀 이름을 입력하세요'}
          />
          {form.client_type === 'team' && (
            <InputField
              label="업종"
              value={form.industry}
              onChange={(v) => setForm((prev) => ({ ...prev, industry: v }))}
              placeholder="예: 엔터테인먼트"
            />
          )}
        </div>

        {form.client_type === 'team' && (
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="담당자"
              value={form.contact_person}
              onChange={(v) => setForm((prev) => ({ ...prev, contact_person: v }))}
              placeholder="담당자 이름"
            />
            <InputField
              label="전화번호"
              value={form.phone}
              onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
              placeholder="010-0000-0000"
            />
          </div>
        )}

        {form.client_type === 'individual' && (
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="전화번호"
              value={form.phone}
              onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
              placeholder="010-0000-0000"
            />
            <InputField
              label="이메일"
              type="email"
              value={form.email}
              onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
              placeholder="email@example.com"
            />
          </div>
        )}

        {form.client_type === 'team' && (
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="이메일"
              type="email"
              value={form.email}
              onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
              placeholder="email@example.com"
            />
            <InputField
              label="최근 미팅일"
              type="date"
              value={form.last_meeting_date}
              onChange={(v) => setForm((prev) => ({ ...prev, last_meeting_date: v }))}
            />
          </div>
        )}

        {form.client_type === 'individual' && (
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="최근 미팅일"
              type="date"
              value={form.last_meeting_date}
              onChange={(v) => setForm((prev) => ({ ...prev, last_meeting_date: v }))}
            />
          </div>
        )}

        <InputField
          label="주소"
          value={form.address}
          onChange={(v) => setForm((prev) => ({ ...prev, address: v }))}
          placeholder="주소"
        />

        <SelectField
          label="상태"
          value={form.status}
          onChange={(v) => setForm((prev) => ({ ...prev, status: v as ClientStatus }))}
          options={[
            { value: 'active', label: '활성' },
            { value: 'inactive', label: '비활성' },
            { value: 'archived', label: '보관됨' },
          ]}
        />

        <ModalActions onPrimary={handleSubmit} onClose={onClose} primaryLabel={client ? '수정' : '등록'} />
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
  onClose,
  onSubmit,
}: {
  task?: any;
  projectId?: string;
  bu: BU;
  projects: any[];
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
  const [form, setForm] = useState({
    projectId: task?.projectId || projectId || projects[0]?.id || '',
    title: task?.title || '',
    assignee: task?.assignee || '',
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
        <InputField
          label="담당자"
          placeholder="담당자 이름"
          value={form.assignee}
          onChange={(v) => setForm((prev) => ({ ...prev, assignee: v }))}
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
        onPrimary={() =>
          onSubmit({
            projectId: form.projectId,
            bu,
            title: form.title,
            assignee: form.assignee,
            dueDate: form.dueDate,
            status: form.status as 'todo' | 'in-progress' | 'done',
          })
        }
        onClose={onClose}
        primaryLabel={task ? '수정' : '등록'}
      />
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
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-black text-lg text-gray-900">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
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

