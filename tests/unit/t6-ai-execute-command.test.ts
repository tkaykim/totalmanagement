import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { FakeDb } from "./t6-fake-supabase";

// T6 — AI 지시 실행의 재무 행 생성: 매출·지출 API와 같은 검증·권한(R11·R14·R32), 이메일 허용 목록 유지.

const state = vi.hoisted(() => ({ db: null as any, userId: null as string | null, email: "" }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: state.userId ? { id: state.userId, email: state.email } : null },
        error: null,
      }),
    },
  }),
  createPureClient: async () => state.db,
}));
vi.mock("@/lib/ai/gemini", () => ({
  isAllowedEmail: (e: string | undefined) => e === "allowed@example.test",
  generateContent: vi.fn(async () => "요약"),
}));
vi.mock("@/lib/activity-logger", () => ({
  createActivityLog: vi.fn(async () => undefined),
  createTaskAssignedLog: vi.fn(async () => undefined),
}));
vi.mock("@/lib/notification-sender", () => ({
  notifyProjectPMAssigned: vi.fn(async () => undefined),
  notifyTaskAssigned: vi.fn(async () => undefined),
}));

import { POST } from "@/app/api/ai/execute-command/route";

const ADMIN = "u-admin";
const FLOW_LEADER = "u-flow-leader";
const RETIRED = "u-retired";

function seed() {
  return new FakeDb({
    app_users: [
      { id: ADMIN, role: "admin", bu_code: "HEAD", status: "active", name: "관리자" },
      { id: FLOW_LEADER, role: "leader", bu_code: "FLOW", status: "active", name: "리더" },
      { id: RETIRED, role: "admin", bu_code: "HEAD", status: "retired", name: "퇴사" },
    ],
    business_units: [],
    projects: [{ id: 1, name: "리액트촬영", bu_code: "REACT", pm_id: null, created_by: ADMIN, participants: [], status: "진행중" }],
    financial_entries: [],
  });
}

const as = (id: string | null, email = "allowed@example.test") => {
  state.userId = id;
  state.email = email;
};
const plan = (o: Record<string, unknown> = {}) => ({
  action: "create_financial",
  project_name_or_keyword: "리액트",
  kind: "expense",
  name: "촬영비",
  amount: 1000,
  category: "외주",
  occurred_at: "2026-09-24",
  due_date: "2026-10-31",
  ...o,
});
const call = (p: Record<string, unknown>, execute = true) =>
  POST(
    new NextRequest("http://localhost/api/ai/execute-command", {
      method: "POST",
      body: JSON.stringify({ instruction: "등록해", execute, plan: p }),
      headers: { "content-type": "application/json" },
    })
  );
const inserts = () => state.db.writes.filter((w: any) => w.table === "financial_entries" && w.op === "insert");

beforeEach(() => {
  state.db = seed();
  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.ERP_AUDIT_V2;
});
afterEach(() => {
  delete process.env.ERP_AUDIT_V2;
});

describe("ai/execute-command create_financial", () => {
  it("비로그인 401, 허용 목록 밖 403, 퇴사자 403", async () => {
    as(null);
    expect((await call(plan())).status).toBe(401);
    as(ADMIN, "other@example.test");
    expect((await call(plan())).status).toBe(403);
    as(RETIRED);
    expect((await call(plan())).status).toBe(403);
    expect(inserts()).toHaveLength(0);
  });
  it("기한 없음 → 400, 쓰기 없음", async () => {
    as(ADMIN);
    const res = await call(plan({ due_date: null }));
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe("string");
    expect(inserts()).toHaveLength(0);
  });
  it("다른 사업부 리더 → 403, 쓰기 없음", async () => {
    as(FLOW_LEADER, "allowed@example.test");
    const res = await call(plan());
    expect(res.status).toBe(403);
    expect(inserts()).toHaveLength(0);
  });
  it("정상 등록: created_by·due_date·planned, 스위치 끔이면 updated_by 없음", async () => {
    as(ADMIN);
    const res = await call(plan());
    expect(res.status).toBe(200);
    const payload = inserts()[0].payload;
    expect(payload).toMatchObject({ project_id: 1, bu_code: "REACT", status: "planned", due_date: "2026-10-31", created_by: ADMIN });
    expect("updated_by" in payload).toBe(false);
  });
  it("스위치 켜짐이면 updated_by 전송", async () => {
    process.env.ERP_AUDIT_V2 = "1";
    as(ADMIN);
    expect((await call(plan())).status).toBe(200);
    expect(inserts()[0].payload.updated_by).toBe(ADMIN);
  });
});
