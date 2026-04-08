import { createClient, createPureClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
  userId: string;
  role: string;
  buCode: string | null;
  mappedGowidUserIds: number[];
  buGowidUserIds: number[];
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return null;

  const supabase = await createPureClient();

  const { data: appUser } = await supabase
    .from('app_users')
    .select('role, bu_code')
    .eq('id', user.id)
    .single();

  if (!appUser) return null;

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
    userId: user.id,
    role: appUser.role,
    buCode: appUser.bu_code,
    mappedGowidUserIds,
    buGowidUserIds,
  };
}

export function requireAuth(ctx: AuthContext | null): AuthContext {
  if (!ctx) throw new Error('Unauthorized');
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
