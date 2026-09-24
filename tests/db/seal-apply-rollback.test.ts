// 운영 적용 스크립트(apply)·데이터 보정·되돌리기 스크립트 검증.
// 되돌리기 후 정책·트리거·뷰 옵션·함수·RLS 켜짐 상태가 기준선과 같아야 한다.
import { describe, expect, it } from "vitest";
import {
  APPLY,
  DATA_FIX,
  DATA_FIX_ROLLBACK,
  MIGRATION,
  ROLLBACK,
  SERVICE,
  U,
  catalogSnapshot,
  createBaselineDb,
  rows,
  seed,
  stripTxn,
} from "./helpers/seal-db";

describe("apply 스크립트 구성", () => {
  it("BEGIN 으로 시작해 COMMIT 으로 끝나고, 마이그레이션·데이터 보정 전문을 그대로 담는다", () => {
    const stmtLines = APPLY.split("\n").filter((l) => l.trim() && !l.trim().startsWith("--"));
    expect(stmtLines[0].trim()).toBe("BEGIN;");
    expect(stmtLines[stmtLines.length - 1].trim()).toBe("COMMIT;");
    expect(APPLY.match(/^BEGIN;$/gm)).toHaveLength(1);
    expect(APPLY.match(/^COMMIT;$/gm)).toHaveLength(1);
    expect(APPLY.includes(MIGRATION)).toBe(true);
    expect(APPLY.includes(DATA_FIX)).toBe(true);
    expect(APPLY.indexOf(MIGRATION)).toBeLessThan(APPLY.indexOf(DATA_FIX));
  });

  it("데이터 보정은 id·이메일을 적지 않고 조건으로 고른다", () => {
    expect(DATA_FIX).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(DATA_FIX).not.toMatch(/@/);
    expect(DATA_FIX).toMatch(/status = 'active' AND bu_code IS NULL/);
  });
});

describe("apply → 되돌리기", () => {
  it("apply 전체(BEGIN/COMMIT 포함)가 한 번에 적용되고 사업부 없는 재직 계정 1건이 pending 이 된다", async () => {
    const db = await createBaselineDb();
    await seed(db);
    await db.exec(APPLY);
    const noBu = await rows<{ status: string }>(db, SERVICE, "select status from public.app_users where id = $1", [U.noBuActive]);
    expect(noBu[0].status).toBe("pending");
    expect(await rows(db, SERVICE, "select 1 from public.app_users where status = 'active' and bu_code is null")).toHaveLength(0);
    const log = await rows(db, SERVICE, "select field, old_value, new_value, source, changed_by from public.app_user_changes");
    expect(log).toEqual([{ field: "status", old_value: "active", new_value: "pending", source: "external", changed_by: null }]);
    // 다른 계정은 그대로
    const others = await rows<{ n: number }>(db, SERVICE, "select count(*)::int as n from public.app_users where status = 'pending'");
    expect(others[0].n).toBe(2);
    await db.close();
  });

  it("데이터 보정 되돌리기 + 봉인 되돌리기 후 정책·트리거·뷰·함수가 기준선과 같다", async () => {
    const db = await createBaselineDb();
    await seed(db);
    const s0 = await catalogSnapshot(db);

    await db.exec(stripTxn(APPLY));
    const s1 = await catalogSnapshot(db);
    expect(s1.policies).not.toEqual(s0.policies);
    expect(s1.triggers).not.toEqual(s0.triggers);
    expect(s1.views).not.toEqual(s0.views);

    await db.exec(DATA_FIX_ROLLBACK);
    await db.exec(stripTxn(ROLLBACK));
    const s2 = await catalogSnapshot(db);
    expect(s2.policies).toEqual(s0.policies);
    expect(s2.triggers).toEqual(s0.triggers);
    expect(s2.views).toEqual(s0.views);
    expect(s2.functions).toEqual(s0.functions);
    expect(s2.rls).toEqual(s0.rls);

    const noBu = await rows<{ status: string }>(db, SERVICE, "select status from public.app_users where id = $1", [U.noBuActive]);
    expect(noBu[0].status).toBe("active");
    // 원래 pending 이던 계정은 되돌리기 대상이 아니다
    const pend = await rows<{ status: string }>(db, SERVICE, "select status from public.app_users where id = $1", [U.pending]);
    expect(pend[0].status).toBe("pending");
    // 감사 기록은 남는다(보정 1줄 + 보정 되돌리기 1줄)
    expect(
      await rows(db, SERVICE, "select old_value, new_value from public.app_user_changes order by id"),
    ).toEqual([
      { old_value: "active", new_value: "pending" },
      { old_value: "pending", new_value: "active" },
    ]);

    // 되돌린 뒤 다시 적용해도 된다
    await db.exec(stripTxn(APPLY));
    expect((await catalogSnapshot(db)).policies).toEqual(s1.policies);
    await db.close();
  });

  it("사업부 없는 재직 계정이 2건 이상이면 데이터 보정이 중단된다", async () => {
    const db = await createBaselineDb();
    await seed(db);
    await db.exec(`update public.app_users set bu_code = null where id = '${U.memberFlow}'`);
    await expect(db.exec(APPLY)).rejects.toThrow(/데이터 보정 중단/);
    await db.exec("ROLLBACK").catch(() => undefined);
    // 트랜잭션이 통째로 취소되어 봉인 정책도 들어가지 않았다
    const pol = await db.query(`select 1 from pg_policies where policyname like 'seal %'`);
    expect(pol.rows).toHaveLength(0);
    await db.close();
  });
});
