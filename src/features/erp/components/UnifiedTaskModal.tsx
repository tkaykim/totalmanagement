'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, ListTodo, Calendar, User, FileText, Flag, ChevronDown, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommentSection } from '@/features/comments/components/CommentSection';
import { BU, BU_TITLES, Project, TaskItem, TaskPriority } from '../types';

type ModalMode = 'create' | 'view' | 'edit';
type TaskStatus = 'todo' | 'in-progress' | 'done';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  'todo': { label: 'TODO', color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-100 dark:bg-violet-900/40' },
  'in-progress': { label: '진행중', color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-100 dark:bg-sky-900/40' },
  'done': { label: '완료', color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/40' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string; icon: string }> = {
  'low': { label: '낮음', color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-100 dark:bg-cyan-900/40', icon: '↓' },
  'medium': { label: '보통', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/40', icon: '─' },
  'high': { label: '높음', color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-100 dark:bg-rose-900/40', icon: '↑' },
};

function FormField({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon?: typeof ListTodo;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      readOnly={readOnly}
      className={cn(
        "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900",
        readOnly && "bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed",
        className
      )}
    />
  );
}

function StatusButton({
  status,
  currentStatus,
  onClick,
}: {
  status: TaskStatus;
  currentStatus: TaskStatus;
  onClick: () => void;
}) {
  const config = STATUS_CONFIG[status];
  const isActive = currentStatus === status;
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 py-2 text-xs font-medium rounded-lg transition",
        isActive ? cn(config.bgColor, config.color) : "bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
      )}
    >
      {config.label}
    </button>
  );
}

function PriorityButton({
  priority,
  currentPriority,
  onClick,
}: {
  priority: TaskPriority;
  currentPriority: TaskPriority;
  onClick: () => void;
}) {
  const config = PRIORITY_CONFIG[priority];
  const isActive = currentPriority === priority;
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 py-2 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1",
        isActive ? cn(config.bgColor, config.color) : "bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
      )}
    >
      <span>{config.icon}</span>
      {config.label}
    </button>
  );
}

