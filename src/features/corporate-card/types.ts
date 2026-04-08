// Gowid Open API 타입 정의

// ============================================
// 공통 응답
// ============================================

export interface GowidResponse<T> {
  result: { code: number; desc: string };
  totalCount?: number;
  data: T;
}

// ============================================
// 멤버
// ============================================

export interface GowidMember {
  userId: number;
  userName: string;
  email: string;
  isContractor: boolean;
  status: 'PENDING' | 'NORMAL' | 'PASSWORD_LOCK' | 'ADD_ONLY' | 'INVITATION' | 'INACTIVE' | 'DELETED';
  department: { id?: number; name?: string };
  position: string | null;
  role: {
    type: 'ROLE_MASTER' | 'ROLE_MANAGER' | 'ROLE_VIEWER' | 'ROLE_MEMBER' | 'ROLE_CUSTOM';
    name: string;
    description: string | null;
  };
  notificationOnOff: boolean;
}

// ============================================
// 카드 / 사용자 VO
// ============================================

export interface GowidCardVo {
  cardNumber: string;
  cardUser?: GowidUserVo;
  alias: string;
  limitAmount: number;
  usedAmount: number;
  remainAmount: number;
  companyCode: string;
  namedYn: string;
  cardName: string;
  cardType: string;
  userNm: string;
  invalid: boolean;
}

export interface GowidUserVo {
  userName: string;
  email: string;
  mobileNumber: string;
  isInvitedUser: boolean;
  isContractor: boolean;
  isActivated: boolean;
  position: string;
  activatedAt: string;
  deactivatedAt: string;
  notificationOnOff: boolean;
  status: string;
}

// ============================================
// 용도 (Purpose)
// ============================================

export interface GowidCategory {
  categoryId?: number;
  name?: string;
}

export interface GowidPurposeRequirement {
  id: number;
  type: 'TEXT' | 'SELECT' | 'SELECT_MULTI';
  item: string;
  guideDesc: string;
  isAvailableInput: boolean;
  isRequired: boolean;
  options: string[];
}

export interface GowidPurpose {
  purposeId: number;
  name: string;
  category: GowidCategory;
  listOrder: number;
  limitType: 'PERSON' | 'ITEM';
  limitAmount: number;
  isActivated: boolean;
  requirements: GowidPurposeRequirement[];
  deducted: boolean;
}

export interface GowidPurposeSimple {
  purposeId: number;
  name: string;
  limitType: 'PERSON' | 'ITEM';
  limitAmount: number;
  requirements: GowidPurposeRequirement[];
}

// ============================================
// 지출내역
// ============================================

export type GowidApprovalStatus =
  | 'NOT_SUBMITTED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'PARTIAL_APPROVED'
  | 'REJECTED';

export const APPROVAL_STATUS_LABELS: Record<GowidApprovalStatus, string> = {
  NOT_SUBMITTED: '미제출',
  SUBMITTED: '제출',
  APPROVED: '승인',
  PARTIAL_APPROVED: '부분승인',
  REJECTED: '반려',
};

export const APPROVAL_STATUS_COLORS: Record<GowidApprovalStatus, string> = {
  NOT_SUBMITTED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  PARTIAL_APPROVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
};

export interface GowidParticipant {
  userId: number;
  userName: string;
}

export interface GowidExternalUser {
  name: string;
  company: string;
}

export interface GowidPurposeRequirementAnswer {
  purposeRequirementId: number;
  purposeRequirementName: string;
  answers: string[];
}

export interface GowidExpenseListItem {
  expenseId: number;
  expenseDate: string;
  expenseTime: string;
  useAmount: number;
  currency: string;
  krwAmount: number;
  approvedAmount: number | null;
  approvedAt: string | null;
  approvalStatus: GowidApprovalStatus;
  purpose: GowidPurposeSimple | null;
  cardAlias: string;
  cardUserName: string | null;
  shortCardNumber: string;
  storeName: string;
  storeAddress: string | null;
  memo: string | null;
  commentCount: number;
  evidenceCount: number;
  participantCount: number;
  representativeParticipant: string | null;
  participants: GowidParticipant[];
  expenseExternalUsers: GowidExternalUser[];
  purposeRequirementAnswers: GowidPurposeRequirementAnswer[];
}

export interface GowidExpensePageable {
  totalPages: number;
  totalElements: number;
  last: boolean;
  content: GowidExpenseListItem[];
}

