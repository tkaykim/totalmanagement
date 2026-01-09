'use client';

import { useState, useMemo } from 'react';
import { ModalShell, InputField, SelectField, ModalActions } from './modal-components';
import { CommentSection } from '@/features/comments/components/CommentSection';
import { BU, BU_TITLES, Project, TaskItem } from '../types';

export function CreateTaskModal({
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

export function EditTaskModal({
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
    
    if (usersData?.currentUser?.name) {
      names.add(usersData.currentUser.name);
    }
    
    return Array.from(names).sort();
  }, [orgData, usersData]);

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
