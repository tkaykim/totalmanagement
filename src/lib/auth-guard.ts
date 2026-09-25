import 'server-only';

import { NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import { isActiveStaff, type AppUser } from '@/lib/permissions';

/** Supabase Auth 사용자 (직접 의존성이 아닌 supabase-js를 import하지 않으려고 반환 타입에서 뽑는다) */
type SessionClient = Awaited<ReturnType<typeof createClient>>;
export type User = NonNullable<Awaited<ReturnType<SessionClient['auth']['getUser']>>['data']['user']>;

/**
 * 서버 라우트 공통 가드 (spec R1).
 *
 * 확인 순서: 세션(`auth.getUser()`) → `app_users` 조회(서비스 권한 키) → 재직 확인.
 * - 세션 없음·세션 오류 → 401
 * - `app_users` 행 없음 → 401
 * - `app_users` 조회 실패 → 500
 * - 재직 직원 아님(status≠'active', 사업부 없음, viewer·artist) → 403
 * - 통과 → `{ user, appUser }`
 *
 * 역할·사업부 판정은 이 뒤에 `src/lib/permissions.ts` 함수로 한다. 라우트 안에 역할 조건을 새로 짜지 않는다.
 *
 * 사용 예:
 * ```ts
 * const guard = await requireActiveStaff();
 * if (isGuardFailure(guard)) return guard;
 * const { user, appUser } = guard;
 * ```
 */

/** 가드가 돌려주는 `app_users` 행. `status`는 항상 채워 돌려준다(text 칸이라 모르는 값일 수 있다). */
export type GuardedAppUser = AppUser & {
  email?: string | null;
  name?: string;
};

export type ActiveStaffContext = {
  user: User;
  appUser: GuardedAppUser;
};

export type RequireActiveStaffOptions = {
  /**
   * 본인 계정 상태 조회 전용(승인 대기·거절 안내 화면, spec R1 예외).
   * 세션과 `app_users` 행만 확인하고 재직 여부는 보지 않는다. 다른 데이터 조회에 쓰지 않는다.
   */
  ownStatusOnly?: boolean;
};

const APP_USER_COLUMNS = 'id, role, bu_code, status, name, email, position';

function errorResponse(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

/** 가드 결과가 실패 응답인지 */
export function isGuardFailure(result: ActiveStaffContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

export async function requireActiveStaff(
  options: RequireActiveStaffOptions = {}
): Promise<ActiveStaffContext | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse(401, 'Unauthorized');
  }

  const admin = await createPureClient();
  const { data: row, error: rowError } = await admin
    .from('app_users')
    .select(APP_USER_COLUMNS)
    .eq('id', user.id)
    .maybeSingle();

  if (rowError) {
    return errorResponse(500, 'Failed to load user');
  }
  if (!row) {
    return errorResponse(401, 'Unauthorized');
  }

  const appUser = row as unknown as GuardedAppUser;

  if (options.ownStatusOnly) {
    return { user, appUser };
  }

  if (!isActiveStaff(appUser)) {
    return errorResponse(403, 'Forbidden');
  }

  return { user, appUser };
}
