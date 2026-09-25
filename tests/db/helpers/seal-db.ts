// 봉인 마이그레이션 테스트용 PGlite 도우미.
// 운영 DB에 접속하지 않는다. 메모리 PGlite에 stubs + 운영 기준선 스키마를 올린다.
// 모든 사용자 id·이름은 가짜 값이다(공개 저장소).
import fs from "node:fs";
import path from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

const root = path.resolve(__dirname, "../../..");
// Windows 체크아웃(core.autocrlf)에서도 같은 결과가 나오도록 줄바꿈을 LF로 맞춘다.
export const readRepo = (rel: string) =>
  fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");

export const STUBS = readRepo("scripts/schema/pglite-stubs.sql");
export const BASELINE = readRepo("supabase/baseline/20260924_prod_snapshot.sql");
export const MIGRATION = readRepo("supabase/migrations/20260925000000_unified_ops_seal.sql");
export const APPLY = readRepo("supabase/apply/20260925_seal_apply.sql");
export const ROLLBACK = readRepo("supabase/apply/20260925_seal_rollback.sql");
export const DATA_FIX = readRepo("supabase/apply/20260925_data_fix.sql");
export const DATA_FIX_ROLLBACK = readRepo("supabase/apply/20260925_data_fix_rollback.sql");

/** BEGIN;/COMMIT; 줄을 뺀다(테스트가 트랜잭션을 직접 다룰 때). */
export const stripTxn = (sql: string) =>
  sql
    .split("\n")
    .filter((l) => !/^\s*(BEGIN|COMMIT)\s*;\s*$/i.test(l))
    .join("\n");

export async function createBaselineDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(STUBS);
  await db.exec(BASELINE);
  return db;
}

export async function applySeal(db: PGlite) {
  await db.exec(MIGRATION);
}

// 가짜 사용자 (uuid 는 테스트 전용)
export const U = {
  admin: "00000000-0000-4000-8000-000000000001",
  leaderGrigo: "00000000-0000-4000-8000-000000000002", // 다른 사업부 리더
  managerReact: "00000000-0000-4000-8000-000000000003",
  memberReact: "00000000-0000-4000-8000-000000000004",
  memberFlow: "00000000-0000-4000-8000-000000000005",
  pending: "00000000-0000-4000-8000-000000000006",
  retired: "00000000-0000-4000-8000-000000000007",
  noBuActive: "00000000-0000-4000-8000-000000000008",
  managerGrigo: "00000000-0000-4000-8000-000000000009",
} as const;

export type Actor =
  | { role: "anon" }
  | { role: "service_role" }
  | { role: "authenticated"; uid: string }
  | { role: "postgres"; uid?: string };

export const asUser = (uid: string): Actor => ({ role: "authenticated", uid });
export const ANON: Actor = { role: "anon" };
export const SERVICE: Actor = { role: "service_role" };
/** 테이블 소유자(정책 무시) 권한 + 선택적 JWT sub. SECURITY DEFINER RPC 같은 비서비스 경로 흉내. */
export const OWNER = (uid?: string): Actor => ({ role: "postgres", uid });

async function enter(tx: Transaction, actor: Actor) {
  const claims: Record<string, string> = {
    role: actor.role === "postgres" ? "authenticated" : actor.role,
  };
  if ("uid" in actor && actor.uid) claims.sub = actor.uid;
  await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
  if (actor.role !== "postgres") await tx.exec(`set local role ${actor.role}`);
}

/** actor 권한으로 실행한 결과. 성공하면 커밋된다. */
export async function q<T = Record<string, unknown>>(
  db: PGlite,
  actor: Actor,
  sql: string,
  params: unknown[] = [],
) {
  return db.transaction(async (tx) => {
    await enter(tx, actor);
    return tx.query<T>(sql, params);
  });
}

