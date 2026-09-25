import { describe, expect, it } from "vitest";
import {
  formatChangeValue,
  formatChangedAtKst,
  formatInsertSummary,
  getChangeFieldLabel,
  getChangeSourceLabel,
  sortNewestFirst,
} from "@/features/erp/change-log";

describe("change-log 표시 도우미", () => {
  it("칸 이름을 한국어 라벨로", () => {
    expect(getChangeFieldLabel("financial-entry", "amount")).toBe("금액");
    expect(getChangeFieldLabel("financial-entry", "actual_amount")).toBe("실지급액");
    expect(getChangeFieldLabel("financial-entry", "status")).toBe("상태");
    expect(getChangeFieldLabel("financial-entry", "bu_code")).toBe("사업부");
    expect(getChangeFieldLabel("user", "role")).toBe("역할");
    expect(getChangeFieldLabel("user", "status")).toBe("재직 상태");
    expect(getChangeFieldLabel("user", "bu_code")).toBe("사업부");
  });

  it("출처 라벨", () => {
    expect(getChangeSourceLabel("erp")).toBe("ERP");
    expect(getChangeSourceLabel("external")).toBe("외부 시스템");
  });

  it("KST 시각", () => {
    expect(formatChangedAtKst("2026-09-24T15:30:00Z")).toContain("00:30");
    expect(formatChangedAtKst("2026-09-24T15:30:00Z")).toContain("25");
  });

  it("값 표시", () => {
    expect(formatChangeValue("financial-entry", "amount", "1500000")).toBe("1,500,000원");
    expect(formatChangeValue("financial-entry", "status", "canceled")).toBe("취소");
    expect(formatChangeValue("user", "status", "retired")).toBe("퇴사");
    expect(formatChangeValue("user", "role", "leader")).toBe("리더");
    expect(formatChangeValue("financial-entry", "actual_amount", null)).toBe("-");
  });

  it("신규 등록 요약", () => {
    const s = formatInsertSummary("kind=revenue status=planned bu_code=REACT amount=1000 actual_amount=null");
    expect(s).toContain("매출");
    expect(s).toContain("금액 1,000원");
    expect(s).toContain("실지급액 -");
  });

  it("최신순 정렬", () => {
    const rows = [
      { id: 1, changed_at: "2026-09-01T00:00:00Z" },
      { id: 3, changed_at: "2026-09-02T00:00:00Z" },
      { id: 2, changed_at: "2026-09-02T00:00:00Z" },
    ];
    expect(sortNewestFirst(rows).map((r) => r.id)).toEqual([3, 2, 1]);
  });
});
