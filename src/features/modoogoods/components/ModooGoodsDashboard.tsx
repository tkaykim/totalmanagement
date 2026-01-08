'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  LayoutDashboard,
  Factory,
  Users,
  Package,
  Briefcase,
  CheckSquare,
  Calendar as CalendarIcon,
  Search,
  Plus,
  MoreVertical,
  X,
  Phone,
  Mail,
  Edit3,
  Trash2,
  LogOut,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Receipt,
  DollarSign,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { BU, Client, Event, ProjectTask, ExternalWorker, Manual } from '@/types/database';
import {
  useProjects,
  useTasks,
  useFinancialEntries,
  useClients,
  useEvents,
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
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useClientWorkers,
  useCreateFinancialEntry,
  useUpdateFinancialEntry,
  useDeleteFinancialEntry,
  useUsers,
  useManuals,
  useCreateManual,
  useUpdateManual,
  useDeleteManual,
} from '@/features/erp/hooks';
import { dbProjectToFrontend, dbTaskToFrontend, dbFinancialToFrontend, frontendProjectToDb, frontendTaskToDb, frontendFinancialToDb } from '@/features/erp/utils';
import { ProjectModal } from '@/features/erp/components/ProjectModal';

type ModooGoodsView =
  | 'dashboard'
  | 'projects'
  | 'tasks'
  | 'production'
  | 'schedule'
  | 'clients'
  | 'factory'
  | 'finance'
  | 'manuals';

interface ModooGoodsDashboardProps {
  bu: BU;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

export default function ModooGoodsDashboard({ bu }: ModooGoodsDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ModooGoodsView>('dashboard');
  const [user, setUser] = useState<any>(null);
  
  // Date filtering state
  const [periodType, setPeriodType] = useState<'year' | 'quarter' | 'month' | 'custom'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedQuarterYear, setSelectedQuarterYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [customRange, setCustomRange] = useState<{ start?: string; end?: string }>({});

  // Data hooks
  const { data: projectsData = [] } = useProjects(bu);
  const { data: tasksData = [] } = useTasks(bu);
  const { data: clientsData = [] } = useClients(bu);
  const { data: eventsData = [] } = useEvents(bu);
  const { data: externalWorkersData = [] } = useExternalWorkers(bu);
  const { data: allExternalWorkersData = [] } = useExternalWorkers(); // 모든 외주 인원 (할일 모달용)
  const { data: manualsData = [] } = useManuals(bu);

  // Active period calculation
  const activePeriod = useMemo(() => {
    if (periodType === 'custom') {
      if (!customRange.start || !customRange.end) {
        return { start: undefined, end: undefined };
      }
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
      const quarterStart = format(startOfMonth(new Date(selectedQuarterYear, startMonth, 1)), 'yyyy-MM-dd');
      const quarterEnd = format(endOfMonth(new Date(selectedQuarterYear, endMonth, 1)), 'yyyy-MM-dd');
      return { start: quarterStart, end: quarterEnd };
    }
    
    // month
    const monthStart = format(startOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd');
    return { start: monthStart, end: monthEnd };
  }, [periodType, selectedYear, selectedQuarter, selectedQuarterYear, selectedMonth, customRange.start, customRange.end]);

  const { data: financialData = [] } = useFinancialEntries({
    bu,
    startDate: activePeriod.start,
    endDate: activePeriod.end,
  });

  // Mutation hooks
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();
  const createExternalWorkerMutation = useCreateExternalWorker();
  const updateExternalWorkerMutation = useUpdateExternalWorker();
  const deleteExternalWorkerMutation = useDeleteExternalWorker();
  const createFinancialMutation = useCreateFinancialEntry();
  const updateFinancialMutation = useUpdateFinancialEntry();
  const deleteFinancialMutation = useDeleteFinancialEntry();
  const createManualMutation = useCreateManual();
  const updateManualMutation = useUpdateManual();
  const deleteManualMutation = useDeleteManual();
  const { data: usersData } = useUsers();

  // Modal states
  const [isFactoryModalOpen, setFactoryModalOpen] = useState(false);
  const [isEditFactoryModalOpen, setEditFactoryModalOpen] = useState<ExternalWorker | null>(null);
  const [deleteFactoryId, setDeleteFactoryId] = useState<number | null>(null);
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [isEditClientModalOpen, setEditClientModalOpen] = useState<Client | null>(null);
  const [deleteClientId, setDeleteClientId] = useState<number | null>(null);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setEditProjectModalOpen] = useState<any>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [isProjectDetailModalOpen, setProjectDetailModalOpen] = useState<any>(null);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setEditTaskModalOpen] = useState<any>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [isTaskDetailModalOpen, setTaskDetailModalOpen] = useState<any>(null);
  const [taskModalProjectId, setTaskModalProjectId] = useState<string | null>(null);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [isEditEventModalOpen, setEditEventModalOpen] = useState<Event | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<number | null>(null);
  const [isFinanceModalOpen, setFinanceModalOpen] = useState<{ mode: 'revenue' | 'expense'; projectId?: number } | null>(null);
  const [isEditFinanceModalOpen, setEditFinanceModalOpen] = useState<any>(null);
  const [deleteFinanceId, setDeleteFinanceId] = useState<number | null>(null);
  const [isManualModalOpen, setManualModalOpen] = useState(false);
  const [isEditManualModalOpen, setEditManualModalOpen] = useState<any>(null);
  const [deleteManualId, setDeleteManualId] = useState<number | null>(null);

  const projects = useMemo(() => {
    return projectsData
      .filter((p) => p.bu_code === bu)
      .filter((p) => p.category === '단체복' || p.category === '굿즈')
      .map((p) => ({
        ...dbProjectToFrontend(p),
        client_id: p.client_id,
      }));
  }, [projectsData, bu]);

  const tasks = useMemo(() => {
    return tasksData
      .filter((t) => t.bu_code === bu)
      .map((t) => ({
        ...dbTaskToFrontend(t),
        priority: t.priority,
        tag: t.tag,
      })) as Array<ReturnType<typeof dbTaskToFrontend> & { priority?: 'high' | 'medium' | 'low'; tag?: string }>;
  }, [tasksData, bu]);

  const financials = useMemo(() => financialData.map(dbFinancialToFrontend), [financialData]);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase.from('app_users').select('*').eq('id', authUser.id).single();
        setUser({ ...authUser, profile });
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handlePeriodTypeChange = (type: 'year' | 'quarter' | 'month' | 'custom') => {
    setPeriodType(type);
    if (type !== 'custom') {
      setCustomRange({ start: undefined, end: undefined });
    }
  };

  const handleDateChange = (key: 'start' | 'end', value: string) => {
    setCustomRange((prev) => ({ ...prev, [key]: value }));
  };

