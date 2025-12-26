'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import {
  LayoutDashboard,
  Layout,
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
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type {
  BU,
  Client,
  Equipment,
  Channel,
  ChannelContent,
  Event,
  Manual,
  ProjectTask,
  ProjectStep,
  ProjectAssets,
} from '@/types/database';
import {
  useProjects,
  useTasks,
  useFinancialEntries,
  useClients,
  useEquipment,
  useChannels,
  useChannelContents,
  useEvents,
  useManuals,
  useOrgMembers,
  useUsers,
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
  useCreateChannel,
  useUpdateChannel,
  useDeleteChannel,
  useCreateChannelContent,
  useUpdateChannelContent,
  useDeleteChannelContent,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useCreateManual,
  useUpdateManual,
  useDeleteManual,
} from '@/features/erp/hooks';
import { dbProjectToFrontend, dbTaskToFrontend, dbFinancialToFrontend, frontendProjectToDb, frontendTaskToDb, frontendFinancialToDb } from '@/features/erp/utils';

type ReactStudioView =
  | 'dashboard'
  | 'projects'
  | 'schedule'
  | 'equipment'
  | 'hr'
  | 'clients'
  | 'finance'
  | 'tasks'
  | 'manuals'
  | 'channels';

interface ReactStudioDashboardProps {
  bu: BU;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

// 유틸리티 함수: D-Day 기준으로 일정 계산
function calculateDatesFromRelease(releaseDate: string) {
  const date = new Date(releaseDate);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const addDays = (d: Date, days: number) => {
    const newDate = new Date(d);
    newDate.setDate(d.getDate() + days);
    return newDate;
  };

  return {
    release_date: releaseDate, // D-Day
    edit_final_date: formatDate(addDays(date, -1)), // D-1
    edit1_date: formatDate(addDays(date, -3)),     // D-3
    shoot_date: formatDate(addDays(date, -7)),     // D-7
    script_date: formatDate(addDays(date, -9)),    // D-9
    plan_date: formatDate(addDays(date, -11)),     // D-11
  };
}

// 할일 제목에 따라 마감일 자동 계산
function calculateTaskDueDate(
  taskTitle: string,
  step: ProjectStep,
  schedule: {
    plan_date?: string | null;
    script_date?: string | null;
    shoot_date?: string | null;
    edit1_date?: string | null;
    edit_final_date?: string | null;
    release_date?: string | null;
  }
): string {
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const addDays = (dateStr: string, days: number) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return formatDate(date);
  };

  // 기획 단계
  if (step === 'plan' && schedule.plan_date) {
    if (taskTitle.includes('아이템') || taskTitle.includes('주제')) {
      return addDays(schedule.plan_date, -2); // 기획 확정일 2일 전
    }
    if (taskTitle.includes('기획안')) {
      return schedule.plan_date; // 기획 확정일
    }
  }

  // 대본 단계
  if (step === 'script' && schedule.script_date) {
    if (taskTitle.includes('초안')) {
      return addDays(schedule.script_date, -2); // 대본 확정일 2일 전
    }
    if (taskTitle.includes('피드백') || taskTitle.includes('수정')) {
      return schedule.script_date; // 대본 확정일
    }
  }

  // 촬영 단계
  if (step === 'shoot' && schedule.shoot_date) {
    if (taskTitle.includes('장소') || taskTitle.includes('스튜디오') || taskTitle.includes('섭외')) {
      return addDays(schedule.shoot_date, -5); // 촬영일 5일 전
    }
    if (taskTitle.includes('장비') || taskTitle.includes('체크')) {
      return addDays(schedule.shoot_date, -1); // 촬영일 1일 전
    }
    if (taskTitle.includes('출연진') || taskTitle.includes('스케줄')) {
      return addDays(schedule.shoot_date, -3); // 촬영일 3일 전
    }
  }

  // 편집 단계
  if (step === 'edit') {
    if (taskTitle.includes('컷 편집') || taskTitle.includes('1차')) {
      if (schedule.edit1_date) {
        return schedule.edit1_date; // 1차 편집 확정일
      }
    }
    if (taskTitle.includes('자막') || taskTitle.includes('효과')) {
      if (schedule.edit_final_date) {
        return addDays(schedule.edit_final_date, -2); // 최종 편집 확정일 2일 전
      }
    }
    if (taskTitle.includes('썸네일')) {
      if (schedule.edit_final_date) {
        return addDays(schedule.edit_final_date, -1); // 최종 편집 확정일 1일 전
      }
    }
    if (taskTitle.includes('최종') || taskTitle.includes('렌더링') || taskTitle.includes('검수')) {
      if (schedule.edit_final_date) {
        return schedule.edit_final_date; // 최종 편집 확정일
      }
      if (schedule.release_date) {
        return schedule.release_date; // 업로드일
      }
    }
  }

  return '';
}

