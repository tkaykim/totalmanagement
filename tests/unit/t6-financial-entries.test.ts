import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { FakeDb } from "./t6-fake-supabase";

// T6 — 매출·지출 API (spec R4·R9·R11~R14·R32, 15절). 가짜 Supabase로 라우트 핸들러를 직접 부른다.

const state = vi.hoisted(() => ({ db: null as any, userId: null as string | null }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: state.userId ? { id: state.userId, email: `${state.userId}@example.test` } : null },
        error: null,
      }),
    },
  }),
  createPureClient: async () => state.db,
}));
vi.mock("@/lib/activity-logger", () => ({ createActivityLog: vi.fn(async () => undefined) }));

import { GET, POST } from "@/app/api/financial-entries/route";
import { PATCH, DELETE } from "@/app/api/financial-entries/[id]/route";

const ADMIN = "u-admin";
const FLOW_LEADER = "u-flow-leader";
const REACT_LEADER = "u-react-leader";
const PM_MEMBER = "u-pm"; // P1(REACT) PM
const PARTICIPANT = "u-part"; // P1 참여자
const OUTSIDER = "u-out"; // REACT 멤버, P1·P2 모두 못 봄
const RETIRED = "u-retired";
const PENDING = "u-pending";

const users = [
  { id: ADMIN, role: "admin", bu_code: "HEAD", status: "active", name: "관리자" },
  { id: FLOW_LEADER, role: "leader", bu_code: "FLOW", status: "active", name: "플로우리더" },
  { id: REACT_LEADER, role: "leader", bu_code: "REACT", status: "active", name: "리액트리더" },
  { id: PM_MEMBER, role: "member", bu_code: "REACT", status: "active", name: "피엠" },
  { id: PARTICIPANT, role: "member", bu_code: "REACT", status: "active", name: "참여" },
  { id: OUTSIDER, role: "member", bu_code: "REACT", status: "active", name: "외부" },
  { id: RETIRED, role: "member", bu_code: "REACT", status: "retired", name: "퇴사" },
  { id: PENDING, role: "member", bu_code: null, status: "pending", name: "대기" },
];

const projects = [
  { id: 1, bu_code: "REACT", pm_id: PM_MEMBER, created_by: ADMIN, participants: [{ user_id: PARTICIPANT }] },
  { id: 2, bu_code: "FLOW", pm_id: null, created_by: FLOW_LEADER, participants: [] },
];

function entry(id: number, o: Record<string, unknown>) {
  return {
    id,
    project_id: 1,
    bu_code: "REACT",
    entry_scope: "external",
    counterparty_bu_code: null,
    kind: "revenue",
    category: "용역",
    name: `행${id}`,
    amount: 1000,
    occurred_at: "2026-09-01",
    due_date: "2026-09-30",
    paid_at: null,
    status: "planned",
    created_by: PM_MEMBER,
    ...o,
  };
}

function seed() {
  return new FakeDb({
    app_users: users,
    projects,
    financial_entries: [
      entry(1, {}), // REACT planned, PM 등록
      entry(2, { project_id: 2, bu_code: "FLOW", status: "paid", due_date: null, paid_at: "2026-09-10T00:00:00+09:00", created_by: FLOW_LEADER }),
      entry(3, { project_id: 2, bu_code: "FLOW", created_by: FLOW_LEADER }),
      entry(4, { status: "canceled", due_date: null }),
      entry(5, { status: "paid", due_date: null, paid_at: null, created_by: null }), // 등록자 없는 옛 행
      entry(6, { bu_code: "FLOW", created_by: FLOW_LEADER }), // 교차 사업부 행(프로젝트 REACT)
      entry(7, { project_id: 2, bu_code: "FLOW", created_by: OUTSIDER }), // 못 보는 프로젝트의 본인 등록 행
    ],
  });
}

const as = (id: string | null) => {
  state.userId = id;
};
const url = (q = "") => new NextRequest(`http://localhost/api/financial-entries${q}`);
const jsonReq = (method: string, body: unknown, path = "") =>
  new NextRequest(`http://localhost/api/financial-entries${path}`, {
    method,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
const ctx = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });
const row = (id: number) => state.db.rows("financial_entries").find((r: any) => r.id === id);
const financeWrites = () => state.db.writes.filter((w: any) => w.table === "financial_entries");

async function ids(res: Response) {
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
  return (body as any[]).map((e) => e.id).sort((a, b) => a - b);
}

async function expectError(res: Response, status: number) {
  expect(res.status).toBe(status);
  const body = await res.json();
  expect(typeof body.error).toBe("string");
}

