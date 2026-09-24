import 'server-only';

import { NextResponse } from 'next/server';
import { isGuardFailure, requireActiveStaff, type ActiveStaffContext } from '@/lib/auth-guard';
import { isHeadAdmin } from '@/lib/permissions';

/**
 * 가입 신청 목록·승인·거절 공통 가드 (spec R21).
 * 로그인 없음 401 → 재직 아님 403 → 본사 관리자 아님 403.
 */
export async function requireHeadAdmin(): Promise<ActiveStaffContext | NextResponse> {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  if (!isHeadAdmin(guard.appUser)) {
    return NextResponse.json({ error: '본사 관리자만 처리할 수 있습니다.' }, { status: 403 });
  }
  return guard;
}

export { isGuardFailure };

/** 가입 신청 목록·처리 결과로 돌려주는 칸 */
export const SIGNUP_REQUEST_COLUMNS =
  'id, name, email, role, bu_code, status, requested_bu_code, signup_message, signup_requested_at, approved_by, approved_at, created_at';