function HeaderChipDropdown({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label || '선택';

  if (disabled) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200">
        {selectedLabel}
      </span>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition"
      >
        {selectedLabel}
        <ChevronDown className={cn("h-3 w-3 transition", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-10 min-w-[140px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between",
                value === opt.value && "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              )}
            >
              {opt.label}
              {value === opt.value && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type UnifiedTaskModalProps = {
  mode: ModalMode;
  task?: TaskItem | null;
  onClose: () => void;
  onSubmit: (payload: {
    id?: string;
    title: string;
    description?: string;
    bu: BU;
    projectId: string;
    assignee: string;
    dueDate: string;
    status: TaskStatus;
    priority: TaskPriority;
  }) => Promise<string | null> | void;
  onDelete?: (id: string) => void;
  defaultBu: BU;
  projects: Project[];
  defaultProjectId?: string;
  orgData: any[];
  usersData?: { users: any[]; currentUser: any };
};

export function UnifiedTaskModal({
  mode: initialMode,
  task,
  onClose,
  onSubmit,
  onDelete,
  defaultBu,
  projects,
  defaultProjectId,
  orgData,
  usersData,
}: UnifiedTaskModalProps) {
  const [mode, setMode] = useState<ModalMode>(initialMode);
  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';
  const isEditable = mode === 'create' || mode === 'edit';

  const defaultProject = defaultProjectId
    ? projects.find((p) => p.id === defaultProjectId)
    : null;
  
  const hasPreselectedProject = !!defaultProjectId || !!task?.projectId;

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    bu: task?.bu || defaultProject?.bu || defaultBu,
    projectId: task?.projectId || defaultProject?.id || '',
    assignee: task?.assignee || '',
    dueDate: task?.dueDate || '',
    status: (task?.status || 'todo') as TaskStatus,
    priority: (task?.priority || 'medium') as TaskPriority,
  });

  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const memberNames = useMemo(() => {
    const names = new Set<string>();
    orgData.forEach((unit) => {
      (unit.members || []).forEach((m: any) => {
        if (m.name) names.add(m.name);
      });
    });
    if (usersData?.users) {
      usersData.users.forEach((user: any) => {
        if (user.name) names.add(user.name);
      });
    }
    return Array.from(names).sort();
  }, [orgData, usersData]);

  const isAssigneeInList = memberNames.includes(form.assignee);
  const [assigneeMode, setAssigneeMode] = useState<'select' | 'custom'>(
    form.assignee && !isAssigneeInList ? 'custom' : 'select'
  );

  const assigneeOptions = useMemo(() => {
    return [
      { value: '', label: '담당자 선택' },
      ...memberNames.map((name) => ({ value: name, label: name })),
    ];
  }, [memberNames]);

  const projectOptions = useMemo(() => {
    const filtered = projects
      .filter((p) => p.bu === form.bu)
      .map((p) => ({ value: p.id, label: p.name }));
    return [{ value: '', label: '프로젝트 선택' }, ...filtered];
  }, [projects, form.bu]);

  const selectedProjectName = projects.find((p) => p.id === form.projectId)?.name || '프로젝트 선택';

  const handleSubmit = async () => {
    setError('');
    if (!form.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!form.projectId) {
      setError('프로젝트를 선택해주세요.');
      return;
    }

    const payload = {
      ...(task?.id && { id: task.id }),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      bu: form.bu,
      projectId: form.projectId,
      assignee: form.assignee.trim(),
      dueDate: form.dueDate,
      status: form.status,
      priority: form.priority,
    };

    const result = await onSubmit(payload);
    if (result) {
      setError(result);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
        <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/50">
                  <ListTodo className="h-4 w-4 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {isCreateMode ? '할 일 등록' : isViewMode ? '할 일 상세' : '할 일 수정'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {isViewMode && (
                  <button
                    onClick={() => setMode('edit')}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                  >
                    수정
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 transition"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            </div>
            {/* 사업부/프로젝트 칩 - 프로젝트가 미리 선택된 경우에만 헤더에 표시 */}
            {hasPreselectedProject && (
              <div className="flex items-center gap-2">
                <HeaderChipDropdown
                  value={form.bu}
                  options={(Object.keys(BU_TITLES) as BU[]).map((k) => ({ value: k, label: BU_TITLES[k] }))}
                  onChange={(val) => {
                    const nextBu = val as BU;
                    const firstProject = projects.find((p) => p.bu === nextBu)?.id ?? '';
                    setForm((prev) => ({ ...prev, bu: nextBu, projectId: firstProject || prev.projectId }));
                  }}
                  disabled={!isEditable}
                />
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <HeaderChipDropdown
                  value={form.projectId}
                  options={projectOptions}
                  onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
                  disabled={!isEditable}
                />
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* 사업부/프로젝트 선택 - 프로젝트가 미리 선택되지 않은 경우 바디에 표시 */}
            {!hasPreselectedProject && isEditable && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="사업부">
                  <select
                    value={form.bu}
                    onChange={(e) => {
                      const nextBu = e.target.value as BU;
                      setForm((prev) => ({ ...prev, bu: nextBu, projectId: '' }));
                    }}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400"
                  >
                    {(Object.keys(BU_TITLES) as BU[]).map((k) => (
                      <option key={k} value={k}>{BU_TITLES[k]}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="프로젝트">
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm((prev) => ({ ...prev, projectId: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400"
                  >
                    {projectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </FormField>
              </div>
            )}

            {/* 제목 */}
            <FormField label="제목" icon={FileText}>
              {isEditable ? (
                <Input
                  value={form.title}
                  onChange={(v) => setForm((prev) => ({ ...prev, title: v }))}
                  placeholder="할 일 제목을 입력하세요"
                />
              ) : (
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                  {form.title || '-'}
                </p>
              )}
            </FormField>

            {/* 설명 */}
            <FormField label="설명">
              {isEditable ? (
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="할 일에 대한 설명을 입력하세요 (선택)"
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 resize-none"
                />
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                  {form.description || '설명이 없습니다.'}
                </p>
              )}
            </FormField>

            {/* 담당자 + 마감일 */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="담당자" icon={User}>
                {isEditable ? (
                  assigneeMode === 'select' ? (
                    <div className="space-y-1">
                      <select
                        value={form.assignee}
                        onChange={(e) => {
                          if (e.target.value === '__CUSTOM__') {
                            setAssigneeMode('custom');
                            setForm((prev) => ({ ...prev, assignee: '' }));
                          } else {
                            setForm((prev) => ({ ...prev, assignee: e.target.value }));
                          }
                        }}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none transition focus:border-blue-400"
                      >
                        {assigneeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                        <option value="__CUSTOM__">직접 입력</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setAssigneeMode('custom')}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        직접 입력하기
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        value={form.assignee}
                        onChange={(v) => setForm((prev) => ({ ...prev, assignee: v }))}
                        placeholder="담당자 이름"
                      />
                      <button
                        type="button"
                        onClick={() => setAssigneeMode('select')}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        목록에서 선택
                      </button>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                    {form.assignee || '-'}
                  </p>
                )}
              </FormField>

              <FormField label="마감일" icon={Calendar}>
                {isEditable ? (
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(v) => setForm((prev) => ({ ...prev, dueDate: v }))}
                  />
                ) : (
                  <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                    {form.dueDate || '-'}
                  </p>
                )}
              </FormField>
            </div>

            {/* 상태 */}
            <FormField label="상태">
              {isEditable ? (
                <div className="flex gap-2">
                  {(['todo', 'in-progress', 'done'] as const).map((status) => (
                    <StatusButton
                      key={status}
                      status={status}
                      currentStatus={form.status}
                      onClick={() => setForm((prev) => ({ ...prev, status }))}
                    />
                  ))}
                </div>
              ) : (
                <div className={cn("inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium", STATUS_CONFIG[form.status].bgColor, STATUS_CONFIG[form.status].color)}>
                  {STATUS_CONFIG[form.status].label}
                </div>
              )}
            </FormField>

            {/* 중요도 */}
            <FormField label="중요도" icon={Flag}>
              {isEditable ? (
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((priority) => (
                    <PriorityButton
                      key={priority}
                      priority={priority}
                      currentPriority={form.priority}
                      onClick={() => setForm((prev) => ({ ...prev, priority }))}
                    />
                  ))}
                </div>
              ) : (
                <div className={cn("inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium", PRIORITY_CONFIG[form.priority].bgColor, PRIORITY_CONFIG[form.priority].color)}>
                  <span>{PRIORITY_CONFIG[form.priority].icon}</span>
                  {PRIORITY_CONFIG[form.priority].label}
                </div>
              )}
            </FormField>

            {/* 에러 */}
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* 댓글 섹션 (view/edit 모드) */}
            {!isCreateMode && task?.id && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <CommentSection entityType="task" entityId={Number(task.id)} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              {!isCreateMode && onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  삭제
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                {isViewMode ? '닫기' : '취소'}
              </button>
              {isEditable && (
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  {isCreateMode ? '등록' : '저장'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">할 일 삭제</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              이 할 일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (task?.id && onDelete) {
                    onDelete(task.id);
                  }
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
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
