// 봉인 마이그레이션(20260925000000_unified_ops_seal.sql) 동작 테스트.
// PGlite + stubs + 운영 기준선 스키마 + 가짜 시드 데이터. 운영 DB에 접속하지 않는다.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  ANON,
  OWNER,
  SERVICE,
  U,
  applySeal,
  asUser,
  createBaselineDb,
  exec,
  q,
  rows,
  seed,
} from "./helpers/seal-db";

let base: PGlite;

beforeAll(async () => {
  base = await createBaselineDb();
  await seed(base);
  await applySeal(base);
});

afterAll(async () => {
  await base?.close();
});

/** 변경 테스트는 복제본에서 한다(공유 DB 오염 방지). */
async function fresh(): Promise<PGlite> {
  return (await base.clone()) as PGlite;
}

const ids = (rs: Array<{ id: unknown }>) => rs.map((r) => Number(r.id)).sort((a, b) => a - b);

describe("삭제 방지", () => {
  it("paid·canceled 매출·지출은 서비스 권한으로도 삭제할 수 없다", async () => {
    const db = await fresh();
    await expect(exec(db, SERVICE, "delete from public.financial_entries where id = 2")).rejects.toThrow(
      /삭제할 수 없습니다/,
    );
    await expect(exec(db, SERVICE, "delete from public.financial_entries where id = 4")).rejects.toThrow(
      /삭제할 수 없습니다/,
    );
    // 소유자(최상위 권한)도 막힌다
    await expect(exec(db, OWNER(), "delete from public.financial_entries where id = 2")).rejects.toThrow(
      /삭제할 수 없습니다/,
    );
    const left = await rows(db, SERVICE, "select id from public.financial_entries where id in (2, 4)");
    expect(left).toHaveLength(2);
    await db.close();
  });

  it("planned 매출·지출은 서비스 권한으로 삭제할 수 있다", async () => {
    const db = await fresh();
    expect(await exec(db, SERVICE, "delete from public.financial_entries where id = 5")).toBe(1);
    await db.close();
  });

  it("재무 기록이 있는 프로젝트는 삭제할 수 없다(연쇄 삭제 전에 막힌다)", async () => {
    const db = await fresh();
    await expect(exec(db, SERVICE, "delete from public.projects where id = 1")).rejects.toThrow(
      /재무 기록이 있는 프로젝트는 삭제할 수 없습니다\. 보류로 바꾸세요/,
    );
    // planned 행만 있는 프로젝트도 막힌다
    await expect(exec(db, SERVICE, "delete from public.projects where id = 5")).rejects.toThrow(
      /재무 기록이 있는 프로젝트는 삭제할 수 없습니다/,
    );
    // 딸린 행이 그대로 남아 있다
    const fe = await rows(db, SERVICE, "select id from public.financial_entries where project_id = 1");
    expect(fe).toHaveLength(2);
    const tasks = await rows(db, SERVICE, "select id from public.project_tasks where project_id = 1");
    expect(tasks).toHaveLength(1);
    await db.close();
  });

  it("재무 기록이 없는 프로젝트는 서비스 권한으로 삭제할 수 있다", async () => {
    const db = await fresh();
    expect(await exec(db, SERVICE, "delete from public.projects where id = 7")).toBe(1);
    expect(await rows(db, SERVICE, "select id from public.project_tasks where project_id = 7")).toHaveLength(0);
    await db.close();
  });
});

