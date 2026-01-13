'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Plus, Trash2, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Lock, Pencil, Search, Check, Circle, Clock, CheckCircle2, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkFinancePermission } from '@/features/erp/lib/financePermissions';
import type { AppUser, Project as DbProject } from '@/types/database';

type BU = 'GRIGO' | 'REACT' | 'FLOW' | 'AST' | 'MODOO' | 'HEAD';
type ModalMode = 'create' | 'view' | 'edit';
type FinancePermission = 'none' | 'view' | 'edit';

type FinanceEntry = {
  id: string;
  kind: 'revenue' | 'expense';
  category: string;
  name: string;
  amount: number;
  status: string;
  occurred_at: string;
};

type TaskStatus = 'todo' | 'in-progress' | 'done';

type TaskEntry = {
  id: string;
  title: string;
  assignee: string;
  assigneeName?: string;
  dueDate: string;
  status: TaskStatus;
};

type Participant = {
  user_id?: string;
  partner_worker_id?: number;
  partner_company_id?: number;
  role: string;
};

type Project = {
  id: string;
  bu: BU;
  name: string;
  cat: string;
  startDate: string;
  endDate: string;
  status: string;
  description?: string | null;
  pm_id?: string | null;
  partner_company_id?: number | null;
  partner_worker_id?: number | null;
  artist_id?: number | null;
  channel_id?: number | null;
  participants?: Participant[];
};

const BU_TITLES: Record<BU, string> = {
  GRIGO: '그리고 엔터',
  REACT: '리액트 스튜디오',
  FLOW: '플로우메이커',
  AST: '아스트 컴퍼니',
  MODOO: '모두굿즈',
  HEAD: '본사',
};

const STATUS_OPTIONS = [
  { value: '준비중', label: '준비중' },
  { value: '기획중', label: '기획중' },
  { value: '진행중', label: '진행중' },
  { value: '운영중', label: '운영중' },
  { value: '완료', label: '완료' },
];