export async function rows<T = Record<string, unknown>>(
  db: PGlite,
  actor: Actor,
  sql: string,
  params: unknown[] = [],
) {
  return (await q<T>(db, actor, sql, params)).rows;
}

/** actor 권한으로 실행, 영향 받은 행 수. */
export async function exec(db: PGlite, actor: Actor, sql: string, params: unknown[] = []) {
  return (await q(db, actor, sql, params)).affectedRows ?? 0;
}

export const SEED = `
insert into public.business_units (code, name) values
  ('GRIGO','G'),('DEETZ','D'),('FLOW','F'),('REACT','R'),('MODOO','M'),('AST','A'),('HEAD','H');

insert into auth.users (id) values
  ('${U.admin}'),('${U.leaderGrigo}'),('${U.managerReact}'),('${U.memberReact}'),('${U.memberFlow}'),
  ('${U.pending}'),('${U.retired}'),('${U.noBuActive}'),('${U.managerGrigo}');

insert into public.app_users (id, name, role, bu_code, status, "position", hire_date) values
  ('${U.admin}',        'test-admin',   'admin',   'HEAD',  'active',  'p', '2024-01-01'),
  ('${U.leaderGrigo}',  'test-leader',  'leader',  'GRIGO', 'active',  'p', '2024-01-01'),
  ('${U.managerReact}', 'test-mgr-r',   'manager', 'REACT', 'active',  'p', '2024-01-01'),
  ('${U.memberReact}',  'test-mem-r',   'member',  'REACT', 'active',  'p', '2024-01-01'),
  ('${U.memberFlow}',   'test-mem-f',   'member',  'FLOW',  'active',  'p', '2024-01-01'),
  ('${U.pending}',      'test-pending', 'member',  'REACT', 'pending', 'p', null),
  ('${U.retired}',      'test-retired', 'manager', 'REACT', 'retired', 'p', '2020-01-01'),
  ('${U.noBuActive}',   'test-nobu',    'member',  null,    'active',  null, null),
  ('${U.managerGrigo}', 'test-mgr-g',   'manager', 'GRIGO', 'active',  'p', '2024-01-01');

-- 프로젝트
-- 1: REACT, PM=managerReact, 완료
-- 2: REACT, PM 없음, 생성자=admin, 참여자 memberReact(객체 형식, 운영 데이터 형식)
-- 3: GRIGO, PM=managerGrigo, 진행중
-- 4: REACT, PM=admin, 진행중 (managerReact: 같은 사업부 + PM 있음 → 보임)
-- 5: FLOW, PM 없음, 생성자=memberFlow, 운영중
-- 6: GRIGO, PM 없음, 준비중, 참여자 memberFlow(문자열 형식)
-- 7: REACT, PM 없음, 완료 (managerReact: PM 없음 → 안 보임)
insert into public.projects (id, bu_code, name, category, status, created_by, pm_id, participants) values
  (1, 'REACT', 'p1', 'c', '완료',   '${U.admin}',       '${U.managerReact}', '[]'),
  (2, 'REACT', 'p2', 'c', '진행중', '${U.admin}',       null,                '[{"user_id":"${U.memberReact}","role":"participant"}]'),
  (3, 'GRIGO', 'p3', 'c', '진행중', '${U.leaderGrigo}', '${U.managerGrigo}', '[]'),
  (4, 'REACT', 'p4', 'c', '진행중', '${U.admin}',       '${U.admin}',        '[]'),
  (5, 'FLOW',  'p5', 'c', '운영중', '${U.memberFlow}',  null,                '[]'),
  (6, 'GRIGO', 'p6', 'c', '준비중', '${U.admin}',       null,                '["${U.memberFlow}"]'),
  (7, 'REACT', 'p7', 'c', '완료',   '${U.admin}',       null,                '[]');
select setval('public.projects_id_seq', 100);

insert into public.project_tasks (id, project_id, bu_code, title, assignee_id, assignee, due_date, status) values
  (1, 1, 'REACT', 't1', '${U.managerReact}', 'x', '2026-09-30', 'todo'),
  (2, 3, 'GRIGO', 't2', '${U.memberReact}',  'x', '2026-09-30', 'in_progress'),
  (3, 3, 'GRIGO', 't3', '${U.managerGrigo}', 'x', '2026-09-30', 'todo'),
  (4, 5, 'FLOW',  't4', '${U.memberFlow}',   'x', '2026-10-01', 'done'),
  (5, 7, 'REACT', 't5', null,                'x', '2026-10-01', 'todo');
select setval('public.project_tasks_id_seq', 100);

insert into public.financial_entries (id, project_id, bu_code, kind, name, amount, actual_amount, occurred_at, status, created_by, due_date, entry_scope, counterparty_bu_code) values
  (1, 1,    'REACT', 'revenue', 'f1', 1000, 1100, '2026-09-01', 'planned',  '${U.admin}',        '2026-09-10', 'external', null),
  (2, 1,    'REACT', 'expense', 'f2',  300,  300, '2026-09-02', 'paid',     '${U.managerReact}', null,         'external', null),
  (3, 3,    'GRIGO', 'revenue', 'f3', 5000, null, '2026-09-03', 'planned',  '${U.leaderGrigo}',  null,         'external', null),
  (4, 3,    'GRIGO', 'expense', 'f4',  700,  700, '2026-09-04', 'canceled', '${U.admin}',        null,         'external', null),
  (5, null, 'FLOW',  'expense', 'f5',  200,  200, '2026-09-05', 'planned',  '${U.memberFlow}',   null,         'external', null),
  (6, 5,    'FLOW',  'expense', 'f6',   50,   50, '2026-09-06', 'planned',  '${U.admin}',        null,         'internal_allocation', 'REACT');
select setval('public.financial_entries_id_seq', 100);

insert into public.gowid_expense_project_link (gowid_expense_id, project_id, linked_by, financial_entry_id, expense_amount)
  values (9001, 1, '${U.admin}', 2, 300);

insert into public.portfolio_items (title) values ('pf1'), ('pf2');
insert into public.clients (name, logo_url) values ('cl1', 'x'), ('cl2', 'y');

insert into public.attendance_logs (user_id, work_date, check_in_at) values
  ('${U.managerReact}', '2026-09-20', '2026-09-20T00:00:00Z'),
  ('${U.memberFlow}',   '2026-09-20', '2026-09-20T00:00:00Z'),
  ('${U.retired}',      '2026-09-20', '2026-09-20T00:00:00Z');

insert into public.project_pnl_reports (project_id, bu_code) values (1, 'REACT'), (3, 'GRIGO');
`;

export async function seed(db: PGlite) {
  await db.exec(SEED);
}

/** 정책·트리거·뷰 옵션·함수 목록 스냅샷(되돌리기 비교용). */
export async function catalogSnapshot(db: PGlite) {
  const policies = await db.query(`
    select tablename, policyname, permissive, roles::text as roles, cmd, qual, with_check
    from pg_policies where schemaname = 'public'
      and tablename not in ('financial_entry_changes', 'app_user_changes')
    order by tablename, policyname`);
  const triggers = await db.query(`
    select c.relname, t.tgname, pg_get_triggerdef(t.oid) as def
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal order by 1, 2`);
  const views = await db.query(`
    select c.relname, coalesce(c.reloptions::text, '') as opts, pg_get_viewdef(c.oid) as def
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v' order by 1`);
  const functions = await db.query(`
    select p.proname, pg_get_function_identity_arguments(p.oid) as args, md5(pg_get_functiondef(p.oid)) as h
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' order by 1, 2`);
  const rls = await db.query(`
    select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname not in ('financial_entry_changes', 'app_user_changes') order by 1`);
  return {
    policies: policies.rows,
    triggers: triggers.rows,
    views: views.rows,
    functions: functions.rows,
    rls: rls.rows,
  };
}