describe("매출·지출 변경 기록", () => {
  it("updated_by 가 있으면 erp, 기록 후 updated_by 는 비워진다", async () => {
    const db = await fresh();
    await exec(
      db,
      SERVICE,
      `update public.financial_entries set amount = 1200, status = 'paid', updated_by = $1 where id = 1`,
      [U.admin],
    );
    const log = await rows<{ field: string; old_value: string; new_value: string; source: string; changed_by: string }>(
      db,
      SERVICE,
      `select field, old_value, new_value, source, changed_by from public.financial_entry_changes
       where entry_id = 1 and action = 'update' order by field`,
    );
    expect(log).toEqual([
      { field: "amount", old_value: "1000", new_value: "1200", source: "erp", changed_by: U.admin },
      { field: "status", old_value: "planned", new_value: "paid", source: "erp", changed_by: U.admin },
    ]);
    const fe = await rows<{ updated_by: string | null }>(db, SERVICE, "select updated_by from public.financial_entries where id = 1");
    expect(fe[0].updated_by).toBeNull();
    await db.close();
  });

  it("updated_by 없이 바꾸면 external, 이전 updated_by 를 재사용하지 않는다", async () => {
    const db = await fresh();
    await exec(db, SERVICE, `update public.financial_entries set amount = 1300, updated_by = $1 where id = 1`, [U.admin]);
    await exec(db, SERVICE, `update public.financial_entries set actual_amount = 1430, bu_code = 'GRIGO' where id = 1`);
    const log = await rows<{ field: string; source: string; changed_by: string | null }>(
      db,
      SERVICE,
      `select field, source, changed_by from public.financial_entry_changes
       where entry_id = 1 and action = 'update' order by id`,
    );
    expect(log).toEqual([
      { field: "amount", source: "erp", changed_by: U.admin },
      { field: "actual_amount", source: "external", changed_by: null },
      { field: "bu_code", source: "external", changed_by: null },
    ]);
    await db.close();
  });

  it("같은 updated_by 가 다시 들어와도(비워지므로) erp 로 기록되고, 추적 칸 외 변경은 기록하지 않는다", async () => {
    const db = await fresh();
    await exec(db, SERVICE, `update public.financial_entries set memo = 'x', updated_by = $1 where id = 3`, [U.leaderGrigo]);
    expect(await rows(db, SERVICE, "select 1 from public.financial_entry_changes where entry_id = 3 and action='update'")).toHaveLength(0);
    await exec(db, SERVICE, `update public.financial_entries set amount = 5100, updated_by = $1 where id = 3`, [U.leaderGrigo]);
    const log = await rows<{ source: string; changed_by: string }>(
      db,
      SERVICE,
      "select source, changed_by from public.financial_entry_changes where entry_id = 3 and action='update'",
    );
    expect(log).toEqual([{ source: "erp", changed_by: U.leaderGrigo }]);
    await db.close();
  });

  it("INSERT 는 field='*' 한 줄, created_by 가 아니라 updated_by 로 출처를 정한다", async () => {
    const db = await fresh();
    const ins = await rows<{ id: number; updated_by: string | null }>(
      db,
      SERVICE,
      `insert into public.financial_entries (bu_code, kind, name, amount, occurred_at, created_by, updated_by)
       values ('REACT', 'expense', 'n1', 10, '2026-09-25', $1, $1) returning id, updated_by`,
      [U.managerReact],
    );
    expect(ins[0].updated_by).toBeNull();
    const ext = await rows<{ id: number }>(
      db,
      SERVICE,
      `insert into public.financial_entries (bu_code, kind, name, amount, occurred_at, created_by)
       values ('REACT', 'expense', 'n2', 20, '2026-09-25', $1) returning id`,
      [U.managerReact],
    );
    const log = await rows<{ entry_id: number; field: string; old_value: string | null; new_value: string; source: string; changed_by: string | null }>(
      db,
      SERVICE,
      `select entry_id, field, old_value, new_value, source, changed_by from public.financial_entry_changes
       where action = 'insert' order by id`,
    );
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({ entry_id: Number(ins[0].id), field: "*", old_value: null, source: "erp", changed_by: U.managerReact });
    expect(log[0].new_value).toContain("amount=10");
    expect(log[1]).toMatchObject({ entry_id: Number(ext[0].id), field: "*", source: "external", changed_by: null });
    await db.close();
  });
});

