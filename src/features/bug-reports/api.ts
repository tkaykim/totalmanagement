import type { BugReport, CreateBugReportPayload, UpdateBugReportPayload } from './types';

const API_BASE = '/api/bug-reports';

export async function fetchBugReports(): Promise<BugReport[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch bug reports');
  }
  return res.json();
}

export async function createBugReport(data: CreateBugReportPayload): Promise<BugReport> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create bug report');
  }
  return res.json();
}

export async function updateBugReport(id: number, data: UpdateBugReportPayload): Promise<BugReport> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update bug report');
  }
  return res.json();
}
