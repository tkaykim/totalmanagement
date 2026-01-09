'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import {
  LayoutDashboard,
  Clapperboard,
  Camera,
  Users,
  Briefcase,
  Receipt,
  CheckSquare,
  Calendar as CalendarIcon,
  Settings,
  Bell,
  Search,
  Plus,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertCircle,
  FileText,
  DollarSign,
  Clock,
  X,
  MapPin,
  Phone,
  Mail,
  MoreHorizontal,
  Filter,
  User,
  Star,
  BookOpen,
  Link as LinkIcon,
  CheckCircle2,
  Youtube,
  PlayCircle,
  BarChart2,
  Printer,
  Share2,
  Edit3,
  Download,
  FolderOpen,
  Trash2,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type {
  BU,
  Channel,
  ChannelContent,
  Client,
  Equipment,
  Artist,
  Event,
  Manual,
  ProjectTask,
} from '@/types/database';
import {
  useProjects,
  useTasks,
  useFinancialEntries,
  useClients,
  useEquipment,
  useEvents,
  useManuals,
  useOrgMembers,
  useExternalWorkers,
  useCreateExternalWorker,
  useUpdateExternalWorker,
  useDeleteExternalWorker,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCreateFinancialEntry,
  useUpdateFinancialEntry,
  useDeleteFinancialEntry,
  useCreateClient,
  useCreateClientWorker,
  useUpdateClient,
  useUpdateClientWorker,
  useDeleteClient,
  useDeleteClientWorker,
  useClientWorkers,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  useArtists,
  useCreateArtist,
  useUpdateArtist,
  useDeleteArtist,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useCreateManual,
  useUpdateManual,
  useDeleteManual,
} from '@/features/erp/hooks';
import { dbProjectToFrontend, dbTaskToFrontend, dbFinancialToFrontend, frontendProjectToDb, frontendTaskToDb, frontendFinancialToDb } from '@/features/erp/utils';
import { ProjectModal } from '@/features/erp/components/ProjectModal';
import { AttendanceManagementView } from '@/features/attendance/components/AttendanceManagementView';

type FlowMakerView =
  | 'dashboard'
  | 'projects'
  | 'schedule'
  | 'equipment'
  | 'hr'
  | 'clients'
  | 'finance'
  | 'tasks'
  | 'manuals'
  | 'artists'
  | 'attendance';

interface FlowMakerDashboardProps {
  bu: BU;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'In Production': 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    'Pre-Production': 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    'Post-Production': 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    'Completed': 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300 border-gray-200 dark:border-slate-700',
    'Planning': 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    'Available': 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
    'Rented': 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
    'Maintenance': 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    'Paid': 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
    'Pending': 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
    'Overdue': 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
    'Approved': 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
    'Active': 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
    'On Set': 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
    'Busy': 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300',
    'Inactive': 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400',
    'Growing': 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  };

  return (
    <span
      className={cn(
        'px-2.5 py-0.5 rounded-full text-xs font-medium border',
        styles[status] || 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300'
      )}
    >
      {status}
    </span>
  );
}

function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtext?: string;
  icon: any;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <Icon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            )}
          >
            {trend === 'up' ? '▲ 12%' : '▼ 5%'}
          </span>
        )}
      </div>
      <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
    </div>
  );
}

