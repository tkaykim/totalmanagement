import { NextResponse } from 'next/server';
import { gowidFetch, getAuthContext, requireAuth, canAccessCorporateCard, unauthorizedResponse, forbiddenResponse } from '../_lib/gowid-client';
import type { GowidResponse, GowidMember } from '@/features/corporate-card/types';

export async function GET() {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (!canAccessCorporateCard(ctx)) return forbiddenResponse();

    const data = await gowidFetch<GowidResponse<GowidMember[]>>('/v1/members');
    return NextResponse.json(data);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Gowid members error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
