import { Partner, PartnerFormData, PartnerCategory, AccessRequest } from './types';

const API_BASE = '/api/unified-partners';

interface FetchPartnersParams {
  bu?: string;
  entity_type?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface FetchPartnersResponse {
  data: Partner[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchPartners(params: FetchPartnersParams = {}): Promise<FetchPartnersResponse> {
  const searchParams = new URLSearchParams();
  if (params.bu) searchParams.set('bu', params.bu);
  if (params.entity_type) searchParams.set('entity_type', params.entity_type);
  if (params.category) searchParams.set('category', params.category);
  if (params.search) searchParams.set('search', params.search);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const response = await fetch(`${API_BASE}?${searchParams.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch partners');
  }
  return response.json();
}

export async function fetchPartner(id: number): Promise<Partner> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch partner');
  }
  return response.json();
}

export async function createPartner(data: PartnerFormData): Promise<Partner> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create partner');
  }
  return response.json();
}

export async function updatePartner(id: number, data: Partial<PartnerFormData>): Promise<Partner> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update partner');
  }
  return response.json();
}

export async function deletePartner(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete partner');
  }
}

export async function fetchCategories(params: { search?: string; entity_type?: string } = {}): Promise<PartnerCategory[]> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.entity_type) searchParams.set('entity_type', params.entity_type);

  const response = await fetch(`${API_BASE}/categories?${searchParams.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch categories');
  }
  return response.json();
}

export async function requestAccess(partnerId: number, data: { access_level?: string; reason?: string }): Promise<AccessRequest> {
  const response = await fetch(`${API_BASE}/${partnerId}/access-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to request access');
  }
  return response.json();
}

export async function fetchAccessRequests(status: string = 'pending'): Promise<AccessRequest[]> {
  const response = await fetch(`${API_BASE}/access-requests?status=${status}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch access requests');
  }
  return response.json();
}

export async function approveAccessRequest(requestId: number, data: { valid_until?: string } = {}): Promise<void> {
  const response = await fetch(`${API_BASE}/access-requests/${requestId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to approve access request');
  }
}

export async function rejectAccessRequest(requestId: number, data: { reason?: string } = {}): Promise<void> {
  const response = await fetch(`${API_BASE}/access-requests/${requestId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reject access request');
  }
}