export default function FlowMakerDashboard({ bu }: FlowMakerDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FlowMakerView>('dashboard');
  const [user, setUser] = useState<any>(null);

  // Period filter states
  const [periodType, setPeriodType] = useState<'all' | 'year' | 'quarter' | 'month' | 'custom'>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [selectedQuarterYear, setSelectedQuarterYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [customRange, setCustomRange] = useState<{ start?: string; end?: string }>({});

  // Calculate active period
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

  // Data hooks
  const { data: projectsData = [] } = useProjects(bu);
  const { data: tasksData = [] } = useTasks(bu);
  const { data: financialData = [] } = useFinancialEntries({
    bu,
    startDate: activePeriod.start,
    endDate: activePeriod.end,
  });
  const { data: clientsData = [] } = useClients(bu);
  const { data: equipmentData = [] } = useEquipment(bu);
  const { data: artistsData = [] } = useArtists(bu);
  const { data: eventsData = [] } = useEvents(bu);
  const { data: manualsData = [] } = useManuals(bu);
  const { data: orgData = [] } = useOrgMembers();
  const { data: externalWorkersData = [] } = useExternalWorkers(bu);

  // Create usersData from orgData
  const usersData = useMemo(() => ({
    users: orgData || [],
    currentUser: null,
  }), [orgData]);

  // Mutation hooks
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const createFinancialMutation = useCreateFinancialEntry();
  const updateFinancialMutation = useUpdateFinancialEntry();
  const deleteFinancialMutation = useDeleteFinancialEntry();
  const createClientMutation = useCreateClient();
  const createClientWorkerMutation = useCreateClientWorker();
  const updateClientMutation = useUpdateClient();
  const updateClientWorkerMutation = useUpdateClientWorker();
  const deleteClientMutation = useDeleteClient();
  const deleteClientWorkerMutation = useDeleteClientWorker();
  const createEquipmentMutation = useCreateEquipment();
  const updateEquipmentMutation = useUpdateEquipment();
  const deleteEquipmentMutation = useDeleteEquipment();
  const createArtistMutation = useCreateArtist();
  const updateArtistMutation = useUpdateArtist();
  const deleteArtistMutation = useDeleteArtist();
  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();
  const createManualMutation = useCreateManual();
  const updateManualMutation = useUpdateManual();
  const deleteManualMutation = useDeleteManual();
  const createExternalWorkerMutation = useCreateExternalWorker();
  const updateExternalWorkerMutation = useUpdateExternalWorker();
  const deleteExternalWorkerMutation = useDeleteExternalWorker();

  // Modal states
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setEditProjectModalOpen] = useState<any>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalProjectId, setTaskModalProjectId] = useState<number | null>(null);
  const [isEditTaskModalOpen, setEditTaskModalOpen] = useState<any>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [isEditClientModalOpen, setEditClientModalOpen] = useState<Client | null>(null);
  const [deleteClientId, setDeleteClientId] = useState<number | null>(null);
  const [isClientWorkerModalOpen, setClientWorkerModalOpen] = useState<number | null>(null);
  const [isGlobalClientWorkerModalOpen, setGlobalClientWorkerModalOpen] = useState(false);
  const [isEditClientWorkerModalOpen, setEditClientWorkerModalOpen] = useState<{ companyId: number; workerId: number } | null>(null);
  const [deleteClientWorkerId, setDeleteClientWorkerId] = useState<number | null>(null);
  const [isEquipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [isEditEquipmentModalOpen, setEditEquipmentModalOpen] = useState<Equipment | null>(null);
  const [deleteEquipmentId, setDeleteEquipmentId] = useState<number | null>(null);
  const [isArtistModalOpen, setArtistModalOpen] = useState(false);
  const [isEditArtistModalOpen, setEditArtistModalOpen] = useState<Artist | null>(null);
  const [deleteArtistId, setDeleteArtistId] = useState<number | null>(null);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [isEditEventModalOpen, setEditEventModalOpen] = useState<Event | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<number | null>(null);
  const [isFinanceModalOpen, setFinanceModalOpen] = useState<{ mode: 'revenue' | 'expense'; projectId?: number } | null>(null);
  const [isEditFinanceModalOpen, setEditFinanceModalOpen] = useState<any>(null);
  const [deleteFinanceId, setDeleteFinanceId] = useState<number | null>(null);
  const [isManualModalOpen, setManualModalOpen] = useState(false);
  const [isEditManualModalOpen, setEditManualModalOpen] = useState<Manual | null>(null);
  const [deleteManualId, setDeleteManualId] = useState<number | null>(null);
  const [isStaffModalOpen, setStaffModalOpen] = useState(false);
  const [isEditStaffModalOpen, setEditStaffModalOpen] = useState<any>(null);
  const [deleteStaffId, setDeleteStaffId] = useState<number | null>(null);

  const projects = useMemo(() => {
    return projectsData.map((p) => ({
      ...dbProjectToFrontend(p),
      client_id: p.client_id,
    }));
  }, [projectsData]);
  const tasks = useMemo(() => {
    return tasksData.map((t) => ({
      ...dbTaskToFrontend(t),
      priority: t.priority,
      tag: t.tag,
    }));
  }, [tasksData]);
  const financials = useMemo(() => financialData.map(dbFinancialToFrontend), [financialData]);

  // Year options for period selection
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 2021 + 1 }, (_, i) => 2021 + i).reverse();
  }, []);

  const handlePeriodTypeChange = (type: 'all' | 'year' | 'quarter' | 'month' | 'custom') => {
    setPeriodType(type);
    if (type !== 'custom') {
      setCustomRange({ start: undefined, end: undefined });
    }
  };

  const handleDateChange = (key: 'start' | 'end', value: string) => {
    setCustomRange((prev) => ({ ...prev, [key]: value }));
  };

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

      // REACT 사업부가 아니고 본사도 아닌 경우 접근 불가
      if (appUser?.bu_code && appUser.bu_code !== 'REACT' && appUser.bu_code !== 'HEAD') {
        // 본인 사업부 ERP로 리디렉션
        if (appUser.bu_code === 'AST') {
          router.push('/astcompany');
        } else if (appUser.bu_code === 'GRIGO') {
          router.push('/grigoent');
        } else if (appUser.bu_code === 'FLOW') {
          router.push('/flow');
        } else if (appUser.bu_code === 'MODOO') {
          router.push('/modoo');
        }
        return;
      }

      setUser({ ...user, profile: appUser });
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'projects', label: '프로젝트 관리', icon: Clapperboard },
    { id: 'artists', label: '아티스트 관리', icon: Users },
    { id: 'schedule', label: '일정/캘린더', icon: CalendarIcon },
    { id: 'equipment', label: '장비 관리', icon: Camera },
    { id: 'hr', label: '스태프/외주', icon: Users },
    { id: 'clients', label: '클라이언트', icon: Briefcase },
    { id: 'finance', label: '정산/회계', icon: Receipt },
    { id: 'tasks', label: '업무/할일', icon: CheckSquare },
    { id: 'attendance', label: '근무시간 관리', icon: Clock },
    { id: 'manuals', label: '매뉴얼/가이드', icon: BookOpen },
  ];

  // Dashboard View
  const DashboardView = () => {
    const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<'all' | 'my'>('all');
    const activeProjects = projects.filter((p) => p.bu === bu);
    const activeTasks = tasks.filter((t) => t.bu === bu);
    const buFinancials = financials.filter((f) => f.bu === bu);
    const revenues = buFinancials.filter((f) => f.type === 'revenue');
    const expenses = buFinancials.filter((f) => f.type === 'expense');
    const buEvents = eventsData.filter((e) => e.bu_code === bu);

    const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpense;

    const inProgressProjects = activeProjects.filter((p) => 
      p.status === '기획중' || p.status === '진행중' || p.status === '운영중'
    );

    const upcomingEvents = [...buEvents]
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 5);

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="총 매출"
            value={formatCurrency(totalRevenue)}
            icon={DollarSign}
            trend={totalRevenue > 0 ? "up" : undefined}
          />
          <StatCard
            title="총 지출"
            value={formatCurrency(totalExpense)}
            icon={Receipt}
            trend={totalExpense > 0 ? "down" : undefined}
          />
          <StatCard
            title="순이익"
            value={formatCurrency(netProfit)}
            icon={TrendingUp}
            trend={netProfit >= 0 ? "up" : "down"}
          />
          <StatCard
            title="진행 중 프로젝트"
            value={`${inProgressProjects.length} 건`}
            subtext={`기획: ${activeProjects.filter((p) => p.status === '기획중').length} / 진행: ${activeProjects.filter((p) => p.status === '진행중').length} / 운영: ${activeProjects.filter((p) => p.status === '운영중').length}`}
            icon={Clapperboard}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">진행 중인 프로젝트</h3>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  전체 보기
                </button>
              </div>
              <div className="space-y-3">
                {inProgressProjects.length > 0 ? (
                  inProgressProjects.slice(0, 5).map((project) => {
                    const projectRevenue = revenues
                      .filter((f) => f.projectId === project.id)
                      .reduce((sum, r) => sum + r.amount, 0);
                    const projectExpense = expenses
                      .filter((f) => f.projectId === project.id)
                      .reduce((sum, e) => sum + e.amount, 0);
                    const projectProfit = projectRevenue - projectExpense;

                    return (
                      <div
                        key={project.id}
                        onClick={() => setActiveTab('projects')}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 cursor-pointer transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-gray-800 text-sm">{project.name}</h4>
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              project.status === '기획중' ? 'bg-yellow-100 text-yellow-700' :
                              project.status === '진행중' ? 'bg-blue-100 text-blue-700' :
                              project.status === '운영중' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            )}>
                              {project.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                            <span>매출: {formatCurrency(projectRevenue)}</span>
                            <span>지출: {formatCurrency(projectExpense)}</span>
                            <span className={cn(
                              'font-medium',
                              projectProfit >= 0 ? 'text-green-600' : 'text-red-600'
                            )}>
                              순이익: {formatCurrency(projectProfit)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    진행 중인 프로젝트가 없습니다.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">주요 일정</h3>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  전체 달력 보기
                </button>
              </div>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100 cursor-pointer"
                      onClick={() => setEditEventModalOpen(event)}
                    >
                      <div className="w-16 text-center mr-4 flex-shrink-0">
                        <div className="text-xs text-gray-500 font-medium">
                          {new Date(event.event_date).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'w-1 h-10 rounded-full mr-4 flex-shrink-0',
                          event.event_type === 'shoot'
                            ? 'bg-red-500'
                            : event.event_type === 'meeting'
                              ? 'bg-blue-500'
                              : 'bg-purple-500'
                        )}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 text-sm truncate">{event.title}</h4>
                        {event.description && (
                          <p className="text-xs text-gray-500 flex items-center mt-1 truncate">
                            <Clock className="w-3 h-3 mr-1 flex-shrink-0" /> 
                            <span className="truncate">{event.description}</span>
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    등록된 일정이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">할 일</h3>
              <button
                onClick={() => setTaskModalOpen(true)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            {/* 할일 필터 */}
            <div className="mb-4 flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                onClick={() => setTaskAssigneeFilter('all')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  taskAssigneeFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
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
                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
                )}
              >
                내 할일만 보기
              </button>
            </div>
            <div className="space-y-3">
              {activeTasks.filter((t) => {
                if (t.status === 'done') return false;
                if (taskAssigneeFilter === 'my' && user?.profile?.name) {
                  return t.assignee === user.profile.name;
                }
                return true;
              }).length > 0 ? (
                activeTasks
                  .filter((t) => {
                    if (t.status === 'done') return false;
                    if (taskAssigneeFilter === 'my' && user?.profile?.name) {
                      return t.assignee === user.profile.name;
                    }
                    return true;
                  })
                  .slice(0, 5)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            task.status === 'todo' ? 'bg-gray-100 text-gray-600' :
                            task.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                            'bg-green-100 text-green-600'
                          )}>
                            {task.status === 'todo' ? '할 일' : task.status === 'in-progress' ? '진행 중' : '완료'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 mb-2">{task.title}</p>
                        {task.assignee && (
                          <div className="flex items-center text-xs text-gray-500">
                            <User className="w-3 h-3 mr-1" />
                            <span className="font-medium">{task.assignee}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center text-xs text-gray-400 mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{new Date(task.dueDate).toLocaleDateString('ko-KR')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  등록된 할 일이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Project List View
  const ProjectListView = () => {
    const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
    const buProjects = projects.filter((p) => p.bu === bu);

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm gap-4">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="프로젝트 검색..."
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

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      프로젝트명
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      클라이언트
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      PM / 감독
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      예산
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      마감일
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {buProjects.map((project) => {
                    const projectClient = clientsData.find((c) => c.id === project.client_id);
                    const projectRevenues = financials.filter(
                      (f) => f.projectId === project.id && f.type === 'revenue'
                    );
                    const projectExpenses = financials.filter(
                      (f) => f.projectId === project.id && f.type === 'expense'
                    );
                    const budget = projectRevenues.reduce((sum, r) => sum + r.amount, 0);
                    const totalExpenses = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
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
                            {projectClient?.company_name_ko || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 flex items-center">
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 mr-2 border border-slate-200 dark:border-slate-700">
                              {project.name.charAt(0)}
                            </div>
                            PM
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                            {formatCurrency(budget)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{project.endDate}</td>
                          <td className="px-6 py-4">
                            <StatusBadge
                              status={
                                project.status === '진행중'
                                  ? 'In Production'
                                  : project.status === '기획중'
                                    ? 'Pre-Production'
                                    : project.status === '운영중'
                                      ? 'Post-Production'
                                      : project.status === '완료'
                                        ? 'Completed'
                                        : 'Planning'
                              }
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditProjectModalOpen(project);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <MoreVertical className="w-4 h-4 ml-auto" />
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${project.id}-accordion`}>
                            <td colSpan={7} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
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
                                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 p-4">
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
                                                  setEditFinanceModalOpen(revenue);
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

                                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 p-4">
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
                                                  setEditFinanceModalOpen(expense);
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

                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                      <CheckSquare className="w-5 h-5 text-indigo-600" /> 할일 관리
                                    </h4>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTaskModalProjectId(Number(project.id));
                                        setTaskModalOpen(true);
                                      }}
                                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" /> 할일 추가
                                    </button>
                                  </div>

                                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 p-4">
                                    <div className="space-y-2">
                                      {(() => {
                                        const projectTasks = tasks.filter((t) => t.projectId === project.id.toString());
                                        return projectTasks.length > 0 ? (
                                          projectTasks.map((task) => {
                                            const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'done';
                                            return (
                                              <div
                                                key={task.id}
                                                className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                                              >
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <span
                                                      className={cn(
                                                        'text-sm font-medium',
                                                        task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800',
                                                        isOverdue ? 'text-red-600 font-bold' : ''
                                                      )}
                                                    >
                                                      {task.title}
                                                    </span>
                                                    {task.priority && (
                                                      <span
                                                        className={cn(
                                                          'text-[10px] px-1.5 py-0.5 rounded font-medium border',
                                                          task.priority === 'high'
                                                            ? 'bg-red-50 text-red-600 border-red-100'
                                                            : task.priority === 'medium'
                                                              ? 'bg-orange-50 text-orange-600 border-orange-100'
                                                              : 'bg-green-50 text-green-600 border-green-100'
                                                        )}
                                                      >
                                                        {task.priority === 'high' ? '높음' : task.priority === 'medium' ? '중간' : '낮음'}
                                                      </span>
                                                    )}
                                                    {task.tag && (
                                                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">
                                                        {task.tag}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                                    {task.assignee && (
                                                      <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" /> {task.assignee}
                                                      </span>
                                                    )}
                                                    <span className={cn(
                                                      'flex items-center gap-1',
                                                      isOverdue ? 'text-red-600 font-medium' : ''
                                                    )}>
                                                      <CalendarIcon className="w-3 h-3" /> {task.dueDate}
                                                    </span>
                                                    <span
                                                      className={cn(
                                                        'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                                        task.status === 'done'
                                                          ? 'bg-green-100 text-green-700'
                                                          : task.status === 'in-progress'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                      )}
                                                    >
                                                      {task.status === 'done' ? '완료' : task.status === 'in-progress' ? '진행중' : '할일'}
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-3">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditTaskModalOpen(task);
                                                    }}
                                                    className="text-gray-400 hover:text-indigo-600"
                                                    title="수정"
                                                  >
                                                    <Edit3 className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setDeleteTaskId(Number(task.id));
                                                    }}
                                                    className="text-gray-400 hover:text-red-600"
                                                    title="삭제"
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <div className="text-sm text-gray-400 text-center py-4">
                                            등록된 할일이 없습니다.
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
      </div>
    );
  };

  // Channel View
  const ArtistView = () => {
    const buArtists = artistsData.filter((a) => a.bu_code === bu);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm gap-4">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="아티스트 검색..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-800 text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                그리드
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-800 text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                리스트
              </button>
            </div>
            <button
              onClick={() => setArtistModalOpen(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> 새 아티스트
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">아티스트명</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">국적</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">계약 기간</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">비자 기간</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">역할</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {buArtists.map((artist) => (
                  <tr key={artist.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        <div>
                          <div className="font-medium text-gray-900">{artist.name}</div>
                          {artist.type && (
                            <div className="text-xs text-gray-400">
                              {artist.type === 'individual' ? '개인' : '팀'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{artist.nationality || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {artist.contract_start && artist.contract_end
                        ? `${artist.contract_start} ~ ${artist.contract_end}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {artist.visa_start && artist.visa_end
                        ? `${artist.visa_start} ~ ${artist.visa_end}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{artist.role || '-'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={artist.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditArtistModalOpen(artist)}
                          className="text-gray-400 hover:text-indigo-600"
                          title="수정"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteArtistId(artist.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {buArtists.map((artist) => {
              return (
                <div
                  key={artist.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full"
                >
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <div className="p-3 bg-indigo-50 rounded-lg mr-3">
                          <Users className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-gray-900">{artist.name}</h3>
                          {artist.type && (
                            <div className="text-xs text-gray-400 mt-1">
                              {artist.type === 'individual' ? '개인' : '팀'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={artist.status} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditArtistModalOpen(artist);
                          }}
                          className="text-gray-400 hover:text-indigo-600"
                          title="수정"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteArtistId(artist.id);
                          }}
                          className="text-gray-400 hover:text-red-600"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">국적</p>
                        <p className="text-lg font-bold text-gray-800">
                          {artist.nationality || '-'}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">역할</p>
                        <p className="text-lg font-bold text-gray-800">
                          {artist.role || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 space-y-2 mb-3">
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                        계약 기간:{' '}
                        {artist.contract_start && artist.contract_end ? (
                          <span className="font-bold text-indigo-600 ml-1">
                            {artist.contract_start} ~ {artist.contract_end}
                          </span>
                        ) : (
                          <span className="text-gray-400 ml-1">-</span>
                        )}
                      </div>
                      {artist.visa_start && artist.visa_end && (
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-gray-400" />
                          비자 기간:{' '}
                          <span className="font-bold text-indigo-600 ml-1">
                            {artist.visa_start} ~ {artist.visa_end}
                          </span>
                        </div>
                      )}
                      {artist.visa_type && (
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-gray-400" />
                          비자 유형:{' '}
                          <span className="font-medium text-gray-800 ml-1">
                            {artist.visa_type}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Artist Modal Components
  const CreateArtistModal = ({
    bu,
    onClose,
    onSubmit,
  }: {
    bu: BU;
    onClose: () => void;
    onSubmit: (data: Partial<Artist>) => void;
  }) => {
    const [form, setForm] = useState({
      name: '',
      nationality: '',
      visa_type: '',
      contract_start: '',
      contract_end: '',
      visa_start: '',
      visa_end: '',
      role: '',
      status: 'Active' as 'Active' | 'Inactive' | 'Archived',
      type: 'individual' as 'individual' | 'team',
    });

    return (
      <ModalShell title="아티스트 등록" onClose={onClose}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <InputField
            label="아티스트명"
            placeholder="아티스트 이름"
            value={form.name}
            onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
          />
          <SelectField
            label="유형"
            value={form.type}
            onChange={(val) => setForm((prev) => ({ ...prev, type: val as any }))}
            options={[
              { value: 'individual', label: '개인' },
              { value: 'team', label: '팀' },
            ]}
          />
          <InputField
            label="국적"
            placeholder="국적"
            value={form.nationality}
            onChange={(v) => setForm((prev) => ({ ...prev, nationality: v }))}
          />
          <InputField
            label="역할"
            placeholder="역할"
            value={form.role}
            onChange={(v) => setForm((prev) => ({ ...prev, role: v }))}
          />
          <InputField
            label="계약 시작일"
            type="date"
            value={form.contract_start}
            onChange={(v) => setForm((prev) => ({ ...prev, contract_start: v }))}
          />
          <InputField
            label="계약 종료일"
            type="date"
            value={form.contract_end}
            onChange={(v) => setForm((prev) => ({ ...prev, contract_end: v }))}
          />
          <InputField
            label="비자 유형"
            placeholder="비자 유형"
            value={form.visa_type}
            onChange={(v) => setForm((prev) => ({ ...prev, visa_type: v }))}
          />
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
          <SelectField
            label="상태"
            value={form.status}
            onChange={(val) => setForm((prev) => ({ ...prev, status: val as any }))}
            options={[
              { value: 'Active', label: '활성' },
              { value: 'Inactive', label: '비활성' },
              { value: 'Archived', label: '보관됨' },
            ]}
          />
        </div>
        <ModalActions
          onPrimary={() => onSubmit({ ...form, bu_code: bu })}
          onClose={onClose}
          primaryLabel="등록"
        />
      </ModalShell>
    );
  };

  const EditArtistModal = ({
    artist,
    onClose,
    onSubmit,
  }: {
    artist: Artist;
    onClose: () => void;
    onSubmit: (data: Partial<Artist>) => void;
  }) => {
    const [form, setForm] = useState({
      name: artist.name,
      nationality: artist.nationality || '',
      visa_type: artist.visa_type || '',
      contract_start: artist.contract_start,
      contract_end: artist.contract_end,
      visa_start: artist.visa_start || '',
      visa_end: artist.visa_end || '',
      role: artist.role || '',
      status: artist.status,
      type: artist.type,
    });

    return (
      <ModalShell title="아티스트 수정" onClose={onClose}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <InputField
            label="아티스트명"
            placeholder="아티스트 이름"
            value={form.name}
            onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
          />
          <SelectField
            label="유형"
            value={form.type}
            onChange={(val) => setForm((prev) => ({ ...prev, type: val as any }))}
            options={[
              { value: 'individual', label: '개인' },
              { value: 'team', label: '팀' },
            ]}
          />
          <InputField
            label="국적"
            placeholder="국적"
            value={form.nationality}
            onChange={(v) => setForm((prev) => ({ ...prev, nationality: v }))}
          />
          <InputField
            label="역할"
            placeholder="역할"
            value={form.role}
            onChange={(v) => setForm((prev) => ({ ...prev, role: v }))}
          />
          <InputField
            label="계약 시작일"
            type="date"
            value={form.contract_start}
            onChange={(v) => setForm((prev) => ({ ...prev, contract_start: v }))}
          />
          <InputField
            label="계약 종료일"
            type="date"
            value={form.contract_end}
            onChange={(v) => setForm((prev) => ({ ...prev, contract_end: v }))}
          />
          <InputField
            label="비자 유형"
            placeholder="비자 유형"
            value={form.visa_type}
            onChange={(v) => setForm((prev) => ({ ...prev, visa_type: v }))}
          />
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
          <SelectField
            label="상태"
            value={form.status}
            onChange={(val) => setForm((prev) => ({ ...prev, status: val as any }))}
            options={[
              { value: 'Active', label: '활성' },
              { value: 'Inactive', label: '비활성' },
              { value: 'Archived', label: '보관됨' },
            ]}
          />
        </div>
        <ModalActions
          onPrimary={() => onSubmit(form)}
          onClose={onClose}
          primaryLabel="수정"
        />
      </ModalShell>
    );
  };

  // Equipment View
  const EquipmentView = () => {
    const buEquipment = equipmentData.filter((e) => e.bu_code === bu);
    const availableCount = buEquipment.filter((e) => e.status === 'available').length;
    const rentedCount = buEquipment.filter((e) => e.status === 'rented').length;
    const maintenanceCount = buEquipment.filter(
      (e) => e.status === 'maintenance' || e.status === 'lost'
    ).length;
    const totalCount = buEquipment.length;
    const availablePercent = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;
    const rentedPercent = totalCount > 0 ? Math.round((rentedCount / totalCount) * 100) : 0;
    const maintenancePercent =
      totalCount > 0 ? Math.round((maintenanceCount / totalCount) * 100) : 0;

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">가용 장비</p>
              <p className="text-xl font-bold text-green-600">{availablePercent}%</p>
            </div>
            <CheckSquare className="w-8 h-8 text-green-100" />
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">대여 중 (현장)</p>
              <p className="text-xl font-bold text-indigo-600">{rentedPercent}%</p>
            </div>
            <Camera className="w-8 h-8 text-indigo-100" />
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">수리 / 분실</p>
              <p className="text-xl font-bold text-red-600">{maintenancePercent}%</p>
            </div>
            <Settings className="w-8 h-8 text-red-100" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
            <h3 className="font-bold text-gray-800">장비 전체 리스트</h3>
            <div className="flex gap-2 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center">
                <span className="mr-1">📷</span> 바코드 스캔
              </button>
              <button
                onClick={() => setEquipmentModalOpen(true)}
                className="flex-1 sm:flex-none px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700"
              >
                장비 추가
              </button>
              <button
                onClick={() => {
                  // 대여 등록은 장비 수정 모달에서 처리
                  // 첫 번째 가용 장비를 선택하거나 새 장비 추가 모달을 열 수 있음
                  setEquipmentModalOpen(true);
                }}
                className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-slate-300 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-900"
              >
                대여 등록
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">장비명</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">분류</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    시리얼 넘버
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">현재 위치</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">반납 예정일</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {buEquipment.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setEditEquipmentModalOpen(item)}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                      {item.serial_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">{item.location || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.return_date || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={
                          item.status === 'available'
                            ? 'Available'
                            : item.status === 'rented'
                              ? 'Rented'
                              : 'Maintenance'
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Finance View
  const FinanceView = () => {
    const buFinancials = financials.filter((f) => f.bu === bu);
    const revenues = buFinancials.filter((f) => f.type === 'revenue');
    const expenses = buFinancials.filter((f) => f.type === 'expense');
    const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">총 매출</h3>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[70%]"></div>
            </div>
            <p className="text-xs text-gray-400 mt-2">목표 달성률 70% (전년 대비 +5%)</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">
                  총 지출 (인건비/제작비)
                </h3>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalExpense)}</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <Receipt className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-400 w-[45%]"></div>
            </div>
            <p className="text-xs text-gray-400 mt-2">예산 대비 45% 사용</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">최근 입출금 내역</h3>
            <button
              onClick={() => setFinanceModalOpen({ mode: 'expense' })}
              className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
            >
              영수증 등록
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">날짜</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">구분</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">항목</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    관련 프로젝트
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">금액</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {buFinancials.slice(0, 10).map((item) => {
                  const project = projects.find((p) => p.id === item.projectId);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setEditFinanceModalOpen(item)}
                    >
                      <td className="px-6 py-4 text-sm text-gray-600">{item.date}</td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'text-xs font-bold',
                            item.type === 'revenue' ? 'text-blue-600' : 'text-red-600'
                          )}
                        >
                          {item.type === 'revenue' ? '입금' : '출금'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {project?.name || '미지정'}
                      </td>
                      <td
                        className={cn(
                          'px-6 py-4 font-mono font-medium',
                          item.type === 'revenue' ? 'text-blue-600' : 'text-red-600'
                        )}
                      >
                        {item.type === 'revenue' ? '+' : '-'} {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={
                            item.status === 'paid'
                              ? 'Paid'
                              : item.status === 'planned'
                                ? 'Pending'
                                : 'Overdue'
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Staff View
  const StaffView = () => {
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    
    const buExternalWorkers = useMemo(() => {
      return externalWorkersData.filter((w: any) => w.bu_code === bu && w.is_active !== false);
    }, [externalWorkersData, bu]);

    const filteredWorkers = useMemo(() => {
      if (!searchQuery.trim()) return buExternalWorkers;
      
      const query = searchQuery.toLowerCase().trim();
      return buExternalWorkers.filter((worker: any) => {
        const nameMatch = worker.name?.toLowerCase().includes(query);
        const companyMatch = worker.company_name?.toLowerCase().includes(query);
        const specialtiesMatch = worker.specialties?.some((s: string) => 
          s.toLowerCase().includes(query)
        );
        const notesMatch = worker.notes?.toLowerCase().includes(query);
        
        return nameMatch || companyMatch || specialtiesMatch || notesMatch;
      });
    }, [buExternalWorkers, searchQuery]);

    const toggleExpand = (id: number) => {
      setExpandedId(expandedId === id ? null : id);
    };

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800">인력 풀 (Internal & Freelance)</h3>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="이름, 회사명, 전문분야, 비고로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setStaffModalOpen(true)}
              className="px-3 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-1" /> 스태프 등록
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="hidden md:flex bg-gray-50 border-b border-gray-200 px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
            <div className="flex-1">이름 / 역할</div>
            <div className="w-32">소속</div>
            <div className="w-40">연락처</div>
            <div className="w-24">상태</div>
            <div className="w-10"></div>
          </div>

          {filteredWorkers.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 외주 인력이 없습니다.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredWorkers.map((staff) => (
              <div key={staff.id} className="group">
                <div
                  onClick={() => toggleExpand(staff.id)}
                  className={cn(
                    'px-6 py-4 flex flex-col md:flex-row md:items-center cursor-pointer hover:bg-gray-50 transition-colors',
                    expandedId === staff.id ? 'bg-gray-50' : ''
                  )}
                >
                  <div className="flex-1 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 mr-3 border border-slate-200 dark:border-slate-700">
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{staff.name}</div>
                      {staff.company_name && <div className="text-sm text-gray-500">{staff.company_name}</div>}
                    </div>
                  </div>

                  <div className="mt-2 md:mt-0 w-full md:w-32 flex items-center">
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs',
                        staff.worker_type === 'freelancer'
                          ? 'bg-purple-100 text-purple-700'
                          : staff.worker_type === 'company'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-indigo-100 text-indigo-700'
                      )}
                    >
                      {staff.worker_type === 'freelancer'
                        ? '프리랜서'
                        : staff.worker_type === 'company'
                          ? '외주회사'
                          : '계약직'}
                    </span>
                  </div>

                  <div className="mt-2 md:mt-0 w-full md:w-40 text-sm text-gray-600 flex items-center">
                    {staff.phone && (
                      <>
                        <Phone className="w-3 h-3 mr-1 text-gray-400" /> {staff.phone}
                      </>
                    )}
                  </div>

                  <div className="mt-2 md:mt-0 w-full md:w-24">
                    <StatusBadge status={staff.is_active ? 'Active' : 'Inactive'} />
                  </div>

                  <div className="hidden md:flex w-10 justify-end">
                    {expandedId === staff.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedId === staff.id && (
                  <div className="px-6 pb-6 pt-4 bg-gray-50 border-t border-gray-100 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 왼쪽: 기본 정보 */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">기본 정보</h4>
                          <div className="space-y-3">
                            <div className="flex items-start">
                              <span className="text-xs font-medium text-gray-500 w-20 flex-shrink-0">이름:</span>
                              <span className="text-sm text-gray-900">{staff.name}</span>
                            </div>
                            {staff.company_name && (
                              <div className="flex items-start">
                                <span className="text-xs font-medium text-gray-500 w-20 flex-shrink-0">회사명:</span>
                                <span className="text-sm text-gray-900">{staff.company_name}</span>
                              </div>
                            )}
                            <div className="flex items-start">
                              <span className="text-xs font-medium text-gray-500 w-20 flex-shrink-0">타입:</span>
                              <span className="text-sm text-gray-900">
                                {staff.worker_type === 'freelancer'
                                  ? '프리랜서'
                                  : staff.worker_type === 'company'
                                    ? '외주회사'
                                    : '계약직'}
                              </span>
                            </div>
                            <div className="flex items-start">
                              <span className="text-xs font-medium text-gray-500 w-20 flex-shrink-0">사업부:</span>
                              <span className="text-sm text-gray-900">{bu}</span>
                            </div>
                            <div className="flex items-start">
                              <span className="text-xs font-medium text-gray-500 w-20 flex-shrink-0">상태:</span>
                              <StatusBadge status={staff.is_active ? 'Active' : 'Inactive'} />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">연락처</h4>
                          <div className="space-y-3">
                            {staff.phone ? (
                              <div className="flex items-center text-sm text-gray-700">
                                <Phone className="w-4 h-4 mr-2 text-gray-400" /> {staff.phone}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">-</div>
                            )}
                            {staff.email ? (
                              <div className="flex items-center text-sm text-gray-700">
                                <Mail className="w-4 h-4 mr-2 text-gray-400" /> {staff.email}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">-</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 오른쪽: 전문분야, 비고, 메타 정보 */}
                      <div className="space-y-4">
                        {staff.specialties && staff.specialties.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">전문 분야</h4>
                            <div className="flex flex-wrap gap-2">
                              {staff.specialties.map((specialty: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                                >
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {staff.notes && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">비고</h4>
                            <div className="text-sm text-gray-700 bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 whitespace-pre-wrap">
                              {staff.notes}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">메타 정보</h4>
                          <div className="space-y-2 text-xs text-gray-500">
                            {staff.created_at && (
                              <div>등록일: {new Date(staff.created_at).toLocaleDateString('ko-KR')}</div>
                            )}
                            {staff.updated_at && (
                              <div>수정일: {new Date(staff.updated_at).toLocaleDateString('ko-KR')}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditStaffModalOpen(staff);
                          setExpandedId(null);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        수정
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteStaffId(staff.id);
                          setExpandedId(null);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        삭제
                      </button>
                      <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        급여/정산 내역
                      </button>
                    </div>
                  </div>
                )}
              </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Schedule View
  const ScheduleView = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const buEvents = eventsData.filter((e) => e.bu_code === bu);
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );
    const daysInMonth = monthEnd.getDate();
    const startDay = monthStart.getDay();

    const monthEvents = buEvents.filter((event) => {
      const eventDate = new Date(event.event_date);
      return (
        eventDate.getMonth() === currentMonth.getMonth() &&
        eventDate.getFullYear() === currentMonth.getFullYear()
      );
    });

    const upcomingEvents = [...buEvents]
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 10);

    const getEventTypeColor = (type: string) => {
      switch (type) {
        case 'shoot':
          return 'bg-red-100 text-red-700 border-red-200';
        case 'deadline':
          return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'holiday':
          return 'bg-red-50 text-red-500';
        default:
          return 'bg-blue-100 text-blue-700 border-blue-200';
      }
    };

    const getEventTypeLabel = (type: string) => {
      switch (type) {
        case 'shoot':
          return '촬영';
        case 'deadline':
          return '마감';
        case 'holiday':
          return '휴일';
        default:
          return '미팅';
      }
    };

    return (
      <div className="space-y-4 animate-fade-in h-full flex flex-col">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-800">
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                  )
                }
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                  )
                }
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
              월간
            </button>
            <button className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
              주간
            </button>
            <button
              onClick={() => setEventModalOpen(true)}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              일정 추가
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-4 overflow-hidden flex flex-col">
            <div className="grid grid-cols-7 mb-2 border-b border-gray-200 pb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    'text-center text-sm font-semibold',
                    i === 0 ? 'text-red-500' : 'text-gray-500'
                  )}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-1 h-full overflow-y-auto">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-gray-50/50 rounded-lg"></div>
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dayEvents = monthEvents.filter((event) => {
                  const eventDate = new Date(event.event_date);
                  return eventDate.getDate() === day;
                });
                const isToday =
                  day === new Date().getDate() &&
                  currentMonth.getMonth() === new Date().getMonth() &&
                  currentMonth.getFullYear() === new Date().getFullYear();

                return (
                  <div
                    key={day}
                    className="border border-gray-100 rounded-lg p-2 hover:bg-gray-50 transition-colors min-h-[80px] relative group flex flex-col"
                  >
                    <span
                      className={cn(
                        'text-sm font-semibold flex-shrink-0',
                        isToday
                          ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                          : 'text-gray-700'
                      )}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-1 overflow-y-auto custom-scrollbar flex-1">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditEventModalOpen(event);
                          }}
                          className={cn(
                            'text-[10px] px-1.5 py-1 rounded truncate font-medium border cursor-pointer hover:opacity-80',
                            getEventTypeColor(event.event_type)
                          )}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                        {isToday && (
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEventModalOpen(true);
                              }}
                              className="p-1 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full lg:w-80 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Star className="w-5 h-5 text-yellow-500 mr-2 fill-yellow-500" />
                이달의 주요 일정
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => {
                  const eventDate = new Date(event.event_date);
                  return (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors bg-gray-50 group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full mr-2',
                              event.event_type === 'shoot'
                                ? 'bg-red-500'
                                : event.event_type === 'deadline'
                                  ? 'bg-purple-500'
                                  : event.event_type === 'holiday'
                                    ? 'bg-red-400'
                                    : 'bg-blue-500'
                            )}
                          ></div>
                          <span className="text-xs font-bold text-gray-500">
                            {eventDate.getMonth() + 1}월 {eventDate.getDate()}일
                          </span>
                        </div>
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded border',
                            getEventTypeColor(event.event_type)
                          )}
                        >
                          {getEventTypeLabel(event.event_type)}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-800 mb-1">{event.title}</h4>
                      {event.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{event.description}</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">등록된 일정이 없습니다.</div>
              )}
            </div>

            <button className="w-full mt-4 py-2 text-sm text-indigo-600 font-medium border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex-shrink-0">
              일정 전체 다운로드
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Client View
  const ClientView = () => {
    const [expandedId, setExpandedId] = useState<number | null>(null);
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
      <div className="space-y-4 animate-fade-in">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="클라이언트 검색..."
              value={clientSearchQuery}
              onChange={(e) => setClientSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setClientModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" /> 클라이언트 등록
            </button>
            <button
              onClick={() => setGlobalClientWorkerModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" /> 담당자 추가
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="hidden md:flex bg-gray-50 border-b border-gray-200 px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
            <div className="flex-1">클라이언트 / 업종</div>
            <div className="w-40">담당자</div>
            <div className="w-32">상태</div>
            <div className="w-10"></div>
          </div>

          <div className="divide-y divide-gray-100">
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
                        <h4 className="text-xs font-bold text-gray-400 uppercase">담당자</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientWorkerModalOpen(client.id);
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center"
                        >
                          <Plus className="w-3 h-3 mr-1" /> 담당자 추가
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
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                      {filteredWorkers.length > 0 ? (
                        filteredWorkers.map((worker: any) => (
                          <div
                            key={worker.id}
                            className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border border-gray-200"
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {worker.name_ko}
                              </div>
                              <div className="text-xs text-gray-500">
                                {worker.phone && <span>{worker.phone}</span>}
                                {worker.phone && worker.email && <span className="mx-1">•</span>}
                                {worker.email && <span>{worker.email}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditClientWorkerModalOpen({ companyId: client.id, workerId: worker.id });
                                }}
                                className="p-1 text-gray-400 hover:text-indigo-600"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteClientWorkerId(worker.id);
                                }}
                                className="p-1 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-400 py-2">
                          {workerSearchQuery ? '검색 결과가 없습니다.' : '등록된 담당자가 없습니다.'}
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div key={client.id} className="group">
                    <div
                      onClick={() => toggleExpand(client.id)}
                      className={cn(
                        'px-6 py-4 flex flex-col md:flex-row md:items-center cursor-pointer hover:bg-gray-50 transition-colors',
                        expandedId === client.id ? 'bg-gray-50' : ''
                      )}
                    >
                      <div className="flex-1 flex items-center">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-lg font-bold text-indigo-600 border border-indigo-100 mr-4">
                          {(client as any).company_name_ko?.substring(0, 1) || (client as any).company_name_en?.substring(0, 1) || '-'}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{(client as any).company_name_ko || (client as any).company_name_en || '-'}</h3>
                          <p className="text-xs text-gray-500">{client.industry || '-'}</p>
                        </div>
                      </div>

                      <div className="mt-2 md:mt-0 w-full md:w-40 text-sm text-gray-600 flex items-center">
                        <User className="w-3 h-3 mr-2 text-gray-400" />{' '}
                        {(client as any).representative_name || '-'}
                      </div>

                      <div className="mt-2 md:mt-0 w-full md:w-32">
                        <StatusBadge status={client.status} />
                      </div>

                      <div className="hidden md:flex w-10 justify-end">
                        {expandedId === client.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {expandedId === client.id && (
                      <div className="px-6 pb-6 pt-2 bg-gray-50 border-t border-gray-100 animate-fade-in">
                        <div className="ml-0 md:ml-14 grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">
                              회사 정보
                            </h4>
                            {(client as any).business_registration_number && (
                              <div className="flex items-center text-sm text-gray-700">
                                <span className="text-gray-500 mr-2">사업자등록번호:</span>
                                {(client as any).business_registration_number}
                              </div>
                            )}
                            {(client as any).representative_name && (
                              <div className="flex items-center text-sm text-gray-700">
                                <span className="text-gray-500 mr-2">대표자:</span>
                                {(client as any).representative_name}
                              </div>
                            )}
                            {client.last_meeting_date && (
                              <div className="flex items-center text-sm text-gray-700">
                                <span className="text-gray-500 mr-2">최근 미팅:</span>
                                {client.last_meeting_date}
                              </div>
                            )}
                            <ClientWorkersList />
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">
                              거래 현황
                            </h4>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">진행 프로젝트</span>
                              <span className="font-bold">{clientProjects.length} 건</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">총 매출액</span>
                              <span className="font-bold text-indigo-600">
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
                              className="w-full md:w-auto px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors text-gray-700"
                            >
                              정보 수정
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectModalOpen(true);
                              }}
                              className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                              프로젝트 생성
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteClientId(client.id);
                              }}
                              className="w-full md:w-auto px-4 py-2 bg-red-50 text-red-600 rounded text-sm hover:bg-red-100 transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center text-gray-400">
                {clientSearchQuery ? '검색 결과가 없습니다.' : '등록된 클라이언트가 없습니다.'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Task View (Kanban)
  const TaskView = () => {
    const buTasks = tasks.filter((t) => t.bu === bu);
    const todoTasks = buTasks.filter((t) => t.status === 'todo');
    const inProgressTasks = buTasks.filter((t) => t.status === 'in-progress');
    const doneTasks = buTasks.filter((t) => t.status === 'done');

    const kanbanColumns = [
      { id: 'todo', title: 'To Do (기획/준비)', items: todoTasks },
      { id: 'progress', title: 'In Progress (진행중)', items: inProgressTasks },
      { id: 'review', title: 'Review (시사/피드백)', items: [] },
      { id: 'done', title: 'Done (완료)', items: doneTasks },
    ];

    return (
      <div className="h-full flex flex-col space-y-4 animate-fade-in overflow-hidden">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
          <h2 className="text-lg font-bold text-gray-800">업무 현황 (Kanban)</h2>
          <div className="flex space-x-2">
            <button className="flex items-center px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4 mr-2" /> 내 업무만 보기
            </button>
            <button
              onClick={() => setTaskModalOpen(true)}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 inline mr-1" /> 새 업무
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full space-x-4 min-w-[1000px] pb-4">
            {kanbanColumns.map((column) => (
              <div
                key={column.id}
                className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-800 rounded-xl max-w-xs sm:max-w-sm shrink-0"
              >
                <div className="p-3 font-semibold text-gray-700 flex justify-between items-center border-b border-slate-200 dark:border-slate-700/50">
                  {column.title}
                  <span className="bg-slate-200 text-xs px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">
                    {column.items.length}
                  </span>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                  {column.items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setEditTaskModalOpen(item)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-medium border',
                            item.priority === 'high'
                              ? 'bg-red-50 text-red-600 border-red-100'
                              : item.priority === 'medium'
                                ? 'bg-orange-50 text-orange-600 border-orange-100'
                                : 'bg-green-50 text-green-600 border-green-100'
                          )}
                        >
                          {item.priority === 'high'
                            ? 'High'
                            : item.priority === 'medium'
                              ? 'Medium'
                              : 'Low'}
                        </span>
                        <div className="relative group/menu">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTaskModalOpen(item);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 top-6 bg-white dark:bg-slate-800 border border-gray-200 rounded-lg shadow-lg z-10 opacity-0 group-hover/menu:opacity-100 transition-opacity pointer-events-none group-hover/menu:pointer-events-auto min-w-[120px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newStatus =
                                  item.status === 'todo'
                                    ? 'in-progress'
                                    : item.status === 'in-progress'
                                      ? 'done'
                                      : 'todo';
                                updateTaskMutation.mutate({
                                  id: Number(item.id),
                                  data: { status: newStatus === 'in-progress' ? 'in_progress' : newStatus } as any,
                                });
                              }}
                              className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-t-lg"
                            >
                              상태 변경
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTaskId(Number(item.id));
                              }}
                              className="block w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-b-lg"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-3 leading-snug">
                        {item.title}
                      </h4>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700">
                            {item.assignee?.charAt(0) || '?'}
                          </div>
                          <span className="text-xs text-gray-500">{item.assignee || '미지정'}</span>
                        </div>
                        {(item as any).tag && (
                          <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                            {(item as any).tag}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <button className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-slate-200/50 rounded-lg dashed border border-transparent hover:border-slate-300 transition-all flex items-center justify-center">
                    <Plus className="w-3 h-3 mr-1" /> 카드 추가
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Manual View
  const ManualView = () => {
    const [viewManualId, setViewManualId] = useState<number | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const buManuals = manualsData.filter((m) => m.bu_code === bu);

    const categories = [
      { id: 'All', label: '전체', icon: BookOpen },
      { id: 'Onboarding', label: '온보딩', icon: Users },
      { id: 'Tech', label: '장비', icon: Camera },
      { id: 'Production', label: '제작', icon: Clapperboard },
      { id: 'Admin', label: '행정', icon: FileText },
    ];

    const filteredManuals = useMemo(() => {
      let filtered = activeCategory === 'All'
        ? buManuals
        : buManuals.filter((m) => m.category === activeCategory);
      
      if (searchQuery.trim()) {
        filtered = filtered.filter((m) => 
          m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (typeof m.content === 'string' && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      
      return filtered;
    }, [buManuals, activeCategory, searchQuery]);

    const selectedManual = viewManualId
      ? buManuals.find((m) => m.id === viewManualId) || null
      : null;

    if (selectedManual) {
      return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-white dark:bg-slate-800">
            <div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 mb-3">
                <FolderOpen className="w-3 h-3" />
                <span>Wiki</span>
                <ChevronRight className="w-3 h-3" />
                <span>{selectedManual.category}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedManual.title}</h1>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                {selectedManual.author_name && (
                  <div className="flex items-center">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 mr-2">
                      {selectedManual.author_name.charAt(0)}
                    </div>
                    작성자: {selectedManual.author_name}
                  </div>
                )}
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  최종 수정: {new Date(selectedManual.updated_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewManualId(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                title="목록으로"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                title="공유"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                title="인쇄"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditManualModalOpen(selectedManual)}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                title="수정"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteManualId(selectedManual.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-white dark:bg-slate-800">
            <div className="max-w-3xl mx-auto space-y-6">
              {typeof selectedManual.content === 'string' ? (
                selectedManual.content ? (
                  <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {selectedManual.content}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    문서 내용이 없습니다.
                  </div>
                )
              ) : Array.isArray(selectedManual.content) && selectedManual.content.length > 0 ? (
                selectedManual.content.map((block: any, idx: number) => {
                  switch (block.type) {
                    case 'header':
                      return (
                        <h2
                          key={idx}
                          className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mt-6 mb-3"
                        >
                          {block.text}
                        </h2>
                      );
                    case 'text':
                      return (
                        <p key={idx} className="text-gray-600 leading-relaxed text-sm">
                          {block.text}
                        </p>
                      );
                    case 'bullet':
                      return (
                        <div key={idx} className="flex items-start text-sm text-gray-600 pl-2">
                          <span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-gray-400 rounded-full shrink-0"></span>
                          <span>{block.text}</span>
                        </div>
                      );
                    case 'check':
                      return (
                        <div
                          key={idx}
                          className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-100"
                        >
                          <div className="mt-0.5 mr-3 text-indigo-500">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <span className="text-sm text-gray-700 font-medium">{block.text}</span>
                        </div>
                      );
                    case 'alert':
                      return (
                        <div
                          key={idx}
                          className="flex items-start p-4 bg-red-50 rounded-lg border border-red-100 text-red-700 text-sm"
                        >
                          <AlertCircle className="w-4 h-4 mr-3 mt-0.5 shrink-0" />
                          {block.text}
                        </div>
                      );
                    case 'step':
                      return (
                        <div key={idx} className="flex items-center text-sm text-gray-600 pl-2">
                          <span className="mr-3 font-bold text-indigo-200 text-lg">{idx + 1}</span>
                          <span className="font-medium text-gray-800">{block.text}</span>
                        </div>
                      );
                    default:
                      return <div key={idx}>{block.text}</div>;
                  }
                })
              ) : (
                <div className="text-center py-12 text-gray-400">
                  문서 내용이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    const getCategoryLabel = (category: string) => {
      const cat = categories.find(c => c.id === category);
      return cat ? cat.label : category;
    };

    const getCategoryColor = (category: string) => {
      switch (category) {
        case 'Onboarding':
        case 'Planning':
          return 'bg-red-50 text-red-600';
        case 'Finance':
          return 'bg-blue-50 text-blue-600';
        case 'Tech':
        case 'Design':
          return 'bg-purple-50 text-purple-600';
        case 'Production':
        case 'HR':
          return 'bg-green-50 text-green-600';
        default:
          return 'bg-gray-100 text-gray-600';
      }
    };

    return (
      <div className="h-full flex gap-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 shadow-sm flex flex-col shrink-0 overflow-hidden">
          <div className="mb-4 px-2 pt-4">
            <h2 className="text-2xl font-black text-gray-900">지식 관리</h2>
            <p className="text-xs text-gray-500 font-medium">SOP & Wiki Library</p>
          </div>
          <div className="px-3 space-y-2 flex-1 overflow-y-auto">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all w-full ${
                    activeCategory === cat.id 
                    ? 'bg-gray-900 text-white shadow-lg' 
                    : 'bg-white dark:bg-slate-800 text-gray-500 hover:bg-gray-50 border border-gray-100'
                  }`}
                >
                  <Icon size={16} className={activeCategory === cat.id ? 'text-red-500' : 'text-gray-400'}/>
                  {cat.label}
                </button>
              )
            })}
          </div>
          <div className="mt-auto p-4 bg-red-50 rounded-2xl border border-red-100 mx-3 mb-3">
            <p className="text-xs font-bold text-red-600 mb-2">Notice</p>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              매뉴얼 업데이트 시<br/> 반드시 <b>팀장 승인</b> 후<br/> 게시 바랍니다.
            </p>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-500">카테고리:</span>
              <span className="text-sm font-black text-gray-900">{categories.find(c => c.id === activeCategory)?.label}</span>
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold ml-2">{filteredManuals.length}</span>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
                <input 
                  type="text" 
                  placeholder="매뉴얼 검색..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 rounded-lg text-xs font-medium w-64 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <button 
                onClick={() => setManualModalOpen(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
              >
                <Plus size={16}/> 매뉴얼 작성
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
            {filteredManuals.length > 0 ? (
              <div className="min-w-full inline-block align-middle">
                <div className="border-b border-gray-100">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <div className="col-span-6">Title</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-2">Author</div>
                    <div className="col-span-2 text-right">Updated</div>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {filteredManuals.map(manual => {
                    const contentPreview = typeof manual.content === 'string' 
                      ? manual.content.substring(0, 50)
                      : Array.isArray(manual.content) && manual.content.length > 0
                        ? manual.content[0]?.text || ''
                        : '';
                    return (
                      <div 
                        key={manual.id} 
                        onClick={() => setViewManualId(manual.id)}
                        className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-red-50/30 cursor-pointer transition-colors group"
                      >
                        <div className="col-span-6 flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-50 text-gray-400 group-hover:text-red-500 group-hover:bg-red-50 transition-colors">
                            <BookOpen size={16}/>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-800 group-hover:text-red-600 transition-colors">{manual.title}</h4>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{contentPreview}</p>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${getCategoryColor(manual.category)}`}>
                            {getCategoryLabel(manual.category)}
                          </span>
                        </div>
                        <div className="col-span-2 text-xs font-medium text-gray-600">
                          {manual.author_name || '-'}
                        </div>
                        <div className="col-span-2 text-right text-[10px] text-gray-400 font-mono">
                          {new Date(manual.updated_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <BookOpen size={48} className="opacity-20 mb-4"/>
                <p className="text-sm font-bold">등록된 매뉴얼이 없습니다.</p>
                <p className="text-xs">새로운 매뉴얼을 작성하여 지식을 공유하세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'projects':
        return <ProjectListView />;
      case 'artists':
        return <ArtistView />;
      case 'schedule':
        return <ScheduleView />;
      case 'equipment':
        return <EquipmentView />;
      case 'hr':
        return <StaffView />;
      case 'clients':
        return <ClientView />;
      case 'finance':
        return <FinanceView />;
      case 'tasks':
        return <TaskView />;
      case 'attendance':
        return <AttendanceManagementView />;
      case 'manuals':
        return <ManualView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-full bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl flex-shrink-0 z-20">
        <div className="p-6 flex items-center space-x-2 border-b border-slate-800 h-16">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="font-bold text-white">R</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">플로우메이커</h1>
        </div>

        {user?.profile?.bu_code === 'HEAD' && (
          <div className="px-3 pt-4 pb-2 border-b border-slate-800">
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-700"
            >
              <LayoutDashboard className="w-5 h-5 flex-shrink-0 mr-3" />
              <span className="text-sm font-medium whitespace-nowrap">통합 ERP로 이동</span>
            </button>
          </div>
        )}

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as FlowMakerView)}
              className={cn(
                'w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 group relative',
                activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 dark:text-slate-500 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0 mr-3" />
              <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto p-6 pt-0">
          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4">
            <p className="mb-1 text-[10px] uppercase tracking-tighter text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Signed in as
            </p>
            <p className="text-sm font-semibold text-blue-100">
              {user?.profile?.name || user?.email || '사용자'}
            </p>
            {user?.profile?.position && (
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{user.profile.position}</p>
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

      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
        <header className="bg-white dark:bg-slate-800 border-b border-gray-200 shadow-sm z-10">
          <div className="h-16 flex items-center justify-between px-4 lg:px-8">
            <div className="flex items-center">
              <h2 className="text-xl font-bold text-gray-800 capitalize hidden sm:block">
                {menuItems.find((m) => m.id === activeTab)?.label}
              </h2>
            </div>

            <div className="flex items-center space-x-4 lg:space-x-6">
              <div className="relative hidden sm:block">
                <Search className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
              </div>
              <div className="relative">
                <Bell className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 px-4 lg:px-8 py-3">
            <div className="flex flex-col gap-3">
              {/* Period type buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePeriodTypeChange('all')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                    periodType === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
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
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
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
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
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
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
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
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  )}
                >
                  직접선택
                </button>
              </div>

              {/* Conditional selection UI */}
              {periodType === 'year' && (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">연도:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">연도:</label>
                    <select
                      value={selectedQuarterYear}
                      onChange={(e) => setSelectedQuarterYear(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}년
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">분기:</label>
                    <select
                      value={selectedQuarter}
                      onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">월:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">시작일:</label>
                  <input
                    type="date"
                    value={customRange.start ?? ''}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-[11px]"
                  />
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">종료일:</label>
                  <input
                    type="date"
                    value={customRange.end ?? ''}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-[11px]"
                  />
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">{renderView()}</div>
        </main>
      </div>

      {/* Modals */}
      {isProjectModalOpen && (
        <ProjectModal
          defaultBu={bu}
          usersData={{ users: (usersData as any)?.users || [], currentUser: (usersData as any)?.currentUser || null }}
          partnerCompaniesData={clientsData}
          partnerWorkersData={[]}
          placeholders={{
            projectName: '예: 2025 싱글앨범 작업',
            category: '예: 음악제작, 작곡, 믹싱/마스터링',
            description: '음악/오디오 프로젝트 설명을 입력하세요',
          }}
          onClose={() => setProjectModalOpen(false)}
          onSubmit={async (data) => {
            try {
              await createProjectMutation.mutateAsync({
                ...frontendProjectToDb({
                  bu: data.bu,
                  name: data.name,
                  cat: data.cat,
                  startDate: data.startDate,
                  endDate: data.endDate,
                  status: data.status || '준비중',
                  description: data.description,
                  pm_id: data.pm_id,
                  partner_company_id: data.partner_company_id,
                  partner_worker_id: data.partner_worker_id,
                  participants: data.participants,
                }),
                client_id: data.partner_company_id,
              } as any);
              setProjectModalOpen(false);
            } catch (error) {
              console.error('Failed to create project:', error);
            }
          }}
        />
      )}
      {isEditProjectModalOpen && (
        <ProjectModal
          project={{
            id: isEditProjectModalOpen.id,
            bu: isEditProjectModalOpen.bu || bu,
            name: isEditProjectModalOpen.name,
            cat: isEditProjectModalOpen.cat,
            startDate: isEditProjectModalOpen.startDate,
            endDate: isEditProjectModalOpen.endDate,
            status: isEditProjectModalOpen.status,
            pm_id: isEditProjectModalOpen.pm_id,
            participants: isEditProjectModalOpen.participants,
          }}
          defaultBu={bu}
          usersData={{ users: (usersData as any)?.users || [], currentUser: (usersData as any)?.currentUser || null }}
          partnerCompaniesData={clientsData}
          partnerWorkersData={[]}
          placeholders={{
            projectName: '예: 2025 싱글앨범 작업',
            category: '예: 음악제작, 작곡, 믹싱/마스터링',
            description: '음악/오디오 프로젝트 설명을 입력하세요',
          }}
          onClose={() => setEditProjectModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await updateProjectMutation.mutateAsync({
                id: Number(isEditProjectModalOpen.id),
                data: {
                  ...frontendProjectToDb({
                    bu: data.bu,
                    name: data.name,
                    cat: data.cat,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    status: data.status || '준비중',
                    description: data.description,
                    pm_id: data.pm_id,
                    partner_company_id: data.partner_company_id,
                    partner_worker_id: data.partner_worker_id,
                    participants: data.participants,
                  }),
                  client_id: data.partner_company_id,
                } as any,
              });
              setEditProjectModalOpen(null);
            } catch (error) {
              console.error('Failed to update project:', error);
            }
          }}
        />
      )}
      {deleteProjectId && (
        <DeleteConfirmModal
          title="프로젝트 삭제"
          message="정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              await deleteProjectMutation.mutateAsync(deleteProjectId);
              setDeleteProjectId(null);
            } catch (error) {
              console.error('Failed to delete project:', error);
            }
          }}
          onCancel={() => setDeleteProjectId(null)}
        />
      )}
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
      {isEquipmentModalOpen && (
        <CreateEquipmentModal
          bu={bu}
          onClose={() => setEquipmentModalOpen(false)}
          onSubmit={async (data) => {
            try {
              await createEquipmentMutation.mutateAsync(data as any);
              setEquipmentModalOpen(false);
            } catch (error) {
              console.error('Failed to create equipment:', error);
            }
          }}
        />
      )}
      {isEditEquipmentModalOpen && (
        <EditEquipmentModal
          equipment={isEditEquipmentModalOpen}
          onClose={() => setEditEquipmentModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await updateEquipmentMutation.mutateAsync({
                id: isEditEquipmentModalOpen.id,
                data,
              });
              setEditEquipmentModalOpen(null);
            } catch (error) {
              console.error('Failed to update equipment:', error);
            }
          }}
        />
      )}
      {deleteEquipmentId && (
        <DeleteConfirmModal
          title="장비 삭제"
          message="정말로 이 장비를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              await deleteEquipmentMutation.mutateAsync(deleteEquipmentId);
              setDeleteEquipmentId(null);
            } catch (error) {
              console.error('Failed to delete equipment:', error);
            }
          }}
          onCancel={() => setDeleteEquipmentId(null)}
        />
      )}
      {isEventModalOpen && (
        <CreateEventModal
          bu={bu}
          projects={projects}
          onClose={() => setEventModalOpen(false)}
          onSubmit={async (data) => {
            try {
              await createEventMutation.mutateAsync(data as any);
              setEventModalOpen(false);
            } catch (error) {
              console.error('Failed to create event:', error);
            }
          }}
        />
      )}
      {isEditEventModalOpen && (
        <EditEventModal
          event={isEditEventModalOpen}
          projects={projects}
          onClose={() => setEditEventModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await updateEventMutation.mutateAsync({
                id: isEditEventModalOpen.id,
                data: data as any,
              });
              setEditEventModalOpen(null);
            } catch (error) {
              console.error('Failed to update event:', error);
            }
          }}
        />
      )}
      {deleteEventId && (
        <DeleteConfirmModal
          title="일정 삭제"
          message="정말로 이 일정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              await deleteEventMutation.mutateAsync(deleteEventId);
              setDeleteEventId(null);
            } catch (error) {
              console.error('Failed to delete event:', error);
            }
          }}
          onCancel={() => setDeleteEventId(null)}
        />
      )}
      {isTaskModalOpen && (
        <CreateTaskModal
          bu={bu}
          projects={projects}
          defaultProjectId={taskModalProjectId ? taskModalProjectId.toString() : undefined}
          onClose={() => {
            setTaskModalOpen(false);
            setTaskModalProjectId(null);
          }}
          onSubmit={async (data) => {
            try {
              await createTaskMutation.mutateAsync({
                ...frontendTaskToDb(data),
                priority: data.priority || 'medium',
                tag: data.tag,
              } as any);
              setTaskModalOpen(false);
              setTaskModalProjectId(null);
            } catch (error) {
              console.error('Failed to create task:', error);
            }
          }}
        />
      )}
      {isEditTaskModalOpen && (
        <EditTaskModal
          task={isEditTaskModalOpen}
          projects={projects}
          onClose={() => setEditTaskModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await updateTaskMutation.mutateAsync({
                id: Number(isEditTaskModalOpen.id),
                data: {
                  ...frontendTaskToDb(data),
                  priority: data.priority,
                  tag: data.tag,
                } as any,
              });
              setEditTaskModalOpen(null);
            } catch (error) {
              console.error('Failed to update task:', error);
            }
          }}
        />
      )}
      {deleteTaskId && (
        <DeleteConfirmModal
          title="업무 삭제"
          message="정말로 이 업무를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              await deleteTaskMutation.mutateAsync(deleteTaskId);
              setDeleteTaskId(null);
            } catch (error) {
              console.error('Failed to delete task:', error);
            }
          }}
          onCancel={() => setDeleteTaskId(null)}
        />
      )}
      {isFinanceModalOpen && (
        <CreateFinanceModal
          mode={isFinanceModalOpen.mode}
          projects={projects}
          defaultProjectId={isFinanceModalOpen.projectId ? String(isFinanceModalOpen.projectId) : undefined}
          onClose={() => setFinanceModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await createFinancialMutation.mutateAsync(frontendFinancialToDb(data));
              setFinanceModalOpen(null);
            } catch (error) {
              console.error('Failed to create financial entry:', error);
            }
          }}
        />
      )}
      {deleteFinanceId && (
        <DeleteConfirmModal
          title="재무 항목 삭제"
          message="정말로 이 재무 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              await deleteFinancialMutation.mutateAsync(deleteFinanceId);
              setDeleteFinanceId(null);
            } catch (error) {
              console.error('Failed to delete financial entry:', error);
            }
          }}
          onCancel={() => setDeleteFinanceId(null)}
        />
      )}
      {isEditFinanceModalOpen && (
        <EditFinanceModal
          entry={isEditFinanceModalOpen}
          projects={projects}
          onClose={() => setEditFinanceModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await updateFinancialMutation.mutateAsync({
                id: Number(isEditFinanceModalOpen.id),
                data: frontendFinancialToDb(data),
              });
              setEditFinanceModalOpen(null);
            } catch (error) {
              console.error('Failed to update financial entry:', error);
            }
          }}
        />
      )}
      {isArtistModalOpen && (
        <CreateArtistModal
          bu={bu}
          onClose={() => setArtistModalOpen(false)}
          onSubmit={async (data) => {
            try {
              await createArtistMutation.mutateAsync(data as any);
              setArtistModalOpen(false);
            } catch (error) {
              console.error('Failed to create artist:', error);
            }
          }}
        />
      )}
      {isEditArtistModalOpen && (
        <EditArtistModal
          artist={isEditArtistModalOpen}
          onClose={() => setEditArtistModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await updateArtistMutation.mutateAsync({
                id: isEditArtistModalOpen.id,
                data: data as any,
              });
              setEditArtistModalOpen(null);
            } catch (error) {
              console.error('Failed to update artist:', error);
            }
          }}
        />
      )}
      {deleteArtistId && (
        <DeleteConfirmModal
          title="아티스트 삭제"
          message="정말로 이 아티스트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              await deleteArtistMutation.mutateAsync(deleteArtistId);
              setDeleteArtistId(null);
            } catch (error) {
              console.error('Failed to delete artist:', error);
            }
          }}
          onCancel={() => setDeleteArtistId(null)}
        />
      )}
      {isManualModalOpen && (
        <CreateManualModal
          bu={bu}
          onClose={() => setManualModalOpen(false)}
          onSubmit={async (data) => {
            try {
              await createManualMutation.mutateAsync(data as any);
              setManualModalOpen(false);
            } catch (error) {
              console.error('Failed to create manual:', error);
            }
          }}
        />
      )}
      {isEditManualModalOpen && (
        <EditManualModal
          manual={isEditManualModalOpen}
          onClose={() => setEditManualModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await updateManualMutation.mutateAsync({
                id: isEditManualModalOpen.id,
                data: data as any,
              });
              setEditManualModalOpen(null);
            } catch (error) {
              console.error('Failed to update manual:', error);
            }
          }}
        />
      )}
      {deleteManualId && (
        <DeleteConfirmModal
          title="매뉴얼 삭제"
          message="정말로 이 매뉴얼을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              await deleteManualMutation.mutateAsync(deleteManualId);
              setDeleteManualId(null);
            } catch (error) {
              console.error('Failed to delete manual:', error);
            }
          }}
          onCancel={() => setDeleteManualId(null)}
        />
      )}
      {isStaffModalOpen && (
        <CreateStaffModal
          bu={bu}
          onClose={() => setStaffModalOpen(false)}
          onSubmit={async (data) => {
            try {
              await createExternalWorkerMutation.mutateAsync({
                bu_code: bu,
                name: data.name,
                company_name: data.company_name,
                worker_type: data.worker_type || 'freelancer',
                phone: data.phone,
                email: data.email,
                specialties: data.specialties || [],
                notes: data.notes,
                is_active: data.is_active !== undefined ? data.is_active : true,
              });
              setStaffModalOpen(false);
            } catch (error) {
              console.error('Failed to create staff:', error);
            }
          }}
        />
      )}
      {isEditStaffModalOpen && (
        <EditStaffModal
          staff={isEditStaffModalOpen}
          bu={bu}
          onClose={() => setEditStaffModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await updateExternalWorkerMutation.mutateAsync({
                id: isEditStaffModalOpen.id,
                data: {
                  bu_code: bu,
                  name: data.name,
                  company_name: data.company_name,
                  worker_type: data.worker_type,
                  phone: data.phone,
                  email: data.email,
                  specialties: data.specialties || [],
                  notes: data.notes,
                  is_active: data.is_active,
                },
              });
              setEditStaffModalOpen(null);
            } catch (error) {
              console.error('Failed to update staff:', error);
            }
          }}
        />
      )}
      {deleteStaffId && (
        <DeleteConfirmModal
          title="외주 인력 삭제"
          message="정말로 이 외주 인력을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              await deleteExternalWorkerMutation.mutateAsync(deleteStaffId);
              setDeleteStaffId(null);
            } catch (error) {
              console.error('Failed to delete staff:', error);
            }
          }}
          onCancel={() => setDeleteStaffId(null)}
        />
      )}
    </div>
  );
}

