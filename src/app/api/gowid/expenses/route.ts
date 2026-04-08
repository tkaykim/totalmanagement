import { NextRequest, NextResponse } from 'next/server';
import { gowidFetch, getAuthContext, requireAuth, canAccessCorporateCard, unauthorizedResponse, forbiddenResponse } from '../_lib/gowid-client';
import type { GowidResponse, GowidExpensePageable } from '@/features/corporate-card/types';

export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(await getAuthContext());
    if (!canAccessCorporateCard(ctx)) return forbiddenResponse();

    const sp = request.nextUrl.searchParams;
    const params = new URLSearchParams();

    if (sp.get('page')) params.set('pageable.page', sp.get('page')!);
    if (sp.get('size')) params.set('pageable.size', sp.get('size')!);
    if (sp.get('startDate')) params.set('criteria.startDate', sp.get('startDate')!);
    if (sp.get('endDate')) params.set('criteria.endDate', sp.get('endDate')!);
    if (sp.get('approvalState')) params.set('criteria.approvalState', sp.get('approvalState')!);
    if (sp.get('memo')) params.set('criteria.memo', sp.get('memo')!);
    if (sp.get('purposeName')) params.set('criteria.purposeName', sp.get('purposeName')!);
    if (sp.get('userName')) params.set('criteria.userName', sp.get('userName')!);

    const data = await gowidFetch<GowidResponse<GowidExpensePageable>>(
      `/v2/expenses?${params.toString()}`
    );

    if (ctx.role === 'admin') {
      return NextResponse.json(data);
    }

    if (ctx.role === 'leader' && ctx.buGowidUserIds.length > 0) {
      const filtered = data.data.content.filter(
        (e) => !e.cardUserName || ctx.buGowidUserIds.some(id => {
          return true;
        })
      );
      return NextResponse.json({
        ...data,
        data: { ...data.data, content: filtered, totalElements: filtered.length },
      });
    }

    if (['manager', 'member'].includes(ctx.role) && ctx.mappedGowidUserIds.length > 0) {
      return NextResponse.json(data);
    }

    return NextResponse.json(data);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') return unauthorizedResponse();
    console.error('Gowid expenses error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
