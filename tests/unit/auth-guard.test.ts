import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

// 가짜 Supabase 클라이언트. 운영 DB·네트워크에 닿지 않는다.
const getUser = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
  createPureClient: vi.fn(async () => ({ from })),
}));

import { isGuardFailure, requireActiveStaff } from "@/lib/auth-guard";

const AUTH_USER = { id: "11111111-1111-1111-1111-111111111111", email: "e2e@example.test" };

function appUserRow(overrides: Record<string, unknown> = {}) {
  return { id: AUTH_USER.id, role: "member", bu_code: "REACT", status: "active", name: "테스트", ...overrides };
}

async function expectStatus(result: unknown, status: number) {
  expect(result).toBeInstanceOf(NextResponse);
  const res = result as NextResponse;
  expect(res.status).toBe(status);
  const body = await res.json();
  expect(typeof body.error).toBe("string");
}

describe("requireActiveStaff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: AUTH_USER }, error: null });
    maybeSingle.mockResolvedValue({ data: appUserRow(), error: null });
  });

  it("세션 없음 → 401, app_users 조회 안 함", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expectStatus(await requireActiveStaff(), 401);
    expect(from).not.toHaveBeenCalled();
  });

  it("세션 오류 → 401", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "jwt expired" } });
    await expectStatus(await requireActiveStaff(), 401);
  });

  it("app_users 행 없음 → 401", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expectStatus(await requireActiveStaff(), 401);
    expect(from).toHaveBeenCalledWith("app_users");
    expect(eq).toHaveBeenCalledWith("id", AUTH_USER.id);
  });

  it("app_users 조회 실패 → 500", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expectStatus(await requireActiveStaff(), 500);
  });

  for (const status of ["retired", "pending", "rejected", "dormant", null]) {
    it(`status=${status} → 403`, async () => {
      maybeSingle.mockResolvedValue({ data: appUserRow({ status }), error: null });
      await expectStatus(await requireActiveStaff(), 403);
    });
  }

  it("사업부 없는 active → 403", async () => {
    maybeSingle.mockResolvedValue({ data: appUserRow({ bu_code: null }), error: null });
    await expectStatus(await requireActiveStaff(), 403);
  });

  it("외부인 역할(artist) active → 403", async () => {
    maybeSingle.mockResolvedValue({ data: appUserRow({ role: "artist" }), error: null });
    await expectStatus(await requireActiveStaff(), 403);
  });

  it("재직 직원 → 통과, user·appUser 반환", async () => {
    const result = await requireActiveStaff();
    expect(isGuardFailure(result)).toBe(false);
    if (isGuardFailure(result)) throw new Error("unreachable");
    expect(result.user.id).toBe(AUTH_USER.id);
    expect(result.appUser).toMatchObject({ id: AUTH_USER.id, role: "member", bu_code: "REACT", status: "active" });
    const cols = (select.mock.calls[0] as unknown[])[0] as string;
    for (const c of ["id", "role", "bu_code", "status"]) expect(cols).toContain(c);
  });

  describe("ownStatusOnly (승인 대기·거절 안내 화면용)", () => {
    it("pending·rejected·retired도 본인 행을 돌려준다", async () => {
      for (const status of ["pending", "rejected", "retired"]) {
        maybeSingle.mockResolvedValue({ data: appUserRow({ status, bu_code: null }), error: null });
        const result = await requireActiveStaff({ ownStatusOnly: true });
        expect(isGuardFailure(result)).toBe(false);
        if (!isGuardFailure(result)) expect(result.appUser.status).toBe(status);
      }
    });
    it("세션 없음·행 없음은 여전히 401", async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: null });
      await expectStatus(await requireActiveStaff({ ownStatusOnly: true }), 401);
      getUser.mockResolvedValue({ data: { user: AUTH_USER }, error: null });
      maybeSingle.mockResolvedValue({ data: null, error: null });
      await expectStatus(await requireActiveStaff({ ownStatusOnly: true }), 401);
    });
  });
});
