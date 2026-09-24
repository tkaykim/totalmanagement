import { beforeEach, describe, expect, it, vi } from "vitest";
import { isGuardLookup, makeFakeAdmin, readJson, type QueryResult, type QueryState } from "./t8-fake-supabase";

// 가입 신청 목록·승인·거절 계약 (spec R21).
const getUser = vi.fn();
let resolver: (q: QueryState) => QueryResult;
let fake = makeFakeAdmin((q) => resolver(q));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
  createPureClient: vi.fn(async () => fake.client),
}));
vi.mock("@/lib/feature-flags", () => ({ isAuditV2Enabled: vi.fn(() => false) }));

import { GET } from "@/app/api/users/signup-requests/route";
import { POST as APPROVE } from "@/app/api/users/signup-requests/[id]/approve/route";
import { POST as REJECT } from "@/app/api/users/signup-requests/[id]/reject/route";
import { isAuditV2Enabled } from "@/lib/feature-flags";

const ME = "11111111-1111-1111-1111-111111111111";
const TARGET = "33333333-3333-3333-3333-333333333333";

let caller: Record<string, unknown> | null;
let updateResult: QueryResult;

function params(id = TARGET) {
  return { params: Promise.resolve({ id }) };
}
function post(body?: unknown) {
  return new Request("http://localhost/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  }) as any;
}

const HEAD_ADMIN = { id: ME, role: "admin", bu_code: "HEAD", status: "active", name: "관리자" };

describe("signup-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAuditV2Enabled).mockReturnValue(false);
    fake = makeFakeAdmin((q) => resolver(q));
    getUser.mockResolvedValue({ data: { user: { id: ME } }, error: null });
    caller = { ...HEAD_ADMIN };
    updateResult = { data: { id: TARGET, status: "active" }, error: null };
    resolver = (q) => {
      if (isGuardLookup(q, ME)) return { data: caller, error: null };
      if (q.op === "select") return { data: [{ id: TARGET, status: "pending" }], error: null };
      if (q.op === "update") return updateResult;
      return { data: null, error: null };
    };
  });

  const calls: Array<[string, () => Promise<Response>]> = [
    ["GET 목록", () => GET()],
    ["승인", () => APPROVE(post({ bu_code: "REACT", role: "member" }), params())],
    ["거절", () => REJECT(post(), params())],
  ];

  for (const [label, call] of calls) {
    it(`${label}: 로그인 없음 → 401`, async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: null });
      const { status, body } = await readJson(await call());
      expect(status).toBe(401);
      expect(typeof body.error).toBe("string");
      expect(fake.queries.some((q) => q.op === "update")).toBe(false);
    });

    const forbidden: Array<[string, Record<string, unknown>]> = [
      ["HEAD 아닌 관리자", { ...HEAD_ADMIN, bu_code: "REACT" }],
      ["HEAD 리더", { ...HEAD_ADMIN, role: "leader" }],
      ["HEAD 멤버", { ...HEAD_ADMIN, role: "member" }],
      ["승인 대기", { ...HEAD_ADMIN, status: "pending" }],
      ["퇴사 HEAD 관리자", { ...HEAD_ADMIN, status: "retired" }],
    ];
    for (const [who, row] of forbidden) {
      it(`${label}: ${who} → 403, DB 변경 없음`, async () => {
        caller = { ...row };
        const { status, body } = await readJson(await call());
        expect(status).toBe(403);
        expect(typeof body.error).toBe("string");
        expect(fake.queries.some((q) => q.op === "update")).toBe(false);
      });
    }
  }

  it("GET: 본사 관리자 → 200 {requests}, pending·rejected, 신청 시각 최신순", async () => {
    const { status, body } = await readJson(await GET());
    expect(status).toBe(200);
    expect(Array.isArray(body.requests)).toBe(true);
    const list = fake.queries.find((q) => q.op === "select" && !isGuardLookup(q, ME));
    expect(list!.filters).toContainEqual(["in", "status", ["pending", "rejected"]]);
    expect(list!.orders[0][0]).toBe("signup_requested_at");
    expect((list!.orders[0][1] as any).ascending).toBe(false);
  });

  it("승인: 성공 → 200 {user}, active + approved_by/at + 지정 사업부·역할", async () => {
    const { status, body } = await readJson(await APPROVE(post({ bu_code: "DEETZ", role: "leader" }), params()));
    expect(status).toBe(200);
    expect(body.user).toBeDefined();
    const upd = fake.queries.find((q) => q.op === "update")!;
    expect(upd.payload).toMatchObject({ status: "active", bu_code: "DEETZ", role: "leader", approved_by: ME });
    expect(typeof (upd.payload as any).approved_at).toBe("string");
    expect(upd.payload).not.toHaveProperty("updated_by");
    expect(upd.filters).toContainEqual(["eq", "id", TARGET]);
    expect(upd.filters).toContainEqual(["eq", "status", "pending"]);
  });

  it("승인: 감사 스위치 켜짐 → updated_by 기록", async () => {
    vi.mocked(isAuditV2Enabled).mockReturnValue(true);
    const { status } = await readJson(await APPROVE(post({ bu_code: "REACT", role: "member" }), params()));
    expect(status).toBe(200);
    const upd = fake.queries.find((q) => q.op === "update")!;
    expect((upd.payload as any).updated_by).toBe(ME);
  });

  const badBodies: unknown[] = [
    { bu_code: "XYZ", role: "member" },
    { bu_code: "", role: "member" },
    { bu_code: "REACT", role: "viewer" },
    { bu_code: "REACT", role: "artist" },
    { bu_code: "REACT", role: "owner" },
    { bu_code: "REACT" },
    "not json",
  ];
  for (const bad of badBodies) {
    it(`승인: 값 오류 ${JSON.stringify(bad)} → 400, DB 변경 없음`, async () => {
      const { status, body } = await readJson(await APPROVE(post(bad), params()));
      expect(status).toBe(400);
      expect(typeof body.error).toBe("string");
      expect(fake.queries.some((q) => q.op === "update")).toBe(false);
    });
  }

  it("승인: pending 아니거나 없는 신청 → 404", async () => {
    updateResult = { data: null, error: null };
    const { status, body } = await readJson(await APPROVE(post({ bu_code: "REACT", role: "member" }), params()));
    expect(status).toBe(404);
    expect(typeof body.error).toBe("string");
  });

  it("거절: 성공 → 200 {user}, rejected + approved_by/at", async () => {
    updateResult = { data: { id: TARGET, status: "rejected" }, error: null };
    const { status, body } = await readJson(await REJECT(post(), params()));
    expect(status).toBe(200);
    expect(body.user).toBeDefined();
    const upd = fake.queries.find((q) => q.op === "update")!;
    expect(upd.payload).toMatchObject({ status: "rejected", approved_by: ME });
    expect(typeof (upd.payload as any).approved_at).toBe("string");
    expect(upd.payload).not.toHaveProperty("bu_code");
    expect(upd.payload).not.toHaveProperty("role");
    expect(upd.filters).toContainEqual(["eq", "status", "pending"]);
  });

  it("거절: pending 아니거나 없는 신청 → 404", async () => {
    updateResult = { data: null, error: null };
    const { status } = await readJson(await REJECT(post(), params()));
    expect(status).toBe(404);
  });

  it("사람 행 삭제 호출은 없다", async () => {
    await APPROVE(post({ bu_code: "REACT", role: "member" }), params());
    await REJECT(post(), params());
    expect(fake.queries.some((q) => q.op === "delete")).toBe(false);
    expect(fake.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
});
