'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Search, Edit3, Trash2, Filter, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BU, Artist, ArtistStatus, ArtistType } from '@/types/database';
import {
  useArtists,
  useCreateArtist,
  useUpdateArtist,
  useDeleteArtist,
} from '@/features/erp/hooks';
import { NationalitySelector } from './NationalitySelector';

// 공통 모달 컴포넌트들
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 flex-shrink-0">
          <h3 className="font-black text-lg text-gray-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={18} className="text-gray-500 dark:text-slate-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
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
      <label className="space-y-1.5">
        <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <input
          type="date"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
        />
      </label>
    );
  }

  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
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
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
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
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
      >
        취소
      </button>
      <button
        onClick={onPrimary}
        className="px-4 py-2 rounded-xl bg-indigo-600 text-sm font-black text-white hover:bg-indigo-700 transition-colors"
      >
        {primaryLabel}
      </button>
    </div>
  );
}

function StatusBadge({ type, text }: { type?: string; text: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    default: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300',
  };

  const key = type?.toLowerCase() || 'default';

  return (
    <span className={cn('px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter', styles[key] || styles.default)}>
      {text}
    </span>
  );
}

// Artist Modal
function ArtistModal({
  artist,
  artists,
  onClose,
  onSubmit,
}: {
  artist?: Artist | null;
  artists: Artist[];
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type?: ArtistType;
    team_id?: number;
    nationality?: string;
    visa_type?: string;
    contract_start: string;
    contract_end: string;
    visa_start?: string;
    visa_end?: string;
    role?: string;
    status?: ArtistStatus;
  }) => void;
}) {
  const [form, setForm] = useState({
    name: artist?.name || '',
    type: (artist?.type || 'individual') as ArtistType,
    team_id: artist?.team_id ? String(artist.team_id) : '',
    nationality: artist?.nationality || '',
    visa_type: artist?.visa_type || '',
    contract_start: artist?.contract_start || '',
    contract_end: artist?.contract_end || '',
    visa_start: artist?.visa_start || '',
    visa_end: artist?.visa_end || '',
    role: artist?.role || '',
    status: (artist?.status || 'Active') as ArtistStatus,
  });

  // 팀 목록 필터링 (type이 'team'인 아티스트만, 현재 편집 중인 아티스트 제외)
  const teamOptions = artists.filter(
    (a) => a.type === 'team' && (!artist || a.id !== artist.id)
  );

  const handleSubmit = () => {
    if (!form.name || !form.contract_start || !form.contract_end) {
      alert('이름, 계약 시작일, 계약 종료일은 필수 항목입니다.');
      return;
    }
    onSubmit({
      ...form,
      team_id: form.team_id ? Number(form.team_id) : undefined,
    });
  };

  return (
    <ModalShell title={artist ? '아티스트 수정' : '아티스트 추가'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="이름 *"
            value={form.name}
            onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
            placeholder="아티스트 이름"
          />
          <SelectField
            label="타입 *"
            value={form.type}
            onChange={(v) => {
              const newType = v as ArtistType;
              setForm((prev) => ({
                ...prev,
                type: newType,
                // 타입이 'team'으로 변경되면 team_id 초기화
                team_id: newType === 'team' ? '' : prev.team_id,
              }));
            }}
            options={[
              { value: 'individual', label: '개인' },
              { value: 'team', label: '팀' },
            ]}
          />
        </div>

        {form.type === 'individual' && teamOptions.length > 0 && (
          <SelectField
            label="소속팀"
            value={form.team_id}
            onChange={(v) => setForm((prev) => ({ ...prev, team_id: v }))}
            options={[
              { value: '', label: '선택 안함' },
              ...teamOptions.map((t) => ({ value: String(t.id), label: t.name })),
            ]}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <NationalitySelector
            label="국적"
            value={form.nationality}
            onChange={(v) => setForm((prev) => ({ ...prev, nationality: v }))}
          />
          <InputField
            label="역할"
            value={form.role}
            onChange={(v) => setForm((prev) => ({ ...prev, role: v }))}
            placeholder="예: 댄스팀 한야, 전속 안무가"
          />
        </div>

        <SelectField
          label="비자 유형"
          value={form.visa_type}
          onChange={(v) => setForm((prev) => ({ ...prev, visa_type: v }))}
          options={[
            { value: '', label: '선택 안함' },
            { value: 'N/A (내국인)', label: 'N/A (내국인)' },
            { value: 'E-6 (예술흥행)', label: 'E-6 (예술흥행)' },
            { value: 'F-2 (거주)', label: 'F-2 (거주)' },
            { value: 'F-4 (재외동포)', label: 'F-4 (재외동포)' },
          ]}
        />

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="계약 시작일 *"
            type="date"
            value={form.contract_start}
            onChange={(v) => setForm((prev) => ({ ...prev, contract_start: v }))}
          />
          <InputField
            label="계약 종료일 *"
            type="date"
            value={form.contract_end}
            onChange={(v) => setForm((prev) => ({ ...prev, contract_end: v }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="비자 시작일"
            type="date"
            value={form.visa_start}
            onChange={(v) => setForm((prev) => ({ ...prev, visa_start: v }))}
          />
          <InputField
            label="비자 종료일"
            type="date"
            value={form.visa_end}
            onChange={(v) => setForm((prev) => ({ ...prev, visa_end: v }))}
          />
        </div>

        <SelectField
          label="상태"
          value={form.status}
          onChange={(v) => setForm((prev) => ({ ...prev, status: v as ArtistStatus }))}
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
            { value: 'Archived', label: 'Archived' },
          ]}
        />

        <ModalActions onPrimary={handleSubmit} onClose={onClose} primaryLabel={artist ? '수정' : '등록'} />
      </div>
    </ModalShell>
  );
}

export function ArtistsView({ bu }: { bu: BU }) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editArtist, setEditArtist] = useState<Artist | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [expandedIndividuals, setExpandedIndividuals] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterNationality, setFilterNationality] = useState<string>('');
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const { data: artistsData = [] } = useArtists(bu);
  const artists = useMemo(() => artistsData, [artistsData]);
  const createArtistMutation = useCreateArtist();
  const updateArtistMutation = useUpdateArtist();
  const deleteArtistMutation = useDeleteArtist();

  // 외부 클릭 시 필터 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilter(false);
      }
    };

    if (showFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilter]);

  // 검색 및 필터링
  const filteredArtists = useMemo(() => {
    let result = artists;

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((artist) => {
        // 이름 검색
        if (artist.name.toLowerCase().includes(query)) return true;
        
        // 국적 검색
        if (artist.nationality?.toLowerCase().includes(query)) return true;
        
        // 역할 검색
        if (artist.role?.toLowerCase().includes(query)) return true;
        
        // 소속팀 검색 (팀 이름 검색)
        if (artist.type === 'individual' && artist.team_id) {
          const team = artists.find((a) => a.id === artist.team_id && a.type === 'team');
          if (team?.name.toLowerCase().includes(query)) return true;
        }
        
        return false;
      });
    }

    // 상태 필터
    if (filterStatus) {
      result = result.filter((artist) => artist.status === filterStatus);
    }

    // 타입 필터
    if (filterType) {
      result = result.filter((artist) => artist.type === filterType);
    }

    // 국적 필터
    if (filterNationality) {
      result = result.filter((artist) => artist.nationality === filterNationality);
    }

    return result;
  }, [artists, searchQuery, filterStatus, filterType, filterNationality]);

  // 고유한 국적 목록 추출
  const uniqueNationalities = useMemo(() => {
    const nationalities = artists
      .map((a) => a.nationality)
      .filter((n): n is string => !!n);
    return Array.from(new Set(nationalities)).sort();
  }, [artists]);

  // 팀과 개인 아티스트를 분리하고 그룹화
  const { teams, unaffiliatedIndividuals } = useMemo(() => {
    const teamsList = filteredArtists.filter((a) => a.type === 'team');
    const individuals = filteredArtists.filter((a) => a.type === 'individual');
    
    // 필터링된 개인 아티스트가 속한 팀 ID들을 찾기
    const teamIdsWithFilteredMembers = new Set(
      individuals
        .filter((ind) => ind.team_id)
        .map((ind) => ind.team_id!)
    );
    
    // 필터링된 개인 멤버가 있지만 팀 자체는 필터링되지 않은 경우를 위해
    // 원본 artists에서 해당 팀들을 가져와서 포함
    const additionalTeams = artists.filter(
      (a) => a.type === 'team' && teamIdsWithFilteredMembers.has(a.id) && !teamsList.some((t) => t.id === a.id)
    );
    
    // 모든 관련 팀 (필터링된 팀 + 추가된 팀)
    const allRelevantTeams = [...teamsList, ...additionalTeams];
    
    // 각 팀에 소속된 개인 아티스트들을 그룹화
    const teamsWithMembers = allRelevantTeams.map((team) => ({
      team,
      members: individuals.filter((ind) => ind.team_id === team.id),
    }));

    // 소속되지 않은 개인 아티스트들
    const unaffiliated = individuals.filter((ind) => !ind.team_id);

    return {
      teams: teamsWithMembers,
      unaffiliatedIndividuals: unaffiliated,
    };
  }, [filteredArtists, artists]);

  // 검색어가 있고 필터링된 멤버가 있는 팀들을 자동으로 펼치기
  useEffect(() => {
    if (searchQuery.trim()) {
      // 필터링된 개인 아티스트들
      const filteredIndividuals = filteredArtists.filter((a) => a.type === 'individual' && a.team_id);
      
      // 필터링된 멤버가 속한 팀 ID들
      const teamIdsWithFilteredMembers = new Set(
        filteredIndividuals.map((ind) => ind.team_id!)
      );
      
      // 해당 팀들을 자동으로 펼치기
      if (teamIdsWithFilteredMembers.size > 0) {
        setExpandedTeams((prev) => {
          const next = new Set(prev);
          teamIdsWithFilteredMembers.forEach((teamId) => {
            next.add(teamId);
          });
          return next;
        });
      }
    } else {
      // 검색어가 없으면 모든 팀 접기
      setExpandedTeams(new Set());
    }
  }, [searchQuery, filteredArtists]);

  const handleDelete = async (id: number) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteArtistMutation.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete artist:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleCreate = async (data: {
    name: string;
    type?: ArtistType;
    team_id?: number;
    nationality?: string;
    visa_type?: string;
    contract_start: string;
    contract_end: string;
    visa_start?: string;
    visa_end?: string;
    role?: string;
    status?: ArtistStatus;
  }) => {
    try {
      await createArtistMutation.mutateAsync({
        bu_code: bu,
        ...data,
      });
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create artist:', error);
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  const handleUpdate = async (id: number, data: Partial<Artist>) => {
    try {
      await updateArtistMutation.mutateAsync({ id, data });
      setEditArtist(null);
    } catch (error) {
      console.error('Failed to update artist:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  // 아티스트 행 렌더링 함수
  const renderArtistRow = (artist: Artist) => {
    const today = new Date();
    const visaEnd = artist.visa_end || '9999-12-31';
    const isVisaUrgent = visaEnd !== '9999-12-31' && visaEnd !== 'N/A' && (new Date(visaEnd).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 60;
    const isContractUrgent = artist.contract_end && (new Date(artist.contract_end).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 60;

    return (
      <tr key={artist.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors group">
        <td className="px-6 py-5">
          <div className="flex items-center gap-4">
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm', artist.role?.includes('한야') ? 'bg-black' : 'bg-gradient-to-br from-indigo-500 to-purple-600')}>
              {artist.name[0]}
            </div>
            <div>
              <p className="font-black text-gray-900 dark:text-slate-100 text-sm">{artist.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">개인</span>
                {artist.role && (
                  <>
                    <span className="text-gray-300 text-[10px]">/</span>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">{artist.role}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-gray-700 dark:text-slate-300">{artist.nationality || 'N/A'}</span>
            <span className="text-gray-300 text-[10px]">/</span>
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">{artist.visa_type || 'N/A'}</span>
          </div>
        </td>
        <td className="px-6 py-5 bg-indigo-50 dark:bg-indigo-900/50/10">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-indigo-400 uppercase">Start</span>
              <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{artist.contract_start}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-indigo-400 uppercase">End</span>
              <span className={cn('text-xs font-black', isContractUrgent ? 'text-red-500' : 'text-gray-900 dark:text-slate-100')}>{artist.contract_end}</span>
            </div>
          </div>
        </td>
        <td className="px-6 py-5 bg-red-50 dark:bg-red-900/50/10">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-red-400 uppercase">Start</span>
              <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{artist.visa_start || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-red-400 uppercase">End</span>
              <span className={cn('text-xs font-black', isVisaUrgent ? 'text-red-500' : 'text-gray-900 dark:text-slate-100')}>{visaEnd === '9999-12-31' ? '무기한' : visaEnd || 'N/A'}</span>
            </div>
          </div>
        </td>
        <td className="px-6 py-5 text-right">
          <StatusBadge type={artist.status === 'Active' ? 'active' : 'default'} text={artist.status} />
        </td>
        <td className="px-6 py-5">
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setEditArtist(artist)} className="text-gray-300 hover:text-indigo-500 transition-colors">
              <Edit3 size={16} />
            </button>
            <button onClick={() => handleDelete(artist.id)} className="text-gray-300 hover:text-red-500 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tighter">전속 아티스트 관리</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">아티스트의 신상 정보, 계약, 비자 상태를 통합 관리합니다.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          아티스트 추가
        </button>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30 flex gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="이름, 국적, 소속팀 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={cn(
                'p-3 bg-white dark:bg-slate-800 border rounded-2xl transition-colors',
                (filterStatus || filterType || filterNationality) || showFilter
                  ? 'border-indigo-300 text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/50'
                  : 'border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 dark:text-indigo-300 hover:border-indigo-200'
              )}
            >
              <Filter size={20} />
            </button>
            {showFilter && (
              <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg p-4 z-50 min-w-[280px]">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">상태</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                    >
                      <option value="">전체</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">타입</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                    >
                      <option value="">전체</option>
                      <option value="individual">개인</option>
                      <option value="team">팀</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block">국적</label>
                    <select
                      value={filterNationality}
                      onChange={(e) => setFilterNationality(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                    >
                      <option value="">전체</option>
                      {uniqueNationalities.map((nat) => (
                        <option key={nat} value={nat}>
                          {nat}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(filterStatus || filterType || filterNationality) && (
                    <button
                      onClick={() => {
                        setFilterStatus('');
                        setFilterType('');
                        setFilterNationality('');
                      }}
                      className="w-full px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:bg-indigo-900/50 rounded-lg transition-colors"
                    >
                      필터 초기화
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-gray-50 dark:bg-slate-900 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700">
              <tr>
                <th className="px-6 py-5">Artist / Role</th>
                <th className="px-6 py-5">Nation / Visa</th>
                <th className="px-6 py-5 bg-indigo-50 dark:bg-indigo-900/50/30 text-indigo-600 dark:text-indigo-300">Contract Period</th>
                <th className="px-6 py-5 bg-red-50 dark:bg-red-900/50/30 text-red-600 dark:text-red-300">Visa Period</th>
                <th className="px-6 py-5 text-right">Status</th>
                <th className="px-6 py-5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* 팀 아코디언 */}
              {teams.map(({ team, members }) => {
                const isExpanded = expandedTeams.has(team.id);
                const toggleExpand = () => {
                  setExpandedTeams((prev) => {
                    const next = new Set(prev);
                    if (next.has(team.id)) {
                      next.delete(team.id);
                    } else {
                      next.add(team.id);
                    }
                    return next;
                  });
                };

                const today = new Date();
                const visaEnd = team.visa_end || '9999-12-31';
                const isVisaUrgent = visaEnd !== '9999-12-31' && visaEnd !== 'N/A' && (new Date(visaEnd).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 60;
                const isContractUrgent = team.contract_end && (new Date(team.contract_end).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 60;

                return (
                  <React.Fragment key={team.id}>
                    <tr
                      onClick={toggleExpand}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <ChevronDown
                            className={cn(
                              'w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform',
                              isExpanded && 'rotate-180'
                            )}
                          />
                          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm', team.role?.includes('한야') ? 'bg-black' : 'bg-gradient-to-br from-indigo-500 to-purple-600')}>
                            {team.name[0]}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 dark:text-slate-100 text-sm">{team.name}</p>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">팀 {members.length > 0 && `(${members.length}명)`}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-700 dark:text-slate-300">{team.nationality || 'N/A'}</span>
                          <span className="text-gray-300 text-[10px]">/</span>
                          <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">{team.visa_type || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 bg-indigo-50 dark:bg-indigo-900/50/10">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-indigo-400 uppercase">Start</span>
                            <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{team.contract_start}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-indigo-400 uppercase">End</span>
                            <span className={cn('text-xs font-black', isContractUrgent ? 'text-red-500' : 'text-gray-900 dark:text-slate-100')}>{team.contract_end}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 bg-red-50 dark:bg-red-900/50/10">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-red-400 uppercase">Start</span>
                            <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{team.visa_start || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-red-400 uppercase">End</span>
                            <span className={cn('text-xs font-black', isVisaUrgent ? 'text-red-500' : 'text-gray-900 dark:text-slate-100')}>{visaEnd === '9999-12-31' ? '무기한' : visaEnd || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <StatusBadge type={team.status === 'Active' ? 'active' : 'default'} text={team.status} />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setEditArtist(team)} className="text-gray-300 hover:text-indigo-500 transition-colors">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(team.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && members.length > 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-0 bg-gray-50 dark:bg-slate-900/30">
                          <div className="pl-16 pr-6 py-4">
                            <table className="w-full">
                              <tbody className="divide-y divide-gray-100">
                                {members.map((member) => renderArtistRow(member))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                    {isExpanded && members.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 pl-16 bg-gray-50 dark:bg-slate-900/30 text-gray-400 dark:text-slate-500 text-xs">
                          소속된 멤버가 없습니다.
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* 소속되지 않은 개인 아티스트 (아코디언으로 표시) */}
              {unaffiliatedIndividuals.map((artist) => {
                const isExpanded = expandedIndividuals.has(artist.id);
                const toggleExpand = () => {
                  setExpandedIndividuals((prev) => {
                    const next = new Set(prev);
                    if (next.has(artist.id)) {
                      next.delete(artist.id);
                    } else {
                      next.add(artist.id);
                    }
                    return next;
                  });
                };

                return (
                  <React.Fragment key={artist.id}>
                    <tr
                      onClick={toggleExpand}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <ChevronDown
                            className={cn(
                              'w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform',
                              isExpanded && 'rotate-180'
                            )}
                          />
                          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm', artist.role?.includes('한야') ? 'bg-black' : 'bg-gradient-to-br from-indigo-500 to-purple-600')}>
                            {artist.name[0]}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 dark:text-slate-100 text-sm">{artist.name}</p>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">개인</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-700 dark:text-slate-300">{artist.nationality || 'N/A'}</span>
                          <span className="text-gray-300 text-[10px]">/</span>
                          <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">{artist.visa_type || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 bg-indigo-50 dark:bg-indigo-900/50/10">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-indigo-400 uppercase">Start</span>
                            <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{artist.contract_start}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-indigo-400 uppercase">End</span>
                            <span className="text-xs font-black text-gray-900 dark:text-slate-100">{artist.contract_end}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 bg-red-50 dark:bg-red-900/50/10">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-red-400 uppercase">Start</span>
                            <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{artist.visa_start || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-red-400 uppercase">End</span>
                            <span className="text-xs font-black text-gray-900 dark:text-slate-100">{artist.visa_end === '9999-12-31' ? '무기한' : artist.visa_end || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <StatusBadge type={artist.status === 'Active' ? 'active' : 'default'} text={artist.status} />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setEditArtist(artist)} className="text-gray-300 hover:text-indigo-500 transition-colors">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(artist.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-6 py-0 bg-gray-50 dark:bg-slate-900/30">
                          <div className="pl-16 pr-6 py-4">
                            {/* 개인 아티스트는 상세 정보 표시 (추가 정보가 필요하면 여기에 추가) */}
                            <div className="text-xs text-gray-500 dark:text-slate-400">
                              {artist.role && (
                                <div className="mb-2">
                                  <span className="font-bold text-gray-700 dark:text-slate-300">역할:</span> {artist.role}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* 빈 상태 */}
              {artists.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">
                    등록된 아티스트가 없습니다.
                  </td>
                </tr>
              )}
              {artists.length > 0 && filteredArtists.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <ArtistModal
          artists={artists}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreate}
        />
      )}

      {editArtist && (
        <ArtistModal
          artist={editArtist}
          artists={artists}
          onClose={() => setEditArtist(null)}
          onSubmit={(data) => handleUpdate(editArtist.id, data)}
        />
      )}
    </div>
  );
}



