import { NextResponse } from 'next/server';
import { isGuardFailure, requireActiveStaff } from '@/lib/auth-guard';

/**
 * 본인 계정 상태 조회 (spec R1 예외, R20 승인 대기·거절 안내 화면용).
 * 재직 여부와 무관하게 본인의 `status`와 이름만 돌려준다. 다른 데이터는 조회하지 않는다.
 * 로그인 없음·`app_users` 행 없음 → 401.
 */
export async function GET() {
  const guard = await requireActiveStaff({ ownStatusOnly: true });
  if (isGuardFailure(guard)) return guard;

  return NextResponse.json({
    status: guard.appUser.status ?? null,
    name: guard.appUser.name ?? null,
  });
}
