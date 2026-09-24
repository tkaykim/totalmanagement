import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { FakeDb } from "./t6-fake-supabase";

// T6 — 프로젝트 손익보고 (R9 보기 범위, R26 외부 손익·내부배부 분리, 1,000행 절단 없음)

const state = vi.hoisted(() => ({ db: null as any, userId: null as string | null }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.userId ? { id: state.userId } : null }, error: null }),
    },
  }),
  createPureClient: async () => state.db,
}));

import { GET, PUT, DELETE } from "@/app/api/projects/[id]/pnl-report/route";

const ADMIN = "u-admin";
const FLOW_LEADER = "u-flow-leader";
const PM = "u-pm";
const OUTSIDER = "u-out";
const RETIRED = "u-retired";

function seed() {
  const entries: any[] = [];
  let id = 1;
  const push = (o: any) => entries.push({ id: id++, project_id: 1, bu_code: "REACT", entry_scope: "external", status: "planned", amount: 0, ...o });
  push({ kind: "revenue", amount: 1000 });
  push({ kind: "revenue", amount: 500, status: "paid" });
  push({ kind: "expense", amount: 300 });
  push({ kind: "revenue", amount: 9999, status: "canceled" });
  push({ kind: "revenue", amount: 200, entry_scope: "internal_allocation", bu_code: "FLOW", counterparty_bu_code: "REACT" });
  push({ kind: "expense", amount: 70, entry_scope: "internal_allocation", counterparty_bu_code: "FLOW" });
  push({ kind: "revenue", amount: 5, project_id: 2 });
  return new FakeDb({
    app_users: [
      { id: ADMIN, role: "admin", bu_code: "HEAD", status: "active" },
      { id: FLOW_LEADER, role: "leader", bu_code: "FLOW", status: "active" },
      { id: PM, role: "member", bu_code: "REACT", status: "active" },
      { id: OUTSIDER, role: "member", bu_code: "REACT", status: "active" },
      { id: RETIRED, role: "member", bu_code: "REACT", status: "retired" },
    ],
    projects: [
      { id: 1, bu_code: "REACT", pm_id: PM, created_by: ADMIN, participants: [] },
      { id: 2, bu_code: "FLOW", pm_id: null, created_by: ADMIN, participants: [] },
    ],
    financial_entries: entries,
    project_pnl_reports_with_profit: [{ project_id: 1, target_revenue: 10 }],
    project_pnl_reports: [{ id: 1, project_id: 1 }],
  });
}

const as = (id: string | null) => {
  state.userId = id;
};
const req = (method = "GET", body?: unknown) =>
  new NextRequest("http://localhost/api/projects/1/pnl-report", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
const ctx = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

beforeEach(() => {
  state.db = seed();
});

describe("GET pnl-report", () => {
  it("비로그인 401, 퇴사 403", async () => {
    as(null);
    expect((await GET(req(), ctx(1))).status).toBe(401);
    as(RETIRED);
    expect((await GET(req(), ctx(1))).status).toBe(403);
  });
  it("못 보는 프로젝트 → 404", async () => {
    as(OUTSIDER);
    const res = await GET(req(), ctx(1));
    expect(res.status).toBe(404);
    expect(typeof (await res.json()).error).toBe("string");
  });
  it("외부 손익과 내부배부 합계를 나눠 준다(취소 제외)", async () => {
    as(PM);
    const res = await GET(req(), ctx(1));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ project_id: 1 });
    expect(body.aggregated).toEqual({
      actual_revenue: 1500,
      actual_expense: 300,
      internal_revenue: 200,
      internal_expense: 70,
    });
  });
  it("다른 사업부 리더도 본다(R7)", async () => {
    as(FLOW_LEADER);
    expect((await GET(req(), ctx(1))).status).toBe(200);
  });
  it("1,000행을 넘어도 모두 합산", async () => {
    for (let i = 0; i < 2500; i++) {
      state.db.tables.financial_entries.push({ id: 1000 + i, project_id: 1, bu_code: "REACT", entry_scope: "external", status: "planned", kind: "expense", amount: 1 });
    }
    as(ADMIN);
    const body = await (await GET(req(), ctx(1))).json();
    expect(body.aggregated.actual_expense).toBe(300 + 2500);
  });
});

describe("PUT·DELETE pnl-report", () => {
  it("수정 권한 없으면 403(다른 사업부 리더), 못 보면 404", async () => {
    as(FLOW_LEADER);
    expect((await PUT(req("PUT", { target_revenue: 1 }), ctx(1))).status).toBe(403);
    expect((await DELETE(req("DELETE"), ctx(1))).status).toBe(403);
    as(OUTSIDER);
    expect((await PUT(req("PUT", { target_revenue: 1 }), ctx(1))).status).toBe(404);
    expect(state.db.writes).toHaveLength(0);
  });
  it("PM은 저장 가능", async () => {
    as(PM);
    // 가짜 DB에는 upsert가 없으므로 권한 통과 여부만 확인(쓰기 시도 = 500이 아닌 권한 단계 통과)
    state.db.from = ((orig) => (table: string) => {
      const q = orig(table);
      if (table === "project_pnl_reports") {
        (q as any).upsert = (payload: any) => {
          state.db.writes.push({ table, op: "insert", payload, filters: [] });
          return { select: () => ({ single: async () => ({ data: payload, error: null }) }) };
        };
      }
      return q;
    })(state.db.from.bind(state.db));
    const res = await PUT(req("PUT", { target_revenue: 1 }), ctx(1));
    expect(res.status).toBe(200);
    expect(state.db.writes[0].payload).toMatchObject({ project_id: 1, bu_code: "REACT", author_id: PM });
  });
});
