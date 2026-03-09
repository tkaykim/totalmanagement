'use client';

import { useMemo, useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChartLine,
  Check,
  CheckSquare,
  Clock,
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
  Menu,
  Building,
  Package,
  Car,
  ClipboardList,
  Bug,
  CalendarDays,
  FileText,
} from 'lucide-react';
import {
  useWorkStatus,
  WorkStatusWelcomeModal,
  WorkStatusLogoutModal,
  WorkStatusOvertimeModal,
  WorkStatusAutoCheckoutWarningModal,
} from '@/components/WorkStatusHeader';
import { WorkStatusFullScreen } from '@/components/WorkStatusFullScreen';
import { DashboardHeader } from '@/components/DashboardHeader';
import type { PeriodType } from '@/components/PeriodSelector';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format, isWithinInterval, parseISO, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { getTodayKST } from '@/lib/timezone';
import { getVisibleMenus, canViewAllBuStats, canCreateProject, canEditTask, type AppUser as PermAppUser, type Task as PermTask, type Project as PermProject } from '@/lib/permissions';
import {
  useProjects,
  useTasks,
  useFinancialEntries,
  useCreateProject,
  useCreateTask,
  useDeleteTask,
  useCreateFinancialEntry,
  useUpdateTask,
  useUpdateProject,
  useDeleteProject,
  useUpdateFinancialEntry,
  useDeleteFinancialEntry,
  useOrgMembers,
  useCreateOrgMember,
  useUpdateOrgMember,
  useDeleteOrgMember,
  useExternalWorkers,
  useCreateExternalWorker,
  useUpdateExternalWorker,
  useDeleteExternalWorker,
  useUsers,
  useCreateUser,
  useUpdateUser,
  usePartners,
  usePartnerCompanies,
  usePartnerWorkers,
  useArtists,
  useChannels,
  useCreateChannel,
} from '@/features/erp/hooks';
import {
  dbProjectToFrontend,
  dbTaskToFrontend,
  dbFinancialToFrontend,
  frontendProjectToDb,
  frontendTaskToDb,
  frontendFinancialToDb,
} from '@/features/erp/utils';
import { UnifiedProjectModal } from '@/features/erp/components/UnifiedProjectModal';
import { DashboardView } from '@/features/erp/components/DashboardView';
import { AdminResourceView } from '@/features/erp/components/AdminResourceView';
import { registerBackButtonCallback } from '@/lib/capacitor';
import { StatCard } from '@/features/erp/components/StatCard';
import { ProjectsView } from '@/features/erp/components/ProjectsView';
import { SettlementView } from '@/features/erp/components/SettlementView';
import { AttendanceManagementView } from '@/features/attendance/components/AttendanceManagementView';
import { AttendanceAdminView } from '@/features/attendance/components/AttendanceAdminView';
import { LeaveManagementView } from '@/features/leave/components/LeaveManagementView';
import { LeaveAdminView } from '@/features/leave/components/LeaveAdminView';
import { BuTabs } from '@/features/erp/components/BuTabs';
import { FinanceRow } from '@/features/erp/components/FinanceRow';
import { DeleteConfirmModal } from '@/features/erp/components/modal-components';
import { UnifiedTaskModal } from '@/features/erp/components/UnifiedTaskModal';
import { CreateOrgMemberModal, EditOrgMemberModal, CreateExternalWorkerModal, EditExternalWorkerModal } from '@/features/erp/components/OrgModals';
import { EditUserModal, CreateUserModal } from '@/features/erp/components/UserModals';
import { TasksView } from '@/features/erp/components/TasksView';
import { OrganizationView } from '@/features/erp/components/OrganizationView';
import { CreateFinanceModal, EditFinanceModal } from '@/features/erp/components/FinanceFormModals';
import { CommentSection } from '@/features/comments/components/CommentSection';
import { PartnersView } from '@/features/partners/components/PartnersView';
import { MeetingRoomView } from '@/features/reservations/components/MeetingRoomView';
import { EquipmentRentalView } from '@/features/reservations/components/EquipmentRentalView';
import { VehicleLogView } from '@/features/reservations/components/VehicleLogView';
import { WorkLogView, AdminWorkLogView } from '@/features/work-log';
import { BugReportsView } from '@/features/bug-reports';
import { ExclusiveArtistsView } from '@/features/exclusive-artists';
import { TaskTemplateView } from '@/features/task-template/components/TaskTemplateView';
import { TaskTemplateSelector, type PendingTask } from '@/features/task-template/components/TaskTemplateSelector';
import { toast } from '@/hooks/use-toast';
import { ManualsView } from '@/features/manuals';
import { DocumentRoomView } from '@/features/document-room/components/DocumentRoomView';
import { PushTestView } from '@/features/push-test';
import { AiWorkInsightView } from '@/features/ai-work-insight';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SidebarContent } from '@/components/SidebarContent';
import {
  BU,
  View,
  Project,
  FinancialEntry,
  FinancialEntryStatus,
  Member,
  TaskItem,
  BU_TITLES,
  BU_LABELS,
  BU_CHIP_STYLES,
  formatCurrency,
} from '@/features/erp/types';

const isDateInRange = (date: string, start?: string, end?: string) => {
  if (!start || !end) return true;
  const target = parseISO(date);
  return isWithinInterval(target, { start: parseISO(start), end: parseISO(end) });
};

export default function HomePageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>}>
      <HomePage />
    </Suspense>
  );
}

