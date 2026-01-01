'use client';

import { useState, useMemo } from 'react';
import { X, Users, Plus, TrendingUp, TrendingDown, Edit3, Trash2, UserCircle, DollarSign, Search, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Project, FinancialEntry, ProjectParticipant, Dancer, BU } from '@/types/database';
import { dbFinancialToFrontend, frontendFinancialToDb } from '@/features/erp/utils';
import { useDancers, useArtists, useCreateFinancialEntry, useUpdateFinancialEntry, useDeleteFinancialEntry, useUpdateProject } from '@/features/erp/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ProjectDetailModalProps {
  project: Project;
  financialEntries: FinancialEntry[];
  onClose: () => void;
}

type FinancialType = 'revenue' | 'expense';
type FinancialEntryStatus = 'planned' | 'paid' | 'canceled';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

// 숫자에 천 단위 구분자 추가
function formatNumberWithCommas(value: string): string {
  // 숫자만 추출
  const numbers = value.replace(/[^\d]/g, '');
  // 천 단위 구분자 추가
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 포맷된 숫자 문자열을 숫자로 변환
function parseFormattedNumber(value: string): number {
  return Number(value.replace(/[^\d]/g, ''));
}

// 금액 입력 필드 컴포넌트
function AmountInputField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const formattedValue = useMemo(() => {
    if (!value) return '';
    return formatNumberWithCommas(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // 숫자만 추출하여 저장
    const numbers = inputValue.replace(/[^\d]/g, '');
    onChange(numbers);
  };

  return (
    <label className={cn('space-y-1.5', className)}>
      {label && (
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      )}
      <div className="relative">
        <input
          type="text"
          value={formattedValue}
          placeholder={placeholder}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 pr-12 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400 pointer-events-none">
          원
        </span>
      </div>
    </label>
  );
}

// 간단한 입력 필드 컴포넌트
function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  if (type === 'date') {
    return (
      <label className={cn('space-y-1.5', className)}>
        {label && (
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        )}
        <input
          type="date"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
        />
      </label>
    );
  }

  return (
    <label className={cn('space-y-1.5', className)}>
      {label && (
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      )}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={cn('space-y-1.5', className)}>
      {label && (
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      )}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProjectDetailModal({ project, financialEntries, onClose }: ProjectDetailModalProps) {
  const [addingFinancial, setAddingFinancial] = useState<FinancialType | null>(null);
  const [editingFinancial, setEditingFinancial] = useState<FinancialEntry | null>(null);
  const [deletingFinancial, setDeletingFinancial] = useState<string | null>(null);

  // 참여자별 페이 입력 상태
  const [participantPayments, setParticipantPayments] = useState<Record<string, { amount: string; date: string; status: FinancialEntryStatus }>>({});

  // 참여자 추가/수정 관련 상태
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [participantSearchQuery, setParticipantSearchQuery] = useState('');
  const [participantSearchOpen, setParticipantSearchOpen] = useState(false);
  const [selectedDancerId, setSelectedDancerId] = useState<number | null>(null);
  const [participantRole, setParticipantRole] = useState('댄서참여');

  const queryClient = useQueryClient();
  const { data: dancers = [] } = useDancers('GRIGO');
  const { data: artists = [] } = useArtists('GRIGO');
  const createFinancialMutation = useCreateFinancialEntry();
  const updateFinancialMutation = useUpdateFinancialEntry();
  const deleteFinancialMutation = useDeleteFinancialEntry();
  const updateProjectMutation = useUpdateProject();

  const frontendEntries = financialEntries.map((entry) => dbFinancialToFrontend(entry));
  const participants = (project.participants as ProjectParticipant[]) || [];

  // 참여자 정보 가져오기
  const participantDetails = useMemo(() => {
    return participants.map((participant) => {
      if (participant.dancer_id) {
        const dancer = dancers.find((d: Dancer) => d.id === participant.dancer_id);
        if (dancer) {
          return {
            id: `dancer-${participant.dancer_id}`,
            participantId: participant.dancer_id,
            name: dancer.nickname_ko || dancer.nickname_en || dancer.real_name || dancer.name || '',
            role: participant.role || '댄서참여',
            isPM: participant.is_pm || false,
            type: 'dancer' as const,
          };
        }
      }
      if (participant.user_id) {
        return {
          id: `user-${participant.user_id}`,
          participantId: participant.user_id,
          name: '사용자',
          role: participant.role || '참여자',
          isPM: participant.is_pm || false,
          type: 'user' as const,
        };
      }
      return {
        id: `other-${Math.random()}`,
        participantId: '',
        name: participant.role || '참여자',
        role: participant.role || '참여자',
        isPM: participant.is_pm || false,
        type: 'other' as const,
      };
    });
  }, [participants, dancers]);

  // 매출/지출 분리
  const revenues = frontendEntries.filter((e) => e.type === 'revenue');
  const expenses = frontendEntries.filter((e) => e.type === 'expense');

  // 총계 계산
  const totalRevenue = revenues.reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalProfit = totalRevenue - totalExpense;

  // 참여자 페이먼트 여부 확인
  const isParticipantPayment = (entry: ReturnType<typeof dbFinancialToFrontend>) => {
    if (entry.type !== 'expense') return false;
    return participantDetails.some((p) => entry.name.includes(p.name));
  };

  // 매출/지출 추가 폼 상태
  const [financialForm, setFinancialForm] = useState({
    type: 'revenue' as FinancialType,
    cat: '',
    name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'planned' as FinancialEntryStatus,
  });

  // 참여자 페이 추가
  const handleAddParticipantPayment = async (participantId: string, participantName: string) => {
    const payment = participantPayments[participantId];
    if (!payment || !payment.amount) {
      alert('금액을 입력해주세요.');
      return;
    }

    try {
      const dbData = frontendFinancialToDb({
        projectId: String(project.id),
        bu: project.bu_code,
        type: 'expense',
        category: '참여자 페이',
        name: `${participantName} 페이`,
        amount: parseFormattedNumber(payment.amount),
        date: payment.date || new Date().toISOString().split('T')[0],
        status: payment.status || 'planned',
      });
      await createFinancialMutation.mutateAsync(dbData);
      // 등록 후에도 입력값 유지 (초기화하지 않음)
      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
    } catch (error) {
      console.error('Failed to create participant payment:', error);
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  const handleCreateFinancial = async () => {
    if (!financialForm.cat || !financialForm.name || !financialForm.amount) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const dbData = frontendFinancialToDb({
        projectId: String(project.id),
        bu: project.bu_code,
        type: financialForm.type,
        category: financialForm.cat,
        name: financialForm.name,
        amount: parseFormattedNumber(financialForm.amount),
        date: financialForm.date,
        status: financialForm.status,
      });
      await createFinancialMutation.mutateAsync(dbData);
      setAddingFinancial(null);
      setFinancialForm({
        type: 'revenue',
        cat: '',
        name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'planned',
      });
      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
    } catch (error) {
      console.error('Failed to create financial entry:', error);
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateFinancial = async () => {
    if (!editingFinancial || !financialForm.cat || !financialForm.name || !financialForm.amount) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const dbData = frontendFinancialToDb({
        projectId: String(project.id),
        bu: project.bu_code,
        type: financialForm.type,
        category: financialForm.cat,
        name: financialForm.name,
        amount: parseFormattedNumber(financialForm.amount),
        date: financialForm.date,
        status: financialForm.status,
      });
      await updateFinancialMutation.mutateAsync({ id: Number(editingFinancial.id), data: dbData });
      setEditingFinancial(null);
      setFinancialForm({
        type: 'revenue',
        cat: '',
        name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'planned',
      });
      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
    } catch (error) {
      console.error('Failed to update financial entry:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteFinancial = async () => {
    if (!deletingFinancial) return;

    try {
      await deleteFinancialMutation.mutateAsync(Number(deletingFinancial));
      setDeletingFinancial(null);
      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
    } catch (error) {
      console.error('Failed to delete financial entry:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const startAdding = (type: FinancialType) => {
    setAddingFinancial(type);
    setEditingFinancial(null);
    setFinancialForm({
      type,
      cat: '',
      name: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      status: 'planned',
    });
  };

  const startEditing = (entry: FinancialEntry) => {
    const frontendEntry = dbFinancialToFrontend(entry);
    setEditingFinancial(entry);
    setAddingFinancial(null);
    setFinancialForm({
      type: frontendEntry.type,
      cat: frontendEntry.category,
      name: frontendEntry.name,
      amount: String(frontendEntry.amount),
      date: frontendEntry.date,
      status: frontendEntry.status,
    });
  };

  // 참여자 추가
  const handleAddParticipant = async () => {
    if (!selectedDancerId) {
      alert('댄서를 선택해주세요.');
      return;
    }

    try {
      const currentParticipants = (project.participants as ProjectParticipant[]) || [];
      const newParticipant: ProjectParticipant = {
        dancer_id: selectedDancerId,
        role: participantRole,
        is_pm: false,
      };

      await updateProjectMutation.mutateAsync({
        id: project.id,
        data: {
          participants: [...currentParticipants, newParticipant],
        },
      });

      setAddingParticipant(false);
      setSelectedDancerId(null);
      setParticipantSearchQuery('');
      setParticipantRole('댄서참여');
      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (error) {
      console.error('Failed to add participant:', error);
      alert('참여자 추가 중 오류가 발생했습니다.');
    }
  };

  // 참여자 삭제
  const handleDeleteParticipant = async (participantIndex: number) => {
    try {
      const currentParticipants = (project.participants as ProjectParticipant[]) || [];
      const updatedParticipants = currentParticipants.filter((_, index) => index !== participantIndex);

      await updateProjectMutation.mutateAsync({
        id: project.id,
        data: {
          participants: updatedParticipants,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (error) {
      console.error('Failed to delete participant:', error);
      alert('참여자 삭제 중 오류가 발생했습니다.');
    }
  };

  // 참여자 역할 수정
  const handleUpdateParticipantRole = async (participantIndex: number, newRole: string) => {
    try {
      const currentParticipants = (project.participants as ProjectParticipant[]) || [];
      const updatedParticipants = currentParticipants.map((p, index) =>
        index === participantIndex ? { ...p, role: newRole } : p
      );

      await updateProjectMutation.mutateAsync({
        id: project.id,
        data: {
          participants: updatedParticipants,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (error) {
      console.error('Failed to update participant role:', error);
      alert('참여자 역할 수정 중 오류가 발생했습니다.');
    }
  };

  // 댄서 검색 필터
  const filteredDancers = useMemo(() => {
    if (!participantSearchQuery.trim()) return [];
    const query = participantSearchQuery.toLowerCase();
    return dancers.filter((dancer: Dancer) => {
      const name = (dancer.nickname_ko || dancer.nickname_en || dancer.real_name || dancer.name || '').toLowerCase();
      const team = (dancer.team_name || '').toLowerCase();
      const company = (dancer.company || '').toLowerCase();
      const nationality = (dancer.nationality || '').toLowerCase();
      const contact = (dancer.contact || '').toLowerCase();
      return name.includes(query) || team.includes(query) || company.includes(query) || nationality.includes(query) || contact.includes(query);
    });
  }, [participantSearchQuery, dancers]);

  const DANCER_ROLES = [
    { value: '댄서참여', label: '댄서참여' },
    { value: '안무', label: '안무' },
    { value: '보조', label: '보조' },
    { value: '기타', label: '기타' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">프로젝트 상세보기</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 프로젝트 기본 정보 */}
          <div>
            <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{project.name}</h4>
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <span
                className={cn(
                  'rounded-full px-2 py-1 text-xs font-semibold',
                  project.status === '진행중' || project.status === '운영중'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : project.status === '완료'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                )}
              >
                {project.status}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                카테고리
              </p>
              <p className="text-sm text-slate-900 dark:text-slate-100">{project.category}</p>
            </div>
            {project.pm_name && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  PM
                </p>
                <p className="text-sm text-slate-900 dark:text-slate-100">{project.pm_name}</p>
              </div>
            )}
            {project.start_date && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  시작일
                </p>
                <p className="text-sm text-slate-900 dark:text-slate-100">
                  {format(parseISO(project.start_date), 'yyyy-MM-dd', { locale: ko })}
                </p>
              </div>
            )}
            {project.end_date && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  종료일
                </p>
                <p className="text-sm text-slate-900 dark:text-slate-100">
                  {format(parseISO(project.end_date), 'yyyy-MM-dd', { locale: ko })}
                </p>
              </div>
            )}
          </div>

          {/* 참여자 정보 및 페이 입력 */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  참여자 및 페이
                </p>
              </div>
              <button
                onClick={() => setAddingParticipant(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                참여자 추가
              </button>
            </div>

            {/* 참여자 추가 폼 */}
            {addingParticipant && (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/20 p-4 space-y-3 mb-4">
                <div className="space-y-3">
                  <div className="relative">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        placeholder="댄서 이름, 소속팀, 소속사로 검색..."
                        value={participantSearchQuery}
                        onChange={(e) => setParticipantSearchQuery(e.target.value)}
                        onFocus={() => setParticipantSearchOpen(true)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    {participantSearchOpen && participantSearchQuery.trim() && (
                      <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                        {filteredDancers.length > 0 ? (
                          <div className="p-2">
                            {filteredDancers.map((dancer: Dancer) => {
                              const isSelected = selectedDancerId === dancer.id;
                              const displayName = dancer.nickname_ko || dancer.nickname_en || dancer.real_name || dancer.name || '';
                              return (
                                <button
                                  key={dancer.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedDancerId(dancer.id);
                                    setParticipantSearchOpen(false);
                                    setParticipantSearchQuery(displayName);
                                  }}
                                  className={cn(
                                    'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between',
                                    isSelected
                                      ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-900 dark:text-slate-100',
                                  )}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{displayName}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {dancer.team_name && <span>{dancer.team_name}</span>}
                                      {dancer.company && (
                                        <>
                                          {dancer.team_name && <span> • </span>}
                                          <span>{dancer.company}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && <Check size={16} className="text-indigo-600 dark:text-indigo-300 flex-shrink-0 ml-2" />}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">검색 결과가 없습니다</div>
                        )}
                      </div>
                    )}
                  </div>
                  <SelectField
                    label="참여 방식"
                    value={participantRole}
                    onChange={(v) => setParticipantRole(v)}
                    options={DANCER_ROLES}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddParticipant}
                    disabled={!selectedDancerId}
                    className={cn(
                      'px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors',
                      !selectedDancerId && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    추가
                  </button>
                  <button
                    onClick={() => {
                      setAddingParticipant(false);
                      setSelectedDancerId(null);
                      setParticipantSearchQuery('');
                      setParticipantRole('댄서참여');
                    }}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {participantDetails.length > 0 ? (
              <Accordion type="multiple" className="space-y-2">
                {participantDetails.map((participant, index) => {
                  const payment = participantPayments[participant.id] || {
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    status: 'planned' as FinancialEntryStatus,
                  };
                  const originalParticipant = participants[index];

                  return (
                    <AccordionItem key={participant.id} value={participant.id} className="border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 px-4">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{participant.name}</span>
                            {participant.isPM && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-[10px] font-semibold">
                                PM
                              </span>
                            )}
                            <span className="text-xs text-slate-500 dark:text-slate-400">({participant.role})</span>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={participant.role}
                              onChange={(e) => handleUpdateParticipantRole(index, e.target.value)}
                              className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                              {DANCER_ROLES.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleDeleteParticipant(index)}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-2 pb-3 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex-1">
                              <AmountInputField
                                label="금액"
                                placeholder="금액"
                                value={payment.amount}
                                onChange={(v) =>
                                  setParticipantPayments((prev) => ({
                                    ...prev,
                                    [participant.id]: { ...payment, amount: v },
                                  }))
                                }
                              />
                            </div>
                            <div className="flex-1">
                              <InputField
                                label="지급일"
                                type="date"
                                value={payment.date}
                                onChange={(v) =>
                                  setParticipantPayments((prev) => ({
                                    ...prev,
                                    [participant.id]: { ...payment, date: v },
                                  }))
                                }
                              />
                            </div>
                            <div className="sm:w-32">
                              <SelectField
                                label="상태"
                                value={payment.status}
                                onChange={(v) =>
                                  setParticipantPayments((prev) => ({
                                    ...prev,
                                    [participant.id]: { ...payment, status: v as FinancialEntryStatus },
                                  }))
                                }
                                options={[
                                  { value: 'planned', label: '예정' },
                                  { value: 'paid', label: '완료' },
                                ]}
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                onClick={() => handleAddParticipantPayment(participant.id, participant.name)}
                                disabled={!payment.amount}
                                className={cn(
                                  'w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1',
                                  payment.amount
                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                    : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed',
                                )}
                                title="페이 등록"
                              >
                                <DollarSign className="h-4 w-4" />
                                등록
                              </button>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">등록된 참여자가 없습니다.</p>
              </div>
            )}
          </div>

          {/* 재무 요약 */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              재무 요약
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-3 sm:p-4">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                  총 매출
                </p>
                <p className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300 break-all">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3 sm:p-4">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                  총 지출
                </p>
                <p className="text-base sm:text-lg font-bold text-red-700 dark:text-red-300 break-all">{formatCurrency(totalExpense)}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 p-3 sm:p-4">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                  순이익
                </p>
                <p className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300 break-all">
                  {formatCurrency(totalProfit)}
                </p>
              </div>
            </div>
          </div>

          {/* 매출 섹션 */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">매출</h4>
                <span className="text-sm text-slate-500 dark:text-slate-400">({revenues.length}건)</span>
              </div>
              <button
                onClick={() => startAdding('revenue')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                매출 추가
              </button>
            </div>

            {/* 매출 추가 폼 */}
            {addingFinancial === 'revenue' && (
              <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/20 p-4 space-y-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField
                    label="카테고리"
                    placeholder="예: 안무제작, 방송출연"
                    value={financialForm.cat}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, cat: v }))}
                  />
                  <InputField
                    label="항목명"
                    placeholder="항목명을 입력하세요"
                    value={financialForm.name}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, name: v }))}
                  />
                  <AmountInputField
                    label="금액"
                    placeholder="금액을 입력하세요"
                    value={financialForm.amount}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, amount: v }))}
                  />
                  <InputField
                    label="날짜"
                    type="date"
                    value={financialForm.date}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, date: v }))}
                  />
                  <SelectField
                    label="상태"
                    value={financialForm.status}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, status: v as FinancialEntryStatus }))}
                    options={[
                      { value: 'planned', label: '예정' },
                      { value: 'paid', label: '완료' },
                      { value: 'canceled', label: '취소' },
                    ]}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateFinancial}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    등록
                  </button>
                  <button
                    onClick={() => setAddingFinancial(null)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 매출 수정 폼 */}
            {editingFinancial && dbFinancialToFrontend(editingFinancial).type === 'revenue' && (
              <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/20 p-4 space-y-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField
                    label="카테고리"
                    placeholder="예: 안무제작, 방송출연"
                    value={financialForm.cat}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, cat: v }))}
                  />
                  <InputField
                    label="항목명"
                    placeholder="항목명을 입력하세요"
                    value={financialForm.name}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, name: v }))}
                  />
                  <AmountInputField
                    label="금액"
                    placeholder="금액을 입력하세요"
                    value={financialForm.amount}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, amount: v }))}
                  />
                  <InputField
                    label="날짜"
                    type="date"
                    value={financialForm.date}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, date: v }))}
                  />
                  <SelectField
                    label="상태"
                    value={financialForm.status}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, status: v as FinancialEntryStatus }))}
                    options={[
                      { value: 'planned', label: '예정' },
                      { value: 'paid', label: '완료' },
                      { value: 'canceled', label: '취소' },
                    ]}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUpdateFinancial}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => setEditingFinancial(null)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 매출 목록 */}
            {revenues.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-900/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">등록된 매출이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {revenues.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.name}</p>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-semibold',
                            entry.status === 'paid'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                              : entry.status === 'canceled'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
                          )}
                        >
                          {entry.status === 'paid' ? '완료' : entry.status === 'canceled' ? '취소' : '예정'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{entry.category}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{entry.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(entry.amount)}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const originalEntry = financialEntries.find((e) => String(e.id) === entry.id);
                            if (originalEntry) startEditing(originalEntry);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="수정"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingFinancial(entry.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 지출 섹션 */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">지출</h4>
                <span className="text-sm text-slate-500 dark:text-slate-400">({expenses.length}건)</span>
              </div>
              <button
                onClick={() => startAdding('expense')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                지출 추가
              </button>
            </div>

            {/* 지출 추가 폼 */}
            {addingFinancial === 'expense' && (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/20 p-4 space-y-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField
                    label="카테고리"
                    placeholder="예: 인건비, 기타 비용"
                    value={financialForm.cat}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, cat: v }))}
                  />
                  <InputField
                    label="항목명"
                    placeholder="항목명을 입력하세요"
                    value={financialForm.name}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, name: v }))}
                  />
                  <AmountInputField
                    label="금액"
                    placeholder="금액을 입력하세요"
                    value={financialForm.amount}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, amount: v }))}
                  />
                  <InputField
                    label="날짜"
                    type="date"
                    value={financialForm.date}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, date: v }))}
                  />
                  <SelectField
                    label="상태"
                    value={financialForm.status}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, status: v as FinancialEntryStatus }))}
                    options={[
                      { value: 'planned', label: '예정' },
                      { value: 'paid', label: '완료' },
                      { value: 'canceled', label: '취소' },
                    ]}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateFinancial}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    등록
                  </button>
                  <button
                    onClick={() => setAddingFinancial(null)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 지출 수정 폼 */}
            {editingFinancial && dbFinancialToFrontend(editingFinancial).type === 'expense' && (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/20 p-4 space-y-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField
                    label="카테고리"
                    placeholder="예: 인건비, 기타 비용"
                    value={financialForm.cat}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, cat: v }))}
                  />
                  <InputField
                    label="항목명"
                    placeholder="항목명을 입력하세요"
                    value={financialForm.name}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, name: v }))}
                  />
                  <AmountInputField
                    label="금액"
                    placeholder="금액을 입력하세요"
                    value={financialForm.amount}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, amount: v }))}
                  />
                  <InputField
                    label="날짜"
                    type="date"
                    value={financialForm.date}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, date: v }))}
                  />
                  <SelectField
                    label="상태"
                    value={financialForm.status}
                    onChange={(v) => setFinancialForm((prev) => ({ ...prev, status: v as FinancialEntryStatus }))}
                    options={[
                      { value: 'planned', label: '예정' },
                      { value: 'paid', label: '완료' },
                      { value: 'canceled', label: '취소' },
                    ]}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUpdateFinancial}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => setEditingFinancial(null)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 지출 목록 */}
            {expenses.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-900/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">등록된 지출이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map((entry) => {
                  const isParticipant = isParticipantPayment(entry);

                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg border',
                        isParticipant
                          ? 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/20'
                          : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20',
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {isParticipant && (
                            <UserCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          )}
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.name}</p>
                          {isParticipant && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-[10px] font-semibold">
                              참여자 페이
                            </span>
                          )}
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-semibold',
                              entry.status === 'paid'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                : entry.status === 'canceled'
                                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
                            )}
                          >
                            {entry.status === 'paid' ? '완료' : entry.status === 'canceled' ? '취소' : '예정'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{entry.category}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{entry.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(entry.amount)}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const originalEntry = financialEntries.find((e) => String(e.id) === entry.id);
                              if (originalEntry) startEditing(originalEntry);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="수정"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingFinancial(entry.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </div>

      {/* 삭제 확인 모달 */}
      {deletingFinancial && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-black text-lg text-slate-900 dark:text-slate-100">정산 내역 삭제</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                정말로 이 정산 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeletingFinancial(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteFinancial}
                  className="px-4 py-2 rounded-xl bg-red-600 text-sm font-black text-white hover:bg-red-700 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
