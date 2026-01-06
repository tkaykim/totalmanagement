'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Search, Check, Upload, File, Trash2, Download } from 'lucide-react';
import type { BU, Artist, Client, Dancer, ProjectParticipant, ProjectDocument } from '@/types/database';
import { CommentSection } from '@/features/comments/components/CommentSection';
import { cn } from '@/lib/utils';

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

// 검색 가능한 Dancers 선택 컴포넌트
function DancersSelector({
  label,
  dancers,
  selectedIds,
  onSelectionChange,
}: {
  label: string;
  dancers: Dancer[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 검색 필터링
  const filteredDancers = useMemo(() => {
    if (!searchQuery.trim()) return dancers;
    const query = searchQuery.toLowerCase();
    return dancers.filter(
      (dancer) =>
        dancer.name.toLowerCase().includes(query) ||
        dancer.team_name?.toLowerCase().includes(query) ||
        dancer.company?.toLowerCase().includes(query) ||
        dancer.nationality?.toLowerCase().includes(query) ||
        dancer.contact?.toLowerCase().includes(query)
    );
  }, [dancers, searchQuery]);

  // 선택된 댄서들
  const selectedDancers = useMemo(() => {
    return dancers.filter((d) => selectedIds.includes(d.id));
  }, [dancers, selectedIds]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDancer = (dancerId: number) => {
    if (selectedIds.includes(dancerId)) {
      onSelectionChange(selectedIds.filter((id) => id !== dancerId));
    } else {
      onSelectionChange([...selectedIds, dancerId]);
      setSearchQuery(''); // 선택 후 검색어 초기화
      setIsOpen(false); // 드롭다운 닫기
    }
  };

  const removeDancer = (dancerId: number) => {
    onSelectionChange(selectedIds.filter((id) => id !== dancerId));
  };

  return (
    <div className="md:col-span-2 space-y-1.5" ref={containerRef}>
      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">{label}</span>
      
      {/* 선택된 댄서 태그들 */}
      {selectedDancers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedDancers.map((dancer) => (
            <span
              key={dancer.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium"
            >
              {dancer.name}
              {dancer.team_name && <span className="text-xs opacity-75">({dancer.team_name})</span>}
              {dancer.company && <span className="text-xs opacity-75"> • {dancer.company}</span>}
              <button
                type="button"
                onClick={() => removeDancer(dancer.id)}
                className="hover:bg-indigo-100 dark:hover:bg-indigo-900/70 rounded-full p-0.5 transition-colors"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 검색 입력 및 드롭다운 */}
      <div className="relative">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="댄서 이름, 소속팀, 소속사, 국적, 연락처로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
          />
        </div>

        {/* 드롭다운 리스트 */}
        {isOpen && searchQuery.trim() && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {filteredDancers.length > 0 ? (
              <div className="p-2">
                {filteredDancers.map((dancer) => {
                  const isSelected = selectedIds.includes(dancer.id);
                  return (
                    <button
                      key={dancer.id}
                      type="button"
                      onClick={() => toggleDancer(dancer.id)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between',
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-900 dark:text-slate-100'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{dancer.name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {dancer.team_name && <span>{dancer.team_name}</span>}
                          {dancer.company && (
                            <>
                              {dancer.team_name && <span> • </span>}
                              <span>{dancer.company}</span>
                            </>
                          )}
                          {dancer.nationality && (
                            <>
                              {(dancer.team_name || dancer.company) && <span> • </span>}
                              <span>{dancer.nationality}</span>
                            </>
                          )}
                          {dancer.contact && (
                            <>
                              {(dancer.team_name || dancer.company || dancer.nationality) && <span> • </span>}
                              <span>{dancer.contact}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check size={16} className="text-indigo-600 dark:text-indigo-300 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">
                {searchQuery ? '검색 결과가 없습니다' : '등록된 댄서가 없습니다'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 댄서와 역할을 함께 선택하는 컴포넌트
function DancersWithRolesSelector({
  label,
  dancers,
  selectedDancers,
  onSelectionChange,
}: {
  label: string;
  dancers: Dancer[];
  selectedDancers: Array<{ dancer_id: number; role: string }>;
  onSelectionChange: (dancers: Array<{ dancer_id: number; role: string }>) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const DANCER_ROLES = [
    { value: '댄서참여', label: '댄서참여' },
    { value: '어시스트', label: '어시스트' },
    { value: '공동작업', label: '공동작업' },
    { value: '기타', label: '기타' },
  ];

  // 검색 필터링
  const filteredDancers = useMemo(() => {
    if (!searchQuery.trim()) return dancers;
    const query = searchQuery.toLowerCase();
    return dancers.filter(
      (dancer) =>
        dancer.name.toLowerCase().includes(query) ||
        dancer.nickname_ko?.toLowerCase().includes(query) ||
        dancer.nickname_en?.toLowerCase().includes(query) ||
        dancer.real_name?.toLowerCase().includes(query) ||
        dancer.team_name?.toLowerCase().includes(query) ||
        dancer.company?.toLowerCase().includes(query) ||
        dancer.nationality?.toLowerCase().includes(query) ||
        dancer.contact?.toLowerCase().includes(query)
    );
  }, [dancers, searchQuery]);

  // 선택된 댄서 ID 목록
  const selectedIds = useMemo(() => {
    return selectedDancers.map((s) => s.dancer_id);
  }, [selectedDancers]);

  // 선택된 댄서들의 상세 정보
  const selectedDancersWithDetails = useMemo(() => {
    return selectedDancers.map((selected) => {
      const dancer = dancers.find((d) => d.id === selected.dancer_id);
      return {
        ...selected,
        dancer,
      };
    }).filter((item) => item.dancer !== undefined);
  }, [selectedDancers, dancers]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getDancerDisplayName = (dancer: Dancer) => {
    if (dancer.nickname_ko || dancer.nickname_en) {
      return `${dancer.nickname_ko || ''}${dancer.nickname_ko && dancer.nickname_en ? ' / ' : ''}${dancer.nickname_en || ''}`;
    }
    return dancer.real_name || dancer.name || '';
  };

  const toggleDancer = (dancerId: number) => {
    if (selectedIds.includes(dancerId)) {
      onSelectionChange(selectedDancers.filter((s) => s.dancer_id !== dancerId));
    } else {
      onSelectionChange([...selectedDancers, { dancer_id: dancerId, role: '댄서참여' }]);
      setSearchQuery(''); // 선택 후 검색어 초기화
      setIsOpen(false); // 드롭다운 닫기
    }
  };

  const updateDancerRole = (dancerId: number, role: string) => {
    onSelectionChange(
      selectedDancers.map((s) => (s.dancer_id === dancerId ? { ...s, role } : s))
    );
  };

  const removeDancer = (dancerId: number) => {
    onSelectionChange(selectedDancers.filter((s) => s.dancer_id !== dancerId));
  };

  return (
    <div className="md:col-span-2 space-y-1.5" ref={containerRef}>
      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">{label}</span>
      
      {/* 선택된 댄서 목록 */}
      {selectedDancersWithDetails.length > 0 && (
        <div className="space-y-2 mb-2">
          {selectedDancersWithDetails.map(({ dancer_id, role, dancer }) => {
            if (!dancer) return null;
            return (
              <div
                key={dancer_id}
                className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-indigo-700 dark:text-indigo-300 text-sm">
                    {getDancerDisplayName(dancer)}
                  </div>
                  {dancer.team_name && (
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 opacity-75">
                      {dancer.team_name}
                      {dancer.company && ` • ${dancer.company}`}
                    </div>
                  )}
                </div>
                <select
                  value={role}
                  onChange={(e) => updateDancerRole(dancer_id, e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 text-sm font-medium outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  {DANCER_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeDancer(dancer_id)}
                  className="hover:bg-indigo-100 dark:hover:bg-indigo-900/70 rounded-full p-1 transition-colors"
                >
                  <X size={14} className="text-indigo-600 dark:text-indigo-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 검색 입력 및 드롭다운 */}
      <div className="relative">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="댄서 이름, 소속팀, 소속사, 국적, 연락처로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
          />
        </div>

        {/* 드롭다운 리스트 */}
        {isOpen && searchQuery.trim() && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {filteredDancers.length > 0 ? (
              <div className="p-2">
                {filteredDancers.map((dancer) => {
                  const isSelected = selectedIds.includes(dancer.id);
                  return (
                    <button
                      key={dancer.id}
                      type="button"
                      onClick={() => toggleDancer(dancer.id)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between',
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-900 dark:text-slate-100'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{getDancerDisplayName(dancer)}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {dancer.team_name && <span>{dancer.team_name}</span>}
                          {dancer.company && (
                            <>
                              {dancer.team_name && <span> • </span>}
                              <span>{dancer.company}</span>
                            </>
                          )}
                          {dancer.nationality && (
                            <>
                              {(dancer.team_name || dancer.company) && <span> • </span>}
                              <span>{dancer.nationality}</span>
                            </>
                          )}
                          {dancer.contact && (
                            <>
                              {(dancer.team_name || dancer.company || dancer.nationality) && <span> • </span>}
                              <span>{dancer.contact}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check size={16} className="text-indigo-600 dark:text-indigo-300 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">
                {searchQuery ? '검색 결과가 없습니다' : '등록된 댄서가 없습니다'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ProjectModal 컴포넌트
export function ProjectModal({
  project,
  bu,
  clients,
  artists,
  users,
            dancers = [],
            onClose,
            onSubmit,
            forceMode,
            defaultArtistId,
            defaultPmName,
          }: {
            project?: any;
            bu: BU;
            clients: Client[];
            artists: Artist[];
            users: any[];
            dancers?: Dancer[];
  onClose: () => void;
  onSubmit: (data: {
    bu: BU;
    name: string;
    cat: string;
    startDate?: string;
    endDate?: string;
    status: string;
    client_id?: number;
    artist_id?: number;
    pm_name?: string | null;
    participants?: ProjectParticipant[];
  }) => void;
  forceMode?: 'business' | 'artist';
  defaultArtistId?: number;
  defaultPmName?: string;
}) {
  const [mode, setMode] = useState<'business' | 'artist'>(forceMode || 'business');
  
  // 기존 프로젝트의 participants에서 dancer_id가 있는 항목들을 추출
  const initialDancerParticipants = useMemo(() => {
    const participants = (project as any)?.participants || [];
    return participants
      .filter((p: ProjectParticipant) => p.dancer_id !== undefined)
      .map((p: ProjectParticipant) => ({
        dancer_id: p.dancer_id!,
        role: p.role || '댄서참여',
      }));
  }, [project]);

  const [form, setForm] = useState({
    name: project?.name || '',
    cat: project?.cat || '',
    startDate: project?.startDate || '',
    endDate: project?.endDate || '',
    status: project?.status || '기획중',
    client_id: project?.client_id ? String(project.client_id) : '',
    artist_id: project?.artist_id ? String(project.artist_id) : (defaultArtistId ? String(defaultArtistId) : ''),
    pm_name: (project as any)?.pm_name || defaultPmName || '',
    dancerParticipants: initialDancerParticipants,
  });

  // 아티스트 모드 카테고리 옵션
  const artistCategories = [
    { value: '안무제작', label: '안무제작' },
    { value: '방송출연', label: '방송출연' },
    { value: '디렉팅', label: '디렉팅' },
    { value: '워크샵', label: '워크샵' },
    { value: '댄서 참여', label: '댄서 참여' },
    { value: '기타', label: '기타' },
  ];

  // forceMode가 설정되어 있으면 모드 변경 불가
  const effectiveMode = forceMode || mode;

  // 파일 업로드 관련 상태
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileType, setSelectedFileType] = useState<string>('');

  // 프로젝트가 있으면 문서 목록 로드
  useEffect(() => {
    if (project?.id) {
      loadDocuments();
    }
  }, [project?.id]);

  const loadDocuments = async () => {
    if (!project?.id) return;
    setIsLoadingDocuments(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !project?.id) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
      if (selectedFileType) {
        formData.append('file_type', selectedFileType);
      }

      const response = await fetch(`/api/projects/${project.id}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const uploadedDocs = await response.json();
        setDocuments((prev) => [...uploadedDocs, ...prev]);
        setSelectedFileType('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const error = await response.json();
        alert(`파일 업로드 실패: ${error.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!project?.id || !confirm('정말 이 파일을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/projects/${project.id}/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      } else {
        const error = await response.json();
        alert(`파일 삭제 실패: ${error.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('파일 삭제 중 오류가 발생했습니다.');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File size={16} />;
    if (mimeType.startsWith('image/')) return <File size={16} className="text-blue-500" />;
    if (mimeType.includes('pdf')) return <File size={16} className="text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <File size={16} className="text-blue-600" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <File size={16} className="text-green-600" />;
    return <File size={16} />;
  };

  return (
    <ModalShell title={project ? '프로젝트 수정' : '프로젝트 등록'} onClose={onClose}>
      {/* 모드 토글 - forceMode가 없을 때만 표시 */}
      {!forceMode && (
        <div className="mb-6">
          <div className="flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setMode('business')}
              className={cn(
                'px-6 py-2 text-sm font-semibold transition whitespace-nowrap rounded-lg',
                mode === 'business'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
              )}
            >
              비즈니스
            </button>
            <button
              onClick={() => setMode('artist')}
              className={cn(
                'px-6 py-2 text-sm font-semibold transition whitespace-nowrap rounded-lg',
                mode === 'artist'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100'
              )}
            >
              아티스트
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* 카테고리 - 모드에 따라 다르게 표시 */}
        {effectiveMode === 'artist' ? (
          <SelectField
            label="카테고리"
            value={form.cat}
            onChange={(val) => setForm((prev) => ({ ...prev, cat: val }))}
            options={[
              { value: '', label: '선택 안함' },
              ...artistCategories,
            ]}
          />
        ) : (
          <InputField
            label="카테고리"
            placeholder="예: 안무제작"
            value={form.cat}
            onChange={(v) => setForm((prev) => ({ ...prev, cat: v }))}
          />
        )}

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
            { value: '기획중', label: '기획중' },
            { value: '진행중', label: '진행중' },
            { value: '운영중', label: '운영중' },
            { value: '완료', label: '완료' },
          ]}
        />
        {/* PM - 모드에 따라 다르게 표시 */}
        {effectiveMode === 'artist' ? (
          <SelectField
            label="PM"
            value={form.artist_id}
            onChange={(val) => {
              const selectedArtist = artists.find((a) => String(a.id) === val);
              setForm((prev) => ({
                ...prev,
                artist_id: val,
                pm_name: selectedArtist ? selectedArtist.name : null,
              }));
            }}
            options={[
              { value: '', label: '선택 안함' },
              ...artists.map((a) => ({ value: String(a.id), label: a.name })),
            ]}
          />
        ) : (
          <SelectField
            label="PM"
            value={form.pm_name}
            onChange={(val) => setForm((prev) => ({ ...prev, pm_name: val }))}
            options={[
              { value: '', label: '선택 안함' },
              ...users.map((u) => ({ value: u.name || '', label: u.name || '' })).filter((o) => o.value),
            ]}
          />
        )}
        <div className="md:col-span-2">
          <SelectField
            label="클라이언트"
            value={form.client_id}
            onChange={(val) => setForm((prev) => ({ ...prev, client_id: val }))}
            options={[
              { value: '', label: '선택 안함' },
              ...clients.map((c) => ({ value: String(c.id), label: (c as any).company_name_ko || (c as any).company_name_en || '-' })),
            ]}
          />
        </div>
        {/* 참가자/참여댄서 - 모드에 따라 다르게 표시 */}
        {effectiveMode === 'artist' ? (
          <DancersWithRolesSelector
            label="참여댄서"
            dancers={dancers}
            selectedDancers={form.dancerParticipants}
            onSelectionChange={(selected) => setForm((prev) => ({ ...prev, dancerParticipants: selected }))}
          />
        ) : (
          <div className="md:col-span-2">
            <SelectField
              label="참가자"
              value={form.artist_id}
              onChange={(val) => setForm((prev) => ({ ...prev, artist_id: val }))}
              options={[
                { value: '', label: '선택 안함' },
                ...artists.map((a) => ({ value: String(a.id), label: a.name })),
              ]}
            />
          </div>
        )}
      </div>

      {/* 관련 서류 섹션 - 프로젝트가 있을 때만 표시 */}
      {project?.id && (
        <div className="md:col-span-2 space-y-3 border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
              관련 서류
            </span>
            
            {/* 파일 업로드 영역 */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={selectedFileType}
                  onChange={(e) => setSelectedFileType(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">문서 유형 선택 (선택사항)</option>
                  <option value="계약서">계약서</option>
                  <option value="계산서">계산서</option>
                  <option value="견적서">견적서</option>
                  <option value="영수증">영수증</option>
                  <option value="기타">기타</option>
                </select>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                    isUploading
                      ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  )}
                >
                  <Upload size={16} />
                  {isUploading ? '업로드 중...' : '파일 선택'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* 문서 목록 */}
              {isLoadingDocuments ? (
                <div className="text-sm text-gray-500 dark:text-slate-400 py-4 text-center">
                  로딩 중...
                </div>
              ) : documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getFileIcon(doc.mime_type)}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                            {doc.file_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            {doc.file_type && (
                              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs">
                                {doc.file_type}
                              </span>
                            )}
                            {formatFileSize(doc.file_size) && (
                              <span>{formatFileSize(doc.file_size)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/project-documents/${doc.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="다운로드"
                        >
                          <Download size={16} className="text-gray-600 dark:text-slate-400" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-slate-400 py-4 text-center">
                  등록된 문서가 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ModalActions
        onPrimary={() => {
          // 기존 participants 중 dancer_id가 없는 항목들 유지
          const existingParticipants = (project as any)?.participants || [];
          const otherParticipants = existingParticipants.filter(
            (p: ProjectParticipant) => p.dancer_id === undefined
          );
          
          // 새로운 dancer participants 생성
          const dancerParticipants: ProjectParticipant[] = form.dancerParticipants.map((dp) => ({
            dancer_id: dp.dancer_id,
            role: dp.role,
            is_pm: false,
          }));
          
          // 모든 participants 합치기
          const allParticipants = [...otherParticipants, ...dancerParticipants];
          
          onSubmit({
            bu,
            name: form.name,
            cat: form.cat,
            startDate: form.startDate,
            endDate: form.endDate,
            status: form.status,
            client_id: form.client_id ? Number(form.client_id) : undefined,
            artist_id: form.artist_id ? Number(form.artist_id) : undefined,
            pm_name: form.pm_name || null,
            participants: allParticipants.length > 0 ? allParticipants : undefined,
          });
        }}
        onClose={onClose}
        primaryLabel={project ? '수정' : '등록'}
      />
      {project?.id && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
          <CommentSection entityType="project" entityId={Number(project.id)} />
        </div>
      )}
    </ModalShell>
  );
}

