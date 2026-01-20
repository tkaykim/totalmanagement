import { ExclusiveArtist, ExclusiveArtistFormData } from './types';

const API_BASE = '/api/exclusive-artists';

export interface FetchExclusiveArtistsParams {
  search?: string;
  category?: string;
  visa_status?: 'all' | 'expiring_soon' | 'expired';
  contract_status?: 'all' | 'active' | 'expiring_soon' | 'expired';
}

export async function fetchExclusiveArtists(
  params: FetchExclusiveArtistsParams = {}
): Promise<ExclusiveArtist[]> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.category) searchParams.set('category', params.category);
  if (params.visa_status) searchParams.set('visa_status', params.visa_status);
  if (params.contract_status) searchParams.set('contract_status', params.contract_status);

  const response = await fetch(`${API_BASE}?${searchParams.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch exclusive artists');
  }
  return response.json();
}

export async function fetchExclusiveArtist(id: number): Promise<ExclusiveArtist> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch exclusive artist');
  }
  return response.json();
}

export async function createExclusiveArtist(data: ExclusiveArtistFormData): Promise<ExclusiveArtist> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create exclusive artist');
  }
  return response.json();
}

export async function updateExclusiveArtist(
  id: number,
  data: Partial<ExclusiveArtistFormData>
): Promise<ExclusiveArtist> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update exclusive artist');
  }
  return response.json();
}

export async function removeExclusiveArtist(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove exclusive artist');
  }
}
