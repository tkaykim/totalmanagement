'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from 'react-use';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ChevronDown, ChevronUp, Plus, Trash2, User, Building2, UsersRound, MapPin, Tag, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategories, useCreatePartner, useUpdatePartner, usePartners } from '../hooks/usePartners';
import {
  Partner,
  PartnerEntityType,
  PartnerFormData,
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_EMOJI_ICONS,
  SECURITY_LEVEL_LABELS,
  SHARING_POLICY_LABELS,
  PartnerSecurityLevel,
  PartnerSharingPolicy,
} from '../types';
import { useToast } from '@/hooks/use-toast';

const ENTITY_TYPE_REACT_ICONS: Record<PartnerEntityType, React.ReactNode> = {
  person: <User className="w-4 h-4" />,
  organization: <Building2 className="w-4 h-4" />,
  team: <UsersRound className="w-4 h-4" />,
  venue: <MapPin className="w-4 h-4" />,
  brand: <Tag className="w-4 h-4" />,
};

const formSchema = z.object({
  display_name: z.string().min(1, '이름을 입력해주세요'),
  name_ko: z.string().optional(),
  name_en: z.string().optional(),
  legal_name: z.string().optional(),
  entity_type: z.enum(['person', 'organization', 'team', 'venue', 'brand']),
  nationality: z.string().optional(),
  email: z.string().email('올바른 이메일을 입력해주세요').optional().or(z.literal('')),
  phone: z.string().optional(),
  website_url: z.string().url('올바른 URL을 입력해주세요').optional().or(z.literal('')),
  security_level: z.enum(['public', 'internal', 'restricted', 'confidential']),
  sharing_policy: z.enum(['open', 'bu_shared', 'request_only', 'owner_only']),
  category_ids: z.array(z.number()),
  tags: z.array(z.string()),
  affiliations: z.array(z.object({
    partner_id: z.number(),
    relation_type: z.string(),
    role_description: z.string().optional(),
  })),
  shared_bu_codes: z.array(z.string()),
  metadata: z.record(z.any()),
});

type FormValues = z.infer<typeof formSchema>;

interface UnifiedPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner?: Partner | null;
  mode: 'create' | 'edit';
  defaultEntityType?: PartnerEntityType;
}

