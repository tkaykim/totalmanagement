import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// T7 (spec R16): 법인카드 사용 내역 ↔ 프로젝트 연결.
// 가짜 Supabase(메모리 표)로 연결 → 이동 → 해제 → 재연결을 확인한다. 운영 DB·네트워크에 닿지 않는다.

type Row = Record<string, unknown>;
type Call = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };

const db: Record<string, Row[]> = {};
const calls: Call[] = [];
let nextId = 1000;

function makeBuilder(table: string) {
  const state: { op: string; payload?: unknown; filters: [string, unknown][]; onConflict?: string } = {
    op: "select",
    filters: [],
  };
  const rows = () => (db[table] ??= []);
  const matches = (r: Row) => state.filters.every(([k, v]) => r[k] === v);

  const exec = (): Row[] => {
    calls.push({ table, op: state.op, payload: state.payload, filters: [...state.filters] });
    if (state.op === "select") return rows().filter(matches);
    if (state.op === "insert") {
      const row = { id: nextId++, ...(state.payload as Row) };
      rows().push(row);
      return [row];
    }
    if (state.op === "upsert") {
      const payload = state.payload as Row;
      const key = state.onConflict!;
      const existing = rows().find((r) => r[key] === payload[key]);
      if (existing) {
        Object.assign(existing, payload);
        return [existing];
      }
      const row = { id: nextId++, ...payload };
      rows().push(row);
      return [row];
    }
    if (state.op === "update") {
      const hit = rows().filter(matches);
      hit.forEach((r) => Object.assign(r, state.payload as Row));
      return hit;
    }
    if (state.op === "delete") {
      const removed = rows().filter(matches);
      db[table] = rows().filter((r) => !matches(r));
      return removed;
    }
    throw new Error(`unknown op ${state.op}`);
  };

  const builder: Record<string, unknown> = {
    select: () => builder,
    insert: (payload: unknown) => {
      state.op = "insert";
      state.payload = payload;
      return builder;
    },
    update: (payload: unknown) => {
      state.op = "update";
      state.payload = payload;
      return builder;
    },
    upsert: (payload: unknown, opts: { onConflict: string }) => {
      state.op = "upsert";
      state.payload = payload;
      state.onConflict = opts.onConflict;
      return builder;
    },
    delete: () => {
      state.op = "delete";
      return builder;
    },
    eq: (k: string, v: unknown) => {
      state.filters.push([k, v]);
      return builder;
    },
    in: () => builder,
    maybeSingle: async () => ({ data: exec()[0] ?? null, error: null }),
    single: async () => {
      const data = exec();
      return data[0] ? { data: data[0], error: null } : { data: null, error: { message: "no rows" } };
    },
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
      try {
        return Promise.resolve({ data: exec(), error: null }).then(resolve, reject);
      } catch (e) {
        return Promise.reject(e).then(resolve, reject);
      }
    },
  };
  return builder;
}

const fakeClient = { from: (table: string) => makeBuilder(table) };

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => fakeClient),
  createPureClient: vi.fn(async () => fakeClient),
}));

type Staff = { id: string; role: string; bu_code: string; status: string };
let currentUser: Staff | null = null;
let mappedGowidIds: number[] = [1];

vi.mock("@/lib/auth-guard", () => ({
  isGuardFailure: (r: unknown) => r instanceof NextResponse,
  requireActiveStaff: vi.fn(async () => {
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (currentUser.status !== "active") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return { user: { id: currentUser.id }, appUser: { ...currentUser } };
  }),
}));

vi.mock("@/app/api/gowid/_lib/gowid-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/api/gowid/_lib/gowid-client")>();
  return {
    ...actual,
    getAuthContext: vi.fn(async () =>
      currentUser
        ? {
            userId: currentUser.id,
            role: currentUser.role,
            buCode: currentUser.bu_code,
            mappedGowidUserIds: mappedGowidIds,
            buGowidUserIds: [],
          }
        : null
    ),
  };
});

import { DELETE, GET, POST } from "@/app/api/gowid/expenses/[expenseId]/project-link/route";

const ADMIN: Staff = { id: "u-admin", role: "admin", bu_code: "HEAD", status: "active" };
const MEMBER_A: Staff = { id: "u-member-a", role: "member", bu_code: "REACT", status: "active" };
const MEMBER_B: Staff = { id: "u-member-b", role: "member", bu_code: "REACT", status: "active" };
const LEADER_REACT: Staff = { id: "u-leader-react", role: "leader", bu_code: "REACT", status: "active" };
const LEADER_GRIGO: Staff = { id: "u-leader-grigo", role: "leader", bu_code: "GRIGO", status: "active" };

