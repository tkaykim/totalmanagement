import { NextRequest, NextResponse } from 'next/server';
import { gowidFetch, getAuthContext, requireAuth, canAccessCorporateCard, unauthorizedResponse, forbiddenResponse } from '../../_lib/gowid-client';
import type { GowidResponse, GowidExpenseSimplePageable } from '@/features/corporate-card/types';

export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (!canAccessCorporateCard(ctx)) return forbiddenResponse();

    const sp = request.nextUrl.searchParams;
    const params = new URLSearchParams();
    params.set('pageable.page', sp.get('page') || '0');
    params.set('pageable.size', sp.get('size') || '20');

    const data = await gowidFetch<GowidResponse<GowidExpenseSimplePageable>>(
      `/v2/expenses/not-submitted?${params.toString()}`
    );
    return NextResponse.json(data);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Gowid not-submitted error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