describe("사용자 변경 기록·본인 변경 금지", () => {
  it("역할·사업부·재직 상태 변경을 기록한다", async () => {
    const db = await fresh();
    await exec(
      db,
      SERVICE,
      `update public.app_users set role = 'leader', bu_code = 'FLOW', status = 'active', updated_by = $1 where id = $2`,
      [U.admin, U.memberReact],
    );
    await exec(db, SERVICE, `update public.app_users set status = 'retired' where id = $1`, [U.memberReact]);
    const log = await rows<{ field: string; old_value: string; new_value: string; source: string; changed_by: string | null }>(
      db,
      SERVICE,
      `select field, old_value, new_value, source, changed_by from public.app_user_changes where user_id = $1 order by id`,
      [U.memberReact],
    );
    expect(log).toEqual([
      { field: "role", old_value: "member", new_value: "leader", source: "erp", changed_by: U.admin },
      { field: "bu_code", old_value: "REACT", new_value: "FLOW", source: "erp", changed_by: U.admin },
      { field: "status", old_value: "active", new_value: "retired", source: "external", changed_by: null },
    ]);
    const u = await rows<{ updated_by: string | null }>(db, SERVICE, "select updated_by from public.app_users where id = $1", [U.memberReact]);
    expect(u[0].updated_by).toBeNull();
    await db.close();
  });

  it("본인이 자기 역할·사업부·재직 상태를 바꾸면 거부한다(서비스 외 경로)", async () => {
    const db = await fresh();
    await expect(
      exec(db, OWNER(U.memberReact), `update public.app_users set role = 'admin' where id = $1`, [U.memberReact]),
    ).rejects.toThrow(/본인의 역할·사업부·재직 상태/);
    await expect(
      exec(db, OWNER(U.pending), `update public.app_users set status = 'active' where id = $1`, [U.pending]),
    ).rejects.toThrow(/본인의 역할·사업부·재직 상태/);
    await expect(
      exec(db, OWNER(U.noBuActive), `update public.app_users set bu_code = 'HEAD' where id = $1`, [U.noBuActive]),
    ).rejects.toThrow(/본인의 역할·사업부·재직 상태/);
    // 본인의 다른 칸 변경은 가드 대상이 아니다
    expect(await exec(db, OWNER(U.memberReact), `update public.app_users set "position" = 'q' where id = $1`, [U.memberReact])).toBe(1);
    // 서비스 권한(auth.uid() 없음)은 통과한다
    expect(await exec(db, SERVICE, `update public.app_users set role = 'manager' where id = $1`, [U.memberReact])).toBe(1);
    await db.close();
  });

  it("authenticated 는 app_users 를 UPDATE 할 수 없다(본인 행 포함)", async () => {
    const db = await fresh();
    expect(await exec(db, asUser(U.memberReact), `update public.app_users set role = 'admin' where id = $1`, [U.memberReact])).toBe(0);
    expect(await exec(db, asUser(U.admin), `update public.app_users set role = 'member' where id = $1`, [U.memberReact])).toBe(0);
    const r = await rows<{ role: string }>(db, SERVICE, "select role from public.app_users where id = $1", [U.memberReact]);
    expect(r[0].role).toBe("member");
    await db.close();
  });
});

