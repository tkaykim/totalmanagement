import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { isBuCode } from '@/lib/business-units';
import { STAFF_ROLES } from '@/lib/permissions';
import { isAuditV2Enabled } from '@/lib/feature-flags';
import { isGuardFailure, requireHeadAdmin, SIGNUP_REQUEST_COLUMNS } from '../../_guard';

/**
 * 가입 승인 (spec R21). 본사 관리자만.
 * 본문 `{ bu_code, role }` — 사업부 7개 중 하나, 역할 admin·leader·manager·member.
 * `pending` 신청만 `active`로 바꾸고 `approved_by`·`approved_at`을 채운다 → 200 `{ user }`.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireHeadAdmin();
  if (isGuardFailure(guard)) return guard;

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const buCode = body.bu_code;
  const role = body.role;
  if (!isBuCode(buCode)) {
    return NextResponse.json({ error: '사업부를 선택하세요.' }, { status: 400 });
  }
  if (typeof role !== 'string' || !(STAFF_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: '역할이 올바르지 않습니다.' }, { status: 400 });
  }

  const { id } = await params;
  const update: Record<string, unknown> = {
    bu_code: buCode,
    role,
    status: 'active',
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
    return NextResponse.json({ error: '승인 처리에 실패했습니다.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: '신청을 찾을 수 없거나 이미 처리되었습니다.' }, { status: 404 });
  }
  return NextResponse.json({ user: data });
}
