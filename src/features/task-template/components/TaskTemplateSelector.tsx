'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTaskTemplates, useGenerateTasksFromTemplate } from '../hooks';
import { format, subDays } from 'date-fns';
import type { BU, TaskTemplate, TaskPriority, TaskTemplateTask } from '@/types/database';
import {
  X, FileText, Calendar, Search, ChevronLeft, ChevronRight,
  Clock, Check, Trash2, AlertTriangle, ListChecks, Settings2, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BU_TITLES } from '@/features/erp/types';

/* ──────────── Public types ──────────── */

export interface PendingTask {
  title: string;
  priority: TaskPriority;
  dueDate: string;
  days_before: number;
  assignee_role?: string;
  manual_id?: number | null;
  templateName?: string;
}

/* ──────────── Props ──────────── */

interface TaskTemplateSelectorBaseProps {
  projectEndDate?: string;
  onClose: () => void;
}

interface GenerateModeProps extends TaskTemplateSelectorBaseProps {
  mode?: 'generate';
  projectId: number;
  projectBu: BU;
  onSuccess?: () => void;
  onLocalAdd?: never;
}

interface LocalModeProps extends TaskTemplateSelectorBaseProps {
  mode: 'local';
  projectId?: never;
  projectBu?: BU;
  onSuccess?: never;
  onLocalAdd: (tasks: PendingTask[]) => void;
}

type TaskTemplateSelectorProps = GenerateModeProps | LocalModeProps;

/* ──────────── Constants ──────────── */

type Step = 'select' | 'options' | 'preview';

const STEP_META: Record<Step, { icon: React.ReactNode; label: string; num: number }> = {
  select: { icon: <Search className="h-4 w-4" />, label: '템플릿 선택', num: 1 },
  options: { icon: <Settings2 className="h-4 w-4" />, label: '옵션 설정', num: 2 },
  preview: { icon: <Eye className="h-4 w-4" />, label: '할일 확인', num: 3 },
};

const PRIORITY_LABELS: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: '높음', color: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/30' },
  medium: { label: '보통', color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30' },
  low: { label: '낮음', color: 'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-700' },
};

function formatDayLabel(daysBefore: number): string {
  if (daysBefore > 0) return `D-${daysBefore}`;
  if (daysBefore === 0) return 'D-Day';
  return `D+${Math.abs(daysBefore)}`;
}

/* ──────────── Helpers ──────────── */

/** 옵션 기반으로 조건부 태스크를 필터링 */
function filterTasksByOptions(
  tasks: TaskTemplateTask[],
  options: Record<string, any>,
  schema: TaskTemplate['options_schema'],
): TaskTemplateTask[] {
  const booleanKeys = Object.entries(schema.properties)
    .filter(([, prop]) => prop.type === 'boolean')
    .map(([key]) => key);

  return tasks.filter((task) => {
    if (!task.condition_key) return true;
    if (!booleanKeys.includes(task.condition_key)) return true;
    return options[task.condition_key] === true;
  });
}

/** 미리보기 태스크 생성 (날짜 계산 포함) */
function buildPreviewTasks(
  tasks: TaskTemplateTask[],
  baseDate: string,
): (TaskTemplateTask & { dueDate: string })[] {
  return [...tasks]
    .sort((a, b) => b.days_before - a.days_before)
    .map((task) => ({
      ...task,
      dueDate: format(subDays(new Date(baseDate), task.days_before || 0), 'yyyy-MM-dd'),
    }));
}

/* ──────────── Component ──────────── */