// Common Modal Components
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
    <div className="modal-container active fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
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
      <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded transition',
              value === ''
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
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
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30"
        />
      </label>
    );
  }

  if (type === 'textarea') {
    return (
      <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</span>
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30"
        />
      </label>
    );
  }

  return (
    <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30"
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
    <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
      <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
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
    <div className="flex items-center justify-end gap-2 pt-2">
      <button
        onClick={onClose}
        className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-900"
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
    <div className="modal-container active fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{title}</h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-900"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

// Project Modals
function CreateProjectModal({
  bu,
  clients,
  onClose,
  onSubmit,
  onOpenClientModal,
  onOpenEditClientModal,
  onDeleteClient,
}: {
  bu: BU;
  clients: Client[];
  onClose: () => void;
  onSubmit: (data: {
    bu: BU;
    name: string;
    cat: string;
    startDate: string;
    endDate: string;
    status: string;
    client_id?: number;
  }) => void;
  onOpenClientModal: () => void;
  onOpenEditClientModal: (client: Client) => void;
  onDeleteClient: (clientId: number) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    cat: '',
    startDate: '',
    endDate: '',
    status: '준비중',
    client_id: '',
  });

  const selectedClient = form.client_id ? clients.find((c) => c.id === Number(form.client_id)) : null;

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
        <div className="md:col-span-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <SelectField
                label="클라이언트"
                value={form.client_id}
                onChange={(val) => setForm((prev) => ({ ...prev, client_id: val }))}
                options={[
                  { value: '', label: '선택 안함' },
                  ...clients.map((c) => ({ value: String(c.id), label: c.company_name_ko })),
                ]}
              />
            </div>
            <div className="flex gap-2 pb-0.5">
              <button
                type="button"
                onClick={onOpenClientModal}
                className="px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                새로 만들기
              </button>
              {selectedClient && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenEditClientModal(selectedClient)}
                    className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteClient(selectedClient.id)}
                    className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>
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
          })
        }
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

