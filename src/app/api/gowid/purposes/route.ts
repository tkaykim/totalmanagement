import { NextRequest, NextResponse } from 'next/server';
import { gowidFetch, getAuthContext, requireAuth, canAccessCorporateCard, unauthorizedResponse, forbiddenResponse } from '../_lib/gowid-client';
import type { GowidResponse, GowidPurpose } from '@/features/corporate-card/types';

export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (!canAccessCorporateCard(ctx)) return forbiddenResponse();

    const isActivated = request.nextUrl.searchParams.get('isActivated');
    const query = isActivated !== null ? `?isActivated=${isActivated}` : '';

    const data = await gowidFetch<GowidResponse<GowidPurpose[]>>(`/v2/purposes${query}`);
    return NextResponse.json(data);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Gowid purposes error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