function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialView = (searchParams.get('view') as View) || 'dashboard';
  const [view, setView] = useState<View>(initialView);
  const [bu, setBu] = useState<BU | 'ALL'>('GRIGO');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // BU 변경 핸들러 - 모든 BU 버튼은 동일하게 BU만 변경하고 뷰는 유지
  const handleBuChange = (newBu: BU | 'ALL') => {
    setBu(newBu);
  };
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [selectedQuarterYear, setSelectedQuarterYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [customRange, setCustomRange] = useState<{ start?: string; end?: string }>({});
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 딥링크 진입 감지 (알림 클릭으로 특정 뷰로 직접 이동 시)
  const [isDeepLink, setIsDeepLink] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      // sessionStorage 플래그 (Capacitor 네이티브 앱에서 설정)
      const flag = sessionStorage.getItem('push_deep_link');
      if (flag) {
        sessionStorage.removeItem('push_deep_link');
        return true;
      }
      // URL 파라미터 (PWA 서비스 워커에서 새 창 열 때 설정)
      const params = new URLSearchParams(window.location.search);
      if (params.get('_deeplink') === '1') {
        params.delete('_deeplink');
        const newUrl = params.toString()
          ? `${window.location.pathname}?${params.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        return true;
      }
    } catch { }
    return false;
  });

  // 딥링크 모드는 일정 시간 후 자동 해제 (이후 정상 동작)
  useEffect(() => {
    if (isDeepLink) {
      const timer = setTimeout(() => setIsDeepLink(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isDeepLink]);

  // 서비스 워커 postMessage 수신 (기존 창에서 알림 클릭 시)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_DEEP_LINK') {
        setIsDeepLink(true);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const workStatusHook = useWorkStatus();

  // 권한에 따른 메뉴 표시 설정
  const visibleMenus = useMemo(() => {
    if (!user?.profile) return ['dashboard', 'tasks', 'attendance'];
    const permUser: PermAppUser = {
      id: user.id,
      role: user.profile.role,
      bu_code: user.profile.bu_code,
      name: user.profile.name,
      position: user.profile.position,
    };
    const menus = getVisibleMenus(permUser);
    if (user?.email === 'tommy0621@naver.com') {
      menus.push('aiWorkInsight');
    }
    return menus;
  }, [user]);

  // 전체 BU 통계 조회 권한 (admin만)
  const canViewAllStats = useMemo(() => {
    if (!user?.profile) return false;
    const permUser: PermAppUser = {
      id: user.id,
      role: user.profile.role,
      bu_code: user.profile.bu_code,
    };
    return canViewAllBuStats(permUser);
  }, [user]);

  // 프로젝트 생성 권한
  const canCreateProjectFlag = useMemo(() => {
    if (!user?.profile) return false;
    const permUser: PermAppUser = {
      id: user.id,
      role: user.profile.role,
      bu_code: user.profile.bu_code,
    };
    return canCreateProject(permUser);
  }, [user]);

  // API 데이터 로딩
  const { data: projectsData = [], isLoading: projectsLoading } = useProjects();
  const { data: tasksData = [] } = useTasks(); // bu 필터 제거 - 모든 할일 가져오기
  const { data: orgData = [] } = useOrgMembers();
  const { data: externalWorkersData = [] } = useExternalWorkers();
  const { data: usersData } = useUsers();
  const { data: partnersData = [] } = usePartners(bu === 'ALL' ? undefined : bu);
  const { data: partnerCompaniesData = [] } = usePartnerCompanies(bu === 'ALL' ? undefined : bu);
  const { data: partnerWorkersData = [] } = usePartnerWorkers(bu === 'ALL' ? undefined : bu);
  const { data: artistsData = [] } = useArtists(bu === 'ALL' ? undefined : bu);
  const { data: channelsData = [] } = useChannels(bu === 'ALL' ? undefined : bu);
  const queryClient = useQueryClient();
  const createChannelMutation = useCreateChannel();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();

  // 타입 변환
  const projects = useMemo(() => projectsData.map(dbProjectToFrontend), [projectsData]);
  const tasks = useMemo(() => tasksData.map(dbTaskToFrontend), [tasksData]);

  // URL 파라미터에서 view 변경 감지 (알림 클릭 등으로 URL이 변할 때). URL을 단일 소스로 유지해 모달 닫은 뒤 사이드바 메뉴가 정상 동작하도록 함.
  useEffect(() => {
    const urlView = searchParams.get('view') as View | null;
    const urlId = searchParams.get('id');

    if (urlView) {
      if (urlView !== view) setView(urlView);
    } else {
      if (view !== 'dashboard') setView('dashboard');
    }

    // id 파라미터가 있으면 해당 프로젝트/할일 모달 직접 오픈
    if (urlId) {
      const targetView = urlView || view;
      let opened = false;
      if (targetView === 'projects') {
        const project = projects.find(p => String(p.id) === urlId);
        if (project) {
          setEditProjectModalOpen(project);
          opened = true;
        }
      } else if (targetView === 'tasks') {
        const task = tasks.find(t => String(t.id) === urlId);
        if (task) {
          setEditTaskModalOpen(task);
          opened = true;
        }
      }
      if (opened) {
        const url = new URL(window.location.href);
        url.searchParams.delete('id');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams, projects, tasks, view]);

  // 사이드바 메뉴 클릭 시 URL을 갱신해 view와 URL이 항상 동기화되도록 함 (모달 닫은 뒤 다른 메뉴 클릭이 먹히도록)
  const handleNavigateToView = useCallback(
    (newView: View) => {
      if (newView === 'dashboard') {
        router.replace('/');
      } else {
        router.replace(`/?view=${newView}`);
      }
    },
    [router]
  );

  // Mutations
  const createProjectMutation = useCreateProject();
  const createTaskMutation = useCreateTask();
  const deleteTaskMutation = useDeleteTask();
  const createFinancialMutation = useCreateFinancialEntry();
  const updateTaskMutation = useUpdateTask();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const updateFinancialMutation = useUpdateFinancialEntry();
  const deleteFinancialMutation = useDeleteFinancialEntry();
  const createOrgMemberMutation = useCreateOrgMember();
  const updateOrgMemberMutation = useUpdateOrgMember();
  const deleteOrgMemberMutation = useDeleteOrgMember();
  const createExternalWorkerMutation = useCreateExternalWorker();
  const updateExternalWorkerMutation = useUpdateExternalWorker();
  const deleteExternalWorkerMutation = useDeleteExternalWorker();

  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [isFinanceModalOpen, setFinanceModalOpen] = useState<null | 'revenue' | 'expense'>(null);
  const [financeDefaultProjectId, setFinanceDefaultProjectId] = useState<string | null>(null);
  const [isEditFinanceModalOpen, setEditFinanceModalOpen] = useState<FinancialEntry | null>(null);
  const [isEditTaskModalOpen, setEditTaskModalOpen] = useState<TaskItem | null>(null);
  const [isEditProjectModalOpen, setEditProjectModalOpen] = useState<Project | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [modalProjectId, setModalProjectId] = useState<string | null>(null);
  const [taskModalProjectId, setTaskModalProjectId] = useState<string | undefined>(undefined);
  const [isOrgMemberModalOpen, setOrgMemberModalOpen] = useState<boolean>(false);
  const [isEditOrgMemberModalOpen, setEditOrgMemberModalOpen] = useState<any | null>(null);
  const [deleteOrgMemberId, setDeleteOrgMemberId] = useState<number | null>(null);
  const [selectedOrgUnitId, setSelectedOrgUnitId] = useState<number | null>(null);
  const [orgViewTab, setOrgViewTab] = useState<'org' | 'external' | 'users'>('org');
  const [isEditUserModalOpen, setEditUserModalOpen] = useState<any | null>(null);
  const [isCreateUserModalOpen, setCreateUserModalOpen] = useState<boolean>(false);
  const [isExternalWorkerModalOpen, setExternalWorkerModalOpen] = useState<boolean>(false);
  const [isEditExternalWorkerModalOpen, setEditExternalWorkerModalOpen] = useState<any | null>(null);
  const [deleteExternalWorkerId, setDeleteExternalWorkerId] = useState<number | null>(null);
  const [templateSelectorProjectId, setTemplateSelectorProjectId] = useState<number | null>(null);

  // Android 하드웨어 뒤로가기 버튼 처리
  useEffect(() => {
    const cleanup = registerBackButtonCallback(() => {
      // 1. 열린 모달 닫기 (먼저 체크)
      if (isEditProjectModalOpen) { setEditProjectModalOpen(null); return true; }
      if (isEditTaskModalOpen) { setEditTaskModalOpen(null); return true; }
      if (isEditFinanceModalOpen) { setEditFinanceModalOpen(null); return true; }
      if (isProjectModalOpen) { setProjectModalOpen(false); return true; }
      if (isTaskModalOpen) { setTaskModalOpen(false); setTaskModalProjectId(undefined); return true; }
      if (isFinanceModalOpen) { setFinanceModalOpen(null); setFinanceDefaultProjectId(null); return true; }
      if (isOrgMemberModalOpen) { setOrgMemberModalOpen(false); return true; }
      if (isEditOrgMemberModalOpen) { setEditOrgMemberModalOpen(null); return true; }
      if (isCreateUserModalOpen) { setCreateUserModalOpen(false); return true; }
      if (isEditUserModalOpen) { setEditUserModalOpen(null); return true; }
      if (isExternalWorkerModalOpen) { setExternalWorkerModalOpen(false); return true; }
      if (isEditExternalWorkerModalOpen) { setEditExternalWorkerModalOpen(null); return true; }
      if (deleteProjectId) { setDeleteProjectId(null); return true; }
      if (deleteOrgMemberId) { setDeleteOrgMemberId(null); return true; }
      if (deleteExternalWorkerId) { setDeleteExternalWorkerId(null); return true; }
      if (modalProjectId) { setModalProjectId(null); return true; }
      if (templateSelectorProjectId) { setTemplateSelectorProjectId(null); return true; }
      if (mobileMenuOpen) { setMobileMenuOpen(false); return true; }

      // 2. 대시보드가 아닌 뷰에 있으면 대시보드로 이동
      if (view !== 'dashboard') {
        setView('dashboard');
        return true;
      }

      // 3. 대시보드에 있으면 처리 안 함 → backButton.ts에서 앱 최소화
      return false;
    });

    return cleanup;
  }, [
    view, mobileMenuOpen,
    isEditProjectModalOpen, isEditTaskModalOpen, isEditFinanceModalOpen,
    isProjectModalOpen, isTaskModalOpen, isFinanceModalOpen,
    isOrgMemberModalOpen, isEditOrgMemberModalOpen,
    isCreateUserModalOpen, isEditUserModalOpen,
    isExternalWorkerModalOpen, isEditExternalWorkerModalOpen,
    deleteProjectId, deleteOrgMemberId, deleteExternalWorkerId,
    modalProjectId, templateSelectorProjectId,
  ]);

  const [formState, setFormState] = useState<{
    type: 'revenue' | 'expense';
    cat: string;
    name: string;
    amount: string;
    date: string;
    partnerEntityFilter: 'person' | 'organization' | '';
    partnerId: string;
    paymentMethod: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '';
  }>({
    type: 'revenue',
    cat: '',
    name: '',
    amount: '',
    date: '',
    partnerEntityFilter: '',
    partnerId: '',
    paymentMethod: '',
  });
  const [formError, setFormError] = useState<string>('');

  // 인증 상태 확인
  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // app_users 테이블에서 사용자 정보 가져오기
      const { data: appUser } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', user.id)
        .single();

      // 퇴사 처리된 사용자는 로그인 불가
      if (appUser?.status === 'retired') {
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      // bu_code가 null인 경우 로그인 페이지로 리디렉션
      if (!appUser?.bu_code) {
        router.push('/login');
        return;
      }

      // artist role인 경우 /artist로 리다이렉션 (루트 페이지 접근 불가)
      if (appUser.role === 'artist') {
        router.push('/artist');
        return;
      }

      // 본인 소속의 bu_code를 기반으로 BuTabs 선택
      // HEAD 사용자는 '전체(ALL)' 탭이 선택되도록
      if (appUser.bu_code === 'HEAD') {
        setBu('ALL');
      } else {
        setBu(appUser.bu_code as BU);
      }

      setUser({ ...user, profile: appUser });
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Financial entries는 기간 필터링을 위해 별도로 관리
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
    const totalRev = filteredRevenues.reduce((sum, r) => sum + r.amount, 0);
    const totalExp = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    return { totalRev, totalExp, totalProfit: totalRev - totalExp };
  }, [filteredExpenses, filteredRevenues]);

  const buCards = useMemo(
    () =>
      (Object.keys(BU_TITLES) as BU[]).map((key) => {
        const buProjects = projects.filter((p) => p.bu === key);
        const buRev = filteredRevenues
          .filter((r) => buProjects.some((p) => p.id === r.projectId))
          .reduce((sum, r) => sum + r.amount, 0);
        const buExp = filteredExpenses
          .filter((e) => buProjects.some((p) => p.id === e.projectId))
          .reduce((sum, e) => sum + e.amount, 0);
        return { bu: key, projects: buProjects.length, revenue: buRev, expense: buExp, profit: buRev - buExp };
      }),
    [filteredExpenses, filteredRevenues, projects],
  );

  const currentProjects = useMemo(
    () => bu === 'ALL' ? projects : projects.filter((p) => p.bu === bu),
    [bu, projects],
  );

  const modalProject = useMemo(() => {
    if (!modalProjectId) return null;
    const found = projects.find((p) => String(p.id) === String(modalProjectId));
    return found ?? null;
  }, [modalProjectId, projects]);

  const modalEntries = useMemo(() => {
    if (!modalProjectId) {
      return {
        revenues: [] as FinancialEntry[],
        expenses: [] as FinancialEntry[],
        totalRevenue: 0,
        totalExpense: 0,
        totalProfit: 0,
        periodRevenue: 0,
        periodExpense: 0,
        periodProfit: 0,
      };
    }
    const rev = revenues.filter((r) => r.projectId === modalProjectId);
    const exp = expenses.filter((e) => e.projectId === modalProjectId);
    const revTotal = rev.reduce((sum, r) => sum + r.amount, 0);
    const expTotal = exp.reduce((sum, e) => sum + e.amount, 0);
    const revPeriod = rev
      .filter((r) => isDateInRange(r.date, activePeriod.start, activePeriod.end))
      .reduce((sum, r) => sum + r.amount, 0);
    const expPeriod = exp
      .filter((e) => isDateInRange(e.date, activePeriod.start, activePeriod.end))
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      revenues: rev,
      expenses: exp,
      totalRevenue: revTotal,
      totalExpense: expTotal,
      totalProfit: revTotal - expTotal,
      periodRevenue: revPeriod,
      periodExpense: expPeriod,
      periodProfit: revPeriod - expPeriod,
    };
  }, [activePeriod.end, activePeriod.start, expenses, modalProjectId, revenues]);

  const settlementRows = useMemo(() => {
    if (bu === 'ALL') {
      const revRows = filteredRevenues;
      const expRows = filteredExpenses;
      return { revRows, expRows };
    }
    const buProjectIds = projects.filter((p) => p.bu === bu).map((p) => p.id);
    const revRows = filteredRevenues.filter((r) => buProjectIds.includes(r.projectId));
    const expRows = filteredExpenses.filter((e) => buProjectIds.includes(e.projectId));
    return { revRows, expRows };
  }, [bu, filteredExpenses, filteredRevenues, projects]);

  const revenueShare = useMemo(() => {
    const total = filteredRevenues.reduce((sum, r) => sum + r.amount, 0);
    return (Object.keys(BU_TITLES) as BU[]).map((key) => {
      const buProjectIds = projects.filter((p) => p.bu === key).map((p) => p.id);
      const amount = filteredRevenues
        .filter((r) => buProjectIds.includes(r.projectId))
        .reduce((sum, r) => sum + r.amount, 0);
      const ratio = total === 0 ? 0 : Math.round((amount / total) * 100);
      return { bu: key, amount, ratio };
    });
  }, [filteredRevenues, projects]);

  const handlePeriodTypeChange = (type: 'all' | 'year' | 'quarter' | 'month' | 'custom') => {
    setPeriodType(type);
    if (type !== 'custom') {
      setCustomRange({ start: undefined, end: undefined });
    }
  };

  const handleDateChange = (key: 'start' | 'end', value: string) => {
    setCustomRange((prev) => ({ ...prev, [key]: value }));
  };

  // 연도 옵션 생성 (2021년부터 2027년까지)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const maxYear = Math.max(currentYear, 2027);
    return Array.from({ length: maxYear - 2021 + 1 }, (_, i) => 2021 + i).reverse();
  }, []);

  const handleProjectDateChange = async (key: 'startDate' | 'endDate', value: string) => {
    if (!modalProjectId) return;
    const project = projects.find((p) => p.id === modalProjectId);
    if (!project) return;
    try {
      await updateProjectMutation.mutateAsync({
        id: Number(modalProjectId),
        data: { [key === 'startDate' ? 'start_date' : 'end_date']: value },
      });
    } catch (error) {
      console.error('Failed to update project date:', error);
    }
  };

  const calculateActualAmount = (amount: number, paymentMethod: string): number | null => {
    if (!paymentMethod || !amount) return null;

    switch (paymentMethod) {
      case 'vat_included':
        // 부가세 포함 (10% 부가세 증액): 금액 * 1.1
        return Math.round(amount * 1.1);
      case 'tax_free':
        // 면세 (0%): 금액 그대로
        return amount;
      case 'withholding':
        // 원천징수 (3.3% 제외): 금액 * 0.967
        return Math.round(amount * 0.967);
      case 'actual_payment':
        // 실지급액: 금액 그대로
        return amount;
      default:
        return null;
    }
  };

  const handleAddEntry = async () => {
    if (!modalProjectId) return;

    const missingFields: string[] = [];
    if (!formState.cat) missingFields.push('구분');
    if (!formState.name) missingFields.push('항목명');
    if (!formState.amount) missingFields.push('금액');

    if (missingFields.length > 0) {
      setFormError(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
      return;
    }

    setFormError('');
    const project = projects.find((p) => p.id === modalProjectId);
    if (!project) return;

    const amount = Number(formState.amount);
    const actualAmount = formState.paymentMethod
      ? calculateActualAmount(amount, formState.paymentMethod)
      : null;

    try {
      const dbData = frontendFinancialToDb({
        projectId: modalProjectId,
        bu: project.bu,
        type: formState.type,
        category: formState.cat,
        name: formState.name,
        amount: amount,
        date: formState.date || getTodayKST(),
        status: 'planned',
        partner_id: formState.partnerId ? Number(formState.partnerId) : null,
        payment_method: formState.paymentMethod || null,
        actual_amount: actualAmount,
      });
      await createFinancialMutation.mutateAsync(dbData);
      setFormState((prev) => ({
        ...prev,
        cat: '',
        name: '',
        amount: '',
        date: '',
        partnerEntityFilter: '',
        partnerId: '',
        paymentMethod: '',
      }));
      setFormError('');
    } catch (error) {
      console.error('Failed to add entry:', error);
      setFormError('등록 중 오류가 발생했습니다.');
    }
  };

  const handleCreateProject = async (payload: {
    name: string;
    bu: BU;
    cat: string;
    startDate: string;
    endDate: string;
    description?: string | null;
    pm_id?: string | null;
    partner_company_id?: number | null;
    partner_worker_id?: number | null;
    artist_id?: number | null;
    channel_id?: number | null;
    status?: string;
    participants?: Array<{ user_id?: string; partner_worker_id?: number; partner_company_id?: number; role?: string }>;
    pendingTasks?: PendingTask[];
  }): Promise<{ id: string } | void> => {
    if (!payload.name || !payload.cat) return;
    try {
      const { pendingTasks: tasksToCreate, ...projectPayload } = payload;
      const dbData = frontendProjectToDb(projectPayload);
      const createdProject = await createProjectMutation.mutateAsync(dbData);

      const projectId = createdProject?.id != null ? Number(createdProject.id) : null;
      if (projectId != null && tasksToCreate && tasksToCreate.length > 0) {
        let failedCount = 0;
        for (const task of tasksToCreate) {
          try {
            await createTaskMutation.mutateAsync({
              project_id: projectId,
              bu_code: payload.bu,
              title: task.title,
              description: task.description ?? undefined,
              due_date: task.dueDate || '',
              status: 'todo',
              priority: task.priority || 'medium',
              manual_id: task.manual_id ?? undefined,
              assignee_id: task.assignee_id ?? undefined,
              assignee: task.assignee ?? '',
            });
          } catch (taskErr) {
            failedCount += 1;
            console.error('Failed to create task:', taskErr);
          }
        }
        if (failedCount > 0) {
          toast({
            variant: 'destructive',
            title: '일부 할일 생성 실패',
            description: `${failedCount}개의 할일 생성에 실패했습니다. 프로젝트는 생성되었습니다.`,
          });
        }
      }

      setProjectModalOpen(false);
      return createdProject?.id != null ? { id: String(createdProject.id) } : undefined;
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        variant: 'destructive',
        title: '프로젝트 생성 실패',
        description: error instanceof Error ? error.message : String(error),
      });
      setProjectModalOpen(false);
      return undefined;
    }
  };

  const handleUpdateProject = async (payload: {
    id?: string;
    name: string;
    bu: BU;
    cat: string;
    startDate: string;
    endDate: string;
    description?: string | null;
    pm_id?: string | null;
    partner_company_id?: number | null;
    partner_worker_id?: number | null;
    artist_id?: number | null;
    channel_id?: number | null;
    status?: string;
    participants?: Array<{ user_id?: string; partner_worker_id?: number; partner_company_id?: number; role?: string }>;
  }): Promise<{ id: string } | void> => {
    if (!payload.name || !payload.cat || !payload.id) return;
    try {
      const dbData = frontendProjectToDb({
        bu: payload.bu,
        name: payload.name,
        cat: payload.cat,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: payload.status,
        description: payload.description,
        pm_id: payload.pm_id,
        partner_company_id: payload.partner_company_id,
        partner_worker_id: payload.partner_worker_id,
        artist_id: payload.artist_id,
        channel_id: payload.channel_id,
        participants: payload.participants,
      });
      await updateProjectMutation.mutateAsync({ id: Number(payload.id), data: dbData });
      setEditProjectModalOpen(null);
      return { id: payload.id };
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProjectMutation.mutateAsync(Number(id));
      setDeleteProjectId(null);
      if (modalProjectId === id) {
        setModalProjectId(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('프로젝트 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCreateTask = async (payload: {
    title: string;
    description?: string;
    bu: BU;
    projectId: string;
    assignee_id?: string;
    assignee: string;
    dueDate: string;
    status: TaskItem['status'];
    priority: TaskItem['priority'];
    manual_id?: number | null;
  }): Promise<string | null> => {
    if (!payload.title?.trim()) {
      return '제목을 입력해주세요.';
    }
    if (!payload.projectId?.trim()) {
      return '프로젝트를 선택해주세요.';
    }

    try {
      const dbData = frontendTaskToDb(payload);
      await createTaskMutation.mutateAsync(dbData);
      setTaskModalOpen(false);
      setTaskModalProjectId(undefined);
      return null;
    } catch (error) {
      console.error('Failed to create task:', error);
      return '등록 중 오류가 발생했습니다.';
    }
  };

  const handleCreateFinance = async (payload: {
    type: 'revenue' | 'expense';
    projectId: string;
    bu: BU;
    cat: string;
    name: string;
    amount: string;
    date: string;
    status: FinancialEntryStatus;
    partnerId?: string;
    paymentMethod?: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '';
  }): Promise<string | null> => {
    const missingFields: string[] = [];
    if (!payload.projectId) missingFields.push('프로젝트');
    if (!payload.cat) missingFields.push('구분');
    if (!payload.name) missingFields.push('항목명');
    if (!payload.amount) missingFields.push('금액');

    if (missingFields.length > 0) {
      return `다음 항목을 입력해주세요: ${missingFields.join(', ')}`;
    }

    const amount = Number(payload.amount);
    const actualAmount = payload.paymentMethod
      ? calculateActualAmount(amount, payload.paymentMethod)
      : null;

    try {
      const dbData = frontendFinancialToDb({
        projectId: payload.projectId,
        bu: payload.bu,
        type: payload.type,
        category: payload.cat,
        name: payload.name,
        amount: amount,
        date: payload.date,
        status: payload.status,
        partner_id: payload.partnerId ? Number(payload.partnerId) : null,
        payment_method: payload.paymentMethod || null,
        actual_amount: actualAmount,
      });
      await createFinancialMutation.mutateAsync(dbData);
      setFinanceModalOpen(null);
      return null;
    } catch (error) {
      console.error('Failed to create financial entry:', error);
      return '등록 중 오류가 발생했습니다.';
    }
  };

  const handleUpdateFinance = async (payload: {
    id: string;
    type: 'revenue' | 'expense';
    projectId: string;
    bu: BU;
    cat: string;
    name: string;
    amount: string;
    date: string;
    status: FinancialEntryStatus;
    partnerId?: string;
    paymentMethod?: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '';
  }) => {
    if (!payload.cat || !payload.name || !payload.amount) return;
    try {
      const today = getTodayKST();
      const amount = Number(payload.amount);
      const actualAmount = payload.paymentMethod
        ? calculateActualAmount(amount, payload.paymentMethod)
        : null;

      const dbData = {
        kind: payload.type,
        category: payload.cat,
        name: payload.name,
        amount: amount,
        occurred_at: payload.date || today,
        status: payload.status,
        partner_id: payload.partnerId ? Number(payload.partnerId) : null,
        payment_method: payload.paymentMethod || null,
        actual_amount: actualAmount,
      };
      await updateFinancialMutation.mutateAsync({ id: Number(payload.id), data: dbData });
      setEditFinanceModalOpen(null);
    } catch (error) {
      console.error('Failed to update financial entry:', error);
    }
  };

  const handleUpdateTask = async (payload: {
    id?: string;
    title: string;
    description?: string;
    bu: BU;
    projectId: string;
    assignee_id?: string;
    assignee: string;
    dueDate: string;
    status: TaskItem['status'];
    priority: TaskItem['priority'];
    manual_id?: number | null;
  }): Promise<string | null> => {
    if (!payload.id) return '할 일 ID가 없습니다.';
    if (!payload.title?.trim()) return '제목을 입력해주세요.';
    if (!payload.projectId) return '프로젝트를 선택해주세요.';

    try {
      const dbData = frontendTaskToDb({
        projectId: payload.projectId,
        bu: payload.bu,
        title: payload.title,
        description: payload.description,
        assignee_id: payload.assignee_id,
        assignee: payload.assignee,
        dueDate: payload.dueDate,
        status: payload.status,
        priority: payload.priority,
        manual_id: payload.manual_id,
      });
      await updateTaskMutation.mutateAsync({ id: Number(payload.id), data: dbData });
      setEditTaskModalOpen(null);
      return null;
    } catch (error) {
      console.error('Failed to update task:', error);
      return '수정 중 오류가 발생했습니다.';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 dark:bg-slate-900">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 상태 로딩 중일 때는 로딩 화면 표시 (딥링크 진입 시에는 건너뜀)
  if (workStatusHook.isStatusLoading && !isDeepLink) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
        <p className="text-slate-400">근무 상태 확인 중...</p>
      </div>
    );
  }

  // OFF_WORK 또는 BREAK 상태일 때는 전체 화면 페이지만 표시
  // OFF_WORK 또는 BREAK 상태일 때 전체 화면 (딥링크 진입 시에는 건너뜀)
  if ((workStatusHook.workStatus === 'OFF_WORK' || workStatusHook.workStatus === 'BREAK') && !isDeepLink) {
    return (
      <>
        <WorkStatusFullScreen
          workStatus={workStatusHook.workStatus}
          currentTime={workStatusHook.currentTime}
          userName={workStatusHook.userName}
          userInitials={workStatusHook.userInitials}
          isChanging={workStatusHook.isChanging}
          onStatusChange={workStatusHook.handleStatusChange}
          formatTimeDetail={workStatusHook.formatTimeDetail}
          formatDateDetail={workStatusHook.formatDateDetail}
        />
        <WorkStatusWelcomeModal
          showWelcome={workStatusHook.showWelcome}
          welcomeTitle={workStatusHook.welcomeTitle}
          welcomeMsg={workStatusHook.welcomeMsg}
        />
        <WorkStatusLogoutModal
          showLogoutConfirm={workStatusHook.showLogoutConfirm}
          isChanging={workStatusHook.isChanging}
          onCancel={() => workStatusHook.setShowLogoutConfirm(false)}
          onConfirm={workStatusHook.confirmLogout}
        />

        {/* 연장근무 확인 모달 */}
        <WorkStatusOvertimeModal
          show={workStatusHook.showOvertimeConfirm}
          isChanging={workStatusHook.isChanging}
          onCancel={() => workStatusHook.setShowOvertimeConfirm(false)}
          onConfirm={async () => {
            try {
              const res = await fetch('/api/attendance/check-in', { method: 'POST' });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to check in');
              }
              workStatusHook.setShowOvertimeConfirm(false);
              workStatusHook.setWorkStatus('WORKING');
              workStatusHook.triggerWelcome('연장근무 시작!', '오늘도 수고하셨습니다. 연장근무를 시작합니다. 💪');
            } catch (error) {
              console.error('Overtime check-in error:', error);
            }
          }}
        />

        {/* 강제 퇴근 경고 모달 */}
        <WorkStatusAutoCheckoutWarningModal
          show={workStatusHook.showAutoCheckoutWarning}
          logs={workStatusHook.autoCheckoutLogs}
          onConfirmOne={workStatusHook.confirmOneAutoCheckout}
          onRequestCorrection={workStatusHook.requestCorrectionForAutoCheckout}
          onDismiss={workStatusHook.dismissAutoCheckoutWarning}
        />
      </>
    );
  }


  // SidebarContent props (onNavigateToView로 URL 갱신 → useEffect에서 view 동기화되어 모달 닫은 뒤에도 사이드바 메뉴 정상 동작)
  const sidebarProps = {
    view,
    setView,
    onNavigateToView: handleNavigateToView,
    user,
    visibleMenus,
    handleLogout,
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:text-slate-100">
      {/* 데스크톱 사이드바 */}
      <aside className="hidden h-screen w-64 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-slate-900 text-white lg:flex">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* 모바일 사이드바 */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-[320px] bg-slate-900 text-white p-0 border-slate-700 overflow-hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>메뉴</SheetTitle>
          </SheetHeader>
          <SidebarContent {...sidebarProps} onItemClick={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          title={
            view === 'dashboard'
              ? '대시보드'
              : view === 'projects'
                ? '프로젝트 관리'
                : view === 'settlement'
                  ? '정산 관리'
                  : view === 'tasks'
                    ? '할일 관리'
                    : view === 'workLog'
                      ? '업무일지'
                      : view === 'workLogAdmin'
                        ? '업무일지 열람'
                        : view === 'attendance'
                          ? '근태 관리'
                          : view === 'attendanceAdmin'
                            ? '전체 근무현황'
                            : view === 'leave'
                              ? '휴가 관리'
                              : view === 'leaveAdmin'
                                ? '휴가 승인/관리'
                                : view === 'partners'
                                  ? '파트너 관리'
                                  : view === 'exclusiveArtists'
                                    ? '전속 아티스트'
                                    : view === 'meetingRooms'
                                      ? '회의실 예약'
                                      : view === 'equipment'
                                        ? '장비 대여'
                                        : view === 'vehicles'
                                          ? '차량 일지'
                                          : view === 'bugReports'
                                            ? '버그 리포트'
                                            : view === 'manuals'
                                              ? '매뉴얼'
                                              : view === 'documentRoom'
                                                ? '자료실'
                                                : view === 'pushTest'
                                                ? '푸시 알림 테스트'
                                                : view === 'resourceOverview'
                                                  ? '리소스 현황'
                                                  : view === 'aiWorkInsight'
                                                    ? '업무파악, 지시 AI'
                                                    : '조직 현황'
          }
          onMenuClick={() => setMobileMenuOpen(true)}
          periodType={periodType}
          onPeriodTypeChange={handlePeriodTypeChange}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          selectedQuarter={selectedQuarter}
          onQuarterChange={setSelectedQuarter}
          selectedQuarterYear={selectedQuarterYear}
          onQuarterYearChange={setSelectedQuarterYear}
          customRange={customRange}
          onCustomRangeChange={handleDateChange}
          yearOptions={yearOptions}
        />

        <div className={`mx-auto w-full px-3 sm:px-4 py-3 sm:py-8 space-y-3 sm:space-y-6 ${view === 'dashboard' || view === 'leaveAdmin' ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-4 sm:gap-3">
            <QuickAction
              title="프로젝트 등록"
              icon={<FolderKanban className="h-4 w-4" />}
              onClick={() => setProjectModalOpen(true)}
            />
            <QuickAction
              title="할 일 등록"
              icon={<Check className="h-4 w-4" />}
              onClick={() => {
                setTaskModalProjectId(undefined);
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
            <DashboardView
              totals={totals}
              buCards={buCards}
              share={revenueShare}
              tasks={tasks}
              projects={projects}
              revenues={revenues}
              expenses={expenses}
              currentUser={user}
              onProjectClick={(project) => {
                setEditProjectModalOpen(project);
              }}
              onTaskClick={(task) => {
                setEditTaskModalOpen(task);
              }}
              usersData={usersData}
            />
          )}

          {view === 'projects' && (
            <ProjectsView
              bu={bu}
              onBuChange={handleBuChange}
              projects={currentProjects}
              revenues={revenues}
              expenses={expenses}
              onOpenModal={(projectId) => {
                setFinanceDefaultProjectId(projectId);
                setFinanceModalOpen('revenue');
              }}
              onOpenTaskModal={(projectId) => {
                setTaskModalProjectId(projectId);
                setTaskModalOpen(true);
              }}
              onEditFinance={setEditFinanceModalOpen}
              onEditTask={setEditTaskModalOpen}
              onEditProject={setEditProjectModalOpen}
              onDeleteProject={(id) => setDeleteProjectId(id)}
              tasks={tasks}
              usersData={usersData}
              partnerWorkersData={partnerWorkersData}
              partnerCompaniesData={partnerCompaniesData}
            />
          )}

          {view === 'settlement' && (
            <SettlementView
              bu={bu}
              onBuChange={handleBuChange}
              rows={settlementRows}
              projects={projects}
              onEditFinance={setEditFinanceModalOpen}
              canViewAllBu={(user?.profile?.role === 'admin' || user?.profile?.role === 'leader') && user?.profile?.bu_code === 'HEAD'}
              canViewNetProfit={
                user?.profile?.role === 'admin' ||
                user?.profile?.role === 'leader' ||
                user?.profile?.role === 'manager' ||
                Boolean(user?.profile?.id && projects.some((p) => p.pm_id === user.profile.id))
              }
              activePeriod={activePeriod}
              partnerCompaniesData={partnerCompaniesData}
              partnerWorkersData={partnerWorkersData}
            />
          )}

          {view === 'tasks' && (
            <TasksView
              bu={bu}
              onBuChange={handleBuChange}
              tasks={tasks}
              projects={projects}
              onStatusChange={async (id, status) => {
                try {
                  const dbStatus = status === 'in-progress' ? 'in_progress' : status;
                  await updateTaskMutation.mutateAsync({ id: Number(id), data: { status: dbStatus } });
                } catch (error) {
                  console.error('Failed to update task status:', error);
                }
              }}
              onEditTask={setEditTaskModalOpen}
              currentUser={user?.profile ? { id: user.profile.id, role: user.profile.role, bu_code: user.profile.bu_code } : null}
            />
          )}

          {view === 'organization' && (
            <OrganizationView
              bu={bu}
              orgData={orgData}
              externalWorkersData={externalWorkersData}
              partnerWorkersData={partnerWorkersData}
              partnerCompaniesData={partnerCompaniesData}
              usersData={usersData}
              currentUser={user}
              orgViewTab={orgViewTab}
              onTabChange={setOrgViewTab}
              onAddMember={(orgUnitId) => {
                setSelectedOrgUnitId(orgUnitId);
                setOrgMemberModalOpen(true);
              }}
              onEditMember={(member) => {
                setEditOrgMemberModalOpen(member);
              }}
              onDeleteMember={(id) => {
                setDeleteOrgMemberId(id);
              }}
              onAddExternalWorker={() => {
                setExternalWorkerModalOpen(true);
              }}
              onEditExternalWorker={(worker) => {
                setEditExternalWorkerModalOpen(worker);
              }}
              onDeleteExternalWorker={(id) => {
                setDeleteExternalWorkerId(id);
              }}
              onEditUser={(userData) => {
                setEditUserModalOpen(userData);
              }}
              onAddUser={() => {
                setCreateUserModalOpen(true);
              }}
            />
          )}

          {view === 'attendance' && (
            <AttendanceManagementView />
          )}

          {view === 'attendanceAdmin' && (
            <AttendanceAdminView />
          )}

          {view === 'leave' && (
            <LeaveManagementView
              onNavigateToAdmin={() => handleNavigateToView('leaveAdmin')}
            />
          )}

          {view === 'leaveAdmin' && (
            <LeaveAdminView />
          )}

          {view === 'partners' && (
            <PartnersView
              currentBu={bu === 'ALL' ? 'ALL' : bu}
              currentUserRole={user?.profile?.role || 'member'}
            />
          )}

          {view === 'meetingRooms' && (
            <MeetingRoomView
              projects={projects}
              tasks={tasks}
              currentUserId={user?.id || ''}
              isAdmin={user?.profile?.role === 'admin'}
              users={(usersData?.users || []).map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                position: u.position,
                bu_code: u.bu_code,
              }))}
              partners={partnersData.map((p: any) => ({
                id: p.id,
                display_name: p.display_name,
                entity_type: p.entity_type,
                email: p.email,
                phone: p.phone,
              }))}
            />
          )}

          {view === 'equipment' && (
            <EquipmentRentalView
              projects={projects}
              tasks={tasks}
              currentUserId={user?.id || ''}
              isAdmin={user?.profile?.role === 'admin'}
            />
          )}

          {view === 'vehicles' && (
            <VehicleLogView
              projects={projects}
              tasks={tasks}
              currentUserId={user?.id || ''}
              isAdmin={user?.profile?.role === 'admin'}
            />
          )}

          {view === 'workLog' && (
            <WorkLogView />
          )}

          {view === 'workLogAdmin' && (
            <AdminWorkLogView />
          )}

          {view === 'bugReports' && (
            <BugReportsView
              isAdmin={user?.profile?.role === 'admin' || user?.profile?.role === 'leader'}
            />
          )}

          {view === 'exclusiveArtists' && (
            <ExclusiveArtistsView />
          )}

          {view === 'taskTemplates' && (
            <TaskTemplateView
              currentBu={bu}
              currentUserBu={user?.profile?.bu_code as BU | null}
            />
          )}

          {view === 'manuals' && (
            <ManualsView
              currentBu={bu}
              currentUser={user?.profile ? {
                id: user.profile.id,
                role: user.profile.role,
                bu_code: user.profile.bu_code,
                name: user.profile.name,
              } : null}
            />
          )}

          {view === 'documentRoom' && (
            <DocumentRoomView />
          )}

          {view === 'pushTest' && (
            <PushTestView />
          )}

          {view === 'resourceOverview' && (
            <AdminResourceView
              projects={projects}
              tasks={tasks}
              usersData={usersData}
              onProjectClick={(project) => {
                setEditProjectModalOpen(project);
              }}
              onTaskClick={(task) => {
                setEditTaskModalOpen(task);
              }}
            />
          )}

          {view === 'aiWorkInsight' && (
            <AiWorkInsightView />
          )}

        </div>
      </main>

      {isProjectModalOpen && (
        <UnifiedProjectModal
          onClose={() => setProjectModalOpen(false)}
          onSubmit={handleCreateProject}
          defaultBu={(user?.profile?.bu_code as BU) || (bu === 'ALL' ? 'GRIGO' : bu)}
          usersData={usersData}
          partnerCompaniesData={partnerCompaniesData}
          partnerWorkersData={partnerWorkersData}
          artistsData={artistsData}
          channelsData={channelsData}
          orgData={orgData}
          onPartnerCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['partner-companies'] });
            queryClient.invalidateQueries({ queryKey: ['partner-workers'] });
            queryClient.invalidateQueries({ queryKey: ['artists'] });
          }}
          createChannelRequest={async (name) => {
            const effectiveBu = (user?.profile?.bu_code as BU) || (bu === 'ALL' ? 'GRIGO' : bu);
            const channel = await createChannelMutation.mutateAsync({ bu_code: effectiveBu, name });
            return channel?.id ?? null;
          }}
          onChannelCreated={() => queryClient.invalidateQueries({ queryKey: ['channels'] })}
        />
      )}
      {isTaskModalOpen && (
        <UnifiedTaskModal
          mode="create"
          onClose={() => {
            setTaskModalOpen(false);
            setTaskModalProjectId(undefined);
          }}
          onSubmit={handleCreateTask}
          defaultBu={bu === 'ALL' ? 'GRIGO' : bu}
          projects={projects}
          defaultProjectId={taskModalProjectId ?? undefined}
          orgData={orgData}
          usersData={usersData}
        />
      )}
      {isFinanceModalOpen && (
        <CreateFinanceModal
          mode={isFinanceModalOpen}
          onClose={() => {
            setFinanceModalOpen(null);
            setFinanceDefaultProjectId(null);
          }}
          onSubmit={handleCreateFinance}
          projects={projects}
          partnersData={partnersData}
          calculateActualAmount={calculateActualAmount}
          defaultProjectId={financeDefaultProjectId}
        />
      )}
      {isEditFinanceModalOpen && (
        <EditFinanceModal
          entry={isEditFinanceModalOpen}
          onClose={() => setEditFinanceModalOpen(null)}
          onSubmit={handleUpdateFinance}
          onDelete={async (id) => {
            try {
              await deleteFinancialMutation.mutateAsync(Number(id));
              setEditFinanceModalOpen(null);
            } catch (error) {
              console.error('Failed to delete financial entry:', error);
            }
          }}
          projects={projects}
          partnersData={partnersData}
          calculateActualAmount={calculateActualAmount}
          onGoToProject={(projectId) => {
            const targetProject = projects.find((p) => p.id === projectId);
            if (targetProject) {
              setEditFinanceModalOpen(null);
              setEditProjectModalOpen(targetProject);
            }
          }}
        />
      )}
      {isEditTaskModalOpen && (() => {
        const taskProject = projects.find(p => p.id === isEditTaskModalOpen.projectId);
        const permUser: PermAppUser | null = user?.profile ? {
          id: user.profile.id,
          role: user.profile.role as PermAppUser['role'],
          bu_code: user.profile.bu_code as PermAppUser['bu_code'],
          name: user.profile.name,
        } : null;
        const permTask: PermTask = {
          id: isEditTaskModalOpen.id,
          project_id: isEditTaskModalOpen.projectId,
          bu_code: isEditTaskModalOpen.bu as PermTask['bu_code'],
          assignee_id: (isEditTaskModalOpen as any).assignee_id || null,
          created_by: (isEditTaskModalOpen as any).created_by || null,
        };
        const permProject: PermProject = {
          id: taskProject?.id || '',
          bu_code: (taskProject?.bu || isEditTaskModalOpen.bu) as PermProject['bu_code'],
          pm_id: taskProject?.pm_id || null,
          participants: taskProject?.participants?.map(p => p.user_id).filter((id): id is string => !!id) || [],
        };
        const canEdit = permUser ? canEditTask(permUser, permTask, permProject) : false;

        return (
          <UnifiedTaskModal
            mode="view"
            task={isEditTaskModalOpen}
            onClose={() => setEditTaskModalOpen(null)}
            onSubmit={handleUpdateTask}
            onDelete={async (id) => {
              try {
                await deleteTaskMutation.mutateAsync(Number(id));
                setEditTaskModalOpen(null);
              } catch (error) {
                console.error('Failed to delete task:', error);
              }
            }}
            canQuickEdit={canEdit}
            onQuickUpdate={async (id, updates) => {
              try {
                const dbData: Record<string, string> = {};
                if (updates.status) {
                  dbData.status = updates.status === 'in-progress' ? 'in_progress' : updates.status;
                }
                if (updates.priority) {
                  dbData.priority = updates.priority;
                }
                await updateTaskMutation.mutateAsync({ id: Number(id), data: dbData });
              } catch (error) {
                console.error('Failed to quick update task:', error);
              }
            }}
            onProjectClick={(projectId) => {
              const targetProject = projects.find((p) => p.id === projectId);
              if (targetProject) {
                setEditTaskModalOpen(null);
                setEditProjectModalOpen(targetProject);
              }
            }}
            defaultBu={isEditTaskModalOpen.bu}
            projects={projects}
            orgData={orgData}
            usersData={usersData}
          />
        );
      })()}
      {isEditProjectModalOpen && (
        <UnifiedProjectModal
          project={isEditProjectModalOpen}
          onClose={() => setEditProjectModalOpen(null)}
          onSubmit={handleUpdateProject}
          onDelete={(id) => {
            setEditProjectModalOpen(null);
            setDeleteProjectId(id);
          }}
          defaultBu={(user?.profile?.bu_code as BU) || (bu === 'ALL' ? 'GRIGO' : bu)}
          usersData={usersData}
          partnerCompaniesData={partnerCompaniesData}
          partnerWorkersData={partnerWorkersData}
          artistsData={artistsData}
          channelsData={channelsData}
          financeData={allFinancial
            .filter((f) => f.projectId === isEditProjectModalOpen.id)
            .map((f) => ({
              id: f.id,
              kind: f.type,
              category: f.category,
              name: f.name,
              amount: f.amount,
              status: f.status,
              occurred_at: f.date,
            }))}
          tasksData={tasks
            .filter((t) => t.projectId === isEditProjectModalOpen.id)
            .map((t) => ({
              id: t.id,
              title: t.title,
              assignee_id: t.assignee_id,
              assignee: t.assignee,
              dueDate: t.dueDate,
              status: t.status,
            }))}
          onAddRevenue={() => {
            setFinanceDefaultProjectId(isEditProjectModalOpen.id);
            setFinanceModalOpen('revenue');
          }}
          onAddExpense={() => {
            setFinanceDefaultProjectId(isEditProjectModalOpen.id);
            setFinanceModalOpen('expense');
          }}
          onViewFinanceDetail={(entry) => {
            const matchedFinance = allFinancial.find((f) => f.id === entry.id);
            if (matchedFinance) {
              setEditFinanceModalOpen(matchedFinance);
            }
          }}
          onAddTask={() => {
            setTaskModalProjectId(isEditProjectModalOpen.id);
            setTaskModalOpen(true);
          }}
          onAddTaskFromTemplate={() => {
            setTemplateSelectorProjectId(Number(isEditProjectModalOpen.id));
          }}
          onViewTaskDetail={(task) => {
            const matchedTask = tasks.find((t) => t.id === task.id);
            if (matchedTask) {
              setEditTaskModalOpen(matchedTask);
            }
          }}
          onTaskStatusChange={async (taskId, status) => {
            try {
              const dbStatus = status === 'in-progress' ? 'in_progress' : status;
              await updateTaskMutation.mutateAsync({ id: Number(taskId), data: { status: dbStatus } });
            } catch (error) {
              console.error('Failed to update task status:', error);
            }
          }}
          onPartnerCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['partner-companies'] });
            queryClient.invalidateQueries({ queryKey: ['partner-workers'] });
            queryClient.invalidateQueries({ queryKey: ['artists'] });
          }}
          createChannelRequest={async (name) => {
            const effectiveBu = (user?.profile?.bu_code as BU) || (bu === 'ALL' ? 'GRIGO' : bu);
            const channel = await createChannelMutation.mutateAsync({ bu_code: effectiveBu, name });
            return channel?.id ?? null;
          }}
          onChannelCreated={() => queryClient.invalidateQueries({ queryKey: ['channels'] })}
        />
      )}
      {deleteProjectId && (
        <DeleteConfirmModal
          title="프로젝트 삭제"
          message="정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={() => handleDeleteProject(deleteProjectId)}
          onCancel={() => setDeleteProjectId(null)}
        />
      )}
      {isOrgMemberModalOpen && (
        <CreateOrgMemberModal
          onClose={() => {
            setOrgMemberModalOpen(false);
            setSelectedOrgUnitId(null);
          }}
          onSubmit={async (payload) => {
            try {
              await createOrgMemberMutation.mutateAsync(payload);
              setOrgMemberModalOpen(false);
              setSelectedOrgUnitId(null);
            } catch (error) {
              console.error('Failed to create org member:', error);
            }
          }}
          orgUnits={orgData}
          defaultOrgUnitId={selectedOrgUnitId}
        />
      )}
      {isEditOrgMemberModalOpen && (
        <EditOrgMemberModal
          member={isEditOrgMemberModalOpen}
          onClose={() => setEditOrgMemberModalOpen(null)}
          onSubmit={async (payload) => {
            try {
              await updateOrgMemberMutation.mutateAsync({
                id: isEditOrgMemberModalOpen.id,
                data: payload,
              });
              setEditOrgMemberModalOpen(null);
            } catch (error) {
              console.error('Failed to update org member:', error);
            }
          }}
          orgUnits={orgData}
        />
      )}
      {deleteOrgMemberId && (
        <DeleteConfirmModal
          title="조직 멤버 삭제"
          message="정말로 이 조직 멤버를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              await deleteOrgMemberMutation.mutateAsync(deleteOrgMemberId);
              setDeleteOrgMemberId(null);
            } catch (error) {
              console.error('Failed to delete org member:', error);
            }
          }}
          onCancel={() => setDeleteOrgMemberId(null)}
        />
      )}
      {isExternalWorkerModalOpen && (
        <CreateExternalWorkerModal
          onClose={() => setExternalWorkerModalOpen(false)}
          onSubmit={async (payload) => {
            try {
              await createExternalWorkerMutation.mutateAsync(payload);
              setExternalWorkerModalOpen(false);
            } catch (error) {
              console.error('Failed to create external worker:', error);
            }
          }}
          defaultBu={bu === 'ALL' ? 'GRIGO' : bu}
        />
      )}
      {isEditExternalWorkerModalOpen && (
        <EditExternalWorkerModal
          worker={isEditExternalWorkerModalOpen}
          onClose={() => setEditExternalWorkerModalOpen(null)}
          onSubmit={async (payload) => {
            try {
              await updateExternalWorkerMutation.mutateAsync({
                id: isEditExternalWorkerModalOpen.id,
                data: payload,
              });
              setEditExternalWorkerModalOpen(null);
            } catch (error) {
              console.error('Failed to update external worker:', error);
            }
          }}
        />
      )}
      {deleteExternalWorkerId && (
        <DeleteConfirmModal
          title="외주 인력 삭제"
          message="정말로 이 외주 인력을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={async () => {
            try {
              await deleteExternalWorkerMutation.mutateAsync(deleteExternalWorkerId);
              setDeleteExternalWorkerId(null);
            } catch (error) {
              console.error('Failed to delete external worker:', error);
            }
          }}
          onCancel={() => setDeleteExternalWorkerId(null)}
        />
      )}
      {isCreateUserModalOpen && (
        <CreateUserModal
          onClose={() => setCreateUserModalOpen(false)}
          onSubmit={async (payload) => {
            try {
              await createUserMutation.mutateAsync(payload);
              setCreateUserModalOpen(false);
            } catch (error) {
              console.error('Failed to create user:', error);
              throw error;
            }
          }}
          isAdmin={user?.profile?.role === 'admin'}
        />
      )}
      {isEditUserModalOpen && (
        <EditUserModal
          user={isEditUserModalOpen}
          onClose={() => setEditUserModalOpen(null)}
          onSubmit={async (payload) => {
            try {
              await updateUserMutation.mutateAsync({
                id: isEditUserModalOpen.id,
                data: payload,
              });
              setEditUserModalOpen(null);
            } catch (error) {
              console.error('Failed to update user:', error);
            }
          }}
          isAdmin={user?.profile?.role === 'admin'}
        />
      )}

      {templateSelectorProjectId && (
        <TaskTemplateSelector
          projectId={templateSelectorProjectId}
          projectBu={projects.find((p) => p.id === String(templateSelectorProjectId))?.bu || 'GRIGO'}
          projectEndDate={projects.find((p) => p.id === String(templateSelectorProjectId))?.endDate}
          onSuccess={() => {
            // 할일 목록 새로고침
            // React Query가 자동으로 갱신됨
          }}
          onClose={() => setTemplateSelectorProjectId(null)}
        />
      )}
    </div>
  );
}

