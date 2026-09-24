import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

// T4 — 일반 라우트 봉인 (spec R1·R2·R3·R27).
// 가짜 Supabase 클라이언트로 라우트 핸들러를 직접 부른다. 운영 DB·네트워크에 닿지 않는다.

// ---------- 가짜 Supabase ----------
type Row = Record<string, unknown> | null;

const state: { user: { id: string; email: string } | null; appUser: Row; tables: string[] } = {
  user: null,
  appUser: null,
  tables: [],
};

/** 어떤 체인이든 받아 주는 쿼리 빌더. await 하면 빈 결과를 돌려준다. */
function makeBuilder(table: string): unknown {
  const result = () => {
    if (table === "app_users") {
      return { data: state.appUser, error: null };
    }
    return { data: [], error: null, count: 0 };
  };
  const single = () => {
    if (table === "app_users") return Promise.resolve({ data: state.appUser, error: null });
    return Promise.resolve({ data: { id: 1, bu_code: "REACT" }, error: null });
  };
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(result());
      }
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
vi.mock("@/lib/push-sender", () => ({ sendPushToUser: vi.fn(async () => undefined) }));

// ---------- 대상 라우트 ----------
const API = path.resolve(__dirname, "../../src/app/api");

/** R2 23개 중 `projects/*` 2개를 뺀 21개 + 서비스 권한 키를 쓰는 나머지(T4 소유) */
const GUARDED_ROUTES = [
  // R2
  "business-units",
  "channel-contents",
  "channel-contents/[id]",
  "channels",
  "channels/[id]",
  "client-workers",
  "client-workers/[id]",
  "clients",
  "clients/[id]",
  "comments/[id]/reads",
  "events",
  "events/[id]",
  "external-workers",
  "external-workers/[id]",
  "manuals",
  "manuals/[id]",
  "manuals/images",
  "org-members",
  "org-members/[id]",
  "unified-partners/categories",
  "upload",
  // 서비스 권한 키를 쓰는 나머지 라우트
  "activity-logs",
  "activity-logs/admin",
  "ai/daily-report",
  "attendance/work-requests/[id]/approve",
  "attendance/work-requests/[id]/reject",
  "comments",
  "comments/attachments",
  "document-room",
  "document-room/[id]",
  "equipment",
  "equipment/[id]",
  "gowid/cards",
  "gowid/mapping",
  "leave/requests/[id]",
  "leave/requests/[id]/approve",
  "meeting-rooms",
  "reservations",
  "reservations/[id]",
  "task-templates",
  "task-templates/[id]",
  "vehicles",
  "work-logs",
  "work-logs/[id]",
  "work-logs/admin",
  "work-logs/admin/[userId]",
];

/** Gowid 공통 인증(`requireAuth`)을 쓰는 라우트 (T7 소유 project-link 제외) */
const GOWID_ROUTES = [
  "gowid/expenses",
  "gowid/expenses/[expenseId]",
  "gowid/expenses/[expenseId]/approval-status",
  "gowid/expenses/[expenseId]/comments",
  "gowid/expenses/[expenseId]/memo",
  "gowid/expenses/[expenseId]/participants",
  "gowid/expenses/[expenseId]/purposes",
  "gowid/expenses/bulk-approve",
  "gowid/expenses/bulk-purposes",
  "gowid/expenses/not-submitted",
  "gowid/members",
  "gowid/purposes",
];

function listRoutes(dir: string): string[] {
  const base = path.join(API, dir);
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "route.ts") out.push(path.relative(API, path.dirname(p)).split(path.sep).join("/"));
    }
  };
  walk(base);
  return out.sort();
}

const EXTERNAL_ROUTES = [...listRoutes("artist"), ...listRoutes("partner-settlements")];

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

async function loadHandlers(route: string): Promise<[string, Handler][]> {
  const mod = (await import(/* @vite-ignore */ path.join(API, route, "route.ts"))) as Record<string, unknown>;
  return METHODS.filter((m) => typeof mod[m] === "function").map((m) => [m, mod[m] as Handler]);
}

const PARAMS = { id: "1", userId: "22222222-2222-2222-2222-222222222222", expenseId: "1" };

function makeRequest(route: string, method: string) {
  const url = new URL(`/api/${route.replace(/\[(\w+)\]/g, "1")}?bu=REACT&year=2026&month=9`, "http://localhost");
  if (method === "GET" || method === "DELETE") return new NextRequest(url, { method });
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "e2e", bu_code: "REACT", title: "e2e" }),
  });
}

