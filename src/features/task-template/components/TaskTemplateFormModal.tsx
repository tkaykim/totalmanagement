'use client';

import { useState, useEffect } from 'react';
import { useCreateTaskTemplate, useUpdateTaskTemplate } from '../hooks';
import type { BU, TaskTemplateOptionsSchema, TaskTemplateTask, TaskPriority, TaskTemplate } from '@/types/database';
import { X, Plus, GripVertical, ChevronUp, ChevronDown, Trash2, HelpCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskTemplateFormModalProps {
  template?: TaskTemplate | null;
  defaultBu: BU;
  onClose: () => void;
}

const TEMPLATE_TYPE_OPTIONS = [
  { value: 'event', label: '행사/이벤트' },
  { value: 'content', label: '콘텐츠 제작' },
  { value: 'project', label: '프로젝트 일반' },
  { value: 'onboarding', label: '온보딩/입사' },
  { value: 'release', label: '출시/릴리즈' },
  { value: 'marketing', label: '마케팅 캠페인' },
  { value: 'custom', label: '기타 (직접 입력)' },
];

const BU_OPTIONS: { value: BU; label: string }[] = [
  { value: 'GRIGO', label: '그리고 엔터' },
  { value: 'REACT', label: '리액트 스튜디오' },
  { value: 'FLOW', label: '플로우메이커' },
  { value: 'AST', label: '아스트 컴퍼니' },
  { value: 'MODOO', label: '모두굿즈' },
  { value: 'HEAD', label: '본사' },
];

export function TaskTemplateFormModal({ template, defaultBu, onClose }: TaskTemplateFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState('');
  const [customType, setCustomType] = useState('');
  const [buCode, setBuCode] = useState<BU>(defaultBu);
  const [tasks, setTasks] = useState<TaskTemplateTask[]>([]);
  const [optionsSchema, setOptionsSchema] = useState<TaskTemplateOptionsSchema>({
    type: 'object',
    properties: {},
    required: [],
  });

  const createMutation = useCreateTaskTemplate();
  const updateMutation = useUpdateTaskTemplate();

  const isCustomType = templateType === 'custom';
  const effectiveType = isCustomType ? customType : templateType;

  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setDescription(template.description || '');
      const matchingType = TEMPLATE_TYPE_OPTIONS.find(o => o.value === template.template_type);
      if (matchingType && matchingType.value !== 'custom') {
        setTemplateType(template.template_type);
      } else {
        setTemplateType('custom');
        setCustomType(template.template_type || '');
      }
      setBuCode(template.bu_code);
      setTasks(template.tasks || []);
      setOptionsSchema(template.options_schema || { type: 'object', properties: {}, required: [] });
    }
  }, [template]);

  const handleAddTask = () => {
    setTasks([...tasks, {
      title: '',
      days_before: 0,
      priority: 'medium',
      assignee_role: '',
    }]);
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleUpdateTask = (index: number, field: keyof TaskTemplateTask, value: string | number | null) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  };

  const handleMoveTask = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tasks.length) return;
    const updated = [...tasks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setTasks(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!effectiveType) {
      alert('템플릿 타입을 선택해주세요.');
      return;
    }

    try {
      if (template) {
        await updateMutation.mutateAsync({
          id: template.id,
          params: {
            name,
            description,
            template_type: effectiveType,
            options_schema: optionsSchema,
            tasks,
          },
        });
      } else {
        await createMutation.mutateAsync({
          bu_code: buCode,
          name,
          description,
          template_type: effectiveType,
          options_schema: optionsSchema,
          tasks,
        });
      }
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.';
      alert(msg);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              {template ? '템플릿 수정' : '새 할일 템플릿 만들기'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              반복적인 업무 흐름을 템플릿으로 만들어 프로젝트에 빠르게 적용하세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              기본 정보
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  템플릿 이름 <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 신곡 발매 체크리스트"
                  required
                />
              </div>

              {!template && (
                <div className="space-y-1.5">
                  <Label htmlFor="buCode">
                    사업부 <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={buCode} onValueChange={(value) => setBuCode(value as BU)}>
                    <SelectTrigger id="buCode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BU_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="templateType">
                  템플릿 유형 <span className="text-rose-500">*</span>
                </Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger id="templateType">
                    <SelectValue placeholder="유형을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isCustomType && (
                <div className="space-y-1.5">
                  <Label htmlFor="customType">
                    직접 입력 <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="customType"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="예: visa, choreography"
                    required={isCustomType}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">설명 (선택)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="이 템플릿이 어떤 업무 흐름에 사용되는지 설명해주세요"
              />
            </div>
          </div>

          {/* 할일 목록 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-amber-500" />
                  할일 목록
                  {tasks.length > 0 && (
                    <span className="text-xs font-normal text-slate-400 ml-1">{tasks.length}개</span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  기준일(행사일/마감일)로부터 며칠 전에 시작해야 하는 할일을 등록합니다.
                </p>
              </div>
              <Button type="button" onClick={handleAddTask} variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                할일 추가
              </Button>
            </div>

            {/* 안내 배너 */}
            {tasks.length === 0 && (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                  <Plus className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  아직 등록된 할일이 없습니다
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  위의 "할일 추가" 버튼을 눌러 템플릿에 할일을 추가하세요.
                </p>
                <Button type="button" onClick={handleAddTask} variant="default" size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  첫 할일 추가하기
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div
                  key={index}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30"
                >
                  {/* 할일 헤더 */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-slate-300" />
                      <span className="text-xs font-bold text-slate-500">
                        #{index + 1}
                      </span>
                      {task.title && (
                        <span className="text-xs text-slate-400 truncate max-w-[200px]">
                          {task.title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveTask(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                        title="위로 이동"
                      >
                        <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveTask(index, 'down')}
                        disabled={index === tasks.length - 1}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                        title="아래로 이동"
                      >
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(index)}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                        title="삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 할일 내용 */}
                  <div className="p-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        할일 제목 <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        value={task.title}
                        onChange={(e) => handleUpdateTask(index, 'title', e.target.value)}
                        placeholder="예: 포스터 디자인 시안 준비"
                        required
                        className="bg-white dark:bg-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1">
                          D-Day 기준
                          <span className="text-rose-500">*</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 whitespace-nowrap">D -</span>
                          <Input
                            type="number"
                            value={task.days_before}
                            onChange={(e) => handleUpdateTask(index, 'days_before', parseInt(e.target.value) || 0)}
                            required
                            className="bg-white dark:bg-slate-800"
                            min={-30}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {task.days_before > 0 ? `마감 ${task.days_before}일 전` : task.days_before === 0 ? '당일' : `마감 ${Math.abs(task.days_before)}일 후`}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">우선순위</Label>
                        <Select
                          value={task.priority || 'medium'}
                          onValueChange={(value) => handleUpdateTask(index, 'priority', value as TaskPriority)}
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">낮음</SelectItem>
                            <SelectItem value="medium">보통</SelectItem>
                            <SelectItem value="high">높음</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">담당 역할</Label>
                        <Select
                          value={task.assignee_role || 'none'}
                          onValueChange={(value) => handleUpdateTask(index, 'assignee_role', value === 'none' ? '' : value)}
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-800">
                            <SelectValue placeholder="지정 안 함" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">지정 안 함</SelectItem>
                            <SelectItem value="pm">PM (프로젝트 매니저)</SelectItem>
                            <SelectItem value="manager">매니저</SelectItem>
                            <SelectItem value="staff">스태프</SelectItem>
                            <SelectItem value="designer">디자이너</SelectItem>
                            <SelectItem value="developer">개발자</SelectItem>
                            <SelectItem value="marketing">마케팅</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {tasks.length > 0 && (
              <Button type="button" onClick={handleAddTask} variant="outline" size="sm" className="w-full gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                할일 더 추가
              </Button>
            )}
          </div>

          {/* 하단 액션 */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-400">
              {tasks.length > 0
                ? `${tasks.length}개 할일이 포함된 템플릿`
                : '할일을 1개 이상 추가해야 저장할 수 있습니다'}
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button
                type="submit"
                disabled={!name || !effectiveType || tasks.length === 0 || isSaving}
              >
                {isSaving ? '저장 중...' : (template ? '수정 완료' : '템플릿 생성')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