const EXPENSE_ID = "987654";
const params = () => ({ params: Promise.resolve({ expenseId: EXPENSE_ID }) });
const URL_ = `http://localhost/api/gowid/expenses/${EXPENSE_ID}/project-link`;

function postReq(body: Row) {
  return new NextRequest(URL_, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}
const delReq = () => new NextRequest(URL_, { method: "DELETE" });
const getReq = () => new NextRequest(URL_, { method: "GET" });

const linkBody = (projectId: number | undefined) => ({
  project_id: projectId,
  expense_amount: 0,
  expense_store_name: "[E2E] 가맹점",
  expense_date: "20260924",
  card_alias: "E2E",
});

const financeCalls = (op: string) => calls.filter((c) => c.table === "financial_entries" && c.op === op);
const entries = () => db.financial_entries ?? [];
const links = () => db.gowid_expense_project_link ?? [];

function seed() {
  for (const k of Object.keys(db)) delete db[k];
  calls.length = 0;
  nextId = 1000;
  db.projects = [
    { id: 1, name: "[E2E] REACT A", bu_code: "REACT", pm_id: null, participants: [MEMBER_A.id, MEMBER_B.id], created_by: null },
    { id: 2, name: "[E2E] REACT B", bu_code: "REACT", pm_id: null, participants: [{ user_id: MEMBER_A.id }], created_by: null },
    { id: 3, name: "[E2E] GRIGO", bu_code: "GRIGO", pm_id: null, participants: [], created_by: null },
    { id: 4, name: "[E2E] GRIGO 참여", bu_code: "GRIGO", pm_id: null, participants: [MEMBER_A.id], created_by: null },
    { id: 5, name: "[E2E] REACT 비공개", bu_code: "REACT", pm_id: null, participants: [], created_by: null },
  ];
  db.app_users = [{ id: MEMBER_A.id, name: "직원A" }];
  db.financial_entries = [];
  db.gowid_expense_project_link = [];
}

beforeEach(() => {
  seed();
  currentUser = MEMBER_A;
  mappedGowidIds = [1];
  delete process.env.ERP_AUDIT_V2;
});

describe("T7 법인카드 연결 — 연결 → 이동 → 해제 → 재연결", () => {
  it("전체 흐름에서 financial_entries 삭제 호출이 없고 행이 올바르게 바뀐다", async () => {
    // 1) 연결: 지출 행 + 연결표 행 생성
    let res = await POST(postReq(linkBody(1)), params());
    expect(res.status).toBe(200);
    expect((await res.json()).data.project_id).toBe(1);
    expect(entries()).toHaveLength(1);
    const first = entries()[0];
    expect(first).toMatchObject({
      project_id: 1,
      bu_code: "REACT",
      kind: "expense",
      category: "법인카드",
      status: "paid",
      amount: 0,
      created_by: MEMBER_A.id,
      name: "[법인카드] [E2E] 가맹점",
      occurred_at: "2026-09-24",
    });
    expect(first).not.toHaveProperty("updated_by"); // 스위치 꺼짐
    expect(links()).toHaveLength(1);
    expect(links()[0]).toMatchObject({ gowid_expense_id: 987654, project_id: 1, financial_entry_id: first.id });

    // 2) 이동(관리자): 같은 행의 project_id·bu_code만 바뀜, 새 행 없음
    currentUser = ADMIN;
    res = await POST(postReq(linkBody(3)), params());
    expect(res.status).toBe(200);
    expect((await res.json()).data.project_id).toBe(3);
    expect(entries()).toHaveLength(1);
    expect(entries()[0]).toMatchObject({ id: first.id, project_id: 3, bu_code: "GRIGO", status: "paid" });
    expect(links()).toHaveLength(1);
    expect(links()[0]).toMatchObject({ project_id: 3, financial_entry_id: first.id });
    expect(financeCalls("insert")).toHaveLength(1);

    // 3) 해제: 지출 행은 canceled, 연결표 행만 삭제
    res = await DELETE(delReq(), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(entries()).toHaveLength(1);
    expect(entries()[0]).toMatchObject({ id: first.id, status: "canceled" });
    expect(links()).toHaveLength(0);

    // 4) 재연결: 새 지출 행 + 새 연결표 행, 취소된 옛 행은 그대로
    currentUser = MEMBER_A;
    res = await POST(postReq(linkBody(2)), params());
    expect(res.status).toBe(200);
    expect(entries()).toHaveLength(2);
    const old = entries().find((e) => e.id === first.id)!;
    const fresh = entries().find((e) => e.id !== first.id)!;
    expect(old).toMatchObject({ status: "canceled", project_id: 3, bu_code: "GRIGO" });
    expect(fresh).toMatchObject({ status: "paid", project_id: 2, bu_code: "REACT", created_by: MEMBER_A.id });
    expect(links()).toHaveLength(1);
    expect(links()[0]).toMatchObject({ project_id: 2, financial_entry_id: fresh.id });

    // 어느 단계에서도 financial_entries delete 호출 없음
    expect(financeCalls("delete")).toHaveLength(0);
  });

  it("같은 프로젝트에 다시 연결하면 기존 행 내용만 갱신한다", async () => {
    await POST(postReq(linkBody(1)), params());
    const res = await POST(postReq({ ...linkBody(1), expense_store_name: "바뀐 가맹점" }), params());
    expect(res.status).toBe(200);
    expect(entries()).toHaveLength(1);
    expect(entries()[0]).toMatchObject({ project_id: 1, name: "[법인카드] 바뀐 가맹점" });
    expect(financeCalls("delete")).toHaveLength(0);
  });

  it("스위치가 켜지면 insert·update에 updated_by를 쓴다", async () => {
    process.env.ERP_AUDIT_V2 = "1";
    await POST(postReq(linkBody(1)), params());
    expect(entries()[0].updated_by).toBe(MEMBER_A.id);

    currentUser = LEADER_REACT;
    await POST(postReq(linkBody(2)), params());
    const moveUpdate = financeCalls("update").at(-1)!;
    expect(moveUpdate.payload).toMatchObject({ project_id: 2, bu_code: "REACT", updated_by: LEADER_REACT.id });

    await DELETE(delReq(), params());
    const cancelUpdate = financeCalls("update").at(-1)!;
    expect(cancelUpdate.payload).toMatchObject({ status: "canceled", updated_by: LEADER_REACT.id });
  });

  it("스위치가 꺼져 있으면 어떤 쓰기에도 updated_by가 없다", async () => {
    await POST(postReq(linkBody(1)), params());
    await POST(postReq(linkBody(2)), params());
    await DELETE(delReq(), params());
    const writes = [...financeCalls("insert"), ...financeCalls("update")];
    expect(writes.length).toBeGreaterThanOrEqual(3);
    for (const w of writes) expect(w.payload).not.toHaveProperty("updated_by");
  });

  it("GET은 연결 정보를 기존 모양으로 돌려준다", async () => {
    await POST(postReq(linkBody(1)), params());
    const res = await GET(getReq(), params());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ project_id: 1, project_name: "[E2E] REACT A", project_bu: "REACT", linked_by_name: "직원A" });
  });
});

