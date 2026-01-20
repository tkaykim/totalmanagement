'use client';

import { useState } from 'react';
import { 
  Search, Plus, Users, Filter, ChevronDown, ChevronRight,
  User, Building2, UsersRound, MapPin, Tag, Lock, Edit2,
  Mail, Phone, ExternalLink, MoreHorizontal, Star, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePartners, useCategories, useDeletePartner } from '../hooks/usePartners';
import { useToast } from '@/hooks/use-toast';
import { Partner, PartnerEntityType, ENTITY_TYPE_LABELS } from '../types';
import { UnifiedPartnerModal } from './UnifiedPartnerModal';
import { PartnerDetailModal } from './PartnerDetailModal';
import { AccessRequestsPanel } from './AccessRequestsPanel';
import { useDebounce } from 'react-use';

const ENTITY_TYPE_ICON_MAP: Record<PartnerEntityType, React.ReactNode> = {
  person: <User className="w-4 h-4" />,
  organization: <Building2 className="w-4 h-4" />,
  team: <UsersRound className="w-4 h-4" />,
  venue: <MapPin className="w-4 h-4" />,
  brand: <Tag className="w-4 h-4" />,
};

interface PartnersViewProps {
  currentBu?: string;
  currentUserRole?: string;
}

export function PartnersView({ currentBu = 'ALL', currentUserRole = 'member' }: PartnersViewProps) {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBu, setSelectedBu] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBuDropdown, setShowBuDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showAccessRequests, setShowAccessRequests] = useState(false);
  const [defaultEntityType, setDefaultEntityType] = useState<PartnerEntityType>('person');
  const [deleteConfirmPartner, setDeleteConfirmPartner] = useState<Partner | null>(null);
  
  const deleteMutation = useDeletePartner();

  // Debounce search
  useDebounce(() => {
    setDebouncedSearch(search);
    setPage(1);
  }, 300, [search]);

  // Build query params
  const entityType = selectedTab === 'all' ? undefined : selectedTab as PartnerEntityType;
  
  const { data: partnersData, isLoading } = usePartners({
    bu: selectedBu === 'ALL' ? undefined : selectedBu,
    entity_type: entityType,
    category: selectedCategory || undefined,
    search: debouncedSearch || undefined,
    page,
    limit: 30,
  });

  const { data: categories = [] } = useCategories({ entity_type: entityType });

  const partners = partnersData?.data || [];
  const pagination = partnersData?.pagination;

  const handleOpenCreate = (entityType: PartnerEntityType = 'person') => {
    setSelectedPartner(null);
    setFormMode('create');
    setDefaultEntityType(entityType);
    setIsFormModalOpen(true);
    setShowDropdown(false);
  };

  const handleOpenEdit = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormMode('edit');
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (partner: Partner) => {
    try {
      await deleteMutation.mutateAsync(partner.id);
      toast({ title: '파트너가 삭제되었습니다' });
      setDeleteConfirmPartner(null);
    } catch (error) {
      toast({
        title: '삭제에 실패했습니다',
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  const isLeaderOrAdmin = ['leader', 'admin'].includes(currentUserRole);

  const tabs = [
    { key: 'all', label: '전체', icon: <Users className="w-4 h-4" /> },
    { key: 'person', label: '사람', icon: <User className="w-4 h-4" /> },
    { key: 'organization', label: '회사', icon: <Building2 className="w-4 h-4" /> },
    { key: 'team', label: '팀', icon: <UsersRound className="w-4 h-4" /> },
    { key: 'venue', label: '장소', icon: <MapPin className="w-4 h-4" /> },
    { key: 'brand', label: '브랜드', icon: <Tag className="w-4 h-4" /> },
  ];

  const buOptions = [
    { value: 'ALL', label: '전체' },
    { value: 'GRIGO', label: '그리고엔터' },
    { value: 'FLOW', label: 'FLOW' },
    { value: 'AST', label: 'AST' },
    { value: 'MODOO', label: '모두굿즈' },
    { value: 'REACT', label: '리액트' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">파트너 관리</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            협력사, 인력, 장소 등 모든 파트너를 통합 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLeaderOrAdmin && (
            <button
              onClick={() => setShowAccessRequests(!showAccessRequests)}
              className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              열람 신청
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">파트너 등록</span>
              <span className="sm:hidden">등록</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                {tabs.slice(1).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => handleOpenCreate(tab.key as PartnerEntityType)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    {tab.icon}
                    {tab.label} 등록
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Access Requests Panel */}
      {showAccessRequests && isLeaderOrAdmin && (
        <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4">열람 신청 목록</h3>
          <AccessRequestsPanel />
        </div>
      )}

      {/* Filters - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>
        
        <div className="flex gap-2">
          {/* BU Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <button
              onClick={() => setShowBuDropdown(!showBuDropdown)}
              className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            >
              <span className="truncate">{buOptions.find(b => b.value === selectedBu)?.label}</span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            </button>
            {showBuDropdown && (
              <div className="absolute left-0 top-full mt-1 w-full sm:w-36 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                {buOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSelectedBu(opt.value); setShowBuDropdown(false); }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700",
                      selectedBu === opt.value && "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            >
              <Filter className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{selectedCategory ? categories.find(c => c.name === selectedCategory)?.name_ko : '분야'}</span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            </button>
            {showCategoryDropdown && (
              <div className="absolute right-0 top-full mt-1 w-44 max-h-64 overflow-y-auto bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                <button
                  onClick={() => { setSelectedCategory(''); setShowCategoryDropdown(false); }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700",
                    !selectedCategory && "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                  )}
                >
                  전체
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.name); setShowCategoryDropdown(false); }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700",
                      selectedCategory === cat.name && "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                    )}
                  >
                    {cat.name_ko || cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs - Horizontal Scroll on Mobile */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setSelectedTab(tab.key); setPage(1); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0",
              selectedTab === tab.key
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.key === 'all' && pagination?.total !== undefined && (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                selectedTab === tab.key ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-600"
              )}>
                {pagination.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content - List View */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : partners.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Users className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm">등록된 파트너가 없습니다</p>
            <button
              onClick={() => handleOpenCreate('person')}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              파트너 등록하기
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* List Header - Desktop Only */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <div className="col-span-4">파트너</div>
              <div className="col-span-2">유형</div>
              <div className="col-span-2">소속</div>
              <div className="col-span-2">역할/분야</div>
              <div className="col-span-2 text-right">관리</div>
            </div>

            {/* List Items */}
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {partners.map((partner) => (
                <PartnerListItem
                  key={partner.id}
                  partner={partner}
                  onClick={() => handleOpenDetail(partner)}
                  onEdit={() => handleOpenEdit(partner)}
                  onDelete={() => setDeleteConfirmPartner(partner)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pb-4">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              이전
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {page} / {pagination.totalPages}
            </span>
            <button
              disabled={page === pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <UnifiedPartnerModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        partner={selectedPartner}
        mode={formMode}
        defaultEntityType={defaultEntityType}
      />

      <PartnerDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        partner={selectedPartner}
        onEdit={() => {
          setIsDetailModalOpen(false);
          if (selectedPartner) handleOpenEdit(selectedPartner);
        }}
      />

      {/* Click outside to close dropdowns */}
      {(showDropdown || showBuDropdown || showCategoryDropdown) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowDropdown(false);
            setShowBuDropdown(false);
            setShowCategoryDropdown(false);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">파트너 삭제</h3>
                <p className="text-sm text-slate-500">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              <strong>{deleteConfirmPartner.name_ko || deleteConfirmPartner.display_name}</strong> 파트너를 정말 삭제하시겠습니까?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirmPartner(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmPartner)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PartnerListItemProps {
  partner: Partner;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function PartnerListItem({ partner, onClick, onEdit, onDelete }: PartnerListItemProps) {
  const displayName = partner.name_ko || partner.name_en || partner.display_name;
  const subName = partner.legal_name;
  const entityIcon = ENTITY_TYPE_ICON_MAP[partner.entity_type];
  const entityLabel = ENTITY_TYPE_LABELS[partner.entity_type];
  
  // Check if internal employee (has affiliation to company)
  const isInternalRelated = partner.affiliations?.some(a => 
    a.relation_type === 'employee' || a.relation_type === 'exclusive'
  );

  // Check if GRIGO Entertainment exclusive artist
  const isGrigoExclusiveArtist = partner.affiliations?.some(
    a => a.relation_type === 'exclusive' && 
    (a.display_name?.includes('GRIGO') || a.display_name?.includes('그리고'))
  );

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      {/* Mobile Layout */}
      <div className="sm:hidden p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
            isInternalRelated 
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
          )}>
            {entityIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {displayName}
              </h3>
              {!partner.can_view_details && (
                <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
              )}
            </div>
            {subName && subName !== displayName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {subName}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                isInternalRelated
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              )}>
                {entityIcon}
                {entityLabel}
              </span>
              {partner.affiliations.length > 0 && (
                <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {partner.affiliations[0].display_name}
                </span>
              )}
              {partner.categories.slice(0, 1).map((cat) => (
                <span key={cat.id} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400">
                  {cat.name_ko}
                </span>
              ))}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 self-center" />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 items-center">
        {/* Partner Info */}
        <div className="col-span-4 flex items-center gap-3 min-w-0">
          <div className={cn(
            "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
            isInternalRelated 
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
          )}>
            {entityIcon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {displayName}
              </span>
              {!partner.can_view_details && (
                <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
              )}
              {isGrigoExclusiveArtist && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 font-medium flex items-center gap-0.5">
                  <Star className="w-3 h-3" /> 전속
                </span>
              )}
              {isInternalRelated && !isGrigoExclusiveArtist && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium">
                  내부
                </span>
              )}
            </div>
            {subName && subName !== displayName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {subName}
              </p>
            )}
          </div>
        </div>

        {/* Entity Type */}
        <div className="col-span-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {entityIcon}
            {entityLabel}
          </span>
        </div>

        {/* Affiliation */}
        <div className="col-span-2 text-sm text-slate-600 dark:text-slate-400 truncate">
          {partner.affiliations.length > 0 ? (
            <span className="truncate">{partner.affiliations[0].display_name}</span>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </div>

        {/* Categories */}
        <div className="col-span-2 flex gap-1 flex-wrap">
          {partner.categories.slice(0, 2).map((cat) => (
            <span key={cat.id} className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {cat.name_ko}
            </span>
          ))}
          {partner.categories.length > 2 && (
            <span className="text-xs text-slate-400">+{partner.categories.length - 2}</span>
          )}
        </div>

        {/* Actions */}
        <div className="col-span-2 flex items-center justify-end gap-2">
          <span className="text-xs text-slate-400 mr-2">{partner.owner_bu_code}</span>
          {partner.can_edit && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-500 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                title="수정"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
