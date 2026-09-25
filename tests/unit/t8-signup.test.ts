import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeFakeAdmin, readJson, type QueryResult, type QueryState } from "./t8-fake-supabase";

// 가입 라우트 계약 (spec R20). 가짜 서비스 권한 클라이언트만 쓴다.
let resolver: (q: QueryState) => QueryResult;
let fake = makeFakeAdmin((q) => resolver(q));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => {
    throw new Error("가입 라우트는 세션 클라이언트를 쓰지 않는다");
  }),
  createPureClient: vi.fn(async () => fake.client),
}));

import { POST } from "@/app/api/auth/signup/route";

const NEW_ID = "22222222-2222-2222-2222-222222222222";

function req(body: unknown) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as any;
}

const VALID = {
  name: "테스트",
  email: "E2E-Signup@Example.test",
  password: "longenough1",
  requested_bu_code: "DEETZ",
  signup_message: "  안녕하세요  ",
};

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    fake = makeFakeAdmin((q) => resolver(q));
    resolver = (q) => {
      if (q.table === "app_users" && q.op === "select") return { data: [], error: null };
      return { data: null, error: null };
    };
    fake.auth.admin.createUser.mockResolvedValue({ data: { user: { id: NEW_ID } }, error: null });
  });

  for (const missing of ["name", "email", "password"] as const) {
    it(`${missing} 누락 → 400 {error}, 계정 생성 안 함`, async () => {
      const { status, body } = await readJson(await POST(req({ ...VALID, [missing]: "" })));
      expect(status).toBe(400);
      expect(typeof body.error).toBe("string");
      expect(fake.auth.admin.createUser).not.toHaveBeenCalled();
    });
  }

  it("비밀번호 8자 미만 → 400", async () => {
    const { status, body } = await readJson(await POST(req({ ...VALID, password: "1234567" })));
    expect(status).toBe(400);
    expect(typeof body.error).toBe("string");
    expect(fake.auth.admin.createUser).not.toHaveBeenCalled();
  });

  for (const bu of ["", "XYZ", "deetz", null]) {
    it(`사업부 ${JSON.stringify(bu)} → 400`, async () => {
      const { status } = await readJson(await POST(req({ ...VALID, requested_bu_code: bu })));
      expect(status).toBe(400);
      expect(fake.auth.admin.createUser).not.toHaveBeenCalled();
    });
  }

  it("본문이 JSON이 아님 → 400", async () => {
    const { status } = await readJson(await POST(req("not json")));
    expect(status).toBe(400);
  });

  it("대기 중인 이메일 → 409 '이미 신청된 이메일'", async () => {
    resolver = (q) =>
      q.op === "select" ? { data: [{ id: "x", status: "pending" }], error: null } : { data: null, error: null };
    const { status, body } = await readJson(await POST(req(VALID)));
    expect(status).toBe(409);
    expect(body.error).toContain("이미 신청된 이메일");
    expect(fake.auth.admin.createUser).not.toHaveBeenCalled();
  });

  for (const existing of ["active", "rejected", "retired"]) {
    it(`이미 있는 이메일(${existing}) → 409 '이미 가입된 이메일'`, async () => {
      resolver = (q) =>
        q.op === "select" ? { data: [{ id: "x", status: existing }], error: null } : { data: null, error: null };
      const { status, body } = await readJson(await POST(req(VALID)));
      expect(status).toBe(409);
      expect(body.error).toContain("이미 가입된 이메일");
      expect(fake.auth.admin.createUser).not.toHaveBeenCalled();
    });
  }

  it("app_users에는 없지만 인증 계정이 이미 있음 → 409 '이미 가입된 이메일'", async () => {
    fake.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: "A user with this email address has already been registered", status: 422, code: "email_exists" },
    });
    const { status, body } = await readJson(await POST(req(VALID)));
    expect(status).toBe(409);
    expect(body.error).toContain("이미 가입된 이메일");
    expect(fake.queries.some((q) => q.op === "insert")).toBe(false);
  });

  it("성공 → 200 {ok:true}, 이메일 확인 완료 계정 + pending 행", async () => {
    const { status, body } = await readJson(await POST(req(VALID)));
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });

    expect(fake.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "e2e-signup@example.test", password: VALID.password, email_confirm: true })
    );

    const insert = fake.queries.find((q) => q.table === "app_users" && q.op === "insert");
    expect(insert).toBeDefined();
    const row = insert!.payload as Record<string, unknown>;
    expect(row).toMatchObject({
      id: NEW_ID,
      name: "테스트",
      email: "e2e-signup@example.test",
      status: "pending",
      role: "member",
      bu_code: null,
      requested_bu_code: "DEETZ",
      signup_message: "안녕하세요",
    });
    expect(typeof row.signup_requested_at).toBe("string");
    expect(fake.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("signup_message 생략 → null", async () => {
    const { status } = await readJson(await POST(req({ ...VALID, signup_message: undefined })));
    expect(status).toBe(200);
    const insert = fake.queries.find((q) => q.op === "insert");
    expect((insert!.payload as any).signup_message).toBeNull();
  });

  it("app_users 삽입 실패 → 인증 계정 삭제(되돌림) + 500 {error}", async () => {
    resolver = (q) => {
      if (q.op === "select") return { data: [], error: null };
      if (q.op === "insert") return { data: null, error: { message: "insert failed" } };
      return { data: null, error: null };
    };
    const { status, body } = await readJson(await POST(req(VALID)));
    expect(status).toBe(500);
    expect(typeof body.error).toBe("string");
    expect(fake.auth.admin.deleteUser).toHaveBeenCalledWith(NEW_ID);
  });

  it("인증 계정 생성 실패 → 500, 삽입 안 함", async () => {
    fake.auth.admin.createUser.mockResolvedValue({ data: { user: null }, error: { message: "boom", status: 500 } });
    const { status } = await readJson(await POST(req(VALID)));
    expect(status).toBe(500);
    expect(fake.queries.some((q) => q.op === "insert")).toBe(false);
  });
});
