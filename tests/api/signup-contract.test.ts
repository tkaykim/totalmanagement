/**
 * 가입·승인 계약 (spec R20·R21).
 *
 * - 가입 400 경우만 새 입력으로 부른다. 400은 DB에 닿기 전에 반환되므로 계정이 만들어지지 않는다.
 * - 409는 이미 있는 테스트 계정(승인 대기·퇴사) 이메일로 확인한다. 기존 이메일 확인이 계정 생성보다 먼저라 새 계정이 생기지 않는다.
 * - 새 가입 계정은 만들지 않는다.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { BASE_VAR, accountCredentials, requiredVarsFor, shouldSkip } from "./_support/env";
import { api, describeResult, signIn, type Session } from "./_support/http";

/** 400 확인용 가짜 주소. 400 경로에서는 저장되지 않는다. */
const CONTRACT_EMAIL = "e2e-signup-contract@example.invalid";
const VALID_PASSWORD = "e2e-contract-pass-000";

describe.skipIf(shouldSkip("가입 400 계약", [BASE_VAR]))("POST /api/auth/signup — 400 계약", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["이름 누락", { email: CONTRACT_EMAIL, password: VALID_PASSWORD, requested_bu_code: "HEAD" }],
    ["이메일 누락", { name: "e2e 계약", password: VALID_PASSWORD, requested_bu_code: "HEAD" }],
    ["비밀번호 누락", { name: "e2e 계약", email: CONTRACT_EMAIL, requested_bu_code: "HEAD" }],
    ["비밀번호 8자 미만", { name: "e2e 계약", email: CONTRACT_EMAIL, password: "short7!", requested_bu_code: "HEAD" }],
    ["사업부 없음", { name: "e2e 계약", email: CONTRACT_EMAIL, password: VALID_PASSWORD }],
    ["7개 밖 사업부", { name: "e2e 계약", email: CONTRACT_EMAIL, password: VALID_PASSWORD, requested_bu_code: "NOPE" }],
  ];

  for (const [label, body] of cases) {
    it(label, async () => {
      const res = await api<{ error: string }>("POST", "/api/auth/signup", { body });
      expect(res.status, describeResult(res)).toBe(400);
      expect(typeof res.body?.error).toBe("string");
    });
  }

  it("본문이 JSON이 아니면 400", async () => {
    const res = await api<{ error: string }>("POST", "/api/auth/signup", {
      body: undefined,
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status, describeResult(res)).toBe(400);
  });
});

for (const key of ["PENDING", "RETIRED"] as const) {
  const vars = [BASE_VAR, ...requiredVarsFor([key]).filter((v) => v.startsWith(`ERP_TEST_${key}_`))];
  describe.skipIf(shouldSkip(`가입 409 (${key})`, vars))(`POST /api/auth/signup — 이미 있는 이메일(${key}) → 409`, () => {
    it("409 {error}와 상태별 안내", async () => {
      const { email } = accountCredentials(key);
      const res = await api<{ error: string }>("POST", "/api/auth/signup", {
        body: { name: "e2e 중복 확인", email, password: VALID_PASSWORD, requested_bu_code: "HEAD" },
      });
      expect(res.status, describeResult(res)).toBe(409);
      expect(res.body?.error).toContain(key === "PENDING" ? "이미 신청된" : "이미 가입된");
    });
  });
}

describe.skipIf(shouldSkip("가입 신청 목록 비로그인", [BASE_VAR]))("GET /api/users/signup-requests — 비로그인", () => {
  it("401", async () => {
    const res = await api("GET", "/api/users/signup-requests");
    expect(res.status, describeResult(res)).toBe(401);
  });
  it("승인 POST도 401", async () => {
    const res = await api("POST", "/api/users/signup-requests/00000000-0000-0000-0000-000000000000/approve", {
      body: { bu_code: "HEAD", role: "member" },
    });
    expect(res.status, describeResult(res)).toBe(401);
  });
});

describe.skipIf(shouldSkip("가입 신청 목록 비본사관리자", requiredVarsFor(["LEADER", "MEMBER"])))(
  "GET /api/users/signup-requests — 본사 관리자 아님 → 403",
  () => {
    let leader: Session;
    let member: Session;
    beforeAll(async () => {
      leader = await signIn("LEADER");
      member = await signIn("MEMBER");
    });

    it("FLOW 리더 403", async () => {
      const res = await api<{ error: string }>("GET", "/api/users/signup-requests", { session: leader });
      expect(res.status, describeResult(res)).toBe(403);
      expect(typeof res.body?.error).toBe("string");
    });
    it("REACT 멤버 403", async () => {
      const res = await api<{ error: string }>("GET", "/api/users/signup-requests", { session: member });
      expect(res.status, describeResult(res)).toBe(403);
    });
    it("리더의 승인 POST 403 (없는 id라도 권한 먼저)", async () => {
      const res = await api("POST", "/api/users/signup-requests/00000000-0000-0000-0000-000000000000/approve", {
        session: leader,
        body: { bu_code: "FLOW", role: "member" },
      });
      expect(res.status, describeResult(res)).toBe(403);
    });
  }
);