  // Year options
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const maxYear = Math.max(currentYear, 2027);
    return Array.from({ length: maxYear - 2021 + 1 }, (_, i) => 2021 + i).reverse();
  }, []);

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'projects', label: '프로젝트', icon: Briefcase },
    { id: 'tasks', label: '할일관리', icon: CheckSquare },
    { id: 'production', label: '제작현황', icon: Package },
    { id: 'schedule', label: '스케줄', icon: CalendarIcon },
    { id: 'clients', label: '클라이언트', icon: Briefcase },
    { id: 'factory', label: '외주(공장)', icon: Factory },
    { id: 'finance', label: '정산/회계', icon: Receipt },
    { id: 'manuals', label: '매뉴얼', icon: BookOpen },
  ];

  // Factory (외주/공장) View
  const FactoryView = () => {
    const factories = externalWorkersData.filter((w) => w.bu_code === bu && w.worker_type === 'company');

    return (
      <div className="h-full flex flex-col space-y-4 animate-fade-in overflow-hidden">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
          <h2 className="text-lg font-bold text-gray-800">외주(공장) 관리</h2>
          <button
            onClick={() => setFactoryModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 공장 추가
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
          {factories.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Factory className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">등록된 공장이 없습니다.</p>
              <p className="text-sm mt-2">새 공장을 추가해보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {factories.map((factory) => (
                <div
                  key={factory.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{factory.name}</h3>
                      {factory.company_name && (
                        <p className="text-sm text-gray-500 mt-1">{factory.company_name}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditFactoryModalOpen(factory)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteFactoryId(factory.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    {factory.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{factory.phone}</span>
                      </div>
                    )}
                    {factory.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{factory.email}</span>
                      </div>
                    )}
                    {factory.specialties && factory.specialties.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">전문 분야</p>
                        <div className="flex flex-wrap gap-1">
                          {factory.specialties.map((spec, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {factory.notes && (
                      <p className="text-xs text-gray-500 mt-2">{factory.notes}</p>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className={cn('text-xs px-2 py-1 rounded', factory.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {factory.is_active ? '활성' : '비활성'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Clients View
  const ClientsView = () => {
    const clients = clientsData.filter((c) => c.bu_code === bu);

    return (
      <div className="h-full flex flex-col space-y-4 animate-fade-in overflow-hidden">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
          <h2 className="text-lg font-bold text-gray-800">클라이언트 관리</h2>
          <button
            onClick={() => setClientModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 클라이언트 추가
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
          {clients.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">등록된 클라이언트가 없습니다.</p>
              <p className="text-sm mt-2">새 클라이언트를 추가해보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {clients.map((client) => {
                const clientProjects = projects.filter((p) => p.client_id === client.id);
                return (
                  <div
                    key={client.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">
                          {client.company_name_ko || client.company_name_en}
                        </h3>
                        {(client.company_name_ko || client.company_name_en) && (
                          <p className="text-sm text-gray-500 mt-1">
                            {client.company_name_en || client.company_name_ko}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditClientModalOpen(client)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteClientId(client.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">관련 프로젝트</p>
                        <p className="text-sm font-medium text-gray-800">{clientProjects.length}건</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">상태</p>
                        <span className={cn(
                          'text-xs px-2 py-1 rounded',
                          client.status === 'active' ? 'bg-green-100 text-green-700' :
                          client.status === 'inactive' ? 'bg-gray-100 text-gray-500' :
                          'bg-red-100 text-red-700'
                        )}>
                          {client.status === 'active' ? '활성' : client.status === 'inactive' ? '비활성' : '보관'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Production (제작현황) View
  const ProductionView = () => {
    const inProgressProjects = projects.filter(
      (p) => p.status === '준비중' || p.status === '기획중' || p.status === '진행중' || p.status === '운영중'
    );

    return (
      <div className="h-full flex flex-col space-y-4 animate-fade-in overflow-hidden">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
          <h2 className="text-lg font-bold text-gray-800">제작현황</h2>
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
          {inProgressProjects.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">진행 중인 제작 프로젝트가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inProgressProjects.map((project) => {
                const projectTasks = tasks.filter((t) => t.projectId === project.id);
                const projectRevenues = financials.filter(
                  (f) => f.projectId === project.id && f.type === 'revenue'
                );
                const projectExpenses = financials.filter(
                  (f) => f.projectId === project.id && f.type === 'expense'
                );
                const totalRevenue = projectRevenues.reduce((sum, r) => sum + r.amount, 0);
                const totalExpense = projectExpenses.reduce((sum, e) => sum + e.amount, 0);

                return (
                  <div
                    key={project.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-800 text-lg">{project.name}</h3>
                          <span
                            className={cn(
                              'text-xs px-2 py-1 rounded',
                              project.status === '기획중'
                                ? 'bg-yellow-100 text-yellow-700'
                                : project.status === '진행중'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                            )}
                          >
                            {project.status}
                          </span>
                          <span className="text-xs text-gray-500">{project.cat}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {project.startDate} ~ {project.endDate}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditProjectModalOpen(project)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">매출</p>
                        <p className="text-sm font-medium text-blue-600">{formatCurrency(totalRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">지출</p>
                        <p className="text-sm font-medium text-red-600">{formatCurrency(totalExpense)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">할일</p>
                        <p className="text-sm font-medium text-gray-800">
                          {projectTasks.filter((t) => t.status !== 'done').length} / {projectTasks.length}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Projects View
  const ProjectsView = () => {
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

    const toggleExpand = (projectId: string) => {
      setExpandedProjects((prev) => {
        const next = new Set(prev);
        if (next.has(projectId)) {
          next.delete(projectId);
        } else {
          next.add(projectId);
        }
        return next;
      });
    };

    const handleAddTask = (projectId: string) => {
      setTaskModalProjectId(projectId);
      setTaskModalOpen(true);
    };

    return (
      <div className="h-full flex flex-col space-y-4 animate-fade-in overflow-hidden">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
          <h2 className="text-lg font-bold text-gray-800">프로젝트 관리</h2>
          <button
            onClick={() => setProjectModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 프로젝트 추가
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
          {projects.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">등록된 프로젝트가 없습니다.</p>
              <p className="text-sm mt-2">새 프로젝트를 추가해보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => {
                const projectTasks = tasks.filter((t) => t.projectId === project.id);
                const isExpanded = expandedProjects.has(project.id);
                const client = clientsData.find((c) => c.id === project.client_id);
                const todoCount = projectTasks.filter((t) => t.status === 'todo').length;
                const inProgressCount = projectTasks.filter((t) => t.status === 'in-progress').length;
                const doneCount = projectTasks.filter((t) => t.status === 'done').length;

                return (
                  <div
                    key={project.id}
                    className="border border-gray-200 rounded-xl bg-white dark:bg-slate-800 hover:shadow-lg transition-all"
                  >
                    {/* 프로젝트 헤더 */}
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-gray-800 text-xl">{project.name}</h3>
                            <span
                              className={cn(
                                'text-xs px-2.5 py-1 rounded-full font-semibold',
                                project.status === '준비중'
                                  ? 'bg-purple-100 text-purple-700'
                                  : project.status === '기획중'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : project.status === '진행중'
                                      ? 'bg-blue-100 text-blue-700'
                                      : project.status === '운영중'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700'
                              )}
                            >
                              {project.status}
                            </span>
                            {project.cat && (
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                {project.cat}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="w-4 h-4 text-gray-400" />
                              <span>{project.startDate} ~ {project.endDate}</span>
                            </div>
                            {client && (
                              <div className="flex items-center gap-1.5">
                                <Briefcase className="w-4 h-4 text-indigo-500" />
                                <span className="text-indigo-600 font-medium">
                                  {client.company_name_ko || client.company_name_en || '클라이언트'}
                                </span>
                              </div>
                            )}
                            {project.pm_name && (
                              <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span>PM: {project.pm_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 ml-4">
                          <button
                            onClick={() => handleAddTask(project.id)}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-1.5 text-sm font-medium transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            할일 추가
                          </button>
                          <button
                            onClick={() => setEditProjectModalOpen(project)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteProjectId(Number(project.id))}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 할일 통계 */}
                      <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">
                            할일 <span className="text-gray-500">({todoCount})</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-gray-700">
                            진행중 <span className="text-blue-600">({inProgressCount})</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-gray-700">
                            완료 <span className="text-green-600">({doneCount})</span>
                          </span>
                        </div>
                        <div className="ml-auto">
                          <button
                            onClick={() => toggleExpand(project.id)}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <span>접기</span>
                                <ChevronUp className="w-4 h-4" />
                              </>
                            ) : (
                              <>
                                <span>상세보기</span>
                                <ChevronDown className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 확장된 상세 정보 */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-gray-100 bg-gray-50">
                        {/* 할일 목록 */}
                        <div className="pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                              <CheckSquare className="w-4 h-4" />
                              관련 할일 ({projectTasks.length})
                            </h4>
                          </div>
                          {projectTasks.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 bg-white dark:bg-slate-800 rounded-lg border border-gray-200">
                              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">등록된 할일이 없습니다.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {projectTasks.map((task) => {
                                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
                                return (
                                  <div
                                    key={task.id}
                                    className={cn(
                                      "bg-white dark:bg-slate-800 border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer",
                                      isOverdue ? "border-red-200 bg-red-50" : "border-gray-200"
                                    )}
                                    onClick={() => setEditTaskModalOpen(task)}
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h5 className="font-medium text-gray-800 text-sm">{task.title}</h5>
                                          <span className={cn(
                                            'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                            task.status === 'done' ? 'bg-green-100 text-green-700' :
                                            task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                          )}>
                                            {task.status === 'done' ? '완료' : task.status === 'in-progress' ? '진행중' : '할일'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                          {task.assignee && (
                                            <span className="flex items-center gap-1">
                                              <Users className="w-3 h-3" />
                                              {task.assignee}
                                            </span>
                                          )}
                                          {task.dueDate && (
                                            <span className={cn(
                                              "flex items-center gap-1",
                                              isOverdue && "text-red-600 font-semibold"
                                            )}>
                                              <Clock className="w-3 h-3" />
                                              {task.dueDate}
                                              {isOverdue && <span>(지연)</span>}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-1 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => setEditTaskModalOpen(task)}
                                          className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setDeleteTaskId(Number(task.id))}
                                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Tasks View - Kanban Board
  const TasksView = () => {
    const handleStatusChange = async (taskId: string, newStatus: 'todo' | 'in-progress' | 'done') => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      try {
        const dbData = frontendTaskToDb({
          projectId: task.projectId,
          bu: bu,
          title: task.title,
          assignee: task.assignee,
          dueDate: task.dueDate,
          status: newStatus,
        });
        await updateTaskMutation.mutateAsync({ id: Number(taskId), data: dbData });
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
    };

    // 각 상태별 할일 분류
    const tasksByStatus = useMemo(() => {
      return {
        todo: tasks.filter((t) => t.status === 'todo'),
        'in-progress': tasks.filter((t) => t.status === 'in-progress'),
        done: tasks.filter((t) => t.status === 'done'),
      };
    }, [tasks]);

    const statusColumns = [
      {
        id: 'todo' as const,
        label: '할일',
        color: 'gray',
        tasks: tasksByStatus.todo,
      },
      {
        id: 'in-progress' as const,
        label: '진행중',
        color: 'blue',
        tasks: tasksByStatus['in-progress'],
      },
      {
        id: 'done' as const,
        label: '완료',
        color: 'green',
        tasks: tasksByStatus.done,
      },
    ];

    const TaskCard = ({ task }: { task: typeof tasks[0] }) => {
      const project = projects.find((p) => p.id === task.projectId);
      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

      return (
        <div
          className={cn(
            "border rounded-lg p-3 bg-white dark:bg-slate-800 hover:shadow-md transition-all mb-3",
            isOverdue ? "border-red-300 bg-red-50" : "border-gray-200"
          )}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <h3 
                className="font-semibold text-gray-800 text-sm line-clamp-2 cursor-pointer mb-1"
                onClick={() => setEditTaskModalOpen(task)}
              >
                {task.title}
              </h3>
              {/* 프로젝트 정보 - 항상 표시 */}
              <div className="flex items-center gap-1.5">
                <Briefcase className={cn(
                  "w-3 h-3 flex-shrink-0",
                  project ? "text-indigo-500" : "text-gray-300"
                )} />
                <span className={cn(
                  "text-xs font-medium truncate",
                  project ? "text-indigo-600" : "text-gray-400"
                )}>
                  {project ? project.name : "프로젝트 미지정"}
                </span>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0 ml-2">
              <button
                onClick={() => setEditTaskModalOpen(task)}
                className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeleteTaskId(Number(task.id))}
                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 담당자 정보 */}
          {task.assignee && (
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-600">{task.assignee}</span>
            </div>
          )}

          {/* 마감일정 */}
          {task.dueDate && (
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className={cn(
                "w-3 h-3 flex-shrink-0",
                isOverdue ? "text-red-500" : "text-gray-400"
              )} />
              <span className={cn(
                "text-xs font-medium",
                isOverdue ? "text-red-600 font-bold" : "text-gray-600"
              )}>
                {task.dueDate}
                {isOverdue && <span className="ml-1">(지연)</span>}
              </span>
            </div>
          )}

          {/* 하단 액션 바 */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            {/* 우선순위 뱃지 */}
            {task.priority && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                task.priority === 'high' ? 'bg-red-100 text-red-700' :
                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              )}>
                {task.priority === 'high' ? '높음' : task.priority === 'medium' ? '보통' : '낮음'}
              </span>
            )}

            {/* 상태 변경 드롭다운 */}
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(task.id, e.target.value as 'todo' | 'in-progress' | 'done')}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "text-xs font-medium px-2 py-1 rounded border outline-none focus:ring-2 focus:ring-indigo-500",
                task.status === 'done' ? 'bg-green-50 border-green-200 text-green-700' :
                task.status === 'in-progress' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                'bg-gray-50 border-gray-200 text-gray-700'
              )}
            >
              <option value="todo">할일</option>
              <option value="in-progress">진행중</option>
              <option value="done">완료</option>
            </select>
          </div>
        </div>
      );
    };

    return (
      <div className="h-full flex flex-col space-y-4 animate-fade-in overflow-hidden">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
          <h2 className="text-lg font-bold text-gray-800">할일관리</h2>
          <button
            onClick={() => setTaskModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 할일 추가
          </button>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="grid grid-cols-3 gap-4 h-full min-w-max pb-4">
            {statusColumns.map((column) => (
              <div
                key={column.id}
                className="flex flex-col bg-gray-50 rounded-xl border border-gray-200 min-w-[320px] h-full"
              >
                {/* 컬럼 헤더 */}
                <div className={cn(
                  "p-4 rounded-t-xl border-b",
                  column.color === 'gray' && "bg-gray-100 border-gray-200",
                  column.color === 'blue' && "bg-blue-100 border-blue-200",
                  column.color === 'green' && "bg-green-100 border-green-200"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className={cn(
                        "font-bold text-sm",
                        column.color === 'gray' && "text-gray-700",
                        column.color === 'blue' && "text-blue-700",
                        column.color === 'green' && "text-green-700"
                      )}>
                        {column.label}
                      </h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-semibold",
                        column.color === 'gray' && "bg-gray-200 text-gray-700",
                        column.color === 'blue' && "bg-blue-200 text-blue-700",
                        column.color === 'green' && "bg-green-200 text-green-700"
                      )}>
                        {column.tasks.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 컬럼 본문 */}
                <div className="flex-1 overflow-y-auto p-4">
                  {column.tasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">할일이 없습니다</p>
                    </div>
                  ) : (
                    <div>
                      {column.tasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Schedule View
  const ScheduleView = () => {
    const buEvents = eventsData.filter((e) => e.bu_code === bu);
    const sortedEvents = useMemo(() => {
      return [...buEvents].sort((a, b) => 
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );
    }, [buEvents]);

    return (
      <div className="h-full flex flex-col space-y-4 animate-fade-in overflow-hidden">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
          <h2 className="text-lg font-bold text-gray-800">스케줄 관리</h2>
          <button
            onClick={() => setEventModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 일정 추가
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">등록된 일정이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedEvents.map((event) => (
                <div
                  key={event.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-16 text-center flex-shrink-0">
                        <div className="text-xs text-gray-500 font-medium">
                          {format(new Date(event.event_date), 'MM/dd')}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {format(new Date(event.event_date), 'EEE', { locale: ko })}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                        )}
                        <span className={cn(
                          'inline-block mt-2 px-2 py-1 rounded text-xs',
                          event.event_type === 'shoot' ? 'bg-red-100 text-red-700' :
                          event.event_type === 'meeting' ? 'bg-blue-100 text-blue-700' :
                          event.event_type === 'deadline' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          {event.event_type === 'shoot' ? '촬영' :
                           event.event_type === 'meeting' ? '회의' :
                           event.event_type === 'deadline' ? '마감' : '이벤트'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditEventModalOpen(event)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteEventId(event.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
    const netProfit = totalRevenue - totalExpense;

    return (
      <div className="h-full flex flex-col space-y-4 animate-fade-in overflow-hidden">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
          <h2 className="text-lg font-bold text-gray-800">정산/회계</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFinanceModalOpen({ mode: 'revenue' })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> 매출 추가
            </button>
            <button
              onClick={() => setFinanceModalOpen({ mode: 'expense' })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> 지출 추가
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
            <p className="text-xs font-bold uppercase text-gray-400 mb-2">총 매출</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
            <p className="text-xs font-bold uppercase text-gray-400 mb-2">총 지출</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
            <p className="text-xs font-bold uppercase text-gray-400 mb-2">순이익</p>
            <p className={cn('text-2xl font-bold', netProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(netProfit)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" /> 매출 내역
              </h3>
              <span className="text-sm font-medium text-blue-600">총 {revenues.length}건</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {revenues.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">등록된 매출이 없습니다.</p>
                </div>
              ) : (
                revenues.map((revenue) => {
                  const project = projects.find((p) => p.id === revenue.projectId);
                  return (
                    <div
                      key={revenue.id}
                      className="border border-blue-100 rounded-lg p-3 bg-blue-50 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{revenue.name}</p>
                          {project && <p className="text-xs text-gray-500 mt-1">{project.name}</p>}
                          <p className="text-xs text-gray-500 mt-1">
                            {revenue.category} • {revenue.date}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-blue-600">{formatCurrency(revenue.amount)}</span>
                          <button
                            onClick={() => setEditFinanceModalOpen(revenue)}
                            className="p-1 text-gray-400 hover:text-indigo-600"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteFinanceId(Number(revenue.id))}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-600" /> 지출 내역
              </h3>
              <span className="text-sm font-medium text-red-600">총 {expenses.length}건</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {expenses.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">등록된 지출이 없습니다.</p>
                </div>
              ) : (
                expenses.map((expense) => {
                  const project = projects.find((p) => p.id === expense.projectId);
                  return (
                    <div
                      key={expense.id}
                      className="border border-red-100 rounded-lg p-3 bg-red-50 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{expense.name}</p>
                          {project && <p className="text-xs text-gray-500 mt-1">{project.name}</p>}
                          <p className="text-xs text-gray-500 mt-1">
                            {expense.category} • {expense.date}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-red-600">{formatCurrency(expense.amount)}</span>
                          <button
                            onClick={() => setEditFinanceModalOpen(expense)}
                            className="p-1 text-gray-400 hover:text-indigo-600"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteFinanceId(Number(expense.id))}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Dashboard View
  const DashboardView = () => {
    const [taskFilter, setTaskFilter] = useState<'all' | 'my' | 'unassigned'>('all');
    const [projectFilter, setProjectFilter] = useState<'all' | 'my' | 'unassigned'>('all');
    
    const buFinancials = financials.filter((f) => f.bu === bu);
    const revenues = buFinancials.filter((f) => f.type === 'revenue');
    const expenses = buFinancials.filter((f) => f.type === 'expense');
    const buEvents = eventsData.filter((e) => e.bu_code === bu);

    // Filter financials by date range if period is set
    const isDateInRange = (date: string, start?: string, end?: string) => {
      if (!start || !end) return true;
      try {
        const target = parseISO(date);
        const startDate = parseISO(start);
        const endDate = parseISO(end);
        return isWithinInterval(target, { start: startDate, end: endDate });
      } catch (error) {
        return true;
      }
    };

    // Use financials directly since they're already filtered by date from the server
    // But we still need to filter by BU since server might return all BUs
    const filteredRevenues = useMemo(() => {
      if (activePeriod.start && activePeriod.end) {
        return revenues.filter((r) => isDateInRange(r.date, activePeriod.start, activePeriod.end));
      }
      return revenues;
    }, [revenues, activePeriod.start, activePeriod.end]);

    const filteredExpenses = useMemo(() => {
      if (activePeriod.start && activePeriod.end) {
        return expenses.filter((e) => isDateInRange(e.date, activePeriod.start, activePeriod.end));
      }
      return expenses;
    }, [expenses, activePeriod.start, activePeriod.end]);

    const totalRevenue = filteredRevenues.reduce((sum, r) => sum + r.amount, 0);
    const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpense;

    // 진행 중인 프로젝트 필터링
    const inProgressProjectsBase = projects.filter(
      (p) => p.status === '준비중' || p.status === '기획중' || p.status === '진행중' || p.status === '운영중'
    );

    // 프로젝트 필터링 로직
    const inProgressProjects = useMemo(() => {
      let filtered = inProgressProjectsBase;
      
      if (projectFilter === 'my') {
        // 내 담당 프로젝트 - PM이 본인인 프로젝트
        const userName = user?.profile?.name || user?.email || '';
        filtered = filtered.filter((p) => p.pm_name === userName);
      } else if (projectFilter === 'unassigned') {
        // PM 미정 프로젝트
        filtered = filtered.filter((p) => !p.pm_name || p.pm_name.trim() === '');
      }
      // 'all'인 경우 필터링하지 않음
      
      return filtered;
    }, [inProgressProjectsBase, projectFilter, user]);

    const upcomingEvents = [...buEvents]
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 5);

    // 필터링된 할일 목록
    const filteredTasks = useMemo(() => {
      let filtered = tasks;
      
      if (taskFilter === 'my') {
        // 내 할일만 보기 - 현재 사용자 이름과 일치하는 할일
        const userName = user?.profile?.name || user?.email || '';
        filtered = filtered.filter((t) => t.assignee === userName);
      } else if (taskFilter === 'unassigned') {
        // 담당자 미정인 할일 보기
        filtered = filtered.filter((t) => !t.assignee || t.assignee.trim() === '');
      }
      // 'all'인 경우 필터링하지 않음
      
      return filtered;
    }, [tasks, taskFilter, user]);

    const activeTasks = filteredTasks.filter((t) => t.status !== 'done').slice(0, 10);

    // role이 admin이거나 manager인지 확인
    const canViewFinancials = user?.profile?.role === 'admin' || user?.profile?.role === 'manager';

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {canViewFinancials && (
            <>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs font-bold uppercase text-gray-400 mb-2">총 매출</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs font-bold uppercase text-gray-400 mb-2">총 지출</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs font-bold uppercase text-gray-400 mb-2">순이익</p>
                <p className={cn('text-2xl font-bold', netProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(netProfit)}
                </p>
              </div>
            </>
          )}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-400 mb-2">진행 중 프로젝트</p>
            <p className="text-2xl font-bold text-gray-800">{inProgressProjects.length} 건</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">진행 중인 프로젝트</h3>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  전체 보기
                </button>
              </div>
              {/* 프로젝트 필터 토글 */}
              <div className="mb-6 flex gap-2">
                <button
                  onClick={() => setProjectFilter('all')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    projectFilter === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  전체 프로젝트
                </button>
                <button
                  onClick={() => setProjectFilter('my')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    projectFilter === 'my'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  내 담당 프로젝트
                </button>
                <button
                  onClick={() => setProjectFilter('unassigned')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    projectFilter === 'unassigned'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  PM 미정 프로젝트
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

                    const projectRevenues = filteredRevenues.filter((f) => f.projectId === project.id);
                    const projectExpenses = filteredExpenses.filter((f) => f.projectId === project.id);
                    const periodRevenue = projectRevenues.reduce((sum, r) => sum + r.amount, 0);
                    const periodExpense = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
                    const periodProfit = periodRevenue - periodExpense;

                    const projectTasks = tasks.filter((t) => t.projectId === project.id);

                    return (
                      <div
                        key={project.id}
                        onClick={() => {
                          setProjectDetailModalOpen(project);
                        }}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 cursor-pointer transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-gray-800 text-sm">{project.name}</h4>
                            <span
                              className={cn(
                                'text-xs px-2 py-0.5 rounded-full',
                                project.status === '기획중'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : project.status === '진행중'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                              )}
                            >
                              {project.status}
                            </span>
                          </div>
                          {/* PM, 운영일정, 관련할일 정보 */}
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                            {project.pm_name && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-gray-400" />
                                PM: {project.pm_name}
                              </span>
                            )}
                            {project.startDate && project.endDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                {project.startDate} ~ {project.endDate}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <CheckSquare className="w-3 h-3 text-gray-400" />
                              관련할일: {projectTasks.length}개
                            </span>
                          </div>
                          {canViewFinancials && (
                            <>
                              <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                                <span>총 매출: {formatCurrency(projectRevenue)}</span>
                                <span>총 지출: {formatCurrency(projectExpense)}</span>
                                <span
                                  className={cn('font-medium', projectProfit >= 0 ? 'text-green-600' : 'text-red-600')}
                                >
                                  총 순이익: {formatCurrency(projectProfit)}
                                </span>
                              </div>
                              {activePeriod.start && activePeriod.end && (
                                <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                                  <span>기간 매출: {formatCurrency(periodRevenue)}</span>
                                  <span>기간 지출: {formatCurrency(periodExpense)}</span>
                                  <span
                                    className={cn('font-medium', periodProfit >= 0 ? 'text-green-500' : 'text-red-500')}
                                  >
                                    기간 순이익: {formatCurrency(periodProfit)}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">진행 중인 프로젝트가 없습니다.</div>
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
                  전체 보기
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
                  <div className="text-center py-8 text-gray-400 text-sm">등록된 일정이 없습니다.</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
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
              {/* 할일 필터 토글 */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setTaskFilter('all')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    taskFilter === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  할일 전체 보기
                </button>
                <button
                  onClick={() => setTaskFilter('my')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    taskFilter === 'my'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  내 할일만 보기
                </button>
                <button
                  onClick={() => setTaskFilter('unassigned')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    taskFilter === 'unassigned'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  담당자 미정인 할일 보기
                </button>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {activeTasks.length > 0 ? (
                  activeTasks.map((task) => {
                    const project = projects.find((p) => p.id === task.projectId);
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
                    return (
                      <div
                        key={task.id}
                        onClick={() => setTaskDetailModalOpen(task)}
                        className={cn(
                          "p-4 bg-gray-50 rounded-lg border transition-colors cursor-pointer hover:shadow-md",
                          isOverdue ? "border-red-200 bg-red-50" : "border-gray-100 hover:bg-gray-100"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* 할일 제목 */}
                            <h4 className="font-semibold text-gray-800 text-sm mb-2 truncate">{task.title}</h4>
                            
                            {/* 프로젝트 정보 - 항상 표시 */}
                            <div className="flex items-center gap-2 mb-2">
                              <Briefcase className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <p className="text-xs text-gray-600 truncate">
                                {project ? project.name : '프로젝트 없음'}
                              </p>
                            </div>
                            
                            {/* 담당자 정보 */}
                            {task.assignee && (
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <p className="text-xs text-gray-600">{task.assignee}</p>
                              </div>
                            )}
                            
                            {/* 마감일정 */}
                            {task.dueDate && (
                              <div className="flex items-center gap-2">
                                <Clock className={cn(
                                  "w-3 h-3 flex-shrink-0",
                                  isOverdue ? "text-red-500" : "text-gray-400"
                                )} />
                                <p className={cn(
                                  "text-xs font-medium",
                                  isOverdue ? "text-red-600" : "text-gray-600"
                                )}>
                                  마감일: {task.dueDate}
                                  {isOverdue && <span className="ml-1 text-red-600 font-bold">(지연)</span>}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* 상태 뱃지 */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span
                              className={cn(
                                'text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap',
                                task.status === 'todo'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : task.status === 'in-progress'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                              )}
                            >
                              {task.status === 'todo' ? '대기' : task.status === 'in-progress' ? '진행중' : '완료'}
                            </span>
                            {(task as any).priority && (
                              <span
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                  (task as any).priority === 'high'
                                    ? 'bg-red-100 text-red-600'
                                    : (task as any).priority === 'medium'
                                      ? 'bg-orange-100 text-orange-600'
                                      : 'bg-gray-100 text-gray-600'
                                )}
                              >
                                {(task as any).priority === 'high' ? '높음' : (task as any).priority === 'medium' ? '보통' : '낮음'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">등록된 할일이 없습니다.</div>
                )}
              </div>
              <button
                onClick={() => setActiveTab('tasks')}
                className="mt-4 w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                전체 보기 →
              </button>
            </div>

            {/* Revenue/Expense Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">매출/지출 요약</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-blue-600">매출</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(totalRevenue)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {filteredRevenues.length}건 • 기간 내
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-red-600">지출</span>
                    <span className="text-lg font-bold text-red-600">{formatCurrency(totalExpense)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {filteredExpenses.length}건 • 기간 내
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">순이익</span>
                    <span
                      className={cn(
                        'text-xl font-bold',
                        netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {formatCurrency(netProfit)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('finance')}
                className="mt-4 w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                정산/회계 상세 보기 →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Manuals View
  const ManualsView = () => {
    const buManuals = manualsData.filter((m) => m.bu_code === bu);

    return (
      <div className="h-full flex flex-col space-y-4 animate-fade-in overflow-hidden">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
          <h2 className="text-lg font-bold text-gray-800">매뉴얼</h2>
          <button
            onClick={() => setManualModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 매뉴얼 추가
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-gray-200 shadow-sm p-6">
          {buManuals.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">등록된 매뉴얼이 없습니다.</p>
              <p className="text-sm mt-2">새 매뉴얼을 추가해보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {buManuals.map((manual) => (
                <div
                  key={manual.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-800 text-lg">{manual.title}</h3>
                        <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                          {manual.category}
                        </span>
                      </div>
                      {manual.author_name && (
                        <p className="text-xs text-gray-500">작성자: {manual.author_name}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditManualModalOpen(manual)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteManualId(manual.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
        return <ProjectsView />;
      case 'tasks':
        return <TasksView />;
      case 'production':
        return <ProductionView />;
      case 'schedule':
        return <ScheduleView />;
      case 'clients':
        return <ClientsView />;
      case 'factory':
        return <FactoryView />;
      case 'finance':
        return <FinanceView />;
      case 'manuals':
        return <ManualsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-full bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl flex-shrink-0 z-20">
        <div className="p-6 flex items-center space-x-2 border-b border-slate-800 h-16">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="font-bold text-white">M</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">모두굿즈</h1>
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
              onClick={() => setActiveTab(item.id as ModooGoodsView)}
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
          <div className="flex flex-col px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-800 capitalize">
                {menuItems.find((m) => m.id === activeTab)?.label}
              </h2>
              {activeTab === 'dashboard' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProjectModalOpen(true)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> 프로젝트
                  </button>
                  <button
                    onClick={() => setTaskModalOpen(true)}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> 할일
                  </button>
                  <button
                    onClick={() => setFinanceModalOpen({ mode: 'revenue' })}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> 매출
                  </button>
                  <button
                    onClick={() => setFinanceModalOpen({ mode: 'expense' })}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> 지출
                  </button>
                </div>
              )}
            </div>
            {activeTab === 'dashboard' && (
              <div className="flex flex-col gap-3">
                {/* Period type buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePeriodTypeChange('month')}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                      periodType === 'month'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    월별
                  </button>
                  <button
                    onClick={() => handlePeriodTypeChange('quarter')}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                      periodType === 'quarter'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    분기별
                  </button>
                  <button
                    onClick={() => handlePeriodTypeChange('year')}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                      periodType === 'year'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    연도별
                  </button>
                  <button
                    onClick={() => handlePeriodTypeChange('custom')}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                      periodType === 'custom'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    기간설정
                  </button>
                </div>

                {/* Period selection UI */}
                {periodType === 'year' && (
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-gray-600">연도:</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500"
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
                      <label className="text-[11px] font-semibold text-gray-600">연도:</label>
                      <select
                        value={selectedQuarterYear}
                        onChange={(e) => setSelectedQuarterYear(Number(e.target.value))}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}년
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-semibold text-gray-600">분기:</label>
                      <select
                        value={selectedQuarter}
                        onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500"
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
                    <label className="text-[11px] font-semibold text-gray-600">월:</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500"
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
                    <label className="text-[11px] font-semibold text-gray-600">시작일:</label>
                    <input
                      type="date"
                      value={customRange.start ?? ''}
                      onChange={(e) => handleDateChange('start', e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px]"
                    />
                    <label className="text-[11px] font-semibold text-gray-600">종료일:</label>
                    <input
                      type="date"
                      value={customRange.end ?? ''}
                      onChange={(e) => handleDateChange('end', e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-4 lg:p-8">
          {renderView()}
        </main>
      </div>

      {/* Delete Confirm Modals */}
      {deleteFactoryId && (
        <DeleteConfirmModal
          title="공장 삭제"
          message="정말로 이 공장을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              await deleteExternalWorkerMutation.mutateAsync(deleteFactoryId);
              setDeleteFactoryId(null);
            } catch (error) {
              console.error('Failed to delete factory:', error);
            }
          }}
          onCancel={() => setDeleteFactoryId(null)}
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

      {deleteTaskId && (
        <DeleteConfirmModal
          title="할일 삭제"
          message="정말로 이 할일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
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

      {deleteFinanceId && (
        <DeleteConfirmModal
          title="정산 항목 삭제"
          message="정말로 이 정산 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
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

      {/* Factory Modals */}
      {isFactoryModalOpen && (
        <CreateFactoryModal
          bu={bu}
          onClose={() => setFactoryModalOpen(false)}
          onSubmit={async (data) => {
            try {
              await createExternalWorkerMutation.mutateAsync({
                bu_code: bu,
                name: data.name,
                company_name: data.company_name,
                worker_type: 'company',
                phone: data.phone,
                email: data.email,
                specialties: data.specialties || [],
                notes: data.notes,
                is_active: data.is_active !== undefined ? data.is_active : true,
              });
              setFactoryModalOpen(false);
            } catch (error) {
              console.error('Failed to create factory:', error);
            }
          }}
        />
      )}
      {isEditFactoryModalOpen && (
        <EditFactoryModal
          factory={isEditFactoryModalOpen}
          bu={bu}
          onClose={() => setEditFactoryModalOpen(null)}
          onSubmit={async (data) => {
            try {
              await updateExternalWorkerMutation.mutateAsync({
                id: isEditFactoryModalOpen.id,
                data: {
                  bu_code: bu,
                  name: data.name,
                  company_name: data.company_name,
                  worker_type: 'company',
                  phone: data.phone,
                  email: data.email,
                  specialties: data.specialties || [],
                  notes: data.notes,
                  is_active: data.is_active,
                },
              });
              setEditFactoryModalOpen(null);
            } catch (error) {
              console.error('Failed to update factory:', error);
            }
          }}
        />
      )}

      {/* Client Modals */}
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

      {/* Project Modals */}
      {isProjectModalOpen && (
        <ProjectModal
          defaultBu={bu}
          usersData={{ users: (usersData as any)?.users || [], currentUser: null }}
          partnerCompaniesData={[]}
          partnerWorkersData={externalWorkersData}
          placeholders={{
            projectName: '예: 2026 봄시즌 단체복',
            category: '예: 단체복, IP굿즈',
            description: '단체복/굿즈 프로젝트 설명을 입력하세요',
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
                }),
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
          }}
          defaultBu={bu}
          usersData={{ users: (usersData as any)?.users || [], currentUser: null }}
          partnerCompaniesData={[]}
          partnerWorkersData={externalWorkersData}
          placeholders={{
            projectName: '예: 2026 봄시즌 단체복',
            category: '예: 단체복, IP굿즈',
            description: '단체복/굿즈 프로젝트 설명을 입력하세요',
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
                  }),
                } as any,
              });
              setEditProjectModalOpen(null);
            } catch (error) {
              console.error('Failed to update project:', error);
            }
          }}
        />
      )}

      {/* Task Modals */}
      {isTaskModalOpen && (
        <CreateTaskModal
          bu={bu}
          projects={projects}
          appUsers={(usersData as any)?.users || []}
          externalWorkers={allExternalWorkersData.filter((w) => w.name && w.name.trim() !== '' && w.is_active !== false)}
          defaultProjectId={taskModalProjectId || undefined}
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
          appUsers={(usersData as any)?.users || []}
          externalWorkers={allExternalWorkersData.filter((w) => w.name && w.name.trim() !== '' && w.is_active !== false)}
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

      {/* Event Modals */}
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

      {/* Finance Modals */}
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

      {/* Manual Modals */}
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

      {/* Project Detail Modal */}
      {isProjectDetailModalOpen && (
        <ProjectDetailModal
          project={isProjectDetailModalOpen}
          projects={projects}
          tasks={tasks}
          clients={clientsData}
          onClose={() => setProjectDetailModalOpen(null)}
          onEdit={() => {
            setEditProjectModalOpen(isProjectDetailModalOpen);
            setProjectDetailModalOpen(null);
          }}
          onDelete={() => {
            setDeleteProjectId(Number(isProjectDetailModalOpen.id));
            setProjectDetailModalOpen(null);
          }}
          onAddTask={() => {
            setTaskModalProjectId(isProjectDetailModalOpen.id);
            setTaskModalOpen(true);
          }}
          onEditTask={(task) => {
            setEditTaskModalOpen(task);
          }}
          onDeleteTask={(taskId) => {
            setDeleteTaskId(Number(taskId));
          }}
        />
      )}

      {/* Task Detail Modal */}
      {isTaskDetailModalOpen && (
        <TaskDetailModal
          task={isTaskDetailModalOpen}
          projects={projects}
          onClose={() => setTaskDetailModalOpen(null)}
          onEdit={() => {
            setEditTaskModalOpen(isTaskDetailModalOpen);
            setTaskDetailModalOpen(null);
          }}
          onDelete={() => {
            setDeleteTaskId(Number(isTaskDetailModalOpen.id));
            setTaskDetailModalOpen(null);
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
  zIndex = 50,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  zIndex?: number;
}) {
  return (
    <div className={`modal-container active fixed inset-0 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur`} style={{ zIndex }}>
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white dark:bg-slate-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 px-6 py-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
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
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
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
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
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
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  groupedOptions,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: { value: string; label: string }[];
  groupedOptions?: { group: string; options: { value: string; label: string }[] }[];
  placeholder?: string;
}) {
  return (
    <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
      <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500/30"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {groupedOptions ? (
          groupedOptions.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          ))
        ) : (
          options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        )}
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

// Factory Modals
function CreateFactoryModal({
  bu,
  onClose,
  onSubmit,
}: {
  bu: BU;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    company_name?: string;
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
    phone: '',
    email: '',
    specialties: [] as string[],
    specialtyInput: '',
    notes: '',
    is_active: true,
  });

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
    <ModalShell title="공장 등록" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="공장명"
          placeholder="공장 이름"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="회사명"
          placeholder="회사명 (선택)"
          value={form.company_name}
          onChange={(v) => setForm((prev) => ({ ...prev, company_name: v }))}
        />
        <InputField
          label="연락처"
          placeholder="전화번호"
          value={form.phone}
          onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
        />
        <InputField
          label="이메일"
          placeholder="이메일"
          type="email"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <div className="md:col-span-2">
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">전문 분야</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.specialtyInput}
                onChange={(e) => setForm((prev) => ({ ...prev, specialtyInput: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialty())}
                placeholder="전문 분야 입력 후 Enter"
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
              />
              <button
                type="button"
                onClick={handleAddSpecialty}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                추가
              </button>
            </div>
            {form.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.specialties.map((spec, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs"
                  >
                    {spec}
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecialty(idx)}
                      className="hover:text-indigo-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </label>
        </div>
        <InputField
          label="비고"
          type="textarea"
          placeholder="추가 정보"
          value={form.notes}
          onChange={(v) => setForm((prev) => ({ ...prev, notes: v }))}
        />
        <SelectField
          label="상태"
          value={form.is_active ? 'active' : 'inactive'}
          onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'active' }))}
          options={[
            { value: 'active', label: '활성' },
            { value: 'inactive', label: '비활성' },
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

function EditFactoryModal({
  factory,
  bu,
  onClose,
  onSubmit,
}: {
  factory: ExternalWorker;
  bu: BU;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    company_name?: string;
    phone?: string;
    email?: string;
    specialties?: string[];
    notes?: string;
    is_active?: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    name: factory.name || '',
    company_name: factory.company_name || '',
    phone: factory.phone || '',
    email: factory.email || '',
    specialties: (factory.specialties || []) as string[],
    specialtyInput: '',
    notes: factory.notes || '',
    is_active: factory.is_active !== undefined ? factory.is_active : true,
  });

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
    <ModalShell title="공장 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="공장명"
          placeholder="공장 이름"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="회사명"
          placeholder="회사명 (선택)"
          value={form.company_name}
          onChange={(v) => setForm((prev) => ({ ...prev, company_name: v }))}
        />
        <InputField
          label="연락처"
          placeholder="전화번호"
          value={form.phone}
          onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
        />
        <InputField
          label="이메일"
          placeholder="이메일"
          type="email"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <div className="md:col-span-2">
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">전문 분야</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.specialtyInput}
                onChange={(e) => setForm((prev) => ({ ...prev, specialtyInput: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialty())}
                placeholder="전문 분야 입력 후 Enter"
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
              />
              <button
                type="button"
                onClick={handleAddSpecialty}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                추가
              </button>
            </div>
            {form.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.specialties.map((spec, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs"
                  >
                    {spec}
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecialty(idx)}
                      className="hover:text-indigo-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </label>
        </div>
        <InputField
          label="비고"
          type="textarea"
          placeholder="추가 정보"
          value={form.notes}
          onChange={(v) => setForm((prev) => ({ ...prev, notes: v }))}
        />
        <SelectField
          label="상태"
          value={form.is_active ? 'active' : 'inactive'}
          onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'active' }))}
          options={[
            { value: 'active', label: '활성' },
            { value: 'inactive', label: '비활성' },
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
          placeholder="예: 제조업"
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
          placeholder="예: 제조업"
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

// Task Modals
function CreateTaskModal({
  bu,
  projects,
  appUsers,
  externalWorkers,
  defaultProjectId,
  onClose,
  onSubmit,
}: {
  bu: BU;
  projects: any[];
  appUsers: any[];
  externalWorkers: any[];
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
    dueDate: new Date().toISOString().split('T')[0],
    status: 'todo' as 'todo' | 'in-progress' | 'done',
    priority: 'medium' as 'high' | 'medium' | 'low',
    tag: '',
  });

  const assigneeOptions = useMemo(() => {
    const groups: { group: string; options: { value: string; label: string }[] }[] = [];
    
    // app_users 그룹
    if (appUsers.length > 0) {
      groups.push({
        group: '내부',
        options: appUsers.map((user) => ({
          value: user.name || user.email || '',
          label: user.name || user.email || '이름 없음',
        })),
      });
    }
    
    // external_workers 그룹
    const validWorkers = externalWorkers.filter((worker) => worker.name && worker.name.trim() !== '');
    if (validWorkers.length > 0) {
      groups.push({
        group: '외주',
        options: validWorkers.map((worker) => ({
          value: worker.name || '',
          label: worker.name || '이름 없음',
        })),
      });
    }
    
    return groups;
  }, [appUsers, externalWorkers]);

  return (
    <ModalShell title="할일 등록" onClose={onClose} zIndex={60}>
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
          label="담당자"
          value={form.assignee}
          onChange={(val) => setForm((prev) => ({ ...prev, assignee: val }))}
          groupedOptions={assigneeOptions}
          placeholder="담당자 선택"
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
        onPrimary={() => onSubmit({ ...form, bu })}
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

function EditTaskModal({
  task,
  projects,
  appUsers,
  externalWorkers,
  onClose,
  onSubmit,
}: {
  task: any;
  projects: any[];
  appUsers: any[];
  externalWorkers: any[];
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

  const assigneeOptions = useMemo(() => {
    const groups: { group: string; options: { value: string; label: string }[] }[] = [];
    
    // app_users 그룹
    if (appUsers.length > 0) {
      groups.push({
        group: '내부',
        options: appUsers.map((user) => ({
          value: user.name || user.email || '',
          label: user.name || user.email || '이름 없음',
        })),
      });
    }
    
    // external_workers 그룹
    const validWorkers = externalWorkers.filter((worker) => worker.name && worker.name.trim() !== '');
    if (validWorkers.length > 0) {
      groups.push({
        group: '외주',
        options: validWorkers.map((worker) => ({
          value: worker.name || '',
          label: worker.name || '이름 없음',
        })),
      });
    }
    
    return groups;
  }, [appUsers, externalWorkers]);

  return (
    <ModalShell title="할일 수정" onClose={onClose} zIndex={60}>
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
          label="담당자"
          value={form.assignee}
          onChange={(val) => setForm((prev) => ({ ...prev, assignee: val }))}
          groupedOptions={assigneeOptions}
          placeholder="담당자 선택"
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
        onPrimary={() => onSubmit({ ...form, bu: task.bu })}
        onClose={onClose}
        primaryLabel="수정"
      />
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
          placeholder="예: 단체복 제작비, 굿즈 제작비"
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
    <ModalShell title="정산 항목 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3">
        <SelectField
          label="프로젝트"
          value={form.projectId}
          onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
        />
        <InputField
          label="카테고리"
          placeholder="예: 단체복 제작비, 굿즈 제작비"
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
    category: 'Production',
    content: '',
  });
  const [authorId, setAuthorId] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('');

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setAuthorId(user.id);

        const { data: appUser } = await supabase.from('app_users').select('name').eq('id', user.id).single();

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
            { value: 'Production', label: '제작' },
            { value: 'Admin', label: '행정' },
            { value: 'Onboarding', label: '온보딩' },
            { value: 'Tech', label: '장비' },
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
        onPrimary={() =>
          onSubmit({
            ...form,
            bu_code: bu,
            content: form.content ? [{ type: 'text', text: form.content }] : [],
            author_id: authorId,
            author_name: authorName,
          })
        }
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
    content:
      typeof manual.content === 'string'
        ? manual.content
        : Array.isArray(manual.content)
          ? manual.content.map((block: any) => block.text || '').join('\n')
          : '',
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
            { value: 'Production', label: '제작' },
            { value: 'Admin', label: '행정' },
            { value: 'Onboarding', label: '온보딩' },
            { value: 'Tech', label: '장비' },
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
        onPrimary={() =>
          onSubmit({
            ...form,
            content: form.content ? [{ type: 'text', text: form.content }] : [],
          })
        }
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}

// Project Detail Modal
function ProjectDetailModal({
  project,
  projects,
  tasks,
  clients,
  onClose,
  onEdit,
  onDelete,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: {
  project: any;
  projects: any[];
  tasks: any[];
  clients: any[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddTask: () => void;
  onEditTask: (task: any) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const client = clients.find((c) => c.id === project.client_id);
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const todoCount = projectTasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = projectTasks.filter((t) => t.status === 'in-progress').length;
  const doneCount = projectTasks.filter((t) => t.status === 'done').length;

  return (
    <ModalShell
      title="프로젝트 상세보기"
      onClose={onClose}
      actions={
        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <button
            onClick={onDelete}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            삭제
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            수정
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500">프로젝트명</label>
          <p className="mt-1 text-base font-bold text-gray-800">{project.name}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500">상태</label>
            <p className="mt-1">
              <span
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full font-semibold',
                  project.status === '준비중'
                    ? 'bg-purple-100 text-purple-700'
                    : project.status === '기획중'
                      ? 'bg-yellow-100 text-yellow-700'
                      : project.status === '진행중'
                        ? 'bg-blue-100 text-blue-700'
                        : project.status === '운영중'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                )}
              >
                {project.status}
              </span>
            </p>
          </div>
          {project.cat && (
            <div>
              <label className="text-xs font-semibold text-gray-500">카테고리</label>
              <p className="mt-1 text-sm text-gray-800">{project.cat}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500">시작일</label>
            <p className="mt-1 text-sm text-gray-800">{project.startDate}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">종료일</label>
            <p className="mt-1 text-sm text-gray-800">{project.endDate}</p>
          </div>
        </div>

        {client && (
          <div>
            <label className="text-xs font-semibold text-gray-500">클라이언트</label>
            <p className="mt-1 text-sm text-gray-800">
              {client.company_name_ko || client.company_name_en || '클라이언트'}
            </p>
          </div>
        )}

        {project.pm_name && (
          <div>
            <label className="text-xs font-semibold text-gray-500">PM</label>
            <p className="mt-1 text-sm text-gray-800">{project.pm_name}</p>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <label className="text-xs font-semibold text-gray-500 mb-3 block">할일 통계</label>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">할일</p>
              <p className="text-lg font-bold text-gray-700">{todoCount}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 mb-1">진행중</p>
              <p className="text-lg font-bold text-blue-700">{inProgressCount}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 mb-1">완료</p>
              <p className="text-lg font-bold text-green-700">{doneCount}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-gray-500">관련 할일 ({projectTasks.length})</label>
            <button
              onClick={onAddTask}
              className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              할일 추가
            </button>
          </div>
          {projectTasks.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {projectTasks.map((task) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
                return (
                  <div
                    key={task.id}
                    className={cn(
                      'p-3 rounded-lg border',
                      isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{task.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {task.assignee && <span>담당: {task.assignee}</span>}
                          {task.dueDate && (
                            <span className={cn(isOverdue && 'text-red-600 font-semibold')}>
                              마감: {task.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-xs px-2 py-1 rounded-full font-medium',
                            task.status === 'done'
                              ? 'bg-green-100 text-green-700'
                              : task.status === 'in-progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {task.status === 'done' ? '완료' : task.status === 'in-progress' ? '진행중' : '할일'}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => onEditTask(task)}
                            className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                            title="수정"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg border border-gray-200">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">등록된 할일이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

// Task Detail Modal
function TaskDetailModal({
  task,
  projects,
  onClose,
  onEdit,
  onDelete,
}: {
  task: any;
  projects: any[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const project = projects.find((p) => p.id === task.projectId);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <ModalShell
      title="할일 상세보기"
      onClose={onClose}
      actions={
        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <button
            onClick={onDelete}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            삭제
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            수정
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500">업무 제목</label>
          <p className="mt-1 text-base font-bold text-gray-800">{task.title}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500">상태</label>
            <p className="mt-1">
              <span
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full font-semibold',
                  task.status === 'done'
                    ? 'bg-green-100 text-green-700'
                    : task.status === 'in-progress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                )}
              >
                {task.status === 'done' ? '완료' : task.status === 'in-progress' ? '진행중' : '할일'}
              </span>
            </p>
          </div>
          {(task as any).priority && (
            <div>
              <label className="text-xs font-semibold text-gray-500">우선순위</label>
              <p className="mt-1">
                <span
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-semibold',
                    (task as any).priority === 'high'
                      ? 'bg-red-100 text-red-700'
                      : (task as any).priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {(task as any).priority === 'high' ? '높음' : (task as any).priority === 'medium' ? '보통' : '낮음'}
                </span>
              </p>
            </div>
          )}
        </div>

        {project && (
          <div>
            <label className="text-xs font-semibold text-gray-500">프로젝트</label>
            <p className="mt-1 text-sm text-gray-800">{project.name}</p>
          </div>
        )}

        {task.assignee && (
          <div>
            <label className="text-xs font-semibold text-gray-500">담당자</label>
            <p className="mt-1 text-sm text-gray-800">{task.assignee}</p>
          </div>
        )}

        {task.dueDate && (
          <div>
            <label className="text-xs font-semibold text-gray-500">마감일</label>
            <p className={cn('mt-1 text-sm font-medium', isOverdue ? 'text-red-600 font-bold' : 'text-gray-800')}>
              {task.dueDate}
              {isOverdue && <span className="ml-2 text-red-600">(지연)</span>}
            </p>
          </div>
        )}

        {(task as any).tag && (
          <div>
            <label className="text-xs font-semibold text-gray-500">태그</label>
            <p className="mt-1 text-sm text-gray-800">{(task as any).tag}</p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
