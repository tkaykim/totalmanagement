import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { isAuditV2Enabled } from '@/lib/feature-flags';
import { isGuardFailure, requireHeadAdmin, SIGNUP_REQUEST_COLUMNS } from '../../_guard';

/**
 * 가입 거절 (spec R21). 본사 관리자만.
 * `pending` 신청만 `rejected`로 바꾸고 `approved_by`·`approved_at`을 채운다 → 200 `{ user }`.
 * 사람 행과 인증 계정은 지우지 않는다(R23).
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireHeadAdmin();
  if (isGuardFailure(guard)) return guard;

  const { id } = await params;
  const update: Record<string, unknown> = {
    status: 'rejected',
    approved_by: guard.user.id,
    approved_at: new Date().toISOString(),
  };
  if (isAuditV2Enabled()) update.updated_by = guard.user.id;

  const admin = await createPureClient();
  const { data, error } = await admin
    .from('app_users')
    .update(update)
    .eq('id', id)
    .eq('status', 'pending')
    .select(SIGNUP_REQUEST_COLUMNS)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: '거절 처리에 실패했습니다.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: '신청을 찾을 수 없거나 이미 처리되었습니다.' }, { status: 404 });
  }
  return NextResponse.json({ user: data });
}