beforeEach(() => {
  state.db = seed();
  delete process.env.ERP_AUDIT_V2;
});
afterEach(() => {
  delete process.env.ERP_AUDIT_V2;
});

describe("가드", () => {
  it("비로그인 → 401 (GET·POST·PATCH·DELETE)", async () => {
    as(null);
    await expectError(await GET(url()), 401);
    await expectError(await POST(jsonReq("POST", {})), 401);
    await expectError(await PATCH(jsonReq("PATCH", { memo: "x" }, "/1"), ctx(1)), 401);
    await expectError(await DELETE(jsonReq("DELETE", {}, "/1"), ctx(1)), 401);
    expect(financeWrites()).toHaveLength(0);
  });
  it("퇴사·승인 대기 → 403, 쓰기 없음", async () => {
    for (const u of [RETIRED, PENDING]) {
      as(u);
      await expectError(await GET(url()), 403);
      await expectError(await PATCH(jsonReq("PATCH", { memo: "x" }, "/1"), ctx(1)), 403);
      await expectError(await DELETE(jsonReq("DELETE", {}, "/1"), ctx(1)), 403);
    }
    expect(financeWrites()).toHaveLength(0);
  });
});

describe("GET 보기 범위 (R9)", () => {
  it("관리자·다른 사업부 리더는 전체", async () => {
    as(ADMIN);
    expect(await ids(await GET(url()))).toEqual([1, 2, 3, 4, 5, 6, 7]);
    as(REACT_LEADER);
    expect(await ids(await GET(url()))).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("PM: 볼 수 있는 프로젝트의 모든 행(교차 사업부 포함)", async () => {
    as(PM_MEMBER);
    expect(await ids(await GET(url()))).toEqual([1, 4, 5, 6]);
  });
  it("참여자(PM 아님)도 프로젝트 행 전부", async () => {
    as(PARTICIPANT);
    expect(await ids(await GET(url()))).toEqual([1, 4, 5, 6]);
  });
  it("못 보는 프로젝트는 본인 등록 행만", async () => {
    as(OUTSIDER);
    expect(await ids(await GET(url()))).toEqual([7]);
  });
  it("필터(bu·project_id·kind)는 범위 안에서만", async () => {
    as(PM_MEMBER);
    expect(await ids(await GET(url("?bu=FLOW")))).toEqual([6]);
    expect(await ids(await GET(url("?project_id=2")))).toEqual([]);
  });
  it("1,000행을 넘어도 끝까지 읽는다(range 사용)", async () => {
    const many = Array.from({ length: 2345 }, (_, i) => entry(100 + i, {}));
    state.db.tables.financial_entries.push(...many);
    as(ADMIN);
    const all = await ids(await GET(url()));
    expect(all).toHaveLength(2345 + 7);
    as(PARTICIPANT);
    expect(await ids(await GET(url()))).toHaveLength(2345 + 4);
    const financeSelects = state.db.selects.filter((s: any) => s.table === "financial_entries");
    expect(financeSelects.every((s: any) => Array.isArray(s.range))).toBe(true);
  });
});

describe("POST 등록 (R11·R13·R14)", () => {
  const base = { project_id: 1, kind: "expense", category: "외주", name: "촬영", amount: 500, occurred_at: "2026-09-20", due_date: "2026-10-10" };

  it("일반 직원: 볼 수 있는 프로젝트에 등록, 사업부 기본=프로젝트, 허용 외 칸 무시", async () => {
    as(PARTICIPANT);
    const res = await POST(jsonReq("POST", { ...base, created_by: ADMIN, id: 999, updated_by: ADMIN, created_at: "x" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ bu_code: "REACT", created_by: PARTICIPANT, status: "planned", due_date: "2026-10-10" });
    expect(body.id).not.toBe(999);
    const payload = financeWrites()[0].payload;
    expect(payload.created_by).toBe(PARTICIPANT);
    expect("updated_by" in payload).toBe(false);
    expect("created_at" in payload).toBe(false);
  });
  it("스위치 켜짐이면 updated_by = 로그인 사용자", async () => {
    process.env.ERP_AUDIT_V2 = "1";
    as(PARTICIPANT);
    expect((await POST(jsonReq("POST", base))).status).toBe(200);
    expect(financeWrites()[0].payload.updated_by).toBe(PARTICIPANT);
  });
  it("못 보는 프로젝트 → 404, 쓰기 없음", async () => {
    as(OUTSIDER);
    await expectError(await POST(jsonReq("POST", base)), 404);
    expect(financeWrites()).toHaveLength(0);
  });
  it("리더: 자기 사업부 행만(프로젝트 사업부 무관)", async () => {
    as(FLOW_LEADER);
    await expectError(await POST(jsonReq("POST", base)), 403); // 행 사업부=REACT(기본)
    expect(financeWrites()).toHaveLength(0);
    const res = await POST(jsonReq("POST", { ...base, bu_code: "FLOW" }));
    expect(res.status).toBe(200);
  });
  it("planned인데 due_date 없음 → 400", async () => {
    as(ADMIN);
    await expectError(await POST(jsonReq("POST", { ...base, due_date: null })), 400);
    await expectError(await POST(jsonReq("POST", { ...base, due_date: undefined })), 400);
    await expectError(await POST(jsonReq("POST", { ...base, due_date: "2026/10/10" })), 400);
    expect(financeWrites()).toHaveLength(0);
  });
  it("paid로 등록: paid_at 필수, KST 자정으로 저장, due_date 없어도 됨", async () => {
    as(ADMIN);
    await expectError(await POST(jsonReq("POST", { ...base, status: "paid", due_date: null })), 400);
    const res = await POST(jsonReq("POST", { ...base, status: "paid", due_date: null, paid_at: "2026-09-21" }));
    expect(res.status).toBe(200);
    expect(financeWrites()[0].payload.paid_at).toBe("2026-09-21T00:00:00+09:00");
  });
  it("canceled는 날짜 없이 등록 가능", async () => {
    as(ADMIN);
    expect((await POST(jsonReq("POST", { ...base, status: "canceled", due_date: null }))).status).toBe(200);
  });
  it("내부배부: 상대 사업부 필수·행 사업부와 달라야 함", async () => {
    as(ADMIN);
    await expectError(await POST(jsonReq("POST", { ...base, entry_scope: "internal_allocation" })), 400);
    await expectError(
      await POST(jsonReq("POST", { ...base, entry_scope: "internal_allocation", counterparty_bu_code: "REACT" })),
      400
    );
    const res = await POST(jsonReq("POST", { ...base, entry_scope: "internal_allocation", counterparty_bu_code: "FLOW" }));
    expect(res.status).toBe(200);
    expect(financeWrites()[0].payload).toMatchObject({ entry_scope: "internal_allocation", counterparty_bu_code: "FLOW" });
  });
  it("외부 거래면 상대 사업부는 비운다", async () => {
    as(ADMIN);
    expect((await POST(jsonReq("POST", { ...base, counterparty_bu_code: "FLOW" }))).status).toBe(200);
    expect(financeWrites()[0].payload.counterparty_bu_code).toBeNull();
  });
  it("발생일(occurred_at) 없음·형식 오류 → 400(500 아님), 쓰기 없음", async () => {
    as(ADMIN);
    await expectError(await POST(jsonReq("POST", { ...base, occurred_at: undefined })), 400);
    await expectError(await POST(jsonReq("POST", { ...base, occurred_at: null })), 400);
    await expectError(await POST(jsonReq("POST", { ...base, occurred_at: "" })), 400);
    await expectError(await POST(jsonReq("POST", { ...base, occurred_at: "2026/09/20" })), 400);
    await expectError(await POST(jsonReq("POST", { ...base, occurred_at: "2026-02-30" })), 400);
    expect(financeWrites()).toHaveLength(0);
  });
  it("잘못된 kind·status·사업부 → 400", async () => {
    as(ADMIN);
    await expectError(await POST(jsonReq("POST", { ...base, kind: "x" })), 400);
    await expectError(await POST(jsonReq("POST", { ...base, status: "done" })), 400);
    await expectError(await POST(jsonReq("POST", { ...base, bu_code: "NOPE" })), 400);
    expect(financeWrites()).toHaveLength(0);
  });
});

describe("PATCH 수정 (R4·R11~R14)", () => {
  it("볼 수 없는 행 → 404, 쓰기 없음", async () => {
    as(OUTSIDER);
    await expectError(await PATCH(jsonReq("PATCH", { memo: "x" }, "/1"), ctx(1)), 404);
    await expectError(await PATCH(jsonReq("PATCH", { memo: "x" }, "/99999"), ctx(99999)), 404);
    expect(financeWrites()).toHaveLength(0);
  });
  it("다른 사업부 리더 → 403, DB 무변화", async () => {
    as(FLOW_LEADER);
    await expectError(await PATCH(jsonReq("PATCH", { amount: 1 }, "/1"), ctx(1)), 403);
    expect(row(1).amount).toBe(1000);
    expect(financeWrites()).toHaveLength(0);
  });
  it("발생일(occurred_at)을 비우거나 형식이 틀리면 400, 쓰기 없음", async () => {
    as(ADMIN);
    await expectError(await PATCH(jsonReq("PATCH", { occurred_at: null }, "/1"), ctx(1)), 400);
    await expectError(await PATCH(jsonReq("PATCH", { occurred_at: "20260920" }, "/1"), ctx(1)), 400);
    expect(financeWrites()).toHaveLength(0);
  });
  it("등록자: 본인 행 수정 가능, 허용 외 칸 무시", async () => {
    as(PM_MEMBER);
    const res = await PATCH(jsonReq("PATCH", { amount: 2000, created_by: ADMIN, id: 77, created_at: "x" }, "/1"), ctx(1));
    expect(res.status).toBe(200);
    expect((await res.json()).amount).toBe(2000);
    const p = financeWrites()[0].payload;
    expect(p.amount).toBe(2000);
    for (const k of ["created_by", "id", "created_at", "updated_by"]) expect(k in p).toBe(false);
    expect(row(1).created_by).toBe(PM_MEMBER);
  });
  it("스위치 켜짐일 때만 updated_by 전송", async () => {
    as(PM_MEMBER);
    await PATCH(jsonReq("PATCH", { memo: "a" }, "/1"), ctx(1));
    expect("updated_by" in financeWrites()[0].payload).toBe(false);
    process.env.ERP_AUDIT_V2 = "1";
    await PATCH(jsonReq("PATCH", { memo: "b" }, "/1"), ctx(1));
    expect(financeWrites()[1].payload.updated_by).toBe(PM_MEMBER);
  });
  it("일반 직원: 남이 등록한 행(보이는 프로젝트) → 403", async () => {
    as(PM_MEMBER);
    await expectError(await PATCH(jsonReq("PATCH", { memo: "x" }, "/6"), ctx(6)), 403);
  });
  it("등록자 없는 옛 행: 리더 403, 관리자는 기한 없이 수정 가능", async () => {
    as(REACT_LEADER);
    await expectError(await PATCH(jsonReq("PATCH", { memo: "x" }, "/5"), ctx(5)), 403);
    as(ADMIN);
    const res = await PATCH(jsonReq("PATCH", { memo: "x", due_date: null }, "/5"), ctx(5));
    expect(res.status).toBe(200);
  });
  it("paid·canceled 행은 due_date 없이 수정 가능", async () => {
    as(FLOW_LEADER);
    expect((await PATCH(jsonReq("PATCH", { memo: "x", due_date: null }, "/2"), ctx(2))).status).toBe(200);
    as(PM_MEMBER);
    expect((await PATCH(jsonReq("PATCH", { memo: "x", due_date: null }, "/4"), ctx(4))).status).toBe(200);
  });
  it("planned 행의 due_date를 비우면 400", async () => {
    as(PM_MEMBER);
    await expectError(await PATCH(jsonReq("PATCH", { due_date: null }, "/1"), ctx(1)), 400);
    await expectError(await PATCH(jsonReq("PATCH", { due_date: "" }, "/1"), ctx(1)), 400);
    expect(financeWrites()).toHaveLength(0);
  });
  it("planned→paid: paid_at 없으면 400, 있으면 KST 자정 저장", async () => {
    as(PM_MEMBER);
    await expectError(await PATCH(jsonReq("PATCH", { status: "paid" }, "/1"), ctx(1)), 400);
    const res = await PATCH(jsonReq("PATCH", { status: "paid", paid_at: "2026-09-24" }, "/1"), ctx(1));
    expect(res.status).toBe(200);
    expect(row(1)).toMatchObject({ status: "paid", paid_at: "2026-09-24T00:00:00+09:00" });
  });
  it("저장된 paid_at(timestamptz)을 그대로 돌려보내도 통과", async () => {
    as(FLOW_LEADER);
    const res = await PATCH(jsonReq("PATCH", { memo: "x", paid_at: "2026-09-10T00:00:00+09:00" }, "/2"), ctx(2));
    expect(res.status).toBe(200);
    expect(row(2).paid_at).toBe("2026-09-10T00:00:00+09:00");
  });
  it("paid→canceled: 행 사업부 리더 가능", async () => {
    as(FLOW_LEADER);
    expect((await PATCH(jsonReq("PATCH", { status: "canceled" }, "/2"), ctx(2))).status).toBe(200);
    expect(row(2).status).toBe("canceled");
  });
  it("paid→planned: 관리자만(리더 403)", async () => {
    as(FLOW_LEADER);
    await expectError(await PATCH(jsonReq("PATCH", { status: "planned", due_date: "2026-10-01" }, "/2"), ctx(2)), 403);
    expect(row(2).status).toBe("paid");
    as(ADMIN);
    // planned로 되돌리면 기한 필수
    await expectError(await PATCH(jsonReq("PATCH", { status: "planned" }, "/2"), ctx(2)), 400);
    expect((await PATCH(jsonReq("PATCH", { status: "planned", due_date: "2026-10-01" }, "/2"), ctx(2))).status).toBe(200);
    expect(row(2).status).toBe("planned");
  });
  it("canceled→planned·paid: 관리자만", async () => {
    as(PM_MEMBER);
    await expectError(await PATCH(jsonReq("PATCH", { status: "planned", due_date: "2026-10-01" }, "/4"), ctx(4)), 403);
    as(REACT_LEADER);
    await expectError(await PATCH(jsonReq("PATCH", { status: "paid", paid_at: "2026-09-01" }, "/4"), ctx(4)), 403);
    as(ADMIN);
    await expectError(await PATCH(jsonReq("PATCH", { status: "paid" }, "/4"), ctx(4)), 400);
    expect((await PATCH(jsonReq("PATCH", { status: "paid", paid_at: "2026-09-01" }, "/4"), ctx(4))).status).toBe(200);
  });
  it("사업부 이동: 관리자·원래 사업부 리더만", async () => {
    as(PM_MEMBER);
    await expectError(await PATCH(jsonReq("PATCH", { bu_code: "FLOW" }, "/1"), ctx(1)), 403);
    as(FLOW_LEADER);
    await expectError(await PATCH(jsonReq("PATCH", { bu_code: "FLOW" }, "/1"), ctx(1)), 403);
    expect(row(1).bu_code).toBe("REACT");
    as(REACT_LEADER);
    expect((await PATCH(jsonReq("PATCH", { bu_code: "FLOW" }, "/1"), ctx(1))).status).toBe(200);
    expect(row(1).bu_code).toBe("FLOW");
    as(ADMIN);
    expect((await PATCH(jsonReq("PATCH", { bu_code: "GRIGO" }, "/1"), ctx(1))).status).toBe(200);
  });
  it("같은 사업부 값을 다시 보내는 것은 이동이 아니다", async () => {
    as(PM_MEMBER);
    expect((await PATCH(jsonReq("PATCH", { bu_code: "REACT", memo: "m" }, "/1"), ctx(1))).status).toBe(200);
  });
  it("내부배부로 바꾸면 상대 사업부 ≠ 행 사업부", async () => {
    as(PM_MEMBER);
    await expectError(await PATCH(jsonReq("PATCH", { entry_scope: "internal_allocation" }, "/1"), ctx(1)), 400);
    await expectError(
      await PATCH(jsonReq("PATCH", { entry_scope: "internal_allocation", counterparty_bu_code: "REACT" }, "/1"), ctx(1)),
      400
    );
    expect(
      (await PATCH(jsonReq("PATCH", { entry_scope: "internal_allocation", counterparty_bu_code: "HEAD" }, "/1"), ctx(1))).status
    ).toBe(200);
  });
  it("프로젝트를 못 보는 곳으로 옮기면 403", async () => {
    as(PM_MEMBER);
    await expectError(await PATCH(jsonReq("PATCH", { project_id: 2 }, "/1"), ctx(1)), 403);
    expect(row(1).project_id).toBe(1);
  });
});

describe("DELETE (R11·15절)", () => {
  it("paid·canceled는 관리자도 409 {error}, 삭제 호출 없음", async () => {
    as(ADMIN);
    await expectError(await DELETE(jsonReq("DELETE", {}, "/2"), ctx(2)), 409);
    await expectError(await DELETE(jsonReq("DELETE", {}, "/4"), ctx(4)), 409);
    expect(financeWrites()).toHaveLength(0);
    expect(row(2)).toBeTruthy();
  });
  it("planned: 등록자 가능", async () => {
    as(PM_MEMBER);
    const res = await DELETE(jsonReq("DELETE", {}, "/1"), ctx(1));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(row(1)).toBeUndefined();
  });
  it("planned: 다른 사업부 리더 403, 못 보는 사람 404", async () => {
    as(FLOW_LEADER);
    await expectError(await DELETE(jsonReq("DELETE", {}, "/1"), ctx(1)), 403);
    as(OUTSIDER);
    await expectError(await DELETE(jsonReq("DELETE", {}, "/1"), ctx(1)), 404);
    expect(row(1)).toBeTruthy();
  });
  it("planned: 행 사업부 리더 가능", async () => {
    as(FLOW_LEADER);
    expect((await DELETE(jsonReq("DELETE", {}, "/3"), ctx(3))).status).toBe(200);
  });
});
