import { NextRequest, NextResponse } from 'next/server';
import { gowidFetch, getAuthContext, requireAuth, canAccessCorporateCard, unauthorizedResponse, forbiddenResponse } from '../../_lib/gowid-client';
import type { GowidResponse, GowidExpenseDetail } from '@/features/corporate-card/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (!canAccessCorporateCard(ctx)) return forbiddenResponse();

    const { expenseId } = await params;
    const data = await gowidFetch<GowidResponse<GowidExpenseDetail>>(
      `/v2/expenses/${expenseId}`
    );
    return NextResponse.json(data);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Gowid expense detail error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (!canAccessCorporateCard(ctx)) return forbiddenResponse();

    const { expenseId } = await params;
    const body = await request.json();

    const data = await gowidFetch<GowidResponse<GowidExpenseDetail>>(
      `/v2/expenses/${expenseId}`,
      { method: 'PUT', body: JSON.stringify(body) }
    );
    return NextResponse.json(data);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Gowid expense update error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
