import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// 무거운 의존성은 모두 가짜로 바꾼다. 테스트 중 운영 DB·푸시에 닿지 않게 한다.
const createPureClient = vi.fn(() => {
  throw new Error("DB must not be touched when auth fails");
});
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createPureClient: () => createPureClient(),
  createClient: vi.fn(),
}));
vi.mock("@/lib/notification-sender", () => ({
  notifyAutoCheckout: vi.fn(),
  notifyDueSoonSummary: vi.fn(),
  notifyOverdueSummary: vi.fn(),
}));
vi.mock("@/lib/activity-logger", () => ({ createActivityLog: vi.fn() }));

import { isAuthorizedCronRequest } from "@/lib/cron-auth";

const SECRET = "test-cron-secret-value";

function req(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, "http://localhost"), { headers });
}

describe("isAuthorizedCronRequest", () => {
  it("헤더 없음 → 거부", () => {
    expect(isAuthorizedCronRequest(null, SECRET)).toBe(false);
  });
  it("틀린 토큰 → 거부", () => {
    expect(isAuthorizedCronRequest("Bearer wrong", SECRET)).toBe(false);
  });
  it("Bearer 접두 없는 시크릿 → 거부", () => {
    expect(isAuthorizedCronRequest(SECRET, SECRET)).toBe(false);
  });
  it("CRON_SECRET 미설정 → 헤더가 있어도 거부", () => {
    expect(isAuthorizedCronRequest("Bearer ", undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer undefined", undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer ", "")).toBe(false);
  });
  it("올바른 Bearer → 통과", () => {
    expect(isAuthorizedCronRequest(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });
});

const routes: Array<{ name: string; path: string; load: () => Promise<{ GET: (r: NextRequest) => Promise<Response> }> }> = [
  { name: "auto-checkout", path: "/api/attendance/auto-checkout", load: () => import("@/app/api/attendance/auto-checkout/route") },
  { name: "auto-generate-monthly", path: "/api/leave/auto-generate-monthly", load: () => import("@/app/api/leave/auto-generate-monthly/route") },
  { name: "auto-generate-yearly", path: "/api/leave/auto-generate-yearly", load: () => import("@/app/api/leave/auto-generate-yearly/route") },
  { name: "due-soon", path: "/api/notifications/due-soon?days=1", load: () => import("@/app/api/notifications/due-soon/route") },
  { name: "overdue", path: "/api/notifications/overdue", load: () => import("@/app/api/notifications/overdue/route") },
];

describe("크론 라우트 인증", () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => {
    createPureClient.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
    vi.restoreAllMocks();
  });

  for (const r of routes) {
    describe(r.name, () => {
      it("헤더 없음 → 401, DB 미접근", async () => {
        process.env.CRON_SECRET = SECRET;
        const { GET } = await r.load();
        const res = await GET(req(r.path));
        expect(res.status).toBe(401);
        expect(createPureClient).not.toHaveBeenCalled();
      });

      it("틀린 토큰 → 401", async () => {
        process.env.CRON_SECRET = SECRET;
        const { GET } = await r.load();
        const res = await GET(req(r.path, { authorization: "Bearer nope" }));
        expect(res.status).toBe(401);
        expect(createPureClient).not.toHaveBeenCalled();
      });

      it("?key= 방식은 더 이상 통과하지 않음 → 401", async () => {
        process.env.CRON_SECRET = SECRET;
        const { GET } = await r.load();
        const sep = r.path.includes("?") ? "&" : "?";
        const res = await GET(req(`${r.path}${sep}key=${SECRET}`));
        expect(res.status).toBe(401);
        expect(createPureClient).not.toHaveBeenCalled();
      });

      it("CRON_SECRET 미설정 → 헤더가 있어도 401", async () => {
        delete process.env.CRON_SECRET;
        const { GET } = await r.load();
        const res = await GET(req(r.path, { authorization: "Bearer undefined" }));
        expect(res.status).toBe(401);
        expect(createPureClient).not.toHaveBeenCalled();
      });

      it("올바른 Bearer → 인증 통과(DB 단계 진입)", async () => {
        process.env.CRON_SECRET = SECRET;
        const { GET } = await r.load();
        const res = await GET(req(r.path, { authorization: `Bearer ${SECRET}` }));
        expect(res.status).not.toBe(401);
        expect(createPureClient).toHaveBeenCalledTimes(1);
      });
    });
  }
});