// 단계별 기본 할일 템플릿
const DEFAULT_TASKS_BY_STEP: Record<ProjectStep, Array<{ title: string; priority: 'high' | 'medium' | 'low'; description: string }>> = {
  plan: [
    { title: '아이템/주제 선정', priority: 'high', description: '트렌드 분석 및 주제 확정' },
    { title: '기획안 작성', priority: 'medium', description: '구성안 및 소구 포인트 정리' }
  ],
  script: [
    { title: '대본 초안 작성', priority: 'high', description: '오프닝/클로징 멘트 포함' },
    { title: '대본 피드백 및 수정', priority: 'medium', description: '팀 내 피드백 반영' }
  ],
  shoot: [
    { title: '촬영 장소/스튜디오 섭외', priority: 'high', description: '' },
    { title: '장비 체크 (카메라/조명/오디오)', priority: 'high', description: '배터리 및 메모리 확인' },
    { title: '출연진 스케줄 확인', priority: 'medium', description: '' }
  ],
  edit: [
    { title: '컷 편집 (1차)', priority: 'high', description: 'NG컷 삭제 및 순서 배열' },
    { title: '자막 및 효과 작업', priority: 'medium', description: '' },
    { title: '썸네일 제작', priority: 'high', description: '클릭률 높은 이미지 제작' },
    { title: '최종 렌더링 및 검수', priority: 'high', description: '오디오 레벨 및 오타 확인' }
  ]
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'In Production': 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    'Pre-Production': 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    'Post-Production': 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    'Completed': 'bg-gray-100 dark:bg-slate-800 dark:bg-slate-800 text-gray-800 dark:text-slate-200 dark:text-slate-300 border-gray-200 dark:border-slate-700 dark:border-slate-700',
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
    'Inactive': 'bg-gray-100 dark:bg-slate-800 dark:bg-slate-800 text-gray-500 dark:text-slate-400 dark:text-slate-400',
    'Growing': 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  };

  return (
    <span
      className={cn(
        'px-2.5 py-0.5 rounded-full text-xs font-medium border',
        styles[status] || 'bg-gray-100 dark:bg-slate-800 dark:bg-slate-800 text-gray-800 dark:text-slate-200 dark:text-slate-300'
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
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
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
      <h3 className="text-gray-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtext && <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{subtext}</p>}
    </div>
  );
}

export default function ReactStudioDashboard({ bu }: ReactStudioDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ReactStudioView>('dashboard');
  const [user, setUser] = useState<any>(null);

  // Period filter states
  const [periodType, setPeriodType] = useState<'all' | 'year' | 'quarter' | 'month' | 'custom'>('month');
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
  const { data: channelsData = [] } = useChannels(bu);
  const { data: channelContentsData = [] } = useChannelContents();
  const { data: eventsData = [] } = useEvents(bu);
  const { data: manualsData = [] } = useManuals(bu);
  const { data: orgData = [] } = useOrgMembers();
  const { data: usersData } = useUsers();
  const { data: externalWorkersData = [] } = useExternalWorkers(bu);

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
  const createChannelMutation = useCreateChannel();
  const updateChannelMutation = useUpdateChannel();
  const deleteChannelMutation = useDeleteChannel();
  const createChannelContentMutation = useCreateChannelContent();
  const updateChannelContentMutation = useUpdateChannelContent();
  const deleteChannelContentMutation = useDeleteChannelContent();
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
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<any>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalProjectId, setTaskModalProjectId] = useState<number | null>(null);
  const [isEditTaskModalOpen, setEditTaskModalOpen] = useState<any>(null);
  const [isTaskDetailModalOpen, setTaskDetailModalOpen] = useState<any>(null);
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
  const [isChannelModalOpen, setChannelModalOpen] = useState(false);
  const [isEditChannelModalOpen, setEditChannelModalOpen] = useState<Channel | null>(null);
  const [isChannelDetailModalOpen, setChannelDetailModalOpen] = useState<Channel | null>(null);
  const [deleteChannelId, setDeleteChannelId] = useState<number | null>(null);
  const [isChannelContentModalOpen, setChannelContentModalOpen] = useState(false);
  const [channelContentModalChannelId, setChannelContentModalChannelId] = useState<number | null>(null);
  const [isEditChannelContentModalOpen, setEditChannelContentModalOpen] = useState<ChannelContent | null>(null);
  const [deleteChannelContentId, setDeleteChannelContentId] = useState<number | null>(null);
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
    const maxYear = Math.max(currentYear, 2027);
    return Array.from({ length: maxYear - 2021 + 1 }, (_, i) => 2021 + i).reverse();
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
    { id: 'channels', label: '채널 관리', icon: Youtube },
    { id: 'schedule', label: '일정/캘린더', icon: CalendarIcon },
    { id: 'equipment', label: '장비 관리', icon: Camera },
    { id: 'hr', label: '스태프/외주', icon: Users },
    { id: 'clients', label: '클라이언트', icon: Briefcase },
    { id: 'finance', label: '정산/회계', icon: Receipt },
    { id: 'tasks', label: '업무/할일', icon: CheckSquare },
    { id: 'manuals', label: '매뉴얼/가이드', icon: BookOpen },
  ];

  // Dashboard View
  const DashboardView = () => {
    const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<'all' | 'my' | 'unassigned'>('all');
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200">진행 중인 프로젝트</h3>
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
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-gray-800 dark:text-slate-200 text-sm">{project.name}</h4>
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              project.status === '기획중' ? 'bg-yellow-100 text-yellow-700' :
                              project.status === '진행중' ? 'bg-blue-100 text-blue-700' :
                              project.status === '운영중' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'
                            )}>
                              {project.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-slate-400 mt-2">
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
                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
                    진행 중인 프로젝트가 없습니다.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200">주요 일정</h3>
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
                      className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900 rounded-lg transition-colors border border-gray-100 dark:border-slate-700 cursor-pointer"
                      onClick={() => setEditEventModalOpen(event)}
                    >
                      <div className="w-16 text-center mr-4 flex-shrink-0">
                        <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">
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
                        <h4 className="font-semibold text-gray-800 dark:text-slate-200 text-sm truncate">{event.title}</h4>
                        {event.description && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center mt-1 truncate">
                            <Clock className="w-3 h-3 mr-1 flex-shrink-0" /> 
                            <span className="truncate">{event.description}</span>
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
                    등록된 일정이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200">할 일</h3>
              <button
                onClick={() => setTaskModalOpen(true)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <Plus className="w-4 h-4 text-gray-600 dark:text-slate-300" />
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
              <button
                onClick={() => setTaskAssigneeFilter('unassigned')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                  taskAssigneeFilter === 'unassigned'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
                )}
              >
                담당자 미지정 할일 보기
              </button>
            </div>
            <div className="space-y-3">
              {activeTasks.filter((t) => {
                if (t.status === 'done') return false;
                if (taskAssigneeFilter === 'my' && user?.profile?.name) {
                  return t.assignee === user.profile.name;
                }
                if (taskAssigneeFilter === 'unassigned') {
                  return !t.assignee || t.assignee.trim() === '';
                }
                return true;
              }).length > 0 ? (
                activeTasks
                  .filter((t) => {
                    if (t.status === 'done') return false;
                    if (taskAssigneeFilter === 'my' && user?.profile?.name) {
                      return t.assignee === user.profile.name;
                    }
                    if (taskAssigneeFilter === 'unassigned') {
                      return !t.assignee || t.assignee.trim() === '';
                    }
                    return true;
                  })
                  .slice(0, 5)
                  .map((task) => {
                    const relatedProject = activeProjects.find((p) => p.id === task.projectId);
                    return (
                      <div
                        key={task.id}
                        onClick={() => setTaskDetailModalOpen(task)}
                        className="flex items-start p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2 flex-wrap">
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              task.status === 'todo' ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300' :
                              task.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                              'bg-green-100 text-green-600'
                            )}>
                              {task.status === 'todo' ? '할 일' : task.status === 'in-progress' ? '진행 중' : '완료'}
                            </span>
                            {relatedProject && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                                {relatedProject.name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-800 dark:text-slate-200 mb-2">{task.title}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                            {task.assignee && (
                              <div className="flex items-center">
                                <User className="w-3 h-3 mr-1" />
                                <span className="font-medium">{task.assignee}</span>
                              </div>
                            )}
                            {task.dueDate && (
                              <div className="flex items-center text-gray-400 dark:text-slate-500">
                                <Clock className="w-3 h-3 mr-1" />
                                <span>{new Date(task.dueDate).toLocaleDateString('ko-KR')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
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
    const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('all');
    const [projectViewMode, setProjectViewMode] = useState<'kanban' | 'calendar' | 'list'>('list');
    
    // 채널별 필터링된 프로젝트
    const filteredProjects = useMemo(() => {
      const buProjects = projects.filter((p) => p.bu === bu);
      if (selectedChannelFilter === 'all') return buProjects;
      if (selectedChannelFilter === 'external') {
        // 외주 프로젝트는 client_id가 있는 것으로 판단
        return buProjects.filter((p) => p.client_id);
      }
      // 특정 채널의 프로젝트 필터링 - category로 매칭
      const channel = channelsData.find((c) => c.id === Number(selectedChannelFilter));
      if (channel) {
        return buProjects.filter((p) => p.cat === channel.name || p.cat?.includes(channel.name));
      }
      return buProjects;
    }, [projects, bu, selectedChannelFilter, channelsData]);
    
    const buChannels = channelsData.filter((c) => c.bu_code === bu);

    // 프로젝트 상태별 분류
    const projectStatusGroups = useMemo(() => {
      const groups: Record<string, typeof filteredProjects> = {
        '기획': filteredProjects.filter((p) => p.status === '기획중' || p.status === '준비중'),
        '촬영': filteredProjects.filter((p) => p.status === '진행중' && (p as any).shoot_date),
        '편집': filteredProjects.filter((p) => p.status === '편집중' || p.status === '운영중'),
        '완료': filteredProjects.filter((p) => p.status === '완료'),
      };
      return groups;
    }, [filteredProjects]);

    // 칸반보드 뷰
    const KanbanBoardView = () => {
      const columns = [
        { id: '기획', title: '기획 & 대본', statuses: ['기획중', '준비중'] },
        { id: '촬영', title: '촬영 일정', statuses: ['진행중'] },
        { id: '후반', title: '편집 & 승인', statuses: ['편집중', '운영중'] },
        { id: '완료', title: '업로드 완료', statuses: ['완료'] },
      ];

      return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {columns.map((col) => (
            <div key={col.id} className="min-w-[320px] flex-1 bg-gray-50 dark:bg-slate-900 rounded-xl p-3 h-fit max-h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-bold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                  {col.id === '기획' && <FileText size={18} />}
                  {col.id === '촬영' && <Camera size={18} />}
                  {col.id === '후반' && <Edit3 size={18} />}
                  {col.id === '완료' && <CheckCircle2 size={18} />}
                  {col.title}
                </h3>
                <span className="text-xs bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-slate-300">
                  {filteredProjects.filter((p) => col.statuses.includes(p.status)).length}
                </span>
              </div>
              
              <div className="space-y-3">
                {filteredProjects
                  .filter((p) => col.statuses.includes(p.status))
                  .map((project) => {
                    const projectClient = clientsData.find((c) => c.id === project.client_id);
                    return (
                      <div
                        key={project.id}
                        onClick={() => setSelectedProjectDetail(project)}
                        className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          {project.client_id ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white bg-indigo-600 flex items-center gap-1">
                              <Briefcase size={8} /> 외주
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white bg-red-600">
                              {project.cat || '채널'}
                            </span>
                          )}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditProjectModalOpen(project);
                              }}
                              className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300"
                              title="수정"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteProjectId(Number(project.id));
                              }}
                              className="text-red-400 hover:text-red-600"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-1 line-clamp-2">{project.name}</h4>
                        {projectClient && (
                          <p className="text-xs text-indigo-600 mb-2 font-medium">Client: {projectClient.company_name_ko}</p>
                        )}
                        
                        <div className="space-y-1 mb-3 mt-2">
                          {(project as any).shoot_date && (
                            <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                              <Camera size={12} />
                              <span>촬영: {(project as any).shoot_date}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                            <Clock size={12} />
                            <span>{project.client_id ? '납품' : '업로드'}: {(project as any).release_date || project.endDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                          <div className="flex -space-x-1 overflow-hidden max-w-[50%]">
                            {(project as any).pm_name && (
                              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-white flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 shrink-0" title={(project as any).pm_name}>
                                {(project as any).pm_name[0]}
                              </div>
                            )}
                          </div>
                          <StatusBadge status={project.status} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      );
    };

    // 캘린더 뷰
    const CalendarView = () => {
      const [currentMonth, setCurrentMonth] = useState(new Date());
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startDate = startOfMonth(monthStart);
      const endDate = endOfMonth(monthEnd);
      
      const days = [];
      let day = startDate;
      while (day <= endDate) {
        days.push(new Date(day));
        day = new Date(day.setDate(day.getDate() + 1));
      }

      return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 h-full flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-900 dark:text-slate-100">{format(currentMonth, 'yyyy년 M월')}</h3>
            <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded">
                <ChevronLeft size={20}/>
              </button>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded">
                <ChevronRight size={20}/>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-700 flex-1">
            {['일','월','화','수','목','금','토'].map(d => (
              <div key={d} className="bg-gray-50 dark:bg-slate-900 p-2 text-center text-sm font-bold text-gray-500 dark:text-slate-400">{d}</div>
            ))}
            {days.map((day, idx) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayProjects = filteredProjects.filter(p => {
                const releaseDate = (p as any).release_date || p.endDate;
                const shootDate = (p as any).shoot_date;
                return releaseDate === dayStr || shootDate === dayStr;
              });
              const isCurrentMonth = format(day, 'M') === format(currentMonth, 'M');
              
              return (
                <div key={idx} className={`bg-white dark:bg-slate-800 p-2 min-h-[100px] ${!isCurrentMonth ? 'bg-gray-50 dark:bg-slate-900' : ''}`}>
                  <span className={`text-sm font-medium ${isCurrentMonth ? 'text-gray-700 dark:text-slate-300' : 'text-gray-300'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayProjects.map(p => {
                      const releaseDate = (p as any).release_date || p.endDate;
                      const shootDate = (p as any).shoot_date;
                      const isExternal = !!p.client_id;
                      const isShoot = shootDate === dayStr;
                      
                      if (releaseDate === dayStr) {
                        return (
                          <div
                            key={`rel-${p.id}`}
                            className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer ${isExternal ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}
                            onClick={() => setSelectedProjectDetail(p)}
                          >
                            {isExternal ? '📦' : '🚀'} {p.name}
                          </div>
                        );
                      }
                      if (isShoot) {
                        return (
                          <div
                            key={`sht-${p.id}`}
                            className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-700 truncate cursor-pointer"
                            onClick={() => setSelectedProjectDetail(p)}
                          >
                            🎥 {p.name}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4 animate-fade-in h-full flex flex-col">
        <div className="flex flex-col gap-4">
          {/* 채널 필터링 UI */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">프로젝트 필터</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setProjectViewMode('kanban')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    projectViewMode === 'kanban'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
                  }`}
                >
                  <Layout className="w-3 h-3 inline mr-1" /> 칸반
                </button>
                <button
                  onClick={() => setProjectViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    projectViewMode === 'calendar'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
                  }`}
                >
                  <CalendarIcon className="w-3 h-3 inline mr-1" /> 캘린더
                </button>
                <button
                  onClick={() => setProjectViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    projectViewMode === 'list'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
                  }`}
                >
                  <List className="w-3 h-3 inline mr-1" /> 리스트
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedChannelFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedChannelFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
                }`}
              >
                전체 보기
              </button>
              <button
                onClick={() => setSelectedChannelFilter('external')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedChannelFilter === 'external'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                외주 프로젝트
              </button>
              {buChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannelFilter(String(channel.id))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedChannelFilter === String(channel.id)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
                  }`}
                >
                  {channel.name}
                </button>
              ))}
            </div>
          </div>

          {/* 검색 및 새 프로젝트 버튼 */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm gap-4">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="프로젝트 검색..."
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
        </div>

        {/* 뷰 모드에 따른 컨텐츠 */}
        <div className="flex-1 overflow-hidden">
          {projectViewMode === 'kanban' && <KanbanBoardView />}
          {projectViewMode === 'calendar' && <CalendarView />}
          {projectViewMode === 'list' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      프로젝트명
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      클라이언트
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      PM / 감독
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      순이익
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      마감일
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProjects.map((project) => {
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
                      <React.Fragment key={project.id}>
                        <tr
                          className="hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900 transition-colors cursor-pointer group"
                          onClick={() => setSelectedProjectDetail(project)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                              )}
                              <div>
                                <div className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
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
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300 font-mono">
                            {formatCurrency(budget - totalExpenses)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{project.endDate}</td>
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
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditProjectModalOpen(project);
                                }}
                                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300"
                                title="수정"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteProjectId(Number(project.id));
                                }}
                                className="text-red-400 hover:text-red-600"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${project.id}-accordion`}>
                            <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-slate-900">
                              <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
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
                                            className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-100"
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
                                                  setEditFinanceModalOpen(revenue);
                                                }}
                                                className="text-gray-400 dark:text-slate-500 hover:text-indigo-600"
                                              >
                                                <Edit3 className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeleteFinanceId(Number(revenue.id));
                                                }}
                                                className="text-gray-400 dark:text-slate-500 hover:text-red-600"
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
                                              <div className="text-sm font-medium text-gray-800 dark:text-slate-200">
                                                {expense.name}
                                              </div>
                                              <div className="text-xs text-gray-500 dark:text-slate-400">
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
                                                className="text-gray-400 dark:text-slate-500 hover:text-indigo-600"
                                              >
                                                <Edit3 className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeleteFinanceId(Number(expense.id));
                                                }}
                                                className="text-gray-400 dark:text-slate-500 hover:text-red-600"
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

                                <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-indigo-900">순이익</span>
                                    <span className="text-lg font-bold text-indigo-600">
                                      {formatCurrency(budget - totalExpenses)}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                                  <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2">
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

                                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
                                    <div className="space-y-2">
                                      {(() => {
                                        const projectTasks = tasks.filter((t) => t.projectId === project.id.toString());
                                        return projectTasks.length > 0 ? (
                                          projectTasks.map((task) => {
                                            const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'done';
                                            return (
                                              <div
                                                key={task.id}
                                                className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                              >
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <span
                                                      className={cn(
                                                        'text-sm font-medium',
                                                        task.status === 'done' ? 'text-gray-400 dark:text-slate-500 line-through' : 'text-gray-800 dark:text-slate-200',
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
                                                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
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
                                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'
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
                                                    className="text-gray-400 dark:text-slate-500 hover:text-indigo-600"
                                                    title="수정"
                                                  >
                                                    <Edit3 className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setDeleteTaskId(Number(task.id));
                                                    }}
                                                    className="text-gray-400 dark:text-slate-500 hover:text-red-600"
                                                    title="삭제"
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <div className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
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
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Channel View
  const ChannelView = () => {
    const buChannels = channelsData.filter((c) => c.bu_code === bu);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm gap-4">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="채널 검색..."
              className="pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex space-x-1 bg-gray-200 dark:bg-slate-700 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-800 text-gray-900 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300'
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
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300'
                )}
              >
                리스트
              </button>
            </div>
            <button
              onClick={() => setChannelModalOpen(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> 새 채널
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">채널명</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">제작사</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">구독자</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">다음 업로드일</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">광고현황</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">상태</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {buChannels.map((channel) => (
                  <tr key={channel.id} className="hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Youtube className="w-5 h-5 text-red-600" />
                        <div>
                          <div className="font-medium text-gray-900">{channel.name}</div>
                          {channel.url && (
                            <a
                              href={channel.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-gray-400 dark:text-slate-500 hover:text-indigo-600 flex items-center"
                            >
                              <LinkIcon className="w-3 h-3 mr-1" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{channel.production_company || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{channel.subscribers_count || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {channel.next_upload_date && (
                          <div className="text-sm text-gray-600 dark:text-slate-300">{channel.next_upload_date}</div>
                        )}
                        {channel.upload_days && channel.upload_days.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {channel.upload_days.map((day) => {
                              const dayLabels: Record<string, string> = {
                                monday: '월',
                                tuesday: '화',
                                wednesday: '수',
                                thursday: '목',
                                friday: '금',
                                saturday: '토',
                                sunday: '일',
                              };
                              return (
                                <span
                                  key={day}
                                  className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                                >
                                  {dayLabels[day] || day}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={
                          channel.ad_status === 'active'
                            ? 'Active'
                            : channel.ad_status === 'paused'
                              ? 'Paused'
                              : channel.ad_status === 'completed'
                                ? 'Completed'
                                : 'Inactive'
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={channel.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setChannelDetailModalOpen(channel)}
                          className="text-gray-400 dark:text-slate-500 hover:text-blue-600"
                          title="상세보기"
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditChannelModalOpen(channel)}
                          className="text-gray-400 dark:text-slate-500 hover:text-indigo-600"
                          title="수정"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteChannelId(channel.id)}
                          className="text-gray-400 dark:text-slate-500 hover:text-red-600"
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
            {buChannels.map((channel) => {
              const channelContents = channelContentsData.filter((cc) => cc.channel_id === channel.id);
              return (
                <div
                  key={channel.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full"
                >
                  <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <div className="p-3 bg-red-50 rounded-lg mr-3">
                          <Youtube className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-gray-900">{channel.name}</h3>
                          {channel.url && (
                            <a
                              href={channel.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-gray-400 dark:text-slate-500 hover:text-indigo-600 flex items-center mt-1"
                            >
                              채널 바로가기 <LinkIcon className="w-3 h-3 ml-1" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={channel.status} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setChannelDetailModalOpen(channel);
                          }}
                          className="text-gray-400 dark:text-slate-500 hover:text-blue-600"
                          title="상세보기"
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditChannelModalOpen(channel);
                          }}
                          className="text-gray-400 dark:text-slate-500 hover:text-indigo-600"
                          title="수정"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteChannelId(channel.id);
                          }}
                          className="text-gray-400 dark:text-slate-500 hover:text-red-600"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">구독자 수</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-slate-200">
                          {channel.subscribers_count || '0'}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">총 조회수</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-slate-200">
                          {channel.total_views || '0'}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-slate-300 flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500" />
                        담당: {channel.manager_name || '-'}
                      </div>
                      {channel.next_upload_date && (
                        <div className="flex items-center">
                          <CalendarIcon className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500" />
                          다음 업로드:{' '}
                          <span className="font-bold text-indigo-600 ml-1">
                            {channel.next_upload_date}
                          </span>
                        </div>
                      )}
                    </div>
                    {channel.upload_days && channel.upload_days.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">업로드 구좌</p>
                        <div className="flex flex-wrap gap-1.5">
                          {channel.upload_days.map((day) => {
                            const dayLabels: Record<string, string> = {
                              monday: '월',
                              tuesday: '화',
                              wednesday: '수',
                              thursday: '목',
                              friday: '금',
                              saturday: '토',
                              sunday: '일',
                            };
                            return (
                              <span
                                key={day}
                                className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium"
                              >
                                {dayLabels[day] || day}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 bg-gray-50 dark:bg-slate-900 p-4">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-3 flex items-center">
                      <Clapperboard className="w-3 h-3 mr-1" /> 콘텐츠 제작 파이프라인
                    </h4>
                    <div className="space-y-2">
                      {channelContents.map((content) => {
                        const dDay = Math.ceil(
                          (new Date(content.upload_date).getTime() - new Date().getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        return (
                          <div
                            key={content.id}
                            className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 flex justify-between items-center shadow-sm"
                          >
                            <div className="flex-1">
                              <div className="flex items-center mb-1">
                                <span
                                  className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded mr-2 border',
                                    content.stage === 'uploaded'
                                      ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700'
                                      : content.stage === 'editing'
                                        ? 'bg-purple-50 text-purple-600 border-purple-100'
                                        : content.stage === 'shooting'
                                          ? 'bg-red-50 text-red-600 border-red-100'
                                          : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                                  )}
                                >
                                  {content.stage === 'uploaded'
                                    ? 'Uploaded'
                                    : content.stage === 'editing'
                                      ? 'Editing'
                                      : content.stage === 'shooting'
                                        ? 'Shooting'
                                        : 'Planning'}
                                </span>
                                <span className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                                  {content.title}
                                </span>
                              </div>
                              <div className="flex items-center text-xs text-gray-400 dark:text-slate-500">
                                <span className="mr-2">{content.assignee_name || '-'}</span>
                                {dDay > 0 ? (
                                  <span className="text-red-500 font-bold">D-{dDay}</span>
                                ) : (
                                  <span>{content.upload_date}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditChannelContentModalOpen(content);
                              }}
                              className="text-gray-300 hover:text-indigo-600"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => {
                          setChannelContentModalChannelId(channel.id);
                          setChannelContentModalOpen(true);
                        }}
                        className="w-full py-2 border border-dashed border-gray-300 dark:border-slate-700 rounded-lg text-xs text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-colors"
                      >
                        + 새 콘텐츠 기획 추가
                      </button>
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
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">가용 장비</p>
              <p className="text-xl font-bold text-green-600">{availablePercent}%</p>
            </div>
            <CheckSquare className="w-8 h-8 text-green-100" />
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">대여 중 (현장)</p>
              <p className="text-xl font-bold text-indigo-600">{rentedPercent}%</p>
            </div>
            <Camera className="w-8 h-8 text-indigo-100" />
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">수리 / 분실</p>
              <p className="text-xl font-bold text-red-600">{maintenancePercent}%</p>
            </div>
            <Settings className="w-8 h-8 text-red-100" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-3">
            <h3 className="font-bold text-gray-800 dark:text-slate-100">장비 전체 리스트</h3>
            <div className="flex gap-2 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900 flex items-center justify-center">
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
                className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-slate-300 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                대여 등록
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">장비명</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">분류</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
                    시리얼 넘버
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">현재 위치</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">반납 예정일</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {buEquipment.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900 cursor-pointer"
                    onClick={() => setEditEquipmentModalOpen(item)}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{item.category}</td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500 dark:text-slate-400">
                      {item.serial_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 dark:text-slate-200">{item.location || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
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
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase mb-2">총 매출</h3>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[70%]"></div>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">목표 달성률 70% (전년 대비 +5%)</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase mb-2">
                  총 지출 (인건비/제작비)
                </h3>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalExpense)}</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <Receipt className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-400 w-[45%]"></div>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">예산 대비 45% 사용</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 dark:text-slate-200">최근 입출금 내역</h3>
            <button
              onClick={() => setFinanceModalOpen({ mode: 'expense' })}
              className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
            >
              영수증 등록
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">날짜</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">구분</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">항목</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
                    관련 프로젝트
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">금액</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {buFinancials.slice(0, 10).map((item) => {
                  const project = projects.find((p) => p.id === item.projectId);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900 cursor-pointer"
                      onClick={() => setEditFinanceModalOpen(item)}
                    >
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{item.date}</td>
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
                      <td className="px-6 py-4 font-medium text-gray-800 dark:text-slate-200">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-bold text-gray-800 dark:text-slate-200">인력 풀 (Internal & Freelance)</h3>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="이름, 회사명, 전문분야, 비고로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="hidden md:flex bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
            <div className="flex-1">이름 / 역할</div>
            <div className="w-32">소속</div>
            <div className="w-40">연락처</div>
            <div className="w-24">상태</div>
            <div className="w-10"></div>
          </div>

          {filteredWorkers.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 외주 인력이 없습니다.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredWorkers.map((staff) => (
              <div key={staff.id} className="group">
                <div
                  onClick={() => toggleExpand(staff.id)}
                  className={cn(
                    'px-6 py-4 flex flex-col md:flex-row md:items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900 transition-colors',
                    expandedId === staff.id ? 'bg-gray-50 dark:bg-slate-900' : ''
                  )}
                >
                  <div className="flex-1 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 mr-3 border border-slate-200 dark:border-slate-700">
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{staff.name}</div>
                      {staff.company_name && <div className="text-sm text-gray-500 dark:text-slate-400">{staff.company_name}</div>}
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

                  <div className="mt-2 md:mt-0 w-full md:w-40 text-sm text-gray-600 dark:text-slate-300 flex items-center">
                    {staff.phone && (
                      <>
                        <Phone className="w-3 h-3 mr-1 text-gray-400 dark:text-slate-500" /> {staff.phone}
                      </>
                    )}
                  </div>

                  <div className="mt-2 md:mt-0 w-full md:w-24">
                    <StatusBadge status={staff.is_active ? 'Active' : 'Inactive'} />
                  </div>

                  <div className="hidden md:flex w-10 justify-end">
                    {expandedId === staff.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                    )}
                  </div>
                </div>

                {expandedId === staff.id && (
                  <div className="px-6 pb-6 pt-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 왼쪽: 기본 정보 */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-3">기본 정보</h4>
                          <div className="space-y-3">
                            <div className="flex items-start">
                              <span className="text-xs font-medium text-gray-500 dark:text-slate-400 w-20 flex-shrink-0">이름:</span>
                              <span className="text-sm text-gray-900">{staff.name}</span>
                            </div>
                            {staff.company_name && (
                              <div className="flex items-start">
                                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 w-20 flex-shrink-0">회사명:</span>
                                <span className="text-sm text-gray-900">{staff.company_name}</span>
                              </div>
                            )}
                            <div className="flex items-start">
                              <span className="text-xs font-medium text-gray-500 dark:text-slate-400 w-20 flex-shrink-0">타입:</span>
                              <span className="text-sm text-gray-900">
                                {staff.worker_type === 'freelancer'
                                  ? '프리랜서'
                                  : staff.worker_type === 'company'
                                    ? '외주회사'
                                    : '계약직'}
                              </span>
                            </div>
                            <div className="flex items-start">
                              <span className="text-xs font-medium text-gray-500 dark:text-slate-400 w-20 flex-shrink-0">사업부:</span>
                              <span className="text-sm text-gray-900">{bu}</span>
                            </div>
                            <div className="flex items-start">
                              <span className="text-xs font-medium text-gray-500 dark:text-slate-400 w-20 flex-shrink-0">상태:</span>
                              <StatusBadge status={staff.is_active ? 'Active' : 'Inactive'} />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-3">연락처</h4>
                          <div className="space-y-3">
                            {staff.phone ? (
                              <div className="flex items-center text-sm text-gray-700 dark:text-slate-300">
                                <Phone className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500" /> {staff.phone}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 dark:text-slate-500">-</div>
                            )}
                            {staff.email ? (
                              <div className="flex items-center text-sm text-gray-700 dark:text-slate-300">
                                <Mail className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500" /> {staff.email}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 dark:text-slate-500">-</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 오른쪽: 전문분야, 비고, 메타 정보 */}
                      <div className="space-y-4">
                        {staff.specialties && staff.specialties.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-3">전문 분야</h4>
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
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-3">비고</h4>
                            <div className="text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 whitespace-pre-wrap">
                              {staff.notes}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-3">메타 정보</h4>
                          <div className="space-y-2 text-xs text-gray-500 dark:text-slate-400">
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
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-wrap gap-2">
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
    const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('all');
    const buEvents = eventsData.filter((e) => e.bu_code === bu);
    const buProjects = projects.filter((p) => p.bu === bu);
    
    // 채널별 필터링된 프로젝트
    const filteredProjects = useMemo(() => {
      if (selectedChannelFilter === 'all') return buProjects;
      if (selectedChannelFilter === 'external') {
        // 외주 프로젝트는 client_id가 있는 것으로 판단
        return buProjects.filter((p) => p.client_id);
      }
      // 특정 채널의 프로젝트 필터링 - category로 매칭
      const channel = channelsData.find((c) => c.id === Number(selectedChannelFilter));
      if (channel) {
        return buProjects.filter((p) => p.cat === channel.name || p.cat?.includes(channel.name));
      }
      return buProjects;
    }, [buProjects, selectedChannelFilter, channelsData]);
    
    const buChannels = channelsData.filter((c) => c.bu_code === bu);
    
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

    // 프로젝트 일정을 이벤트 형태로 변환
    const projectSchedules = useMemo(() => {
      const schedules: Array<{
        id: string;
        date: string;
        type: 'plan' | 'script' | 'shoot' | 'edit1' | 'edit_final' | 'release';
        projectId: string;
        projectName: string;
        isExternal: boolean;
      }> = [];
      
      filteredProjects.forEach((project) => {
        const p = project as any;
        const isExternal = !!p.client_id;
        
        if (p.plan_date) {
          schedules.push({
            id: `project-${p.id}-plan`,
            date: p.plan_date,
            type: 'plan',
            projectId: p.id,
            projectName: p.name,
            isExternal,
          });
        }
        if (p.script_date) {
          schedules.push({
            id: `project-${p.id}-script`,
            date: p.script_date,
            type: 'script',
            projectId: p.id,
            projectName: p.name,
            isExternal,
          });
        }
        if (p.shoot_date) {
          schedules.push({
            id: `project-${p.id}-shoot`,
            date: p.shoot_date,
            type: 'shoot',
            projectId: p.id,
            projectName: p.name,
            isExternal,
          });
        }
        if (p.edit1_date) {
          schedules.push({
            id: `project-${p.id}-edit1`,
            date: p.edit1_date,
            type: 'edit1',
            projectId: p.id,
            projectName: p.name,
            isExternal,
          });
        }
        if (p.edit_final_date) {
          schedules.push({
            id: `project-${p.id}-edit_final`,
            date: p.edit_final_date,
            type: 'edit_final',
            projectId: p.id,
            projectName: p.name,
            isExternal,
          });
        }
        if (p.release_date) {
          schedules.push({
            id: `project-${p.id}-release`,
            date: p.release_date,
            type: 'release',
            projectId: p.id,
            projectName: p.name,
            isExternal,
          });
        }
      });
      
      return schedules;
    }, [filteredProjects]);

    const monthEvents = buEvents.filter((event) => {
      const eventDate = new Date(event.event_date);
      return (
        eventDate.getMonth() === currentMonth.getMonth() &&
        eventDate.getFullYear() === currentMonth.getFullYear()
      );
    });

    const monthProjectSchedules = projectSchedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.date);
      return (
        scheduleDate.getMonth() === currentMonth.getMonth() &&
        scheduleDate.getFullYear() === currentMonth.getFullYear()
      );
    });

    const allMonthItems = [
      ...monthEvents.map((e) => ({ ...e, itemType: 'event' as const })),
      ...monthProjectSchedules.map((s) => ({ ...s, itemType: 'project' as const })),
    ];

    const upcomingEvents = [...buEvents]
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 10);

    // 프로젝트별 색상 팔레트
    const projectColorPalette = [
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-pink-100 text-pink-700 border-pink-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-cyan-100 text-cyan-700 border-cyan-200',
      'bg-teal-100 text-teal-700 border-teal-200',
      'bg-green-100 text-green-700 border-green-200',
      'bg-yellow-100 text-yellow-700 border-yellow-200',
      'bg-orange-100 text-orange-700 border-orange-200',
      'bg-red-100 text-red-700 border-red-200',
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-lime-100 text-lime-700 border-lime-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-sky-100 text-sky-700 border-sky-200',
      'bg-violet-100 text-violet-700 border-violet-200',
    ];

    // 프로젝트 ID를 기반으로 색상 결정
    const getProjectColor = (projectId: string): string => {
      // 프로젝트 ID를 숫자로 변환하여 색상 인덱스 결정
      let hash = 0;
      for (let i = 0; i < projectId.length; i++) {
        hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % projectColorPalette.length;
      return projectColorPalette[index];
    };

    const getEventTypeColor = (type: string, itemType?: 'event' | 'project', projectId?: string) => {
      if (itemType === 'project' && projectId) {
        // 프로젝트별로 통일된 색상 사용
        return getProjectColor(projectId);
      }
      // 이벤트 타입별 색상 (기존 로직 유지)
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

    const getEventTypeLabel = (type: string, itemType?: 'event' | 'project') => {
      if (itemType === 'project') {
        switch (type) {
          case 'plan':
            return '기획';
          case 'script':
            return '대본';
          case 'shoot':
            return '촬영';
          case 'edit1':
            return '1차편집';
          case 'edit_final':
            return '최종편집';
          case 'release':
            return '릴리즈';
          default:
            return '일정';
        }
      }
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
        {/* 필터 UI */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">프로젝트 필터</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedChannelFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedChannelFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
              }`}
            >
              전체 보기
            </button>
            <button
              onClick={() => setSelectedChannelFilter('external')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedChannelFilter === 'external'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              외주 프로젝트
            </button>
            {buChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannelFilter(String(channel.id))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedChannelFilter === String(channel.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
                }`}
              >
                <Youtube className="w-4 h-4" />
                {channel.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                  )
                }
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                  )
                }
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900">
              월간
            </button>
            <button className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900">
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
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4 overflow-hidden flex flex-col">
            <div className="grid grid-cols-7 mb-2 border-b border-gray-200 dark:border-slate-700 pb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    'text-center text-sm font-semibold',
                    i === 0 ? 'text-red-500' : 'text-gray-500 dark:text-slate-400'
                  )}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-1 h-full overflow-y-auto">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-gray-50 dark:bg-slate-900/50 rounded-lg"></div>
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dayItems = allMonthItems.filter((item) => {
                  const itemDate = new Date(
                    item.itemType === 'event' ? item.event_date : item.date
                  );
                  return itemDate.getDate() === day;
                });
                const isToday =
                  day === new Date().getDate() &&
                  currentMonth.getMonth() === new Date().getMonth() &&
                  currentMonth.getFullYear() === new Date().getFullYear();

                return (
                  <div
                    key={day}
                    className="border border-gray-100 dark:border-slate-700 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900 transition-colors min-h-[80px] relative group flex flex-col"
                  >
                    <span
                      className={cn(
                        'text-sm font-semibold flex-shrink-0',
                        isToday
                          ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                          : 'text-gray-700 dark:text-slate-300'
                      )}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-1 overflow-y-auto custom-scrollbar flex-1">
                      {dayItems.map((item) => {
                        if (item.itemType === 'event') {
                          return (
                            <div
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditEventModalOpen(item);
                              }}
                              className={cn(
                                'text-[10px] px-1.5 py-1 rounded truncate font-medium border cursor-pointer hover:opacity-80',
                                getEventTypeColor(item.event_type, 'event')
                              )}
                            >
                              {item.title}
                            </div>
                          );
                        } else {
                          const project = filteredProjects.find((p) => p.id === item.projectId);
                          return (
                            <div
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProjectDetail(project);
                              }}
                              className={cn(
                                'text-[10px] px-1.5 py-1 rounded truncate font-medium border cursor-pointer hover:opacity-80',
                                getEventTypeColor(item.type, 'project', item.projectId)
                              )}
                              title={`${item.projectName} - ${getEventTypeLabel(item.type, 'project')}`}
                            >
                              {getEventTypeLabel(item.type, 'project')}: {item.projectName}
                            </div>
                          );
                        }
                      })}
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

          <div className="w-full lg:w-80 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200 flex items-center">
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
                      className="p-3 rounded-lg border border-gray-100 dark:border-slate-700 hover:border-gray-300 dark:border-slate-700 transition-colors bg-gray-50 dark:bg-slate-900 group"
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
                          <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
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
                      <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-1">{event.title}</h4>
                      {event.description && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2">{event.description}</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">등록된 일정이 없습니다.</div>
              )}
            </div>

            <button className="w-full mt-4 py-2 text-sm text-indigo-600 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-colors flex-shrink-0">
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
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="클라이언트 검색..."
              value={clientSearchQuery}
              onChange={(e) => setClientSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
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

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="hidden md:flex bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
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
                        <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">담당자</h4>
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
                            className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                      {filteredWorkers.length > 0 ? (
                        filteredWorkers.map((worker: any) => (
                          <div
                            key={worker.id}
                            className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700"
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {worker.name_ko}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-slate-400">
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
                                className="p-1 text-gray-400 dark:text-slate-500 hover:text-indigo-600"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteClientWorkerId(worker.id);
                                }}
                                className="p-1 text-gray-400 dark:text-slate-500 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-400 dark:text-slate-500 py-2">
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
                        'px-6 py-4 flex flex-col md:flex-row md:items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900 transition-colors',
                        expandedId === client.id ? 'bg-gray-50 dark:bg-slate-900' : ''
                      )}
                    >
                      <div className="flex-1 flex items-center">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-lg font-bold text-indigo-600 border border-indigo-100 mr-4">
                          {(client as any).company_name_ko?.substring(0, 1) || (client as any).company_name_en?.substring(0, 1) || '-'}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{(client as any).company_name_ko || (client as any).company_name_en || '-'}</h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{client.industry || '-'}</p>
                        </div>
                      </div>

                      <div className="mt-2 md:mt-0 w-full md:w-40 text-sm text-gray-600 dark:text-slate-300 flex items-center">
                        <User className="w-3 h-3 mr-2 text-gray-400 dark:text-slate-500" />{' '}
                        {(client as any).representative_name || '-'}
                      </div>

                      <div className="mt-2 md:mt-0 w-full md:w-32">
                        <StatusBadge status={client.status} />
                      </div>

                      <div className="hidden md:flex w-10 justify-end">
                        {expandedId === client.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                        )}
                      </div>
                    </div>

                    {expandedId === client.id && (
                      <div className="px-6 pb-6 pt-2 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 animate-fade-in">
                        <div className="ml-0 md:ml-14 grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-2">
                              회사 정보
                            </h4>
                            {(client as any).business_registration_number && (
                              <div className="flex items-center text-sm text-gray-700 dark:text-slate-300">
                                <span className="text-gray-500 dark:text-slate-400 mr-2">사업자등록번호:</span>
                                {(client as any).business_registration_number}
                              </div>
                            )}
                            {(client as any).representative_name && (
                              <div className="flex items-center text-sm text-gray-700 dark:text-slate-300">
                                <span className="text-gray-500 dark:text-slate-400 mr-2">대표자:</span>
                                {(client as any).representative_name}
                              </div>
                            )}
                            {client.last_meeting_date && (
                              <div className="flex items-center text-sm text-gray-700 dark:text-slate-300">
                                <span className="text-gray-500 dark:text-slate-400 mr-2">최근 미팅:</span>
                                {client.last_meeting_date}
                              </div>
                            )}
                            <ClientWorkersList />
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-2">
                              거래 현황
                            </h4>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-slate-400">진행 프로젝트</span>
                              <span className="font-bold">{clientProjects.length} 건</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-slate-400">총 매출액</span>
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
                              className="w-full md:w-auto px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-sm hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-slate-300"
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
              <div className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
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
    const [taskChannelFilter, setTaskChannelFilter] = useState<string>('all');
    const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<'all' | 'my' | 'unassigned'>('all');
    
    const buTasks = useMemo(() => {
      let filtered = tasks.filter((t) => t.bu === bu);
      
      // 채널별 필터링
      if (taskChannelFilter !== 'all') {
        if (taskChannelFilter === 'external') {
          // 외주 프로젝트의 할일만 필터링
          filtered = filtered.filter((t) => {
            const project = projects.find((p) => p.id === t.projectId);
            return project?.client_id;
          });
        } else {
          // 특정 채널의 할일만 필터링
          const channel = channelsData.find((c) => c.id === Number(taskChannelFilter));
          if (channel) {
            filtered = filtered.filter((t) => {
              const project = projects.find((p) => p.id === t.projectId);
              return project?.cat === channel.name || project?.cat?.includes(channel.name);
            });
          }
        }
      }
      
      // 담당자별 필터링
      if (taskAssigneeFilter === 'my' && user?.profile?.name) {
        filtered = filtered.filter((t) => t.assignee === user.profile.name);
      }
      if (taskAssigneeFilter === 'unassigned') {
        filtered = filtered.filter((t) => !t.assignee || t.assignee.trim() === '');
      }
      
      return filtered;
    }, [tasks, bu, taskChannelFilter, taskAssigneeFilter, projects, channelsData, user]);
    
    const todoTasks = buTasks.filter((t) => t.status === 'todo');
    const inProgressTasks = buTasks.filter((t) => t.status === 'in-progress');
    const doneTasks = buTasks.filter((t) => t.status === 'done');

    const kanbanColumns = [
      { id: 'todo', title: 'To Do (기획/준비)', items: todoTasks },
      { id: 'progress', title: 'In Progress (진행중)', items: inProgressTasks },
      { id: 'review', title: 'Review (시사/피드백)', items: [] },
      { id: 'done', title: 'Done (완료)', items: doneTasks },
    ];

    const buChannels = channelsData.filter((c) => c.bu_code === bu);

    return (
      <div className="h-full flex flex-col space-y-4 animate-fade-in overflow-hidden">
        <div className="flex flex-col gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200">업무 현황 (Kanban)</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setTaskModalOpen(true)}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 inline mr-1" /> 새 업무
              </button>
            </div>
          </div>
          
          {/* 필터 UI */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-slate-300">채널:</span>
            </div>
            <button
              onClick={() => setTaskChannelFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                taskChannelFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setTaskChannelFilter('external')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                taskChannelFilter === 'external'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
              }`}
            >
              <Briefcase className="w-3 h-3" /> 외주
            </button>
            {buChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setTaskChannelFilter(String(channel.id))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  taskChannelFilter === String(channel.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
                }`}
              >
                {channel.name}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300 dark:border-slate-700">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-300">담당자:</span>
              <button
                onClick={() => setTaskAssigneeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  taskAssigneeFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setTaskAssigneeFilter('my')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  taskAssigneeFilter === 'my'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
                }`}
              >
                내 업무만
              </button>
              <button
                onClick={() => setTaskAssigneeFilter('unassigned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  taskAssigneeFilter === 'unassigned'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
                }`}
              >
                담당자 미지정
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full space-x-4 min-w-[1400px] pb-4">
            {kanbanColumns.map((column) => (
              <div
                key={column.id}
                className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-800 rounded-xl min-w-[320px] max-w-md shrink-0"
              >
                <div className="p-3 font-semibold text-gray-700 dark:text-slate-300 flex justify-between items-center border-b border-slate-200 dark:border-slate-700/50">
                  {column.title}
                  <span className="bg-slate-200 text-xs px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">
                    {column.items.length}
                  </span>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                  {column.items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer"
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
                            className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 top-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-10 opacity-0 group-hover/menu:opacity-100 transition-opacity pointer-events-none group-hover/menu:pointer-events-auto min-w-[120px]">
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
                              className="block w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900 rounded-t-lg"
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
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-2 leading-snug">
                        {item.title}
                      </h4>
                      
                      {/* 프로젝트 이름 표시 */}
                      {(() => {
                        const relatedProject = projects.find((p) => p.id === item.projectId);
                        return relatedProject ? (
                          <div className="mb-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                              {relatedProject.name}
                            </span>
                          </div>
                        ) : null;
                      })()}

                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700">
                            {item.assignee?.charAt(0) || '?'}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-slate-400">{item.assignee || '미지정'}</span>
                        </div>
                        {(item as any).tag && (
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                            {(item as any).tag}
                          </span>
                        )}
                      </div>
                      
                      {/* 마감일 표시 */}
                      {item.dueDate && (
                        <div className="flex items-center text-xs text-gray-400 dark:text-slate-500 mt-2">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>{new Date(item.dueDate).toLocaleDateString('ko-KR')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="w-full py-2 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 hover:bg-slate-200/50 rounded-lg dashed border border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all flex items-center justify-center">
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
        <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-start bg-white dark:bg-slate-800">
            <div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-slate-400 mb-3">
                <FolderOpen className="w-3 h-3" />
                <span>Wiki</span>
                <ChevronRight className="w-3 h-3" />
                <span>{selectedManual.category}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedManual.title}</h1>
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-slate-400">
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
                className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
                title="목록으로"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
                title="공유"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
                title="인쇄"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditManualModalOpen(selectedManual)}
                className="p-2 text-gray-400 dark:text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                title="수정"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteManualId(selectedManual.id)}
                className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
                  <div className="text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selectedManual.content}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 dark:text-slate-500">
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
                          className="text-lg font-bold text-gray-800 dark:text-slate-200 border-b border-gray-200 dark:border-slate-700 pb-2 mt-6 mb-3"
                        >
                          {block.text}
                        </h2>
                      );
                    case 'text':
                      return (
                        <p key={idx} className="text-gray-600 dark:text-slate-300 leading-relaxed text-sm">
                          {block.text}
                        </p>
                      );
                    case 'bullet':
                      return (
                        <div key={idx} className="flex items-start text-sm text-gray-600 dark:text-slate-300 pl-2">
                          <span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-gray-400 rounded-full shrink-0"></span>
                          <span>{block.text}</span>
                        </div>
                      );
                    case 'check':
                      return (
                        <div
                          key={idx}
                          className="flex items-start p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-700"
                        >
                          <div className="mt-0.5 mr-3 text-indigo-500">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">{block.text}</span>
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
                        <div key={idx} className="flex items-center text-sm text-gray-600 dark:text-slate-300 pl-2">
                          <span className="mr-3 font-bold text-indigo-200 text-lg">{idx + 1}</span>
                          <span className="font-medium text-gray-800 dark:text-slate-200">{block.text}</span>
                        </div>
                      );
                    default:
                      return <div key={idx}>{block.text}</div>;
                  }
                })
              ) : (
                <div className="text-center py-12 text-gray-400 dark:text-slate-500">
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
          return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300';
      }
    };

    return (
      <div className="h-full flex gap-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col shrink-0 overflow-hidden">
          <div className="mb-4 px-2 pt-4">
            <h2 className="text-2xl font-black text-gray-900">지식 관리</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">SOP & Wiki Library</p>
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
                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900 border border-gray-100 dark:border-slate-700'
                  }`}
                >
                  <Icon size={16} className={activeCategory === cat.id ? 'text-red-500' : 'text-gray-400 dark:text-slate-500'}/>
                  {cat.label}
                </button>
              )
            })}
          </div>
          <div className="mt-auto p-4 bg-red-50 rounded-2xl border border-red-100 mx-3 mb-3">
            <p className="text-xs font-bold text-red-600 mb-2">Notice</p>
            <p className="text-[10px] text-gray-600 dark:text-slate-300 leading-relaxed">
              매뉴얼 업데이트 시<br/> 반드시 <b>팀장 승인</b> 후<br/> 게시 바랍니다.
            </p>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-500 dark:text-slate-400">카테고리:</span>
              <span className="text-sm font-black text-gray-900">{categories.find(c => c.id === activeCategory)?.label}</span>
              <span className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold ml-2">{filteredManuals.length}</span>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={14}/>
                <input 
                  type="text" 
                  placeholder="매뉴얼 검색..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium w-64 focus:outline-none focus:border-red-500 transition-colors"
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
                <div className="border-b border-gray-100 dark:border-slate-700">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-slate-900 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
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
                          <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-400 dark:text-slate-500 group-hover:text-red-500 group-hover:bg-red-50 transition-colors">
                            <BookOpen size={16}/>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200 group-hover:text-red-600 transition-colors">{manual.title}</h4>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5">{contentPreview}</p>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${getCategoryColor(manual.category)}`}>
                            {getCategoryLabel(manual.category)}
                          </span>
                        </div>
                        <div className="col-span-2 text-xs font-medium text-gray-600 dark:text-slate-300">
                          {manual.author_name || '-'}
                        </div>
                        <div className="col-span-2 text-right text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                          {new Date(manual.updated_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500">
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
      case 'channels':
        return <ChannelView />;
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
      case 'manuals':
        return <ManualView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-slate-900 font-sans text-gray-900 overflow-hidden">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl flex-shrink-0 z-20">
        <div className="p-6 flex items-center space-x-2 border-b border-slate-800 h-16">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="font-bold text-white">R</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">React Studio</h1>
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
              onClick={() => setActiveTab(item.id as ReactStudioView)}
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
        <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm z-10">
          <div className="h-16 flex items-center justify-between px-4 lg:px-8">
            <div className="flex items-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200 capitalize hidden sm:block">
                {menuItems.find((m) => m.id === activeTab)?.label}
              </h2>
            </div>

            <div className="flex items-center space-x-4 lg:space-x-6">
              <div className="relative hidden sm:block">
                <Search className="w-5 h-5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 cursor-pointer transition-colors" />
              </div>
              <div className="relative">
                <Bell className="w-5 h-5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 cursor-pointer transition-colors" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-slate-700 px-4 lg:px-8 py-3">
            <div className="flex flex-col gap-3">
              {/* Period type buttons */}
              <div className="flex items-center gap-2">
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
                  onClick={() => handlePeriodTypeChange('quarter')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                    periodType === 'quarter'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  )}
                >
                  분기별
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
                  연도별
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

        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-900 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">{renderView()}</div>
        </main>
      </div>

      {/* Modals */}
      {isProjectModalOpen && (
        <CreateProjectModal
          bu={bu}
          clients={clientsData}
          orgMembers={orgData}
          appUsers={usersData?.users || []}
          channels={channelsData}
          onClose={() => setProjectModalOpen(false)}
          onSubmit={async (data) => {
            try {
              const createdProject = await createProjectMutation.mutateAsync({
                ...frontendProjectToDb(data),
                client_id: data.client_id,
                active_steps: data.active_steps || [],
                release_date: data.release_date || null,
                plan_date: data.plan_date || null,
                script_date: data.script_date || null,
                shoot_date: data.shoot_date || null,
                edit1_date: data.edit1_date || null,
                edit_final_date: data.edit_final_date || null,
              } as any);
              
              // 프로젝트 생성 후 active_steps에 따라 할일 목록 생성 (저장 시점에 생성)
              if (data.active_steps && data.active_steps.length > 0) {
                const projectId = createdProject.id.toString();
                const schedule = {
                  plan_date: data.plan_date || null,
                  script_date: data.script_date || null,
                  shoot_date: data.shoot_date || null,
                  edit1_date: data.edit1_date || null,
                  edit_final_date: data.edit_final_date || null,
                  release_date: data.release_date || null,
                };
                
                for (const step of data.active_steps) {
                  const templates = DEFAULT_TASKS_BY_STEP[step] || [];
                  for (const tmpl of templates) {
                    try {
                      // 마감일이 없으면 일정에 맞춰 자동 계산
                      const dueDate = calculateTaskDueDate(tmpl.title, step, schedule);
                      
                      await createTaskMutation.mutateAsync({
                        project_id: Number(projectId),
                        bu_code: bu,
                        title: tmpl.title,
                        assignee: '',
                        due_date: dueDate,
                        status: 'todo',
                        priority: tmpl.priority,
                        tag: '',
                      } as any);
                    } catch (error) {
                      console.error(`Failed to create task for step ${step}:`, error);
                    }
                  }
                }
              }
              
              setProjectModalOpen(false);
            } catch (error) {
              console.error('Failed to create project:', error);
            }
          }}
          onOpenClientModal={() => {
            setClientModalOpen(true);
          }}
          onOpenEditClientModal={(client) => {
            setEditClientModalOpen(client);
          }}
          onDeleteClient={(clientId) => {
            setDeleteClientId(clientId);
          }}
        />
      )}
      {isEditProjectModalOpen && (
        <EditProjectModal
          project={isEditProjectModalOpen}
          bu={bu}
          clients={clientsData}
          orgMembers={orgData}
          appUsers={usersData?.users || []}
          channels={channelsData}
          onClose={() => setEditProjectModalOpen(null)}
          onSubmit={async (data) => {
            try {
              const previousProject = isEditProjectModalOpen;
              const previousSteps = (previousProject as any).active_steps || [];
              const newSteps = data.active_steps || [];
              
              await updateProjectMutation.mutateAsync({
                id: Number(isEditProjectModalOpen.id),
                data: {
                  ...frontendProjectToDb(data),
                  client_id: data.client_id,
                  active_steps: data.active_steps || [],
                  release_date: data.release_date || null,
                  plan_date: data.plan_date || null,
                  script_date: data.script_date || null,
                  shoot_date: data.shoot_date || null,
                  edit1_date: data.edit1_date || null,
                  edit_final_date: data.edit_final_date || null,
                } as any,
              });
              
              // 저장 시점에 새로 추가된 단계에 대한 할일 목록 생성
              const addedSteps = newSteps.filter((step) => !previousSteps.includes(step));
              if (addedSteps.length > 0) {
                const projectId = isEditProjectModalOpen.id.toString();
                const schedule = {
                  plan_date: data.plan_date || null,
                  script_date: data.script_date || null,
                  shoot_date: data.shoot_date || null,
                  edit1_date: data.edit1_date || null,
                  edit_final_date: data.edit_final_date || null,
                  release_date: data.release_date || null,
                };
                
                for (const step of addedSteps) {
                  const templates = DEFAULT_TASKS_BY_STEP[step] || [];
                  for (const tmpl of templates) {
                    try {
                      // 마감일이 없으면 일정에 맞춰 자동 계산
                      const dueDate = calculateTaskDueDate(tmpl.title, step, schedule);
                      
                      await createTaskMutation.mutateAsync({
                        project_id: Number(projectId),
                        bu_code: bu,
                        title: tmpl.title,
                        assignee: '',
                        due_date: dueDate,
                        status: 'todo',
                        priority: tmpl.priority,
                        tag: '',
                      } as any);
                    } catch (error) {
                      console.error(`Failed to create task for step ${step}:`, error);
                    }
                  }
                }
              }
              
              setEditProjectModalOpen(null);
            } catch (error) {
              console.error('Failed to update project:', error);
            }
          }}
          onOpenClientModal={() => {
            setClientModalOpen(true);
          }}
          onOpenEditClientModal={(client) => {
            setEditClientModalOpen(client);
          }}
          onDeleteClient={(clientId) => {
            setDeleteClientId(clientId);
          }}
        />
      )}
      {deleteProjectId && (
        <DeleteConfirmModal
          title="프로젝트 삭제"
          message="정말로 이 프로젝트를 삭제하시겠습니까? 이 프로젝트와 관련된 모든 할일과 일정도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              // 프로젝트와 관련된 모든 할일 삭제
              const projectTasks = tasksData.filter(
                (t) => {
                  const taskProjectId = (t as any).project_id;
                  return taskProjectId === deleteProjectId || taskProjectId === String(deleteProjectId) || String(taskProjectId) === String(deleteProjectId);
                }
              );
              for (const task of projectTasks) {
                try {
                  await deleteTaskMutation.mutateAsync(Number(task.id));
                } catch (error) {
                  console.error('Failed to delete task:', error);
                }
              }

              // 프로젝트와 관련된 모든 일정 삭제
              const projectEvents = eventsData.filter(
                (e) => (e as any).project_id === deleteProjectId || (e as any).project_id === String(deleteProjectId)
              );
              for (const event of projectEvents) {
                try {
                  await deleteEventMutation.mutateAsync(event.id);
                } catch (error) {
                  console.error('Failed to delete event:', error);
                }
              }

              // 프로젝트 삭제
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
      {isTaskDetailModalOpen && (
        <TaskDetailModal
          task={isTaskDetailModalOpen}
          projects={projects}
          onClose={() => setTaskDetailModalOpen(null)}
          onEdit={(task) => {
            setTaskDetailModalOpen(null);
            setEditTaskModalOpen(task);
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
      {isChannelModalOpen && (
        <CreateChannelModal
          bu={bu}
          orgMembers={orgData}
          onClose={() => setChannelModalOpen(false)}
          onSubmit={async (data) => {
            try {
              await createChannelMutation.mutateAsync(data as any);
              setChannelModalOpen(false);
            } catch (error) {
              console.error('Failed to create channel:', error);
            }
          }}
        />
      )}
      {isEditChannelModalOpen && (
        <EditChannelModal
          channel={isEditChannelModalOpen}
          orgMembers={orgData}
          onClose={() => setEditChannelModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await updateChannelMutation.mutateAsync({
                id: isEditChannelModalOpen.id,
                data: data as any,
              });
              setEditChannelModalOpen(null);
            } catch (error) {
              console.error('Failed to update channel:', error);
            }
          }}
        />
      )}
      {isChannelDetailModalOpen && (
        <ChannelDetailModal
          channel={isChannelDetailModalOpen}
          contents={channelContentsData.filter(
            (content) => content.channel_id === isChannelDetailModalOpen.id,
          )}
          onClose={() => setChannelDetailModalOpen(null)}
        />
      )}
      {deleteChannelId && (
        <DeleteConfirmModal
          title="채널 삭제"
          message="정말로 이 채널을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              await deleteChannelMutation.mutateAsync(deleteChannelId);
              setDeleteChannelId(null);
            } catch (error) {
              console.error('Failed to delete channel:', error);
            }
          }}
          onCancel={() => setDeleteChannelId(null)}
        />
      )}
      {isChannelContentModalOpen && channelContentModalChannelId && (
        <CreateChannelContentModal
          channelId={channelContentModalChannelId}
          orgMembers={orgData}
          onClose={() => {
            setChannelContentModalOpen(false);
            setChannelContentModalChannelId(null);
          }}
          onSubmit={async (data) => {
            try {
              await createChannelContentMutation.mutateAsync(data as any);
              setChannelContentModalOpen(false);
              setChannelContentModalChannelId(null);
            } catch (error) {
              console.error('Failed to create channel content:', error);
            }
          }}
        />
      )}
      {isEditChannelContentModalOpen && (
        <EditChannelContentModal
          content={isEditChannelContentModalOpen}
          orgMembers={orgData}
          onClose={() => setEditChannelContentModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await updateChannelContentMutation.mutateAsync({
                id: isEditChannelContentModalOpen.id,
                data,
              });
              setEditChannelContentModalOpen(null);
            } catch (error) {
              console.error('Failed to update channel content:', error);
            }
          }}
        />
      )}
      {deleteChannelContentId && (
        <DeleteConfirmModal
          title="콘텐츠 삭제"
          message="정말로 이 콘텐츠를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              await deleteChannelContentMutation.mutateAsync(deleteChannelContentId);
              setDeleteChannelContentId(null);
            } catch (error) {
              console.error('Failed to delete channel content:', error);
            }
          }}
          onCancel={() => setDeleteChannelContentId(null)}
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
      {selectedProjectDetail && (
        <ProjectDetailModal
          project={selectedProjectDetail}
          bu={bu}
          clients={clientsData}
          channels={channelsData}
          orgMembers={orgData}
          externalWorkers={externalWorkersData}
          tasks={tasks.filter((t) => t.projectId === selectedProjectDetail.id.toString())}
          onClose={() => setSelectedProjectDetail(null)}
          onEdit={() => {
            setEditProjectModalOpen(selectedProjectDetail);
            setSelectedProjectDetail(null);
          }}
          onDelete={(projectId) => {
            setSelectedProjectDetail(null);
            setDeleteProjectId(projectId);
          }}
          onUpdate={async (data) => {
            try {
              await updateProjectMutation.mutateAsync({
                id: Number(selectedProjectDetail.id),
                data: {
                  ...frontendProjectToDb(data),
                  client_id: data.client_id,
                  active_steps: data.active_steps || [],
                  release_date: data.release_date || null,
                  plan_date: data.plan_date || null,
                  script_date: data.script_date || null,
                  shoot_date: data.shoot_date || null,
                  edit1_date: data.edit1_date || null,
                  edit_final_date: data.edit_final_date || null,
                } as any,
              });
            } catch (error) {
              console.error('Failed to update project:', error);
            }
          }}
          onCreateTask={async (taskData) => {
            try {
              await createTaskMutation.mutateAsync({
                ...frontendTaskToDb(taskData),
                priority: taskData.priority || 'medium',
                tag: taskData.tag,
              } as any);
            } catch (error) {
              console.error('Failed to create task:', error);
            }
          }}
          onUpdateTask={async (taskId, taskData) => {
            try {
              await updateTaskMutation.mutateAsync({
                id: Number(taskId),
                data: {
                  ...frontendTaskToDb(taskData),
                  priority: taskData.priority,
                  tag: taskData.tag,
                } as any,
              });
            } catch (error) {
              console.error('Failed to update task:', error);
            }
          }}
          onDeleteTask={async (taskId) => {
            try {
              await deleteTaskMutation.mutateAsync(Number(taskId));
            } catch (error) {
              console.error('Failed to delete task:', error);
            }
          }}
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
  actions,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="modal-container active fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white dark:bg-slate-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 dark:bg-slate-900/50 px-6 py-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-300 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 px-6 py-5">{children}</div>
        </div>
        {actions && (
          <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
            {actions}
          </div>
        )}
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
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  if (type === 'date') {
    return (
      <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          {!disabled && (
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
          )}
        </div>
        <input
          type="date"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30 disabled:bg-gray-100 dark:bg-slate-800 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
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
          disabled={disabled}
          rows={4}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30 disabled:bg-gray-100 dark:bg-slate-800 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
        />
      </label>
    );
  }

  return (
    <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
      <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
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
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30"
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
    <div className="flex items-center justify-end gap-2 px-6 py-4">
      <button
        onClick={onClose}
        className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-900"
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
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-900"
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
  orgMembers,
  appUsers,
  channels,
  onClose,
  onSubmit,
  onOpenClientModal,
  onOpenEditClientModal,
  onDeleteClient,
}: {
  bu: BU;
  clients: Client[];
  orgMembers: any[];
  appUsers: any[];
  channels: Channel[];
  onClose: () => void;
  onSubmit: (data: {
    bu: BU;
    name: string;
    cat: string;
    startDate: string;
    endDate: string;
    status: string;
    client_id?: number;
    pm_name?: string | null;
    active_steps?: ProjectStep[];
    release_date?: string | null;
    plan_date?: string | null;
    script_date?: string | null;
    shoot_date?: string | null;
    edit1_date?: string | null;
    edit_final_date?: string | null;
  }) => void;
  onOpenClientModal: () => void;
  onOpenEditClientModal: (client: Client) => void;
  onDeleteClient: (clientId: number) => void;
}) {
  const [form, setForm] = useState({
    projectType: 'channel' as 'channel' | 'external', // 프로젝트 타입: 채널 or 외주
    name: '',
    cat: '',
    channel_id: '', // 채널 프로젝트인 경우
    startDate: '',
    endDate: '',
    status: '준비중',
    client_id: '', // 클라이언트 (채널 프로젝트에서도 선택 가능)
    pm_name: '',
    active_steps: [] as ProjectStep[],
    release_date: '',
  });

  const selectedClient = form.client_id ? clients.find((c) => c.id === Number(form.client_id)) : null;
  const selectedChannel = form.channel_id ? channels.find((c) => c.id === Number(form.channel_id)) : null;
  const buChannels = channels.filter((c) => c.bu_code === bu);

  // D-Day 변경 시 자동 계산
  const handleReleaseDateChange = (releaseDate: string) => {
    const calculatedDates = calculateDatesFromRelease(releaseDate);
    setForm((prev) => ({
      ...prev,
      release_date: releaseDate,
      endDate: releaseDate,
      ...calculatedDates,
    }));
  };

  // 단계 토글
  const toggleStep = (step: ProjectStep) => {
    const currentSteps = form.active_steps || [];
    const newSteps = currentSteps.includes(step)
      ? currentSteps.filter((s) => s !== step)
      : [...currentSteps, step];
    setForm((prev) => ({ ...prev, active_steps: newSteps }));
  };

  return (
    <ModalShell
      title="프로젝트 등록"
      onClose={onClose}
      actions={
        <ModalActions
          onPrimary={() => {
            const calculatedDates = form.release_date ? calculateDatesFromRelease(form.release_date) : {};
            onSubmit({
              bu,
              name: form.name,
              cat: form.cat || (selectedChannel?.name || ''),
              startDate: form.startDate,
              endDate: form.release_date || form.endDate,
              status: form.status,
              client_id: form.client_id ? Number(form.client_id) : undefined,
              pm_name: form.pm_name || null,
              active_steps: form.active_steps,
              release_date: form.release_date || null,
              ...calculatedDates,
            });
          }}
          onClose={onClose}
          primaryLabel="등록"
        />
      }
    >
      {/* 프로젝트 타입 선택 */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-2 block">프로젝트 유형</label>
        <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-2 rounded-lg">
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, projectType: 'channel', channel_id: '' }))}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-colors ${
              form.projectType === 'channel'
                ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 shadow-sm border border-gray-200 dark:border-slate-700'
                : 'text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:bg-slate-700'
            }`}
          >
            <Youtube className="w-4 h-4" />
            채널 프로젝트
          </button>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, projectType: 'external', channel_id: '' }))}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-colors ${
              form.projectType === 'external'
                ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 shadow-sm border border-gray-200 dark:border-slate-700'
                : 'text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:bg-slate-700'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            외주 프로젝트
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* 채널 선택 (채널 프로젝트인 경우 필수) */}
        {form.projectType === 'channel' && (
          <div className="md:col-span-2">
            <SelectField
              label="채널 선택"
              value={form.channel_id}
              onChange={(val) => {
                const channel = channels.find((c) => c.id === Number(val));
                setForm((prev) => ({
                  ...prev,
                  channel_id: val,
                  cat: channel?.name || prev.cat,
                }));
              }}
              options={[
                { value: '', label: '채널을 선택하세요' },
                ...buChannels.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
            />
          </div>
        )}

        {/* 클라이언트 선택 (선택 사항 - 채널 프로젝트에서도 선택 가능) */}
        <div className="md:col-span-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <SelectField
                label={form.projectType === 'external' ? '클라이언트 (필수)' : '클라이언트 (선택 사항)'}
                value={form.client_id}
                onChange={(val) => setForm((prev) => ({ ...prev, client_id: val }))}
                options={[
                  { value: '', label: '클라이언트를 선택하세요' },
                  ...clients.map((c) => ({ value: String(c.id), label: c.company_name_ko || c.company_name_en || '' })),
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
                    className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
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

        <InputField
          label="카테고리"
          placeholder={form.projectType === 'channel' ? '채널 선택 시 자동 입력' : '예: 안무제작'}
          value={form.cat}
          onChange={(v) => setForm((prev) => ({ ...prev, cat: v }))}
          disabled={form.projectType === 'channel' && !!form.channel_id}
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
        <SelectField
          label="PM / 감독"
          value={form.pm_name}
          onChange={(val) => setForm((prev) => ({ ...prev, pm_name: val }))}
          options={[
            { value: '', label: '선택 안함' },
            ...appUsers.map((u) => ({ value: u.name || '', label: u.name || '' })).filter((o) => o.value),
          ]}
        />
      </div>
      {/* 진행 단계 설정 */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
        <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4" /> 진행 단계 설정
        </h3>
        <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-2 rounded-lg">
          {[
            { id: 'plan' as ProjectStep, label: '기획' },
            { id: 'script' as ProjectStep, label: '대본' },
            { id: 'shoot' as ProjectStep, label: '촬영' },
            { id: 'edit' as ProjectStep, label: '편집' }
          ].map(step => {
            const isActive = form.active_steps?.includes(step.id);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => toggleStep(step.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 shadow-sm border border-gray-200 dark:border-slate-700'
                    : 'text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:bg-slate-700'
                }`}
              >
                {isActive ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <X className="w-4 h-4" />}
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 주요 일정 관리 */}
      {form.active_steps && form.active_steps.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-3">
            <CalendarIcon className="w-4 h-4" /> 주요 일정 관리
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              {form.active_steps.includes('plan') && (
                <InputField
                  label="기획 확정 (D-11)"
                  type="date"
                  value={form.startDate}
                  onChange={(v) => setForm((prev) => ({ ...prev, startDate: v }))}
                />
              )}
              {form.active_steps.includes('script') && (
                <InputField
                  label="대본 확정 (D-9)"
                  type="date"
                  value=""
                  onChange={() => {}}
                  disabled
                />
              )}
              {form.active_steps.includes('shoot') && (
                <InputField
                  label="촬영 확정 (D-7)"
                  type="date"
                  value=""
                  onChange={() => {}}
                  disabled
                />
              )}
            </div>
            <div className="space-y-3">
              {form.active_steps.includes('edit') && (
                <>
                  <InputField
                    label="1차 편집 확정 (D-3)"
                    type="date"
                    value=""
                    onChange={() => {}}
                    disabled
                  />
                  <InputField
                    label="최종 편집 확정 (D-1)"
                    type="date"
                    value=""
                    onChange={() => {}}
                    disabled
                  />
                </>
              )}
              <div className="bg-red-50 p-3 rounded-lg">
                <InputField
                  label={`${form.client_id ? '최종 납품' : '업로드'} 예정일 (기준일)`}
                  type="date"
                  value={form.release_date}
                  onChange={(v) => handleReleaseDateChange(v)}
                />
                <p className="text-[10px] text-red-500 mt-1">* 날짜 변경 시 D-Day 역산하여 전체 일정 자동 조정</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </ModalShell>
  );
}

// Project Detail Modal
function ProjectDetailModal({
  project,
  bu,
  clients,
  channels,
  orgMembers,
  externalWorkers,
  tasks,
  onClose,
  onEdit,
  onUpdate,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onDelete,
}: {
  project: any;
  bu: BU;
  clients: Client[];
  channels: Channel[];
  orgMembers: any[];
  externalWorkers: any[];
  tasks: any[];
  onClose: () => void;
  onEdit: () => void;
  onUpdate: (data: any) => Promise<void>;
  onCreateTask: (data: any) => Promise<void>;
  onUpdateTask: (taskId: string, data: any) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onDelete?: (projectId: number) => void;
}) {
  const isExternal = !!(project as any).client_id;
  const projectClient = isExternal ? clients.find((c) => c.id === project.client_id) : null;
  const projectChannel = !isExternal ? channels.find((c) => c.name === project.cat) : null;
  
  const [localProject, setLocalProject] = useState({
    ...project,
    active_steps: (project as any).active_steps || [] as ProjectStep[],
    plan_date: (project as any).plan_date || null,
    script_date: (project as any).script_date || null,
    shoot_date: (project as any).shoot_date || null,
    edit1_date: (project as any).edit1_date || null,
    edit_final_date: (project as any).edit_final_date || null,
    release_date: (project as any).release_date || null,
    assets: (project as any).assets || {} as ProjectAssets,
  });

  const [localTasks, setLocalTasks] = useState(tasks);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // D-Day 변경 시 자동 계산
  const handleReleaseDateChange = (releaseDate: string) => {
    const calculatedDates = calculateDatesFromRelease(releaseDate);
    setLocalProject((prev) => ({
      ...prev,
      release_date: releaseDate,
      endDate: releaseDate,
      ...calculatedDates,
    }));
  };

  // 단계 토글
  const toggleStep = (step: ProjectStep) => {
    const currentSteps = localProject.active_steps || [];
    const newSteps = currentSteps.includes(step)
      ? currentSteps.filter((s) => s !== step)
      : [...currentSteps, step];
    
    // 단계 활성화 시 기본 할일 추가 (로컬 상태만 업데이트, DB 저장은 저장 버튼 클릭 시)
    let newTasks = [...localTasks];
    if (!currentSteps.includes(step)) {
      const templates = DEFAULT_TASKS_BY_STEP[step] || [];
      const hasExistingTasks = newTasks.some((t) => (t as any).step === step);
      
      if (!hasExistingTasks) {
        const tasksToAdd = templates.map((tmpl, idx) => ({
          id: `new-${step}-${Date.now()}-${idx}`,
          projectId: project.id.toString(),
          step: step,
          title: tmpl.title,
          description: tmpl.description,
          priority: tmpl.priority,
          assignee: '',
          dueDate: '',
          status: 'todo' as const,
          completed: false,
        }));
        newTasks = [...newTasks, ...tasksToAdd];
      }
    } else {
      // 단계 비활성화 시 해당 단계 할일 제거 (로컬 상태만 업데이트)
      newTasks = newTasks.filter((t) => (t as any).step !== step);
    }
    
    setLocalProject((prev) => ({ ...prev, active_steps: newSteps }));
    setLocalTasks(newTasks);
  };

  // 할일 추가
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    const newTask = {
      id: `manual-${Date.now()}`,
      projectId: project.id.toString(),
      step: 'manual' as any,
      title: newTaskTitle,
      description: '',
      priority: 'medium' as const,
      assignee: '',
      dueDate: '',
      status: 'todo' as const,
      completed: false,
    };
    
    setLocalTasks((prev) => [...prev, newTask]);
    setNewTaskTitle('');
    
    try {
      await onCreateTask({
        bu,
        projectId: project.id.toString(),
        title: newTask.title,
        description: newTask.description,
        assignee: newTask.assignee,
        dueDate: newTask.dueDate,
        status: newTask.status,
        priority: newTask.priority,
      });
    } catch (error) {
      console.error('Failed to create task:', error);
      setLocalTasks((prev) => prev.filter((t) => t.id !== newTask.id));
    }
  };

  // 할일 변경
  const handleTaskChange = async (taskId: string, field: string, value: any) => {
    const updatedTasks = localTasks.map((t) =>
      t.id === taskId ? { ...t, [field]: value } : t
    );
    setLocalTasks(updatedTasks);
    
    const task = updatedTasks.find((t) => t.id === taskId);
    if (task) {
      try {
        await onUpdateTask(taskId, {
          bu,
          projectId: task.projectId,
          title: task.title,
          description: (task as any).description || '',
          assignee: task.assignee || '',
          dueDate: task.dueDate,
          status: task.status,
          priority: (task as any).priority || 'medium',
        });
      } catch (error) {
        console.error('Failed to update task:', error);
      }
    }
  };

  // 할일 삭제
  const handleDeleteTask = async (taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await onDeleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  // 상태 변경
  const handleStatusChange = (newStatus: string) => {
    setLocalProject((prev) => ({ ...prev, status: newStatus }));
  };

  // 일정 변경
  const handleDateChange = (type: string, value: string) => {
    if (type === 'release_date') {
      handleReleaseDateChange(value);
    } else {
      setLocalProject((prev) => ({ ...prev, [type]: value || null }));
    }
  };

  // 저장
  const handleSave = async () => {
    try {
      // 프로젝트 정보 업데이트
      await onUpdate({
        bu,
        name: localProject.name,
        cat: localProject.cat,
        startDate: localProject.startDate,
        endDate: localProject.release_date || localProject.endDate,
        status: localProject.status,
        client_id: localProject.client_id,
        pm_name: (localProject as any).pm_name || null,
        active_steps: localProject.active_steps,
        release_date: localProject.release_date,
        plan_date: localProject.plan_date,
        script_date: localProject.script_date,
        shoot_date: localProject.shoot_date,
        edit1_date: localProject.edit1_date,
        edit_final_date: localProject.edit_final_date,
      });
      
      // 새로 생성된 할일들(임시 ID를 가진 할일들)을 DB에 저장
      const newTasksToSave = localTasks.filter((t) => 
        t.id.startsWith('new-') || t.id.startsWith('manual-')
      );
      
      for (const task of newTasksToSave) {
        try {
          // 마감일이 없으면 일정에 맞춰 자동 계산
          let dueDate = task.dueDate || '';
          if (!dueDate && (task as any).step) {
            const schedule = {
              plan_date: localProject.plan_date,
              script_date: localProject.script_date,
              shoot_date: localProject.shoot_date,
              edit1_date: localProject.edit1_date,
              edit_final_date: localProject.edit_final_date,
              release_date: localProject.release_date,
            };
            dueDate = calculateTaskDueDate(task.title, (task as any).step, schedule);
          }
          
          await onCreateTask({
            bu,
            projectId: project.id.toString(),
            title: task.title,
            description: (task as any).description || '',
            assignee: task.assignee || '',
            dueDate: dueDate,
            status: task.status,
            priority: (task as any).priority || 'medium',
          });
        } catch (error) {
          console.error('Failed to create task:', error);
        }
      }
      
      // 삭제된 할일들 처리 (로컬에서 제거되었지만 DB에는 아직 있는 할일들)
      const originalTaskIds = tasks.map((t) => t.id);
      const currentTaskIds = localTasks.map((t) => t.id);
      const deletedTaskIds = originalTaskIds.filter((id) => !currentTaskIds.includes(id));
      
      for (const taskId of deletedTaskIds) {
        // 임시 ID가 아닌 실제 DB에 저장된 할일만 삭제
        if (!taskId.startsWith('new-') && !taskId.startsWith('manual-')) {
          try {
            await onDeleteTask(taskId);
          } catch (error) {
            console.error('Failed to delete task:', error);
          }
        }
      }
      
      // 수정된 할일들 업데이트
      for (const task of localTasks) {
        // 임시 ID가 아닌 실제 DB에 저장된 할일만 업데이트
        if (!task.id.startsWith('new-') && !task.id.startsWith('manual-')) {
          const originalTask = tasks.find((t) => t.id === task.id);
          if (originalTask) {
            const hasChanges = 
              originalTask.title !== task.title ||
              originalTask.assignee !== task.assignee ||
              originalTask.dueDate !== task.dueDate ||
              originalTask.status !== task.status ||
              (originalTask as any).priority !== (task as any).priority;
            
            if (hasChanges) {
              try {
                await onUpdateTask(task.id, {
                  bu,
                  projectId: task.projectId,
                  title: task.title,
                  description: (task as any).description || '',
                  assignee: task.assignee || '',
                  dueDate: task.dueDate || '',
                  status: task.status,
                  priority: (task as any).priority || 'medium',
                });
              } catch (error) {
                console.error('Failed to update task:', error);
              }
            }
          }
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const allWorkers = [...orgMembers, ...externalWorkers];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200">프로젝트 상세 정보</h2>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:bg-slate-700 flex items-center gap-2"
            >
              <Edit3 size={14} /> 수정
            </button>
            <button
              onClick={() => {
                if (onDelete) {
                  onDelete(project.id);
                }
              }}
              className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/70 flex items-center gap-2"
            >
              <Trash2 size={14} /> 삭제
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {/* Header Info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {isExternal ? (
                  <span className="text-xs px-2 py-0.5 rounded font-bold text-white bg-indigo-600">외주 프로젝트</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded font-bold text-white bg-red-600">
                    {projectChannel?.name || project.cat || '채널'}
                  </span>
                )}
                <span className="text-sm text-gray-500 dark:text-slate-400">ID: #{project.id}</span>
              </div>
              
              {isExternal && projectClient && (
                <div className="mb-2">
                  <label className="text-[10px] uppercase text-gray-500 dark:text-slate-400 font-bold">Client</label>
                  <input
                    type="text"
                    value={projectClient.company_name_ko || projectClient.company_name_en || ''}
                    readOnly
                    className="w-full text-indigo-700 font-bold border-none p-0 focus:ring-0 text-lg"
                  />
                </div>
              )}

              <input
                type="text"
                value={localProject.name}
                onChange={(e) => setLocalProject((prev) => ({ ...prev, name: e.target.value }))}
                className="text-2xl font-bold text-gray-900 w-full border-none p-0 focus:ring-0"
                placeholder="프로젝트명"
              />
            </div>

            {/* Status & Dates */}
            <div className="grid grid-cols-2 gap-6 bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-2 uppercase">현재 상태</label>
                <select
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-sm rounded-lg p-2.5"
                  value={localProject.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  <option value="준비중">준비중</option>
                  <option value="기획중">기획중</option>
                  <option value="진행중">진행중</option>
                  <option value="운영중">운영중</option>
                  <option value="완료">완료</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-2 uppercase">PM / 감독</label>
                <div className="text-sm text-gray-700 dark:text-slate-300">
                  {(localProject as any).pm_name || '-'}
                </div>
              </div>
            </div>

            {/* Step Configuration */}
            <div>
              <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-3">
                <Settings size={18} /> 진행 단계 설정 (Step Config)
              </h3>
              <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-2 rounded-lg">
                {[
                  { id: 'plan' as ProjectStep, label: '기획' },
                  { id: 'script' as ProjectStep, label: '대본' },
                  { id: 'shoot' as ProjectStep, label: '촬영' },
                  { id: 'edit' as ProjectStep, label: '편집' }
                ].map(step => {
                  const isActive = localProject.active_steps?.includes(step.id);
                  return (
                    <button
                      key={step.id}
                      onClick={() => toggleStep(step.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-colors ${
                        isActive
                          ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 shadow-sm border border-gray-200 dark:border-slate-700'
                          : 'text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:bg-slate-700'
                      }`}
                    >
                      {isActive ? <CheckSquare size={16} className="text-blue-600" /> : <X size={16} />}
                      {step.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tasks Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckSquare size={18} /> 할 일 및 업무 분장 (Tasks)
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                    placeholder="새 할일 입력..."
                    className="text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddTask}
                    className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-700 flex items-center gap-1"
                  >
                    <Plus size={12} /> 할일 추가
                  </button>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-800 border rounded-xl overflow-hidden">
                {localTasks.length > 0 ? (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-400 font-medium">
                      <tr>
                        <th className="p-3 w-10"></th>
                        <th className="p-3">업무명 / 내용</th>
                        <th className="p-3 w-32">담당자</th>
                        <th className="p-3 w-32">마감일</th>
                        <th className="p-3 w-24">중요도</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {localTasks.map((task) => {
                        const isCompleted = task.status === 'done';
                        return (
                          <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900">
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleTaskChange(task.id, 'status', isCompleted ? 'todo' : 'done')}
                                className={`rounded-full w-5 h-5 flex items-center justify-center border transition-colors ${
                                  isCompleted
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'border-gray-300 dark:border-slate-700 hover:border-green-500'
                                }`}
                              >
                                {isCompleted && <CheckSquare size={12} />}
                              </button>
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={task.title}
                                onChange={(e) => handleTaskChange(task.id, 'title', e.target.value)}
                                className={`w-full bg-transparent border-none p-0 focus:ring-0 font-medium ${
                                  isCompleted ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-slate-200'
                                }`}
                                placeholder="업무명을 입력하세요"
                              />
                              <input
                                type="text"
                                value={(task as any).description || ''}
                                onChange={(e) => handleTaskChange(task.id, 'description', e.target.value)}
                                className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs text-gray-500 dark:text-slate-400 mt-0.5"
                                placeholder="상세 내용을 입력하세요"
                              />
                              {(task as any).step && (task as any).step !== 'manual' && (
                                <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mt-1 inline-block">
                                  {(task as any).step === 'plan' ? '기획' : (task as any).step === 'script' ? '대본' : (task as any).step === 'shoot' ? '촬영' : (task as any).step === 'edit' ? '편집' : '기타'}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <select
                                value={task.assignee || ''}
                                onChange={(e) => handleTaskChange(task.id, 'assignee', e.target.value)}
                                className="w-full text-xs border-gray-200 dark:border-slate-700 rounded p-1.5 bg-gray-50 dark:bg-slate-900 focus:border-blue-500"
                              >
                                <option value="">담당자 선택</option>
                                {allWorkers.map((w) => (
                                  <option key={w.id} value={w.name || ''}>
                                    {w.name || ''} {w.title ? `(${w.title})` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3">
                              <input
                                type="date"
                                value={task.dueDate || ''}
                                onChange={(e) => handleTaskChange(task.id, 'dueDate', e.target.value)}
                                className="w-full text-xs border-gray-200 dark:border-slate-700 rounded p-1.5 bg-gray-50 dark:bg-slate-900 focus:border-blue-500"
                              />
                            </td>
                            <td className="p-3">
                              <select
                                value={(task as any).priority || 'medium'}
                                onChange={(e) => handleTaskChange(task.id, 'priority', e.target.value)}
                                className={`w-full text-xs border-none rounded p-1.5 font-medium ${
                                  (task as any).priority === 'high'
                                    ? 'bg-red-50 text-red-600'
                                    : (task as any).priority === 'medium'
                                      ? 'bg-yellow-50 text-yellow-600'
                                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                                }`}
                              >
                                <option value="high">높음 (High)</option>
                                <option value="medium">중간 (Med)</option>
                                <option value="low">낮음 (Low)</option>
                              </select>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-sm bg-gray-50 dark:bg-slate-900">
                    등록된 할일이 없습니다. <br />진행 단계를 켜거나 '할일 추가' 버튼을 눌러보세요.
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Grid */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                <CalendarIcon size={18} /> 주요 일정 관리
              </h3>
              <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {/* Left Column: Pre-production */}
                  <div className="space-y-4">
                    {localProject.active_steps?.includes('plan') && (
                      <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">기획 확정 (D-11)</label>
                        <input
                          type="date"
                          value={localProject.plan_date || ''}
                          onChange={(e) => handleDateChange('plan_date', e.target.value)}
                          className="w-full text-sm border-gray-300 dark:border-slate-700 rounded-lg focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    )}
                    {localProject.active_steps?.includes('script') && (
                      <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">대본 확정 (D-9)</label>
                        <input
                          type="date"
                          value={localProject.script_date || ''}
                          onChange={(e) => handleDateChange('script_date', e.target.value)}
                          className="w-full text-sm border-gray-300 dark:border-slate-700 rounded-lg focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    )}
                    {localProject.active_steps?.includes('shoot') && (
                      <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">촬영 확정 (D-7)</label>
                        <input
                          type="date"
                          value={localProject.shoot_date || ''}
                          onChange={(e) => handleDateChange('shoot_date', e.target.value)}
                          className="w-full text-sm border-gray-300 dark:border-slate-700 rounded-lg focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Right Column: Post-production & Release */}
                  <div className="space-y-4">
                    {localProject.active_steps?.includes('edit') && (
                      <>
                        <div>
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">1차 편집 확정 (D-3)</label>
                          <input
                            type="date"
                            value={localProject.edit1_date || ''}
                            onChange={(e) => handleDateChange('edit1_date', e.target.value)}
                            className="w-full text-sm border-gray-300 dark:border-slate-700 rounded-lg focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">최종 편집 확정 (D-1)</label>
                          <input
                            type="date"
                            value={localProject.edit_final_date || ''}
                            onChange={(e) => handleDateChange('edit_final_date', e.target.value)}
                            className="w-full text-sm border-gray-300 dark:border-slate-700 rounded-lg focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                      </>
                    )}
                    <div className="bg-red-50 p-2 rounded-lg -mx-2">
                      <label className="text-xs font-bold text-red-600 block mb-1">
                        {isExternal ? '최종 납품 예정일' : '업로드 예정일'} (기준일)
                      </label>
                      <input
                        type="date"
                        value={localProject.release_date || ''}
                        onChange={(e) => handleDateChange('release_date', e.target.value)}
                        className="w-full text-sm border-red-300 rounded-lg focus:ring-red-500 focus:border-red-500 font-bold text-red-700"
                      />
                      <p className="text-[10px] text-red-500 mt-1">* 날짜 변경 시 D-Day 역산하여 전체 일정 자동 조정</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Asset Management */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                <FileText size={18} /> 제작 자산 관리
              </h3>
              <div className="border rounded-xl divide-y">
                {localProject.active_steps?.includes('script') && (
                  <div className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          localProject.assets?.script?.status === 'completed'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">대본 (Script)</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {localProject.assets?.script?.version || '미등록'}
                          {localProject.assets?.script?.status === 'completed' && ' • 최종확인됨'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-xs bg-white dark:bg-slate-800 border px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900">보기</button>
                      <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 dark:hover:bg-blue-800">업로드</button>
                    </div>
                  </div>
                )}

                {localProject.active_steps?.includes('edit') && (
                  <div className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          localProject.assets?.video?.status === 'completed'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        <PlayCircle size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">최종 편집본 (Master)</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {localProject.assets?.video?.version || '편집중'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-xs bg-white dark:bg-slate-800 border px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900">링크</button>
                      <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 dark:hover:bg-blue-800">등록</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900">
              닫기
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 dark:hover:bg-red-800">
              변경사항 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditProjectModal({
  project,
  bu,
  clients,
  orgMembers,
  appUsers,
  channels,
  onClose,
  onSubmit,
  onOpenClientModal,
  onOpenEditClientModal,
  onDeleteClient,
}: {
  project: any;
  bu: BU;
  clients: Client[];
  orgMembers: any[];
  appUsers: any[];
  channels: Channel[];
  onClose: () => void;
  onSubmit: (data: {
    bu: BU;
    name: string;
    cat: string;
    startDate: string;
    endDate: string;
    status: string;
    client_id?: number;
    pm_name?: string | null;
    active_steps?: ProjectStep[];
    release_date?: string | null;
    plan_date?: string | null;
    script_date?: string | null;
    shoot_date?: string | null;
    edit1_date?: string | null;
    edit_final_date?: string | null;
  }) => void;
  onOpenClientModal: () => void;
  onOpenEditClientModal: (client: Client) => void;
  onDeleteClient: (clientId: number) => void;
}) {
  const isExternal = !!(project as any).client_id;
  const [form, setForm] = useState({
    projectType: isExternal ? 'external' as 'channel' | 'external' : 'channel' as 'channel' | 'external',
    name: project.name,
    cat: project.cat,
    channel_id: isExternal ? '' : String(channels.find((c) => c.name === project.cat)?.id || ''),
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
    client_id: String((project as any).client_id || ''),
    pm_name: (project as any).pm_name || '',
    active_steps: (project as any).active_steps || [] as ProjectStep[],
    plan_date: (project as any).plan_date || null,
    script_date: (project as any).script_date || null,
    shoot_date: (project as any).shoot_date || null,
    edit1_date: (project as any).edit1_date || null,
    edit_final_date: (project as any).edit_final_date || null,
    release_date: (project as any).release_date || null,
    assets: (project as any).assets || {} as ProjectAssets,
  });

  // D-Day 변경 시 자동 계산
  const handleReleaseDateChange = (releaseDate: string) => {
    const calculatedDates = calculateDatesFromRelease(releaseDate);
    setForm((prev) => ({
      ...prev,
      release_date: releaseDate,
      ...calculatedDates,
    }));
  };

  // 단계 토글
  const toggleStep = (step: ProjectStep) => {
    const currentSteps = form.active_steps || [];
    const newSteps = currentSteps.includes(step)
      ? currentSteps.filter((s) => s !== step)
      : [...currentSteps, step];
    setForm((prev) => ({ ...prev, active_steps: newSteps }));
  };

  const selectedClient = form.client_id ? clients.find((c) => c.id === Number(form.client_id)) : null;
  const selectedChannel = form.channel_id ? channels.find((c) => c.id === Number(form.channel_id)) : null;
  const buChannels = channels.filter((c) => c.bu_code === bu);

  return (
    <ModalShell
      title="프로젝트 수정"
      onClose={onClose}
      actions={
        <ModalActions
          onPrimary={() =>
            onSubmit({
              bu,
              name: form.name,
              cat: form.cat || (selectedChannel?.name || ''),
              startDate: form.startDate,
              endDate: form.release_date || form.endDate,
              status: form.status,
              client_id: form.client_id ? Number(form.client_id) : undefined,
              pm_name: form.pm_name || null,
              active_steps: form.active_steps,
              plan_date: form.plan_date,
              script_date: form.script_date,
              shoot_date: form.shoot_date,
              edit1_date: form.edit1_date,
              edit_final_date: form.edit_final_date,
              release_date: form.release_date,
            })
          }
          onClose={onClose}
          primaryLabel="수정"
        />
      }
    >
      {/* 프로젝트 타입 표시 (수정 모드에서는 읽기 전용) */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-2 block">프로젝트 유형</label>
        <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-2 rounded-lg">
          <div className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold ${
            form.projectType === 'channel'
              ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 shadow-sm border border-gray-200 dark:border-slate-700'
              : 'text-gray-400 dark:text-slate-500'
          }`}>
            <Youtube className="w-4 h-4" />
            채널 프로젝트
          </div>
          <div className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold ${
            form.projectType === 'external'
              ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 shadow-sm border border-gray-200 dark:border-slate-700'
              : 'text-gray-400 dark:text-slate-500'
          }`}>
            <Briefcase className="w-4 h-4" />
            외주 프로젝트
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* 채널 프로젝트인 경우 */}
        {form.projectType === 'channel' && (
          <div className="md:col-span-2">
            <SelectField
              label="채널 선택"
              value={form.channel_id}
              onChange={(val) => {
                const channel = channels.find((c) => c.id === Number(val));
                setForm((prev) => ({
                  ...prev,
                  channel_id: val,
                  cat: channel?.name || prev.cat,
                }));
              }}
              options={[
                { value: '', label: '채널을 선택하세요' },
                ...buChannels.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
            />
          </div>
        )}

        {/* 외주 프로젝트인 경우 */}
        {form.projectType === 'external' && (
          <div className="md:col-span-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SelectField
                  label="클라이언트"
                  value={form.client_id}
                  onChange={(val) => setForm((prev) => ({ ...prev, client_id: val }))}
                  options={[
                    { value: '', label: '클라이언트를 선택하세요' },
                    ...clients.map((c) => ({ value: String(c.id), label: c.company_name_ko || c.company_name_en || '' })),
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
                      className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
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
        )}

        <InputField
          label="카테고리"
          placeholder={form.projectType === 'channel' ? '채널 선택 시 자동 입력' : '예: 안무제작'}
          value={form.cat}
          onChange={(v) => setForm((prev) => ({ ...prev, cat: v }))}
          disabled={form.projectType === 'channel' && !!form.channel_id}
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
        <SelectField
          label="PM / 감독"
          value={form.pm_name}
          onChange={(val) => setForm((prev) => ({ ...prev, pm_name: val }))}
          options={[
            { value: '', label: '선택 안함' },
            ...appUsers.map((u) => ({ value: u.name || '', label: u.name || '' })).filter((o) => o.value),
          ]}
        />
      </div>
      {/* 진행 단계 설정 */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
        <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4" /> 진행 단계 설정
        </h3>
        <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-2 rounded-lg">
          {[
            { id: 'plan' as ProjectStep, label: '기획' },
            { id: 'script' as ProjectStep, label: '대본' },
            { id: 'shoot' as ProjectStep, label: '촬영' },
            { id: 'edit' as ProjectStep, label: '편집' }
          ].map(step => {
            const isActive = form.active_steps?.includes(step.id);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => toggleStep(step.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 shadow-sm border border-gray-200 dark:border-slate-700'
                    : 'text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:bg-slate-700'
                }`}
              >
                {isActive ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <X className="w-4 h-4" />}
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 주요 일정 관리 */}
      {form.active_steps && form.active_steps.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-3">
            <CalendarIcon className="w-4 h-4" /> 주요 일정 관리
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              {form.active_steps.includes('plan') && (
                <InputField
                  label="기획 확정 (D-11)"
                  type="date"
                  value={form.plan_date || ''}
                  onChange={(v) => setForm((prev) => ({ ...prev, plan_date: v || null }))}
                />
              )}
              {form.active_steps.includes('script') && (
                <InputField
                  label="대본 확정 (D-9)"
                  type="date"
                  value={form.script_date || ''}
                  onChange={(v) => setForm((prev) => ({ ...prev, script_date: v || null }))}
                />
              )}
              {form.active_steps.includes('shoot') && (
                <InputField
                  label="촬영 확정 (D-7)"
                  type="date"
                  value={form.shoot_date || ''}
                  onChange={(v) => setForm((prev) => ({ ...prev, shoot_date: v || null }))}
                />
              )}
            </div>
            <div className="space-y-3">
              {form.active_steps.includes('edit') && (
                <>
                  <InputField
                    label="1차 편집 확정 (D-3)"
                    type="date"
                    value={form.edit1_date || ''}
                    onChange={(v) => setForm((prev) => ({ ...prev, edit1_date: v || null }))}
                  />
                  <InputField
                    label="최종 편집 확정 (D-1)"
                    type="date"
                    value={form.edit_final_date || ''}
                    onChange={(v) => setForm((prev) => ({ ...prev, edit_final_date: v || null }))}
                  />
                </>
              )}
              <div className="bg-red-50 p-3 rounded-lg">
                <InputField
                  label={`${form.client_id ? '최종 납품' : '업로드'} 예정일 (기준일)`}
                  type="date"
                  value={form.release_date || ''}
                  onChange={(v) => handleReleaseDateChange(v)}
                />
                <p className="text-[10px] text-red-500 mt-1">* 날짜 변경 시 D-Day 역산하여 전체 일정 자동 조정</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 제작 자산 관리 */}
      {form.active_steps && form.active_steps.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4" /> 제작 자산 관리
          </h3>
          <div className="space-y-2">
            {form.active_steps.includes('script') && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                  <div>
                    <p className="font-medium text-sm">대본 (Script)</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {form.assets?.script?.version || '미등록'}
                      {form.assets?.script?.status === 'completed' && ' • 최종확인됨'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs bg-white dark:bg-slate-800 border px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900"
                  >
                    보기
                  </button>
                  <button
                    type="button"
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
                  >
                    업로드
                  </button>
                </div>
              </div>
            )}
            {form.active_steps.includes('edit') && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <PlayCircle className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                  <div>
                    <p className="font-medium text-sm">최종 편집본 (Master)</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {form.assets?.video?.version || '편집중'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs bg-white dark:bg-slate-800 border px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-slate-900 dark:hover:bg-slate-900"
                  >
                    링크
                  </button>
                  <button
                    type="button"
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
                  >
                    등록
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

function TaskDetailModal({
  task,
  projects,
  onClose,
  onEdit,
}: {
  task: any;
  projects: any[];
  onClose: () => void;
  onEdit: (task: any) => void;
}) {
  const relatedProject = projects.find((p) => p.id === task.projectId);
  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'done';

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo':
        return '할 일';
      case 'in-progress':
        return '진행 중';
      case 'done':
        return '완료';
      default:
        return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-600';
      case 'done':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'high':
        return '높음';
      case 'medium':
        return '중간';
      case 'low':
        return '낮음';
      default:
        return '미설정';
    }
  };

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-600 border-red-100';
      case 'medium':
        return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'low':
        return 'bg-green-50 text-green-600 border-green-100';
      default:
        return 'bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-100 dark:border-slate-700';
    }
  };

  return (
    <ModalShell title="할일 상세보기" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusBadgeClass(task.status))}>
              {getStatusLabel(task.status)}
            </span>
            {task.priority && (
              <span className={cn('text-xs px-2 py-0.5 rounded font-medium border', getPriorityBadgeClass(task.priority))}>
                우선순위: {getPriorityLabel(task.priority)}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">제목</label>
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{task.title}</p>
          </div>

          {relatedProject && (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">프로젝트</label>
              <p className="text-sm text-gray-800 dark:text-slate-200">{relatedProject.name}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {task.assignee && (
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">담당자</label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <p className="text-sm text-gray-800 dark:text-slate-200">{task.assignee}</p>
                </div>
              </div>
            )}

            {task.dueDate && (
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">마감일</label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <p className={cn('text-sm', isOverdue ? 'text-red-600 font-semibold' : 'text-gray-800 dark:text-slate-200')}>
                    {new Date(task.dueDate).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {isOverdue && ' (지연)'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {task.tag && (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">태그</label>
              <span className="inline-block px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded">
                {task.tag}
              </span>
            </div>
          )}
        </div>
      </div>
      <ModalActions
        onPrimary={() => {
          onClose();
          onEdit(task);
        }}
        onClose={onClose}
        primaryLabel="수정하기"
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
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
          {form.upload_days.length > 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
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
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700'
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
          {form.upload_days.length > 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
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
  contents,
  onClose,
}: {
  channel: Channel;
  contents: ChannelContent[];
  onClose: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [episodeTodos, setEpisodeTodos] = useState<
    Record<
      number,
      {
        id: string;
        title: string;
        dueDate: string;
        done: boolean;
      }[]
    >
  >({});
  const [newTodoDraft, setNewTodoDraft] = useState<
    Record<
      number,
      {
        title: string;
        dueDate: string;
      }
    >
  >({});

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

  const contentsThisMonth = contents.filter((content) => {
    const date = new Date(content.upload_date);
    return (
      date.getFullYear() === currentMonth.getFullYear() &&
      date.getMonth() === currentMonth.getMonth()
    );
  });

  const handleAddTodo = (contentId: number) => {
    const draft = newTodoDraft[contentId];
    if (!draft?.title || !draft?.dueDate) return;

    setEpisodeTodos((prev) => {
      const prevList = prev[contentId] ?? [];
      return {
        ...prev,
        [contentId]: [
          ...prevList,
          {
            id: `${contentId}-${Date.now()}`,
            title: draft.title,
            dueDate: draft.dueDate,
            done: false,
          },
        ],
      };
    });

    setNewTodoDraft((prev) => ({
      ...prev,
      [contentId]: { title: '', dueDate: '' },
    }));
  };

  const handleToggleTodo = (contentId: number, todoId: string) => {
    setEpisodeTodos((prev) => {
      const list = prev[contentId] ?? [];
      return {
        ...prev,
        [contentId]: list.map((todo) =>
          todo.id === todoId ? { ...todo, done: !todo.done } : todo,
        ),
      };
    });
  };

  return (
    <ModalShell title={`${channel.name} 상세보기`} onClose={onClose}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">채널명</p>
            <p className="text-sm font-bold text-gray-900">{channel.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">제작사</p>
            <p className="text-sm text-gray-900">{channel.production_company || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">구독자 수</p>
            <p className="text-sm text-gray-900">{channel.subscribers_count || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">담당자</p>
            <p className="text-sm text-gray-900">{channel.manager_name || '-'}</p>
          </div>
          {channel.upload_days && channel.upload_days.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">업로드 구좌</p>
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

        <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200">
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                  )
                }
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                  )
                }
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="grid grid-cols-7 mb-2 border-b border-gray-200 dark:border-slate-700 pb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    'text-center text-sm font-semibold',
                    i === 0 ? 'text-red-500' : 'text-gray-500 dark:text-slate-400'
                  )}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-gray-50 dark:bg-slate-900/50 rounded-lg h-12"></div>
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
                      'border border-gray-100 dark:border-slate-700 rounded-lg p-2 min-h-[48px] flex flex-col items-center justify-center relative',
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
                            : 'text-gray-700 dark:text-slate-300'
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

        <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200">회차별 업로드 일정 & 할일</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              업로드 예정일(회차)을 기준으로 간단한 체크리스트를 관리할 수 있습니다. (화면 단위 저장)
            </p>
          </div>

          {contentsThisMonth.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
              이번 달에 등록된 업로드 예정 회차가 없습니다. 채널 카드에서 &quot;새 콘텐츠 기획 추가&quot;를
              통해 회차를 먼저 등록해 주세요.
            </div>
          ) : (
            <div className="space-y-3">
              {contentsThisMonth
                .sort(
                  (a, b) =>
                    new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime(),
                )
                .map((content) => {
                  const todos = episodeTodos[content.id as number] ?? [];
                  const draft = newTodoDraft[content.id as number] ?? {
                    title: '',
                    dueDate: '',
                  };
                  const dDay = Math.ceil(
                    (new Date(content.upload_date).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24),
                  );

                  return (
                    <div
                      key={content.id}
                      className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500">
                            {content.upload_date}
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {content.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                            {content.stage === 'planning'
                              ? '기획'
                              : content.stage === 'shooting'
                              ? '촬영'
                              : content.stage === 'editing'
                              ? '편집'
                              : '업로드 완료'}
                          </span>
                          <span className="text-gray-400 dark:text-slate-500">
                            {dDay > 0 ? `D-${dDay}` : `업로드일: ${content.upload_date}`}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {todos.length > 0 && (
                          <div className="space-y-1 rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2">
                            {todos.map((todo) => (
                              <button
                                key={todo.id}
                                type="button"
                                onClick={() =>
                                  handleToggleTodo(content.id as number, todo.id)
                                }
                                className="flex w-full items-center justify-between text-left text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      'inline-flex h-4 w-4 items-center justify-center rounded border',
                                      todo.done
                                        ? 'border-indigo-500 bg-indigo-500 text-white'
                                        : 'border-slate-300 bg-white dark:bg-slate-800 text-transparent',
                                    )}
                                  >
                                    ✓
                                  </span>
                                  <span
                                    className={cn(
                                      'font-medium',
                                      todo.done
                                        ? 'text-slate-400 dark:text-slate-500 line-through'
                                        : 'text-slate-800 dark:text-slate-200',
                                    )}
                                  >
                                    {todo.title}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                  {todo.dueDate}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:bg-slate-900 p-2 text-[11px] md:flex-row md:items-center">
                          <input
                            type="text"
                            placeholder="예: 대본 확정, 촬영 스케줄 조율"
                            value={draft.title}
                            onChange={(e) =>
                              setNewTodoDraft((prev) => ({
                                ...prev,
                                [content.id as number]: {
                                  ...(prev[content.id as number] ?? {
                                    title: '',
                                    dueDate: '',
                                  }),
                                  title: e.target.value,
                                },
                              }))
                            }
                            className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] focus:border-indigo-500 focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={draft.dueDate}
                              onChange={(e) =>
                                setNewTodoDraft((prev) => ({
                                  ...prev,
                                  [content.id as number]: {
                                    ...(prev[content.id as number] ?? {
                                      title: '',
                                      dueDate: '',
                                    }),
                                    dueDate: e.target.value,
                                  },
                                }))
                              }
                              className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] focus:border-indigo-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddTodo(content.id as number)}
                              className="whitespace-nowrap rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
                            >
                              할일 추가
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
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



