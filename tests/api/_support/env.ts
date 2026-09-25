/**
 * API 통합 테스트 설정 (spec V1 · plan T15).
 *
 * 모든 값은 환경변수에서만 읽는다. 저장소가 공개이므로 주소·계정·키를 코드에 적지 않는다.
 * 필요한 변수가 비어 있으면 해당 스위트는 실패하지 않고 건너뛴다(describe.skipIf).
 */

export type AccountKey = "ADMIN" | "LEADER" | "MEMBER" | "PENDING" | "RETIRED";

export const BASE_VAR = "ERP_TEST_BASE_URL";
export const SUPABASE_VARS = ["ERP_TEST_SUPABASE_URL", "ERP_TEST_SUPABASE_ANON_KEY"] as const;

/** 계정 한 개에 필요한 변수 이름 */
export function accountVars(key: AccountKey): string[] {
  return [`ERP_TEST_${key}_EMAIL`, `ERP_TEST_${key}_PASSWORD`];
}

/** 로그인이 필요한 스위트가 요구하는 변수 전체 */
export function requiredVarsFor(accounts: AccountKey[]): string[] {
  return [BASE_VAR, ...SUPABASE_VARS, ...accounts.flatMap(accountVars)];
}

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

/** 비어 있는 변수 이름 목록 */
export function missingVars(names: string[]): string[] {
  return names.filter((name) => !read(name));
}

/**
 * 스위트를 건너뛸지 판정하고, 건너뛸 때는 이유를 한 번 출력한다.
 * 반환값을 `describe.skipIf(...)`에 넘긴다.
 */
export function shouldSkip(suite: string, names: string[]): boolean {
  const missing = missingVars(names);
  if (missing.length > 0) {
    console.warn(`[test:api] "${suite}" 건너뜀 — 환경변수 없음: ${missing.join(", ")}`);
    return true;
  }
  return false;
}

export function baseUrl(): string {
  const value = read(BASE_VAR);
  if (!value) throw new Error(`${BASE_VAR}가 비어 있습니다.`);
  return value.replace(/\/+$/, "");
}

export function supabaseUrl(): string {
  const value = read("ERP_TEST_SUPABASE_URL");
  if (!value) throw new Error("ERP_TEST_SUPABASE_URL가 비어 있습니다.");
  return value.replace(/\/+$/, "");
}

export function supabaseAnonKey(): string {
  const value = read("ERP_TEST_SUPABASE_ANON_KEY");
  if (!value) throw new Error("ERP_TEST_SUPABASE_ANON_KEY가 비어 있습니다.");
  return value;
}

export function accountCredentials(key: AccountKey): { email: string; password: string } {
  const [emailVar, passwordVar] = accountVars(key);
  const email = read(emailVar);
  const password = process.env[passwordVar];
  if (!email || !password) throw new Error(`${emailVar}/${passwordVar}가 비어 있습니다.`);
  return { email, password };
}

/** 선택: Vercel 미리보기 보호 우회 토큰(Protection Bypass for Automation) */
export function vercelBypassToken(): string | undefined {
  return read("ERP_TEST_VERCEL_BYPASS");
}