interface UnifiedProjectModalProps {
  project?: Project;
  initialMode?: 'view' | 'edit';
  onClose: () => void;
  onSubmit: (payload: {
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
    participants?: Participant[];
  }) => void;
  onDelete?: (id: string) => void;
  defaultBu: BU;
  usersData?: { users: any[]; currentUser: any };
  partnerCompaniesData?: any[];
  partnerWorkersData?: any[];
  artistsData?: any[];
  channelsData?: any[];
  financeData?: FinanceEntry[];
  tasksData?: TaskEntry[];
  onAddRevenue?: () => void;
  onAddExpense?: () => void;
  onViewFinanceDetail?: (entry: FinanceEntry) => void;
  onAddTask?: () => void;
  onViewTaskDetail?: (task: TaskEntry) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

type SearchDropdownOption = {
  value: string;
  label: string;
  subLabel?: string;
};

function SearchDropdown({
  options,
  value,
  onChange,
  placeholder = '검색...',
  emptyLabel = '선택 안함',
  disabled = false,
}: {
  options: SearchDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : emptyLabel;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        <span className={!value ? "text-slate-400" : ""}>{displayLabel}</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearch('');
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700",
                !value && "bg-blue-50 dark:bg-blue-900/30"
              )}
            >
              <span className="text-slate-500 dark:text-slate-400">{emptyLabel}</span>
              {!value && <Check className="h-4 w-4 text-blue-600" />}
            </button>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">검색 결과가 없습니다</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700",
                    value === opt.value && "bg-blue-50 dark:bg-blue-900/30"
                  )}
                >
                  <div>
                    <span className="text-slate-900 dark:text-slate-100">{opt.label}</span>
                    {opt.subLabel && (
                      <span className="ml-2 text-xs text-slate-400">{opt.subLabel}</span>
                    )}
                  </div>
                  {value === opt.value && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: typeof Circle }> = {
  'todo': { label: '진행 전', color: 'text-slate-500 bg-slate-100 dark:bg-slate-700', icon: Circle },
  'in-progress': { label: '진행중', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50', icon: Clock },
  'done': { label: '완료', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50', icon: CheckCircle2 },
};

function TasksSection({
  tasks,
  onAddTask,
  onViewTask,
  usersData,
}: {
  tasks: TaskEntry[];
  onAddTask?: () => void;
  onViewTask?: (task: TaskEntry) => void;
  usersData?: { users: any[]; currentUser: any };
}) {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [isExpanded, setIsExpanded] = useState(true);

  const filteredTasks = statusFilter === 'all' 
    ? tasks 
    : tasks.filter((t) => t.status === statusFilter);

  const taskCounts = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    'in-progress': tasks.filter((t) => t.status === 'in-progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  const getAssigneeName = (assignee: string, assigneeName?: string) => {
    if (assigneeName) return assigneeName;
    const user = usersData?.users.find((u: any) => u.id === assignee);
    return user?.name || '미지정';
  };

  const formatDueDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(d);
    dueDay.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}일 지남`, isOverdue: true };
    if (diffDays === 0) return { text: '오늘', isOverdue: false };
    if (diffDays === 1) return { text: '내일', isOverdue: false };
    return { text: `${d.getMonth() + 1}/${d.getDate()}`, isOverdue: false };
  };

  return (
    <section className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider hover:text-slate-800 dark:hover:text-slate-100"
        >
          <ListTodo className="h-4 w-4" />
          할 일
          <span className="text-xs font-normal text-slate-400">({tasks.length})</span>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <Plus className="h-3.5 w-3.5" />
            할 일 추가
          </button>
        )}
      </div>

      {isExpanded && (
        <>
          {/* 상태 필터 탭 */}
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
            {(['all', 'todo', 'in-progress', 'done'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition",
                  statusFilter === status
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {status === 'all' ? (
                  <>전체</>
                ) : (
                  <>
                    {(() => {
                      const Icon = TASK_STATUS_CONFIG[status].icon;
                      return <Icon className="h-3 w-3" />;
                    })()}
                    {TASK_STATUS_CONFIG[status].label}
                  </>
                )}
                <span className={cn(
                  "text-[10px] rounded-full px-1.5",
                  statusFilter === status ? "bg-slate-100 dark:bg-slate-500" : "bg-slate-200/50 dark:bg-slate-600/50"
                )}>
                  {taskCounts[status]}
                </span>
              </button>
            ))}
          </div>

          {/* 할일 목록 */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredTasks.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                {statusFilter === 'all' ? '등록된 할 일이 없습니다.' : `${TASK_STATUS_CONFIG[statusFilter as TaskStatus].label} 상태의 할 일이 없습니다.`}
              </div>
            ) : (
              filteredTasks.map((task) => {
                const StatusIcon = TASK_STATUS_CONFIG[task.status].icon;
                const dueInfo = formatDueDate(task.dueDate);
                
                return (
                  <div
                    key={task.id}
                    onClick={() => onViewTask?.(task)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition group"
                  >
                    {/* 상태 아이콘 */}
                    <div className={cn(
                      "flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full",
                      TASK_STATUS_CONFIG[task.status].color
                    )}>
                      <StatusIcon className="h-3.5 w-3.5" />
                    </div>
                    
                    {/* 할일 내용 */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        task.status === 'done' 
                          ? "text-slate-400 dark:text-slate-500 line-through" 
                          : "text-slate-700 dark:text-slate-200"
                      )}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{getAssigneeName(task.assignee, task.assigneeName)}</span>
                        {dueInfo && (
                          <>
                            <span>·</span>
                            <span className={dueInfo.isOverdue ? "text-red-500 font-medium" : ""}>
                              {dueInfo.text}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 호버시 화살표 */}
                    <ChevronDown className="h-4 w-4 -rotate-90 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}

export function UnifiedProjectModal({
  project,
  initialMode,
  onClose,
  onSubmit,
  onDelete,
  defaultBu,
  usersData,
  partnerCompaniesData = [],
  partnerWorkersData = [],
  artistsData = [],
  channelsData = [],
  financeData = [],
  tasksData = [],
  onAddRevenue,
  onAddExpense,
  onViewFinanceDetail,
  onAddTask,
  onViewTaskDetail,
}: UnifiedProjectModalProps) {
  const [mode, setMode] = useState<ModalMode>(() => {
    if (!project) return 'create';
    return initialMode || 'view';
  });

  const isCreateMode = mode === 'create';
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isEditable = isCreateMode || isEditMode;

  const currentUser = usersData?.currentUser as AppUser | null;

  // 재무 권한 계산
  const financePermission: FinancePermission = useMemo(() => {
    if (!currentUser) return 'none';

    const projectData: DbProject | null = project ? {
      id: parseInt(project.id) || 0,
      bu_code: project.bu,
      name: project.name,
      category: project.cat,
      status: project.status as any,
      start_date: project.startDate,
      end_date: project.endDate,
      pm_id: project.pm_id,
      participants: project.participants?.map(p => ({
        user_id: p.user_id,
        partner_worker_id: p.partner_worker_id,
        partner_company_id: p.partner_company_id,
        role: p.role,
        is_pm: false,
      })),
      created_at: '',
      updated_at: '',
    } : null;

    const permission = checkFinancePermission({
      currentUser,
      entry: null,
      project: projectData,
      targetBu: project?.bu || defaultBu,
    });

    if (!permission.canRead) return 'none';
    if (permission.canCreate || permission.canUpdate) return 'edit';
    return 'view';
  }, [currentUser, project, defaultBu]);

  const canViewFinance = financePermission === 'view' || financePermission === 'edit';
  const canEditFinance = financePermission === 'edit';

  // 폼 상태
  const [form, setForm] = useState({
    name: project?.name || '',
    bu: project?.bu || defaultBu,
    cat: project?.cat || '',
    startDate: project?.startDate || '',
    endDate: project?.endDate || '',
    description: project?.description || '',
    pm_id: project?.pm_id || '',
    partner_company_id: String(project?.partner_company_id || ''),
    partner_worker_id: String(project?.partner_worker_id || ''),
    artist_id: String(project?.artist_id || ''),
    channel_id: String(project?.channel_id || ''),
    status: project?.status || '준비중',
  });

  // 참여자 상태
  type SelectedParticipant = { type: 'user' | 'partner_worker' | 'partner_company'; id: string | number; name: string };
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>(() => {
    if (!project?.participants) return [];
    return project.participants
      .map((p) => {
        if (p.user_id) {
          const user = usersData?.users.find((u: any) => u.id === p.user_id);
          return user ? { type: 'user' as const, id: user.id, name: user.name } : null;
        } else if (p.partner_worker_id) {
          const worker = partnerWorkersData?.find((w: any) => w.id === p.partner_worker_id);
          return worker ? { type: 'partner_worker' as const, id: worker.id, name: worker.name_ko || worker.name_en || '' } : null;
        } else if (p.partner_company_id) {
          const company = partnerCompaniesData?.find((c: any) => c.id === p.partner_company_id);
          return company ? { type: 'partner_company' as const, id: company.id, name: company.company_name_ko || company.company_name_en || '' } : null;
        }
        return null;
      })
      .filter((p): p is SelectedParticipant => p !== null);
  });

  const [participantSelectType, setParticipantSelectType] = useState<'user' | 'partner_worker' | 'partner_company'>('user');
  const [participantSelectId, setParticipantSelectId] = useState('');
  const [error, setError] = useState('');
  const [showFinanceDetail, setShowFinanceDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 재무 요약
  const financeSummary = financeData.reduce(
    (acc, entry) => {
      if (entry.kind === 'revenue') {
        acc.totalRevenue += entry.amount;
        acc.revenueCount += 1;
      } else {
        acc.totalExpense += entry.amount;
        acc.expenseCount += 1;
      }
      return acc;
    },
    { totalRevenue: 0, totalExpense: 0, revenueCount: 0, expenseCount: 0 }
  );

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
        setSelectedParticipants((prev) => [...prev, { type: 'partner_worker', id: worker.id, name: worker.name_ko || worker.name_en || '' }]);
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

  const handleSubmit = () => {
    if (!form.name || !form.cat) {
      setError('프로젝트명과 카테고리는 필수 항목입니다.');
      return;
    }

    setError('');
    const participants = selectedParticipants.map((p) => ({
      user_id: p.type === 'user' ? (p.id as string) : undefined,
      partner_worker_id: p.type === 'partner_worker' ? (p.id as number) : undefined,
      partner_company_id: p.type === 'partner_company' ? (p.id as number) : undefined,
      role: 'participant',
    }));

    onSubmit({
      ...(project && { id: project.id }),
      name: form.name,
      bu: form.bu,
      cat: form.cat,
      startDate: form.startDate,
      endDate: form.endDate,
      description: form.description || null,
      pm_id: form.pm_id || null,
      partner_company_id: form.partner_company_id ? Number(form.partner_company_id) : null,
      partner_worker_id: form.partner_worker_id ? Number(form.partner_worker_id) : null,
      artist_id: form.artist_id ? Number(form.artist_id) : null,
      channel_id: form.channel_id ? Number(form.channel_id) : null,
      status: form.status,
      participants,
    });
  };

  const handleDelete = () => {
    if (project && onDelete) {
      onDelete(project.id);
    }
  };

  const getModalTitle = () => {
    if (isCreateMode) return '프로젝트 등록';
    if (isEditMode) return '프로젝트 수정';
    return '프로젝트 상세';
  };

  // PM 이름 가져오기
  const getPmName = () => {
    if (!form.pm_id) return '-';
    const pm = usersData?.users.find((u: any) => u.id === form.pm_id);
    return pm?.name || '-';
  };

  // 외주업체 이름 가져오기
  const getPartnerCompanyName = () => {
    if (!form.partner_company_id) return '-';
    const company = partnerCompaniesData?.find((c: any) => c.id === Number(form.partner_company_id));
    return company?.company_name_ko || company?.company_name_en || '-';
  };

  // 외주담당자 이름 가져오기
  const getPartnerWorkerName = () => {
    if (!form.partner_worker_id) return '-';
    const worker = partnerWorkersData?.find((w: any) => w.id === Number(form.partner_worker_id));
    return worker?.name_ko || worker?.name_en || '-';
  };

  // 외주업체 선택에 따라 필터링된 외주담당자 목록
  const filteredPartnerWorkers = useMemo(() => {
    if (!partnerWorkersData) return [];
    
    if (form.partner_company_id) {
      // 선택한 업체 소속 직원만 표시
      return partnerWorkersData.filter(
        (w: any) => w.partner_company_id === Number(form.partner_company_id)
      );
    } else {
      // 업체가 선택되지 않으면 소속 없는 직원만 표시
      return partnerWorkersData.filter(
        (w: any) => !w.partner_company_id
      );
    }
  }, [partnerWorkersData, form.partner_company_id]);

  // 아티스트 이름 가져오기
  const getArtistName = () => {
    if (!form.artist_id) return '-';
    const artist = artistsData?.find((a: any) => a.id === Number(form.artist_id));
    return artist?.name_ko || artist?.name || '-';
  };

  // 채널 이름 가져오기
  const getChannelName = () => {
    if (!form.channel_id) return '-';
    const channel = channelsData?.find((c: any) => c.id === Number(form.channel_id));
    return channel?.name || '-';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '준비중': return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
      case '기획중': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
      case '진행중': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
      case '운영중': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
      case '완료': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const formatDateDisplay = (date: string) => {
    if (!date) return '미정';
    const d = new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
        <div className="w-full max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
          {/* Hero Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 px-6 py-5">
            {/* Top row: close button */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {isEditable ? (
                  <select
                    value={form.bu}
                    onChange={(e) => setForm({ ...form, bu: e.target.value as BU })}
                    className="text-xs font-semibold rounded-full px-3 py-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 border-0 outline-none cursor-pointer"
                  >
                    {Object.entries(BU_TITLES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-semibold rounded-full px-3 py-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                    {BU_TITLES[form.bu]}
                  </span>
                )}
                {isEditable ? (
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className={cn("text-xs font-semibold rounded-full px-3 py-1 border-0 outline-none cursor-pointer", getStatusColor(form.status))}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={cn("text-xs font-semibold rounded-full px-3 py-1", getStatusColor(form.status))}>
                    {form.status}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isViewMode && (
                  <button
                    onClick={() => setMode('edit')}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Pencil className="h-3 w-3" />
                    수정
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 dark:bg-slate-600/80 text-slate-500 dark:text-slate-400 transition hover:bg-white dark:hover:bg-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Project name & category */}
            <div className="space-y-2">
              {isEditable ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="프로젝트명을 입력하세요"
                    className="flex-1 text-xl font-bold bg-transparent border-b-2 border-slate-300 dark:border-slate-500 text-slate-800 dark:text-slate-100 px-1 py-1 outline-none focus:border-blue-500 placeholder:text-slate-400"
                  />
                  <span className="text-slate-400 dark:text-slate-500">·</span>
                  <input
                    type="text"
                    value={form.cat}
                    onChange={(e) => setForm({ ...form, cat: e.target.value })}
                    placeholder="카테고리"
                    className="w-32 text-sm bg-transparent border-b-2 border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-300 px-1 py-1 outline-none focus:border-blue-500 placeholder:text-slate-400"
                  />
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{form.name || '프로젝트명'}</h2>
                  <span className="text-slate-400 dark:text-slate-500">·</span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">{form.cat || '카테고리'}</span>
                </div>
              )}

              {/* Period */}
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                {isEditable ? (
                  <>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="bg-white/60 dark:bg-slate-700/60 rounded px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 outline-none focus:border-blue-400"
                    />
                    <span>~</span>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="bg-white/60 dark:bg-slate-700/60 rounded px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 outline-none focus:border-blue-400"
                    />
                  </>
                ) : (
                  <span className="text-xs">
                    📅 {formatDateDisplay(form.startDate)} ~ {formatDateDisplay(form.endDate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto space-y-5 px-6 py-5">
            {/* 설명 섹션 */}
            <section className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">설명</h4>
              {isEditable ? (
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="프로젝트 설명을 입력하세요"
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 resize-none"
                />
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-700/30 rounded-lg px-3 py-2">
                  {form.description || '설명이 없습니다.'}
                </p>
              )}
            </section>

            {/* 담당자 섹션 */}
            <section className="space-y-4">
              <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">담당자</h4>
              
              {isEditable ? (
                <div className="space-y-4">
                  {/* PM (담당자) - 한 줄 전체 */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400">PM (담당자)</label>
                    <select
                      value={form.pm_id}
                      onChange={(e) => setForm({ ...form, pm_id: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
                    >
                      <option value="">선택 안함</option>
                      {usersData?.users.map((user: any) => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 외주업체 | 외주담당자 - 한 줄에 두 개 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400">외주업체</label>
                      <SearchDropdown
                        options={partnerCompaniesData?.map((company: any) => ({
                          value: String(company.id),
                          label: company.company_name_ko || company.company_name_en || '',
                        })) || []}
                        value={form.partner_company_id}
                        onChange={(value) => {
                          setForm({ ...form, partner_company_id: value, partner_worker_id: '' });
                        }}
                        placeholder="외주업체 검색..."
                        emptyLabel="선택 안함"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400">외주담당자</label>
                      <SearchDropdown
                        options={filteredPartnerWorkers.map((worker: any) => ({
                          value: String(worker.id),
                          label: worker.name_ko || worker.name_en || '',
                          subLabel: worker.partner_company_id 
                            ? partnerCompaniesData?.find((c: any) => c.id === worker.partner_company_id)?.company_name_ko 
                            : '소속 없음',
                        }))}
                        value={form.partner_worker_id}
                        onChange={(value) => setForm({ ...form, partner_worker_id: value })}
                        placeholder="담당자 검색..."
                        emptyLabel={form.partner_company_id ? '담당자 없음' : '선택 안함'}
                      />
                    </div>
                  </div>

                  {/* 아티스트 | 채널 - 한 줄에 두 개 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400">아티스트</label>
                      <select
                        value={form.artist_id}
                        onChange={(e) => setForm({ ...form, artist_id: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
                      >
                        <option value="">선택 안함</option>
                        {artistsData?.map((artist: any) => (
                          <option key={artist.id} value={artist.id}>{artist.name_ko || artist.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400">채널</label>
                      <select
                        value={form.channel_id}
                        onChange={(e) => setForm({ ...form, channel_id: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
                      >
                        <option value="">선택 안함</option>
                        {channelsData?.map((channel: any) => (
                          <option key={channel.id} value={channel.id}>{channel.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {/* PM - 항상 표시, 없으면 - */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">PM</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{getPmName()}</span>
                  </div>
                  {/* 외주업체 - 있을 때만 표시 */}
                  {form.partner_company_id && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">외주업체</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{getPartnerCompanyName()}</span>
                    </div>
                  )}
                  {/* 외주담당자 - 있을 때만 표시 */}
                  {form.partner_worker_id && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">외주담당자</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{getPartnerWorkerName()}</span>
                    </div>
                  )}
                  {/* 아티스트 - 있을 때만 표시 */}
                  {form.artist_id && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">아티스트</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{getArtistName()}</span>
                    </div>
                  )}
                  {/* 채널 - 있을 때만 표시 */}
                  {form.channel_id && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">채널</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{getChannelName()}</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 참여자 섹션 */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">참여자</h4>
              </div>

              {/* 참여자 추가 (editable 모드에서만) */}
              {isEditable && (
                <div className="flex items-center gap-2">
                  <select
                    value={participantSelectType}
                    onChange={(e) => {
                      setParticipantSelectType(e.target.value as any);
                      setParticipantSelectId('');
                    }}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
                  >
                    <option value="user">내부직원</option>
                    <option value="partner_worker">외주담당자</option>
                    <option value="partner_company">외주업체</option>
                  </select>
                  <select
                    value={participantSelectId}
                    onChange={(e) => setParticipantSelectId(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
                  >
                    <option value="">선택하세요</option>
                    {participantSelectType === 'user' && usersData?.users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                    {participantSelectType === 'partner_worker' && partnerWorkersData?.map((w: any) => (
                      <option key={w.id} value={w.id}>{w.name_ko || w.name_en}</option>
                    ))}
                    {participantSelectType === 'partner_company' && partnerCompaniesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.company_name_ko || c.company_name_en}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddParticipant}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    추가
                  </button>
                </div>
              )}

              {/* 참여자 목록 - 칩 형태 */}
              <div className="flex flex-wrap gap-2">
                {selectedParticipants.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 py-1">등록된 참여자가 없습니다.</p>
                ) : (
                  selectedParticipants.map((p, index) => (
                    <div
                      key={`${p.type}-${p.id}`}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                        p.type === 'user' && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
                        p.type === 'partner_worker' && "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
                        p.type === 'partner_company' && "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                      )}
                    >
                      <span>{p.name}</span>
                      {isEditable && (
                        <button
                          onClick={() => handleRemoveParticipant(index)}
                          className="ml-0.5 hover:opacity-70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* 할일 섹션 (view/edit 모드에서만) */}
            {!isCreateMode && (
              <TasksSection
                tasks={tasksData}
                onAddTask={onAddTask}
                onViewTask={onViewTaskDetail}
                usersData={usersData}
              />
            )}

            {/* 재무 정보 섹션 (view/edit 모드 + 권한 있을 때만) */}
            {!isCreateMode && canViewFinance && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">재무 정보</h4>
                  {!canViewFinance && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Lock className="h-3 w-3" />
                      <span>접근 권한 없음</span>
                    </div>
                  )}
                </div>

                {/* 재무 요약 카드 - 컴팩트 */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-blue-600 dark:text-blue-400">매출</span>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">₩{formatCurrency(financeSummary.totalRevenue)}</span>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-red-600 dark:text-red-400">지출</span>
                    <span className="text-sm font-bold text-red-700 dark:text-red-300">₩{formatCurrency(financeSummary.totalExpense)}</span>
                  </div>
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">순익</span>
                    <span className={cn(
                      "text-sm font-bold",
                      financeSummary.totalRevenue - financeSummary.totalExpense >= 0 
                        ? "text-emerald-700 dark:text-emerald-300" 
                        : "text-red-700 dark:text-red-300"
                    )}>
                      ₩{formatCurrency(financeSummary.totalRevenue - financeSummary.totalExpense)}
                    </span>
                  </div>
                </div>

                {/* 매출/지출 추가 버튼 - view와 edit 모드 모두에서 표시 */}
                {canEditFinance && (
                  <div className="flex gap-2">
                    <button
                      onClick={onAddRevenue}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      매출 추가
                    </button>
                    <button
                      onClick={onAddExpense}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      <Plus className="h-4 w-4" />
                      지출 추가
                    </button>
                  </div>
                )}

                {/* 상세 내역 토글 */}
                <button
                  onClick={() => setShowFinanceDetail(!showFinanceDetail)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  {showFinanceDetail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  상세 내역 {showFinanceDetail ? '접기' : '펼치기'}
                </button>

                {/* 상세 내역 */}
                {showFinanceDetail && financeData.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {financeData.map((entry) => (
                      <div
                        key={entry.id}
                        onClick={() => onViewFinanceDetail?.(entry)}
                        className={cn(
                          "flex items-center justify-between rounded-lg px-4 py-3 cursor-pointer transition",
                          entry.kind === 'revenue' 
                            ? "bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20" 
                            : "bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {entry.kind === 'revenue' ? (
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{entry.name}</p>
                            <p className="text-xs text-slate-400">{entry.category} · {entry.occurred_at}</p>
                          </div>
                        </div>
                        <p className={cn(
                          "text-sm font-bold",
                          entry.kind === 'revenue' ? "text-blue-600" : "text-red-600"
                        )}>
                          {entry.kind === 'revenue' ? '+' : '-'}₩{formatCurrency(entry.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
              {/* 왼쪽: 삭제 버튼 (edit 모드에서만) */}
              <div>
                {isEditMode && onDelete && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </button>
                )}
              </div>

              {/* 오른쪽: 액션 버튼들 */}
              <div className="flex items-center gap-2">
                {isCreateMode && (
                  <>
                    <button
                      onClick={onClose}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      등록
                    </button>
                  </>
                )}
                {isViewMode && (
                  <button
                    onClick={onClose}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    닫기
                  </button>
                )}
                {isEditMode && (
                  <>
                    <button
                      onClick={() => setMode('view')}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      저장
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-2xl p-6">
            <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-slate-200">프로젝트 삭제</h3>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
              정말 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  handleDelete();
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
