import { NextRequest, NextResponse } from 'next/server';
import { gowidFetch, getAuthContext, requireAuth, canApproveExpense, unauthorizedResponse, forbiddenResponse } from '../../_lib/gowid-client';

export async function PATCH(request: NextRequest) {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (!canApproveExpense(ctx)) return forbiddenResponse();

    const body = await request.json();

    const data = await gowidFetch(
      '/v2/expenses/approval-status/approved',
      { method: 'PATCH', body: JSON.stringify(body) }
    );
    return NextResponse.json(data);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Gowid bulk approve error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
