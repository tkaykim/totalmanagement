'use client';

import { useState } from 'react';
import { 
  Lock, Mail, Phone, Globe, Users, Edit2, X, 
  User, Building2, UsersRound, MapPin, Tag 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Partner,
  PartnerEntityType,
  ENTITY_TYPE_LABELS,
  SECURITY_LEVEL_LABELS,
  SHARING_POLICY_LABELS,
} from '../types';

const ENTITY_TYPE_ICON_MAP: Record<PartnerEntityType, React.ReactNode> = {
  person: <User className="w-5 h-5" />,
  organization: <Building2 className="w-5 h-5" />,
  team: <UsersRound className="w-5 h-5" />,
  venue: <MapPin className="w-5 h-5" />,
  brand: <Tag className="w-5 h-5" />,
};

const ENTITY_TYPE_ICON_SM: Record<PartnerEntityType, React.ReactNode> = {
  person: <User className="w-4 h-4" />,
  organization: <Building2 className="w-4 h-4" />,
  team: <UsersRound className="w-4 h-4" />,
  venue: <MapPin className="w-4 h-4" />,
  brand: <Tag className="w-4 h-4" />,
};
import { useRequestAccess } from '../hooks/usePartners';
import { useToast } from '@/hooks/use-toast';

interface PartnerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: Partner | null;
  onEdit?: () => void;
}

export function PartnerDetailModal({
  isOpen,
  onClose,
  partner,
  onEdit,
}: PartnerDetailModalProps) {
  const { toast } = useToast();
  const [showAccessRequest, setShowAccessRequest] = useState(false);
  const [accessReason, setAccessReason] = useState('');
  
  const requestAccessMutation = useRequestAccess();

  if (!isOpen || !partner) return null;

  const displayName = partner.name_ko || partner.name_en || partner.display_name;
  const entityIcon = ENTITY_TYPE_ICON_MAP[partner.entity_type];
  const entityLabel = ENTITY_TYPE_LABELS[partner.entity_type];

  const handleRequestAccess = async () => {
    try {
      await requestAccessMutation.mutateAsync({
        partnerId: partner.id,
        data: {
          access_level: 'view',
          reason: accessReason,
        },
      });
      toast({ title: '열람 신청이 완료되었습니다' });
      setShowAccessRequest(false);
      setAccessReason('');
    } catch (error) {
      toast({
        title: '오류가 발생했습니다',
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{entityIcon}</span>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{displayName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700">{entityLabel}</span>
                <span className="px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{partner.owner_bu_code}</span>
                {!partner.can_view_details && (
                  <span className="px-2 py-0.5 rounded text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> 열람 제한
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {partner.can_edit && onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Edit2 className="w-4 h-4" /> 수정
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Access Denied View */}
          {!partner.can_view_details && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6 text-center">
              <Lock className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                상세 정보 열람 권한이 없습니다
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                이 파트너의 상세 정보를 보려면 열람 신청이 필요합니다.
                <br />
                담당 사업부 관리자의 승인 후 열람이 가능합니다.
              </p>

              {!showAccessRequest ? (
                <button
                  onClick={() => setShowAccessRequest(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  열람 신청하기
                </button>
              ) : (
                <div className="text-left space-y-3 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">신청 사유</label>
                  <textarea
                    value={accessReason}
                    onChange={(e) => setAccessReason(e.target.value)}
                    placeholder="열람이 필요한 사유를 입력해주세요..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowAccessRequest(false)}
                      className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleRequestAccess}
                      disabled={requestAccessMutation.isPending}
                      className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {requestAccessMutation.isPending ? '신청 중...' : '신청하기'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">기본 정보</h4>
            
            {partner.name_ko && (
              <InfoRow label="한국어 표기" value={partner.name_ko} />
            )}
            {partner.name_en && (
              <InfoRow label="영문 표기" value={partner.name_en} />
            )}
            {partner.can_view_details && partner.legal_name && (
              <InfoRow label="법적 명칭/본명" value={partner.legal_name} />
            )}
            {partner.nationality && (
              <InfoRow label="국적" value={partner.nationality} />
            )}
          </div>

          {/* Contact Info (only if has access) */}
          {partner.can_view_details && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">연락처</h4>
              
              {partner.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a href={`mailto:${partner.email}`} className="text-blue-600 hover:underline">
                    {partner.email}
                  </a>
                </div>
              )}
              {partner.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <a href={`tel:${partner.phone}`} className="text-blue-600 hover:underline">
                    {partner.phone}
                  </a>
                </div>
              )}
              {partner.website_url && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <a
                    href={partner.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {partner.website_url}
                  </a>
                </div>
              )}
              {!partner.email && !partner.phone && !partner.website_url && (
                <p className="text-sm text-slate-500">등록된 연락처가 없습니다</p>
              )}
            </div>
          )}

          {/* Categories */}
          {partner.categories.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">역할/분야</h4>
              <div className="flex flex-wrap gap-2">
                {partner.categories.map((cat) => (
                  <span key={cat.id} className="px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {cat.name_ko || cat.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Affiliations */}
          {partner.affiliations && partner.affiliations.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">소속</h4>
              <div className="space-y-2">
                {partner.affiliations.map((aff, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      {ENTITY_TYPE_ICON_SM[aff.entity_type]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{aff.display_name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {aff.relation_type === 'exclusive' && '전속'}
                        {aff.relation_type === 'member' && '소속'}
                        {aff.relation_type === 'employee' && '직원'}
                        {aff.relation_type === 'contract' && '계약'}
                        {aff.role_description && ` - ${aff.role_description}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members (for teams/organizations) */}
          {partner.members && partner.members.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                소속 멤버 ({partner.members.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {partner.members.map((member, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400">
                      {ENTITY_TYPE_ICON_SM[member.entity_type]}
                    </div>
                    <div className="truncate">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                        {member.name_ko || member.display_name}
                      </p>
                      {member.role_description && (
                        <p className="text-xs text-slate-500 truncate">
                          {member.role_description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata (only if has access) */}
          {partner.can_view_details && partner.metadata && Object.keys(partner.metadata).length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">추가 정보</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(partner.metadata)
                  .filter(([_, value]) => value !== null && value !== '')
                  .slice(0, 10)
                  .map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="text-slate-500">{formatMetadataKey(key)}: </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{formatMetadataValue(value)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {partner.tags && partner.tags.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">태그</h4>
              <div className="flex flex-wrap gap-1">
                {partner.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded text-xs border border-slate-300 dark:border-slate-600">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Security Info (only for owners) */}
          {partner.can_edit && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">관리 정보</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">보안 등급: </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-slate-200 dark:bg-slate-600">
                    {SECURITY_LEVEL_LABELS[partner.security_level]}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">공유 정책: </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-slate-200 dark:bg-slate-600">
                    {SHARING_POLICY_LABELS[partner.sharing_policy]}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="text-slate-500 w-28 flex-shrink-0">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function formatMetadataKey(key: string): string {
  const keyMap: Record<string, string> = {
    business_registration_number: '사업자번호',
    representative_name: '대표자명',
    industry: '업종',
    gender: '성별',
    bank_name: '은행',
    account_number: '계좌번호',
    visa_type: '비자',
    visa_start: '비자시작',
    visa_end: '비자만료',
    contract_start: '계약시작',
    contract_end: '계약만료',
    note: '비고',
    platform: '플랫폼',
    subscribers_count: '구독자',
    engagement_rate: '참여율',
    agency: '소속사',
    specialties: '전문분야',
  };
  return keyMap[key] || key.replace(/_/g, ' ');
}

function formatMetadataValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
