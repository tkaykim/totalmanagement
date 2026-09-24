import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

// 남은 라우트 재직 가드 (spec R1): 근태·버그리포트·댓글·전속 아티스트·휴가·알림·푸시·통합 거래처·auth/me.
// 가짜 Supabase 클라이언트로 핸들러를 직접 부른다. 운영 DB·네트워크에 닿지 않는다.

type Row = Record<string, unknown> | null;

const state: { user: { id: string; email: string } | null; appUser: Row; tables: string[] } = {
  user: null,
  appUser: null,
  tables: [],
};

/** 어떤 체인이든 받아 주는 쿼리 빌더. await 하면 빈 결과를 돌려준다. */
function makeBuilder(table: string): unknown {
  const result = () => {
    if (table === "app_users") return { data: state.appUser, error: null };
    return { data: [], error: null, count: 0 };
  };
  const single = () => {
    if (table === "app_users") return Promise.resolve({ data: state.appUser, error: null });
    return Promise.resolve({ data: { id: 1, bu_code: "REACT" }, error: null });
  };
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result());
      if (prop === "single" || prop === "maybeSingle") return single;
      return () => proxy;
    },
  };
  const proxy: unknown = new Proxy({}, handler);
  return proxy;
}

function makeClient() {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: state.user }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
    from: vi.fn((table: string) => {
      state.tables.push(table);
      return makeBuilder(table);
    }),
    rpc: vi.fn(async () => ({ data: [], error: null })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: { path: "x" }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "http://localhost/x" } })),
        createSignedUrl: vi.fn(async () => ({ data: { signedUrl: "http://localhost/x" }, error: null })),
        remove: vi.fn(async () => ({ data: [], error: null })),
      })),
    },
  };
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => makeClient()),
  createPureClient: vi.fn(async () => makeClient()),
}));
// Proxy로 가짜를 만들면 `then`까지 가짜가 되어 import가 멈춘다. 이름을 나열한다.
vi.mock("@/lib/notification-sender", () =>
  Object.fromEntries(
    [
      "createNotification",
      "createNotificationForUsers",
      "notifyTaskAssigned",
      "notifyTaskDueSoon",
      "notifyDueSoonSummary",
      "notifyTaskOverdue",
      "notifyOverdueSummary",
      "notifyProjectPMAssigned",
      "notifyProjectParticipantAdded",
      "notifyAutoCheckout",
      "notifyWorkRequestApproved",
      "notifyWorkRequestRejected",
      "notifyLeaveRequestApproved",
      "notifyLeaveRequestRejected",
      "notifyBugReportResolved",
      "notifyCommentMention",
      "notifyProjectComment",
      "notifyTaskComment",
      "notifyTaskCommentToUsers",
      "notifyProjectStatusChange",
      "notifyTaskStatusChange",
      "notifyLeaveRequestCreated",
      "notifyReservationCreated",
      "notifyReservationUpdated",
      "notifyReservationCancelled",
      "notifyCheckInToHeadAdmin",
      "notifyCheckOutToHeadAdmin",
    ].map((n) => [n, vi.fn(async () => undefined)]),
  ),
);
vi.mock("@/lib/activity-logger", () => ({ createActivityLog: vi.fn(async () => undefined) }));
vi.mock("@/lib/push-sender", () => ({
  sendPushToUser: vi.fn(async () => undefined),
  sendPushToUsers: vi.fn(async () => undefined),
}));

// ---------- 대상 라우트 ----------
const API = path.resolve(__dirname, "../../src/app/api");

/** 이번에 가드를 넣은 라우트 */
const ROUTES = [
  "attendance/admin/create-log",
  "attendance/admin/overview",
  "attendance/auto-checkout-history",
  "attendance/check-in",
  "attendance/check-out",
  "attendance/logs",
  "attendance/logs/[id]",
  "attendance/logs/[id]/correct-checkout",
  "attendance/pending-auto-checkouts",
  "attendance/stats",
  "attendance/status",
  "attendance/team-stats",
  "attendance/work-requests",
  "attendance/work-requests/[id]",
  "attendance/work-status",
  "auth/me",
  "bug-reports",
  "bug-reports/[id]",
  "comments/[id]",
  "comments/[id]/read",
  "comments/mentions",
  "exclusive-artists",
  "exclusive-artists/[id]",
  "leave/balances",
  "leave/compensatory",
  "leave/compensatory/[id]/approve",
  "leave/compensatory/[id]/reject",
  "leave/grants",
  "leave/logs",
  "leave/pending",
  "leave/requests",
  "leave/requests/[id]/reject",
  "leave/team-stats",
  "notifications",
  "notifications/[id]",
  "notifications/read-all",
  "push-tokens",
  "push/conditional",
  "push/scenario",
  "push/send",
  "push/test",
  "push/tokens",
  "unified-partners",
  "unified-partners/[id]",
  "unified-partners/[id]/access-request",
  "unified-partners/access-requests",
  "unified-partners/access-requests/[id]/approve",
  "unified-partners/access-requests/[id]/reject",
];

