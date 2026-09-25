// 봉인 마이그레이션 7절(봉인 밖 테이블에 재직 직원 조건 AND) 테스트.
// - 승인 대기·퇴사·사업부 없는 로그인 계정: 0건, 쓰기 거부
// - 재직 직원: 적용 전과 같은 결과
// - 비로그인(anon): 적용 전과 같은 결과
// PGlite + stubs + 운영 기준선 스키마 + 가짜 시드 데이터. 운영 DB에 접속하지 않는다.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  ANON,
  U,
  applySeal,
  asUser,
  catalogSnapshot,
  createBaselineDb,
  exec,
  rows,
  seed,
} from "./helpers/seal-db";

const EXTRA_SEED = `
insert into public.partners (id, display_name, owner_bu_code) values (1, 'pt-grigo', 'GRIGO'), (2, 'pt-react', 'REACT');
insert into public.contracts (id, title, client_name, client_email) values (1, 'ct1', 'c', 'c@example.invalid');
insert into public.comments (id, entity_type, entity_id, content, author_id, author_name) values
  (1, 'task', 1, 'cm1', '${U.admin}', 'test-admin'),
  (2, 'project', 5, 'cm2', '${U.memberFlow}', 'test-mem-f');
insert into public.document_room_files (id, category, file_name, file_path) values (1, 'other', 'f.pdf', 'x/f.pdf');
insert into public.company_documents (kind, filename, storage_path, public_url, mime_type) values
  ('bank_account', 'b.pdf', 'x/b.pdf', 'https://example.invalid/b.pdf', 'application/pdf');
insert into public.leave_requests (requester_id, leave_type, start_date, end_date, days_used, reason) values
  ('${U.memberReact}', 'annual', '2026-10-01', '2026-10-01', 1, 'r'),
  ('${U.pending}',     'annual', '2026-10-02', '2026-10-02', 1, 'r'),
  ('${U.retired}',     'annual', '2026-10-03', '2026-10-03', 1, 'r');
insert into public.leave_balances (user_id, leave_type, total_days, used_days, year) values
  ('${U.memberReact}', 'annual', 15, 1, 2026),
  ('${U.retired}',     'annual', 15, 2, 2026);
insert into public.notifications (user_id, title, message) values
  ('${U.memberReact}', 'n', 'm'), ('${U.pending}', 'n', 'm'), ('${U.retired}', 'n', 'm');
insert into public.user_work_status (user_id, status) values ('${U.memberReact}', 'WORKING'), ('${U.retired}', 'OFF_WORK');
select setval(pg_get_serial_sequence('public.partners', 'id'), 100);
select setval(pg_get_serial_sequence('public.contracts', 'id'), 100);
select setval('public.comments_id_seq', 100);
select setval(pg_get_serial_sequence('public.document_room_files', 'id'), 100);
`;

// 대표 조회(정렬 고정). 결과가 전후로 같아야 하는 기준.
const QUERIES: Record<string, string> = {
  partners: "select id, display_name from public.partners order by id",
  contracts: "select id, title from public.contracts order by id",
  comments: "select id, content from public.comments order by id",
  document_room_files: "select id, file_name from public.document_room_files order by id",
  clients: "select id, name from public.clients order by id",
  portfolio_items: "select id, title from public.portfolio_items order by id",
  company_documents: "select id, kind from public.company_documents order by id",
  attendance_logs: "select id, user_id from public.attendance_logs order by id",
  leave_requests: "select requester_id, start_date from public.leave_requests order by start_date",
  leave_balances: "select user_id, used_days from public.leave_balances order by user_id",
  notifications: "select id, user_id from public.notifications order by id",
  user_work_status: "select user_id, status from public.user_work_status order by user_id",
  project_pnl_reports: "select id, project_id from public.project_pnl_reports order by id",
};

const ACTIVE = [U.admin, U.leaderGrigo, U.managerReact, U.memberReact, U.memberFlow, U.managerGrigo];
const INACTIVE = [U.pending, U.retired, U.noBuActive];

let before: PGlite;
let after: PGlite;

beforeAll(async () => {
  before = await createBaselineDb();
  await seed(before);
  await before.exec(EXTRA_SEED);
  after = (await before.clone()) as PGlite;
  await applySeal(after);
});

afterAll(async () => {
  await before?.close();
  await after?.close();
});

