import { beforeEach, describe, expect, it, vi } from "vitest";
import { isGuardLookup, makeFakeAdmin, readJson, type QueryResult, type QueryState } from "./t8-fake-supabase";

// 직원 정보 수정·목록·생성·본인 상태 (spec R22·R23·R1 본인 상태 예외).
const getUser = vi.fn();
let resolver: (q: QueryState) => QueryResult;
let fake = makeFakeAdmin((q) => resolver(q));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  // 세션 클라이언트는 auth만 있다. 가드 뒤 DB 쓰기·읽기는 서비스 권한 클라이언트로 한다.
  createClient: vi.fn(async () => ({ auth: { getUser } })),
  createPureClient: vi.fn(async () => fake.client),
}));
vi.mock("@/lib/feature-flags", () => ({ isAuditV2Enabled: vi.fn(() => false) }));

import { PATCH } from "@/app/api/users/[id]/route";
import { GET as LIST, POST as CREATE } from "@/app/api/users/route";
import { GET as MY_STATUS } from "@/app/api/users/me/status/route";
import { isAuditV2Enabled } from "@/lib/feature-flags";

const ME = "11111111-1111-1111-1111-111111111111";
const OTHER = "44444444-4444-4444-4444-444444444444";

const ADMIN = { id: ME, role: "admin", bu_code: "REACT", status: "active", name: "관리자" };
const MEMBER = { id: ME, role: "member", bu_code: "REACT", status: "active", name: "멤버" };

let caller: Record<string, unknown> | null;
let targets: Record<string, Record<string, unknown>>;

function patch(body: unknown) {
  return new Request("http://localhost/api/users/x", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as any;
}
function params(id: string) {
  return { params: Promise.resolve({ id }) };
}
function updates() {
  return fake.queries.filter((q) => q.op === "update");
}

describe("PATCH /api/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAuditV2Enabled).mockReturnValue(false);
    fake = makeFakeAdmin((q) => resolver(q));
    getUser.mockResolvedValue({ data: { user: { id: ME } }, error: null });
    caller = { ...ADMIN };
    targets = {
      [ME]: { id: ME, role: "admin", bu_code: "REACT", status: "active" },
      [OTHER]: { id: OTHER, role: "member", bu_code: "FLOW", status: "active" },
    };
    resolver = (q) => {
      if (isGuardLookup(q, ME)) return { data: caller, error: null };
      const idFilter = q.filters.find(([k, c]) => k === "eq" && c === "id");
      const id = idFilter?.[2] as string;
      if (q.op === "select") return { data: targets[id] ?? null, error: null };
      if (q.op === "update") return { data: { ...targets[id], ...(q.payload as object) }, error: null };
      return { data: null, error: null };
    };
  });

  it("로그인 없음 → 401", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { status } = await readJson(await PATCH(patch({ name: "x" }), params(OTHER)));
    expect(status).toBe(401);
    expect(updates()).toHaveLength(0);
  });

  it("승인 대기 계정 → 403", async () => {
    caller = { ...ADMIN, status: "pending" };
    const { status } = await readJson(await PATCH(patch({ name: "x" }), params(OTHER)));
    expect(status).toBe(403);
    expect(updates()).toHaveLength(0);
  });

  it("관리자 아닌 직원이 남의 역할 변경 → 403, DB 변경 없음", async () => {
    caller = { ...MEMBER };
    const { status, body } = await readJson(await PATCH(patch({ role: "admin" }), params(OTHER)));
    expect(status).toBe(403);
    expect(typeof body.error).toBe("string");
    expect(updates()).toHaveLength(0);
  });

  it("리더가 남의 사업부 변경 → 403", async () => {
    caller = { ...MEMBER, role: "leader" };
    const { status } = await readJson(await PATCH(patch({ bu_code: "REACT" }), params(OTHER)));
    expect(status).toBe(403);
    expect(updates()).toHaveLength(0);
  });

  it("관리자 아닌 직원이 본인 역할을 올림 → 403", async () => {
    caller = { ...MEMBER };
    targets[ME] = { id: ME, role: "member", bu_code: "REACT", status: "active" };
    const { status } = await readJson(await PATCH(patch({ role: "admin" }), params(ME)));
    expect(status).toBe(403);
    expect(updates()).toHaveLength(0);
  });

  it("관리자 아닌 직원의 다른 칸 수정 → 403 (기존대로 관리자만)", async () => {
    caller = { ...MEMBER };
    const { status } = await readJson(await PATCH(patch({ name: "새 이름" }), params(OTHER)));
    expect(status).toBe(403);
    expect(updates()).toHaveLength(0);
  });

  for (const [field, value] of [
    ["role", "member"],
    ["bu_code", "HEAD"],
    ["status", "retired"],
  ] as const) {
    it(`관리자가 본인 ${field} 변경 → 403, DB 변경 없음`, async () => {
      const { status, body } = await readJson(await PATCH(patch({ [field]: value }), params(ME)));
      expect(status).toBe(403);
      expect(typeof body.error).toBe("string");
      expect(updates()).toHaveLength(0);
    });
  }

  it("관리자가 본인 이름 수정(역할·사업부·상태는 같은 값) → 200", async () => {
    const { status } = await readJson(
      await PATCH(patch({ name: "새 이름", role: "admin", bu_code: "REACT", status: "active" }), params(ME))
    );
    expect(status).toBe(200);
    const upd = updates()[0];
    expect(upd.payload).toMatchObject({ name: "새 이름" });
    expect(upd.payload).not.toHaveProperty("role");
    expect(upd.payload).not.toHaveProperty("bu_code");
    expect(upd.payload).not.toHaveProperty("status");
  });

  it("관리자가 남의 역할·사업부·상태 변경 → 200, 허용 컬럼만 저장", async () => {
    const { status } = await readJson(
      await PATCH(
        patch({
          role: "leader",
          bu_code: "DEETZ",
          status: "retired",
          position: "팀장",
          id: "evil",
          created_at: "2000-01-01",
          approved_by: ME,
          updated_by: "someone",
        }),
        params(OTHER)
      )
    );
    expect(status).toBe(200);
    const upd = updates()[0];
    expect(upd.filters).toContainEqual(["eq", "id", OTHER]);
    const payload = upd.payload as Record<string, unknown>;
    expect(payload).toMatchObject({ role: "leader", bu_code: "DEETZ", status: "retired", position: "팀장" });
    for (const k of ["id", "created_at", "approved_by", "updated_by"]) expect(payload).not.toHaveProperty(k);
  });

  it("감사 스위치 켜짐 → updated_by = 호출자", async () => {
    vi.mocked(isAuditV2Enabled).mockReturnValue(true);
    const { status } = await readJson(await PATCH(patch({ role: "manager" }), params(OTHER)));
    expect(status).toBe(200);
    expect((updates()[0].payload as any).updated_by).toBe(ME);
  });

  for (const bad of [{ role: "viewer" }, { role: "artist" }, { bu_code: "XYZ" }, { status: "deleted" }]) {
    it(`허용 안 되는 값 ${JSON.stringify(bad)} → 400`, async () => {
      const { status } = await readJson(await PATCH(patch(bad), params(OTHER)));
      expect(status).toBe(400);
      expect(updates()).toHaveLength(0);
    });
  }

  it("없는 사람 → 404", async () => {
    const { status } = await readJson(await PATCH(patch({ name: "x" }), params("nope")));
    expect(status).toBe(404);
    expect(updates()).toHaveLength(0);
  });

  it("삭제 호출은 없다", async () => {
    await PATCH(patch({ status: "retired" }), params(OTHER));
    expect(fake.queries.some((q) => q.op === "delete")).toBe(false);
  });
});

