'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format, isWithinInterval, parseISO, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import { cn, buToSlug } from '@/lib/utils';
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

type BU = 'GRIGO' | 'REACT' | 'FLOW' | 'AST' | 'MODOO';
type View = 'dashboard' | 'projects' | 'settlement' | 'tasks' | 'organization' | 'reactstudio';

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

type Member = {
  name: string;
  role: string;
  team: string;
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
};

const BU_LABELS: Record<BU, string> = {
  GRIGO: 'GRIGO',
  REACT: 'REACT STUDIO',
  FLOW: 'FLOWMAKER',
  AST: 'AST',
  MODOO: 'MODOO',
};

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


const formatCurrency = (value: number) =>
  `₩ ${value.toLocaleString('ko-KR')}`;

const isDateInRange = (date: string, start?: string, end?: string) => {
  if (!start || !end) return true;
  const target = parseISO(date);
  return isWithinInterval(target, { start: parseISO(start), end: parseISO(end) });
};

export default function HomePage() {
  const router = useRouter();
  const [view, setView] = useState<View>('dashboard');
  const [bu, setBu] = useState<BU>('GRIGO');

  // BU 변경 핸들러 - 모든 BU 버튼은 동일하게 BU만 변경하고 뷰는 유지
  const handleBuChange = (newBu: BU) => {
    setBu(newBu);
    // reactstudio 뷰에서 다른 BU로 변경 시 dashboard로 전환
    if (view === 'reactstudio' && newBu !== 'REACT') {
      setView('dashboard');
    }
  };
  const [periodType, setPeriodType] = useState<'all' | 'year' | 'quarter' | 'month' | 'custom'>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [selectedQuarterYear, setSelectedQuarterYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [customRange, setCustomRange] = useState<{ start?: string; end?: string }>({});
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // API 데이터 로딩
  const { data: projectsData = [], isLoading: projectsLoading } = useProjects();
  const { data: tasksData = [] } = useTasks(); // bu 필터 제거 - 모든 할일 가져오기
  const { data: orgData = [] } = useOrgMembers();
  const { data: externalWorkersData = [] } = useExternalWorkers();
  const { data: usersData } = useUsers();
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
  }>({
    type: 'revenue',
    cat: '',
    name: '',
    amount: '',
    date: '',
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

  const modalProject = useMemo(
    () => projects.find((p) => p.id === modalProjectId) ?? null,
    [modalProjectId, projects],
  );

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

  // 연도 옵션 생성 (2021년부터 현재 연도까지)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 2021 + 1 }, (_, i) => 2021 + i).reverse();
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

    try {
      const dbData = frontendFinancialToDb({
        projectId: modalProjectId,
        bu: project.bu,
        type: formState.type, // 'revenue' 또는 'expense'
        category: formState.cat, // 실제 카테고리명
        name: formState.name,
        amount: Number(formState.amount),
        date: formState.date || new Date().toISOString().split('T')[0], // 미정이면 오늘 날짜로 설정
        status: 'planned',
      });
      await createFinancialMutation.mutateAsync(dbData);
      setFormState((prev) => ({ ...prev, cat: '', name: '', amount: '', date: '' }));
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
    id: string;
    name: string;
    bu: BU;
    cat: string;
    startDate: string;
    endDate: string;
    status?: string;
  }) => {
    if (!payload.name || !payload.cat) return;
    try {
      const dbData = frontendProjectToDb({
        bu: payload.bu,
        name: payload.name,
        cat: payload.cat,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: payload.status,
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
  }): Promise<string | null> => {
    const missingFields: string[] = [];
    if (!payload.projectId) missingFields.push('프로젝트');
    if (!payload.cat) missingFields.push('구분');
    if (!payload.name) missingFields.push('항목명');
    if (!payload.amount) missingFields.push('금액');
    
    if (missingFields.length > 0) {
      return `다음 항목을 입력해주세요: ${missingFields.join(', ')}`;
    }
    
    try {
      const dbData = frontendFinancialToDb({
        projectId: payload.projectId,
        bu: payload.bu,
        type: payload.type,
        category: payload.cat,
        name: payload.name,
        amount: Number(payload.amount),
        date: payload.date,
        status: payload.status,
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
  }) => {
    if (!payload.cat || !payload.name || !payload.amount) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const dbData = {
        kind: payload.type,
        category: payload.cat,
        name: payload.name,
        amount: Number(payload.amount),
        occurred_at: payload.date || today,
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 mx-auto" />
          <p className="text-sm text-slate-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  // ReactStudio 뷰일 때는 별도 레이아웃 사용
  if (view === 'reactstudio' && bu === 'REACT') {
    return <ReactStudioDashboard bu={bu} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden h-screen w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-white lg:flex">
        <div className="p-8">
          <button
            onClick={() => setView('dashboard')}
            className="text-left"
          >
            <p className="text-xl font-bold tracking-tighter text-blue-300">GRIGO ERP</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
              Management System
            </p>
          </button>
        </div>
        <nav className="flex-1 space-y-2 px-4">
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
          <SidebarButton
            label="조직 현황"
            icon={<Users className="h-4 w-4" />}
            active={view === 'organization'}
            onClick={() => setView('organization')}
          />
        </nav>
        <div className="mt-auto space-y-4 p-6">
          <div className="border-t border-slate-700"></div>
          <div className="space-y-2">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              사업부별 대시보드
            </p>
            {(Object.keys(BU_TITLES) as BU[]).map((buKey) => (
              <Link
                key={buKey}
                href={buKey === 'AST' ? '/astcompany' : `/${buToSlug(buKey)}`}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                  'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <span className="w-5 text-center">
                  <FolderKanban className="h-4 w-4" />
                </span>
                <span>{BU_TITLES[buKey]}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="p-6 pt-0">
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
            <h2 className="text-lg font-bold text-slate-800">
              {view === 'dashboard'
                ? '대시보드'
                : view === 'projects'
                  ? '프로젝트 관리'
                  : view === 'settlement'
                    ? '정산 관리'
                    : view === 'tasks'
                      ? '할일 관리'
                      : '조직 현황'}
            </h2>
            <div className="mt-2 flex flex-col gap-3">
              {/* 토글 버튼 */}
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

              {/* 조건부 선택 UI */}
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
                System Monitoring Active
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
            <DashboardView
              totals={totals}
              buCards={buCards}
              share={revenueShare}
              tasks={tasks}
              projects={projects}
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
          tasks={tasks.filter((t) => t.projectId === modalProject.id)}
        />
      )}
      {isProjectModalOpen && (
        <CreateProjectModal
          onClose={() => setProjectModalOpen(false)}
          onSubmit={handleCreateProject}
          defaultBu={bu}
        />
      )}
      {isTaskModalOpen && (
        <CreateTaskModal
          onClose={() => {
            setTaskModalOpen(false);
            setTaskModalProjectId(undefined);
          }}
          onSubmit={handleCreateTask}
          defaultBu={bu}
          projects={projects}
          defaultProjectId={taskModalProjectId ?? modalProjectId ?? currentProjects[0]?.id}
          orgData={orgData}
          usersData={usersData}
        />
      )}
      {isFinanceModalOpen && (
        <CreateFinanceModal
          mode={isFinanceModalOpen}
          onClose={() => setFinanceModalOpen(null)}
          onSubmit={handleCreateFinance}
          projects={projects}
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
        <EditProjectModal
          project={isEditProjectModalOpen}
          onClose={() => setEditProjectModalOpen(null)}
          onSubmit={handleUpdateProject}
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
          defaultBu={bu}
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
  buCards,
  share,
  tasks,
  projects,
}: {
  totals: { totalRev: number; totalExp: number; totalProfit: number };
  buCards: { bu: BU; projects: number; revenue: number; expense: number; profit: number }[];
  share: { bu: BU; amount: number; ratio: number }[];
  tasks: TaskItem[];
  projects: Project[];
}) {
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
            <h3 className="font-bold text-slate-800">사업부별 성과 요약</h3>
          </div>
          <div className="space-y-4">
            {buCards.map((item) => (
              <div
                key={item.bu}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-5 transition hover:border-blue-200"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-tight text-slate-400">
                    {BU_LABELS[item.bu]}
                  </p>
                  <p className="text-sm font-black text-slate-800">{BU_TITLES[item.bu]}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {item.projects} Active Projects
                  </p>
          </div>
                <div className="text-right">
                  <p className="text-xs font-black text-blue-600">{formatCurrency(item.revenue)}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-red-500">- {formatCurrency(item.expense)}</p>
                  <p className="mt-1 text-[11px] font-black text-emerald-600">Net: {formatCurrency(item.profit)}</p>
        </div>
      </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
          <div className="mb-4 sm:mb-6 flex items-center gap-2">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
            <h3 className="text-base sm:text-lg font-bold text-slate-800">최근 업무 현황</h3>
          </div>
          <div className="space-y-3">
            {tasks.slice(0, 4).map((task) => (
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
                      [{BU_TITLES[task.bu]}] {task.title}
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
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieLikeIcon className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-slate-800">사업부별 매출 비율</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">필터 적용 기준</span>
        </div>
        <div className="space-y-3">
          {share.map((item) => (
            <div key={item.bu}>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>{BU_TITLES[item.bu]}</span>
                <span className="text-slate-500">
                  {item.ratio}% • {formatCurrency(item.amount)}
                </span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  style={{ width: `${item.ratio}%` }}
                />
              </div>
            </div>
          ))}
          {share.every((s) => s.amount === 0) && (
            <p className="text-center text-xs text-slate-400">매출 데이터가 없습니다.</p>
          )}
        </div>
      </div>
    </section>
  );
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
    <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
      <p className="text-[10px] sm:text-xs font-bold uppercase text-slate-400">{title}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className={cn('text-xl sm:text-2xl md:text-3xl font-black', accent)}>{formatCurrency(value)}</p>
        <span className="rounded-full bg-slate-100 p-2 sm:p-3 text-slate-500 flex-shrink-0">{icon}</span>
      </div>
    </div>
  );
}

function ProjectsView({
  bu,
  onBuChange,
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
  onBuChange: (bu: BU) => void;
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

  return (
    <section className="space-y-6">
      <BuTabs bu={bu} onChange={onBuChange} prefix="BU" />

      <div className="space-y-3">
        {projects.length === 0 ? (
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="px-4 sm:px-6 py-8 sm:py-12 text-center">
              <p className="text-xs sm:text-sm font-semibold text-slate-400">
                현재 진행중인 프로젝트가 없습니다.
              </p>
            </div>
          </div>
        ) : (
          projects.map((p) => {
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
                    <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(p.id);
                    }}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                    title="프로젝트 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>
              </div>

              {opened && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-3 sm:px-6 py-4 sm:py-5">
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
                    {/* Tasks column */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-600">
                          Project Tasks
                        </h4>
                        <button
                          onClick={() => onOpenTaskModal(p.id)}
                          className="rounded-lg bg-emerald-500 px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-semibold text-white hover:bg-emerald-600 whitespace-nowrap"
                        >
                          할일 추가
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {projectTasks.length === 0 && (
                          <p className="text-[10px] sm:text-[11px] text-slate-400">
                            등록된 할 일이 없습니다.
                          </p>
                        )}
                        {projectTasks.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => onEditTask(t)}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-2 sm:px-3 py-2 text-left transition hover:bg-slate-50"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] sm:text-xs font-semibold text-slate-800 truncate">
                                {t.title}
                              </p>
                              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">
                                {t.assignee} • {t.dueDate}
                              </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] sm:text-[9px] font-semibold text-slate-600 whitespace-nowrap flex-shrink-0 ml-2">
                              {t.status === 'todo'
                                ? 'TODO'
                                : t.status === 'in-progress'
                                  ? 'IN PROGRESS'
                                  : 'DONE'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Revenue column */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-blue-600">
                          매출 내역
                        </h4>
              <button
                          onClick={() => onOpenModal(p.id)}
                          className="rounded-lg border border-blue-200 px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-semibold text-blue-600 hover:bg-blue-600 hover:text-white whitespace-nowrap"
              >
                          매출/지출 관리
              </button>
            </div>
                      <div className="space-y-1.5">
                        {projectRevenues.length === 0 && (
                          <p className="text-[10px] sm:text-[11px] text-slate-400">
                            등록된 매출이 없습니다.
                          </p>
                        )}
                        {projectRevenues.map((r, idx) => (
                          <FinanceRow
                            key={`${r.projectId}-rev-${idx}`}
                            entry={r}
                            tone="blue"
                            onClick={() => onEditFinance(r)}
                          />
                        ))}
          </div>
                    </div>

                    {/* Expense column */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-red-600">
                        지출 내역
                      </h4>
                      <div className="space-y-1.5">
                        {projectExpenses.length === 0 && (
                          <p className="text-[10px] sm:text-[11px] text-slate-400">
                            등록된 지출이 없습니다.
                          </p>
                        )}
                        {projectExpenses.map((e, idx) => (
                          <FinanceRow
                            key={`${e.projectId}-exp-${idx}`}
                            entry={e}
                            tone="red"
                            onClick={() => onEditFinance(e)}
                          />
                        ))}
                      </div>
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
  onBuChange,
  tasks,
  projects,
  onStatusChange,
  onEditTask,
}: {
  bu: BU;
  onBuChange: (bu: BU) => void;
  tasks: TaskItem[];
  projects: Project[];
  onStatusChange: (id: string, status: TaskItem['status']) => void;
  onEditTask: (task: TaskItem) => void;
}) {
  // 현재 선택된 bu에 해당하는 프로젝트만 필터링
  const buProjects = projects.filter((p) => p.bu === bu);
  const buProjectIds = buProjects.map((p) => p.id);
  const rows = tasks.filter((t) => buProjectIds.includes(t.projectId));

  const findProject = (id: string) => projects.find((p) => p.id === id)?.name ?? '-';

  return (
    <section className="space-y-6">
      <BuTabs bu={bu} onChange={onBuChange} prefix="TASK" />

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-slate-800">{BU_TITLES[bu]} 할일 관리</h3>
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 whitespace-nowrap">총 {rows.length}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] sm:text-[11px]">
            <thead className="bg-slate-50 text-slate-400">
              <tr>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">프로젝트</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">할일</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">담당자</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">마감일</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className="cursor-pointer transition hover:bg-slate-50"
                >
                  <td className="px-3 sm:px-6 py-3 font-semibold text-slate-600 truncate max-w-[120px] sm:max-w-none">
                    {findProject(task.projectId)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 text-slate-800 truncate max-w-[150px] sm:max-w-none">{task.title}</td>
                  <td className="px-3 sm:px-6 py-3 text-slate-700 whitespace-nowrap">{task.assignee}</td>
                  <td className="px-3 sm:px-6 py-3 text-slate-500 whitespace-nowrap">{task.dueDate}</td>
                  <td className="px-3 sm:px-6 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onChange={(e) => onStatusChange(task.id, e.target.value as TaskItem['status'])}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] sm:text-[11px] outline-none w-full"
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
                  <td colSpan={5} className="px-6 py-6 text-center text-xs text-slate-400">
                    현재 선택한 사업부에 등록된 할 일이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
    </div>
    </section>
  );
}

function SettlementView({
  bu,
  onBuChange,
  rows,
  projects,
  onEditFinance,
}: {
  bu: BU;
  onBuChange: (bu: BU) => void;
  rows: { revRows: FinancialEntry[]; expRows: FinancialEntry[] };
  projects: Project[];
  onEditFinance: (entry: FinancialEntry) => void;
}) {
  const findProject = (id: string) => projects.find((p) => p.id === id)?.name ?? '-';

  // 합계 계산
  const totalRevenue = useMemo(() => {
    return rows.revRows.reduce((sum, r) => sum + r.amount, 0);
  }, [rows.revRows]);

  const totalExpense = useMemo(() => {
    return rows.expRows.reduce((sum, e) => sum + e.amount, 0);
  }, [rows.expRows]);

  const totalProfit = useMemo(() => {
    return totalRevenue - totalExpense;
  }, [totalRevenue, totalExpense]);

  return (
    <section className="space-y-6">
      <BuTabs bu={bu} onChange={onBuChange} prefix="SET" />

      {/* 합계 카드 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
          accent="text-red-600"
        />
        <StatCard
          title="순익"
          value={totalProfit}
          icon={<ChartLine className="h-5 w-5 text-emerald-500" />}
          accent="text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-left text-[10px] sm:text-[11px]">
            <thead className="border-b border-slate-100 bg-blue-50/40 text-blue-700">
              <tr>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">프로젝트</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">구분</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight text-blue-600 whitespace-nowrap">금액</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">결제일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100" id="revenue-list-body">
              {rows.revRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 sm:px-6 py-6 text-center text-[10px] sm:text-xs text-slate-400">
                    등록된 매출이 없습니다.
                  </td>
                </tr>
              ) : (
                <>
                  {rows.revRows.map((r, idx) => (
                    <tr
                      key={`${r.projectId}-${idx}`}
                      onClick={() => onEditFinance(r)}
                      className="cursor-pointer transition hover:bg-blue-50/30"
                    >
                      <td className="px-3 sm:px-6 py-4 font-bold text-slate-500 truncate max-w-[100px] sm:max-w-none">{findProject(r.projectId)}</td>
                      <td className="px-3 sm:px-6 py-4 font-medium text-slate-700 truncate max-w-[80px] sm:max-w-none">{r.category}</td>
                      <td className="px-3 sm:px-6 py-4 font-black text-blue-600 italic whitespace-nowrap">{formatCurrency(r.amount)}</td>
                      <td className="px-3 sm:px-6 py-4 font-medium text-slate-400 whitespace-nowrap">{r.date}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50/20 border-t-2 border-blue-200">
                    <td colSpan={2} className="px-3 sm:px-6 py-4 font-bold text-slate-700">합계</td>
                    <td className="px-3 sm:px-6 py-4 font-black text-blue-600 italic whitespace-nowrap">{formatCurrency(totalRevenue)}</td>
                    <td className="px-3 sm:px-6 py-4"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-left text-[10px] sm:text-[11px]">
            <thead className="border-b border-slate-100 bg-red-50/40 text-red-700">
              <tr>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">프로젝트</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">구분</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight text-red-500 whitespace-nowrap">금액</th>
                <th className="px-3 sm:px-6 py-3 font-bold uppercase tracking-tight whitespace-nowrap">결제일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100" id="expense-list-body">
              {rows.expRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 sm:px-6 py-6 text-center text-[10px] sm:text-xs text-slate-400">
                    등록된 지출이 없습니다.
                  </td>
                </tr>
              ) : (
                <>
                  {rows.expRows.map((e, idx) => (
                    <tr
                      key={`${e.projectId}-${idx}`}
                      onClick={() => onEditFinance(e)}
                      className="cursor-pointer transition hover:bg-red-50/30"
                    >
                      <td className="px-3 sm:px-6 py-4 font-bold text-slate-500 truncate max-w-[100px] sm:max-w-none">{findProject(e.projectId)}</td>
                      <td className="px-3 sm:px-6 py-4 font-medium text-slate-700 truncate max-w-[80px] sm:max-w-none">{e.category}</td>
                      <td className="px-3 sm:px-6 py-4 font-black text-red-500 italic whitespace-nowrap">{formatCurrency(e.amount)}</td>
                      <td className="px-3 sm:px-6 py-4 font-medium text-slate-400 whitespace-nowrap">{e.date}</td>
                    </tr>
                  ))}
                  <tr className="bg-red-50/20 border-t-2 border-red-200">
                    <td colSpan={2} className="px-3 sm:px-6 py-4 font-bold text-slate-700">합계</td>
                    <td className="px-3 sm:px-6 py-4 font-black text-red-500 italic whitespace-nowrap">{formatCurrency(totalExpense)}</td>
                    <td className="px-3 sm:px-6 py-4"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function OrganizationView({
  bu,
  orgData,
  externalWorkersData,
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
  bu: BU;
  orgData: any[];
  externalWorkersData: any[];
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

  return (
    <section className="space-y-6">
      {/* 탭 메뉴 */}
      <div className="flex w-fit overflow-x-auto rounded-2xl bg-slate-200/60 p-1.5">
        <button
          onClick={() => onTabChange('org')}
          className={cn(
            'px-6 py-2.5 text-sm font-semibold transition',
            orgViewTab === 'org'
              ? 'tab-active rounded-xl bg-white text-blue-600 shadow'
              : 'text-slate-600 hover:text-slate-900',
          )}
        >
          내부 직원
        </button>
        <button
          onClick={() => onTabChange('external')}
          className={cn(
            'px-6 py-2.5 text-sm font-semibold transition',
            orgViewTab === 'external'
              ? 'tab-active rounded-xl bg-white text-blue-600 shadow'
              : 'text-slate-600 hover:text-slate-900',
          )}
        >
          외주 인력
        </button>
        <button
          onClick={() => onTabChange('users')}
          className={cn(
            'px-6 py-2.5 text-sm font-semibold transition',
            orgViewTab === 'users'
              ? 'tab-active rounded-xl bg-white text-blue-600 shadow'
              : 'text-slate-600 hover:text-slate-900',
          )}
        >
          회원 관리
        </button>
      </div>

      {orgViewTab === 'org' && (
        <div className="space-y-6">
      {orgData.map((unit) => {
        const members = (unit.members || []).filter((m: any) => m.is_active !== false);

        return (
          <div
            key={unit.id}
            className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {unit.name[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{unit.name}</h3>
                  <p className="text-[11px] text-slate-400">조직도</p>
                </div>
              </div>
              <button
                onClick={() => onAddMember(unit.id)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                멤버 추가
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">이름</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">소속사업부</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">직급</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">연락처</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">이메일</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">활성화</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-400">
                        등록된 멤버가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    members.map((m: any) => (
                      <tr key={m.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {m.is_leader && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">
                                리더
                              </span>
                            )}
                            <span className="font-semibold text-slate-800">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {m.bu_code ? BU_TITLES[m.bu_code] || m.bu_code : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{m.title}</td>
                        <td className="px-4 py-3 text-slate-500">{m.phone || '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{m.email || '-'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                              m.is_active !== false
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-500',
                            )}
                          >
                            {m.is_active !== false ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onEditMember(m)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-blue-600"
                              title="수정"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteMember(m.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                              title="삭제"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
          </div>
        </div>
        );
      })}
        </div>
      )}

      {orgViewTab === 'external' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">외주 인력 관리</h3>
                <p className="text-[11px] text-slate-400">프리랜서, 외주회사, 계약직 등 외부 인력</p>
              </div>
              <button
                onClick={onAddExternalWorker}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                외주 인력 추가
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-400">
                  <tr>
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
                <tbody className="divide-y divide-slate-100">
                  {externalWorkersData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-center text-xs text-slate-400">
                        등록된 외주 인력이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    externalWorkersData
                      .map((w: any) => (
                        <tr key={w.id} className="transition hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800">{w.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                                w.worker_type === 'freelancer'
                                  ? 'bg-purple-100 text-purple-700'
                                  : w.worker_type === 'company'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-indigo-100 text-indigo-700',
                              )}
                            >
                              {w.worker_type === 'freelancer'
                                ? '프리랜서'
                                : w.worker_type === 'company'
                                  ? '외주회사'
                                  : '계약직'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{w.company_name || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {w.bu_code ? BU_TITLES[w.bu_code] || w.bu_code : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {w.specialties && w.specialties.length > 0
                              ? w.specialties.join(', ')
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{w.phone || '-'}</td>
                          <td className="px-4 py-3 text-slate-500">{w.email || '-'}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                                w.is_active !== false
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500',
                              )}
                            >
                              {w.is_active !== false ? '활성' : '비활성'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onEditExternalWorker(w)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-blue-600"
                                title="수정"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteExternalWorker(w.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                                title="삭제"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
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
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">회원 관리</h3>
              <p className="text-[11px] text-slate-400">전체 회원 리스트</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400">총 {users.length}명</span>
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
              <thead className="bg-slate-50 text-slate-400">
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
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-6 text-center text-xs text-slate-400">
                      등록된 회원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  users.map((u: any) => (
                    <tr key={u.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{u.name}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.email || '-'}</td>
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
                                  : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          {u.role === 'admin'
                            ? '관리자'
                            : u.role === 'manager'
                              ? '매니저'
                              : u.role === 'member'
                                ? '멤버'
                                : '뷰어'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {u.bu_code ? BU_TITLES[u.bu_code] || u.bu_code : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.position || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onEditUser(u)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-blue-600"
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

function BuTabs({ bu, onChange, prefix }: { bu: BU; onChange: (bu: BU) => void; prefix: string }) {
  return (
    <div className="flex w-fit overflow-x-auto rounded-2xl bg-slate-200/60 p-1 sm:p-1.5">
      {(Object.keys(BU_TITLES) as BU[]).map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            'px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap',
            bu === key ? 'tab-active rounded-xl bg-white text-blue-600 shadow' : 'text-slate-600 hover:text-slate-900',
          )}
          id={`tab-${prefix}-${key}`}
        >
          {BU_TITLES[key]}
        </button>
      ))}
    </div>
  );
}

function QuickAction({ title, icon, onClick }: { title: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-blue-200 hover:shadow"
    >
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-[11px] text-slate-400">모달을 열어 즉시 등록</p>
      </div>
      <span className="rounded-full bg-blue-50 p-3 text-blue-600">{icon}</span>
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
  tasks,
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
  };
  formError?: string;
  onFormChange: React.Dispatch<
    React.SetStateAction<{
      type: 'revenue' | 'expense';
      cat: string;
      name: string;
      amount: string;
      date: string;
    }>
  >;
  onAddEntry: () => void;
  onDateChange: (key: 'startDate' | 'endDate', value: string) => void;
  onEditFinance: (entry: FinancialEntry) => void;
  onEditTask: (task: TaskItem) => void;
  tasks: TaskItem[];
}) {
  return (
    <div
      className="modal-container active fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 p-8">
          <div>
            <span className="mb-2 inline-block rounded-md bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
              {BU_TITLES[project.bu]}
            </span>
            <h3 className="text-2xl font-black text-slate-800">{project.name}</h3>
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
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto p-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricBox title="선택 기간 매출" value={entries.periodRevenue} tone="blue" />
            <MetricBox title="선택 기간 지출" value={entries.periodExpense} tone="red" />
            <MetricBox title="선택 기간 순익" value={entries.periodProfit} tone="emerald" />
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-6">
            <h4 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600">
              <Plus className="h-4 w-4 text-blue-500" />
              내역 신규 등록
            </h4>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <select
                value={formState.type}
                onChange={(e) =>
                  onFormChange((prev) => ({ ...prev, type: e.target.value as 'revenue' | 'expense' }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none"
              >
                <option value="revenue">매출 (+)</option>
                <option value="expense">지출 (-)</option>
              </select>
              <input
                value={formState.cat}
                onChange={(e) => onFormChange((prev) => ({ ...prev, cat: e.target.value }))}
                placeholder="구분"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none"
              />
              <input
                value={formState.name}
                onChange={(e) => onFormChange((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="항목명"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none"
              />
              <input
                value={formState.amount}
                type="number"
                onChange={(e) => onFormChange((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="금액"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none"
              />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">결제일</span>
                  <button
                    type="button"
                    onClick={() => onFormChange((prev) => ({ ...prev, date: '' }))}
                    className={cn(
                      'text-[9px] font-semibold px-2 py-0.5 rounded transition',
                      formState.date === '' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    미정
                  </button>
                </div>
                <input
                  value={formState.date}
                  type="date"
                  onChange={(e) => onFormChange((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none"
                />
              </div>
            </div>
            {formError && (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-xs font-semibold text-red-600">{formError}</p>
              </div>
            )}
            <button
              onClick={onAddEntry}
              className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-xs font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              데이터 입력하기
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h5 className="mb-4 border-l-4 border-blue-600 pl-3 text-[11px] font-black uppercase tracking-widest text-blue-600">
                Project Revenue
              </h5>
              <div className="space-y-3">
                {entries.revenues.map((r, idx) => (
                  <EntryCard
                    key={`${r.projectId}-rev-${idx}`}
                    entry={r}
                    highlight={isDateInRange(r.date, period.start, period.end)}
                    tone="blue"
                    onClick={() => onEditFinance(r)}
                  />
                ))}
              </div>
              <h5 className="mt-8 mb-4 border-l-4 border-red-500 pl-3 text-[11px] font-black uppercase tracking-widest text-red-500">
                Project Expense
              </h5>
              <div className="space-y-3">
                {entries.expenses.map((e, idx) => (
                  <EntryCard
                    key={`${e.projectId}-exp-${idx}`}
                    entry={e}
                    highlight={isDateInRange(e.date, period.start, period.end)}
                    tone="red"
                    onClick={() => onEditFinance(e)}
                  />
                ))}
              </div>
            </div>
            <div>
              <h5 className="mb-4 border-l-4 border-emerald-500 pl-3 text-[11px] font-black uppercase tracking-widest text-emerald-500">
                Project Tasks
              </h5>
              <div className="space-y-2">
                {tasks.length === 0 && (
                  <p className="text-xs text-slate-400">등록된 할 일이 없습니다.</p>
                )}
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onEditTask(task)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:bg-slate-100"
                  >
                    <p className="text-xs font-semibold text-slate-800">{task.title}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {task.assignee} • {task.dueDate}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-b-[2rem] bg-slate-900 p-8 text-white">
          <div className="flex gap-10">
            <div>
              <p className="mb-1 text-[9px] uppercase font-bold text-slate-500">Total Rev</p>
              <p className="text-xl font-black text-blue-300">{formatCurrency(entries.totalRevenue)}</p>
            </div>
            <div>
              <p className="mb-1 text-[9px] uppercase font-bold text-slate-500">Total Exp</p>
              <p className="text-xl font-black text-red-300">{formatCurrency(entries.totalExpense)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="mb-1 text-[9px] uppercase font-bold text-slate-500">Total Net Profit</p>
            <p className="text-2xl font-black text-emerald-300">
              {formatCurrency(entries.totalProfit)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateProjectModal({
  onClose,
  onSubmit,
  defaultBu,
}: {
  onClose: () => void;
  onSubmit: (payload: { name: string; bu: BU; cat: string; startDate: string; endDate: string }) => void;
  defaultBu: BU;
}) {
  const [form, setForm] = useState({
    name: '',
    bu: defaultBu,
    cat: '',
    startDate: '',
    endDate: '',
  });

  return (
    <ModalShell title="프로젝트 등록" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="사업부"
          value={form.bu}
          onChange={(val) => setForm((prev) => ({ ...prev, bu: val as BU }))}
          options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({ value: k, label: BU_TITLES[k] }))}
        />
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
      </div>
      <ModalActions
        onPrimary={() => onSubmit(form)}
        onClose={onClose}
        primaryLabel="등록"
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
  }) => Promise<string | null>;
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

function PieLikeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M12 3v9l7.8 4.5A9 9 0 1 1 12 3Z" />
      <path d="M12 12 21 9a9 9 0 0 0-9-6" />
    </svg>
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
        <p className="text-[13px] font-bold text-slate-800">{entry.name}</p>
        <p className="mt-1 text-[10px] text-slate-400">{entry.date}</p>
      </div>
      <span className={cn('text-sm font-black', palette.text)}>{formatCurrency(entry.amount)}</span>
    </button>
  );
}

function FinanceRow({
  entry,
  tone,
  onClick,
}: {
  entry: FinancialEntry;
  tone: 'blue' | 'red';
  onClick?: () => void;
}) {
  const isBlue = tone === 'blue';
  const statusLabel =
    entry.status === 'planned' ? '지급예정' : entry.status === 'paid' ? '지급완료' : '취소';
  const statusColor =
    entry.status === 'planned'
      ? 'bg-amber-50 text-amber-700'
      : entry.status === 'paid'
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-slate-100 text-slate-500';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-xl border px-2 sm:px-3 py-2 text-left transition hover:bg-slate-50',
        isBlue ? 'border-blue-100 bg-white' : 'border-red-100 bg-white',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-[11px] font-semibold text-slate-800 truncate">{entry.name}</p>
        <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">
          {entry.date} • {entry.category}
        </p>
        <span
          className={cn(
            'mt-1 inline-flex rounded-full px-2 py-0.5 text-[8px] sm:text-[9px] font-semibold whitespace-nowrap',
            statusColor,
          )}
        >
          {statusLabel}
        </span>
      </div>
      <span className={cn('text-[10px] sm:text-xs font-bold whitespace-nowrap flex-shrink-0 ml-2', isBlue ? 'text-blue-600' : 'text-red-500')}>
        {formatCurrency(entry.amount)}
      </span>
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
      <span className="text-[10px] font-bold text-slate-400">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs">
        <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
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
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
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
    bu: BU;
    cat: string;
    startDate: string;
    endDate: string;
    status?: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    bu: project.bu,
    cat: project.cat,
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
  });
  const [error, setError] = useState<string>('');

  return (
    <ModalShell title="프로젝트 수정" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SelectField
          label="사업부"
          value={form.bu}
          onChange={(val) => setForm((prev) => ({ ...prev, bu: val as BU }))}
          options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({ value: k, label: BU_TITLES[k] }))}
        />
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
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}
      <ModalActions
        onPrimary={() => {
          const missingFields: string[] = [];
          if (!form.name) missingFields.push('프로젝트명');
          if (!form.cat) missingFields.push('카테고리');
          
          if (missingFields.length > 0) {
            setError(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`);
            return;
          }
          
          setError('');
          onSubmit({ ...form, id: project.id });
        }}
        onClose={onClose}
        primaryLabel="수정"
      />
    </ModalShell>
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
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          <h3 className="mb-2 text-lg font-bold text-slate-800">{title}</h3>
          <p className="mb-6 text-sm text-slate-600">{message}</p>
          <div className="flex items-center justify-end gap-2">
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
    </div>
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
          <label className="mb-1 block text-xs font-semibold text-slate-700">전문 분야</label>
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
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
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
          <label className="mb-1 block text-xs font-semibold text-slate-700">비고</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
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
          <label className="mb-1 block text-xs font-semibold text-slate-700">전문 분야</label>
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
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
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
          <label className="mb-1 block text-xs font-semibold text-slate-700">비고</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
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
