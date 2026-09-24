import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { isGuardFailure, requireHeadAdmin, SIGNUP_REQUEST_COLUMNS } from './_guard';

/**
 * 가입 신청 목록 (spec R21). 본사 관리자만.
 * 대상: `pending`·`rejected`, 신청 시각 최신순 → 200 `{ requests }`
 */
export async function GET() {
  const guard = await requireHeadAdmin();
  if (isGuardFailure(guard)) return guard;

  const admin = await createPureClient();
  const { data, error } = await admin
    .from('app_users')
    .select(SIGNUP_REQUEST_COLUMNS)
    .in('status', ['pending', 'rejected'])
    .order('signup_requested_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: '가입 신청 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ requests: data ?? [] });
}