describe("봉인 밖 테이블: 비재직 로그인 계정", () => {
  it("적용 전에는 승인 대기·퇴사·사업부 없는 계정이 거래처·계약·댓글·자료실·고객사를 읽었다(문제 재현)", async () => {
    for (const uid of INACTIVE) {
      for (const t of ["partners", "contracts", "comments", "document_room_files", "clients"]) {
        expect((await rows(before, asUser(uid), QUERIES[t])).length, `${uid} ${t}`).toBeGreaterThan(0);
      }
    }
    // 본인 기록도 읽었고, 퇴사한 manager는 같은 사업부 직원 근태까지 읽었다(본인 1 + managerReact 1)
    expect(await rows(before, asUser(U.retired), QUERIES.attendance_logs)).toHaveLength(2);
    expect(await rows(before, asUser(U.pending), QUERIES.leave_requests)).toHaveLength(1);
  });

  it("적용 후 모든 대표 테이블에서 0건이다(본인 근태·휴가·알림 포함)", async () => {
    for (const uid of INACTIVE) {
      for (const [t, sql] of Object.entries(QUERIES)) {
        expect(await rows(after, asUser(uid), sql), `${uid} ${t}`).toEqual([]);
      }
    }
  });

  it("적용 후 INSERT 는 RLS 로 거부된다", async () => {
    const inserts = (uid: string) => [
      "insert into public.partners (display_name, owner_bu_code) values ('x', 'REACT')",
      "insert into public.contracts (title, client_name, client_email) values ('x', 'c', 'c@example.invalid')",
      `insert into public.comments (entity_type, entity_id, content, author_id, author_name) values ('task', 1, 'x', '${uid}', 'x')`,
      "insert into public.document_room_files (category, file_name, file_path) values ('other', 'x', 'x')",
      "insert into public.clients (name, logo_url) values ('x', 'x')",
      `insert into public.attendance_logs (user_id, work_date, check_in_at) values ('${uid}', '2026-09-25', now())`,
      `insert into public.leave_requests (requester_id, leave_type, start_date, end_date, days_used, reason) values ('${uid}', 'annual', '2026-11-01', '2026-11-01', 1, 'x')`,
      `insert into public.notifications (user_id, title, message) values ('${U.admin}', 'x', 'x')`,
      `insert into public.user_work_status (user_id, status) values ('${uid}', 'WORKING')`,
    ];
    for (const uid of INACTIVE) {
      for (const sql of inserts(uid)) {
        const db = (await after.clone()) as PGlite;
        await expect(exec(db, asUser(uid), sql), `${uid}: ${sql}`).rejects.toThrow(/row-level security/);
        await db.close();
      }
    }
  });

  it("적용 후 UPDATE·DELETE 는 0행이다", async () => {
    const db = (await after.clone()) as PGlite;
    for (const uid of INACTIVE) {
      const A = asUser(uid);
      expect(await exec(db, A, "update public.partners set display_name = 'x'")).toBe(0);
      expect(await exec(db, A, "update public.contracts set title = 'x'")).toBe(0);
      expect(await exec(db, A, "delete from public.comments")).toBe(0);
      expect(await exec(db, A, "delete from public.document_room_files")).toBe(0);
      expect(await exec(db, A, "update public.clients set name = 'x'")).toBe(0);
      expect(await exec(db, A, "delete from public.clients")).toBe(0);
      expect(await exec(db, A, `update public.attendance_logs set check_out_at = now() where user_id = '${uid}'`)).toBe(0);
      expect(await exec(db, A, "update public.notifications set title = 'x'")).toBe(0);
    }
    // 서비스 권한으로 확인: 그대로다
    expect(await rows(db, { role: "service_role" }, QUERIES.partners)).toEqual(await rows(before, { role: "service_role" }, QUERIES.partners));
    await db.close();
  });
});

describe("봉인 밖 테이블: 재직 직원은 적용 전과 같다", () => {
  for (const [t, sql] of Object.entries(QUERIES)) {
    it(`${t} 조회 결과가 역할별로 같다`, async () => {
      for (const uid of ACTIVE) {
        const b = await rows(before, asUser(uid), sql);
        const a = await rows(after, asUser(uid), sql);
        expect(a, `${uid} ${t}`).toEqual(b);
      }
    });
  }

  it("대표 조회가 빈 결과로만 같은 것이 아니다(시드가 보인다)", async () => {
    expect(await rows(after, asUser(U.memberReact), QUERIES.partners)).toHaveLength(2);
    expect(await rows(after, asUser(U.memberReact), QUERIES.leave_requests)).toHaveLength(1);
    expect(await rows(after, asUser(U.admin), QUERIES.attendance_logs)).toHaveLength(3);
    expect(await rows(after, asUser(U.managerReact), QUERIES.attendance_logs)).toHaveLength(2); // 본인 + 같은 사업부(퇴사자)
  });

  it("쓰기도 적용 전과 같이 된다", async () => {
    const run = async (db: PGlite) => {
      const M = asUser(U.memberReact);
      return [
        await exec(db, M, "insert into public.partners (display_name, owner_bu_code) values ('new', 'REACT')"),
        await exec(db, M, "update public.clients set name = 'renamed' where name = 'cl1'"),
        await exec(db, M, `insert into public.comments (entity_type, entity_id, content, author_id, author_name) values ('task', 2, 'x', '${U.memberReact}', 'x')`),
        await exec(db, M, `insert into public.leave_requests (requester_id, leave_type, start_date, end_date, days_used, reason) values ('${U.memberReact}', 'annual', '2026-11-01', '2026-11-01', 1, 'x')`),
        await exec(db, M, `update public.user_work_status set status = 'MEETING' where user_id = '${U.memberReact}'`),
        await exec(db, asUser(U.admin), "update public.leave_requests set status = 'approved'"),
        await exec(db, asUser(U.managerReact), `update public.attendance_logs set check_out_at = now() where user_id = '${U.retired}'`),
      ];
    };
    const b = (await before.clone()) as PGlite;
    const a = (await after.clone()) as PGlite;
    const rb = await run(b);
    const ra = await run(a);
    expect(ra).toEqual(rb);
    expect(ra).toEqual([1, 1, 1, 1, 1, 4, 1]);
    // 다른 사람 대신 휴가 신청은 전후 모두 거부
    await expect(
      exec(a, asUser(U.memberReact), `insert into public.leave_requests (requester_id, leave_type, start_date, end_date, days_used, reason) values ('${U.memberFlow}', 'annual', '2026-11-02', '2026-11-02', 1, 'x')`),
    ).rejects.toThrow(/row-level security/);
    await b.close();
    await a.close();
  });
});

