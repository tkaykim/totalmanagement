import { createPureClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';

const GOWID_BASE_URL = 'https://openapi.gowid.com';

function getApiKey(): string {
  const key = process.env.GOWID_API_KEY;
  if (!key) throw new Error('GOWID_API_KEY is not configured');
  return key;
}

export async function gowidFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${GOWID_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: getApiKey(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gowid API error ${res.status}: ${text}`);
  }

  return res.json();
}

export interface AuthContext {
  /** 재직 직원 여부(spec R1). false면 `requireAuth`가 'Forbidden'을 던진다. */
  active: boolean;
  userId: string;
  role: string;
  buCode: string | null;
  mappedGowidUserIds: number[];
  buGowidUserIds: number[];
}

/**
 * 세션 → `app_users` → 재직 확인(공통 가드 `requireActiveStaff`, spec R1·R2).
 * - 세션 없음·`app_users` 행 없음 → null (`requireAuth`가 'Unauthorized' → 401)
 * - 재직 직원 아님 → `active: false` (`requireAuth`가 'Forbidden' → 403). 매핑 조회는 하지 않는다.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) {
    if (guard.status === 403) {
      return { active: false, userId: '', role: '', buCode: null, mappedGowidUserIds: [], buGowidUserIds: [] };
    }
    if (guard.status === 401) return null;
    throw new Error('Failed to load user');
  }
  const { user, appUser } = guard;

  const supabase = await createPureClient();

  const { data: selfMapping } = await supabase
    .from('gowid_user_mapping')
    .select('gowid_user_id')
    .eq('erp_user_id', user.id);

  const mappedGowidUserIds = selfMapping?.map(m => m.gowid_user_id) ?? [];

  let buGowidUserIds: number[] = [];
  if (appUser.role === 'leader' && appUser.bu_code) {
    const { data: buUsers } = await supabase
      .from('app_users')
      .select('id')
      .eq('bu_code', appUser.bu_code);

    if (buUsers && buUsers.length > 0) {
      const buUserIds = buUsers.map(u => u.id);
      const { data: buMappings } = await supabase
        .from('gowid_user_mapping')
        .select('gowid_user_id')
        .in('erp_user_id', buUserIds);

      buGowidUserIds = buMappings?.map(m => m.gowid_user_id) ?? [];
    }
  }

  return {
    active: true,
    userId: user.id,
    role: appUser.role,
    buCode: appUser.bu_code,
    mappedGowidUserIds,
    buGowidUserIds,
  };
}

export function requireAuth(ctx: AuthContext | null): AuthContext {
  if (!ctx) throw new Error('Unauthorized');
  if (!ctx.active) throw new Error('Forbidden');
  return ctx;
}

export function canAccessCorporateCard(ctx: AuthContext): boolean {
  if (['admin', 'leader'].includes(ctx.role)) return true;
  if (['manager', 'member'].includes(ctx.role) && ctx.mappedGowidUserIds.length > 0) return true;
  return false;
}

export function canEditExpense(ctx: AuthContext, cardUserName: string | null): boolean {
  if (ctx.role === 'admin') return true;
  if (ctx.role === 'leader') return true;
  if (['manager', 'member'].includes(ctx.role)) return true;
  return false;
}

export function canApproveExpense(ctx: AuthContext): boolean {
  return ctx.role === 'admin';
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
