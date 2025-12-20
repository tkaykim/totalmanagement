'use client';

import { useState, useMemo, useEffect } from 'react';
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
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useCreateTask,
  useUpdateTask,
  useCreateFinancialEntry,
  useUpdateFinancialEntry,
  useDeleteFinancialEntry,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
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
  useCreateOrgMember,
  useUpdateOrgMember,
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
  | 'manuals';

interface ReactStudioDashboardProps {
  bu: BU;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'In Production': 'bg-blue-100 text-blue-800 border-blue-200',
    'Pre-Production': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Post-Production': 'bg-purple-100 text-purple-800 border-purple-200',
    'Completed': 'bg-gray-100 text-gray-800 border-gray-200',
    'Planning': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Available': 'bg-green-100 text-green-800 border-green-200',
    'Rented': 'bg-red-100 text-red-800 border-red-200',
    'Maintenance': 'bg-orange-100 text-orange-800 border-orange-200',
    'Paid': 'bg-green-100 text-green-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Overdue': 'bg-red-100 text-red-800',
    'Approved': 'bg-blue-100 text-blue-800',
    'Active': 'bg-green-100 text-green-800',
    'On Set': 'bg-red-100 text-red-800',
    'Busy': 'bg-orange-100 text-orange-800',
    'Inactive': 'bg-gray-100 text-gray-500',
    'Growing': 'bg-purple-100 text-purple-800 border-purple-200',
  };

  return (
    <span
      className={cn(
        'px-2.5 py-0.5 rounded-full text-xs font-medium border',
        styles[status] || 'bg-gray-100 text-gray-800'
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
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-50 rounded-lg">
          <Icon className="w-6 h-6 text-slate-700" />
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

export default function ReactStudioDashboard({ bu }: ReactStudioDashboardProps) {
  const [activeTab, setActiveTab] = useState<ReactStudioView>('dashboard');

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
  const { data: channelsData = [] } = useChannels(bu);
  const { data: channelContentsData = [] } = useChannelContents();
  const { data: eventsData = [] } = useEvents(bu);
  const { data: manualsData = [] } = useManuals(bu);
  const { data: orgData = [] } = useOrgMembers();

  // Mutation hooks
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  // Note: useDeleteTask hook not available, using updateTaskMutation for now
  const createFinancialMutation = useCreateFinancialEntry();
  const updateFinancialMutation = useUpdateFinancialEntry();
  const deleteFinancialMutation = useDeleteFinancialEntry();
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();
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
  const createOrgMemberMutation = useCreateOrgMember();
  const updateOrgMemberMutation = useUpdateOrgMember();

  // Modal states
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setEditProjectModalOpen] = useState<any>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setEditTaskModalOpen] = useState<any>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [isEditClientModalOpen, setEditClientModalOpen] = useState<Client | null>(null);
  const [deleteClientId, setDeleteClientId] = useState<number | null>(null);
  const [isEquipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [isEditEquipmentModalOpen, setEditEquipmentModalOpen] = useState<Equipment | null>(null);
  const [deleteEquipmentId, setDeleteEquipmentId] = useState<number | null>(null);
  const [isChannelModalOpen, setChannelModalOpen] = useState(false);
  const [isEditChannelModalOpen, setEditChannelModalOpen] = useState<Channel | null>(null);
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

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'projects', label: '프로젝트 관리', icon: Clapperboard },
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
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

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
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

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">할 일</h3>
              <button
                onClick={() => setTaskModalOpen(true)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="space-y-3">
              {activeTasks.filter((t) => t.status !== 'done').length > 0 ? (
                activeTasks
                  .filter((t) => t.status !== 'done')
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
    const [viewMode, setViewMode] = useState<'client' | 'channel'>('client');
    const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
    const buProjects = projects.filter((p) => p.bu === bu);
    const buChannels = channelsData.filter((c) => c.bu_code === bu);

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit mb-2">
          <button
            onClick={() => setViewMode('client')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'client'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Client Work (외주)
          </button>
          <button
            onClick={() => setViewMode('channel')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'channel'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Channel Ops (자체 채널)
          </button>
        </div>

        {viewMode === 'client' ? (
          <>
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm gap-4">
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

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
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
                            {projectClient?.name || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 flex items-center">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 mr-2 border border-slate-200">
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
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {buChannels.map((channel) => {
              const channelContents = channelContentsData.filter((cc) => cc.channel_id === channel.id);
              return (
                <div
                  key={channel.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full"
                >
                  <div className="p-6 border-b border-gray-100">
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
                              className="text-xs text-gray-400 hover:text-indigo-600 flex items-center mt-1"
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
                            setEditChannelModalOpen(channel);
                          }}
                          className="text-gray-400 hover:text-indigo-600"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteChannelId(channel.id);
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">구독자 수</p>
                        <p className="text-lg font-bold text-gray-800">
                          {channel.subscribers_count || '0'}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">총 조회수</p>
                        <p className="text-lg font-bold text-gray-800">
                          {channel.total_views || '0'}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 flex items-center justify-between">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        담당: {channel.manager_name || '-'}
                      </div>
                      {channel.next_upload_date && (
                        <div className="flex items-center">
                          <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                          다음 업로드:{' '}
                          <span className="font-bold text-indigo-600 ml-1">
                            {channel.next_upload_date}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 bg-gray-50 p-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
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
                            className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm"
                          >
                            <div className="flex-1">
                              <div className="flex items-center mb-1">
                                <span
                                  className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded mr-2 border',
                                    content.stage === 'uploaded'
                                      ? 'bg-gray-100 text-gray-500 border-gray-200'
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
                                <span className="text-sm font-medium text-gray-800 truncate">
                                  {content.title}
                                </span>
                              </div>
                              <div className="flex items-center text-xs text-gray-400">
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
                        className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
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
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">가용 장비</p>
              <p className="text-xl font-bold text-green-600">{availablePercent}%</p>
            </div>
            <CheckSquare className="w-8 h-8 text-green-100" />
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">대여 중 (현장)</p>
              <p className="text-xl font-bold text-indigo-600">{rentedPercent}%</p>
            </div>
            <Camera className="w-8 h-8 text-indigo-100" />
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">수리 / 분실</p>
              <p className="text-xl font-bold text-red-600">{maintenancePercent}%</p>
            </div>
            <Settings className="w-8 h-8 text-red-100" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
                className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
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
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
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
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
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

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
    const buOrgMembers = useMemo(() => {
      const allMembers: any[] = [];
      orgData.forEach((unit) => {
        (unit.members || []).forEach((m: any) => {
          if (m.bu_code === bu || !m.bu_code) {
            allMembers.push({ ...m, orgUnitName: unit.name });
          }
        });
      });
      return allMembers;
    }, [orgData, bu]);

    const toggleExpand = (id: number) => {
      setExpandedId(expandedId === id ? null : id);
    };

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800">인력 풀 (Internal & Freelance)</h3>
          <button
            onClick={() => setStaffModalOpen(true)}
            className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" /> 스태프 등록
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="hidden md:flex bg-gray-50 border-b border-gray-200 px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
            <div className="flex-1">이름 / 역할</div>
            <div className="w-32">소속</div>
            <div className="w-40">연락처</div>
            <div className="w-24">상태</div>
            <div className="w-10"></div>
          </div>

          <div className="divide-y divide-gray-100">
            {buOrgMembers.map((staff) => (
              <div key={staff.id} className="group">
                <div
                  onClick={() => toggleExpand(staff.id)}
                  className={cn(
                    'px-6 py-4 flex flex-col md:flex-row md:items-center cursor-pointer hover:bg-gray-50 transition-colors',
                    expandedId === staff.id ? 'bg-gray-50' : ''
                  )}
                >
                  <div className="flex-1 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 mr-3 border border-slate-200">
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{staff.name}</div>
                      {staff.title && <div className="text-sm text-gray-500">{staff.title}</div>}
                    </div>
                  </div>

                  <div className="mt-2 md:mt-0 w-full md:w-32 flex items-center">
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs',
                        staff.orgUnitName?.includes('Internal') || !staff.orgUnitName
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-orange-50 text-orange-700'
                      )}
                    >
                      {staff.orgUnitName?.includes('Internal') || !staff.orgUnitName
                        ? '정규직'
                        : '프리랜서'}
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
                  <div className="px-6 pb-6 pt-2 bg-gray-50 border-t border-gray-100 animate-fade-in">
                    <div className="ml-0 md:ml-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        {staff.email && (
                          <div className="flex items-center text-sm text-gray-700">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" /> {staff.email}
                          </div>
                        )}
                      </div>
                      <div className="flex items-end justify-start md:justify-end gap-2 mt-4 md:mt-0">
                        <button 
                          onClick={() => setEditStaffModalOpen(staff)}
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
                        >
                          프로필 수정
                        </button>
                        <button className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                          급여/정산 내역
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
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
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
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
            <button className="px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
              월간
            </button>
            <button className="px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
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
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4 overflow-hidden flex flex-col">
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

          <div className="w-full lg:w-80 bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col overflow-hidden">
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
    const buClients = clientsData.filter((c) => c.bu_code === bu);

    const toggleExpand = (id: number) => {
      setExpandedId(expandedId === id ? null : id);
    };

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="클라이언트 검색..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
          <button
            onClick={() => setClientModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" /> 클라이언트 등록
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="hidden md:flex bg-gray-50 border-b border-gray-200 px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
            <div className="flex-1">클라이언트 / 업종</div>
            <div className="w-40">담당자</div>
            <div className="w-32">상태</div>
            <div className="w-10"></div>
          </div>

          <div className="divide-y divide-gray-100">
            {buClients.length > 0 ? (
              buClients.map((client) => {
                const clientProjects = projects.filter((p) => (p as any).client_id === client.id);
                const clientRevenues = financials.filter(
                  (f) => clientProjects.some((p) => p.id === f.projectId) && f.type === 'revenue'
                );
                const totalSpent = clientRevenues.reduce((sum, r) => sum + r.amount, 0);

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
                          {client.name.substring(0, 1)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{client.name}</h3>
                          <p className="text-xs text-gray-500">{client.industry || '-'}</p>
                        </div>
                      </div>

                      <div className="mt-2 md:mt-0 w-full md:w-40 text-sm text-gray-600 flex items-center">
                        <User className="w-3 h-3 mr-2 text-gray-400" />{' '}
                        {client.contact_person || '-'}
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
                              연락처 정보
                            </h4>
                            {client.phone && (
                              <div className="flex items-center text-sm text-gray-700">
                                <Phone className="w-4 h-4 mr-2 text-gray-400" /> {client.phone}
                              </div>
                            )}
                            {client.email && (
                              <div className="flex items-center text-sm text-gray-700">
                                <Mail className="w-4 h-4 mr-2 text-gray-400" /> {client.email}
                              </div>
                            )}
                            {client.address && (
                              <div className="flex items-center text-sm text-gray-700">
                                <MapPin className="w-4 h-4 mr-2 text-gray-400" /> {client.address}
                              </div>
                            )}
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
                            {client.last_meeting_date && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">최근 미팅</span>
                                <span>{client.last_meeting_date}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col justify-end items-start md:items-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditClientModalOpen(client);
                              }}
                              className="w-full md:w-auto px-4 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors text-gray-700"
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
                등록된 클라이언트가 없습니다.
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
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
          <h2 className="text-lg font-bold text-gray-800">업무 현황 (Kanban)</h2>
          <div className="flex space-x-2">
            <button className="flex items-center px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
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
                className="flex-1 flex flex-col bg-slate-100 rounded-xl max-w-xs sm:max-w-sm shrink-0"
              >
                <div className="p-3 font-semibold text-gray-700 flex justify-between items-center border-b border-slate-200/50">
                  {column.title}
                  <span className="bg-slate-200 text-xs px-2 py-0.5 rounded-full text-slate-600">
                    {column.items.length}
                  </span>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                  {column.items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
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
                          <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 opacity-0 group-hover/menu:opacity-100 transition-opacity pointer-events-none group-hover/menu:pointer-events-auto min-w-[120px]">
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
    const [selectedManualId, setSelectedManualId] = useState<number | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const buManuals = manualsData.filter((m) => m.bu_code === bu);

    const categories = ['All', 'Onboarding', 'Tech', 'Production', 'Admin'];
    const filteredManuals =
      activeCategory === 'All'
        ? buManuals
        : buManuals.filter((m) => m.category === activeCategory);

    const selectedManual =
      buManuals.find((m) => m.id === selectedManualId) || buManuals[0] || null;

    return (
      <div className="h-full flex flex-col md:flex-row gap-6 animate-fade-in overflow-hidden">
        <div className="w-full md:w-72 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="문서 검색..."
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    activeCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {cat === 'All'
                    ? '전체'
                    : cat === 'Onboarding'
                      ? '온보딩'
                      : cat === 'Tech'
                        ? '장비'
                        : cat === 'Production'
                          ? '제작'
                          : '행정'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredManuals.length > 0 ? (
              filteredManuals.map((manual) => (
                <div
                  key={manual.id}
                  onClick={() => setSelectedManualId(manual.id)}
                  className={cn(
                    'p-4 border-b border-gray-50 cursor-pointer transition-colors',
                    selectedManualId === manual.id
                      ? 'bg-indigo-50 border-l-4 border-l-indigo-600'
                      : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                  )}
                >
                  <h4
                    className={cn(
                      'text-sm font-semibold mb-1',
                      selectedManualId === manual.id ? 'text-indigo-900' : 'text-gray-800'
                    )}
                  >
                    {manual.title}
                  </h4>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{manual.category}</span>
                    <span>{new Date(manual.updated_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">
                등록된 문서가 없습니다.
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setManualModalOpen(true)}
              className="w-full flex items-center justify-center py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> 새 문서 작성
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {selectedManual ? (
            <>
              <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-white">
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

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-white">
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">문서를 선택해주세요</p>
              </div>
            </div>
          )}
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
    <div className="flex h-full bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl flex-shrink-0 z-20">
        <div className="p-6 flex items-center space-x-2 border-b border-slate-800 h-16">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="font-bold text-white">R</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">React Studio</h1>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ReactStudioView)}
              className={cn(
                'w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 group relative',
                activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0 mr-3" />
              <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
        <header className="bg-white border-b border-gray-200 shadow-sm z-10">
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

              {/* Conditional selection UI */}
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
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">{renderView()}</div>
        </main>
      </div>

      {/* Modals */}
      {isProjectModalOpen && (
        <CreateProjectModal
          bu={bu}
          onClose={() => setProjectModalOpen(false)}
          onSubmit={async (data) => {
            try {
              await createProjectMutation.mutateAsync({
                ...frontendProjectToDb(data),
                client_id: data.client_id,
              } as any);
              setProjectModalOpen(false);
            } catch (error) {
              console.error('Failed to create project:', error);
            }
          }}
        />
      )}
      {isEditProjectModalOpen && (
        <EditProjectModal
          project={isEditProjectModalOpen}
          bu={bu}
          clients={clientsData}
          onClose={() => setEditProjectModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await updateProjectMutation.mutateAsync({
                id: Number(isEditProjectModalOpen.id),
                data: {
                  ...frontendProjectToDb(data),
                  client_id: data.client_id,
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
          onClose={() => setTaskModalOpen(false)}
          onSubmit={async (data) => {
            try {
              await createTaskMutation.mutateAsync({
                ...frontendTaskToDb(data),
                priority: data.priority || 'medium',
                tag: data.tag,
              } as any);
              setTaskModalOpen(false);
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
              // Delete task by updating status to 'deleted' or using API if available
              // For now, we'll use updateTaskMutation to mark as deleted
              await updateTaskMutation.mutateAsync({
                id: deleteTaskId,
                data: { status: 'done' } as any, // Temporary: mark as done instead of delete
              });
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
          orgUnits={orgData.map((unit) => ({ id: unit.id, name: unit.name }))}
          onClose={() => setStaffModalOpen(false)}
          onSubmit={async (data) => {
            try {
              await createOrgMemberMutation.mutateAsync({
                org_unit_id: data.org_unit_id,
                name: data.name,
                title: data.title,
                bu_code: data.bu_code || bu,
                phone: data.phone,
                email: data.email,
                is_active: data.is_active,
                is_leader: data.is_leader,
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
          orgUnits={orgData.map((unit) => ({ id: unit.id, name: unit.name }))}
          onClose={() => setEditStaffModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await updateOrgMemberMutation.mutateAsync({
                id: isEditStaffModalOpen.id,
                data: {
                  org_unit_id: data.org_unit_id,
                  name: data.name,
                  title: data.title,
                  bu_code: data.bu_code || bu,
                  phone: data.phone,
                  email: data.email,
                  is_active: data.is_active,
                  is_leader: data.is_leader,
                },
              });
              setEditStaffModalOpen(null);
            } catch (error) {
              console.error('Failed to update staff:', error);
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
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-container active fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
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

  if (type === 'textarea') {
    return (
      <label className="space-y-1 text-sm font-semibold text-slate-700">
        <span className="text-xs text-slate-500">{label}</span>
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
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
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-slate-600">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
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
  onClose,
  onSubmit,
}: {
  bu: BU;
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
}) {
  const [form, setForm] = useState({
    name: '',
    cat: '',
    startDate: '',
    endDate: '',
    status: '준비중',
    client_id: '',
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
}) {
  const [form, setForm] = useState({
    name: project.name,
    cat: project.cat,
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
    client_id: String((project as any).client_id || ''),
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
    name: '',
    industry: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    status: 'active' as 'active' | 'growing' | 'inactive' | 'archived',
    last_meeting_date: '',
  });

  return (
    <ModalShell title="클라이언트 등록" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="클라이언트명"
          placeholder="클라이언트 이름"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="업종"
          placeholder="예: 엔터테인먼트"
          value={form.industry}
          onChange={(v) => setForm((prev) => ({ ...prev, industry: v }))}
        />
        <InputField
          label="담당자"
          placeholder="담당자 이름"
          value={form.contact_person}
          onChange={(v) => setForm((prev) => ({ ...prev, contact_person: v }))}
        />
        <InputField
          label="전화번호"
          placeholder="010-0000-0000"
          value={form.phone}
          onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
        />
        <InputField
          label="이메일"
          type="email"
          placeholder="email@example.com"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <InputField
          label="주소"
          placeholder="주소"
          value={form.address}
          onChange={(v) => setForm((prev) => ({ ...prev, address: v }))}
        />
        <InputField
          label="최근 미팅일"
          type="date"
          value={form.last_meeting_date}
          onChange={(v) => setForm((prev) => ({ ...prev, last_meeting_date: v }))}
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
      <ModalActions
        onPrimary={() => onSubmit({ ...form, bu_code: bu } as any)}
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
    name: client.name,
    industry: client.industry || '',
    contact_person: client.contact_person || '',
    phone: client.phone || '',
    email: client.email || '',
    address: client.address || '',
    status: client.status,
    last_meeting_date: client.last_meeting_date || '',
  });

  return (
    <ModalShell title="클라이언트 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="클라이언트명"
          placeholder="클라이언트 이름"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="업종"
          placeholder="예: 엔터테인먼트"
          value={form.industry}
          onChange={(v) => setForm((prev) => ({ ...prev, industry: v }))}
        />
        <InputField
          label="담당자"
          placeholder="담당자 이름"
          value={form.contact_person}
          onChange={(v) => setForm((prev) => ({ ...prev, contact_person: v }))}
        />
        <InputField
          label="전화번호"
          placeholder="010-0000-0000"
          value={form.phone}
          onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
        />
        <InputField
          label="이메일"
          type="email"
          placeholder="email@example.com"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <InputField
          label="주소"
          placeholder="주소"
          value={form.address}
          onChange={(v) => setForm((prev) => ({ ...prev, address: v }))}
        />
        <InputField
          label="최근 미팅일"
          type="date"
          value={form.last_meeting_date}
          onChange={(v) => setForm((prev) => ({ ...prev, last_meeting_date: v }))}
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
      <ModalActions onPrimary={() => onSubmit(form as any)} onClose={onClose} primaryLabel="수정" />
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
  onClose,
  onSubmit,
}: {
  bu: BU;
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
    projectId: projects[0]?.id || '',
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
  });

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
      </div>
      <ModalActions
        onPrimary={() => onSubmit({ ...form, bu_code: bu })}
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
  });

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
      </div>
      <ModalActions onPrimary={() => onSubmit(form as any)} onClose={onClose} primaryLabel="수정" />
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
  orgUnits,
  onClose,
  onSubmit,
}: {
  bu: BU;
  orgUnits: any[];
  onClose: () => void;
  onSubmit: (data: {
    org_unit_id?: number;
    name: string;
    title?: string;
    bu_code?: string;
    phone?: string;
    email?: string;
    is_active?: boolean;
    is_leader?: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    org_unit_id: undefined as number | undefined,
    name: '',
    title: '',
    bu_code: bu,
    phone: '',
    email: '',
    is_active: true,
    is_leader: false,
  });
  const [error, setError] = useState<string>('');

  return (
    <ModalShell title="스태프 등록" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="소속 조직"
          value={form.org_unit_id ? String(form.org_unit_id) : ''}
          onChange={(val) => setForm((prev) => ({ ...prev, org_unit_id: val ? Number(val) : undefined }))}
          options={[
            { value: '', label: '선택 안 함' },
            ...orgUnits.map((unit) => ({
              value: String(unit.id),
              label: unit.name,
            })),
          ]}
        />
        <InputField
          label="이름"
          placeholder="이름을 입력하세요"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="직급"
          placeholder="예: 대표, 실장, 대리"
          value={form.title}
          onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
        />
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
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="활성화 여부"
            value={form.is_active ? 'true' : 'false'}
            onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'true' }))}
            options={[
              { value: 'true', label: '활성' },
              { value: 'false', label: '비활성' },
            ]}
          />
          <SelectField
            label="리더 여부"
            value={form.is_leader ? 'true' : 'false'}
            onChange={(val) => setForm((prev) => ({ ...prev, is_leader: val === 'true' }))}
            options={[
              { value: 'false', label: '일반' },
              { value: 'true', label: '리더' },
            ]}
          />
        </div>
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
            org_unit_id: form.org_unit_id,
            name: form.name,
            title: form.title || undefined,
            bu_code: form.bu_code || undefined,
            phone: form.phone || undefined,
            email: form.email || undefined,
            is_active: form.is_active,
            is_leader: form.is_leader,
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
  orgUnits,
  onClose,
  onSubmit,
}: {
  staff: any;
  bu: BU;
  orgUnits: any[];
  onClose: () => void;
  onSubmit: (data: {
    org_unit_id?: number;
    name: string;
    title?: string;
    bu_code?: string;
    phone?: string;
    email?: string;
    is_active?: boolean;
    is_leader?: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    org_unit_id: staff.org_unit_id as number | undefined,
    name: staff.name || '',
    title: staff.title || '',
    bu_code: staff.bu_code || bu,
    phone: staff.phone || '',
    email: staff.email || '',
    is_active: staff.is_active !== undefined ? staff.is_active : true,
    is_leader: staff.is_leader || false,
  });
  const [error, setError] = useState<string>('');

  return (
    <ModalShell title="스태프 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="소속 조직"
          value={form.org_unit_id ? String(form.org_unit_id) : ''}
          onChange={(val) => setForm((prev) => ({ ...prev, org_unit_id: val ? Number(val) : undefined }))}
          options={[
            { value: '', label: '선택 안 함' },
            ...orgUnits.map((unit) => ({
              value: String(unit.id),
              label: unit.name,
            })),
          ]}
        />
        <InputField
          label="이름"
          placeholder="이름을 입력하세요"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="직급"
          placeholder="예: 대표, 실장, 대리"
          value={form.title}
          onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
        />
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
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="활성화 여부"
            value={form.is_active ? 'true' : 'false'}
            onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'true' }))}
            options={[
              { value: 'true', label: '활성' },
              { value: 'false', label: '비활성' },
            ]}
          />
          <SelectField
            label="리더 여부"
            value={form.is_leader ? 'true' : 'false'}
            onChange={(val) => setForm((prev) => ({ ...prev, is_leader: val === 'true' }))}
            options={[
              { value: 'false', label: '일반' },
              { value: 'true', label: '리더' },
            ]}
          />
        </div>
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
            org_unit_id: form.org_unit_id,
            name: form.name,
            title: form.title || undefined,
            bu_code: form.bu_code || undefined,
            phone: form.phone || undefined,
            email: form.email || undefined,
            is_active: form.is_active,
            is_leader: form.is_leader,
          });
        }}
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}