function EditProjectModal({
  project,
  bu,
  clients,
  onClose,
  onSubmit,
  onOpenClientModal,
  onOpenEditClientModal,
  onDeleteClient,
}: {
  project: any;
  bu: BU;
  clients: Client[];
  onClose: () => void;
  onSubmit: (data: {
    bu: BU;
    name: string;
    cat: string;
    startDate: string;
    endDate: string;
    status: string;
    client_id?: number;
  }) => void;
  onOpenClientModal: () => void;
  onOpenEditClientModal: (client: Client) => void;
  onDeleteClient: (clientId: number) => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    cat: project.cat,
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
    client_id: String((project as any).client_id || ''),
  });

  const selectedClient = form.client_id ? clients.find((c) => c.id === Number(form.client_id)) : null;

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
        <div className="md:col-span-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <SelectField
                label="클라이언트"
                value={form.client_id}
                onChange={(val) => setForm((prev) => ({ ...prev, client_id: val }))}
                options={[
                  { value: '', label: '선택 안함' },
                  ...clients.map((c) => ({ value: String(c.id), label: c.company_name_ko })),
                ]}
              />
            </div>
            <div className="flex gap-2 pb-0.5">
              <button
                type="button"
                onClick={onOpenClientModal}
                className="px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                새로 만들기
              </button>
              {selectedClient && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenEditClientModal(selectedClient)}
                    className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteClient(selectedClient.id)}
                    className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>
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
          })
        }
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}

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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={handleSubmit}
        onClose={onClose}
        primaryLabel="등록"
      />
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={handleSubmit}
        onClose={onClose}
        primaryLabel="수정"
      />
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={handleSubmit}
        onClose={onClose}
        primaryLabel="등록"
      />
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={handleSubmit}
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}