export function TaskTemplateSelector(props: TaskTemplateSelectorProps) {
  const { projectEndDate, onClose, mode = 'generate' } = props;

  // Step state
  const [step, setStep] = useState<Step>('select');

  // Step 1: 선택
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);

  // Step 2: 옵션
  const [baseDate, setBaseDate] = useState(projectEndDate || format(new Date(), 'yyyy-MM-dd'));
  const [options, setOptions] = useState<Record<string, any>>({});

  // Step 3: 미리보기 (개별 제거)
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());

  const { data: templates, isLoading } = useTaskTemplates();
  const generateMutation = useGenerateTasksFromTemplate();

  /* ── 검색 필터 ── */
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((t) =>
      t.name.toLowerCase().includes(query) ||
      (t.description ?? '').toLowerCase().includes(query) ||
      t.template_type.toLowerCase().includes(query) ||
      BU_TITLES[t.bu_code].toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  /* ── 옵션 기반 조건부 미리보기 태스크 ── */
  const filteredPreviewTasks = useMemo(() => {
    if (!selectedTemplate) return [];
    const conditioned = filterTasksByOptions(
      selectedTemplate.tasks,
      options,
      selectedTemplate.options_schema,
    );
    return buildPreviewTasks(conditioned, baseDate);
  }, [selectedTemplate, options, baseDate]);

  /** 제거되지 않은 최종 태스크 */
  const finalTasks = useMemo(
    () => filteredPreviewTasks.filter((_, i) => !removedIndices.has(i)),
    [filteredPreviewTasks, removedIndices],
  );

  /* ── 옵션 스키마에 항목이 있는지 ── */
  const hasOptions = selectedTemplate
    ? Object.keys(selectedTemplate.options_schema.properties ?? {}).length > 0
    : false;

  /* ── Handlers ── */

  const handleSelectTemplate = useCallback((template: TaskTemplate) => {
    setSelectedTemplate(template);
    setOptions({});
    setRemovedIndices(new Set());
    const hasOpts = Object.keys(template.options_schema.properties ?? {}).length > 0;
    setStep(hasOpts ? 'options' : 'preview');
  }, []);

  const handleOptionChange = useCallback((key: string, value: any) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
    setRemovedIndices(new Set());
  }, []);

  const goToPreview = useCallback(() => {
    setRemovedIndices(new Set());
    setStep('preview');
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'preview' && hasOptions) {
      setStep('options');
    } else {
      setStep('select');
      setSelectedTemplate(null);
    }
  }, [step, hasOptions]);

  const handleRemoveTask = useCallback((index: number) => {
    setRemovedIndices((prev) => new Set([...prev, index]));
  }, []);

  const handleConfirm = async () => {
    if (!selectedTemplate || finalTasks.length === 0) return;

    if (mode === 'local') {
      const localTasks: PendingTask[] = finalTasks.map((task) => ({
        title: task.title,
        priority: (task.priority || 'medium') as TaskPriority,
        dueDate: task.dueDate,
        days_before: task.days_before,
        assignee_role: task.assignee_role,
        manual_id: task.manual_id,
        templateName: selectedTemplate.name,
      }));
      props.onLocalAdd(localTasks);
      onClose();
      return;
    }

    try {
      const tasksToCreate = finalTasks.map((task) => ({
        title: task.title,
        due_date: task.dueDate,
        priority: (task.priority || 'medium') as string,
        assignee_role: task.assignee_role,
        manual_id: task.manual_id,
      }));
      await generateMutation.mutateAsync({
        template_id: selectedTemplate.id,
        project_id: props.projectId,
        tasks: tasksToCreate,
      });
      props.onSuccess?.();
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '할일 생성 중 오류가 발생했습니다.';
      alert(msg);
    }
  };

  /* ── Renderers ── */

  const renderOptionInput = (key: string, prop: any) => {
    if (prop.type === 'boolean') {
      return (
        <label
          key={key}
          htmlFor={`opt-${key}`}
          className={cn(
            'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
            options[key]
              ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300',
          )}
        >
          <input
            type="checkbox"
            id={`opt-${key}`}
            checked={options[key] || false}
            onChange={(e) => handleOptionChange(key, e.target.checked)}
            className="rounded border-slate-300 h-4 w-4 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{prop.title}</span>
            {options[key] && (
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                관련 할일이 포함됩니다
              </p>
            )}
          </div>
        </label>
      );
    }
    if (prop.type === 'date' || prop.format === 'date') {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`opt-${key}`} className="text-sm">{prop.title}</Label>
          <Input
            id={`opt-${key}`}
            type="date"
            value={options[key] || ''}
            onChange={(e) => handleOptionChange(key, e.target.value)}
            required={selectedTemplate?.options_schema.required?.includes(key)}
          />
        </div>
      );
    }
    if (prop.enum) {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`opt-${key}`} className="text-sm">{prop.title}</Label>
          <Select value={options[key] || ''} onValueChange={(v) => handleOptionChange(key, v)}>
            <SelectTrigger><SelectValue placeholder={`${prop.title} 선택`} /></SelectTrigger>
            <SelectContent>
              {prop.enum.map((val: string) => (
                <SelectItem key={val} value={val}>{val}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    return (
      <div key={key} className="space-y-1.5">
        <Label htmlFor={`opt-${key}`} className="text-sm">{prop.title}</Label>
        <Input
          id={`opt-${key}`}
          type={prop.type === 'number' ? 'number' : 'text'}
          value={options[key] || ''}
          onChange={(e) => handleOptionChange(key, prop.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
          required={selectedTemplate?.options_schema.required?.includes(key)}
        />
      </div>
    );
  };

  /* ── UI ── */

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 헤더 ── */}
        <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {step !== 'select' && (
                <button
                  onClick={handleBack}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                할일 템플릿
              </h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── 스텝 인디케이터 ── */}
          <StepIndicator currentStep={step} hasOptions={hasOptions} />
        </div>

        {/* ── Step 1: 검색 + 선택 ── */}
        {step === 'select' && (
          <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 p-4 border-b border-slate-100 dark:border-slate-700/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="search"
                  placeholder="템플릿명, 설명, 사업부로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-4 space-y-2">
              {isLoading ? (
                <div className="text-center py-12 text-slate-400">로딩 중...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  {searchQuery ? '검색 결과가 없습니다.' : '사용 가능한 템플릿이 없습니다.'}
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} onSelect={handleSelectTemplate} />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: 옵션 설정 ── */}
        {step === 'options' && selectedTemplate && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 선택된 템플릿 요약 */}
            <SelectedTemplateBanner
              template={selectedTemplate}
              onBack={() => { setStep('select'); setSelectedTemplate(null); }}
            />

            {/* 기준일 설정 */}
            <div className="space-y-1.5">
              <Label htmlFor="baseDate" className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                기준일 (행사일/마감일) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="baseDate"
                type="date"
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
                required
              />
              <p className="text-[11px] text-slate-500">
                이 날짜를 기준으로 각 할일의 마감일이 자동 계산됩니다.
              </p>
            </div>

            {/* 옵션 입력 */}
            {selectedTemplate.options_schema.properties && (
              <div className="space-y-4">
                {/* Boolean 옵션 먼저 */}
                {(() => {
                  const entries = Object.entries(selectedTemplate.options_schema.properties);
                  const booleanEntries = entries.filter(([, p]) => p.type === 'boolean');
                  const otherEntries = entries.filter(([, p]) => p.type !== 'boolean');

                  return (
                    <>
                      {booleanEntries.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            조건부 옵션
                          </h3>
                          <p className="text-[11px] text-slate-500 -mt-1">
                            체크하면 관련 할일이 함께 생성됩니다
                          </p>
                          <div className="space-y-2">
                            {booleanEntries.map(([key, prop]) => renderOptionInput(key, prop))}
                          </div>
                        </div>
                      )}
                      {otherEntries.length > 0 && (
                        <div className="space-y-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            추가 정보 입력
                          </h3>
                          <div className="space-y-3">
                            {otherEntries.map(([key, prop]) => renderOptionInput(key, prop))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* 미리보기 요약 */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
              <ListChecks className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                옵션 설정 기반으로 <span className="font-bold text-slate-800 dark:text-slate-200">{filteredPreviewTasks.length}개</span> 할일이 생성될 예정입니다.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 3: 미리보기 + 승인 ── */}
        {step === 'preview' && selectedTemplate && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* 선택된 템플릿 요약 */}
            <SelectedTemplateBanner
              template={selectedTemplate}
              onBack={() => { setStep('select'); setSelectedTemplate(null); }}
            />

            {/* 기준일 (옵션이 없어 step2를 건너뛴 경우) */}
            {!hasOptions && (
              <div className="space-y-1.5">
                <Label htmlFor="baseDatePreview" className="flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  기준일 (행사일/마감일) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="baseDatePreview"
                  type="date"
                  value={baseDate}
                  onChange={(e) => setBaseDate(e.target.value)}
                  required
                />
              </div>
            )}

            {/* 할일 목록 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-blue-600" />
                  생성될 할일 목록
                </h3>
                <span className="text-xs text-slate-400">
                  {finalTasks.length}개 / {filteredPreviewTasks.length}개
                  {removedIndices.size > 0 && (
                    <button
                      onClick={() => setRemovedIndices(new Set())}
                      className="ml-2 text-blue-600 hover:underline"
                    >
                      전체 복원
                    </button>
                  )}
                </span>
              </div>

              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {filteredPreviewTasks.map((task, index) => {
                  const isRemoved = removedIndices.has(index);
                  const p = (task.priority || 'medium') as TaskPriority;
                  const pConfig = PRIORITY_LABELS[p];

                  return (
                    <div
                      key={index}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border transition-all',
                        isRemoved
                          ? 'opacity-40 bg-slate-50 dark:bg-slate-900/30 border-dashed border-slate-300 dark:border-slate-600'
                          : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          isRemoved
                            ? 'line-through text-slate-400'
                            : 'text-slate-800 dark:text-slate-200',
                        )}>
                          {task.condition_key && (
                            <span className="inline-block mr-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                              조건부
                            </span>
                          )}
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDayLabel(task.days_before)}
                          </span>
                          <span className="text-[10px] text-slate-400">{task.dueDate}</span>
                          {task.assignee_role && (
                            <span className="text-[10px] text-slate-400">@{task.assignee_role}</span>
                          )}
                        </div>
                      </div>

                      <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0', pConfig.color)}>
                        {pConfig.label}
                      </span>

                      <button
                        onClick={() => isRemoved
                          ? setRemovedIndices((prev) => { const n = new Set(prev); n.delete(index); return n; })
                          : handleRemoveTask(index)
                        }
                        className={cn(
                          'p-1.5 rounded-lg flex-shrink-0 transition-colors',
                          isRemoved
                            ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20',
                        )}
                        title={isRemoved ? '복원' : '제거'}
                      >
                        {isRemoved ? <ChevronRight className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}

                {filteredPreviewTasks.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    옵션 설정에 따라 생성될 할일이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 하단 액션 ── */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {step === 'preview' && finalTasks.length > 0 && (
              <span>최종 <strong className="text-slate-600 dark:text-slate-300">{finalTasks.length}개</strong> 할일 추가</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>취소</Button>
            {step === 'options' && (
              <Button onClick={goToPreview}>
                할일 미리보기
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 'preview' && (
              <Button
                onClick={handleConfirm}
                disabled={
                  finalTasks.length === 0 ||
                  !baseDate ||
                  (mode === 'generate' && generateMutation.isPending)
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {mode === 'generate' && generateMutation.isPending ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    할일 {finalTasks.length}개 {mode === 'local' ? '추가' : '생성'} 확정
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────── Sub-components ──────────── */

function StepIndicator({ currentStep, hasOptions }: { currentStep: Step; hasOptions: boolean }) {
  const steps: Step[] = hasOptions ? ['select', 'options', 'preview'] : ['select', 'preview'];

  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => {
        const meta = STEP_META[s];
        const num = i + 1;
        const isActive = s === currentStep;
        const isPast = steps.indexOf(currentStep) > i;

        return (
          <div key={s} className="flex items-center gap-1">
            {i > 0 && (
              <div className={cn(
                'w-6 h-px mx-0.5',
                isPast ? 'bg-blue-400' : 'bg-slate-200 dark:bg-slate-700',
              )} />
            )}
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              isActive && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
              isPast && 'text-blue-500 dark:text-blue-400',
              !isActive && !isPast && 'text-slate-400 dark:text-slate-500',
            )}>
              <span className={cn(
                'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold',
                isActive && 'bg-blue-600 text-white',
                isPast && 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300',
                !isActive && !isPast && 'bg-slate-100 dark:bg-slate-700 text-slate-400',
              )}>
                {isPast ? <Check className="h-3 w-3" /> : num}
              </span>
              {meta.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TemplateCard({ template, onSelect }: { template: TaskTemplate; onSelect: (t: TaskTemplate) => void }) {
  const taskCount = (template.tasks || []).length;
  const highCount = (template.tasks || []).filter((t) => t.priority === 'high').length;
  const conditionalCount = (template.tasks || []).filter((t) => t.condition_key).length;
  const maxDay = taskCount > 0 ? Math.max(...template.tasks.map((t) => t.days_before)) : 0;

  return (
    <button
      onClick={() => onSelect(template)}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all',
        'hover:border-blue-400 hover:shadow-md hover:bg-blue-50/50 dark:hover:bg-blue-900/10 dark:hover:border-blue-600',
        'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50',
        'active:scale-[0.99]',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex-shrink-0">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
              {template.name}
            </h3>
            <span className="flex-shrink-0 inline-block rounded-md bg-blue-50 dark:bg-blue-900/50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 dark:text-blue-300">
              {BU_TITLES[template.bu_code]}
            </span>
          </div>
          {template.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
              {template.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
            <span className="font-semibold">할일 {taskCount}개</span>
            {conditionalCount > 0 && (
              <span className="text-violet-500">조건부 {conditionalCount}건</span>
            )}
            {highCount > 0 && (
              <span className="text-rose-500">높음 {highCount}건</span>
            )}
            {maxDay > 0 && (
              <span>D-{maxDay}부터</span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

function SelectedTemplateBanner({ template, onBack }: { template: TaskTemplate; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-blue-800 dark:text-blue-200 truncate">
          {template.name}
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          {BU_TITLES[template.bu_code]} · {template.tasks.length}개 할일
        </p>
      </div>
      <button
        onClick={onBack}
        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
      >
        변경
      </button>
    </div>
  );
}
