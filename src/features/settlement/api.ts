// 파트너 분배 정산 API

import type {
  PartnerSettlement,
  ProjectShareSetting,
  CreateSettlementInput,
  UpdateSettlementInput,
  UpdateProjectShareInput,
  PartnerOption,
} from './types';

const API_BASE = '/api';

// 프로젝트별 분배 설정 조회
export async function fetchProjectShareSettings(
  bu: string,
  activePeriod?: { start?: string; end?: string }
): Promise<ProjectShareSetting[]> {
  const params = new URLSearchParams();
  if (bu !== 'ALL') {
    params.append('bu', bu);
  }
  params.append('includeShare', 'true');
  if (activePeriod?.start) {
    params.append('startDate', activePeriod.start);
  }
  if (activePeriod?.end) {
    params.append('endDate', activePeriod.end);
  }

  const res = await fetch(`${API_BASE}/projects?${params.toString()}`);
  if (!res.ok) throw new Error('프로젝트 조회 실패');

  const data = await res.json();
  return (data.data || []).map((p: any) => ({
    projectId: String(p.id),
    projectName: p.name,
    sharePartnerId: p.share_partner_id,
    sharePartnerName: p.share_partner?.display_name || null,
    shareRate: p.share_rate,
    visibleToPartner: p.visible_to_partner ?? false,
    totalRevenue: p.total_revenue || 0,
    totalExpense: p.total_expense || 0,
    netProfit: (p.total_revenue || 0) - (p.total_expense || 0),
    partnerAmount: p.share_rate
      ? Math.round(((p.total_revenue || 0) - (p.total_expense || 0)) * (p.share_rate / 100))
      : 0,
    companyAmount: p.share_rate
      ? Math.round(((p.total_revenue || 0) - (p.total_expense || 0)) * (1 - p.share_rate / 100))
      : 0,
  }));
}

// 프로젝트 분배 설정 업데이트
export async function updateProjectShareSetting(
  input: UpdateProjectShareInput
): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${input.projectId}/share-settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      share_partner_id: input.sharePartnerId,
      share_rate: input.shareRate,
      visible_to_partner: input.visibleToPartner,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || '분배 설정 저장 실패');
  }
}

// 정산서 목록 조회
export async function fetchPartnerSettlements(
  partnerId?: number
): Promise<PartnerSettlement[]> {
  const params = new URLSearchParams();
  if (partnerId) {
    params.append('partnerId', String(partnerId));
  }

  const res = await fetch(`${API_BASE}/partner-settlements?${params.toString()}`);
  if (!res.ok) throw new Error('정산서 조회 실패');

  const data = await res.json();
  return (data.data || []).map(mapSettlement);
}

// 정산서 상세 조회
export async function fetchPartnerSettlement(id: number): Promise<PartnerSettlement> {
  const res = await fetch(`${API_BASE}/partner-settlements/${id}`);
  if (!res.ok) throw new Error('정산서 조회 실패');

  const data = await res.json();
  return mapSettlement(data.data);
}

// 정산서 생성
export async function createPartnerSettlement(
  input: CreateSettlementInput
): Promise<PartnerSettlement> {
  const res = await fetch(`${API_BASE}/partner-settlements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partner_id: input.partnerId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      project_ids: input.projectIds,
      memo: input.memo,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || '정산서 생성 실패');
  }

  const data = await res.json();
  return mapSettlement(data.data);
}

// 정산서 수정
export async function updatePartnerSettlement(
  input: UpdateSettlementInput
): Promise<PartnerSettlement> {
  const res = await fetch(`${API_BASE}/partner-settlements/${input.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: input.status,
      memo: input.memo,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || '정산서 수정 실패');
  }

  const data = await res.json();
  return mapSettlement(data.data);
}

// 정산서 삭제
export async function deletePartnerSettlement(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/partner-settlements/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || '정산서 삭제 실패');
  }
}

// 파트너 목록 조회
export async function fetchPartnerOptions(): Promise<PartnerOption[]> {
  const res = await fetch(`${API_BASE}/unified-partners?limit=500`);
  if (!res.ok) throw new Error('파트너 조회 실패');

  const data = await res.json();
  return (data.data || []).map((p: any) => ({
    id: p.id,
    displayName: p.display_name,
    entityType: p.entity_type,
  }));
}

// Helper: API 응답을 PartnerSettlement로 변환
function mapSettlement(s: any): PartnerSettlement {
  return {
    id: s.id,
    partnerId: s.partner_id,
    partnerName: s.partner?.display_name || s.partner_name || '',
    periodStart: s.period_start,
    periodEnd: s.period_end,
    status: s.status,
    totalRevenue: s.total_revenue || 0,
    totalExpense: s.total_expense || 0,
    netProfit: s.net_profit || 0,
    partnerAmount: s.partner_amount || 0,
    companyAmount: s.company_amount || 0,
    memo: s.memo,
    createdBy: s.created_by,
    confirmedAt: s.confirmed_at,
    paidAt: s.paid_at,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    projects: (s.partner_settlement_projects || []).map((p: any) => ({
      id: p.id,
      settlementId: p.settlement_id,
      projectId: String(p.project_id),
      projectName: p.project?.name || '',
      revenue: p.revenue || 0,
      expense: p.expense || 0,
      netProfit: p.net_profit || 0,
      shareRate: p.share_rate,
      partnerAmount: p.partner_amount || 0,
      companyAmount: p.company_amount || 0,
    })),
  };
}
