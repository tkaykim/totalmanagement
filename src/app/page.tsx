'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
} from 'lucide-react';
import {
  useWorkStatus,
  WorkStatusWelcomeModal,
  WorkStatusLogoutModal,
  WorkStatusOvertimeModal,
} from '@/components/WorkStatusHeader';
import { WorkStatusFullScreen } from '@/components/WorkStatusFullScreen';
import { DashboardHeader } from '@/components/DashboardHeader';
import type { PeriodType } from '@/components/PeriodSelector';
import { createClient } from '@/lib/supabase/client';
import { format, isWithinInterval, parseISO, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import { cn, buToSlug } from '@/lib/utils';
import { getTodayKST } from '@/lib/timezone';
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
  usePartnerCompanies,
  usePartnerWorkers,
} from '@/features/erp/hooks';
import {
  dbProjectToFrontend,
  dbTaskToFrontend,
  dbFinancialToFrontend,
  frontendProjectToDb,
  frontendTaskToDb,
  frontendFinancialToDb,
} from '@/features/erp/utils';
import ReactStudioDashboard from '@/features/reactstudio/components/ReactStudioDashboard';
import { CommentSection } from '@/features/comments/components/CommentSection';
import { ProjectModal } from '@/features/erp/components/ProjectModal';
import { DashboardView } from '@/features/erp/components/DashboardView';
import { StatCard } from '@/features/erp/components/StatCard';
import { ProjectsView } from '@/features/erp/components/ProjectsView';
import { SettlementView } from '@/features/erp/components/SettlementView';
import { AttendanceManagementView } from '@/features/attendance/components/AttendanceManagementView';
import { AttendanceAdminView } from '@/features/attendance/components/AttendanceAdminView';
import { BuTabs } from '@/features/erp/components/BuTabs';
import { FinanceRow } from '@/features/erp/components/FinanceRow';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    bu: 'GRIGO',
    name: 'S그룹 아이돌 안무 제작',
    cat: '안무제작',
    startDate: '2025-01-10',
    endDate: '2025-06-30',
    status: '진행중',
  },
  {
    id: 'p2',
    bu: 'GRIGO',
    name: '음료 브랜드 CF 정산',
    cat: '출연료',
    startDate: '2025-03-01',
    endDate: '2025-05-30',
    status: '완료',
  },
  {
    id: 'p3',
    bu: 'REACT',
    name: '외부 광고 홍보 영상',
    cat: '외주제작',
    startDate: '2025-05-01',
    endDate: '2025-07-31',
    status: '준비중',
  },
  {
    id: 'p4',
    bu: 'FLOW',
    name: '여름 댄스 페스티벌 2025',
    cat: '자체행사',
    startDate: '2025-06-01',
    endDate: '2025-08-31',
    status: '기획중',
  },
  {
    id: 'p5',
    bu: 'AST',
    name: '뷰티 브랜드 캠페인',
    cat: '광고대행',
    startDate: '2025-02-01',
    endDate: '2025-06-30',
    status: '운영중',
  },
  {
    id: 'p6',
    bu: 'MODOO',
    name: '공식 굿즈 티셔츠 1차',
    cat: '자체판매',
    startDate: '2025-04-10',
    endDate: '2025-05-15',
    status: '제작중',
  },
];

const INITIAL_REVENUES: FinancialEntry[] = [
  { id: 'r1', projectId: 'p1', bu: 'GRIGO', type: 'revenue', category: '안무제작', name: '선금 수금', amount: 8_000_000, date: '2025-01-15', status: 'paid' },
  { id: 'r2', projectId: 'p1', bu: 'GRIGO', type: 'revenue', category: '안무제작', name: '잔금 정산', amount: 7_000_000, date: '2025-05-28', status: 'planned' },
  { id: 'r3', projectId: 'p2', bu: 'GRIGO', type: 'revenue', category: '출연료', name: 'CF 모델료', amount: 35_000_000, date: '2025-05-25', status: 'paid' },
  { id: 'r4', projectId: 'p5', bu: 'AST', type: 'revenue', category: '대행료', name: '2분기 정산', amount: 15_000_000, date: '2025-04-30', status: 'paid' },
];

const INITIAL_EXPENSES: FinancialEntry[] = [
  { id: 'e1', projectId: 'p1', bu: 'GRIGO', type: 'expense', category: '인건비', name: '안무팀 급여', amount: 4_500_000, date: '2025-05-30', status: 'paid' },
  { id: 'e2', projectId: 'p5', bu: 'AST', type: 'expense', category: '매체비', name: '유튜브 광고비', amount: 15_000_000, date: '2025-05-15', status: 'planned' },
  { id: 'e3', projectId: 'p6', bu: 'MODOO', type: 'expense', category: '원자재', name: '면 원단 구매', amount: 3_000_000, date: '2025-04-12', status: 'paid' },
];

const MEMBERS: Member[] = [
  // 그리고엔터테인먼트
  { name: '김현준', role: '대표', team: '그리고엔터테인먼트' },
  { name: '오동현', role: '실장', team: '그리고엔터테인먼트' },
  { name: '장선우', role: '대리', team: '그리고엔터테인먼트' },
  { name: 'O유진', role: '인턴', team: '그리고엔터테인먼트' },
  // 플로우메이커
  { name: '홍철화', role: '대표', team: '플로우메이커' },
  { name: '권혁준', role: '대리', team: '플로우메이커' },
  { name: '황여경', role: '사원', team: '플로우메이커' },
  { name: '맹채원', role: '사원', team: '플로우메이커' },
  // 리액트 스튜디오
  { name: '김현준PD', role: 'PD', team: '리액트 스튜디오' },
  // 모두굿즈
  { name: '김동현', role: '사원', team: '모두굿즈' },
  { name: '박여진', role: '인턴', team: '모두굿즈' },
  // AST COMPANY
  { name: '조현욱', role: '대표', team: 'AST COMPANY' },
  { name: '정현수', role: '이사', team: 'AST COMPANY' },
];

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 't1',
    bu: 'GRIGO',
    projectId: 'p1',
    title: '안무 제작 큐시트 검수',
    assignee: '강준오',
    dueDate: '2025-05-28',
    status: 'in-progress',
  },
  {
    id: 't2',
    bu: 'FLOW',
    projectId: 'p4',
    title: '페스티벌 MD 견적 수집',
    assignee: '김민정',
    dueDate: '2025-06-05',
    status: 'todo',
  },
];


const isDateInRange = (date: string, start?: string, end?: string) => {
  if (!start || !end) return true;
  const target = parseISO(date);
  return isWithinInterval(target, { start: parseISO(start), end: parseISO(end) });
};

