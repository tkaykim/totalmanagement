import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 가짜 Supabase 클라이언트. 운영 DB·네트워크에 닿지 않는다.
// 테이블별 결과를 `tables`에 넣으면 select 체인(eq/in/order/maybeSingle/await)이 그 값을 돌려준다.
type Result = { data: unknown; error: unknown };
const getUser = vi.fn();
let tables: Record<string, { single?: Result; list?: Result }> = {};
const calls: { table: string; op: string; args: unknown[] }[] = [];

function builder(table: string) {
  const b: Record<string, unknown> = {};
  const record = (op: string) => (...args: unknown[]) => {
    calls.push({ table, op, args });
    return b;
  };
  b.select = record("select");
  b.eq = record("eq");
  b.in = record("in");
  b.order = record("order");
  b.maybeSingle = async () => tables[table]?.single ?? { data: null, error: null };
  b.then = (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(tables[table]?.list ?? { data: [], error: null }).then(resolve, reject);
  return b;
}

const from = vi.fn((table: string) => builder(table));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
  createPureClient: vi.fn(async () => ({ from })),
}));

import { GET as getFinanceChanges } from "@/app/api/financial-entries/[id]/changes/route";
import { GET as getUserChanges } from "@/app/api/users/[id]/changes/route";

const ME = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const TARGET = "33333333-3333-3333-3333-333333333333";

/** 가드가 읽는 본인 app_users 행 + 변경자 이름 조회 결과를 같이 넣는다 */
function setMe(overrides: Record<string, unknown> = {}) {
  tables.app_users = {
    single: { data: { id: ME, role: "member", bu_code: "REACT", status: "active", name: "나", ...overrides }, error: null },
    list: { data: [{ id: OTHER, name: "다른 직원" }], error: null },
  };
}

const ENTRY = { id: 7, project_id: 3, bu_code: "REACT", created_by: OTHER, kind: "expense", status: "planned" };
const PROJECT = { id: 3, bu_code: "REACT", pm_id: null, participants: [], created_by: OTHER };
const UNORDERED = [
  { id: 1, entry_id: 7, action: "insert", field: "*", old_value: null, new_value: "kind=expense", changed_by: null, source: "external", changed_at: "2026-09-01T00:00:00Z" },
  { id: 3, entry_id: 7, action: "update", field: "status", old_value: "planned", new_value: "paid", changed_by: OTHER, source: "erp", changed_at: "2026-09-03T00:00:00Z" },
  { id: 2, entry_id: 7, action: "update", field: "amount", old_value: "100", new_value: "200", changed_by: OTHER, source: "erp", changed_at: "2026-09-03T00:00:00Z" },
];

