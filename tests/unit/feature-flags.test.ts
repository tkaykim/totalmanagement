import { afterEach, describe, expect, it } from "vitest";
import { isAuditV2Enabled } from "@/lib/feature-flags";

describe("isAuditV2Enabled (R32)", () => {
  const original = process.env.ERP_AUDIT_V2;
  afterEach(() => {
    if (original === undefined) delete process.env.ERP_AUDIT_V2;
    else process.env.ERP_AUDIT_V2 = original;
  });

  it("기본값(미설정)은 꺼짐", () => {
    delete process.env.ERP_AUDIT_V2;
    expect(isAuditV2Enabled()).toBe(false);
  });

  it("정확히 '1'일 때만 켜짐", () => {
    process.env.ERP_AUDIT_V2 = "1";
    expect(isAuditV2Enabled()).toBe(true);
    for (const v of ["", "0", "true", "yes", " 1", "1 ", "on", "TRUE"]) {
      process.env.ERP_AUDIT_V2 = v;
      expect(isAuditV2Enabled()).toBe(false);
    }
  });

  it("환경 객체를 넘겨 판정할 수 있다", () => {
    expect(isAuditV2Enabled({ ERP_AUDIT_V2: "1" })).toBe(true);
    expect(isAuditV2Enabled({})).toBe(false);
  });
});