export default function HomePage() {
  const router = useRouter();
  const [view, setView] = useState<View>('dashboard');
  const [bu, setBu] = useState<BU | 'ALL'>('GRIGO');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // BU 변경 핸들러 - 모든 BU 버튼은 동일하게 BU만 변경하고 뷰는 유지
  const handleBuChange = (newBu: BU | 'ALL') => {
    setBu(newBu);
    // reactstudio 뷰에서 다른 BU로 변경 시 dashboard로 전환
    if (view === 'reactstudio' && newBu !== 'REACT') {
      setView('dashboard');
    }
  };
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [selectedQuarterYear, setSelectedQuarterYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [customRange, setCustomRange] = useState<{ start?: string; end?: string }>({});
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const workStatusHook = useWorkStatus(user);

  // API 데이터 로딩
  const { data: projectsData = [], isLoading: projectsLoading } = useProjects();
  const { data: tasksData = [] } = useTasks(); // bu 필터 제거 - 모든 할일 가져오기
  const { data: orgData = [] } = useOrgMembers();
  const { data: externalWorkersData = [] } = useExternalWorkers();
  const { data: usersData } = useUsers();
  const { data: partnerCompaniesData = [] } = usePartnerCompanies(bu === 'ALL' ? undefined : bu);
  const { data: partnerWorkersData = [] } = usePartnerWorkers(bu === 'ALL' ? undefined : bu);
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();

  // 타입 변환
  const projects = useMemo(() => projectsData.map(dbProjectToFrontend), [projectsData]);
  const tasks = useMemo(() => tasksData.map(dbTaskToFrontend), [tasksData]);

  // Mutations
  const createProjectMutation = useCreateProject();
  const createTaskMutation = useCreateTask();
  const createFinancialMutation = useCreateFinancialEntry();
  const updateTaskMutation = useUpdateTask();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const updateFinancialMutation = useUpdateFinancialEntry();
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
  const [formState, setFormState] = useState<{
    type: 'revenue' | 'expense';
    cat: string;
    name: string;
    amount: string;
    date: string;
    partnerType: 'company' | 'worker' | '';
    partnerCompanyId: string;
    partnerWorkerId: string;
    paymentMethod: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '';
  }>({
    type: 'revenue',
    cat: '',
    name: '',
    amount: '',
    date: '',
    partnerType: '',
    partnerCompanyId: '',
    partnerWorkerId: '',
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

      // role이 artist인 경우 /my-profile로 리디렉션
      if (appUser?.role === 'artist') {
        router.push('/grigoent/my-profile');
        return;
      }

      // bu_code가 null인 경우 /my-works로 리디렉션
      if (!appUser?.bu_code) {
        router.push('/my-works');
        return;
      }

      // 본사(HEAD)가 아닌 경우 해당 사업부 ERP로 리디렉션
      if (appUser.bu_code !== 'HEAD') {
        if (appUser.bu_code === 'AST') {
          router.push('/astcompany');
        } else if (appUser.bu_code === 'GRIGO') {
          router.push('/grigoent');
        } else if (appUser.bu_code === 'REACT') {
          router.push('/reactstudio');
        } else if (appUser.bu_code === 'FLOW') {
          router.push('/flow');
        } else if (appUser.bu_code === 'MODOO') {
          router.push('/modoogoods');
        }
        return;
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
    () => projects.filter((p) => p.bu === bu),
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
        partner_company_id: formState.partnerType === 'company' && formState.partnerCompanyId 
          ? Number(formState.partnerCompanyId) 
          : null,
        partner_worker_id: formState.partnerType === 'worker' && formState.partnerWorkerId 
          ? Number(formState.partnerWorkerId) 
          : null,
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
        partnerType: '',
        partnerCompanyId: '',
        partnerWorkerId: '',
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
  }) => {
    if (!payload.name || !payload.cat) return;
    try {
      const dbData = frontendProjectToDb(payload);
      await createProjectMutation.mutateAsync(dbData);
      setProjectModalOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
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
  }) => {
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
    bu: BU;
    projectId: string;
    assignee: string;
    dueDate: string;
  }): Promise<string | null> => {
    const missingFields: string[] = [];
    if (!payload.title?.trim()) missingFields.push('제목');
    if (!payload.projectId?.trim()) missingFields.push('프로젝트');
    if (!payload.assignee?.trim()) missingFields.push('담당자');
    
    if (missingFields.length > 0) {
      return `다음 항목을 입력해주세요: ${missingFields.join(', ')}`;
    }
    
    try {
      const dbData = frontendTaskToDb(payload);
      await createTaskMutation.mutateAsync(dbData);
      setTaskModalOpen(false);
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
    partnerType?: 'company' | 'worker' | '';
    partnerCompanyId?: string;
    partnerWorkerId?: string;
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
        partner_company_id: payload.partnerType === 'company' && payload.partnerCompanyId 
          ? Number(payload.partnerCompanyId) 
          : null,
        partner_worker_id: payload.partnerType === 'worker' && payload.partnerWorkerId 
          ? Number(payload.partnerWorkerId) 
          : null,
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
    partnerType?: 'company' | 'worker' | '';
    partnerCompanyId?: string;
    partnerWorkerId?: string;
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
        partner_company_id: payload.partnerType === 'company' && payload.partnerCompanyId 
          ? Number(payload.partnerCompanyId) 
          : null,
        partner_worker_id: payload.partnerType === 'worker' && payload.partnerWorkerId 
          ? Number(payload.partnerWorkerId) 
          : null,
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
    id: string;
    title: string;
    bu: BU;
    projectId: string;
    assignee: string;
    dueDate: string;
    status: TaskItem['status'];
  }) => {
    if (!payload.title || !payload.assignee || !payload.projectId) return;
    try {
      const dbData = frontendTaskToDb({
        projectId: payload.projectId,
        bu: payload.bu,
        title: payload.title,
        assignee: payload.assignee,
        dueDate: payload.dueDate,
        status: payload.status,
      });
      await updateTaskMutation.mutateAsync({ id: Number(payload.id), data: dbData });
      setEditTaskModalOpen(null);
    } catch (error) {
      console.error('Failed to update task:', error);
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

  // 상태 로딩 중일 때는 로딩 화면 표시
  if (workStatusHook.isStatusLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
        <p className="text-slate-400">근무 상태 확인 중...</p>
      </div>
    );
  }

  // OFF_WORK 또는 BREAK 상태일 때는 전체 화면 페이지만 표시
  if (workStatusHook.workStatus === 'OFF_WORK' || workStatusHook.workStatus === 'BREAK') {
    return (
      <>
        <WorkStatusFullScreen
          workStatus={workStatusHook.workStatus}
          currentTime={workStatusHook.currentTime}
          userName={workStatusHook.userName}
          userInitials={workStatusHook.userInitials}
          isChanging={workStatusHook.isChanging}
          onStatusChange={(status) => {
            workStatusHook.handleStatusChange(status, async (status, previousStatus) => {
              try {
                // OFF_WORK에서 WORKING으로 변경할 때만 check-in
                if (status === 'WORKING' && previousStatus === 'OFF_WORK') {
                  const res = await fetch('/api/attendance/check-in', { method: 'POST' });
                  if (!res.ok) throw new Error('Failed to check in');
                } else if (status === 'OFF_WORK') {
                  const res = await fetch('/api/attendance/check-out', { method: 'POST' });
                  if (!res.ok) throw new Error('Failed to check out');
                }
                // BREAK에서 WORKING으로 변경할 때는 API 호출 없이 상태만 변경
              } catch (error) {
                console.error('Status change error:', error);
                throw error;
              }
            });
          }}
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
          onConfirm={() => {
            workStatusHook.confirmLogout(
              async (status) => {
                try {
                  if (status === 'OFF_WORK') {
                    const res = await fetch('/api/attendance/check-out', { method: 'POST' });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      // 이미 퇴근 처리된 경우는 성공으로 처리
                      if (data.error && data.error.includes('이미 퇴근 처리되었습니다')) {
                        return;
                      }
                      throw new Error(data.error || 'Failed to check out');
                    }
                  }
                } catch (error) {
                  console.error('Status change error:', error);
                  throw error;
                }
              },
              handleLogout
            );
          }}
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
      </>
    );
  }

  // ReactStudio 뷰일 때는 별도 레이아웃 사용
  if (view === 'reactstudio' && bu === 'REACT') {
    return <ReactStudioDashboard bu={bu} />;
  }

  const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      <div className="p-4 sm:p-8">
        <button
          onClick={() => {
            setView('dashboard');
            onItemClick?.();
          }}
          className="text-left"
        >
          <p className="text-lg sm:text-xl font-bold tracking-tighter text-blue-300">GRIGO ERP</p>
          <p className="mt-1 text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Management System
          </p>
        </button>
      </div>
      <nav className="flex-1 space-y-2 px-2 sm:px-4">
        <SidebarButton
          label="대시보드"
          icon={<LayoutDashboard className="h-4 w-4" />}
          active={view === 'dashboard'}
          onClick={() => {
            setView('dashboard');
            onItemClick?.();
          }}
        />
        <SidebarButton
          label="프로젝트 관리"
          icon={<FolderKanban className="h-4 w-4" />}
          active={view === 'projects'}
          onClick={() => {
            setView('projects');
            onItemClick?.();
          }}
        />
        <SidebarButton
          label="정산 관리"
          icon={<Coins className="h-4 w-4" />}
          active={view === 'settlement'}
          onClick={() => {
            setView('settlement');
            onItemClick?.();
          }}
        />
        <SidebarButton
          label="할일 관리"
          icon={<CheckSquare className="h-4 w-4" />}
          active={view === 'tasks'}
          onClick={() => {
            setView('tasks');
            onItemClick?.();
          }}
        />
        <SidebarButton
          label="조직 현황"
          icon={<Users className="h-4 w-4" />}
          active={view === 'organization'}
          onClick={() => {
            setView('organization');
            onItemClick?.();
          }}
        />
        <SidebarButton
          label="근무시간 관리"
          icon={<Clock className="h-4 w-4" />}
          active={view === 'attendance'}
          onClick={() => {
            setView('attendance');
            onItemClick?.();
          }}
        />
      </nav>
      {/* 관리자 전용 메뉴 */}
      {user?.profile?.role === 'admin' && (
        <div className="px-2 sm:px-4 pb-2">
          <p className="px-2 sm:px-3 py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            관리자 전용
          </p>
          <button
            onClick={() => {
              setView('attendanceAdmin');
              onItemClick?.();
            }}
            className={cn(
              "w-full flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm transition-all duration-200",
              view === 'attendanceAdmin'
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg"
                : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white"
            )}
          >
            <Users className="h-4 w-4" />
            <span className="font-medium whitespace-nowrap">전체 근무현황</span>
          </button>
        </div>
      )}
      <div className="mt-auto space-y-4 p-4 sm:p-6">
        <div className="border-t border-slate-700"></div>
        <div className="space-y-2">
          <p className="px-2 sm:px-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            사업부별 대시보드
          </p>
          {(Object.keys(BU_TITLES) as BU[]).map((buKey) => (
            <Link
              key={buKey}
              href={
                buKey === 'AST' 
                  ? '/astcompany' 
                  : buKey === 'GRIGO' 
                  ? '/grigoent' 
                  : buKey === 'FLOW'
                  ? '/flowmaker'
                  : buKey === 'MODOO'
                  ? '/modoogoods'
                  : `/${buToSlug(buKey)}`
              }
              onClick={() => onItemClick?.()}
              className={cn(
                'flex w-full items-center gap-2 sm:gap-3 rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 text-left text-xs sm:text-sm transition',
                'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <span className="w-4 sm:w-5 text-center">
                <FolderKanban className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
              <span>{BU_TITLES[buKey]}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="p-4 sm:p-6 pt-0">
        <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-3 sm:p-4">
          <p className="mb-1 text-[9px] sm:text-[10px] uppercase tracking-tighter text-slate-500 dark:text-slate-400">
            Signed in as
          </p>
          <p className="text-xs sm:text-sm font-semibold text-blue-100">
            {user?.profile?.name || user?.email || '사용자'}
          </p>
          {user?.profile?.position && (
            <p className="mt-1 text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500">{user.profile.position}</p>
          )}
        </div>
        <button
          onClick={() => {
            handleLogout();
            onItemClick?.();
          }}
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 transition hover:bg-slate-700/60 flex items-center justify-center gap-2"
        >
          <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          로그아웃
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:text-slate-100">
      {/* 데스크톱 사이드바 */}
      <aside className="hidden h-screen w-64 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-slate-900 text-white lg:flex">
        <SidebarContent />
      </aside>

      {/* 모바일 사이드바 */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-[320px] bg-slate-900 text-white p-0 border-slate-700">
          <SheetHeader className="sr-only">
            <SheetTitle>메뉴</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col">
            <SidebarContent onItemClick={() => setMobileMenuOpen(false)} />
          </div>
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
                    : view === 'attendance'
                      ? '근태 관리'
                      : view === 'attendanceAdmin'
                        ? '전체 근무현황'
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
          workStatusHook={workStatusHook}
          onStatusChange={(status) => {
            workStatusHook.handleStatusChange(status, async (newStatus, previousStatus) => {
              try {
                if (newStatus === 'WORKING' && previousStatus === 'OFF_WORK') {
                  const res = await fetch('/api/attendance/check-in', { method: 'POST' });
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (data.error && data.error.includes('이미 출근 처리되었습니다')) {
                      return;
                    }
                    throw new Error(data.error || 'Failed to check in');
                  }
                } else if (newStatus === 'OFF_WORK') {
                  const res = await fetch('/api/attendance/check-out', { method: 'POST' });
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (data.error && data.error.includes('이미 퇴근 처리되었습니다')) {
                      return;
                    }
                    throw new Error(data.error || 'Failed to check out');
                  }
                }
              } catch (error) {
                console.error('Status change error:', error);
                throw error;
              }
            });
          }}
        />

        {/* 환영 모달 */}
        <WorkStatusWelcomeModal
          showWelcome={workStatusHook.showWelcome}
          welcomeTitle={workStatusHook.welcomeTitle}
          welcomeMsg={workStatusHook.welcomeMsg}
        />

        {/* 퇴근 확인 모달 */}
        <WorkStatusLogoutModal
          showLogoutConfirm={workStatusHook.showLogoutConfirm}
          isChanging={workStatusHook.isChanging}
          onCancel={() => workStatusHook.setShowLogoutConfirm(false)}
          onConfirm={() => {
            workStatusHook.confirmLogout(
              async (status) => {
                try {
                  if (status === 'OFF_WORK') {
                    const res = await fetch('/api/attendance/check-out', { method: 'POST' });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      // 이미 퇴근 처리된 경우는 성공으로 처리
                      if (data.error && data.error.includes('이미 퇴근 처리되었습니다')) {
                        return;
                      }
                      throw new Error(data.error || 'Failed to check out');
                    }
                  }
                } catch (error) {
                  console.error('Status change error:', error);
                  throw error;
                }
              },
              handleLogout
            );
          }}
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

        <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
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
                setModalProjectId(String(project.id));
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
              onOpenModal={setModalProjectId}
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
            />
          )}

          {view === 'settlement' && (
            <SettlementView
              bu={bu}
              onBuChange={handleBuChange}
              rows={settlementRows}
              projects={projects}
              onEditFinance={setEditFinanceModalOpen}
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

        </div>
      </main>

      {modalProject && (
        <ModalProject
          project={modalProject}
          onClose={() => setModalProjectId(null)}
          entries={modalEntries}
          period={activePeriod}
          formState={formState}
          formError={formError}
          onFormChange={setFormState}
          onAddEntry={handleAddEntry}
          onDateChange={handleProjectDateChange}
          onEditFinance={setEditFinanceModalOpen}
          onEditTask={setEditTaskModalOpen}
          onUpdateProject={handleUpdateProject}
          onAddTask={(projectId) => {
            setTaskModalProjectId(projectId);
            setTaskModalOpen(true);
          }}
          tasks={tasks.filter((t) => t.projectId === modalProject.id)}
          projects={projects}
          orgData={orgData}
          usersData={usersData}
          partnerCompaniesData={partnerCompaniesData}
          partnerWorkersData={partnerWorkersData}
          calculateActualAmount={calculateActualAmount}
        />
      )}
      {isProjectModalOpen && (
        <ProjectModal
          onClose={() => setProjectModalOpen(false)}
          onSubmit={handleCreateProject}
          defaultBu={bu === 'ALL' ? 'GRIGO' : bu}
          usersData={usersData}
          partnerCompaniesData={partnerCompaniesData}
          partnerWorkersData={partnerWorkersData}
          placeholders={{
            projectName: '예: 2025 신규 프로젝트',
            category: '예: 기획, 제작, 운영',
            description: '프로젝트 설명을 입력하세요',
          }}
        />
      )}
      {isTaskModalOpen && (
        <CreateTaskModal
          onClose={() => {
            setTaskModalOpen(false);
            setTaskModalProjectId(undefined);
          }}
          onSubmit={handleCreateTask}
          defaultBu={bu === 'ALL' ? 'GRIGO' : bu}
          projects={projects}
          defaultProjectId={taskModalProjectId ?? modalProjectId ?? currentProjects[0]?.id}
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
          partnerCompaniesData={partnerCompaniesData}
          partnerWorkersData={partnerWorkersData}
          calculateActualAmount={calculateActualAmount}
          defaultProjectId={financeDefaultProjectId}
        />
      )}
      {isEditFinanceModalOpen && (
        <EditFinanceModal
          entry={isEditFinanceModalOpen}
          onClose={() => setEditFinanceModalOpen(null)}
          onSubmit={handleUpdateFinance}
          projects={projects}
          partnerCompaniesData={partnerCompaniesData}
          partnerWorkersData={partnerWorkersData}
          calculateActualAmount={calculateActualAmount}
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
      {isEditProjectModalOpen && (
        <ProjectModal
          project={isEditProjectModalOpen}
          onClose={() => setEditProjectModalOpen(null)}
          onSubmit={handleUpdateProject}
          defaultBu={bu === 'ALL' ? 'GRIGO' : bu}
          usersData={usersData}
          partnerCompaniesData={partnerCompaniesData}
          partnerWorkersData={partnerWorkersData}
          placeholders={{
            projectName: '예: 2025 신규 프로젝트',
            category: '예: 기획, 제작, 운영',
            description: '프로젝트 설명을 입력하세요',
          }}
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
        />
      )}
    </div>
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
        'flex w-full items-center gap-2 sm:gap-3 rounded-xl px-2 sm:px-3 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition',
        active
          ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
          : 'text-slate-300 dark:text-slate-400 hover:bg-slate-800 dark:hover:bg-slate-700 hover:text-white',
      )}
    >
      <span className="w-4 sm:w-5 text-center flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function TasksView({
  bu,
  onBuChange,
  tasks,
  projects,
  onStatusChange,
  onEditTask,
}: {
  bu: BU | 'ALL';
  onBuChange: (bu: BU | 'ALL') => void;
  tasks: TaskItem[];
  projects: Project[];
  onStatusChange: (id: string, status: TaskItem['status']) => void;
  onEditTask: (task: TaskItem) => void;
}) {
  const [taskFilter, setTaskFilter] = useState<'active' | 'completed'>('active');

  // 현재 선택된 bu에 해당하는 프로젝트만 필터링
  const buProjects = projects.filter((p) => p.bu === bu);
  const buProjectIds = buProjects.map((p) => p.id);
  const buTasks = tasks.filter((t) => buProjectIds.includes(t.projectId));

  // 할일 상태 필터링
  const rows = useMemo(() => {
    if (taskFilter === 'active') {
      return buTasks.filter((t) => t.status === 'todo' || t.status === 'in-progress');
    } else {
      return buTasks.filter((t) => t.status === 'done');
    }
  }, [buTasks, taskFilter]);

  const findProject = (id: string) => projects.find((p) => p.id === id)?.name ?? '-';

  return (
    <section className="space-y-6">
      <BuTabs bu={bu} onChange={onBuChange} prefix="TASK" />

      {/* 할일 필터 토글 */}
      <div className="flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
        <button
          onClick={() => setTaskFilter('active')}
          className={cn(
            'px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold transition whitespace-nowrap rounded-lg',
            taskFilter === 'active'
              ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
          )}
        >
          진행예정/진행중
        </button>
        <button
          onClick={() => setTaskFilter('completed')}
          className={cn(
            'px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold transition whitespace-nowrap rounded-lg',
            taskFilter === 'completed'
              ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
          )}
        >
          완료
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 p-3 sm:p-4 lg:p-6">
          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{BU_TITLES[bu]} 할일 관리</h3>
          <span className="text-[9px] sm:text-[10px] lg:text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0">{rows.length}건</span>
        </div>
        {/* 모바일: 카드 형태, 데스크톱: 테이블 */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-[10px] sm:text-[11px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
              <tr>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">프로젝트</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">할일</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">담당자</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">마감일</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className="cursor-pointer transition hover:bg-slate-50 dark:bg-slate-900"
                >
                  <td className="px-3 sm:px-6 py-3 font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[120px] sm:max-w-none">
                    {findProject(task.projectId)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-none">{task.title}</td>
                  <td className="px-3 sm:px-6 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{task.assignee}</td>
                  <td className="px-3 sm:px-6 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{task.dueDate}</td>
                  <td className="px-3 sm:px-6 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onChange={(e) => onStatusChange(task.id, e.target.value as TaskItem['status'])}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[10px] sm:text-[11px] outline-none w-full"
                    >
                      <option value="todo">TODO</option>
                      <option value="in-progress">IN PROGRESS</option>
                      <option value="done">DONE</option>
                    </select>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    {taskFilter === 'active'
                      ? '현재 선택한 사업부에 진행 예정이거나 진행 중인 할일이 없습니다.'
                      : '현재 선택한 사업부에 완료된 할일이 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* 모바일 카드 뷰 */}
        <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
          {rows.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              {taskFilter === 'active'
                ? '현재 선택한 사업부에 진행 예정이거나 진행 중인 할일이 없습니다.'
                : '현재 선택한 사업부에 완료된 할일이 없습니다.'}
            </div>
          ) : (
            rows.map((task) => (
              <button
                key={task.id}
                onClick={() => onEditTask(task)}
                className="w-full px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mb-1">{task.title}</p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">{findProject(task.projectId)}</p>
                  </div>
                  <select
                    value={task.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onStatusChange(task.id, e.target.value as TaskItem['status'])}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[9px] outline-none flex-shrink-0"
                  >
                    <option value="todo">TODO</option>
                    <option value="in-progress">진행중</option>
                    <option value="done">완료</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="whitespace-nowrap">담당자: {task.assignee}</span>
                  <span className="whitespace-nowrap">마감일: {task.dueDate}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function OrganizationView({
  bu,
  orgData,
  externalWorkersData,
  partnerWorkersData,
  partnerCompaniesData,
  usersData,
  currentUser,
  orgViewTab,
  onTabChange,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onAddExternalWorker,
  onEditExternalWorker,
  onDeleteExternalWorker,
  onEditUser,
  onAddUser,
}: {
  bu: BU | 'ALL';
  orgData: any[];
  externalWorkersData: any[];
  partnerWorkersData: any[];
  partnerCompaniesData: any[];
  usersData?: { users: any[]; currentUser: any };
  currentUser?: any;
  orgViewTab: 'org' | 'external' | 'users';
  onTabChange: (tab: 'org' | 'external' | 'users') => void;
  onAddMember: (orgUnitId: number) => void;
  onEditMember: (member: any) => void;
  onDeleteMember: (id: number) => void;
  onAddExternalWorker: () => void;
  onEditExternalWorker: (worker: any) => void;
  onDeleteExternalWorker: (id: number) => void;
  onEditUser: (user: any) => void;
  onAddUser: () => void;
}) {
  const isAdmin = currentUser?.profile?.role === 'admin';
  const users = usersData?.users || [];

  // 내부 직원: app_users 중 bu_code가 NULL이 아닌 사람
  const internalEmployees = useMemo(() => {
    return users.filter((u: any) => u.bu_code != null);
  }, [users]);

  // 외주 인원: app_users 중 bu_code가 null인 사람 + partner_worker 목록
  const externalWorkers = useMemo(() => {
    const usersWithoutBu = users.filter((u: any) => u.bu_code == null);
    // partner_worker를 app_users 형식에 맞게 변환
    const partnerWorkersAsUsers = partnerWorkersData.map((pw: any) => {
      const company = partnerCompaniesData.find((pc: any) => pc.id === pw.partner_company_id);
      return {
        id: `partner_${pw.id}`,
        name: pw.name_ko || pw.name_en || pw.name || '-',
        email: pw.email || null,
        role: 'viewer' as const,
        bu_code: pw.bu_code || null,
        position: null,
        created_at: pw.created_at,
        updated_at: pw.updated_at,
        artist_id: null,
        is_partner_worker: true,
        partner_worker_id: pw.id,
        worker_type: pw.worker_type,
        partner_company_id: pw.partner_company_id,
        partner_company_name: company ? (company.company_name_ko || company.company_name_en || '-') : null,
        phone: pw.phone,
        specialties: pw.specialties,
        is_active: pw.is_active !== false,
      };
    });
    return [...usersWithoutBu, ...partnerWorkersAsUsers];
  }, [users, partnerWorkersData, partnerCompaniesData]);

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* 탭 메뉴 */}
      <div className="flex w-fit overflow-x-auto rounded-xl sm:rounded-2xl bg-slate-200/60 p-1 sm:p-1.5">
        <button
          onClick={() => onTabChange('org')}
          className={cn(
            'px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap',
            orgViewTab === 'org'
              ? 'tab-active rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 text-blue-600 shadow'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100',
          )}
        >
          내부 직원
        </button>
        <button
          onClick={() => onTabChange('external')}
          className={cn(
            'px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap',
            orgViewTab === 'external'
              ? 'tab-active rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 text-blue-600 shadow'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100',
          )}
        >
          외주 인력
        </button>
        <button
          onClick={() => onTabChange('users')}
          className={cn(
            'px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap',
            orgViewTab === 'users'
              ? 'tab-active rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 text-blue-600 shadow'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100',
          )}
        >
          회원 관리
        </button>
      </div>

      {orgViewTab === 'org' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-6 shadow-sm">
            <div className="mb-3 sm:mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">내부 직원</h3>
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                총 {internalEmployees.length}명
              </span>
            </div>

            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full text-left text-[10px] sm:text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">이름</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">소속사업부</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">직급</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">역할</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">이메일</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">가입일</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {internalEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        등록된 내부 직원이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    internalEmployees.map((user: any) => (
                      <tr key={user.id} className="transition hover:bg-slate-50 dark:bg-slate-900">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{user.name}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {user.bu_code ? BU_TITLES[user.bu_code] || user.bu_code : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{user.position || '-'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                              user.role === 'admin'
                                ? 'bg-red-100 text-red-700'
                                : user.role === 'manager'
                                  ? 'bg-blue-100 text-blue-700'
                                  : user.role === 'member'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : user.role === 'artist'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                            )}
                          >
                            {user.role === 'admin'
                              ? '관리자'
                              : user.role === 'manager'
                                ? '매니저'
                                : user.role === 'member'
                                  ? '멤버'
                                  : user.role === 'artist'
                                    ? '아티스트'
                                    : '뷰어'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{user.email || '-'}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onEditUser(user)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-900 hover:text-blue-600"
                            title="수정"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {orgViewTab === 'external' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">외주 인력 관리</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  총 {externalWorkers.length}명
                </span>
                <button
                  onClick={onAddExternalWorker}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  외주 인력 추가
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">구분</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">이름</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">타입</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">회사명</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">소속사업부</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">전문분야</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">연락처</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">이메일</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">활성화</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {externalWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        등록된 외주 인력이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    externalWorkers.map((w: any) => (
                      <tr key={w.id} className="transition hover:bg-slate-50 dark:bg-slate-900">
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                              w.is_partner_worker
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700',
                            )}
                          >
                            {w.is_partner_worker ? '파트너' : '사용자'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{w.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          {w.is_partner_worker ? (
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                                w.worker_type === 'freelancer'
                                  ? 'bg-purple-100 text-purple-700'
                                  : w.worker_type === 'employee'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-slate-100 text-slate-700',
                              )}
                            >
                              {w.worker_type === 'freelancer'
                                ? '프리랜서'
                                : w.worker_type === 'employee'
                                  ? '직원'
                                  : w.worker_type === 'contractor'
                                    ? '계약직'
                                    : '-'}
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                                w.role === 'admin'
                                  ? 'bg-red-100 text-red-700'
                                  : w.role === 'manager'
                                    ? 'bg-blue-100 text-blue-700'
                                    : w.role === 'member'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : w.role === 'artist'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                              )}
                            >
                              {w.role === 'admin'
                                ? '관리자'
                                : w.role === 'manager'
                                  ? '매니저'
                                  : w.role === 'member'
                                    ? '멤버'
                                    : w.role === 'artist'
                                      ? '아티스트'
                                      : '뷰어'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {w.is_partner_worker
                            ? w.partner_company_id
                              ? w.partner_company_name || '-'
                              : '개인'
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {w.bu_code ? BU_TITLES[w.bu_code] || w.bu_code : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {w.specialties && Array.isArray(w.specialties) && w.specialties.length > 0
                            ? w.specialties.join(', ')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{w.phone || '-'}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{w.email || '-'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                              w.is_active !== false
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                            )}
                          >
                            {w.is_active !== false ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {w.is_partner_worker ? (
                              <>
                                <button
                                  onClick={() => onEditExternalWorker(w)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-900 hover:text-blue-600"
                                  title="수정"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteExternalWorker(w.partner_worker_id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                                  title="삭제"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => onEditUser(w)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-900 hover:text-blue-600"
                                title="수정"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {orgViewTab === 'users' && (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">회원 관리</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">전체 회원 리스트</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">총 {users.length}명</span>
              {isAdmin && (
                <button
                  onClick={onAddUser}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  회원 추가
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase tracking-tight">이름</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-tight">이메일</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-tight">역할</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-tight">소속사업부</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-tight">직급</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-tight">가입일</th>
                  {isAdmin && (
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">관리</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                      등록된 회원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  users.map((u: any) => (
                    <tr key={u.id} className="transition hover:bg-slate-50 dark:bg-slate-900">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                            u.role === 'admin'
                              ? 'bg-red-100 text-red-700'
                              : u.role === 'manager'
                                ? 'bg-blue-100 text-blue-700'
                                : u.role === 'member'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : u.role === 'artist'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                          )}
                        >
                          {u.role === 'admin'
                            ? '관리자'
                            : u.role === 'manager'
                              ? '매니저'
                              : u.role === 'member'
                                ? '멤버'
                                : u.role === 'artist'
                                  ? '아티스트'
                                  : '뷰어'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {u.bu_code ? BU_TITLES[u.bu_code] || u.bu_code : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.position || '-'}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onEditUser(u)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-900 hover:text-blue-600"
                            title="수정"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function QuickAction({ title, icon, onClick }: { title: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 text-left shadow-sm transition hover:border-blue-200 hover:shadow"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{title}</p>
        <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">모달을 열어 즉시 등록</p>
      </div>
      <span className="rounded-full bg-blue-50 dark:bg-blue-900/50 p-3 text-blue-600 dark:text-blue-300">{icon}</span>
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
    partnerType: 'company' | 'worker' | '';
    partnerCompanyId: string;
    partnerWorkerId: string;
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
      partnerType: 'company' | 'worker' | '';
      partnerCompanyId: string;
      partnerWorkerId: string;
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
    const participants = selectedParticipants.map((p) => ({
      user_id: p.type === 'user' ? (p.id as string) : undefined,
      partner_worker_id: p.type === 'partner_worker' ? (p.id as number) : undefined,
      partner_company_id: p.type === 'partner_company' ? (p.id as number) : undefined,
      role: 'participant',
    }));
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
                TODO {tasks.filter(t => t.status === 'todo').length}개
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
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tight whitespace-nowrap flex-shrink-0 ml-3',
                        task.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                        task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                      )}>
                        {task.status === 'todo' ? 'TODO' : task.status === 'in-progress' ? 'IN PROGRESS' : 'DONE'}
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
                  <p className="font-bold text-emerald-600">{formatCurrency(entries.periodProfit)}</p>
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
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{r.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{r.date} • {r.category}</p>
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
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{e.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{e.date} • {e.category}</p>
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
                    value={formState.partnerType}
                    onChange={(e) => {
                      const newType = e.target.value as 'company' | 'worker' | '';
                      onFormChange((prev) => ({ 
                        ...prev, 
                        partnerType: newType,
                        partnerCompanyId: newType !== 'company' ? '' : prev.partnerCompanyId,
                        partnerWorkerId: newType !== 'worker' ? '' : prev.partnerWorkerId,
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs outline-none"
                  >
                    <option value="">선택 안함</option>
                    <option value="company">회사</option>
                    <option value="worker">인력</option>
                  </select>
                </div>
                
                {formState.partnerType === 'company' && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400">지급처 회사</label>
                    <select
                      value={formState.partnerCompanyId}
                      onChange={(e) => onFormChange((prev) => ({ ...prev, partnerCompanyId: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs outline-none"
                    >
                      <option value="">선택하세요</option>
                      {(partnerCompaniesData || []).map((company: any) => (
                        <option key={company.id} value={company.id}>
                          {company.company_name_ko || company.company_name_en || `회사 #${company.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {formState.partnerType === 'worker' && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400">지급처 인력</label>
                    <select
                      value={formState.partnerWorkerId}
                      onChange={(e) => onFormChange((prev) => ({ ...prev, partnerWorkerId: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs outline-none"
                    >
                      <option value="">선택하세요</option>
                      {(partnerWorkersData || []).map((worker: any) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.name_ko || worker.name_en || worker.name || `인력 #${worker.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
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
              <p className="font-bold text-emerald-600">{formatCurrency(entries.totalProfit)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  onSubmit: (payload: { title: string; bu: BU; projectId: string; assignee: string; dueDate: string }) => Promise<string | null>;
  defaultBu: BU;
  projects: Project[];
  defaultProjectId?: string;
  orgData: any[];
  usersData?: { users: any[]; currentUser: any };
}) {
  const [form, setForm] = useState({
    title: '',
    bu: defaultBu,
    projectId: defaultProjectId ?? projects[0]?.id ?? '',
    assignee: '',
    dueDate: '',
  });
  const [assigneeMode, setAssigneeMode] = useState<'select' | 'custom'>('select');
  const [error, setError] = useState<string>('');

  // 회원 목록 추출 (권한, 사업부 관계 없이 모든 회원 포함, 자기 자신 포함)
  const memberNames = useMemo(() => {
    const names = new Set<string>();
    
    // 조직 멤버에서 추출
    orgData.forEach((unit) => {
      (unit.members || []).forEach((m: any) => {
        if (m.name) names.add(m.name);
      });
    });
    
    // app_users에서 추출 (권한, 사업부 관계 없이 모든 사용자)
    if (usersData?.users) {
      usersData.users.forEach((user: any) => {
        if (user.name) names.add(user.name);
      });
    }
    
    return Array.from(names).sort();
  }, [orgData, usersData]);

  // 담당자 선택 옵션 (회원 목록 + '직접 입력')
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
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="사업부"
            value={form.bu}
            onChange={(val) => {
              const nextBu = val as BU;
              const firstProjectInBu =
                projects.find((p) => p.bu === nextBu)?.id ?? '';
              setForm((prev) => ({
                ...prev,
                bu: nextBu,
                projectId: firstProjectInBu || prev.projectId,
              }));
            }}
            options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({
              value: k,
              label: BU_TITLES[k],
            }))}
          />
          <SelectField
            label="프로젝트"
            value={form.projectId}
            onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
            options={projects
              .filter((p) => p.bu === form.bu)
              .map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>
        {assigneeMode === 'select' ? (
          <div className="space-y-1">
            <SelectField
              label="담당자"
              value={form.assignee || '__PLACEHOLDER__'}
              onChange={(val) => {
                if (val === '__CUSTOM__') {
                  setAssigneeMode('custom');
                  setForm((prev) => ({ ...prev, assignee: '' }));
                } else if (val === '__PLACEHOLDER__') {
                  setForm((prev) => ({ ...prev, assignee: '' }));
                } else {
                  // 실제 담당자 이름이 선택된 경우
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
                if (memberNames.includes(form.assignee)) {
                  // 현재 입력값이 회원 목록에 있으면 그대로 유지
                } else {
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
          // 담당자 필드 trim 처리
          const trimmedForm = {
            ...form,
            assignee: form.assignee?.trim() || '',
          };
          const result = await onSubmit(trimmedForm);
          if (result) {
            setError(result);
          }
        }}
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

function CreateFinanceModal({
  mode,
  onClose,
  onSubmit,
  projects,
  partnerCompaniesData,
  partnerWorkersData,
  calculateActualAmount,
  defaultProjectId,
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
    partnerType?: 'company' | 'worker' | '';
    partnerCompanyId?: string;
    partnerWorkerId?: string;
    paymentMethod?: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '';
  }) => Promise<string | null>;
  projects: Project[];
  partnerCompaniesData?: any[];
  partnerWorkersData?: any[];
  calculateActualAmount: (amount: number, paymentMethod: string) => number | null;
  defaultProjectId?: string | null;
}) {
  const defaultProject = defaultProjectId
    ? projects.find((p) => p.id === defaultProjectId)
    : projects[0];
  const [form, setForm] = useState({
    projectId: defaultProject?.id ?? '',
    bu: defaultProject?.bu ?? 'GRIGO',
    cat: '',
    name: '',
    amount: '',
    date: '',
    status: 'planned' as FinancialEntryStatus,
    partnerType: '' as 'company' | 'worker' | '',
    partnerCompanyId: '',
    partnerWorkerId: '',
    paymentMethod: '' as 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '',
  });
  const [error, setError] = useState<string>('');

  return (
    <ModalShell title={mode === 'revenue' ? '매출 등록' : '지출 등록'} onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="사업부"
          value={form.bu}
          onChange={(val) => {
            const nextBu = val as BU;
            const firstProject = projects.find((p) => p.bu === nextBu)?.id ?? '';
            setForm((prev) => ({
              ...prev,
              bu: nextBu,
              projectId: firstProject || prev.projectId,
            }));
          }}
          options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({
            value: k,
            label: BU_TITLES[k],
          }))}
        />
        <SelectField
          label="프로젝트"
          value={form.projectId}
          onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
          options={projects
            .filter((p) => p.bu === form.bu)
            .map((p) => ({ value: p.id, label: p.name }))}
        />
        <InputField
          label="구분"
          placeholder="예: 선금 / 광고비"
          value={form.cat}
          onChange={(v) => setForm((prev) => ({ ...prev, cat: v }))}
        />
        <InputField
          label="항목명"
          placeholder="항목명을 입력"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="금액"
          type="number"
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
          onChange={(v) => setForm((prev) => ({ ...prev, status: v as FinancialEntryStatus }))}
          options={[
            { value: 'planned', label: '지급예정' },
            { value: 'paid', label: '지급완료' },
            { value: 'canceled', label: '취소' },
          ]}
        />
      </div>
      
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 border-t border-slate-200 dark:border-slate-700 pt-4">
        <div className="space-y-1">
          <label className="text-xs text-slate-500 dark:text-slate-400">지급처 유형</label>
          <select
            value={form.partnerType}
            onChange={(e) => {
              const newType = e.target.value as 'company' | 'worker' | '';
              setForm((prev) => ({ 
                ...prev, 
                partnerType: newType,
                partnerCompanyId: newType !== 'company' ? '' : prev.partnerCompanyId,
                partnerWorkerId: newType !== 'worker' ? '' : prev.partnerWorkerId,
              }));
            }}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
          >
            <option value="">선택 안함</option>
            <option value="company">회사</option>
            <option value="worker">인력</option>
          </select>
        </div>
        
        {form.partnerType === 'company' && (
          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">지급처 회사</label>
            <select
              value={form.partnerCompanyId}
              onChange={(e) => setForm((prev) => ({ ...prev, partnerCompanyId: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
            >
              <option value="">선택하세요</option>
              {(partnerCompaniesData || []).map((company: any) => (
                <option key={company.id} value={company.id}>
                  {company.company_name_ko || company.company_name_en || `회사 #${company.id}`}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {form.partnerType === 'worker' && (
          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">지급처 인력</label>
            <select
              value={form.partnerWorkerId}
              onChange={(e) => setForm((prev) => ({ ...prev, partnerWorkerId: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
            >
              <option value="">선택하세요</option>
              {(partnerWorkersData || []).map((worker: any) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name_ko || worker.name_en || worker.name || `인력 #${worker.id}`}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="space-y-1">
          <label className="text-xs text-slate-500 dark:text-slate-400">지급 방식</label>
          <select
            value={form.paymentMethod}
            onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value as any }))}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
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
            <label className="text-xs text-slate-500 dark:text-slate-400">실지급액</label>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">자동계산</span>
          </div>
          <input
            type="text"
            readOnly
            value={
              form.amount && form.paymentMethod
                ? calculateActualAmount(Number(form.amount), form.paymentMethod)?.toLocaleString() || '-'
                : '-'
            }
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm font-bold outline-none"
          />
        </div>
      </div>
      
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={async () => {
          setError('');
          const result = await onSubmit({ ...form, type: mode });
          if (result) {
            setError(result);
          }
        }}
        onClose={onClose}
        primaryLabel="등록"
      />
    </ModalShell>
  );
}

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
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-300"
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
                ? 'bg-blue-100 text-blue-600' 
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800'
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
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
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
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
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
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
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
    <div className="modal-container active fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
        <div className="p-6">
          <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-slate-200">{title}</h3>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">{message}</p>
          <div className="flex items-center justify-end gap-2">
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
    </div>
  );
}

function EditFinanceModal({
  entry,
  onClose,
  onSubmit,
  projects,
  partnerCompaniesData,
  partnerWorkersData,
  calculateActualAmount,
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
    partnerType?: 'company' | 'worker' | '';
    partnerCompanyId?: string;
    partnerWorkerId?: string;
    paymentMethod?: 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '';
  }) => void;
  projects: Project[];
  partnerCompaniesData?: any[];
  partnerWorkersData?: any[];
  calculateActualAmount: (amount: number, paymentMethod: string) => number | null;
}) {
  const entryData = entry as any;
  const [form, setForm] = useState({
    projectId: entry.projectId,
    bu: entry.bu,
    type: entry.type,
    cat: entry.category,
    name: entry.name,
    amount: String(entry.amount),
    date: entry.date,
    status: entry.status,
    partnerType: (entryData.partner_company_id ? 'company' : entryData.partner_worker_id ? 'worker' : '') as 'company' | 'worker' | '',
    partnerCompanyId: entryData.partner_company_id ? String(entryData.partner_company_id) : '',
    partnerWorkerId: entryData.partner_worker_id ? String(entryData.partner_worker_id) : '',
    paymentMethod: (entryData.payment_method || '') as 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment' | '',
  });

  return (
    <ModalShell title="매출/지출 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="사업부"
          value={form.bu}
          onChange={(val) => {
            const nextBu = val as BU;
            const firstProject = projects.find((p) => p.bu === nextBu)?.id ?? '';
            setForm((prev) => ({
              ...prev,
              bu: nextBu,
              projectId: firstProject || prev.projectId,
            }));
          }}
          options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({
            value: k,
            label: BU_TITLES[k],
          }))}
        />
        <SelectField
          label="프로젝트"
          value={form.projectId}
          onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
          options={projects
            .filter((p) => p.bu === form.bu)
            .map((p) => ({ value: p.id, label: p.name }))}
        />
        <SelectField
          label="구분"
          value={form.type}
          onChange={(val) => setForm((prev) => ({ ...prev, type: val as 'revenue' | 'expense' }))}
          options={[
            { value: 'revenue', label: '매출' },
            { value: 'expense', label: '지출' },
          ]}
        />
        <InputField
          label="카테고리"
          placeholder="예: 선금 / 광고비"
          value={form.cat}
          onChange={(v) => setForm((prev) => ({ ...prev, cat: v }))}
        />
        <InputField
          label="항목명"
          placeholder="항목명을 입력"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="금액"
          type="number"
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
          onChange={(v) => setForm((prev) => ({ ...prev, status: v as FinancialEntryStatus }))}
          options={[
            { value: 'planned', label: '지급예정' },
            { value: 'paid', label: '지급완료' },
            { value: 'canceled', label: '취소' },
          ]}
        />
      </div>
      
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 border-t border-slate-200 dark:border-slate-700 pt-4">
        <div className="space-y-1">
          <label className="text-xs text-slate-500 dark:text-slate-400">지급처 유형</label>
          <select
            value={form.partnerType}
            onChange={(e) => {
              const newType = e.target.value as 'company' | 'worker' | '';
              setForm((prev) => ({ 
                ...prev, 
                partnerType: newType,
                partnerCompanyId: newType !== 'company' ? '' : prev.partnerCompanyId,
                partnerWorkerId: newType !== 'worker' ? '' : prev.partnerWorkerId,
              }));
            }}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
          >
            <option value="">선택 안함</option>
            <option value="company">회사</option>
            <option value="worker">인력</option>
          </select>
        </div>
        
        {form.partnerType === 'company' && (
          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">지급처 회사</label>
            <select
              value={form.partnerCompanyId}
              onChange={(e) => setForm((prev) => ({ ...prev, partnerCompanyId: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
            >
              <option value="">선택하세요</option>
              {(partnerCompaniesData || []).map((company: any) => (
                <option key={company.id} value={company.id}>
                  {company.company_name_ko || company.company_name_en || `회사 #${company.id}`}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {form.partnerType === 'worker' && (
          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">지급처 인력</label>
            <select
              value={form.partnerWorkerId}
              onChange={(e) => setForm((prev) => ({ ...prev, partnerWorkerId: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
            >
              <option value="">선택하세요</option>
              {(partnerWorkersData || []).map((worker: any) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name_ko || worker.name_en || worker.name || `인력 #${worker.id}`}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="space-y-1">
          <label className="text-xs text-slate-500 dark:text-slate-400">지급 방식</label>
          <select
            value={form.paymentMethod}
            onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value as any }))}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
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
            <label className="text-xs text-slate-500 dark:text-slate-400">실지급액</label>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">자동계산</span>
          </div>
          <input
            type="text"
            readOnly
            value={
              form.amount && form.paymentMethod
                ? calculateActualAmount(Number(form.amount), form.paymentMethod)?.toLocaleString() || '-'
                : '-'
            }
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm font-bold outline-none"
          />
        </div>
      </div>
      
      <ModalActions
        onPrimary={() => onSubmit({ ...form, id: entry.id })}
        onClose={onClose}
        primaryLabel="수정"
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
    bu: BU;
    projectId: string;
    assignee: string;
    dueDate: string;
    status: TaskItem['status'];
  }) => void;
  projects: Project[];
  orgData: any[];
  usersData?: { users: any[]; currentUser: any };
}) {
  // 회원 목록 추출 (권한, 사업부 관계 없이 모든 회원 포함, 자기 자신 포함)
  const memberNames = useMemo(() => {
    const names = new Set<string>();
    
    // 조직 멤버에서 추출
    orgData.forEach((unit) => {
      (unit.members || []).forEach((m: any) => {
        if (m.name) names.add(m.name);
      });
    });
    
    // app_users에서 추출 (권한, 사업부 관계 없이 모든 사용자)
    if (usersData?.users) {
      usersData.users.forEach((user: any) => {
        if (user.name) names.add(user.name);
      });
    }
    
    // 현재 사용자 명시적으로 추가
    if (usersData?.currentUser?.name) {
      names.add(usersData.currentUser.name);
    }
    
    return Array.from(names).sort();
  }, [orgData, usersData]);

  // 현재 담당자가 회원 목록에 있는지 확인
  const isAssigneeInList = memberNames.includes(task.assignee);
  const [assigneeMode, setAssigneeMode] = useState<'select' | 'custom'>(isAssigneeInList ? 'select' : 'custom');

  const [form, setForm] = useState({
    title: task.title,
    bu: task.bu,
    projectId: task.projectId,
    assignee: task.assignee,
    dueDate: task.dueDate,
    status: task.status,
  });

  // 담당자 선택 옵션 (회원 목록 + '직접 입력')
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
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="사업부"
            value={form.bu}
            onChange={(val) => {
              const nextBu = val as BU;
              const firstProjectInBu =
                projects.find((p) => p.bu === nextBu)?.id ?? '';
              setForm((prev) => ({
                ...prev,
                bu: nextBu,
                projectId: firstProjectInBu || prev.projectId,
              }));
            }}
            options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({
              value: k,
              label: BU_TITLES[k],
            }))}
          />
          <SelectField
            label="프로젝트"
            value={form.projectId}
            onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
            options={projects
              .filter((p) => p.bu === form.bu)
              .map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>
        {assigneeMode === 'select' ? (
          <div className="space-y-1">
            <SelectField
              label="담당자"
              value={form.assignee || '__PLACEHOLDER__'}
              onChange={(val) => {
                if (val === '__CUSTOM__') {
                  setAssigneeMode('custom');
                  setForm((prev) => ({ ...prev, assignee: '' }));
                } else if (val === '__PLACEHOLDER__') {
                  setForm((prev) => ({ ...prev, assignee: '' }));
                } else {
                  // 실제 담당자 이름이 선택된 경우
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
                if (memberNames.includes(form.assignee)) {
                  // 현재 입력값이 회원 목록에 있으면 그대로 유지
                } else {
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
          // 담당자 필드 trim 처리
          const trimmedForm = {
            ...form,
            assignee: form.assignee?.trim() || '',
          };
          onSubmit({ ...trimmedForm, id: task.id });
        }}
        onClose={onClose}
        primaryLabel="수정"
      />
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
        <CommentSection entityType="task" entityId={Number(task.id)} />
      </div>
    </ModalShell>
  );
}

function CreateOrgMemberModal({
  onClose,
  onSubmit,
  orgUnits,
  defaultOrgUnitId,
}: {
  onClose: () => void;
  onSubmit: (payload: {
    org_unit_id: number;
    name: string;
    title: string;
    bu_code?: string;
    phone?: string;
    email?: string;
    is_active?: boolean;
    is_leader?: boolean;
  }) => Promise<void>;
  orgUnits: any[];
  defaultOrgUnitId?: number | null;
}) {
  const [form, setForm] = useState({
    org_unit_id: defaultOrgUnitId || orgUnits[0]?.id || 0,
    name: '',
    title: '',
    bu_code: '',
    phone: '',
    email: '',
    is_active: true,
    is_leader: false,
  });
  const [error, setError] = useState<string>('');

  return (
    <ModalShell title="조직 멤버 추가" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="소속 조직"
          value={String(form.org_unit_id)}
          onChange={(val) => setForm((prev) => ({ ...prev, org_unit_id: Number(val) }))}
          options={orgUnits.map((unit) => ({
            value: String(unit.id),
            label: unit.name,
          }))}
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
        <SelectField
          label="소속사업부"
          value={form.bu_code}
          onChange={(val) => setForm((prev) => ({ ...prev, bu_code: val }))}
          options={[
            { value: '', label: '선택 안함' },
            ...(Object.keys(BU_TITLES) as BU[]).map((k) => ({
              value: k,
              label: BU_TITLES[k],
            })),
          ]}
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
        onPrimary={async () => {
          const missingFields: string[] = [];
          if (!form.name) missingFields.push('이름');
          if (!form.title) missingFields.push('직급');
          if (!form.org_unit_id) missingFields.push('소속 조직');

          if (missingFields.length > 0) {
            setError(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
            return;
          }

          setError('');
          await onSubmit({
            org_unit_id: form.org_unit_id,
            name: form.name,
            title: form.title,
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

function EditOrgMemberModal({
  member,
  onClose,
  onSubmit,
  orgUnits,
}: {
  member: any;
  onClose: () => void;
  onSubmit: (payload: {
    org_unit_id?: number;
    name?: string;
    title?: string;
    bu_code?: string;
    phone?: string;
    email?: string;
    is_active?: boolean;
    is_leader?: boolean;
  }) => Promise<void>;
  orgUnits: any[];
}) {
  const [form, setForm] = useState({
    org_unit_id: member.org_unit_id || 0,
    name: member.name || '',
    title: member.title || '',
    bu_code: member.bu_code || '',
    phone: member.phone || '',
    email: member.email || '',
    is_active: member.is_active !== undefined ? member.is_active : true,
    is_leader: member.is_leader || false,
  });
  const [error, setError] = useState<string>('');

  return (
    <ModalShell title="조직 멤버 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="소속 조직"
          value={String(form.org_unit_id)}
          onChange={(val) => setForm((prev) => ({ ...prev, org_unit_id: Number(val) }))}
          options={orgUnits.map((unit) => ({
            value: String(unit.id),
            label: unit.name,
          }))}
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
        <SelectField
          label="소속사업부"
          value={form.bu_code}
          onChange={(val) => setForm((prev) => ({ ...prev, bu_code: val }))}
          options={[
            { value: '', label: '선택 안함' },
            ...(Object.keys(BU_TITLES) as BU[]).map((k) => ({
              value: k,
              label: BU_TITLES[k],
            })),
          ]}
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
        onPrimary={async () => {
          const missingFields: string[] = [];
          if (!form.name) missingFields.push('이름');
          if (!form.title) missingFields.push('직급');
          if (!form.org_unit_id) missingFields.push('소속 조직');

          if (missingFields.length > 0) {
            setError(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
            return;
          }

          setError('');
          await onSubmit({
            org_unit_id: form.org_unit_id,
            name: form.name,
            title: form.title,
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

function CreateExternalWorkerModal({
  onClose,
  onSubmit,
  defaultBu,
}: {
  onClose: () => void;
  onSubmit: (payload: {
    bu_code: BU;
    name: string;
    company_name?: string;
    worker_type?: 'freelancer' | 'company' | 'contractor';
    phone?: string;
    email?: string;
    specialties?: string[];
    notes?: string;
    is_active?: boolean;
  }) => Promise<void>;
  defaultBu?: BU;
}) {
  const [form, setForm] = useState({
    bu_code: defaultBu || 'GRIGO',
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
    <ModalShell title="외주 인력 추가" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="소속사업부"
          value={form.bu_code}
          onChange={(val) => setForm((prev) => ({ ...prev, bu_code: val as BU }))}
          options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({
            value: k,
            label: BU_TITLES[k],
          }))}
        />
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
        <div className="md:col-span-2">
          <SelectField
            label="활성화 상태"
            value={form.is_active ? 'active' : 'inactive'}
            onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'active' }))}
            options={[
              { value: 'active', label: '활성' },
              { value: 'inactive', label: '비활성' },
            ]}
          />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <ModalActions
        onPrimary={async () => {
          if (!form.name.trim()) {
            setError('이름을 입력해주세요.');
            return;
          }
          setError('');
          await onSubmit({
            bu_code: form.bu_code,
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

function EditExternalWorkerModal({
  worker,
  onClose,
  onSubmit,
}: {
  worker: any;
  onClose: () => void;
  onSubmit: (payload: {
    bu_code?: BU;
    name?: string;
    company_name?: string;
    worker_type?: 'freelancer' | 'company' | 'contractor';
    phone?: string;
    email?: string;
    specialties?: string[];
    notes?: string;
    is_active?: boolean;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    bu_code: worker.bu_code || 'GRIGO',
    name: worker.name || '',
    company_name: worker.company_name || '',
    worker_type: (worker.worker_type || 'freelancer') as 'freelancer' | 'company' | 'contractor',
    phone: worker.phone || '',
    email: worker.email || '',
    specialties: (worker.specialties || []) as string[],
    specialtyInput: '',
    notes: worker.notes || '',
    is_active: worker.is_active !== undefined ? worker.is_active : true,
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
        <SelectField
          label="소속사업부"
          value={form.bu_code}
          onChange={(val) => setForm((prev) => ({ ...prev, bu_code: val as BU }))}
          options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({
            value: k,
            label: BU_TITLES[k],
          }))}
        />
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
        <div className="md:col-span-2">
          <SelectField
            label="활성화 상태"
            value={form.is_active ? 'active' : 'inactive'}
            onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'active' }))}
            options={[
              { value: 'active', label: '활성' },
              { value: 'inactive', label: '비활성' },
            ]}
          />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <ModalActions
        onPrimary={async () => {
          if (!form.name.trim()) {
            setError('이름을 입력해주세요.');
            return;
          }
          setError('');
          await onSubmit({
            bu_code: form.bu_code,
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

function EditUserModal({
  user,
  onClose,
  onSubmit,
}: {
  user: any;
  onClose: () => void;
  onSubmit: (payload: {
    name?: string;
    email?: string;
    role?: string;
    bu_code?: string;
    position?: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'member',
    bu_code: user.bu_code || '',
    position: user.position || '',
  });
  const [error, setError] = useState<string>('');

  return (
    <ModalShell title="회원 정보 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="이름"
          placeholder="이름을 입력하세요"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="이메일"
          type="email"
          placeholder="이메일을 입력하세요"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <SelectField
          label="역할"
          value={form.role}
          onChange={(val) => setForm((prev) => ({ ...prev, role: val }))}
          options={[
            { value: 'admin', label: '관리자' },
            { value: 'manager', label: '매니저' },
            { value: 'member', label: '멤버' },
            { value: 'viewer', label: '뷰어' },
            { value: 'artist', label: '아티스트' },
          ]}
        />
        <SelectField
          label="소속사업부"
          value={form.bu_code}
          onChange={(val) => setForm((prev) => ({ ...prev, bu_code: val }))}
          options={[
            { value: '', label: '선택 안함' },
            ...(Object.keys(BU_TITLES) as BU[]).map((k) => ({
              value: k,
              label: BU_TITLES[k],
            })),
          ]}
        />
        <InputField
          label="직급"
          placeholder="예: 대표, 실장, 대리"
          value={form.position}
          onChange={(v) => setForm((prev) => ({ ...prev, position: v }))}
        />
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={async () => {
          const missingFields: string[] = [];
          if (!form.name) missingFields.push('이름');

          if (missingFields.length > 0) {
            setError(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
            return;
          }

          setError('');
          await onSubmit({
            name: form.name,
            email: form.email || undefined,
            role: form.role,
            bu_code: form.bu_code || undefined,
            position: form.position || undefined,
          });
        }}
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
  );
}

function CreateUserModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    email: string;
    password: string;
    role?: string;
    bu_code?: string;
    position?: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'member',
    bu_code: '',
    position: '',
  });
  const [error, setError] = useState<string>('');

  return (
    <ModalShell title="회원 생성" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InputField
          label="이름"
          placeholder="이름을 입력하세요"
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
        />
        <InputField
          label="이메일"
          type="email"
          placeholder="이메일을 입력하세요"
          value={form.email}
          onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
        />
        <InputField
          label="비밀번호"
          type="password"
          placeholder="비밀번호를 입력하세요 (최소 6자)"
          value={form.password}
          onChange={(v) => setForm((prev) => ({ ...prev, password: v }))}
        />
        <InputField
          label="비밀번호 확인"
          type="password"
          placeholder="비밀번호를 다시 입력하세요"
          value={form.confirmPassword}
          onChange={(v) => setForm((prev) => ({ ...prev, confirmPassword: v }))}
        />
        <SelectField
          label="역할"
          value={form.role}
          onChange={(val) => setForm((prev) => ({ ...prev, role: val }))}
          options={[
            { value: 'admin', label: '관리자' },
            { value: 'manager', label: '매니저' },
            { value: 'member', label: '멤버' },
            { value: 'viewer', label: '뷰어' },
            { value: 'artist', label: '아티스트' },
          ]}
        />
        <SelectField
          label="소속사업부"
          value={form.bu_code}
          onChange={(val) => setForm((prev) => ({ ...prev, bu_code: val }))}
          options={[
            { value: '', label: '선택 안함' },
            ...(Object.keys(BU_TITLES) as BU[]).map((k) => ({
              value: k,
              label: BU_TITLES[k],
            })),
          ]}
        />
        <InputField
          label="직급"
          placeholder="예: 대표, 실장, 대리"
          value={form.position}
          onChange={(v) => setForm((prev) => ({ ...prev, position: v }))}
        />
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={async () => {
          const missingFields: string[] = [];
          if (!form.name) missingFields.push('이름');
          if (!form.email) missingFields.push('이메일');
          if (!form.password) missingFields.push('비밀번호');
          if (!form.confirmPassword) missingFields.push('비밀번호 확인');

          if (missingFields.length > 0) {
            setError(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
            return;
          }

          if (form.password !== form.confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
          }

          if (form.password.length < 6) {
            setError('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
          }

          setError('');
          try {
            await onSubmit({
              name: form.name,
              email: form.email,
              password: form.password,
              role: form.role,
              bu_code: form.bu_code || undefined,
              position: form.position || undefined,
            });
          } catch (err: any) {
            setError(err.message || '회원 생성 중 오류가 발생했습니다.');
          }
        }}
        onClose={onClose}
        primaryLabel="생성"
      />
    </ModalShell>
  );
}
