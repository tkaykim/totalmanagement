// 파트너 분배 정산 타입 정의

export type SettlementStatus = 'draft' | 'confirmed' | 'paid';

export interface ProjectShareSetting {
  projectId: string;
  projectName: string;
  sharePartnerId: number | null;
  sharePartnerName: string | null;
  shareRate: number | null;
  visibleToPartner: boolean;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  partnerAmount: number;
  companyAmount: number;
}

export interface PartnerSettlement {
  id: number;
  partnerId: number;
  partnerName: string;
  periodStart: string;
  periodEnd: string;
  status: SettlementStatus;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  partnerAmount: number;
  companyAmount: number;
  memo: string | null;
  createdBy: string | null;
  confirmedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  projects: SettlementProject[];
}

export interface SettlementProject {
  id: number;
  settlementId: number;
  projectId: string;
  projectName: string;
  revenue: number;
  expense: number;
  netProfit: number;
  shareRate: number;
  partnerAmount: number;
  companyAmount: number;
}

export interface CreateSettlementInput {
  partnerId: number;
  periodStart: string;
  periodEnd: string;
  projectIds: string[];
  memo?: string;
}

export interface UpdateSettlementInput {
  id: number;
  status?: SettlementStatus;
  memo?: string;
}

export interface UpdateProjectShareInput {
  projectId: string;
  sharePartnerId: number | null;
  shareRate: number | null;
  visibleToPartner: boolean;
}

export interface PartnerOption {
  id: number;
  displayName: string;
  entityType: string;
}

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  draft: '작성중',
  confirmed: '확정',
  paid: '지급완료',
};

export const SETTLEMENT_STATUS_COLORS: Record<SettlementStatus, string> = {
  draft: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  confirmed: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  paid: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
};
