// 외부 사용자(사내 워커·flowmaker·reactstudio.kr 공개 페이지) 대표 조회가
// 봉인 전후로 같은 결과를 내는지 확인한다(docs/contracts.md 1절 기준).
// 워커·flowmaker·reactstudio 관리자 = 서비스 권한, reactstudio 공개 페이지 = anon.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ANON, SERVICE, applySeal, createBaselineDb, rows, seed, type Actor } from "./helpers/seal-db";

const CONSUMER_QUERIES: Array<{ name: string; actor: Actor; sql: string }> = [
  // 사내 워커 digest.ts
  {
    name: "worker digest: 진행 프로젝트",
    actor: SERVICE,
    sql: `select id, bu_code, name, status from public.projects
          where status in ('진행중', '준비중', '운영중') order by id`,
  },
  {
    name: "worker digest: 열린 할일",
    actor: SERVICE,
    sql: `select id, project_id, bu_code, title, status, due_date from public.project_tasks
          where status in ('todo', 'in_progress') order by id`,
  },
  {
    name: "worker digest: planned 재무(GRIGO·REACT)",
    actor: SERVICE,
    sql: `select id, bu_code, kind, amount, due_date, (due_date is null) as no_due from public.financial_entries
          where status = 'planned' and kind in ('revenue', 'expense') and bu_code in ('GRIGO', 'REACT') order by id`,
  },
  // 사내 워커 monthly-pnl.ts
  {
    name: "worker monthly-pnl",
    actor: SERVICE,
    sql: `select bu_code, kind, status, amount, actual_amount, occurred_at, entry_scope, counterparty_bu_code
          from public.financial_entries where status <> 'canceled' order by id`,
  },
  {
    name: "worker monthly-pnl: 연결손익(내부배부 제외) 합계",
    actor: SERVICE,
    sql: `select bu_code, kind, sum(amount)::bigint as total from public.financial_entries
          where status <> 'canceled' and entry_scope <> 'internal_allocation' group by 1, 2 order by 1, 2`,
  },
  // 사내 워커 overload-detector.ts
  {
    name: "worker overload-detector",
    actor: SERVICE,
    sql: `select bu_code, assignee from public.project_tasks
          where status in ('todo', 'in_progress') and due_date is not null order by id`,
  },
  // 사내 워커 dashboard-server.ts
  {
    name: "worker dashboard: projects",
    actor: SERVICE,
    sql: `select id, bu_code, name, category, status, end_date, pm_id from public.projects order by id`,
  },
  {
    name: "worker dashboard: tasks",
    actor: SERVICE,
    sql: `select id, project_id, bu_code, title, assignee, status, due_date from public.project_tasks order by id`,
  },
  {
    name: "worker dashboard: app_users",
    actor: SERVICE,
    sql: `select id, name from public.app_users order by id`,
  },
  // flowmaker erp.ts
  {
    name: "flowmaker FLOW 재직자 명단",
    actor: SERVICE,
    sql: `select id, name, bu_code, role, position, status, hire_date from public.app_users
          where bu_code = 'FLOW' and status = 'active' order by id`,
  },
  // reactstudio.kr 공개 페이지(anon)
  { name: "reactstudio 공개: portfolio_items", actor: ANON, sql: `select id, title from public.portfolio_items order by id` },
  {
    name: "reactstudio 공개: 완료 프로젝트",
    actor: ANON,
    sql: `select id, name, category, status from public.projects where status = '완료' order by id`,
  },
  {
    name: "reactstudio 공개: 완료 프로젝트(조건 없이 전체 조회해도 완료만)",
    actor: ANON,
    sql: `select id from public.projects order by id`,
  },
  { name: "reactstudio 공개: clients", actor: ANON, sql: `select id, name from public.clients order by id` },
  // reactstudio 관리자(서비스 권한) 읽기
  {
    name: "reactstudio admin: REACT 지출",
    actor: SERVICE,
    sql: `select id, name, amount, status from public.financial_entries
          where kind = 'expense' and bu_code = 'REACT' order by id`,
  },
];

let before: PGlite;
let after: PGlite;

beforeAll(async () => {
  before = await createBaselineDb();
  await seed(before);
  after = (await before.clone()) as PGlite;
  await applySeal(after);
});

afterAll(async () => {
  await before?.close();
  await after?.close();
});

describe("외부 사용자 대표 조회: 봉인 전후 동일", () => {
  for (const c of CONSUMER_QUERIES) {
    it(c.name, async () => {
      const b = await rows(before, c.actor, c.sql);
      const a = await rows(after, c.actor, c.sql);
      expect(b.length).toBeGreaterThan(0);
      expect(a).toEqual(b);
    });
  }
});
