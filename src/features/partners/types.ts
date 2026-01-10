export type PartnerEntityType = 'person' | 'organization' | 'team' | 'venue' | 'brand';

export type PartnerSecurityLevel = 'public' | 'internal' | 'restricted' | 'confidential';

export type PartnerSharingPolicy = 'open' | 'bu_shared' | 'request_only' | 'owner_only';

export type PartnerAccessLevel = 'owner' | 'full' | 'view' | 'basic';

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface PartnerCategory {
  id: number;
  name: string;
  name_ko: string;
  entity_types?: PartnerEntityType[];
}

export interface PartnerAffiliation {
  id?: number;
  partner_id: number;
  display_name: string;
  name_ko?: string;
  entity_type: PartnerEntityType;
  relation_type: string;
  role_description?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export interface PartnerMember {
  id?: number;
  partner_id: number;
  display_name: string;
  name_ko?: string;
  entity_type: PartnerEntityType;
  relation_type: string;
  role_description?: string;
  is_active?: boolean;
}

export interface Partner {
  id: number;
  display_name: string;
  name_ko?: string;
  name_en?: string;
  legal_name?: string;
  entity_type: PartnerEntityType;
  nationality?: string;
  email?: string;
  phone?: string;
  website_url?: string;
  metadata: Record<string, any>;
  owner_bu_code: string;
  security_level: PartnerSecurityLevel;
  sharing_policy: PartnerSharingPolicy;
  is_active: boolean;
  tags: string[];
  created_at: string;
  updated_at?: string;
  categories: PartnerCategory[];
  affiliations: PartnerAffiliation[];
  members?: PartnerMember[];
  can_view_details: boolean;
  can_edit?: boolean;
  access_status: 'granted' | 'request_required' | 'pending';
}

export interface PartnerFormData {
  display_name: string;
  name_ko?: string;
  name_en?: string;
  legal_name?: string;
  entity_type: PartnerEntityType;
  nationality?: string;
  email?: string;
  phone?: string;
  website_url?: string;
  metadata: Record<string, any>;
  security_level: PartnerSecurityLevel;
  sharing_policy: PartnerSharingPolicy;
  tags: string[];
  category_ids: number[];
  affiliations: {
    partner_id: number;
    relation_type: string;
    role_description?: string;
  }[];
  shared_bu_codes?: string[];
}

export interface AccessRequest {
  id: number;
  partner_id: number;
  requester_id: string;
  requester_bu_code: string;
  requested_access_level: PartnerAccessLevel;
  reason?: string;
  status: AccessRequestStatus;
  processed_by?: string;
  processed_at?: string;
  rejection_reason?: string;
  valid_until?: string;
  created_at: string;
  partner?: {
    id: number;
    display_name: string;
    entity_type: PartnerEntityType;
    owner_bu_code: string;
  };
  requester?: {
    id: string;
    name: string;
    bu_code: string;
  };
}

export const ENTITY_TYPE_LABELS: Record<PartnerEntityType, string> = {
  person: '사람',
  organization: '회사/조직',
  team: '팀',
  venue: '장소',
  brand: '브랜드',
};

export const ENTITY_TYPE_EMOJI_ICONS: Record<PartnerEntityType, string> = {
  person: '👤',
  organization: '🏢',
  team: '👥',
  venue: '📍',
  brand: '🏷️',
};

export const SECURITY_LEVEL_LABELS: Record<PartnerSecurityLevel, string> = {
  public: '공개',
  internal: '내부',
  restricted: '제한',
  confidential: '기밀',
};

export const SHARING_POLICY_LABELS: Record<PartnerSharingPolicy, string> = {
  open: '전체 공개',
  bu_shared: '사업부 공유',
  request_only: '신청 필요',
  owner_only: '비공개',
};