describe("T7 권한", () => {
  it("로그인 없음 → 401", async () => {
    currentUser = null;
    expect((await POST(postReq(linkBody(1)), params())).status).toBe(401);
    expect((await DELETE(delReq(), params())).status).toBe(401);
    expect((await GET(getReq(), params())).status).toBe(401);
  });

  it("재직 아님 → 403", async () => {
    currentUser = { ...MEMBER_A, status: "pending" };
    expect((await POST(postReq(linkBody(1)), params())).status).toBe(403);
    expect(entries()).toHaveLength(0);
  });

  it("매핑 없는 member → 403", async () => {
    mappedGowidIds = [];
    expect((await POST(postReq(linkBody(1)), params())).status).toBe(403);
    expect(entries()).toHaveLength(0);
  });

  it("리더는 다른 사업부 프로젝트에 새로 연결할 수 없다(R10) → 403", async () => {
    currentUser = LEADER_GRIGO;
    expect((await POST(postReq(linkBody(1)), params())).status).toBe(403);
    expect(entries()).toHaveLength(0);
    expect(links()).toHaveLength(0);
  });

  it("리더는 자기 사업부 프로젝트에 연결할 수 있다", async () => {
    currentUser = LEADER_GRIGO;
    expect((await POST(postReq(linkBody(3)), params())).status).toBe(200);
    expect(entries()[0]).toMatchObject({ bu_code: "GRIGO", created_by: LEADER_GRIGO.id });
  });

  it("볼 수 없는 프로젝트에 member가 연결 → 403", async () => {
    expect((await POST(postReq(linkBody(3)), params())).status).toBe(403);
    expect(entries()).toHaveLength(0);
  });

  it("등록자가 아닌 member의 이동·해제 → 403, 행은 그대로", async () => {
    await POST(postReq(linkBody(1)), params());
    currentUser = MEMBER_B;
    expect((await POST(postReq(linkBody(2)), params())).status).toBe(403);
    expect((await DELETE(delReq(), params())).status).toBe(403);
    expect(entries()[0]).toMatchObject({ project_id: 1, status: "paid" });
    expect(links()).toHaveLength(1);
    expect(financeCalls("delete")).toHaveLength(0);
  });

  it("다른 사업부 리더의 이동·해제 → 403", async () => {
    await POST(postReq(linkBody(1)), params());
    currentUser = LEADER_GRIGO;
    expect((await POST(postReq(linkBody(3)), params())).status).toBe(403);
    expect((await DELETE(delReq(), params())).status).toBe(403);
    expect(entries()[0]).toMatchObject({ project_id: 1, bu_code: "REACT", status: "paid" });
    expect(links()).toHaveLength(1);
  });

  it("등록자 본인은 이동·해제할 수 있다", async () => {
    await POST(postReq(linkBody(1)), params());
    expect((await POST(postReq(linkBody(2)), params())).status).toBe(200);
    expect(entries()[0]).toMatchObject({ project_id: 2 });
    expect((await DELETE(delReq(), params())).status).toBe(200);
    expect(entries()[0]).toMatchObject({ status: "canceled" });
    expect(financeCalls("delete")).toHaveLength(0);
  });

  it("행 사업부 리더는 이동·해제할 수 있다", async () => {
    await POST(postReq(linkBody(1)), params());
    currentUser = LEADER_REACT;
    expect((await POST(postReq(linkBody(2)), params())).status).toBe(200);
    expect((await DELETE(delReq(), params())).status).toBe(200);
    expect(entries()[0]).toMatchObject({ project_id: 2, status: "canceled" });
  });

  it("등록자 member가 다른 사업부 프로젝트로 이동(R13) → 403, 행은 그대로", async () => {
    await POST(postReq(linkBody(1)), params());
    // 프로젝트 4는 member A가 참여자라 볼 수 있지만 사업부가 다르다
    expect((await POST(postReq(linkBody(4)), params())).status).toBe(403);
    expect(entries()[0]).toMatchObject({ project_id: 1, bu_code: "REACT", status: "paid" });
    expect(links()[0]).toMatchObject({ project_id: 1 });
  });

  it("원래 사업부 리더의 다른 사업부 이동 → 허용", async () => {
    await POST(postReq(linkBody(1)), params());
    currentUser = LEADER_REACT;
    expect((await POST(postReq(linkBody(3)), params())).status).toBe(200);
    expect(entries()).toHaveLength(1);
    expect(entries()[0]).toMatchObject({ project_id: 3, bu_code: "GRIGO", status: "paid" });
    expect(links()[0]).toMatchObject({ project_id: 3 });
  });

  it("관리자의 다른 사업부 이동 → 허용", async () => {
    await POST(postReq(linkBody(1)), params());
    currentUser = ADMIN;
    expect((await POST(postReq(linkBody(4)), params())).status).toBe(200);
    expect(entries()[0]).toMatchObject({ project_id: 4, bu_code: "GRIGO" });
  });

  it("볼 수 없는 프로젝트로 이동(같은 사업부) → 403", async () => {
    await POST(postReq(linkBody(1)), params());
    expect((await POST(postReq(linkBody(5)), params())).status).toBe(403);
    expect(entries()[0]).toMatchObject({ project_id: 1, bu_code: "REACT" });
    expect(links()[0]).toMatchObject({ project_id: 1 });
    expect(financeCalls("update")).toHaveLength(0);
  });

  it("없는 프로젝트 → 404, project_id 없음 → 400", async () => {
    expect((await POST(postReq(linkBody(999)), params())).status).toBe(404);
    expect((await POST(postReq(linkBody(undefined)), params())).status).toBe(400);
  });
});