/** 같은 폴더에 있지만 이 파일 대상이 아닌 라우트와 이유 */
const EXCLUDED: Record<string, string> = {
  "attendance/auto-checkout": "크론(CRON_SECRET)",
  "leave/auto-generate-monthly": "크론(CRON_SECRET)",
  "leave/auto-generate-yearly": "크론(CRON_SECRET)",
  "notifications/due-soon": "크론(CRON_SECRET)",
  "notifications/overdue": "크론(CRON_SECRET)",
  "auth/logout": "로그아웃(세션 종료만)",
  "auth/signup": "가입 신청(공개)",
  "attendance/work-requests/[id]/approve": "t4-routes에서 검증",
  "attendance/work-requests/[id]/reject": "t4-routes에서 검증",
  "comments/[id]/reads": "t4-routes에서 검증",
  "leave/requests/[id]": "t4-routes에서 검증",
  "leave/requests/[id]/approve": "t4-routes에서 검증",
  "unified-partners/categories": "t4-routes에서 검증",
};

const DIRS = [
  "attendance",
  "auth",
  "bug-reports",
  "comments/[id]",
  "comments/mentions",
  "exclusive-artists",
  "leave",
  "notifications",
  "push",
  "push-tokens",
  "unified-partners",
];

function listRoutes(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "route.ts") out.push(path.relative(API, path.dirname(p)).split(path.sep).join("/"));
    }
  };
  walk(path.join(API, dir));
  return out;
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

async function loadHandlers(route: string): Promise<[string, Handler][]> {
  const mod = (await import(/* @vite-ignore */ path.join(API, route, "route.ts"))) as Record<string, unknown>;
  return METHODS.filter((m) => typeof mod[m] === "function").map((m) => [m, mod[m] as Handler]);
}

const PARAMS = { id: "1" };

function makeRequest(route: string, method: string) {
  const url = new URL(`/api/${route.replace(/\[(\w+)\]/g, "1")}?year=2026&month=9`, "http://localhost");
  if (method === "GET" || method === "DELETE") return new NextRequest(url, { method });
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "e2e", name: "e2e", token: "e2e", reason: "e2e" }),
  });
}

async function call(route: string, method: string, handler: Handler) {
  return handler(makeRequest(route, method), { params: Promise.resolve(PARAMS) });
}

const AUTH_USER = { id: "11111111-1111-1111-1111-111111111111", email: "e2e@example.test" };
const staff = (o: Record<string, unknown> = {}) => ({
  id: AUTH_USER.id,
  role: "admin",
  bu_code: "HEAD",
  status: "active",
  name: "e2e",
  email: AUTH_USER.email,
  position: null,
  ...o,
});

async function expectError(res: Response, status: number) {
  expect(res.status).toBe(status);
  const body = await res.json();
  expect(typeof body.error).toBe("string");
}

/** 막힌 경우 app_users 말고 다른 테이블은 조회하지 않았어야 한다 */
function expectNoDataQuery() {
  expect(state.tables.filter((t) => t !== "app_users")).toEqual([]);
}

beforeEach(() => {
  state.user = null;
  state.appUser = null;
  state.tables = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

describe("대상 목록", () => {
  it("폴더 안 모든 라우트가 대상 또는 제외 목록에 있다", () => {
    const all = DIRS.flatMap(listRoutes).sort();
    const known = new Set([...ROUTES, ...Object.keys(EXCLUDED)]);
    expect(all.filter((r) => !known.has(r))).toEqual([]);
    for (const r of ROUTES) expect(all).toContain(r);
  });
});

describe.each(ROUTES)("재직 가드: %s", (route) => {
  it("비로그인 → 401, 데이터 조회 없음", async () => {
    const handlers = await loadHandlers(route);
    expect(handlers.length).toBeGreaterThan(0);
    for (const [method, handler] of handlers) {
      state.tables = [];
      await expectError(await call(route, method, handler), 401);
      expectNoDataQuery();
    }
  });

  it("app_users 행 없음 → 401", async () => {
    state.user = AUTH_USER;
    state.appUser = null;
    for (const [method, handler] of await loadHandlers(route)) {
      state.tables = [];
      await expectError(await call(route, method, handler), 401);
      expectNoDataQuery();
    }
  });

  it("퇴사자(관리자 역할이어도) → 403, 데이터 조회 없음", async () => {
    state.user = AUTH_USER;
    state.appUser = staff({ status: "retired" });
    for (const [method, handler] of await loadHandlers(route)) {
      state.tables = [];
      await expectError(await call(route, method, handler), 403);
      expectNoDataQuery();
    }
  });

  it("승인 대기(pending) → 403", async () => {
    state.user = AUTH_USER;
    state.appUser = staff({ status: "pending" });
    for (const [method, handler] of await loadHandlers(route)) {
      state.tables = [];
      await expectError(await call(route, method, handler), 403);
      expectNoDataQuery();
    }
  });
});

describe("재직 직원은 가드를 통과한다(응답 모양 유지)", () => {
  it("auth/me GET → 200 { user: { ...user, profile } }", async () => {
    state.user = AUTH_USER;
    state.appUser = staff();
    const handlers = Object.fromEntries(await loadHandlers("auth/me"));
    const res = await handlers.GET(makeRequest("auth/me", "GET"), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe(AUTH_USER.id);
    expect(body.user.profile).toMatchObject({ id: AUTH_USER.id, status: "active" });
  });

  for (const route of ["notifications", "comments/mentions", "leave/balances", "push-tokens"]) {
    it(`${route} GET → 401·403 아님`, async () => {
      state.user = AUTH_USER;
      state.appUser = staff();
      const handlers = Object.fromEntries(await loadHandlers(route));
      const res = await call(route, "GET", handlers.GET);
      expect([401, 403]).not.toContain(res.status);
    });
  }
});