async function call(route: string, method: string, handler: Handler) {
  return handler(makeRequest(route, method), { params: Promise.resolve(PARAMS) });
}

const AUTH_USER = { id: "11111111-1111-1111-1111-111111111111", email: "e2e@example.test" };
const staff = (o: Record<string, unknown> = {}) => ({
  id: AUTH_USER.id,
  role: "member",
  bu_code: "REACT",
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

/** 차단된 경우 app_users 말고 다른 테이블은 조회하지 않았어야 한다 */
function expectNoDataQuery() {
  expect(state.tables.filter((t) => t !== "app_users")).toEqual([]);
}

beforeEach(() => {
  state.user = null;
  state.appUser = null;
  state.tables = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe.each([...GUARDED_ROUTES, ...GOWID_ROUTES])("재직 가드: %s", (route) => {
  it("비로그인 → 401, 데이터 조회 없음", async () => {
    const handlers = await loadHandlers(route);
    expect(handlers.length).toBeGreaterThan(0);
    for (const [method, handler] of handlers) {
      state.tables = [];
      const res = await call(route, method, handler);
      await expectError(res, 401);
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

  for (const status of ["retired", "pending", "rejected"]) {
    it(`status=${status} → 403, 데이터 조회 없음`, async () => {
      state.user = AUTH_USER;
      state.appUser = staff({ status, role: "admin", bu_code: "HEAD" });
      for (const [method, handler] of await loadHandlers(route)) {
        state.tables = [];
        await expectError(await call(route, method, handler), 403);
        expectNoDataQuery();
      }
    });
  }

  it("사업부 없는 active → 403", async () => {
    state.user = AUTH_USER;
    state.appUser = staff({ bu_code: null });
    for (const [method, handler] of await loadHandlers(route)) {
      state.tables = [];
      await expectError(await call(route, method, handler), 403);
      expectNoDataQuery();
    }
  });
});

describe("재직 직원은 통과한다", () => {
  const PASS_GETS = [
    "business-units",
    "channels",
    "channel-contents",
    "clients",
    "client-workers",
    "events",
    "external-workers",
    "manuals",
    "org-members",
    "unified-partners/categories",
    "comments/[id]/reads",
  ];
  for (const route of PASS_GETS) {
    it(`${route} GET → 200`, async () => {
      state.user = AUTH_USER;
      state.appUser = staff();
      const handlers = Object.fromEntries(await loadHandlers(route));
      const res = await call(route, "GET", handlers.GET);
      expect(res.status).toBe(200);
    });
  }
});

describe("외부인 기능은 누구에게나 403 (R27)", () => {
  it("대상 라우트가 있다", () => {
    expect(EXTERNAL_ROUTES.length).toBeGreaterThan(0);
  });

  const cases: [string, () => void][] = [
    ["비로그인", () => {}],
    ["재직 관리자(HEAD admin)", () => {
      state.user = AUTH_USER;
      state.appUser = staff({ role: "admin", bu_code: "HEAD" });
    }],
    ["재직 직원", () => {
      state.user = AUTH_USER;
      state.appUser = staff();
    }],
    ["artist 역할", () => {
      state.user = AUTH_USER;
      state.appUser = staff({ role: "artist" });
    }],
  ];

  for (const route of EXTERNAL_ROUTES) {
    for (const [label, setup] of cases) {
      it(`${route} — ${label} → 403`, async () => {
        setup();
        for (const [method, handler] of await loadHandlers(route)) {
          state.tables = [];
          await expectError(await call(route, method, handler), 403);
          expectNoDataQuery();
        }
      });
    }
  }
});

describe("서명 URL 라우트 삭제 (R3)", () => {
  it("storage/signed-url 라우트 파일이 없다", () => {
    expect(fs.existsSync(path.join(API, "storage/signed-url/route.ts"))).toBe(false);
    expect(fs.existsSync(path.join(API, "storage/signed-url"))).toBe(false);
  });
});

describe("/artist 화면은 메인으로 돌려보낸다 (R27)", () => {
  it("page.tsx가 redirect('/')만 한다", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../src/app/artist/page.tsx"), "utf8");
    expect(src).toMatch(/redirect\(\s*['"]\/['"]\s*\)/);
    expect(src).not.toMatch(/artist-dashboard/);
  });
});

// NextResponse import 유지 (타입 확인용)
void NextResponse;