describe("GET·POST /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake = makeFakeAdmin((q) => resolver(q));
    getUser.mockResolvedValue({ data: { user: { id: ME } }, error: null });
    caller = { ...ADMIN };
    resolver = (q) => {
      if (isGuardLookup(q, ME)) return { data: caller, error: null };
      if (q.op === "select" && q.terminal === "maybeSingle") return { data: { ...caller }, error: null };
      if (q.op === "select") return { data: [], error: null };
      if (q.op === "insert") return { data: { id: "new" }, error: null };
      return { data: null, error: null };
    };
    fake.auth.admin.createUser.mockResolvedValue({ data: { user: { id: "new" } }, error: null });
  });

  it("GET 로그인 없음 → 401", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await LIST()).status).toBe(401);
  });

  it("GET 승인 대기 → 403", async () => {
    caller = { ...MEMBER, status: "pending", bu_code: null };
    expect((await LIST()).status).toBe(403);
  });

  it("GET 재직 직원 → 200 {users, retiredUsers, currentUser}", async () => {
    caller = { ...MEMBER };
    const { status, body } = await readJson(await LIST());
    expect(status).toBe(200);
    expect(body).toHaveProperty("users");
    expect(body).toHaveProperty("retiredUsers");
    expect(body).toHaveProperty("currentUser");
  });

  it("POST 관리자 아님 → 403, 계정 생성 안 함", async () => {
    caller = { ...MEMBER };
    const res = await CREATE(
      new Request("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({ email: "e2e@example.test", password: "longenough1", name: "x" }),
      }) as any
    );
    expect(res.status).toBe(403);
    expect(fake.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("POST 관리자 → viewer 역할은 400", async () => {
    const res = await CREATE(
      new Request("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({ email: "e2e@example.test", password: "longenough1", name: "x", role: "viewer", bu_code: "REACT" }),
      }) as any
    );
    expect(res.status).toBe(400);
    expect(fake.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("POST 삽입 실패 → 인증 계정 되돌림", async () => {
    resolver = (q) => {
      if (isGuardLookup(q, ME)) return { data: caller, error: null };
      if (q.op === "insert") return { data: null, error: { message: "fail" } };
      return { data: null, error: null };
    };
    const res = await CREATE(
      new Request("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({ email: "e2e@example.test", password: "longenough1", name: "x", role: "member", bu_code: "REACT" }),
      }) as any
    );
    expect(res.status).toBe(500);
    expect(fake.auth.admin.deleteUser).toHaveBeenCalledWith("new");
  });
});

describe("GET /api/users/me/status (본인 상태, R1 예외)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake = makeFakeAdmin((q) => resolver(q));
    getUser.mockResolvedValue({ data: { user: { id: ME } }, error: null });
    resolver = (q) => (isGuardLookup(q, ME) ? { data: caller, error: null } : { data: null, error: null });
  });

  it("로그인 없음 → 401", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await MY_STATUS()).status).toBe(401);
  });

  for (const s of ["pending", "rejected", "retired", "active"]) {
    it(`status=${s} → 200 {status} (재직 여부와 무관), 다른 데이터 없음`, async () => {
      caller = { ...MEMBER, status: s, bu_code: s === "active" ? "REACT" : null };
      const { status, body } = await readJson(await MY_STATUS());
      expect(status).toBe(200);
      expect(body.status).toBe(s);
      expect(Object.keys(body).sort()).toEqual(["name", "status"]);
      expect(fake.queries.filter((q) => !isGuardLookup(q, ME))).toHaveLength(0);
    });
  }
});
