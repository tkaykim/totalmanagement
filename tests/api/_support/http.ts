/**
 * ERP API 호출 도우미.
 *
 * 로그인: Supabase REST `POST /auth/v1/token?grant_type=password`로 세션을 받는다.
 * 전달: 서버(`src/lib/supabase/server.ts`, @supabase/ssr `createServerClient`)는 쿠키
 * `sb-<ref>-auth-token`에서 세션을 읽는다. 값은 `base64-` + base64url(세션 JSON)이고,
 * 3180자를 넘으면 `.0`, `.1` … 조각 쿠키로 나눈다(@supabase/ssr chunker와 같은 규칙).
 */

import {
  accountCredentials,
  baseUrl,
  supabaseAnonKey,
  supabaseUrl,
  vercelBypassToken,
  type AccountKey,
} from "./env";

export type Session = {
  key: AccountKey;
  userId: string;
  email: string;
  cookieHeader: string;
};

export type ApiResult<T = any> = {
  status: number;
  body: T;
  text: string;
};

/** @supabase/ssr 0.5 `MAX_CHUNK_SIZE` */
const MAX_CHUNK_SIZE = 3180;

/** supabase-js 기본 저장 키: `sb-<프로젝트 ref>-auth-token` */
export function authCookieName(url: string = supabaseUrl()): string {
  const ref = new URL(url).hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
}

/** 세션 JSON을 @supabase/ssr가 읽는 쿠키 헤더 값으로 만든다 */
export function buildAuthCookieHeader(session: Record<string, unknown>, name: string = authCookieName()): string {
  const encoded = "base64-" + Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  if (encoded.length <= MAX_CHUNK_SIZE) {
    return `${name}=${encoded}`;
  }
  const parts: string[] = [];
  for (let i = 0, offset = 0; offset < encoded.length; i++, offset += MAX_CHUNK_SIZE) {
    parts.push(`${name}.${i}=${encoded.slice(offset, offset + MAX_CHUNK_SIZE)}`);
  }
  return parts.join("; ");
}

const sessionCache = new Map<AccountKey, Promise<Session>>();

async function signInUncached(key: AccountKey): Promise<Session> {
  const { email, password } = accountCredentials(key);
  const res = await fetch(`${supabaseUrl()}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token || !data?.user?.id) {
    // 비밀번호·토큰은 출력하지 않는다
    throw new Error(`[test:api] ${key} 계정 로그인 실패 (HTTP ${res.status}): ${data?.error_description ?? data?.msg ?? data?.error ?? "unknown"}`);
  }
  const expiresAt =
    typeof data.expires_at === "number" ? data.expires_at : Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 3600);
  const session = {
    access_token: data.access_token,
    token_type: data.token_type ?? "bearer",
    expires_in: data.expires_in,
    expires_at: expiresAt,
    refresh_token: data.refresh_token,
    user: data.user,
  };
  return {
    key,
    userId: String(data.user.id),
    email,
    cookieHeader: buildAuthCookieHeader(session),
  };
}

/** 계정으로 로그인한다(같은 파일 안에서는 한 번만) */
export function signIn(key: AccountKey): Promise<Session> {
  let cached = sessionCache.get(key);
  if (!cached) {
    cached = signInUncached(key);
    sessionCache.set(key, cached);
    cached.catch(() => sessionCache.delete(key));
  }
  return cached;
}

export type ApiOptions = {
  session?: Session | null;
  body?: unknown;
  headers?: Record<string, string>;
};

/** ERP API를 부른다. 세션이 없으면 쿠키 없이(비로그인) 부른다. */
export async function api<T = any>(method: string, path: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: "application/json", ...(options.headers ?? {}) };
  if (options.session) headers.Cookie = options.session.cookieHeader;
  const bypass = vercelBypassToken();
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;
  let payload: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(options.body);
  }
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: payload,
    redirect: "manual",
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { status: res.status, body: body as T, text };
}

/** 실패 메시지에 응답 본문 일부를 붙인다 */
export function describeResult(result: ApiResult): string {
  return `HTTP ${result.status} ${result.text.slice(0, 300)}`;
}

/** 한국 날짜(YYYY-MM-DD) */
export function kstToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
