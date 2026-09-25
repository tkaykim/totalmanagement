/**
 * 차단 규칙 (spec R1·15절): 비로그인 401, 승인 대기·퇴사 403.
 * 읽기 경로와, 존재하지 않는 id(0)에 대한 쓰기 경로만 부른다. 데이터를 바꾸지 않는다.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { BASE_VAR, requiredVarsFor, shouldSkip } from "./_support/env";
import { api, describeResult, signIn, type Session } from "./_support/http";

/** 대표 읽기 경로 */
const READ_ROUTES = [
  "/api/projects",
  "/api/financial-entries",
  "/api/tasks",
  "/api/users",
  "/api/attendance/status",
  "/api/leave/requests",
];

/** 대표 쓰기 경로(존재하지 않는 id). 가드가 비즈니스 로직보다 먼저 막아야 한다. */
const WRITE_ROUTES: Array<[string, string, unknown]> = [
  ["PATCH", "/api/projects/0", { name: "should-not-write" }],
  ["DELETE", "/api/projects/0", undefined],
  ["PATCH", "/api/financial-entries/0", { memo: "should-not-write" }],
  ["DELETE", "/api/financial-entries/0", undefined],
  ["PATCH", "/api/tasks/0", { title: "should-not-write" }],
];

describe.skipIf(shouldSkip("비로그인 401", [BASE_VAR]))("비로그인 → 401", () => {
  for (const path of READ_ROUTES) {
    it(`GET ${path}`, async () => {
      const res = await api("GET", path);
      expect(res.status, describeResult(res)).toBe(401);
    });
  }
  for (const [method, path, body] of WRITE_ROUTES) {
    it(`${method} ${path}`, async () => {
      const res = await api(method, path, { body });
      expect(res.status, describeResult(res)).toBe(401);
    });
  }
  it("GET /api/users/me/status", async () => {
    const res = await api("GET", "/api/users/me/status");
    expect(res.status, describeResult(res)).toBe(401);
  });
});

for (const key of ["PENDING", "RETIRED"] as const) {
  const label = key === "PENDING" ? "승인 대기" : "퇴사";
  describe.skipIf(shouldSkip(`${label} 403`, requiredVarsFor([key])))(`${label} 계정 → 403`, () => {
    let session: Session;
    beforeAll(async () => {
      session = await signIn(key);
    });

    for (const path of READ_ROUTES) {
      it(`GET ${path}`, async () => {
        const res = await api("GET", path, { session });
        expect(res.status, describeResult(res)).toBe(403);
      });
    }
    for (const [method, path, body] of WRITE_ROUTES) {
      it(`${method} ${path}`, async () => {
        const res = await api(method, path, { session, body });
        expect(res.status, describeResult(res)).toBe(403);
      });
    }
    it("GET /api/users/signup-requests", async () => {
      const res = await api("GET", "/api/users/signup-requests", { session });
      expect(res.status, describeResult(res)).toBe(403);
    });
    it("본인 상태 조회(R1 예외)는 200과 본인 status만 준다", async () => {
      const res = await api<{ status: string | null }>("GET", "/api/users/me/status", { session });
      expect(res.status, describeResult(res)).toBe(200);
      expect(res.body?.status).toBe(key === "PENDING" ? "pending" : "retired");
    });
  });
}
