import type {
  GowidResponse,
  GowidMember,
  GowidPurpose,
  GowidExpensePageable,
  GowidExpenseDetail,
  GowidExpenseSimplePageable,
  ExpenseSearchCriteria,
  ExpensePurposeUpdateRequest,
  ExpenseParticipantsUpdateRequest,
  ExpenseMemoUpdateRequest,
  ExpenseApprovalRequest,
  CommentRequest,
  GowidUserMapping,
  GowidExpenseProjectLink,
  GowidCard,
  GowidCardUpsertRequest,
} from './types';

const API_BASE = '/api/gowid';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API Error: ${res.status}`);
  }
  return res.json();
}

// ── 멤버 ──

export async function fetchGowidMembers() {
  const res = await fetchApi<GowidResponse<GowidMember[]>>(`${API_BASE}/members`);
  return res.data;
}

// ── 용도 ──

export async function fetchGowidPurposes(isActivated?: boolean) {
  const query = isActivated !== undefined ? `?isActivated=${isActivated}` : '';
  const res = await fetchApi<GowidResponse<GowidPurpose[]>>(`${API_BASE}/purposes${query}`);
  return res.data;
}

// ── 지출내역 ──

export async function fetchExpenses(criteria: ExpenseSearchCriteria & { page?: number; size?: number }) {
  const params = new URLSearchParams();
  params.set('page', String(criteria.page ?? 0));
  params.set('size', String(criteria.size ?? 20));
  if (criteria.startDate) params.set('startDate', criteria.startDate);
  if (criteria.endDate) params.set('endDate', criteria.endDate);
  if (criteria.approvalState) params.set('approvalState', criteria.approvalState);
  if (criteria.memo) params.set('memo', criteria.memo);
  if (criteria.purposeName) params.set('purposeName', criteria.purposeName);
  if (criteria.userName) params.set('userName', criteria.userName);

  const res = await fetchApi<GowidResponse<GowidExpensePageable>>(`${API_BASE}/expenses?${params.toString()}`);
  return res.data;
}

export async function fetchExpenseDetail(expenseId: number) {
  const res = await fetchApi<GowidResponse<GowidExpenseDetail>>(`${API_BASE}/expenses/${expenseId}`);
  return res.data;
}

export async function fetchNotSubmittedExpenses(page = 0, size = 20) {
  const res = await fetchApi<GowidResponse<GowidExpenseSimplePageable>>(
    `${API_BASE}/expenses/not-submitted?page=${page}&size=${size}`
  );
  return res.data;
}

// ── 수정 ──

export async function updateExpensePurpose(expenseId: number, data: ExpensePurposeUpdateRequest) {
  return fetchApi(`${API_BASE}/expenses/${expenseId}/purposes`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateExpenseParticipants(expenseId: number, data: ExpenseParticipantsUpdateRequest) {
  return fetchApi(`${API_BASE}/expenses/${expenseId}/participants`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateExpenseMemo(expenseId: number, data: ExpenseMemoUpdateRequest) {
  return fetchApi(`${API_BASE}/expenses/${expenseId}/memo`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateExpenseApproval(expenseId: number, data: ExpenseApprovalRequest) {
  return fetchApi(`${API_BASE}/expenses/${expenseId}/approval-status`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function addExpenseComment(expenseId: number, data: CommentRequest) {
  return fetchApi(`${API_BASE}/expenses/${expenseId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── 일괄 ──

export async function bulkApproveExpenses(items: ExpenseApprovalRequest[]) {
  return fetchApi(`${API_BASE}/expenses/bulk-approve`, {
    method: 'PATCH',
    body: JSON.stringify(items),
  });
}

export async function bulkUpdatePurposes(data: {
  expenseIds: number[];
  purposeId: number;
  purposeRequirementAnswerMap?: Record<string, string[]>;
}) {
  return fetchApi(`${API_BASE}/expenses/bulk-purposes`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── 매핑 ──

export async function fetchGowidMappings() {
  const res = await fetchApi<{ data: GowidUserMapping[] }>(`${API_BASE}/mapping`);
  return res.data;
}

export async function createGowidMapping(data: {
  erp_user_id: string;
  gowid_user_id: number;
  gowid_user_name: string;
  gowid_email?: string;
  gowid_card_alias?: string;
}) {
  return fetchApi(`${API_BASE}/mapping`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteGowidMapping(id: string) {
  return fetchApi(`${API_BASE}/mapping`, {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
}

// ── 프로젝트 연결 ──

export async function fetchExpenseProjectLink(expenseId: number) {
  const res = await fetchApi<{ data: GowidExpenseProjectLink | null }>(
    `${API_BASE}/expenses/${expenseId}/project-link`
  );
  return res.data;
}

export async function linkExpenseToProject(
  expenseId: number,
  data: {
    project_id: number;
    expense_amount: number;
    expense_store_name: string;
    expense_date: string;
    card_alias?: string;
  }
) {
  return fetchApi<{ data: GowidExpenseProjectLink }>(
    `${API_BASE}/expenses/${expenseId}/project-link`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function unlinkExpenseFromProject(expenseId: number) {
  return fetchApi(`${API_BASE}/expenses/${expenseId}/project-link`, {
    method: 'DELETE',
  });
}

// ── 카드 별칭 관리 ──

export async function fetchGowidCards() {
  const res = await fetchApi<{ data: GowidCard[] }>(`${API_BASE}/cards`);
  return res.data;
}

export async function upsertGowidCard(data: GowidCardUpsertRequest) {
  return fetchApi<{ data: GowidCard }>(`${API_BASE}/cards`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGowidCard(data: {
  id: string;
  erp_alias?: string;
  notes?: string;
  card_user_name?: string;
}) {
  return fetchApi<{ data: GowidCard }>(`${API_BASE}/cards`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteGowidCard(id: string) {
  return fetchApi(`${API_BASE}/cards`, {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
}
