import { NextRequest, NextResponse } from 'next/server';
import { gowidFetch, getAuthContext, requireAuth, canAccessCorporateCard, unauthorizedResponse, forbiddenResponse } from '../../../_lib/gowid-client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (!canAccessCorporateCard(ctx)) return forbiddenResponse();

    const { expenseId } = await params;
    const body = await request.json();

    const data = await gowidFetch(
      `/v2/expenses/${expenseId}/memo`,
      { method: 'PUT', body: JSON.stringify(body) }
    );
    return NextResponse.json(data);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Gowid memo error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
