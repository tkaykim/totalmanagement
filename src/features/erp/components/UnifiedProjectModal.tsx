'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Plus, Trash2, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Lock, Pencil, Search, Check, Circle, Clock, CheckCircle2, PauseCircle, ListTodo, MessageCircle, FileText, Paperclip, Download, Image as ImageIcon, File as FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkFinancePermission } from '@/features/erp/lib/financePermissions';
import type { AppUser, Project as DbProject } from '@/types/database';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from '@/hooks/use-toast';
import { CommentSection } from '@/features/comments/components/CommentSection';
import { TaskTemplateSelector, type PendingTask } from '@/features/task-template/components/TaskTemplateSelector';
import { UnifiedTaskModal } from '@/features/erp/components/UnifiedTaskModal';
import type { Project as ErpProject, TaskPriority as ErpTaskPriority } from '@/features/erp/types';

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

type TaskStatus = 'todo' | 'in-progress' | 'on-hold' | 'done';

type TaskEntry = {
  id: string;
  title: string;
  assignee_id?: string;
  assignee: string;
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
  { value: '보류', label: '보류' },
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
    pendingTasks?: PendingTask[];
  }) => void | Promise<void> | Promise<{ id: string } | void>;
  onDelete?: (id: string) => void | Promise<void>;
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
  onAddTaskFromTemplate?: () => void;
  onViewTaskDetail?: (task: TaskEntry) => void;
  onTaskStatusChange?: (taskId: string, status: TaskStatus) => void | Promise<void>;
  /** create 모드에서 할일 추가 시 UnifiedTaskModal에 전달 (담당자 등 동일 UI) */
  orgData?: any[];
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

  const filteredOptions = options
    .filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => a.label.localeCompare(b.label, 'ko'));

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
  'todo': { label: '할 일', color: 'text-slate-500 bg-slate-100 dark:bg-slate-700', icon: Circle },
  'in-progress': { label: '진행중', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50', icon: Clock },
  'on-hold': { label: '보류', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/50', icon: PauseCircle },
  'done': { label: '완료', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50', icon: CheckCircle2 },
};

const PRIORITY_INLINE: Record<string, { label: string; dot: string }> = {
  high: { label: '높음', dot: 'bg-rose-500' },
  medium: { label: '보통', dot: 'bg-amber-400' },
  low: { label: '낮음', dot: 'bg-slate-400' },
};

function CreateModeTasksSection({
  pendingTasks,
  onRemoveTask,
  onAddTask,
  onAddFromTemplate,
}: {
  pendingTasks: PendingTask[];
  onRemoveTask: (index: number) => void;
  onAddTask: () => void;
  onAddFromTemplate: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider hover:text-slate-800 dark:hover:text-slate-100"
        >
          <ListTodo className="h-4 w-4" />
          할 일
          <span className="text-xs font-normal text-slate-400">({pendingTasks.length})</span>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddFromTemplate}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <FileText className="h-3.5 w-3.5" />
            할일 탬플릿
          </button>
          <button
            onClick={onAddTask}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <Plus className="h-3.5 w-3.5" />
            할 일 추가
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-1.5">
          {pendingTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
              <ListTodo className="h-8 w-8 mb-2 opacity-30" />
              <p>등록된 할일이 없습니다.</p>
              <p className="mt-1">위 버튼으로 할일을 추가하거나 템플릿을 사용하세요.</p>
            </div>
          ) : (
            pendingTasks.map((task, index) => {
              const pConfig = PRIORITY_INLINE[task.priority] || PRIORITY_INLINE.medium;
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1">
                        <span className={cn('w-1.5 h-1.5 rounded-full', pConfig.dot)} />
                        <span className="text-[10px] text-slate-500">{pConfig.label}</span>
                      </div>
                      {task.assignee && (
                        <span className="text-[10px] text-slate-500 truncate max-w-[80px]" title={task.assignee}>
                          {task.assignee}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="text-[10px] text-slate-400">{task.dueDate}</span>
                      )}
                      {task.templateName && (
                        <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                          {task.templateName}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveTask(index)}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

function TasksSection({
  tasks,
  onAddTask,
  onAddTaskFromTemplate,
  onViewTask,
  onTaskStatusChange,
  usersData,
}: {
  tasks: TaskEntry[];
  onAddTask?: () => void;
  onAddTaskFromTemplate?: () => void;
  onViewTask?: (task: TaskEntry) => void;
  onTaskStatusChange?: (taskId: string, status: TaskStatus) => void | Promise<void>;
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
    'on-hold': tasks.filter((t) => t.status === 'on-hold').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  const getAssigneeName = (task: TaskEntry) => {
    // assignee(이름)가 있으면 그대로 반환
    if (task.assignee && task.assignee.trim()) {
      return task.assignee;
    }
    // assignee_id로 users에서 찾아서 이름 반환
    if (task.assignee_id) {
      const user = usersData?.users.find((u: any) => u.id === task.assignee_id);
      if (user?.name) return user.name;
    }
    return '미지정';
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
        <div className="flex items-center gap-2">
          {onAddTaskFromTemplate && (
            <button
              onClick={onAddTaskFromTemplate}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <FileText className="h-3.5 w-3.5" />
              할일 탬플릿
            </button>
          )}
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
      </div>

      {isExpanded && (
        <>
          {/* 상태 필터 탭 */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
            {(['all', 'todo', 'in-progress', 'on-hold', 'done'] as const).map((status) => (
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
                        <span>{getAssigneeName(task)}</span>
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

                    {/* 할일 상태 변경 (클릭 시 상세로 가지 않도록 stopPropagation) */}
                    {onTaskStatusChange && (
                      <select
                        value={task.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          const next = e.target.value as TaskStatus;
                          onTaskStatusChange(task.id, next);
                        }}
                        className={cn(
                          "flex-shrink-0 text-[10px] font-medium rounded-md px-2 py-1 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer outline-none focus:ring-1 focus:ring-blue-500",
                          TASK_STATUS_CONFIG[task.status].color
                        )}
                      >
                        {(['todo', 'in-progress', 'on-hold', 'done'] as const).map((s) => (
                          <option key={s} value={s}>
                            {TASK_STATUS_CONFIG[s].label}
                          </option>
                        ))}
                      </select>
                    )}

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
  onAddTaskFromTemplate,
  onViewTaskDetail,
  onTaskStatusChange,
  orgData = [],
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
  const [hasValidationError, setHasValidationError] = useState(false);
  const [showFinanceDetail, setShowFinanceDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 프로젝트 생성 시 로컬 할일 관리
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [showTemplateSelectorLocal, setShowTemplateSelectorLocal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  // 설명 첨부파일 상태
  type DescAttachment = { id: number; file_name: string; file_path: string; mime_type: string; file_size: number; public_url?: string };
  const [descriptionFiles, setDescriptionFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<DescAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 기존 첨부파일 로드 (view/edit 모드)
  useEffect(() => {
    if (project?.id) {
      fetch(`/api/projects/${project.id}/documents`)
        .then((res) => res.json())
        .then((docs: any[]) => {
          if (Array.isArray(docs)) {
            const mapped = docs.map((d: any) => ({
              id: d.id,
              file_name: d.file_name,
              file_path: d.file_path,
              mime_type: d.mime_type || '',
              file_size: d.file_size || 0,
              public_url: d.public_url || '',
            }));
            setExistingAttachments(mapped);
          }
        })
        .catch(() => { });
    }
  }, [project?.id]);

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

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!form.name || !form.cat) {
      setHasValidationError(true);
      toast({
        variant: 'destructive',
        title: '필수 항목 누락',
        description: '프로젝트명과 카테고리는 필수 항목입니다.',
      });
      return;
    }

    setHasValidationError(false);
    setIsSubmitting(true);

    try {
      const participants = selectedParticipants.map((p) => ({
        user_id: p.type === 'user' ? (p.id as string) : undefined,
        partner_worker_id: p.type === 'partner_worker' ? (p.id as number) : undefined,
        partner_company_id: p.type === 'partner_company' ? (p.id as number) : undefined,
        role: 'participant',
      }));

      const result = await onSubmit({
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
        ...(isCreateMode && pendingTasks.length > 0 && { pendingTasks }),
      });

      // 프로젝트 생성/수정 후 첨부파일 업로드
      const projectId = (result as any)?.id || project?.id;
      if (projectId) {
        // 삭제된 첨부파일 처리
        for (const docId of removedAttachmentIds) {
          try {
            await fetch(`/api/projects/${projectId}/documents/${docId}`, { method: 'DELETE' });
          } catch (e) { /* ignore */ }
        }

        // 새 파일 업로드
        if (descriptionFiles.length > 0) {
          setIsUploadingFiles(true);
          try {
            const formData = new FormData();
            descriptionFiles.forEach((file) => formData.append('files', file));
            formData.append('file_type', 'description');
            await fetch(`/api/projects/${projectId}/documents`, {
              method: 'POST',
              body: formData,
            });
          } catch (e) {
            console.error('File upload failed:', e);
            toast({
              variant: 'destructive',
              title: '파일 업로드 실패',
              description: '일부 파일이 업로드되지 않았습니다.',
            });
          } finally {
            setIsUploadingFiles(false);
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /** view 모드에서 프로젝트 상태만 즉시 변경 (수정 버튼 없이) */
  const handleProjectStatusChange = async (newStatus: string) => {
    if (!project || isSubmitting) return;
    setForm((prev) => ({ ...prev, status: newStatus }));
    setIsSubmitting(true);
    try {
      const participants = selectedParticipants.map((p) => ({
        user_id: p.type === 'user' ? (p.id as string) : undefined,
        partner_worker_id: p.type === 'partner_worker' ? (p.id as number) : undefined,
        partner_company_id: p.type === 'partner_company' ? (p.id as number) : undefined,
        role: 'participant',
      }));
      await onSubmit({
        id: project.id,
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
        status: newStatus,
        participants,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    if (project && onDelete) {
      setIsDeleting(true);
      try {
        await onDelete(project.id);
      } finally {
        setIsDeleting(false);
      }
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

  // 클라이언트 회사 이름 가져오기
  const getPartnerCompanyName = () => {
    if (!form.partner_company_id) return '-';
    const company = partnerCompaniesData?.find((c: any) => c.id === Number(form.partner_company_id));
    return company?.company_name_ko || company?.company_name_en || '-';
  };

  // 클라이언트 담당자 이름 가져오기
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
    }
    // 업체가 선택되지 않으면 전체 담당자 표시
    return partnerWorkersData;
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
      case '보류': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300';
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
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur pb-safe-area">
        <div className="w-full max-w-3xl max-h-[calc(100vh-2rem-env(safe-area-inset-bottom,0px))] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
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
                  <select
                    value={form.status}
                    onChange={(e) => handleProjectStatusChange(e.target.value)}
                    disabled={isSubmitting}
                    className={cn(
                      "text-xs font-semibold rounded-full px-3 py-1 border-0 outline-none cursor-pointer bg-transparent",
                      getStatusColor(form.status),
                      isSubmitting && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
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
                  disabled={isSubmitting || isDeleting}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 dark:bg-slate-600/80 text-slate-500 dark:text-slate-400 transition hover:bg-white dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Project name & category */}
            <div className="space-y-2">
              {isEditable ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => {
                        setForm({ ...form, name: e.target.value });
                        if (e.target.value && hasValidationError) setHasValidationError(false);
                      }}
                      placeholder="프로젝트명을 입력하세요 *"
                      className={cn(
                        "w-full text-xl font-bold bg-transparent border-b-2 text-slate-800 dark:text-slate-100 px-1 py-1 outline-none focus:border-blue-500 placeholder:text-slate-400",
                        hasValidationError && !form.name
                          ? "border-red-500"
                          : "border-slate-300 dark:border-slate-500"
                      )}
                    />
                    {hasValidationError && !form.name && (
                      <p className="text-xs text-red-500 mt-1">프로젝트명을 입력해주세요</p>
                    )}
                  </div>
                  <span className="text-slate-400 dark:text-slate-500">·</span>
                  <div className="w-32">
                    <input
                      type="text"
                      value={form.cat}
                      onChange={(e) => {
                        setForm({ ...form, cat: e.target.value });
                        if (e.target.value && hasValidationError) setHasValidationError(false);
                      }}
                      placeholder="카테고리 *"
                      className={cn(
                        "w-full text-sm bg-transparent border-b-2 text-slate-600 dark:text-slate-300 px-1 py-1 outline-none focus:border-blue-500 placeholder:text-slate-400",
                        hasValidationError && !form.cat
                          ? "border-red-500"
                          : "border-slate-300 dark:border-slate-500"
                      )}
                    />
                    {hasValidationError && !form.cat && (
                      <p className="text-xs text-red-500 mt-1">카테고리 필수</p>
                    )}
                  </div>
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
                    <DatePicker
                      value={form.startDate}
                      onChange={(date) => {
                        if (form.endDate && date > form.endDate) {
                          toast({
                            variant: 'destructive',
                            title: '날짜 오류',
                            description: '종료일은 시작일보다 앞설 수 없습니다.',
                          });
                          setForm((prev) => ({ ...prev, startDate: date, endDate: '' }));
                          return;
                        }
                        setForm({ ...form, startDate: date });
                      }}
                      placeholder="시작일"
                    />
                    <span>~</span>
                    <DatePicker
                      value={form.endDate}
                      onChange={(date) => {
                        if (form.startDate && date < form.startDate) {
                          toast({
                            variant: 'destructive',
                            title: '날짜 오류',
                            description: '종료일은 시작일보다 앞설 수 없습니다.',
                          });
                          return false;
                        }
                        setForm({ ...form, endDate: date });
                      }}
                      placeholder="종료일"
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
                <div className="space-y-3">
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="프로젝트 설명을 입력하세요"
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 resize-none"
                  />
                  {/* 파일 첨부 영역 */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.txt,.zip,.rar"
                      onChange={(e) => {
                        if (e.target.files) {
                          setDescriptionFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                        }
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      파일 첨부 (PDF, 이미지 등)
                    </button>
                  </div>

                  {/* 기존 첨부파일 목록 */}
                  {existingAttachments.filter((a) => !removedAttachmentIds.includes(a.id)).length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">기존 첨부</span>
                      <div className="flex flex-wrap gap-2">
                        {existingAttachments
                          .filter((a) => !removedAttachmentIds.includes(a.id))
                          .map((att) => {
                            const isImage = att.mime_type?.startsWith('image/');
                            return (
                              <div
                                key={att.id}
                                className="group relative flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                              >
                                {isImage ? (
                                  <ImageIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                ) : (
                                  <FileIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                )}
                                <span className="max-w-[140px] truncate text-slate-700 dark:text-slate-300">{att.file_name}</span>
                                <button
                                  type="button"
                                  onClick={() => setRemovedAttachmentIds((prev) => [...prev, att.id])}
                                  className="ml-1 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* 새 첨부파일 프리뷰 */}
                  {descriptionFiles.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">새 첨부 ({descriptionFiles.length}개)</span>
                      <div className="flex flex-wrap gap-2">
                        {descriptionFiles.map((file, idx) => {
                          const isImage = file.type.startsWith('image/');
                          return (
                            <div
                              key={`${file.name}-${idx}`}
                              className="group relative flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-xs"
                            >
                              {isImage ? (
                                <ImageIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <FileIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              )}
                              <span className="max-w-[140px] truncate text-slate-700 dark:text-slate-300">{file.name}</span>
                              <span className="text-[10px] text-slate-400">
                                {file.size < 1024 * 1024
                                  ? `${Math.round(file.size / 1024)}KB`
                                  : `${(file.size / (1024 * 1024)).toFixed(1)}MB`}
                              </span>
                              <button
                                type="button"
                                onClick={() => setDescriptionFiles((prev) => prev.filter((_, i) => i !== idx))}
                                className="ml-1 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-700/30 rounded-lg px-3 py-2">
                    {form.description || '설명이 없습니다.'}
                  </p>
                  {/* View 모드 첨부파일 표시 */}
                  {existingAttachments.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">첨부파일 ({existingAttachments.length}개)</span>
                      <div className="flex flex-wrap gap-2">
                        {existingAttachments.map((att) => {
                          const isImage = att.mime_type?.startsWith('image/');
                          return (
                            <a
                              key={att.id}
                              href={att.public_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs hover:border-blue-300 dark:hover:border-blue-600 transition group"
                            >
                              {isImage ? (
                                <ImageIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <FileIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              )}
                              <span className="max-w-[160px] truncate text-slate-700 dark:text-slate-300">{att.file_name}</span>
                              <Download className="h-3 w-3 text-slate-400 group-hover:text-blue-500 transition flex-shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
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
                    <SearchDropdown
                      options={usersData?.users.map((user: any) => ({
                        value: user.id,
                        label: user.name,
                        subLabel: user.department || '',
                      })) || []}
                      value={form.pm_id}
                      onChange={(value) => setForm({ ...form, pm_id: value })}
                      placeholder="PM 검색..."
                      emptyLabel="선택 안함"
                    />
                  </div>

                  {/* 참여자 추가 - PM 바로 아래 */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 dark:text-slate-400">참여자</label>
                    <div className="flex items-center gap-2">
                      {/* 유형 선택 탭 */}
                      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {[
                          { type: 'user' as const, label: '직원' },
                          { type: 'partner_worker' as const, label: '외주담당자' },
                          { type: 'partner_company' as const, label: '외주업체' },
                        ].map((item) => (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => {
                              setParticipantSelectType(item.type);
                              setParticipantSelectId('');
                            }}
                            className={cn(
                              "px-3 py-1.5 text-xs font-medium transition",
                              participantSelectType === item.type
                                ? "bg-blue-600 text-white"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                            )}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 검색 드롭다운 + 추가 버튼 */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <SearchDropdown
                          options={
                            participantSelectType === 'user'
                              ? (usersData?.users
                                .filter((u: any) => !selectedParticipants.some((p) => p.type === 'user' && p.id === u.id))
                                .map((u: any) => ({
                                  value: u.id,
                                  label: u.name,
                                  subLabel: u.department || '',
                                })) || [])
                              : participantSelectType === 'partner_worker'
                                ? (partnerWorkersData
                                  ?.filter((w: any) => !selectedParticipants.some((p) => p.type === 'partner_worker' && p.id === w.id))
                                  .map((w: any) => ({
                                    value: String(w.id),
                                    label: w.name_ko || w.name_en || '',
                                    subLabel: w.partner_company_id
                                      ? partnerCompaniesData?.find((c: any) => c.id === w.partner_company_id)?.company_name_ko || ''
                                      : '소속 없음',
                                  })) || [])
                                : (partnerCompaniesData
                                  ?.filter((c: any) => !selectedParticipants.some((p) => p.type === 'partner_company' && p.id === c.id))
                                  .map((c: any) => ({
                                    value: String(c.id),
                                    label: c.company_name_ko || c.company_name_en || '',
                                  })) || [])
                          }
                          value={participantSelectId}
                          onChange={(value) => setParticipantSelectId(value)}
                          placeholder={
                            participantSelectType === 'user'
                              ? '직원 검색...'
                              : participantSelectType === 'partner_worker'
                                ? '외주담당자 검색...'
                                : '외주업체 검색...'
                          }
                          emptyLabel="선택하세요"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddParticipant}
                        disabled={!participantSelectId}
                        className={cn(
                          "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-white transition",
                          participantSelectId
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-slate-300 dark:bg-slate-600 cursor-not-allowed"
                        )}
                      >
                        <Plus className="h-4 w-4" />
                        추가
                      </button>
                    </div>

                    {/* 참여자 목록 - 칩 형태 */}
                    <div className="flex flex-wrap gap-2 pt-1">
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
                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(index)}
                              className="ml-0.5 hover:opacity-70"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 클라이언트 (의뢰사) | 클라이언트 담당자 - 한 줄에 두 개 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400">클라이언트</label>
                      <SearchDropdown
                        options={partnerCompaniesData?.map((company: any) => ({
                          value: String(company.id),
                          label: company.company_name_ko || company.company_name_en || '',
                        })) || []}
                        value={form.partner_company_id}
                        onChange={(value) => {
                          setForm({ ...form, partner_company_id: value, partner_worker_id: '' });
                        }}
                        placeholder="클라이언트 검색..."
                        emptyLabel="선택 안함"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400">클라이언트 담당자</label>
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
                      <SearchDropdown
                        options={artistsData?.map((artist: any) => ({
                          value: String(artist.id),
                          label: artist.name_ko || artist.name || '',
                        })) || []}
                        value={form.artist_id}
                        onChange={(value) => setForm({ ...form, artist_id: value })}
                        placeholder="아티스트 검색..."
                        emptyLabel="선택 안함"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400">채널</label>
                      <SearchDropdown
                        options={channelsData?.map((channel: any) => ({
                          value: String(channel.id),
                          label: channel.name || '',
                        })) || []}
                        value={form.channel_id}
                        onChange={(value) => setForm({ ...form, channel_id: value })}
                        placeholder="채널 검색..."
                        emptyLabel="선택 안함"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {/* PM - 항상 표시, 없으면 - */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">PM</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{getPmName()}</span>
                    </div>
                    {/* 클라이언트 - 있을 때만 표시 */}
                    {form.partner_company_id && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">클라이언트</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{getPartnerCompanyName()}</span>
                      </div>
                    )}
                    {/* 클라이언트 담당자 - 있을 때만 표시 */}
                    {form.partner_worker_id && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">클라이언트 담당자</span>
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

                  {/* 참여자 목록 (view 모드) */}
                  {selectedParticipants.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">참여자</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedParticipants.map((p) => (
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 할일 섹션 - create 모드에서는 로컬 할일, edit/view에서는 기존 API 할일 */}
            {isCreateMode ? (
              <CreateModeTasksSection
                pendingTasks={pendingTasks}
                onRemoveTask={(index) => setPendingTasks((prev) => prev.filter((_, i) => i !== index))}
                onAddTask={() => setShowAddTaskModal(true)}
                onAddFromTemplate={() => setShowTemplateSelectorLocal(true)}
              />
            ) : (
              <TasksSection
                tasks={tasksData}
                onAddTask={onAddTask}
                onAddTaskFromTemplate={onAddTaskFromTemplate}
                onViewTask={onViewTaskDetail}
                onTaskStatusChange={onTaskStatusChange}
                usersData={usersData}
              />
            )}

            {/* 댓글 섹션 (view/edit 모드에서만) */}
            {!isCreateMode && project && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <MessageCircle className="h-4 w-4" />
                  댓글
                </div>
                <CommentSection entityType="project" entityId={Number(project.id)} />
              </section>
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
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
                            entry.status === 'paid' ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300" :
                              entry.status === 'planned' ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300" :
                                entry.status === 'canceled' ? "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300" :
                                  "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300"
                          )}>
                            {entry.status === 'paid' ? '지급완료' : entry.status === 'planned' ? '지급예정' : entry.status === 'canceled' ? '취소' : entry.status}
                          </span>
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

          </div>

          {/* Footer - Capacitor 앱에서 하단 네비게이션 바와 겹치지 않도록 safe area 적용 */}
          <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-700 px-6 py-4 pb-safe-area">
            <div className="flex items-center justify-between">
              {/* 왼쪽: 삭제 버튼 (edit 모드에서만) */}
              <div>
                {isEditMode && onDelete && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSubmitting || isDeleting}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      disabled={isSubmitting}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting && (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {isSubmitting ? '등록 중...' : '등록'}
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
                      disabled={isSubmitting || isDeleting}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || isDeleting}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting && (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {isSubmitting ? '저장 중...' : '저장'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur pb-safe-area">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-2xl p-6">
            <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-slate-200">프로젝트 삭제</h3>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
              정말 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  await handleDelete();
                  setShowDeleteConfirm(false);
                }}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 할일 추가 모달 (create 모드) - 할일 생성 모달과 동일 UI로 담당자 설정 가능 */}
      {showAddTaskModal && (() => {
        const virtualProject: ErpProject = {
          id: '__pending__',
          bu: form.bu as ErpProject['bu'],
          name: form.name || '새 프로젝트',
          cat: form.cat,
          startDate: form.startDate,
          endDate: form.endDate,
          status: form.status || '준비중',
        };
        return (
          <UnifiedTaskModal
            mode="create"
            onClose={() => setShowAddTaskModal(false)}
            onSubmit={async (payload) => {
              setPendingTasks((prev) => [
                ...prev,
                {
                  title: payload.title,
                  description: payload.description,
                  priority: payload.priority as ErpTaskPriority,
                  dueDate: payload.dueDate,
                  days_before: 0,
                  assignee_id: payload.assignee_id,
                  assignee: payload.assignee,
                  manual_id: payload.manual_id ?? undefined,
                },
              ]);
              setShowAddTaskModal(false);
              return null;
            }}
            defaultBu={form.bu as ErpProject['bu']}
            projects={[virtualProject]}
            defaultProjectId="__pending__"
            orgData={orgData}
            usersData={usersData}
          />
        );
      })()}

      {/* 로컬 템플릿 선택기 (create 모드) */}
      {showTemplateSelectorLocal && (
        <TaskTemplateSelector
          mode="local"
          projectEndDate={form.endDate}
          onLocalAdd={(newTasks) => {
            setPendingTasks((prev) => [...prev, ...newTasks]);
          }}
          onClose={() => setShowTemplateSelectorLocal(false)}
        />
      )}
    </>
  );
}