describe("봉인 밖 테이블: 비로그인(anon)", () => {
  it("대표 조회 결과가 적용 전과 같다(portfolio_items·clients·company_documents 공개 읽기 유지)", async () => {
    for (const [t, sql] of Object.entries(QUERIES)) {
      const b = await rows(before, ANON, sql);
      const a = await rows(after, ANON, sql);
      expect(a, t).toEqual(b);
    }
    expect(await rows(after, ANON, QUERIES.portfolio_items)).toHaveLength(2);
    expect(await rows(after, ANON, QUERIES.clients)).toHaveLength(2);
    expect(await rows(after, ANON, QUERIES.company_documents)).toHaveLength(1);
  });

  it("알림 INSERT 는 적용 전 anon 에게도 열려 있었고, 적용 후에는 거부된다(서버 서비스 권한만)", async () => {
    const sql = `insert into public.notifications (user_id, title, message) values ('${U.admin}', 'x', 'x')`;
    const b = (await before.clone()) as PGlite;
    expect(await exec(b, ANON, sql)).toBe(1);
    await b.close();
    const a = (await after.clone()) as PGlite;
    await expect(exec(a, ANON, sql)).rejects.toThrow(/row-level security/);
    await a.close();
  });
});

describe("봉인 밖 테이블: 정책 목록", () => {
  const SEALED = ["app_users", "projects", "project_tasks", "financial_entries", "gowid_expense_project_link", "financial_entry_changes", "app_user_changes"];
  const OPEN_BY_DESIGN = [
    "clients|Allow public read access",
    "company_documents|company_documents read all",
    "push_tokens|Service role can manage all push tokens",
  ];

  it("로그인 계정에 열린 정책은 의도한 3개 말고 모두 재직 직원 조건을 가진다", async () => {
    const r = await after.query<{ tablename: string; policyname: string; roles: string; qual: string | null; with_check: string | null }>(`
      select tablename, policyname, roles::text as roles, qual, with_check from pg_policies
      where schemaname = 'public' and tablename not like 'react\\_%'
        and ('authenticated' = any (roles) or 'public' = any (roles))
      order by 1, 2`);
    const open = r.rows
      .filter((p) => !SEALED.includes(p.tablename))
      .filter((p) => !`${p.qual ?? ""} ${p.with_check ?? ""}`.includes("is_active_staff()"))
      .map((p) => `${p.tablename}|${p.policyname}`);
    expect(open).toEqual(OPEN_BY_DESIGN);
  });

  it("기준선 대비 봉인 밖 정책 83개가 바뀌고 RESTRICTIVE 정책 2개가 더해진다(이름·명령·역할은 그대로)", async () => {
    const s0 = await catalogSnapshot(before);
    const s1 = await catalogSnapshot(after);
    type P = { tablename: string; policyname: string; roles: string; cmd: string; permissive: string; qual: string | null; with_check: string | null };
    const key = (p: P) => `${p.tablename}|${p.policyname}`;
    const outside = (ps: P[]) => (ps as P[]).filter((p) => !SEALED.includes(p.tablename));
    const m0 = new Map(outside(s0.policies as P[]).map((p) => [key(p), p]));
    const m1 = new Map(outside(s1.policies as P[]).map((p) => [key(p), p]));
    const changed = [...m0.keys()].filter((k) => {
      const a = m0.get(k)!;
      const b = m1.get(k)!;
      expect(b, k).toBeDefined();
      expect([b.roles, b.cmd, b.permissive], k).toEqual([a.roles, a.cmd, a.permissive]);
      return a.qual !== b.qual || a.with_check !== b.with_check;
    });
    expect(changed).toHaveLength(83);
    expect(new Set(changed.map((k) => k.split("|")[0])).size).toBe(47);
    const added = [...m1.keys()].filter((k) => !m0.has(k));
    expect(added.sort()).toEqual(["clients|seal active staff only", "company_documents|seal active staff only"]);
    for (const k of added) expect(m1.get(k)!.permissive).toBe("RESTRICTIVE");
    // service_role·anon 정책은 하나도 바뀌지 않았다
    for (const [k, p] of m0) {
      if (p.roles === "{service_role}" || p.roles === "{anon}") expect(m1.get(k), k).toEqual(p);
    }
  });
});

