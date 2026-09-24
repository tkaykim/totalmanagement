/**
 * 테스트 데이터 규칙 (spec V1, 강제 규칙).
 *
 * - 재무 테스트 행은 금액 0이고, HEAD 사업부의 "[E2E]" 전용 프로젝트에만 붙인다.
 * - 프로젝트가 없으면 관리자 계정으로 API를 통해 만들고, 있으면 다시 쓴다.
 * - `paid`·`canceled` 행은 지우지 않는다. 프로젝트도 지우지 않는다.
 * - 끝나면 "[E2E]" 프로젝트 상태를 '보류'로 바꾼다.
 * - "[E2E]"가 아닌 데이터는 읽기만 한다.
 *
 * 아래 assert 함수는 쓰기 호출 직전에 대상이 규칙 안에 있는지 확인한다. 벗어나면 테스트를 멈춘다.
 */

import { expect } from "vitest";
import { api, describeResult, type Session } from "./http";

export const E2E_PREFIX = "[E2E]";
export const E2E_PROJECT_NAME = "[E2E] 권한 회귀 테스트";
export const E2E_BU = "HEAD";
/** 기한 초과·마감 임박 경보에 걸리지 않도록 먼 미래 기한을 쓴다 */
export const FAR_FUTURE_DUE = "2099-12-31";

export type E2EProject = {
  id: number;
  name: string;
  bu_code: string;
  status: string;
  created_by: string | null;
  pm_id: string | null;
  participants: Array<Record<string, unknown>>;
  description?: string | null;
};

export function isE2EProject(project: Partial<E2EProject> | null | undefined): boolean {
  return !!project && typeof project.name === "string" && project.name.startsWith(E2E_PREFIX) && project.bu_code === E2E_BU;
}

/** 쓰기 전에 "[E2E]" HEAD 프로젝트인지 확인한다 */
export function assertE2EProject(project: Partial<E2EProject> | null | undefined): asserts project is E2EProject {
  if (!isE2EProject(project)) {
    throw new Error(`[test:api] 안전장치: "[E2E]" HEAD 프로젝트가 아닌 대상에 쓰려고 했습니다 (${JSON.stringify(project)?.slice(0, 200)})`);
  }
}

/** 쓰기 전에 "[E2E]" 프로젝트의 금액 0 행인지 확인한다 */
export function assertE2ERow(row: any, projectId: number): void {
  if (!row || Number(row.project_id) !== Number(projectId) || Number(row.amount) !== 0) {
    throw new Error(`[test:api] 안전장치: "[E2E]" 프로젝트의 금액 0 행이 아닙니다 (${JSON.stringify(row)?.slice(0, 200)})`);
  }
}

/** 관리자 목록에서 "[E2E]" 프로젝트를 찾는다(정확한 이름 우선) */
export async function findE2EProject(admin: Session): Promise<E2EProject | null> {
  const res = await api<E2EProject[]>("GET", `/api/projects?bu=${E2E_BU}`, { session: admin });
  expect(res.status, describeResult(res)).toBe(200);
  const list = Array.isArray(res.body) ? res.body : [];
  const candidates = list.filter((p) => isE2EProject(p));
  return candidates.find((p) => p.name === E2E_PROJECT_NAME) ?? candidates[0] ?? null;
}

/** 관리자 목록에서 id로 프로젝트를 다시 읽는다 */
export async function readProjectAsAdmin(admin: Session, id: number): Promise<E2EProject | null> {
  const res = await api<E2EProject[]>("GET", `/api/projects?bu=${E2E_BU}`, { session: admin });
  expect(res.status, describeResult(res)).toBe(200);
  return (res.body ?? []).find((p) => Number(p.id) === Number(id)) ?? null;
}

/**
 * "[E2E]" 프로젝트를 준비한다.
 * - 없으면 관리자로 만든다(HEAD, '준비중').
 * - 있으면 다시 쓰고, 참여자를 비운다(이전 실행이 중간에 멈춰 남은 참여자 정리).
 */
export async function ensureE2EProject(admin: Session): Promise<E2EProject> {
  let project = await findE2EProject(admin);
  if (!project) {
    const created = await api<E2EProject>("POST", "/api/projects", {
      session: admin,
      body: {
        bu_code: E2E_BU,
        name: E2E_PROJECT_NAME,
        category: "",
        status: "준비중",
        description: "API 권한 회귀 테스트 전용. 금액 0 행만 둔다. 삭제하지 않는다.",
        participants: [],
      },
    });
    expect(created.status, describeResult(created)).toBe(200);
    project = created.body;
  }
  assertE2EProject(project);

  if (Array.isArray(project.participants) && project.participants.length > 0) {
    const reset = await api<E2EProject>("PATCH", `/api/projects/${project.id}`, {
      session: admin,
      body: { participants: [] },
    });
    expect(reset.status, describeResult(reset)).toBe(200);
    project = reset.body;
    assertE2EProject(project);
  }
  return project;
}

/** 금액 0 테스트 지출 행 본문 */
export function e2eExpenseBody(projectId: number, label: string, extra: Record<string, unknown> = {}) {
  return {
    project_id: projectId,
    bu_code: E2E_BU,
    kind: "expense",
    category: "",
    name: `${E2E_PREFIX} ${label}`,
    amount: 0,
    occurred_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10),
    memo: "API 권한 회귀 테스트 행 (금액 0, 삭제 금지)",
    ...extra,
  };
}

/** 관리자 권한으로 "[E2E]" 프로젝트의 재무 행 목록을 읽는다 */
export async function listE2ERows(admin: Session, projectId: number): Promise<any[]> {
  const res = await api<any[]>("GET", `/api/financial-entries?project_id=${projectId}`, { session: admin });
  expect(res.status, describeResult(res)).toBe(200);
  return Array.isArray(res.body) ? res.body : [];
}

export async function readRowAsAdmin(admin: Session, projectId: number, rowId: number): Promise<any | null> {
  const rows = await listE2ERows(admin, projectId);
  return rows.find((r) => Number(r.id) === Number(rowId)) ?? null;
}
