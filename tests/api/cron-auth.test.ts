/**
 * 크론 인증 (spec R24): `Authorization: Bearer <CRON_SECRET>`가 없거나 틀리면 401.
 * 올바른 비밀값으로는 부르지 않는다(실제 알림이 나가기 때문).
 */

import { describe, expect, it } from "vitest";
import { BASE_VAR, shouldSkip } from "./_support/env";
import { api, describeResult } from "./_support/http";

describe.skipIf(shouldSkip("크론 401", [BASE_VAR]))("GET /api/notifications/overdue — 크론 인증", () => {
  it("Bearer 없음 → 401", async () => {
    const res = await api("GET", "/api/notifications/overdue");
    expect(res.status, describeResult(res)).toBe(401);
  });

  it("틀린 Bearer → 401", async () => {
    const res = await api("GET", "/api/notifications/overdue", {
      headers: { Authorization: "Bearer e2e-wrong-secret" },
    });
    expect(res.status, describeResult(res)).toBe(401);
  });

  it("옛 ?key= 방식 → 401", async () => {
    const res = await api("GET", "/api/notifications/overdue?key=e2e-wrong-secret");
    expect(res.status, describeResult(res)).toBe(401);
  });
});
