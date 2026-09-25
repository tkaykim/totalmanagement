/**
 * 프로젝트·매출·지출 권한 회귀 (spec R4·R7~R15·R18·R32·15절).
 *
 * 순서가 있는 한 흐름이다(파일 안의 it는 차례로 돈다).
 * 모든 쓰기는 HEAD 사업부 "[E2E]" 프로젝트와 그 금액 0 지출 행에만 한다(_support/e2e-data.ts 안전장치).
 * `paid`·`canceled` 행은 지우지 않는다. 삭제 요청은 409를 확인하는 용도로만 보낸다.
 * 끝나면 참여자를 비우고 프로젝트를 '보류'로 바꾼다. 남은 `planned` 테스트 행은 `canceled`로 바꾼다.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requiredVarsFor, shouldSkip } from "./_support/env";
import { api, describeResult, kstToday, signIn, type Session } from "./_support/http";
import {
  FAR_FUTURE_DUE,
  assertE2EProject,
  assertE2ERow,
  e2eExpenseBody,
  ensureE2EProject,
  listE2ERows,
  readProjectAsAdmin,
  readRowAsAdmin,
  type E2EProject,
} from "./_support/e2e-data";

const VARS = requiredVarsFor(["ADMIN", "LEADER", "MEMBER"]);

describe.skipIf(shouldSkip("[E2E] 프로젝트·재무 권한", VARS))("[E2E] 프로젝트·매출·지출 권한", () => {
  const runId = `${kstToday()}-${randomUUID().slice(0, 8)}`;
  let admin: Session;
  let leader: Session;
  let member: Session;
  let project: E2EProject;
  /** 관리자가 만든 planned 행 */
  let plannedRow: any = null;
  /** 관리자가 만든 paid 행 */
  let paidRow: any = null;
  /** 멤버 본인이 만든 paid 행 */
  let memberPaidRow: any = null;
  /** 멤버 본인이 만든 뒤 취소한 행 */
  let memberCanceledRow: any = null;

  async function createRow(session: Session, label: string, extra: Record<string, unknown>) {
    const res = await api("POST", "/api/financial-entries", {
      session,
      body: e2eExpenseBody(project.id, `${label} ${runId}`, extra),
    });
    expect(res.status, describeResult(res)).toBe(200);
    assertE2ERow(res.body, project.id);
    return res.body;
  }

  async function patchRow(session: Session, row: any, body: Record<string, unknown>) {
    assertE2ERow(row, project.id);
    return api("PATCH", `/api/financial-entries/${row.id}`, { session, body });
  }

  beforeAll(async () => {
    admin = await signIn("ADMIN");
    leader = await signIn("LEADER");
    member = await signIn("MEMBER");
    project = await ensureE2EProject(admin);
    assertE2EProject(project);
    // 멤버 404 확인의 전제: 멤버가 생성자·PM·참여자가 아니어야 한다
    if (project.created_by === member.userId || project.pm_id === member.userId) {
      throw new Error("[test:api] 전제 실패: 멤버 테스트 계정이 [E2E] 프로젝트의 생성자·PM입니다. 다른 계정을 쓰세요.");
    }
  });

  afterAll(async () => {
    if (!admin || !project) return;
    // 남은 planned 테스트 행은 취소로 둔다(지우지 않는다)
    for (const row of [plannedRow]) {
      if (!row) continue;
      try {
        const current = await readRowAsAdmin(admin, project.id, row.id);
        if (current && current.status === "planned") {
          assertE2ERow(current, project.id);
          await api("PATCH", `/api/financial-entries/${row.id}`, { session: admin, body: { status: "canceled" } });
        }
      } catch (error) {
        console.warn("[test:api] 정리: planned 행 취소 실패", error);
      }
    }
    try {
      assertE2EProject(project);
      const res = await api("PATCH", `/api/projects/${project.id}`, {
        session: admin,
        body: { participants: [], status: "보류" },
      });
      if (res.status !== 200) console.warn(`[test:api] 정리: [E2E] 프로젝트 보류 전환 실패 ${describeResult(res)}`);
    } catch (error) {
      console.warn("[test:api] 정리: [E2E] 프로젝트 보류 전환 실패", error);
    }
  });

  // ---------------------------------------------------------------- 보기 범위 (R7·R8)

  it("FLOW 리더는 다른 사업부(HEAD) [E2E] 프로젝트를 목록에서 본다", async () => {
    const res = await api<any[]>("GET", "/api/projects", { session: leader });
    expect(res.status, describeResult(res)).toBe(200);
    expect((res.body ?? []).some((p) => Number(p.id) === Number(project.id))).toBe(true);
  });

  it("REACT 멤버는 참여하지 않은 [E2E] 프로젝트를 목록에서 못 본다", async () => {
    const res = await api<any[]>("GET", "/api/projects", { session: member });
    expect(res.status, describeResult(res)).toBe(200);
    expect((res.body ?? []).some((p) => Number(p.id) === Number(project.id))).toBe(false);
  });

  it("REACT 멤버가 [E2E] 프로젝트를 id로 직접 수정하면 404 (존재 숨김)", async () => {
    const res = await api("PATCH", `/api/projects/${project.id}`, {
      session: member,
      body: { description: `member-should-not-write ${runId}` },
    });
    expect(res.status, describeResult(res)).toBe(404);
  });

  it("FLOW 리더가 HEAD 프로젝트를 수정하면 403, 값은 그대로", async () => {
    const before = await readProjectAsAdmin(admin, project.id);
    const res = await api("PATCH", `/api/projects/${project.id}`, {
      session: leader,
      body: { description: `leader-should-not-write ${runId}` },
    });
    expect(res.status, describeResult(res)).toBe(403);
    const after = await readProjectAsAdmin(admin, project.id);
    expect(after?.description ?? null).toBe(before?.description ?? null);
  });

  // ---------------------------------------------------------------- 기한·입금일 (R14)

  it("planned 행을 기한 없이 등록하면 400, 행이 생기지 않는다", async () => {
    const label = `no-due ${runId}`;
    const res = await api("POST", "/api/financial-entries", {
      session: admin,
      body: e2eExpenseBody(project.id, label, { status: "planned" }),
    });
    expect(res.status, describeResult(res)).toBe(400);
    const rows = await listE2ERows(admin, project.id);
    expect(rows.some((r) => String(r.name).includes(label))).toBe(false);
  });

  it("관리자가 planned 행(금액 0, 먼 미래 기한)을 등록한다", async () => {
    plannedRow = await createRow(admin, "planned", { status: "planned", due_date: FAR_FUTURE_DUE });
    expect(plannedRow.status).toBe("planned");
    expect(plannedRow.created_by).toBe(admin.userId);
  });

  it("paid로 바꾸면서 입금일이 없으면 400, 상태는 planned 그대로", async () => {
    const res = await patchRow(admin, plannedRow, { status: "paid" });
    expect(res.status, describeResult(res)).toBe(400);
    const current = await readRowAsAdmin(admin, project.id, plannedRow.id);
    expect(current?.status).toBe("planned");
  });

  // ---------------------------------------------------------------- 허용 컬럼 (R4) · 옛 DB 점검 (R32)

  it("허용 외 칸(created_by·id·created_at)은 무시하고 나머지만 저장한다 — 스위치 끈 상태 수정 정상", async () => {
    const memo = `allowlist ${runId}`;
    const res = await patchRow(admin, plannedRow, {
      memo,
      created_by: randomUUID(),
      id: Number(plannedRow.id) + 1_000_000_000,
      created_at: "2000-01-01T00:00:00Z",
    });
    expect(res.status, describeResult(res)).toBe(200);
    expect(Number(res.body.id)).toBe(Number(plannedRow.id));
    expect(res.body.created_by).toBe(admin.userId);
    expect(res.body.memo).toBe(memo);
    expect(String(res.body.created_at).startsWith("2000-01-01")).toBe(false);
    plannedRow = res.body;
  });

  it("프로젝트 PATCH도 허용 외 칸(created_by·id)을 무시한다", async () => {
    assertE2EProject(project);
    const description = `API 권한 회귀 테스트 전용. 금액 0 행만 둔다. 삭제하지 않는다. (${runId})`;
    const res = await api<E2EProject>("PATCH", `/api/projects/${project.id}`, {
      session: admin,
      body: { description, created_by: randomUUID(), id: Number(project.id) + 1_000_000_000 },
    });
    expect(res.status, describeResult(res)).toBe(200);
    expect(Number(res.body.id)).toBe(Number(project.id));
    expect(res.body.created_by).toBe(project.created_by);
    expect(res.body.description).toBe(description);
  });

  // ---------------------------------------------------------------- 다른 사업부 리더·비참여 멤버 (R10·R11·15절)

  it("FLOW 리더가 HEAD 행을 수정하면 403, 값은 그대로", async () => {
    const res = await patchRow(leader, plannedRow, { memo: `leader-should-not-write ${runId}` });
    expect(res.status, describeResult(res)).toBe(403);
    const current = await readRowAsAdmin(admin, project.id, plannedRow.id);
    expect(current?.memo).toBe(plannedRow.memo);
  });

  it("FLOW 리더가 HEAD planned 행을 삭제하면 403, 행은 남는다", async () => {
    assertE2ERow(plannedRow, project.id);
    const res = await api("DELETE", `/api/financial-entries/${plannedRow.id}`, { session: leader });
    expect(res.status, describeResult(res)).toBe(403);
    expect(await readRowAsAdmin(admin, project.id, plannedRow.id)).not.toBeNull();
  });

  it("비참여 멤버가 볼 수 없는 행을 id로 수정하면 404", async () => {
    const res = await patchRow(member, plannedRow, { memo: `member-should-not-write ${runId}` });
    expect(res.status, describeResult(res)).toBe(404);
  });

  // ---------------------------------------------------------------- paid 삭제 409 · 되돌리기 (R11·R12)

  it("관리자가 paid 행(금액 0, 입금일 오늘)을 등록한다", async () => {
    paidRow = await createRow(admin, "paid", { status: "paid", paid_at: kstToday() });
    expect(paidRow.status).toBe("paid");
    expect(paidRow.paid_at).toBeTruthy();
  });

  it("paid 행 삭제는 관리자도 409, 행은 남는다", async () => {
    assertE2ERow(paidRow, project.id);
    const res = await api<{ error: string }>("DELETE", `/api/financial-entries/${paidRow.id}`, { session: admin });
    expect(res.status, describeResult(res)).toBe(409);
    expect(typeof res.body?.error).toBe("string");
    expect((await readRowAsAdmin(admin, project.id, paidRow.id))?.status).toBe("paid");
  });

  it("리더의 paid → planned 되돌리기는 403", async () => {
    const res = await patchRow(leader, paidRow, { status: "planned", due_date: FAR_FUTURE_DUE });
    expect(res.status, describeResult(res)).toBe(403);
    expect((await readRowAsAdmin(admin, project.id, paidRow.id))?.status).toBe("paid");
  });

  it("관리자의 paid → planned 되돌리기는 허용되고, 다시 paid로 복구한다", async () => {
    const back = await patchRow(admin, paidRow, { status: "planned", due_date: FAR_FUTURE_DUE });
    expect(back.status, describeResult(back)).toBe(200);
    expect(back.body.status).toBe("planned");

    const restore = await patchRow(admin, back.body, { status: "paid", paid_at: kstToday() });
    expect(restore.status, describeResult(restore)).toBe(200);
    expect(restore.body.status).toBe("paid");
    paidRow = restore.body;
  });

  // ---------------------------------------------------------------- 멤버 본인 행 (R11·R12)

  it("관리자가 멤버를 [E2E] 프로젝트 참여자로 넣는다", async () => {
    assertE2EProject(project);
    const res = await api<E2EProject>("PATCH", `/api/projects/${project.id}`, {
      session: admin,
      body: { participants: [{ user_id: member.userId, role: "e2e", is_pm: false }] },
    });
    expect(res.status, describeResult(res)).toBe(200);
  });

  it("멤버의 본인 paid 행 paid → planned 되돌리기는 403", async () => {
    memberPaidRow = await createRow(member, "member-paid", { status: "paid", paid_at: kstToday() });
    expect(memberPaidRow.created_by).toBe(member.userId);
    const res = await patchRow(member, memberPaidRow, { status: "planned", due_date: FAR_FUTURE_DUE });
    expect(res.status, describeResult(res)).toBe(403);
    expect((await readRowAsAdmin(admin, project.id, memberPaidRow.id))?.status).toBe("paid");
  });

  it("멤버의 본인 행 canceled → planned 되살리기는 403", async () => {
    const created = await createRow(member, "member-canceled", { status: "planned", due_date: FAR_FUTURE_DUE });
    const cancel = await patchRow(member, created, { status: "canceled" });
    expect(cancel.status, describeResult(cancel)).toBe(200);
    memberCanceledRow = cancel.body;
    expect(memberCanceledRow.status).toBe("canceled");

    const revive = await patchRow(member, memberCanceledRow, { status: "planned", due_date: FAR_FUTURE_DUE });
    expect(revive.status, describeResult(revive)).toBe(403);
    expect((await readRowAsAdmin(admin, project.id, memberCanceledRow.id))?.status).toBe("canceled");
  });

  it("canceled 행 삭제는 409, 행은 남는다", async () => {
    assertE2ERow(memberCanceledRow, project.id);
    const res = await api("DELETE", `/api/financial-entries/${memberCanceledRow.id}`, { session: admin });
    expect(res.status, describeResult(res)).toBe(409);
    expect((await readRowAsAdmin(admin, project.id, memberCanceledRow.id))?.status).toBe("canceled");
  });

  // ---------------------------------------------------------------- 프로젝트 삭제 409 (R15)

  it("FLOW 리더가 HEAD 프로젝트를 삭제하면 403 (재무 행이 붙은 뒤에 요청해 오동작해도 연쇄 삭제가 없게 한다)", async () => {
    assertE2EProject(project);
    expect((await listE2ERows(admin, project.id)).length).toBeGreaterThan(0);
    const res = await api("DELETE", `/api/projects/${project.id}`, { session: leader });
    expect(res.status, describeResult(res)).toBe(403);
    expect(await readProjectAsAdmin(admin, project.id)).not.toBeNull();
  });

  it("재무 행이 있는 프로젝트 삭제는 409와 보류 안내, 프로젝트·행은 남는다", async () => {
    assertE2EProject(project);
    // 전제: 재무 행이 실제로 붙어 있어야 한다(없으면 삭제가 성공해 버리므로 요청하지 않는다)
    const rowsBefore = await listE2ERows(admin, project.id);
    expect(rowsBefore.length).toBeGreaterThan(0);

    const res = await api<{ error: string }>("DELETE", `/api/projects/${project.id}`, { session: admin });
    expect(res.status, describeResult(res)).toBe(409);
    expect(res.body?.error).toContain("보류");

    expect(await readProjectAsAdmin(admin, project.id)).not.toBeNull();
    const rowsAfter = await listE2ERows(admin, project.id);
    expect(rowsAfter.length).toBe(rowsBefore.length);
  });

  // ---------------------------------------------------------------- 변경 기록 (R32)
  // 배포의 ERP_AUDIT_V2 값에 맞춰 ERP_TEST_AUDIT_V2=1(켜짐) 또는 비움(꺼짐)으로 실행한다.

  const auditOn = process.env.ERP_TEST_AUDIT_V2 === "1";

  it.skipIf(auditOn)("스위치 끔: 매출·지출 변경 기록 API는 {changes:[], enabled:false}", async () => {
    const res = await api("GET", `/api/financial-entries/${paidRow.id}/changes`, { session: admin });
    expect(res.status, describeResult(res)).toBe(200);
    expect(res.body).toEqual({ changes: [], enabled: false });
  });

  it.skipIf(auditOn)("스위치 끔: 직원 변경 기록 API는 {changes:[], enabled:false}", async () => {
    const res = await api("GET", `/api/users/${member.userId}/changes`, { session: admin });
    expect(res.status, describeResult(res)).toBe(200);
    expect(res.body).toEqual({ changes: [], enabled: false });
  });

  it.skipIf(!auditOn)("스위치 켬: paid 행의 되돌리기·복구가 ERP 변경 기록으로 남는다", async () => {
    const res = await api<{ changes: Array<Record<string, unknown>>; enabled: boolean }>(
      "GET", `/api/financial-entries/${paidRow.id}/changes`, { session: admin });
    expect(res.status, describeResult(res)).toBe(200);
    expect(res.body.enabled).toBe(true);
    const statusChanges = res.body.changes.filter((c) => c.field === "status");
    expect(statusChanges.length, describeResult(res)).toBeGreaterThanOrEqual(2);
    expect(statusChanges.every((c) => c.source === "erp"), describeResult(res)).toBe(true);
  });

  it.skipIf(!auditOn)("스위치 켬: 리더는 다른 사업부 행의 변경 기록을 못 본다(403)", async () => {
    const res = await api("GET", `/api/financial-entries/${paidRow.id}/changes`, { session: leader });
    expect(res.status, describeResult(res)).toBe(403);
  });

  it.skipIf(!auditOn)("스위치 켬: 직원 변경 기록 API는 enabled:true와 배열을 돌려준다", async () => {
    const res = await api<{ changes: unknown[]; enabled: boolean }>("GET", `/api/users/${member.userId}/changes`, { session: admin });
    expect(res.status, describeResult(res)).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(Array.isArray(res.body.changes)).toBe(true);
  });
});