// Equipment Modals
function CreateEquipmentModal({
  bu,
  onClose,
  onSubmit,
}: {
  bu: BU;
  onClose: () => void;
  onSubmit: (data: Partial<Equipment>) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    category: '',
    serial_number: '',
    status: 'available' as 'available' | 'rented' | 'maintenance' | 'lost',
    location: '',
    notes: '',
  });

  return (
    <ModalShell title="장비 등록" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="장비명"
          placeholder="장비 이름"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="분류"
          placeholder="예: 카메라, 조명"
          value={form.category}
          onChange={(v) => setForm((prev) => ({ ...prev, category: v }))}
        />
        <InputField
          label="시리얼 넘버"
          placeholder="시리얼 번호"
          value={form.serial_number}
          onChange={(v) => setForm((prev) => ({ ...prev, serial_number: v }))}
        />
        <InputField
          label="현재 위치"
          placeholder="위치"
          value={form.location}
          onChange={(v) => setForm((prev) => ({ ...prev, location: v }))}
        />
        <SelectField
          label="상태"
          value={form.status}
          onChange={(val) => setForm((prev) => ({ ...prev, status: val as any }))}
          options={[
            { value: 'available', label: '가용' },
            { value: 'rented', label: '대여 중' },
            { value: 'maintenance', label: '수리 중' },
            { value: 'lost', label: '분실' },
          ]}
        />
        <InputField
          label="메모"
          type="textarea"
          placeholder="추가 정보"
          value={form.notes}
          onChange={(v) => setForm((prev) => ({ ...prev, notes: v }))}
        />
      </div>
      <ModalActions
        onPrimary={() => onSubmit({ ...form, bu_code: bu } as any)}
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

function EditEquipmentModal({
  equipment,
  onClose,
  onSubmit,
}: {
  equipment: Equipment;
  onClose: () => void;
  onSubmit: (data: Partial<Equipment>) => void;
}) {
  const [form, setForm] = useState({
    name: equipment.name,
    category: equipment.category,
    serial_number: equipment.serial_number || '',
    status: equipment.status,
    location: equipment.location || '',
    borrower_name: equipment.borrower_name || '',
    return_date: equipment.return_date || '',
    notes: equipment.notes || '',
  });

  return (
    <ModalShell title="장비 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="장비명"
          placeholder="장비 이름"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="분류"
          placeholder="예: 카메라, 조명"
          value={form.category}
          onChange={(v) => setForm((prev) => ({ ...prev, category: v }))}
        />
        <InputField
          label="시리얼 넘버"
          placeholder="시리얼 번호"
          value={form.serial_number}
          onChange={(v) => setForm((prev) => ({ ...prev, serial_number: v }))}
        />
        <InputField
          label="현재 위치"
          placeholder="위치"
          value={form.location}
          onChange={(v) => setForm((prev) => ({ ...prev, location: v }))}
        />
        <SelectField
          label="상태"
          value={form.status}
          onChange={(val) => setForm((prev) => ({ ...prev, status: val as any }))}
          options={[
            { value: 'available', label: '가용' },
            { value: 'rented', label: '대여 중' },
            { value: 'maintenance', label: '수리 중' },
            { value: 'lost', label: '분실' },
          ]}
        />
        <InputField
          label="대여자 이름"
          placeholder="대여자 이름"
          value={form.borrower_name}
          onChange={(v) => setForm((prev) => ({ ...prev, borrower_name: v }))}
        />
        <InputField
          label="반납 예정일"
          type="date"
          value={form.return_date}
          onChange={(v) => setForm((prev) => ({ ...prev, return_date: v }))}
        />
        <InputField
          label="메모"
          type="textarea"
          placeholder="추가 정보"
          value={form.notes}
          onChange={(v) => setForm((prev) => ({ ...prev, notes: v }))}
        />
      </div>
      <ModalActions onPrimary={() => onSubmit(form as any)} onClose={onClose} primaryLabel="수정" />
    </ModalShell>
  );
}

// Event Modals
function CreateEventModal({
  bu,
  projects,
  onClose,
  onSubmit,
}: {
  bu: BU;
  projects: any[];
  onClose: () => void;
  onSubmit: (data: Partial<Event>) => void;
}) {
  const [form, setForm] = useState({
    title: '',
    event_date: '',
    event_type: 'event' as any,
    description: '',
    project_id: '',
  });

  return (
    <ModalShell title="일정 등록" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3">
        <InputField
          label="일정 제목"
          placeholder="일정 제목"
          value={form.title}
          onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <InputField
            label="날짜"
            type="date"
            value={form.event_date}
            onChange={(v) => setForm((prev) => ({ ...prev, event_date: v }))}
          />
          <SelectField
            label="유형"
            value={form.event_type}
            onChange={(val) => setForm((prev) => ({ ...prev, event_type: val as any }))}
            options={[
              { value: 'meeting', label: '미팅' },
              { value: 'shoot', label: '촬영' },
              { value: 'deadline', label: '마감' },
              { value: 'holiday', label: '휴일' },
              { value: 'event', label: '이벤트' },
            ]}
          />
        </div>
        <SelectField
          label="관련 프로젝트"
          value={form.project_id}
          onChange={(val) => setForm((prev) => ({ ...prev, project_id: val }))}
          options={[
            { value: '', label: '선택 안함' },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        <InputField
          label="설명"
          type="textarea"
          placeholder="일정 설명"
          value={form.description}
          onChange={(v) => setForm((prev) => ({ ...prev, description: v }))}
        />
      </div>
      <ModalActions
        onPrimary={() =>
          onSubmit({
            ...form,
            bu_code: bu,
            project_id: form.project_id ? Number(form.project_id) : undefined,
          })
        }
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

function EditEventModal({
  event,
  projects,
  onClose,
  onSubmit,
}: {
  event: Event;
  projects: any[];
  onClose: () => void;
  onSubmit: (data: Partial<Event>) => void;
}) {
  const [form, setForm] = useState({
    title: event.title,
    event_date: event.event_date,
    event_type: event.event_type,
    description: event.description || '',
    project_id: String(event.project_id || ''),
  });

  return (
    <ModalShell title="일정 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3">
        <InputField
          label="일정 제목"
          placeholder="일정 제목"
          value={form.title}
          onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <InputField
            label="날짜"
            type="date"
            value={form.event_date}
            onChange={(v) => setForm((prev) => ({ ...prev, event_date: v }))}
          />
          <SelectField
            label="유형"
            value={form.event_type}
            onChange={(val) => setForm((prev) => ({ ...prev, event_type: val as any }))}
            options={[
              { value: 'meeting', label: '미팅' },
              { value: 'shoot', label: '촬영' },
              { value: 'deadline', label: '마감' },
              { value: 'holiday', label: '휴일' },
              { value: 'event', label: '이벤트' },
            ]}
          />
        </div>
        <SelectField
          label="관련 프로젝트"
          value={form.project_id}
          onChange={(val) => setForm((prev) => ({ ...prev, project_id: val }))}
          options={[
            { value: '', label: '선택 안함' },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        <InputField
          label="설명"
          type="textarea"
          placeholder="일정 설명"
          value={form.description}
          onChange={(v) => setForm((prev) => ({ ...prev, description: v }))}
        />
      </div>
      <ModalActions
        onPrimary={() =>
          onSubmit({
            ...form,
            project_id: form.project_id ? Number(form.project_id) : undefined,
          })
        }
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}

// Task Modals
function CreateTaskModal({
  bu,
  projects,
  defaultProjectId,
  onClose,
  onSubmit,
}: {
  bu: BU;
  projects: any[];
  defaultProjectId?: string;
  onClose: () => void;
  onSubmit: (data: {
    projectId: string;
    bu: BU;
    title: string;
    assignee: string;
    dueDate: string;
    status: 'todo' | 'in-progress' | 'done';
    priority?: 'high' | 'medium' | 'low';
    tag?: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    projectId: defaultProjectId || projects[0]?.id || '',
    title: '',
    assignee: '',
    dueDate: '',
    status: 'todo' as 'todo' | 'in-progress' | 'done',
    priority: 'medium' as 'high' | 'medium' | 'low',
    tag: '',
  });

  return (
    <ModalShell title="업무 등록" onClose={onClose}>
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
              { value: 'todo', label: 'To Do' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'done', label: 'Done' },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="우선순위"
            value={form.priority}
            onChange={(val) => setForm((prev) => ({ ...prev, priority: val as any }))}
            options={[
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />
          <InputField
            label="태그"
            placeholder="태그"
            value={form.tag}
            onChange={(v) => setForm((prev) => ({ ...prev, tag: v }))}
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
            status: form.status,
            priority: form.priority,
            tag: form.tag,
          })
        }
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

function EditTaskModal({
  task,
  projects,
  onClose,
  onSubmit,
}: {
  task: any;
  projects: any[];
  onClose: () => void;
  onSubmit: (data: {
    projectId: string;
    bu: BU;
    title: string;
    assignee: string;
    dueDate: string;
    status: 'todo' | 'in-progress' | 'done';
    priority?: 'high' | 'medium' | 'low';
    tag?: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    projectId: task.projectId,
    title: task.title,
    assignee: task.assignee || '',
    dueDate: task.dueDate,
    status: task.status,
    priority: (task as any).priority || 'medium',
    tag: (task as any).tag || '',
  });

  return (
    <ModalShell title="업무 수정" onClose={onClose}>
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
              { value: 'todo', label: 'To Do' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'done', label: 'Done' },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="우선순위"
            value={form.priority}
            onChange={(val) => setForm((prev) => ({ ...prev, priority: val as any }))}
            options={[
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />
          <InputField
            label="태그"
            placeholder="태그"
            value={form.tag}
            onChange={(v) => setForm((prev) => ({ ...prev, tag: v }))}
          />
        </div>
      </div>
      <ModalActions
        onPrimary={() =>
          onSubmit({
            projectId: form.projectId,
            bu: task.bu,
            title: form.title,
            assignee: form.assignee,
            dueDate: form.dueDate,
            status: form.status,
            priority: form.priority,
            tag: form.tag,
          })
        }
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}

// Finance Modals
function CreateFinanceModal({
  mode,
  projects,
  defaultProjectId,
  onClose,
  onSubmit,
}: {
  mode: 'revenue' | 'expense';
  projects: any[];
  defaultProjectId?: string;
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
}) {
  const [form, setForm] = useState({
    projectId: defaultProjectId || projects[0]?.id || '',
    category: '',
    name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'planned' as 'planned' | 'paid' | 'canceled',
  });

  return (
    <ModalShell title={mode === 'revenue' ? '매출 등록' : '지출 등록'} onClose={onClose}>
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
            type: mode,
            category: form.category,
            name: form.name,
            amount: Number(form.amount),
            date: form.date,
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
  projects,
  onClose,
  onSubmit,
}: {
  entry: any;
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
}) {
  const [form, setForm] = useState({
    projectId: entry.projectId,
    category: entry.category,
    name: entry.name,
    amount: String(entry.amount),
    date: entry.date,
    status: entry.status,
  });

  return (
    <ModalShell title="재무 항목 수정" onClose={onClose}>
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
            type: entry.type,
            category: form.category,
            name: form.name,
            amount: Number(form.amount),
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

// Channel Modals
function CreateChannelModal({
  bu,
  orgMembers,
  onClose,
  onSubmit,
}: {
  bu: BU;
  orgMembers: any[];
  onClose: () => void;
  onSubmit: (data: Partial<Channel>) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    url: '',
    subscribers_count: '',
    total_views: '',
    status: 'active' as 'active' | 'growing' | 'inactive' | 'archived',
    manager_name: '',
    next_upload_date: '',
    upload_days: [] as string[],
  });

  const weekDays = [
    { value: 'monday', label: '월' },
    { value: 'tuesday', label: '화' },
    { value: 'wednesday', label: '수' },
    { value: 'thursday', label: '목' },
    { value: 'friday', label: '금' },
    { value: 'saturday', label: '토' },
    { value: 'sunday', label: '일' },
  ];

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      upload_days: prev.upload_days.includes(day)
        ? prev.upload_days.filter((d) => d !== day)
        : [...prev.upload_days, day],
    }));
  };

  return (
    <ModalShell title="채널 등록" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="채널명"
          placeholder="채널 이름"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="URL"
          placeholder="https://youtube.com/..."
          value={form.url}
          onChange={(v) => setForm((prev) => ({ ...prev, url: v }))}
        />
        <InputField
          label="구독자 수"
          placeholder="예: 58K"
          value={form.subscribers_count}
          onChange={(v) => setForm((prev) => ({ ...prev, subscribers_count: v }))}
        />
        <InputField
          label="총 조회수"
          placeholder="예: 1.2M"
          value={form.total_views}
          onChange={(v) => setForm((prev) => ({ ...prev, total_views: v }))}
        />
        <SelectField
          label="상태"
          value={form.status}
          onChange={(val) => setForm((prev) => ({ ...prev, status: val as any }))}
          options={[
            { value: 'active', label: '활성' },
            { value: 'growing', label: '성장 중' },
            { value: 'inactive', label: '비활성' },
            { value: 'archived', label: '보관됨' },
          ]}
        />
        <InputField
          label="담당자 이름"
          placeholder="담당자 이름"
          value={form.manager_name}
          onChange={(v) => setForm((prev) => ({ ...prev, manager_name: v }))}
        />
        <InputField
          label="다음 업로드일"
          type="date"
          value={form.next_upload_date}
          onChange={(v) => setForm((prev) => ({ ...prev, next_upload_date: v }))}
        />
        <div className="md:col-span-2">
          <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">업로드 구좌 (요일 선택)</label>
          <div className="flex flex-wrap gap-2">
            {weekDays.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  form.upload_days.includes(day.value)
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
          {form.upload_days.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              선택된 요일: 매주 {form.upload_days.map((d) => weekDays.find((wd) => wd.value === d)?.label).join(', ')} 업로드
            </p>
          )}
        </div>
      </div>
      <ModalActions
        onPrimary={() => onSubmit({ ...form, bu_code: bu, upload_days: form.upload_days.length > 0 ? form.upload_days : undefined })}
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

function EditChannelModal({
  channel,
  orgMembers,
  onClose,
  onSubmit,
}: {
  channel: Channel;
  orgMembers: any[];
  onClose: () => void;
  onSubmit: (data: Partial<Channel>) => void;
}) {
  const [form, setForm] = useState({
    name: channel.name,
    url: channel.url || '',
    subscribers_count: channel.subscribers_count || '',
    total_views: channel.total_views || '',
    status: channel.status,
    manager_name: channel.manager_name || '',
    next_upload_date: channel.next_upload_date || '',
    upload_days: (channel.upload_days || []) as string[],
  });

  const weekDays = [
    { value: 'monday', label: '월' },
    { value: 'tuesday', label: '화' },
    { value: 'wednesday', label: '수' },
    { value: 'thursday', label: '목' },
    { value: 'friday', label: '금' },
    { value: 'saturday', label: '토' },
    { value: 'sunday', label: '일' },
  ];

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      upload_days: prev.upload_days.includes(day)
        ? prev.upload_days.filter((d) => d !== day)
        : [...prev.upload_days, day],
    }));
  };

  return (
    <ModalShell title="채널 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="채널명"
          placeholder="채널 이름"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="URL"
          placeholder="https://youtube.com/..."
          value={form.url}
          onChange={(v) => setForm((prev) => ({ ...prev, url: v }))}
        />
        <InputField
          label="구독자 수"
          placeholder="예: 58K"
          value={form.subscribers_count}
          onChange={(v) => setForm((prev) => ({ ...prev, subscribers_count: v }))}
        />
        <InputField
          label="총 조회수"
          placeholder="예: 1.2M"
          value={form.total_views}
          onChange={(v) => setForm((prev) => ({ ...prev, total_views: v }))}
        />
        <SelectField
          label="상태"
          value={form.status}
          onChange={(val) => setForm((prev) => ({ ...prev, status: val as any }))}
          options={[
            { value: 'active', label: '활성' },
            { value: 'growing', label: '성장 중' },
            { value: 'inactive', label: '비활성' },
            { value: 'archived', label: '보관됨' },
          ]}
        />
        <InputField
          label="담당자 이름"
          placeholder="담당자 이름"
          value={form.manager_name}
          onChange={(v) => setForm((prev) => ({ ...prev, manager_name: v }))}
        />
        <InputField
          label="다음 업로드일"
          type="date"
          value={form.next_upload_date}
          onChange={(v) => setForm((prev) => ({ ...prev, next_upload_date: v }))}
        />
        <div className="md:col-span-2">
          <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">업로드 구좌 (요일 선택)</label>
          <div className="flex flex-wrap gap-2">
            {weekDays.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  form.upload_days.includes(day.value)
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
          {form.upload_days.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              선택된 요일: 매주 {form.upload_days.map((d) => weekDays.find((wd) => wd.value === d)?.label).join(', ')} 업로드
            </p>
          )}
        </div>
      </div>
      <ModalActions onPrimary={() => onSubmit({ ...form, upload_days: form.upload_days.length > 0 ? form.upload_days : undefined } as any)} onClose={onClose} primaryLabel="수정" />
    </ModalShell>
  );
}

// Channel Content Modals
function CreateChannelContentModal({
  channelId,
  orgMembers,
  onClose,
  onSubmit,
}: {
  channelId: number;
  orgMembers: any[];
  onClose: () => void;
  onSubmit: (data: Partial<ChannelContent>) => void;
}) {
  const [form, setForm] = useState({
    title: '',
    stage: 'planning' as any,
    assignee_name: '',
    upload_date: '',
  });

  return (
    <ModalShell title="콘텐츠 등록" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3">
        <InputField
          label="콘텐츠 제목"
          placeholder="콘텐츠 제목"
          value={form.title}
          onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="단계"
            value={form.stage}
            onChange={(val) => setForm((prev) => ({ ...prev, stage: val as any }))}
            options={[
              { value: 'planning', label: '기획' },
              { value: 'shooting', label: '촬영' },
              { value: 'editing', label: '편집' },
              { value: 'uploaded', label: '업로드 완료' },
            ]}
          />
          <InputField
            label="업로드 예정일"
            type="date"
            value={form.upload_date}
            onChange={(v) => setForm((prev) => ({ ...prev, upload_date: v }))}
          />
        </div>
        <InputField
          label="담당자 이름"
          placeholder="담당자 이름"
          value={form.assignee_name}
          onChange={(v) => setForm((prev) => ({ ...prev, assignee_name: v }))}
        />
      </div>
      <ModalActions
        onPrimary={() => onSubmit({ ...form, channel_id: channelId })}
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

function EditChannelContentModal({
  content,
  orgMembers,
  onClose,
  onSubmit,
}: {
  content: ChannelContent;
  orgMembers: any[];
  onClose: () => void;
  onSubmit: (data: Partial<ChannelContent>) => void;
}) {
  const [form, setForm] = useState({
    title: content.title,
    stage: content.stage,
    assignee_name: content.assignee_name || '',
    upload_date: content.upload_date,
  });

  return (
    <ModalShell title="콘텐츠 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3">
        <InputField
          label="콘텐츠 제목"
          placeholder="콘텐츠 제목"
          value={form.title}
          onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="단계"
            value={form.stage}
            onChange={(val) => setForm((prev) => ({ ...prev, stage: val as any }))}
            options={[
              { value: 'planning', label: '기획' },
              { value: 'shooting', label: '촬영' },
              { value: 'editing', label: '편집' },
              { value: 'uploaded', label: '업로드 완료' },
            ]}
          />
          <InputField
            label="업로드 예정일"
            type="date"
            value={form.upload_date}
            onChange={(v) => setForm((prev) => ({ ...prev, upload_date: v }))}
          />
        </div>
        <InputField
          label="담당자 이름"
          placeholder="담당자 이름"
          value={form.assignee_name}
          onChange={(v) => setForm((prev) => ({ ...prev, assignee_name: v }))}
        />
      </div>
      <ModalActions onPrimary={() => onSubmit(form as any)} onClose={onClose} primaryLabel="수정" />
    </ModalShell>
  );
}

function ChannelDetailModal({
  channel,
  onClose,
}: {
  channel: Channel;
  onClose: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const dayLabels: Record<string, string> = {
    monday: '월',
    tuesday: '화',
    wednesday: '수',
    thursday: '목',
    friday: '금',
    saturday: '토',
    sunday: '일',
  };

  const dayToNumber: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  };

  const monthStart = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );
  const monthEnd = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  );
  const daysInMonth = monthEnd.getDate();
  const startDay = monthStart.getDay();

  const getUploadDaysForMonth = () => {
    if (!channel.upload_days || channel.upload_days.length === 0) return [];
    
    const uploadDays: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dayOfWeek = date.getDay();
      
      const isUploadDay = channel.upload_days?.some((uploadDay) => {
        return dayToNumber[uploadDay] === dayOfWeek;
      });
      
      if (isUploadDay) {
        uploadDays.push(day);
      }
    }
    return uploadDays;
  };

  const uploadDays = getUploadDaysForMonth();

  return (
    <ModalShell title={`${channel.name} 상세보기`} onClose={onClose}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">채널명</p>
            <p className="text-sm font-bold text-gray-900">{channel.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">제작사</p>
            <p className="text-sm text-gray-900">{channel.production_company || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">구독자 수</p>
            <p className="text-sm text-gray-900">{channel.subscribers_count || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">담당자</p>
            <p className="text-sm text-gray-900">{channel.manager_name || '-'}</p>
          </div>
          {channel.upload_days && channel.upload_days.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-gray-500 mb-2">업로드 구좌</p>
              <div className="flex flex-wrap gap-1.5">
                {channel.upload_days.map((day) => (
                  <span
                    key={day}
                    className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium"
                  >
                    {dayLabels[day] || day}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                  )
                }
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                  )
                }
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 p-4">
            <div className="grid grid-cols-7 mb-2 border-b border-gray-200 pb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    'text-center text-sm font-semibold',
                    i === 0 ? 'text-red-500' : 'text-gray-500'
                  )}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-gray-50/50 rounded-lg h-12"></div>
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const isUploadDay = uploadDays.includes(day);
                const isToday =
                  day === new Date().getDate() &&
                  currentMonth.getMonth() === new Date().getMonth() &&
                  currentMonth.getFullYear() === new Date().getFullYear();

                return (
                  <div
                    key={day}
                    className={cn(
                      'border border-gray-100 rounded-lg p-2 min-h-[48px] flex flex-col items-center justify-center relative',
                      isUploadDay && 'bg-blue-50 border-blue-200',
                      isToday && 'ring-2 ring-indigo-500'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        isToday
                          ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                          : isUploadDay
                            ? 'text-blue-700'
                            : 'text-gray-700'
                      )}
                    >
                      {day}
                    </span>
                    {isUploadDay && (
                      <span className="absolute bottom-1 text-[8px] text-blue-600 font-medium">
                        업로드
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// Manual Modals
function CreateManualModal({
  bu,
  onClose,
  onSubmit,
}: {
  bu: BU;
  onClose: () => void;
  onSubmit: (data: Partial<Manual>) => void;
}) {
  const [form, setForm] = useState({
    title: '',
    category: 'Onboarding',
    content: '',
  });
  const [authorId, setAuthorId] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('');

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setAuthorId(user.id);
        
        const { data: appUser } = await supabase
          .from('app_users')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (appUser?.name) {
          setAuthorName(appUser.name);
        }
      }
    };

    fetchUser();
  }, []);

  return (
    <ModalShell title="매뉴얼 등록" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3">
        <InputField
          label="제목"
          placeholder="매뉴얼 제목"
          value={form.title}
          onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
        />
        <SelectField
          label="카테고리"
          value={form.category}
          onChange={(val) => setForm((prev) => ({ ...prev, category: val }))}
          options={[
            { value: 'Onboarding', label: '온보딩' },
            { value: 'Tech', label: '장비' },
            { value: 'Production', label: '제작' },
            { value: 'Admin', label: '행정' },
          ]}
        />
        <InputField
          label="내용"
          type="textarea"
          placeholder="매뉴얼 내용을 입력하세요"
          value={form.content}
          onChange={(v) => setForm((prev) => ({ ...prev, content: v }))}
        />
      </div>
      <ModalActions
        onPrimary={() => onSubmit({ 
          ...form, 
          bu_code: bu, 
          content: form.content,
          author_id: authorId,
          author_name: authorName,
        })}
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

function EditManualModal({
  manual,
  onClose,
  onSubmit,
}: {
  manual: Manual;
  onClose: () => void;
  onSubmit: (data: Partial<Manual>) => void;
}) {
  const [form, setForm] = useState({
    title: manual.title,
    category: manual.category,
    content: typeof manual.content === 'string' 
      ? manual.content 
      : Array.isArray(manual.content) 
        ? JSON.stringify(manual.content, null, 2)
        : String(manual.content || ''),
  });

  return (
    <ModalShell title="매뉴얼 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3">
        <InputField
          label="제목"
          placeholder="매뉴얼 제목"
          value={form.title}
          onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
        />
        <SelectField
          label="카테고리"
          value={form.category}
          onChange={(val) => setForm((prev) => ({ ...prev, category: val }))}
          options={[
            { value: 'Onboarding', label: '온보딩' },
            { value: 'Tech', label: '장비' },
            { value: 'Production', label: '제작' },
            { value: 'Admin', label: '행정' },
          ]}
        />
        <InputField
          label="내용"
          type="textarea"
          placeholder="매뉴얼 내용을 입력하세요"
          value={form.content}
          onChange={(v) => setForm((prev) => ({ ...prev, content: v }))}
        />
      </div>
      <ModalActions
        onPrimary={() => onSubmit({ ...form, content: form.content })}
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}

// Staff Modal
function CreateStaffModal({
  bu,
  onClose,
  onSubmit,
}: {
  bu: BU;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    company_name?: string;
    worker_type?: 'freelancer' | 'company' | 'contractor';
    phone?: string;
    email?: string;
    specialties?: string[];
    notes?: string;
    is_active?: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    company_name: '',
    worker_type: 'freelancer' as 'freelancer' | 'company' | 'contractor',
    phone: '',
    email: '',
    specialties: [] as string[],
    specialtyInput: '',
    notes: '',
    is_active: true,
  });
  const [error, setError] = useState<string>('');

  const handleAddSpecialty = () => {
    if (form.specialtyInput.trim()) {
      setForm((prev) => ({
        ...prev,
        specialties: [...prev.specialties, prev.specialtyInput.trim()],
        specialtyInput: '',
      }));
    }
  };

  const handleRemoveSpecialty = (index: number) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index),
    }));
  };

  return (
    <ModalShell title="외주 인력 등록" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="이름"
          placeholder="이름을 입력하세요"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <SelectField
          label="인력 타입"
          value={form.worker_type}
          onChange={(val) =>
            setForm((prev) => ({ ...prev, worker_type: val as typeof form.worker_type }))
          }
          options={[
            { value: 'freelancer', label: '프리랜서' },
            { value: 'company', label: '외주회사' },
            { value: 'contractor', label: '계약직' },
          ]}
        />
        {form.worker_type === 'company' && (
          <InputField
            label="회사명"
            placeholder="외주회사명을 입력하세요"
            value={form.company_name}
            onChange={(v) => setForm((prev) => ({ ...prev, company_name: v }))}
          />
        )}
        <InputField
          label="연락처"
          placeholder="전화번호를 입력하세요"
          value={form.phone}
          onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
        />
        <InputField
          label="이메일주소"
          type="email"
          placeholder="이메일을 입력하세요"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">전문 분야</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="전문 분야를 입력하고 추가 버튼을 클릭하세요"
              value={form.specialtyInput}
              onChange={(e) => setForm((prev) => ({ ...prev, specialtyInput: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSpecialty();
                }
              }}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddSpecialty}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              추가
            </button>
          </div>
          {form.specialties.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {form.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700"
                >
                  {specialty}
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecialty(index)}
                    className="text-blue-700 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">비고</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            rows={3}
            placeholder="추가 정보를 입력하세요"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>
        <SelectField
          label="활성화 여부"
          value={form.is_active ? 'true' : 'false'}
          onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'true' }))}
          options={[
            { value: 'true', label: '활성' },
            { value: 'false', label: '비활성' },
          ]}
        />
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={() => {
          const missingFields: string[] = [];
          if (!form.name) missingFields.push('이름');

          if (missingFields.length > 0) {
            setError(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
            return;
          }

          setError('');
          onSubmit({
            name: form.name,
            company_name: form.company_name || undefined,
            worker_type: form.worker_type,
            phone: form.phone || undefined,
            email: form.email || undefined,
            specialties: form.specialties.length > 0 ? form.specialties : undefined,
            notes: form.notes || undefined,
            is_active: form.is_active,
          });
        }}
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

function EditStaffModal({
  staff,
  bu,
  onClose,
  onSubmit,
}: {
  staff: any;
  bu: BU;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    company_name?: string;
    worker_type?: 'freelancer' | 'company' | 'contractor';
    phone?: string;
    email?: string;
    specialties?: string[];
    notes?: string;
    is_active?: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    name: staff.name || '',
    company_name: staff.company_name || '',
    worker_type: (staff.worker_type || 'freelancer') as 'freelancer' | 'company' | 'contractor',
    phone: staff.phone || '',
    email: staff.email || '',
    specialties: (staff.specialties || []) as string[],
    specialtyInput: '',
    notes: staff.notes || '',
    is_active: staff.is_active !== undefined ? staff.is_active : true,
  });
  const [error, setError] = useState<string>('');

  const handleAddSpecialty = () => {
    if (form.specialtyInput.trim()) {
      setForm((prev) => ({
        ...prev,
        specialties: [...prev.specialties, prev.specialtyInput.trim()],
        specialtyInput: '',
      }));
    }
  };

  const handleRemoveSpecialty = (index: number) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index),
    }));
  };

  return (
    <ModalShell title="외주 인력 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="이름"
          placeholder="이름을 입력하세요"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <SelectField
          label="인력 타입"
          value={form.worker_type}
          onChange={(val) =>
            setForm((prev) => ({ ...prev, worker_type: val as typeof form.worker_type }))
          }
          options={[
            { value: 'freelancer', label: '프리랜서' },
            { value: 'company', label: '외주회사' },
            { value: 'contractor', label: '계약직' },
          ]}
        />
        {form.worker_type === 'company' && (
          <InputField
            label="회사명"
            placeholder="외주회사명을 입력하세요"
            value={form.company_name}
            onChange={(v) => setForm((prev) => ({ ...prev, company_name: v }))}
          />
        )}
        <InputField
          label="연락처"
          placeholder="전화번호를 입력하세요"
          value={form.phone}
          onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
        />
        <InputField
          label="이메일주소"
          type="email"
          placeholder="이메일을 입력하세요"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">전문 분야</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="전문 분야를 입력하고 추가 버튼을 클릭하세요"
              value={form.specialtyInput}
              onChange={(e) => setForm((prev) => ({ ...prev, specialtyInput: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSpecialty();
                }
              }}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddSpecialty}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              추가
            </button>
          </div>
          {form.specialties.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {form.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700"
                >
                  {specialty}
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecialty(index)}
                    className="text-blue-700 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">비고</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            rows={3}
            placeholder="추가 정보를 입력하세요"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>
        <SelectField
          label="활성화 여부"
          value={form.is_active ? 'true' : 'false'}
          onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'true' }))}
          options={[
            { value: 'true', label: '활성' },
            { value: 'false', label: '비활성' },
          ]}
        />
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={() => {
          const missingFields: string[] = [];
          if (!form.name) missingFields.push('이름');

          if (missingFields.length > 0) {
            setError(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
            return;
          }

          setError('');
          onSubmit({
            name: form.name,
            company_name: form.company_name || undefined,
            worker_type: form.worker_type,
            phone: form.phone || undefined,
            email: form.email || undefined,
            specialties: form.specialties.length > 0 ? form.specialties : undefined,
            notes: form.notes || undefined,
            is_active: form.is_active,
          });
        }}
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}