const financeParams = (id = "7") => ({ params: Promise.resolve({ id }) });
const userParams = (id = TARGET) => ({ params: Promise.resolve({ id }) });
const req = new Request("http://localhost/x");

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  tables = {};
  getUser.mockResolvedValue({ data: { user: { id: ME } }, error: null });
  vi.stubEnv("ERP_AUDIT_V2", "1");
  setMe();
  tables.financial_entries = { single: { data: ENTRY, error: null } };
  tables.projects = { single: { data: PROJECT, error: null } };
  tables.financial_entry_changes = { list: { data: UNORDERED, error: null } };
  tables.app_user_changes = { list: { data: UNORDERED.map((r) => ({ ...r, user_id: TARGET })), error: null } };
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/financial-entries/[id]/changes", () => {
  it("비로그인 → 401", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await getFinanceChanges(req, financeParams());
    expect(res.status).toBe(401);
  });

  it("스위치 꺼짐 → 200 { changes: [], enabled: false }, 기록 테이블 조회 안 함", async () => {
    vi.stubEnv("ERP_AUDIT_V2", "");
    const res = await getFinanceChanges(req, financeParams());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ changes: [], enabled: false });
    expect(from).not.toHaveBeenCalledWith("financial_entry_changes");
    expect(from).not.toHaveBeenCalledWith("financial_entries");
  });

  it("없는 행 → 404", async () => {
    tables.financial_entries = { single: { data: null, error: null } };
    const res = await getFinanceChanges(req, financeParams());
    expect(res.status).toBe(404);
  });

  it("숫자가 아닌 id → 404", async () => {
    const res = await getFinanceChanges(req, financeParams("abc"));
    expect(res.status).toBe(404);
  });

  it("볼 수 없는 행(일반 직원, 남의 프로젝트·남의 행) → 404", async () => {
    const res = await getFinanceChanges(req, financeParams());
    expect(res.status).toBe(404);
    expect(from).not.toHaveBeenCalledWith("financial_entry_changes");
  });

  it("볼 수 있지만 기록 권한 없음(프로젝트 참여 일반 직원) → 403", async () => {
    tables.projects = { single: { data: { ...PROJECT, participants: [{ user_id: ME }] }, error: null } };
    const res = await getFinanceChanges(req, financeParams());
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalledWith("financial_entry_changes");
  });

  it("참여자가 id 문자열 배열이어도 참여로 본다 → 403(404 아님)", async () => {
    tables.projects = { single: { data: { ...PROJECT, participants: [ME] }, error: null } };
    const res = await getFinanceChanges(req, financeParams());
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalledWith("financial_entry_changes");
  });

  it("프로젝트 조회 오류 → 500", async () => {
    tables.projects = { single: { data: null, error: { message: "db down" } } };
    const res = await getFinanceChanges(req, financeParams());
    expect(res.status).toBe(500);
  });

  it("다른 사업부 리더 → 403", async () => {
    setMe({ role: "leader", bu_code: "GRIGO" });
    const res = await getFinanceChanges(req, financeParams());
    expect(res.status).toBe(403);
  });

  it("행 사업부 리더 → 200", async () => {
    setMe({ role: "leader", bu_code: "REACT" });
    const res = await getFinanceChanges(req, financeParams());
    expect(res.status).toBe(200);
  });

  it("등록자 → 200", async () => {
    tables.financial_entries = { single: { data: { ...ENTRY, created_by: ME }, error: null } };
    const res = await getFinanceChanges(req, financeParams());
    expect(res.status).toBe(200);
  });

  it("관리자 → 200, 최신순(같은 시각은 id 큰 것 먼저) + 변경자 이름", async () => {
    setMe({ role: "admin", bu_code: "HEAD" });
    const res = await getFinanceChanges(req, financeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.changes.map((c: { id: number }) => c.id)).toEqual([3, 2, 1]);
    expect(body.changes[0].changed_by_name).toBe("다른 직원");
    expect(body.changes[2].changed_by_name).toBeNull();
    expect(calls).toContainEqual({ table: "financial_entry_changes", op: "eq", args: ["entry_id", 7] });
    expect(calls).toContainEqual({ table: "financial_entry_changes", op: "order", args: ["changed_at", { ascending: false }] });
    expect(calls).toContainEqual({ table: "app_users", op: "in", args: ["id", [OTHER]] });
  });

  it("퇴사자 → 403(가드)", async () => {
    setMe({ role: "admin", status: "retired" });
    const res = await getFinanceChanges(req, financeParams());
    expect(res.status).toBe(403);
  });
});

describe("GET /api/users/[id]/changes", () => {
  it("스위치 꺼짐 → 200 { changes: [], enabled: false }", async () => {
    vi.stubEnv("ERP_AUDIT_V2", "0");
    const res = await getUserChanges(req, userParams());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ changes: [], enabled: false });
    expect(from).not.toHaveBeenCalledWith("app_user_changes");
  });

  it("비로그인 → 401", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await getUserChanges(req, userParams());
    expect(res.status).toBe(401);
  });

  for (const role of ["leader", "manager", "member"]) {
    it(`${role} → 403`, async () => {
      setMe({ role });
      const res = await getUserChanges(req, userParams());
      expect(res.status).toBe(403);
      expect(from).not.toHaveBeenCalledWith("app_user_changes");
    });
  }

  it("관리자, 없는 직원 → 404", async () => {
    setMe({ role: "admin", bu_code: "HEAD" });
    tables.app_users.single = { data: { id: ME, role: "admin", bu_code: "HEAD", status: "active" }, error: null };
    // 가드 조회 뒤 대상 조회는 없음으로 돌려준다
    let n = 0;
    from.mockImplementation((table: string) => {
      const b = builder(table);
      if (table === "app_users") {
        b.maybeSingle = async () =>
          n++ === 0 ? tables.app_users.single! : { data: null, error: null };
      }
      return b;
    });
    const res = await getUserChanges(req, userParams());
    expect(res.status).toBe(404);
    from.mockImplementation((table: string) => builder(table));
  });

  it("관리자 → 200, 최신순 + 변경자 이름", async () => {
    setMe({ role: "admin", bu_code: "HEAD" });
    const res = await getUserChanges(req, userParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.changes.map((c: { id: number }) => c.id)).toEqual([3, 2, 1]);
    expect(body.changes[0].changed_by_name).toBe("다른 직원");
    expect(calls).toContainEqual({ table: "app_user_changes", op: "eq", args: ["user_id", TARGET] });
  });
});