function QuickAction({ title, icon, onClick }: { title: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col sm:flex-row items-center sm:gap-2.5 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 sm:px-3 sm:py-2 text-center sm:text-left shadow-sm transition hover:border-blue-200 hover:shadow"
    >
      <span className="rounded-lg bg-blue-50 dark:bg-blue-900/50 p-1.5 sm:p-2 text-blue-600 dark:text-blue-300 flex-shrink-0">{icon}</span>
      <span className="text-[10px] sm:text-xs font-medium sm:font-semibold text-slate-600 dark:text-slate-300 sm:text-slate-800 sm:dark:text-slate-200 mt-1 sm:mt-0 leading-tight">{title}</span>
    </button>
  );
}

function ModalProject({
  project,
  onClose,
  entries,
  period,
  formState,
  formError,
  onFormChange,
  onAddEntry,
  onDateChange,
  onEditFinance,
  onEditTask,
  onUpdateProject,
  onAddTask,
  tasks,
  projects,
  orgData,
  usersData,
  partnersData,
  partnerCompaniesData,
  partnerWorkersData,
  calculateActualAmount,
}: {
  project: Project;
  onClose: () => void;
  entries: {
    revenues: FinancialEntry[];
    expenses: FinancialEntry[];
    totalRevenue: number;
    totalExpense: number;
    totalProfit: number;
    periodRevenue: number;
    periodExpense: number;
    periodProfit: number;
  };
  period: { start?: string; end?: string };
  formState: {
    type: 'revenue' | 'expense';
    cat: string;
    name: string;
    amount: string;
    date: string;
    partnerEntityFilter: 'person' | 'organization' | '';
    partnerId: string;
    paymentMethod: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '';
  };
  formError?: string;
  onFormChange: React.Dispatch<
    React.SetStateAction<{
      type: 'revenue' | 'expense';
      cat: string;
      name: string;
      amount: string;
      date: string;
      partnerEntityFilter: 'person' | 'organization' | '';
      partnerId: string;
      paymentMethod: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '';
    }>
  >;
  onAddEntry: () => void;
  onDateChange: (key: 'startDate' | 'endDate', value: string) => void;
  onEditFinance: (entry: FinancialEntry) => void;
  onEditTask: (task: TaskItem) => void;
  onUpdateProject: (payload: {
    id: string;
    name: string;
    bu: BU;
    cat: string;
    startDate: string;
    endDate: string;
    description?: string | null;
    status?: string;
    pm_id?: string | null;
    partner_company_id?: number | null;
    partner_worker_id?: number | null;
    artist_id?: number | null;
    channel_id?: number | null;
    participants?: Array<{ user_id?: string; partner_worker_id?: number; partner_company_id?: number; role?: string }>;
  }) => void;
  onAddTask: (projectId: string) => void;
  tasks: TaskItem[];
  projects: Project[];
  orgData: any[];
  usersData?: { users: any[]; currentUser: any };
  partnersData?: { id: number; display_name: string; entity_type: string }[];
  partnerCompaniesData?: any[];
  partnerWorkersData?: any[];
  calculateActualAmount: (amount: number, paymentMethod: string) => number | null;
}) {
  const projectParticipants = (project as any).participants || [];
  const [selectedParticipants, setSelectedParticipants] = useState<Array<{ type: 'user' | 'partner_worker' | 'partner_company'; id: string | number; name: string }>>(() => {
    return projectParticipants.map((p: any) => {
      if (p.user_id) {
        const user = usersData?.users.find((u: any) => u.id === p.user_id);
        return user ? { type: 'user' as const, id: user.id, name: user.name } : null;
      } else if (p.partner_worker_id) {
        const worker = partnerWorkersData?.find((w: any) => w.id === p.partner_worker_id);
        return worker ? { type: 'partner_worker' as const, id: worker.id, name: worker.name_ko || worker.name_en || worker.name || '' } : null;
      } else if (p.partner_company_id) {
        const company = partnerCompaniesData?.find((c: any) => c.id === p.partner_company_id);
        return company ? { type: 'partner_company' as const, id: company.id, name: company.company_name_ko || company.company_name_en || '' } : null;
      }
      return null;
    }).filter((p: any) => p !== null) as Array<{ type: 'user' | 'partner_worker' | 'partner_company'; id: string | number; name: string }>;
  });
  const [participantSelectType, setParticipantSelectType] = useState<'user' | 'partner_worker' | 'partner_company'>('user');
  const [participantSelectId, setParticipantSelectId] = useState<string>('');
  const [statusValue, setStatusValue] = useState(project.status);

  const handleAddParticipant = () => {
    if (!participantSelectId) return;

    if (participantSelectType === 'user') {
      const user = usersData?.users.find((u: any) => u.id === participantSelectId);
      if (user && !selectedParticipants.some((p) => p.type === 'user' && p.id === user.id)) {
        setSelectedParticipants((prev) => [...prev, { type: 'user', id: user.id, name: user.name }]);
        setParticipantSelectId('');
      }
    } else if (participantSelectType === 'partner_worker') {
      const worker = partnerWorkersData?.find((w: any) => w.id === Number(participantSelectId));
      if (worker && !selectedParticipants.some((p) => p.type === 'partner_worker' && p.id === worker.id)) {
        setSelectedParticipants((prev) => [...prev, { type: 'partner_worker', id: worker.id, name: worker.name_ko || worker.name_en || worker.name || '' }]);
        setParticipantSelectId('');
      }
    } else if (participantSelectType === 'partner_company') {
      const company = partnerCompaniesData?.find((c: any) => c.id === Number(participantSelectId));
      if (company && !selectedParticipants.some((p) => p.type === 'partner_company' && p.id === company.id)) {
        setSelectedParticipants((prev) => [...prev, { type: 'partner_company', id: company.id, name: company.company_name_ko || company.company_name_en || '' }]);
        setParticipantSelectId('');
      }
    }
  };

  const handleRemoveParticipant = (index: number) => {
    setSelectedParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveParticipants = () => {
    onUpdateProject({
      id: project.id,
      name: project.name,
      bu: project.bu,
      cat: project.cat,
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status,
      description: (project as any).description || null,
      pm_id: (project as any).pm_id || null,
      partner_company_id: (project as any).partner_company_id || null,
      partner_worker_id: (project as any).partner_worker_id || null,
      artist_id: (project as any).artist_id || null,
      channel_id: (project as any).channel_id || null,
      participants: selectedParticipants.map((p) => ({
        user_id: p.type === 'user' ? (p.id as string) : undefined,
        partner_worker_id: p.type === 'partner_worker' ? (p.id as number) : undefined,
        partner_company_id: p.type === 'partner_company' ? (p.id as number) : undefined,
        role: 'participant',
      })),
    });
  };
  const statusOptions = [
    { value: '준비중', label: '준비중' },
    { value: '기획중', label: '기획중' },
    { value: '진행중', label: '진행중' },
    { value: '운영중', label: '운영중' },
    { value: '완료', label: '완료' },
  ];

  return (
    <div
      className="modal-container active fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white dark:bg-slate-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block rounded-md bg-blue-50 dark:bg-blue-900/50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">
                {BU_TITLES[project.bu]}
              </span>
              <select
                value={statusValue}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  setStatusValue(newStatus);
                  onUpdateProject({
                    id: project.id,
                    name: project.name,
                    bu: project.bu,
                    cat: project.cat,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    status: newStatus,
                    description: (project as any).description || null,
                    pm_id: (project as any).pm_id || null,
                    partner_company_id: (project as any).partner_company_id || null,
                    partner_worker_id: (project as any).partner_worker_id || null,
                    artist_id: (project as any).artist_id || null,
                    channel_id: (project as any).channel_id || null,
                    participants: selectedParticipants.map((p) => ({
                      user_id: p.type === 'user' ? (p.id as string) : undefined,
                      partner_worker_id: p.type === 'partner_worker' ? (p.id as number) : undefined,
                      partner_company_id: p.type === 'partner_company' ? (p.id as number) : undefined,
                      role: 'participant',
                    })),
                  });
                }}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-semibold border-0 outline-none',
                  statusValue === '준비중' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' :
                    statusValue === '기획중' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' :
                      statusValue === '진행중' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                        statusValue === '운영중' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                          statusValue === '완료' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                )}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">{project.name}</h3>
            {project.creator_name && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">생성: {project.creator_name}</p>
            )}
            <div className="mt-2 flex items-center gap-4">
              <LabeledDate
                label="시작일"
                value={project.startDate}
                onChange={(value) => onDateChange('startDate', value)}
              />
              <LabeledDate
                label="종료일"
                value={project.endDate}
                onChange={(value) => onDateChange('endDate', value)}
              />
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-300 flex-shrink-0 ml-4"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-8">
          {/* 할일 관리 - 메인 섹션 */}
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-900/20 p-6">
            <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
              <h4 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-200">
                <CheckSquare className="h-5 w-5 text-emerald-600" />
                프로젝트 할일 관리
              </h4>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onAddTask(project.id)}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  할일 추가
                </button>
              </div>
            </div>
            <div className="mb-4 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="rounded-full bg-slate-200 dark:bg-slate-600 px-2 py-1 font-semibold text-slate-700 dark:text-slate-300">
                전체 {tasks.length}개
              </span>
              <span className="rounded-full bg-slate-200 dark:bg-slate-600 px-2 py-1 font-semibold text-slate-700 dark:text-slate-300">
                진행 전 {tasks.filter(t => t.status === 'todo').length}개
              </span>
              <span className="rounded-full bg-blue-100 dark:bg-blue-900/50 px-2 py-1 font-semibold text-blue-700 dark:text-blue-300">
                진행중 {tasks.filter(t => t.status === 'in-progress').length}개
              </span>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 font-semibold text-emerald-700 dark:text-emerald-300">
                완료 {tasks.filter(t => t.status === 'done').length}개
              </span>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">등록된 할 일이 없습니다.</p>
                  <button
                    onClick={() => onAddTask(project.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    첫 할일 추가하기
                  </button>
                </div>
              ) : (
                <>
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onEditTask(task)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0',
                          task.status === 'done' ? 'bg-emerald-100 text-emerald-600' :
                            task.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                              'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        )}>
                          {task.status === 'done' ? <Check className="h-4 w-4" /> :
                            task.status === 'in-progress' ? <span className="text-xs font-bold">진행</span> :
                              <span className="text-xs font-bold">할일</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                            {task.assignee} • {task.dueDate}
                            {task.creator_name && <span className="ml-1">· 생성: {task.creator_name}</span>}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        'rounded-full px-3 py-1 text-[10px] font-bold tracking-tight whitespace-nowrap flex-shrink-0 ml-3',
                        task.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                          task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                      )}>
                        {task.status === 'todo' ? '진행 전' : task.status === 'in-progress' ? '진행중' : '완료'}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => onAddTask(project.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100/50"
                  >
                    <Plus className="h-4 w-4" />
                    할일 추가하기
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 참여자 관리 섹션 */}
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/20 p-6">
            <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
              <h4 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-200">
                <Users className="h-5 w-5 text-blue-600" />
                참여자 관리
              </h4>
            </div>
            <div className="flex gap-2 mb-3">
              <select
                value={participantSelectType}
                onChange={(e) => {
                  setParticipantSelectType(e.target.value as 'user' | 'partner_worker' | 'partner_company');
                  setParticipantSelectId('');
                }}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="user">내부 사용자</option>
                <option value="partner_worker">파트너 인력</option>
                <option value="partner_company">파트너 회사</option>
              </select>
              <select
                value={participantSelectId}
                onChange={(e) => setParticipantSelectId(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="">선택하세요</option>
                {participantSelectType === 'user'
                  ? (usersData?.users ?? []).filter((u: any) => !selectedParticipants.some((p) => p.type === 'user' && p.id === u.id)).map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))
                  : participantSelectType === 'partner_worker'
                    ? (partnerWorkersData ?? []).filter((w: any) => !selectedParticipants.some((p) => p.type === 'partner_worker' && p.id === w.id)).map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.name_ko || w.name_en || w.name || ''}
                      </option>
                    ))
                    : (partnerCompaniesData ?? []).filter((c: any) => !selectedParticipants.some((p) => p.type === 'partner_company' && p.id === c.id)).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name_ko || c.company_name_en || ''}
                      </option>
                    ))}
              </select>
              <button
                type="button"
                onClick={handleAddParticipant}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                추가
              </button>
            </div>
            {selectedParticipants.length > 0 && (
              <div className="space-y-2 mb-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">선택된 참여자:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedParticipants.map((p, index) => (
                    <span
                      key={`${p.type}-${p.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium"
                    >
                      {p.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(index)}
                        className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleSaveParticipants}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              참여자 저장
            </button>
          </div>

          {/* 매출/지출 요약 - 작게 표시 */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">재무 요약</h5>
              <div className="flex items-center gap-4 text-xs">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">매출</p>
                  <p className="font-bold text-blue-600">{formatCurrency(entries.periodRevenue)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">지출</p>
                  <p className="font-bold text-red-500">{formatCurrency(entries.periodExpense)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">순익</p>
                  <p className={cn('font-bold', entries.periodProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(entries.periodProfit)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 매출/지출 상세 - 접을 수 있게 */}
          <details className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
            <summary className="cursor-pointer px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/50">
              매출/지출 상세 내역
            </summary>
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-4">
              <div>
                <h6 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-blue-600">매출 내역</h6>
                <div className="space-y-2">
                  {entries.revenues.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500">등록된 매출이 없습니다.</p>
                  ) : (
                    entries.revenues.map((r, idx) => (
                      <button
                        key={`${r.projectId}-rev-${idx}`}
                        type="button"
                        onClick={() => onEditFinance(r)}
                        className="flex w-full items-center justify-between rounded-lg border border-blue-100 dark:border-blue-900/50 bg-white dark:bg-slate-800 px-3 py-2 text-left transition hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      >
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{r.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{r.date} • {r.category}</p>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap",
                            r.status === 'paid' ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300" :
                              r.status === 'planned' ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300" :
                                r.status === 'canceled' ? "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300" :
                                  "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300"
                          )}>
                            {r.status === 'paid' ? '지급완료' : r.status === 'planned' ? '지급예정' : r.status === 'canceled' ? '취소' : r.status}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-blue-600">{formatCurrency(r.amount)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h6 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-500">지출 내역</h6>
                <div className="space-y-2">
                  {entries.expenses.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500">등록된 지출이 없습니다.</p>
                  ) : (
                    entries.expenses.map((e, idx) => (
                      <button
                        key={`${e.projectId}-exp-${idx}`}
                        type="button"
                        onClick={() => onEditFinance(e)}
                        className="flex w-full items-center justify-between rounded-lg border border-red-100 dark:border-red-900/50 bg-white dark:bg-slate-800 px-3 py-2 text-left transition hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{e.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{e.date} • {e.category}</p>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap",
                            e.status === 'paid' ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300" :
                              e.status === 'planned' ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300" :
                                e.status === 'canceled' ? "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300" :
                                  "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300"
                          )}>
                            {e.status === 'paid' ? '지급완료' : e.status === 'planned' ? '지급예정' : e.status === 'canceled' ? '취소' : e.status}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-red-500">{formatCurrency(e.amount)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </details>

          {/* 매출/지출 등록 폼 - 접을 수 있게 */}
          <details className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
            <summary className="cursor-pointer px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/50">
              매출/지출 등록
            </summary>
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <select
                  value={formState.type}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, type: e.target.value as 'revenue' | 'expense' }))
                  }
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium outline-none"
                >
                  <option value="revenue">매출 (+)</option>
                  <option value="expense">지출 (-)</option>
                </select>
                <input
                  value={formState.cat}
                  onChange={(e) => onFormChange((prev) => ({ ...prev, cat: e.target.value }))}
                  placeholder="구분"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs outline-none"
                />
                <input
                  value={formState.name}
                  onChange={(e) => onFormChange((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="항목명"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs outline-none"
                />
                <input
                  value={formState.amount}
                  type="number"
                  onChange={(e) => onFormChange((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="금액"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400">지급처 유형</label>
                  <select
                    value={formState.partnerEntityFilter}
                    onChange={(e) => {
                      const newFilter = e.target.value as 'person' | 'organization' | '';
                      onFormChange((prev) => ({
                        ...prev,
                        partnerEntityFilter: newFilter,
                        partnerId: '',
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs outline-none"
                  >
                    <option value="">전체</option>
                    <option value="organization">회사/조직</option>
                    <option value="person">개인/인력</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400">지급처</label>
                  <select
                    value={formState.partnerId}
                    onChange={(e) => onFormChange((prev) => ({ ...prev, partnerId: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs outline-none"
                  >
                    <option value="">선택하세요</option>
                    {(partnersData || [])
                      .filter((p) => !formState.partnerEntityFilter || p.entity_type === formState.partnerEntityFilter)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.entity_type === 'organization' ? '🏢' : '👤'} {p.display_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400">지급 방식</label>
                  <select
                    value={formState.paymentMethod}
                    onChange={(e) => onFormChange((prev) => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs outline-none"
                  >
                    <option value="">선택하세요</option>
                    <option value="vat_included">부가세 포함 (10% 증액)</option>
                    <option value="tax_free">면세 (0%)</option>
                    <option value="withholding">원천징수 (3.3% 제외)</option>
                    <option value="actual_payment">실지급액</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400">실지급액</label>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">자동계산</span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={
                      formState.amount && formState.paymentMethod
                        ? calculateActualAmount(Number(formState.amount), formState.paymentMethod)?.toLocaleString() || '-'
                        : '-'
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400">지급일</label>
                    <button
                      type="button"
                      onClick={() => onFormChange((prev) => ({ ...prev, date: '' }))}
                      className={cn(
                        'text-[9px] font-semibold px-2 py-0.5 rounded transition',
                        formState.date === ''
                          ? 'bg-blue-100 text-blue-600'
                          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800'
                      )}
                    >
                      미정
                    </button>
                  </div>
                  <input
                    value={formState.date}
                    type="date"
                    onChange={(e) => onFormChange((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400">상태</label>
                  <select
                    value="planned"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs outline-none"
                    disabled
                  >
                    <option value="planned">예정</option>
                  </select>
                </div>
              </div>

              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <p className="text-xs font-semibold text-red-600">{formError}</p>
                </div>
              )}
              <button
                onClick={onAddEntry}
                className="w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                등록하기
              </button>
            </div>
          </details>
        </div>

        <div className="flex items-center justify-between rounded-b-[2rem] bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-6 text-xs">
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">총 매출</p>
              <p className="font-bold text-blue-600">{formatCurrency(entries.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">총 지출</p>
              <p className="font-bold text-red-500">{formatCurrency(entries.totalExpense)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">순이익</p>
              <p className={cn('font-bold', entries.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(entries.totalProfit)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ title, value, tone }: { title: string; value: number; tone: 'blue' | 'red' | 'emerald' }) {
  const palette =
    tone === 'blue'
      ? { bg: 'bg-blue-50/60', border: 'border-blue-100', text: 'text-blue-600' }
      : tone === 'red'
        ? { bg: 'bg-red-50/60', border: 'border-red-100', text: 'text-red-500' }
        : { bg: 'bg-emerald-50/60', border: 'border-emerald-100', text: 'text-emerald-600' };

  return (
    <div className={cn('rounded-2xl border p-5', palette.bg, palette.border)}>
      <p className={cn('text-[10px] font-bold uppercase', palette.text)}>{title}</p>
      <p className={cn('mt-1 text-lg font-black italic', palette.text)}>{formatCurrency(value)}</p>
    </div>
  );
}

function EntryCard({
  entry,
  highlight,
  tone,
  onClick,
}: {
  entry: FinancialEntry;
  highlight: boolean;
  tone: 'blue' | 'red';
  onClick?: () => void;
}) {
  const palette =
    tone === 'blue'
      ? { bg: 'bg-blue-50/50', border: highlight ? 'border-blue-400' : 'border-blue-100', text: 'text-blue-600' }
      : { bg: 'bg-red-50/50', border: highlight ? 'border-red-400' : 'border-red-100', text: 'text-red-500' };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-2xl border p-4 text-left transition hover:opacity-100',
        palette.bg,
        palette.border,
        highlight ? 'opacity-100' : 'opacity-70',
      )}
    >
      <div>
        <p className={cn('mb-0.5 text-[9px] font-black uppercase tracking-wider', palette.text)}>{entry.category}</p>
        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{entry.name}</p>
        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{entry.date}</p>
      </div>
      <span className={cn('text-sm font-black', palette.text)}>{formatCurrency(entry.amount)}</span>
    </button>
  );
}

function LabeledDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs">
        <CalendarIcon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent outline-none"
        />
        <button
          type="button"
          onClick={() => onChange('')}
          className={cn(
            'text-[9px] font-semibold px-1.5 py-0.5 rounded transition ml-1',
            value === ''
              ? 'bg-blue-100 text-blue-600'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800'
          )}
        >
          미정
        </button>
      </div>
    </div>
  );
}

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}