export interface GowidCommentVo {
  author: GowidUserVo;
  content: string;
  createdAt: string;
}

export interface GowidEvidenceVo {
  evidenceId: number;
  fileName: string;
  mimeType: string;
  signedUrl: string;
}

export interface GowidExpenseDetail {
  expenseId: number;
  cardApprovalNumber: string;
  expenseDate: string;
  expenseTime: string;
  card: GowidCardVo;
  user: GowidUserVo;
  useAmount: number;
  currency: string;
  krwAmount: number;
  approvalStatus: GowidApprovalStatus;
  approvedAmount: number | null;
  approvedAt: string | null;
  approvedBy: string | null;
  comments: GowidCommentVo[];
  purpose: {
    name: string;
    category: GowidCategory;
    limitAmount: number;
    listOrder: number;
    isActivated: boolean;
    hasRequirement: boolean;
    limitType: 'PERSON' | 'ITEM';
  } | null;
  participants: GowidUserVo[];
  expenseExternalUsers: GowidExternalUser[];
  storeName: string;
  storeAddress: string | null;
  storeRegistrationNumber: string | null;
  memo: string | null;
  evidenceList: GowidEvidenceVo[];
  companyCode: string;
  commentCount: number;
  purposeRequirementAnswers: GowidPurposeRequirementAnswer[];
  isDomestic: boolean;
  expenseDeductionResDto?: {
    isExpenseDeductible: boolean;
    isDeducted: boolean;
  };
}

export interface GowidExpenseSimple {
  expenseId: number;
  expenseDate: string;
  expenseTime: string;
  useAmount: number;
  currency: string;
  krwAmount: number;
  storeName: string;
  approvalStatus: GowidApprovalStatus;
  cardAlias: string;
  shortCardNumber: string;
}

export interface GowidExpenseSimplePageable {
  totalPages: number;
  totalElements: number;
  last: boolean;
  content: GowidExpenseSimple[];
}

// ============================================
// 검색 조건
// ============================================

export interface ExpenseSearchCriteria {
  memo?: string;
  purposeName?: string;
  userName?: string;
  startDate?: string;
  approvalState?: GowidApprovalStatus;
  cardAlias?: string;
}

// ============================================
// 프로젝트 연결
// ============================================

export interface GowidExpenseProjectLink {
  id: string;
  gowid_expense_id: number;
  project_id: number;
  project_name?: string;
  project_bu?: string;
  linked_by: string;
  linked_by_name?: string;
  created_at: string;
}

// ============================================
// 수정 요청 DTO
// ============================================

export interface ExpensePurposeUpdateRequest {
  purposeId: number;
  purposeRequirementAnswerMap?: Record<string, string[]>;
}

export interface ExpenseParticipantsUpdateRequest {
  participantIds: number[];
  externalUsers: GowidExternalUser[];
}

export interface ExpenseMemoUpdateRequest {
  memo: string;
}

export interface ExpenseApprovalRequest {
  expenseId?: number;
  approvalStatus: GowidApprovalStatus;
  approvedAmount?: number;
  approvedAt?: string;
}

export interface CommentRequest {
  comment: string;
}

// ============================================
// 매핑 테이블
// ============================================

export interface GowidUserMapping {
  id: string;
  erp_user_id: string;
  gowid_user_id: number;
  gowid_user_name: string;
  gowid_email: string | null;
  gowid_card_alias: string | null;
  created_at: string;
  updated_at: string;
  erp_user_name?: string;
  erp_user_bu_code?: string;
}

// ============================================
// 카드 별칭 관리
// ============================================

export interface GowidCard {
  id: string;
  gowid_alias: string;
  short_card_number: string | null;
  card_number: string | null;
  card_user_name: string | null;
  card_name: string | null;
  card_type: string | null;
  erp_alias: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GowidCardUpsertRequest {
  gowid_alias: string;
  short_card_number?: string;
  card_number?: string;
  card_user_name?: string;
  card_name?: string;
  card_type?: string;
  erp_alias?: string;
  notes?: string;
}

// ============================================
// 권한 컨텍스트
// ============================================

export type CorporateCardPermission = {
  canView: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canComment: boolean;
  viewScope: 'all' | 'bu' | 'self' | 'none';
  mappedGowidUserIds: number[];
};