describe("RLS 보기 범위", () => {
  // 완료 프로젝트는 비로그인 공개 범위라 로그인 사용자에게도 보인다(아래 별도 테스트). 가시성 규칙 검사는 미완료 프로젝트로 한다.
  const projectIds = async (uid: string) =>
    ids(await rows<{ id: number }>(base, asUser(uid), "select id from public.projects where status <> '완료'"));
  const taskIds = async (uid: string) => ids(await rows<{ id: number }>(base, asUser(uid), "select id from public.project_tasks"));
  const feIds = async (uid: string) => ids(await rows<{ id: number }>(base, asUser(uid), "select id from public.financial_entries"));

  it("admin 은 전체를 본다", async () => {
    expect(await projectIds(U.admin)).toEqual([2, 3, 4, 5, 6]);
    expect(await taskIds(U.admin)).toEqual([1, 2, 3, 4, 5]);
    expect(await feIds(U.admin)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("다른 사업부 leader 도 전체를 본다", async () => {
    expect(await projectIds(U.leaderGrigo)).toEqual([2, 3, 4, 5, 6]);
    expect(await taskIds(U.leaderGrigo)).toEqual([1, 2, 3, 4, 5]);
    expect(await feIds(U.leaderGrigo)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("leader 는 쓸 수 없다", async () => {
    const db = await fresh();
    const L = asUser(U.leaderGrigo);
    expect(await exec(db, L, "update public.projects set name = 'x' where id = 3")).toBe(0);
    expect(await exec(db, L, "update public.financial_entries set amount = 1 where id = 3")).toBe(0);
    expect(await exec(db, L, "delete from public.project_tasks where id = 3")).toBe(0);
    await expect(
      exec(db, L, "insert into public.financial_entries (bu_code, kind, name, amount, occurred_at) values ('GRIGO','expense','x',1,'2026-09-25')"),
    ).rejects.toThrow(/row-level security/);
    await db.close();
  });

  it("manager: PM·생성자·참여자 + 같은 사업부의 PM 있는 프로젝트", async () => {
    // managerReact: 1(PM), 4(REACT + PM 있음). 2·7은 REACT지만 PM 없음 → 안 보임
    expect(await projectIds(U.managerReact)).toEqual([4]); // 1은 완료라 미완료 목록에서 빠진다
    // 할일: 프로젝트 1의 t1(담당도 본인)
    expect(await taskIds(U.managerReact)).toEqual([1]);
    // 재무: 프로젝트 1의 f1, f2(본인 등록)
    expect(await feIds(U.managerReact)).toEqual([1, 2]);
    // managerGrigo: 3(PM). 6은 GRIGO지만 PM 없음
    expect(await projectIds(U.managerGrigo)).toEqual([3]);
  });

  it("member: 참여자(객체·문자열 형식)·생성자 + 본인 담당 할일 + 본인 등록 재무", async () => {
    // memberReact: 2(참여자 객체 형식)
    expect(await projectIds(U.memberReact)).toEqual([2]);
    // 할일: 프로젝트 3의 t2 는 본인 담당이라 보인다
    expect(await taskIds(U.memberReact)).toEqual([2]);
    expect(await feIds(U.memberReact)).toEqual([]);
    // memberFlow: 5(생성자), 6(참여자 문자열 형식)
    expect(await projectIds(U.memberFlow)).toEqual([5, 6]);
    expect(await taskIds(U.memberFlow)).toEqual([4]);
    // f5(프로젝트 없음, 본인 등록), f6(프로젝트 5)
    expect(await feIds(U.memberFlow)).toEqual([5, 6]);
  });

  it("pending·retired·사업부 없는 계정은 0건(본인 app_users 행만)", async () => {
    for (const uid of [U.pending, U.retired, U.noBuActive]) {
      expect(await projectIds(uid)).toEqual([]);
      expect(await taskIds(uid)).toEqual([]);
      expect(await feIds(uid)).toEqual([]);
      expect(await rows(base, asUser(uid), "select id from public.gowid_expense_project_link")).toEqual([]);
      expect(await rows(base, asUser(uid), "select * from public.financial_entry_changes")).toEqual([]);
      const me = await rows<{ id: string }>(base, asUser(uid), "select id from public.app_users");
      expect(me.map((r) => r.id)).toEqual([uid]);
    }
  });

  it("재직 직원은 app_users 전체와 법인카드 연결을 읽는다", async () => {
    const all = await rows(base, asUser(U.memberReact), "select id from public.app_users");
    expect(all).toHaveLength(9);
    expect(await rows(base, asUser(U.memberReact), "select id from public.gowid_expense_project_link")).toHaveLength(1);
  });

  it("anon: 완료 프로젝트만, 나머지 봉인 테이블은 0건, 공개 테이블은 그대로", async () => {
    expect(ids(await rows<{ id: number }>(base, ANON, "select id from public.projects"))).toEqual([1, 7]);
    expect(await rows(base, ANON, "select id from public.financial_entries")).toEqual([]);
    expect(await rows(base, ANON, "select id from public.project_tasks")).toEqual([]);
    expect(await rows(base, ANON, "select id from public.app_users")).toEqual([]);
    expect(await rows(base, ANON, "select id from public.gowid_expense_project_link")).toEqual([]);
    expect(await rows(base, ANON, "select id from public.portfolio_items")).toHaveLength(2);
    expect(await rows(base, ANON, "select id from public.clients")).toHaveLength(2);
  });

  it("로그인 사용자도 완료 프로젝트는 비로그인 공개 범위만큼 본다(reactstudio.kr /history)", async () => {
    const anonDone = ids(await rows<{ id: number }>(base, ANON, "select id from public.projects"));
    for (const uid of [U.pending, U.retired, U.memberReact]) {
      const done = ids(await rows<{ id: number }>(base, asUser(uid), "select id from public.projects where status = '완료'"));
      expect(done).toEqual(anonDone);
    }
  });

  it("anon 은 app_users 에 INSERT 할 수 없다(가입은 서버 라우트로)", async () => {
    const db = await fresh();
    await db.exec(`insert into auth.users (id) values ('00000000-0000-4000-8000-0000000000aa')`);
    await expect(
      exec(db, ANON, `insert into public.app_users (id, name) values ('00000000-0000-4000-8000-0000000000aa', 'x')`),
    ).rejects.toThrow(/row-level security/);
    await db.close();
  });

  it("authenticated 는 봉인 5개 테이블에 쓸 수 없다(admin 포함)", async () => {
    const db = await fresh();
    const A = asUser(U.admin);
    const inserts = [
      `insert into public.projects (bu_code, name, category) values ('REACT', 'x', 'c')`,
      `insert into public.project_tasks (project_id, bu_code, title, due_date) values (1, 'REACT', 'x', '2026-10-01')`,
      `insert into public.financial_entries (bu_code, kind, name, amount, occurred_at) values ('REACT','expense','x',1,'2026-09-25')`,
      `insert into public.gowid_expense_project_link (gowid_expense_id, project_id, linked_by) values (9999, 1, '${U.admin}')`,
      `insert into public.app_users (id, name) values ('${U.admin}', 'dup')`,
    ];
    for (const s of inserts) await expect(exec(db, A, s)).rejects.toThrow(/row-level security/);
    expect(await exec(db, A, "update public.projects set name = 'x'")).toBe(0);
    expect(await exec(db, A, "update public.project_tasks set title = 'x'")).toBe(0);
    expect(await exec(db, A, "update public.financial_entries set memo = 'x'")).toBe(0);
    expect(await exec(db, A, "update public.gowid_expense_project_link set expense_amount = 1")).toBe(0);
    expect(await exec(db, A, "update public.app_users set name = 'x'")).toBe(0);
    expect(await exec(db, A, "delete from public.project_tasks")).toBe(0);
    expect(await exec(db, A, "delete from public.gowid_expense_project_link")).toBe(0);
    expect(await exec(db, A, "delete from public.app_users")).toBe(0);
    await db.close();
  });

  it("변경 기록 보기: admin 전체, 해당 사업부 leader, 등록자", async () => {
    const db = await fresh();
    await exec(db, SERVICE, "update public.financial_entries set memo = 'm', amount = amount + 1 where id in (1, 3, 5)");
    await exec(db, SERVICE, `update public.app_users set "position" = 'z', role = 'manager' where id = $1`, [U.memberFlow]);
    const entryIds = async (uid: string) =>
      [...new Set((await rows<{ entry_id: number }>(db, asUser(uid), "select entry_id from public.financial_entry_changes")).map((r) => Number(r.entry_id)))].sort();
    expect(await entryIds(U.admin)).toEqual([1, 3, 5]);
    expect(await entryIds(U.leaderGrigo)).toEqual([3]); // GRIGO 행 + 본인 등록 f3
    expect(await entryIds(U.memberFlow)).toEqual([5]); // 본인 등록
    expect(await entryIds(U.managerReact)).toEqual([]);
    expect(await rows(db, asUser(U.admin), "select * from public.app_user_changes")).toHaveLength(1);
    expect(await rows(db, asUser(U.leaderGrigo), "select * from public.app_user_changes")).toHaveLength(0);
    await expect(
      exec(db, asUser(U.admin), `insert into public.app_user_changes (user_id, field, source) values ('${U.admin}', 'role', 'erp')`),
    ).rejects.toThrow(/permission denied|row-level security/);
    await db.close();
  });
});

describe("뷰 호출자 권한", () => {
  it("두 뷰 모두 security_invoker=true", async () => {
    const r = await rows<{ relname: string; reloptions: string[] }>(
      base,
      SERVICE,
      `select c.relname, c.reloptions from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname in ('attendance_logs_with_user', 'project_pnl_reports_with_profit') order by 1`,
    );
    expect(r).toHaveLength(2);
    for (const v of r) expect(v.reloptions).toContain("security_invoker=true");
  });

  it("퇴사자는 근태 뷰로 다른 사람 기록을 읽지 못한다", async () => {
    const r = await rows<{ user_id: string }>(base, asUser(U.retired), "select user_id from public.attendance_logs_with_user");
    expect(r.every((x) => x.user_id === U.retired)).toBe(true);
    expect(await rows(base, ANON, "select id from public.attendance_logs_with_user")).toEqual([]);
  });

  it("서비스 권한은 뷰 전체를 읽는다", async () => {
    expect(await rows(base, SERVICE, "select id from public.attendance_logs_with_user")).toHaveLength(3);
    expect(await rows(base, SERVICE, "select id from public.project_pnl_reports_with_profit")).toHaveLength(2);
  });
});

describe("함수 속성", () => {
  it("판정 함수는 SECURITY DEFINER·STABLE·search_path 고정", async () => {
    const r = await q<{ proname: string; prosecdef: boolean; provolatile: string; proconfig: string[] | null }>(
      base,
      SERVICE,
      `select proname, prosecdef, provolatile, proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and proname in ('is_active_staff', 'can_view_project', 'is_staff_admin', 'is_staff_admin_or_leader', 'can_view_financial_entry_changes')`,
    );
    expect(r.rows).toHaveLength(5);
    for (const f of r.rows) {
      expect(f.prosecdef).toBe(true);
      expect(f.provolatile).toBe("s");
      expect((f.proconfig ?? []).some((c) => c.startsWith("search_path="))).toBe(true);
    }
  });
});