export function UnifiedPartnerModal({
  isOpen,
  onClose,
  partner,
  mode,
  defaultEntityType = 'person',
}: UnifiedPartnerModalProps) {
  const { toast } = useToast();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedEntityType, setSelectedEntityType] = useState<PartnerEntityType>(
    partner?.entity_type || defaultEntityType
  );

  const { data: categories = [] } = useCategories({ entity_type: selectedEntityType });
  const [affiliationSearch, setAffiliationSearch] = useState('');
  const [debouncedAffiliationSearch, setDebouncedAffiliationSearch] = useState('');
  
  // Debounce affiliation search
  useDebounce(() => {
    setDebouncedAffiliationSearch(affiliationSearch);
  }, 300, [affiliationSearch]);
  
  // Fetch organization and team partners for affiliation options
  const { data: teamsAndOrgs, isLoading: isLoadingAffiliations } = usePartners({ 
    limit: 1000,
    search: debouncedAffiliationSearch || undefined,
  });

  const affiliationOptions = useMemo(() => {
    return (teamsAndOrgs?.data || [])
      .filter(p => ['organization', 'team'].includes(p.entity_type) && p.id !== partner?.id)
      .map(p => ({ 
        id: p.id, 
        label: `${ENTITY_TYPE_EMOJI_ICONS[p.entity_type]} ${p.display_name}`,
        display_name: p.display_name,
        entity_type: p.entity_type,
      }))
      .sort((a, b) => {
        // Sort by entity_type first (organization before team), then by name
        if (a.entity_type !== b.entity_type) {
          return a.entity_type === 'organization' ? -1 : 1;
        }
        return a.display_name.localeCompare(b.display_name);
      });
  }, [teamsAndOrgs, partner?.id]);

  const createMutation = useCreatePartner();
  const updateMutation = useUpdatePartner();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      display_name: '',
      entity_type: defaultEntityType,
      security_level: 'internal',
      sharing_policy: 'request_only',
      category_ids: [],
      tags: [],
      affiliations: [],
      shared_bu_codes: [],
      metadata: {},
    },
  });

  const entityType = watch('entity_type');
  const categoryIds = watch('category_ids');
  const affiliations = watch('affiliations');

  useEffect(() => {
    if (partner && mode === 'edit') {
      reset({
        display_name: partner.display_name,
        name_ko: partner.name_ko || '',
        name_en: partner.name_en || '',
        legal_name: partner.legal_name || '',
        entity_type: partner.entity_type,
        nationality: partner.nationality || '',
        email: partner.email || '',
        phone: partner.phone || '',
        website_url: partner.website_url || '',
        security_level: partner.security_level,
        sharing_policy: partner.sharing_policy,
        category_ids: partner.categories.map(c => c.id),
        tags: partner.tags || [],
        affiliations: partner.affiliations?.map(a => ({
          partner_id: a.partner_id,
          relation_type: a.relation_type,
          role_description: a.role_description,
        })) || [],
        shared_bu_codes: [],
        metadata: partner.metadata || {},
      });
      setSelectedEntityType(partner.entity_type);
    } else {
      reset({
        display_name: '',
        entity_type: defaultEntityType,
        security_level: 'internal',
        sharing_policy: 'request_only',
        category_ids: [],
        tags: [],
        affiliations: [],
        shared_bu_codes: [],
        metadata: {},
      });
      setSelectedEntityType(defaultEntityType);
    }
  }, [partner, mode, reset, defaultEntityType, isOpen]);

  useEffect(() => {
    setSelectedEntityType(entityType);
  }, [entityType]);

  const onSubmit = async (data: FormValues) => {
    try {
      const formData: PartnerFormData = {
        display_name: data.display_name,
        name_ko: data.name_ko,
        name_en: data.name_en,
        legal_name: data.legal_name,
        entity_type: data.entity_type,
        nationality: data.nationality,
        email: data.email || undefined,
        phone: data.phone,
        website_url: data.website_url || undefined,
        metadata: data.metadata,
        security_level: data.security_level,
        sharing_policy: data.sharing_policy,
        tags: data.tags,
        category_ids: data.category_ids,
        affiliations: data.affiliations.map(a => ({
          partner_id: a.partner_id,
          relation_type: a.relation_type,
          role_description: a.role_description,
        })),
        shared_bu_codes: data.shared_bu_codes,
      };

      if (mode === 'create') {
        await createMutation.mutateAsync(formData);
        toast({ title: '파트너가 등록되었습니다' });
      } else if (partner) {
        await updateMutation.mutateAsync({ id: partner.id, data: formData });
        toast({ title: '파트너 정보가 수정되었습니다' });
      }
      onClose();
    } catch (error) {
      toast({
        title: '오류가 발생했습니다',
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  const toggleCategory = (categoryId: number) => {
    const current = categoryIds || [];
    if (current.includes(categoryId)) {
      setValue('category_ids', current.filter(id => id !== categoryId));
    } else {
      setValue('category_ids', [...current, categoryId]);
    }
  };

  const addAffiliation = () => {
    setValue('affiliations', [
      ...affiliations,
      { partner_id: 0, relation_type: 'member', role_description: '' },
    ]);
  };

  const removeAffiliation = (index: number) => {
    setValue('affiliations', affiliations.filter((_, i) => i !== index));
  };

  const isPerson = entityType === 'person';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {mode === 'create' ? '파트너 등록' : '파트너 수정'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Entity Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">유형 *</label>
            <Controller
              name="entity_type"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(ENTITY_TYPE_LABELS) as PartnerEntityType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => field.onChange(type)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                        field.value === type
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      )}
                    >
                      {ENTITY_TYPE_REACT_ICONS[type]} {ENTITY_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isPerson ? '활동명/닉네임' : '이름'} *
              </label>
              <input
                {...register('display_name')}
                placeholder={isPerson ? '예: HANYA, 홍길동' : '예: ABC컴퍼니'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.display_name && (
                <p className="text-xs text-red-500">{errors.display_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">국적</label>
              <input
                {...register('nationality')}
                placeholder="예: 한국, 미국"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">한국어 표기</label>
              <input
                {...register('name_ko')}
                placeholder={isPerson ? '예: 한야' : '예: ABC컴퍼니'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">영문 표기</label>
              <input
                {...register('name_en')}
                placeholder={isPerson ? '예: HANYA' : '예: ABC Company'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isPerson ? '본명 (실명)' : '법적 명칭 (사업자등록명)'}
              </label>
              <input
                {...register('legal_name')}
                placeholder={isPerson ? '예: 홍길동' : '예: 주식회사 에이비씨'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">이메일</label>
              <input
                type="email"
                {...register('email')}
                placeholder="example@email.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">연락처</label>
              <input
                {...register('phone')}
                placeholder="010-0000-0000"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">웹사이트</label>
              <input
                {...register('website_url')}
                placeholder="https://"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.website_url && (
                <p className="text-xs text-red-500">{errors.website_url.message}</p>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">역할/분야</label>
            <div className="flex flex-wrap gap-2 p-3 border border-slate-300 dark:border-slate-600 rounded-lg min-h-[60px]">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium transition-colors",
                    categoryIds.includes(cat.id)
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  )}
                >
                  {cat.name_ko || cat.name}
                  {categoryIds.includes(cat.id) && <X className="w-3 h-3 ml-1 inline" />}
                </button>
              ))}
            </div>
          </div>

          {/* Affiliations */}
          {isPerson && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">소속</label>
                <button
                  type="button"
                  onClick={addAffiliation}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> 추가
                </button>
              </div>
              {affiliations.length === 0 ? (
                <p className="text-sm text-slate-500 p-3 border border-slate-300 dark:border-slate-600 rounded-lg">
                  소속된 팀이나 회사가 있다면 추가해주세요
                </p>
              ) : (
                <div className="space-y-2">
                  {/* Affiliation Search */}
                  {affiliations.length > 0 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="소속 검색 (회사/팀 이름으로 검색)..."
                        value={affiliationSearch}
                        onChange={(e) => setAffiliationSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                      {isLoadingAffiliations && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                        </div>
                      )}
                    </div>
                  )}
                  {affiliations.map((_, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 border border-slate-300 dark:border-slate-600 rounded-lg">
                      <div className="flex-1 space-y-2">
                        <Controller
                          name={`affiliations.${index}.partner_id` as const}
                          control={control}
                          render={({ field }) => (
                            <select
                              value={field.value || 0}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              disabled={isLoadingAffiliations}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value={0}>
                                {isLoadingAffiliations ? '로딩 중...' : affiliationOptions.length === 0 ? '소속을 찾을 수 없습니다' : '소속 선택'}
                              </option>
                              {affiliationOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                              ))}
                            </select>
                          )}
                        />
                        <div className="flex gap-2">
                          <Controller
                            name={`affiliations.${index}.relation_type` as const}
                            control={control}
                            render={({ field }) => (
                              <select
                                value={field.value || 'member'}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="w-[120px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                              >
                                <option value="exclusive">전속</option>
                                <option value="member">소속</option>
                                <option value="employee">직원</option>
                                <option value="contract">계약</option>
                              </select>
                            )}
                          />
                          <input
                            {...register(`affiliations.${index}.role_description` as const)}
                            placeholder="역할 설명 (선택)"
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAffiliation(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Advanced Settings */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              고급 설정
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="space-y-4 mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                {/* Security Level */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">보안 등급</label>
                  <select
                    {...register('security_level')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    {(Object.keys(SECURITY_LEVEL_LABELS) as PartnerSecurityLevel[]).map((level) => (
                      <option key={level} value={level}>{SECURITY_LEVEL_LABELS[level]}</option>
                    ))}
                  </select>
                </div>

                {/* Sharing Policy */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">공유 정책</label>
                  <select
                    {...register('sharing_policy')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    {(Object.keys(SHARING_POLICY_LABELS) as PartnerSharingPolicy[]).map((policy) => (
                      <option key={policy} value={policy}>{SHARING_POLICY_LABELS[policy]}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    {watch('sharing_policy') === 'open' && '모든 사업부에서 상세 정보를 열람할 수 있습니다'}
                    {watch('sharing_policy') === 'bu_shared' && '지정된 사업부에서만 열람할 수 있습니다'}
                    {watch('sharing_policy') === 'request_only' && '열람 신청 후 승인되면 볼 수 있습니다'}
                    {watch('sharing_policy') === 'owner_only' && '등록 사업부만 열람할 수 있습니다'}
                  </p>
                </div>

                {/* BU Sharing */}
                {watch('sharing_policy') === 'bu_shared' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">공유할 사업부</label>
                    <div className="flex flex-wrap gap-3">
                      {['GRIGO', 'FLOW', 'AST', 'MODOO', 'REACT'].map((bu) => (
                        <label key={bu} className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            value={bu}
                            {...register('shared_bu_codes')}
                            className="rounded border-slate-300"
                          />
                          {bu}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? '저장 중...' : mode === 'create' ? '등록' : '수정'}
          </button>
        </div>
      </div>
    </div>
  );
}
