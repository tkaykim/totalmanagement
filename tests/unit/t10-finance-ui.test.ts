import { describe, expect, it } from "vitest";
import type { AppUser } from "@/lib/permissions";
import {
  apiErrorMessage,
  buildFinanceDateFields,
  defaultPaidAtDate,
  errorToMessage,
  ApiError,
  filterEntriesForTab,
  getAvailableTransitions,
  getFinanceEntryActions,
  isDueDateRequired,
  isPaidAtVisible,
  paidAtToKstDate,
  summarizePnl,
  summarizeProjectPnl,
  toFinanceEntryView,
  toPermUser,
  validateFinanceDateForm,
  type FinanceEntryView,
} from "@/features/erp/finance-ui";
import type { FinancialEntry as DbFinancialEntry } from "@/types/database";

const admin: AppUser = { id: "u-admin", role: "admin", bu_code: "HEAD", status: "active" };
const flowLeader: AppUser = { id: "u-flow-leader", role: "leader", bu_code: "FLOW", status: "active" };
const reactLeader: AppUser = { id: "u-react-leader", role: "leader", bu_code: "REACT", status: "active" };
const creator: AppUser = { id: "u-creator", role: "member", bu_code: "FLOW", status: "active" };
const otherMember: AppUser = { id: "u-other", role: "member", bu_code: "FLOW", status: "active" };
const retired: AppUser = { id: "u-creator", role: "member", bu_code: "FLOW", status: "retired" };

function entry(over: Partial<FinanceEntryView> = {}): FinanceEntryView {
  return {
    id: "1",
    projectId: "10",
    bu: "FLOW",
    entry_scope: "external",
    counterparty_bu: null,
    type: "revenue",
    category: "선금",
    name: "테스트",
    amount: 100,
    date: "2026-09-01",
    due_date: "2026-09-30",
    status: "planned",
    created_by: "u-creator",
    paid_at: null,
    ...over,
  };
}

function shown(user: AppUser | null, e: FinanceEntryView) {
  return getAvailableTransitions(getFinanceEntryActions(user, e)).map((t) => t.key);
}

describe("t10 버튼 표시 (R11·R12·R13)", () => {
  it("예정 행: 등록자는 완료·취소·삭제, 되돌리기·되살리기는 없음", () => {
    const a = getFinanceEntryActions(creator, entry());
    expect(a.canEdit).toBe(true);
    expect(a.canDelete).toBe(true);
    expect(shown(creator, entry())).toEqual(["complete", "cancel"]);
    expect(a.canMoveBu).toBe(false);
  });

  it("예정 행: 등록자가 아닌 멤버는 보기 전용(버튼 없음)", () => {
    const a = getFinanceEntryActions(otherMember, entry());
    expect(a.canEdit).toBe(false);
    expect(a.canDelete).toBe(false);
    expect(shown(otherMember, entry())).toEqual([]);
  });

  it("다른 사업부 리더는 보기만", () => {
    const a = getFinanceEntryActions(reactLeader, entry());
    expect(a.canEdit).toBe(false);
    expect(a.canDelete).toBe(false);
    expect(a.canMoveBu).toBe(false);
    expect(shown(reactLeader, entry())).toEqual([]);
  });

  it("행 사업부 리더: 수정·삭제·취소·사업부 이동, 되돌리기는 없음", () => {
    const a = getFinanceEntryActions(flowLeader, entry({ status: "paid", paid_at: "2026-09-10T00:00:00+09:00" }));
    expect(a.canEdit).toBe(true);
    expect(a.canDelete).toBe(false); // paid는 삭제 불가
    expect(a.canMoveBu).toBe(true);
    expect(shown(flowLeader, entry({ status: "paid" }))).toEqual(["cancel"]);
  });

  it("완료 행: 등록자는 취소 가능, 되돌리기 불가, 삭제 불가", () => {
    const e = entry({ status: "paid" });
    expect(shown(creator, e)).toEqual(["cancel"]);
    expect(getFinanceEntryActions(creator, e).canDelete).toBe(false);
  });

  it("완료 행: 관리자는 취소와 되돌리기", () => {
    expect(shown(admin, entry({ status: "paid" }))).toEqual(["cancel", "revert"]);
  });

  it("취소 행: 관리자만 되살리기(예정·완료), 삭제는 누구도 불가", () => {
    const e = entry({ status: "canceled" });
    expect(shown(admin, e)).toEqual(["restorePlanned", "restorePaid"]);
    expect(shown(creator, e)).toEqual([]);
    expect(shown(flowLeader, e)).toEqual([]);
    expect(getFinanceEntryActions(admin, e).canDelete).toBe(false);
    // 취소 행도 내용 수정은 수정 권한자가 할 수 있다
    expect(getFinanceEntryActions(creator, e).canEdit).toBe(true);
  });

  it("등록자 없는 옛 행은 관리자만 수정", () => {
    const e = entry({ created_by: null });
    expect(getFinanceEntryActions(flowLeader, e).canEdit).toBe(false);
    expect(getFinanceEntryActions(admin, e).canEdit).toBe(true);
  });

  it("비재직·사용자 없음은 모두 숨김", () => {
    expect(getFinanceEntryActions(retired, entry())).toMatchObject({ canEdit: false, canDelete: false });
    expect(getFinanceEntryActions(null, entry()).canEdit).toBe(false);
    expect(shown(null, entry())).toEqual([]);
  });

  it("변경 기록 보기: 관리자·행 사업부 리더·등록자", () => {
    expect(getFinanceEntryActions(admin, entry()).canViewChanges).toBe(true);
    expect(getFinanceEntryActions(flowLeader, entry()).canViewChanges).toBe(true);
    expect(getFinanceEntryActions(creator, entry()).canViewChanges).toBe(true);
    expect(getFinanceEntryActions(reactLeader, entry()).canViewChanges).toBe(false);
    expect(getFinanceEntryActions(otherMember, entry()).canViewChanges).toBe(false);
  });

  it("toPermUser: 프로필 → 판정용 사용자", () => {
    expect(toPermUser(null)).toBeNull();
    expect(toPermUser({ id: "x", role: "leader", bu_code: "DEETZ", status: "active" })).toMatchObject({
      id: "x",
      role: "leader",
      bu_code: "DEETZ",
      status: "active",
    });
    expect(toPermUser({ id: "x", role: "member", bu_code: "NOPE", status: "active" })?.bu_code).toBeNull();
  });
});

describe("t10 기한·입금일 (R14)", () => {
  it("입력칸 표시 규칙", () => {
    expect(isDueDateRequired("planned")).toBe(true);
    expect(isDueDateRequired("paid")).toBe(false);
    expect(isDueDateRequired("canceled")).toBe(false);
    expect(isPaidAtVisible("paid")).toBe(true);
    expect(isPaidAtVisible("planned")).toBe(false);
  });

  it("입금일 기본값: 저장값의 한국 날짜, 없으면 오늘", () => {
    expect(defaultPaidAtDate(null, "2026-09-25")).toBe("2026-09-25");
    expect(defaultPaidAtDate("2026-09-10T00:00:00+09:00", "2026-09-25")).toBe("2026-09-10");
    // UTC 15시 = 한국 다음날 0시
    expect(paidAtToKstDate("2026-09-09T15:00:00+00:00")).toBe("2026-09-10");
    expect(paidAtToKstDate("2026-09-10")).toBe("2026-09-10");
    expect(paidAtToKstDate("잘못된 값")).toBe("");
  });

  it("예정은 기한 필수", () => {
    expect(validateFinanceDateForm({ originalStatus: null, status: "planned", dueDate: "", paidAtDate: "" })).toMatch(/기한/);
    expect(validateFinanceDateForm({ originalStatus: null, status: "planned", dueDate: "2026-10-01", paidAtDate: "" })).toBeNull();
  });

  it("완료로 바꾸면 입금일 필수, 이미 완료인 옛 행은 날짜 없이 저장 가능", () => {
    expect(validateFinanceDateForm({ originalStatus: "planned", status: "paid", dueDate: "", paidAtDate: "" })).toMatch(/입금/);
    expect(validateFinanceDateForm({ originalStatus: "paid", status: "paid", dueDate: "", paidAtDate: "" })).toBeNull();
    expect(validateFinanceDateForm({ originalStatus: "canceled", status: "canceled", dueDate: "", paidAtDate: "" })).toBeNull();
    expect(validateFinanceDateForm({ originalStatus: "canceled", status: "paid", dueDate: "", paidAtDate: "" })).toMatch(/입금/);
  });

  it("날짜 형식 오류", () => {
    expect(validateFinanceDateForm({ originalStatus: null, status: "planned", dueDate: "2026-02-30", paidAtDate: "" })).toMatch(/형식/);
  });

  it("새 행: 완료면 paid_at(YYYY-MM-DD)을 보낸다", () => {
    expect(buildFinanceDateFields({ originalStatus: null, status: "paid", dueDate: "", paidAtDate: "2026-09-25" })).toEqual({
      paid_at: "2026-09-25",
    });
    expect(buildFinanceDateFields({ originalStatus: null, status: "planned", dueDate: "2026-10-01", paidAtDate: "2026-09-25" })).toEqual({
      due_date: "2026-10-01",
    });
  });

  it("수정: 바뀐 칸만 보낸다", () => {
    const original = { due_date: null, paid_at: "2026-09-10T00:00:00+09:00" };
    // 기한 없는 옛 완료 행을 그대로 저장 → 날짜 칸 없음
    expect(
      buildFinanceDateFields({ originalStatus: "paid", status: "paid", dueDate: "", paidAtDate: "2026-09-10", original })
    ).toEqual({});
    // 입금일 변경
    expect(
      buildFinanceDateFields({ originalStatus: "paid", status: "paid", dueDate: "", paidAtDate: "2026-09-11", original })
    ).toEqual({ paid_at: "2026-09-11" });
    // 예정 → 완료
    expect(
      buildFinanceDateFields({
        originalStatus: "planned",
        status: "paid",
        dueDate: "2026-09-30",
        paidAtDate: "2026-09-25",
        original: { due_date: "2026-09-30", paid_at: null },
      })
    ).toEqual({ paid_at: "2026-09-25" });
    // 기한 비우기
    expect(
      buildFinanceDateFields({
        originalStatus: "paid",
        status: "paid",
        dueDate: "",
        paidAtDate: "2026-09-10",
        original: { due_date: "2026-09-30", paid_at: "2026-09-10T00:00:00+09:00" },
      })
    ).toEqual({ due_date: null });
    // 완료가 아니면 paid_at은 보내지 않는다
    expect(
      buildFinanceDateFields({
        originalStatus: "paid",
        status: "canceled",
        dueDate: "",
        paidAtDate: "2026-09-25",
        original,
      })
    ).toEqual({});
  });
});

describe("t10 손익 (R26)", () => {
  const rows = [
    entry({ id: "a", bu: "FLOW", type: "revenue", amount: 1000, status: "paid" }),
    entry({ id: "b", bu: "FLOW", type: "expense", amount: 300, status: "planned" }),
    entry({ id: "c", bu: "FLOW", type: "revenue", amount: 200, entry_scope: "internal_allocation", counterparty_bu: "REACT" }),
    entry({ id: "d", bu: "REACT", type: "expense", amount: 200, entry_scope: "internal_allocation", counterparty_bu: "FLOW" }),
    entry({ id: "e", bu: "REACT", type: "revenue", amount: 500 }),
    entry({ id: "f", bu: "FLOW", type: "revenue", amount: 9999, status: "canceled" }),
  ];

  it("전체 = 회사 손익(내부배부·취소 제외)", () => {
    const p = summarizePnl(rows, "ALL");
    expect(p).toMatchObject({ revenue: 1500, expense: 300, profit: 1200, includesInternal: false });
    expect(p.internalRevenue).toBe(200);
    expect(p.internalExpense).toBe(200);
  });

  it("사업부 탭 = 행 사업부 관리손익(내부 포함)", () => {
    expect(summarizePnl(rows, "FLOW")).toMatchObject({ revenue: 1200, expense: 300, profit: 900, internalRevenue: 200, includesInternal: true });
    expect(summarizePnl(rows, "REACT")).toMatchObject({ revenue: 500, expense: 200, profit: 300, internalExpense: 200 });
  });

  it("사업부 합계의 합 - 내부배부 = 회사 손익", () => {
    const sumProfit = (["FLOW", "REACT"] as const).reduce((s, bu) => s + summarizePnl(rows, bu).profit, 0);
    expect(sumProfit).toBe(summarizePnl(rows, "ALL").profit);
  });

  it("탭별 행 목록", () => {
    expect(filterEntriesForTab(rows, "ALL")).toHaveLength(rows.length);
    expect(filterEntriesForTab(rows, "REACT").map((r) => r.id)).toEqual(["d", "e"]);
  });

  it("프로젝트 상세: 외부 손익과 내부배부를 나눈다", () => {
    expect(summarizeProjectPnl(rows)).toEqual({
      externalRevenue: 1500,
      externalExpense: 300,
      externalProfit: 1200,
      internalRevenue: 200,
      internalExpense: 200,
      internalNet: 0,
    });
  });
});

describe("t10 서버 오류 문구 (400·403·404·409)", () => {
  it("한국어 서버 문구는 그대로", () => {
    const msg = "재무 기록이 있는 프로젝트는 삭제할 수 없습니다. 보류로 바꾸세요";
    expect(apiErrorMessage(409, { error: msg })).toBe(msg);
    expect(apiErrorMessage(400, { error: "예정(planned) 행은 기한(due_date)이 필요합니다." })).toContain("기한");
    expect(apiErrorMessage(404, { error: "매출·지출 항목을 찾을 수 없습니다." })).toBe("매출·지출 항목을 찾을 수 없습니다.");
  });

  it("영어 Forbidden·Unauthorized는 한국어로", () => {
    expect(apiErrorMessage(403, { error: "Forbidden" })).toMatch(/권한이 없습니다/);
    expect(apiErrorMessage(401, { error: "Unauthorized" })).toMatch(/로그인/);
    expect(apiErrorMessage(404, null)).toMatch(/찾을 수 없습니다/);
    expect(apiErrorMessage(500, { error: "TypeError: x" })).toMatch(/서버 오류/);
    expect(apiErrorMessage(400, { error: "bad" })).toMatch(/입력값/);
  });

  it("errorToMessage: ApiError·한국어 오류만 노출", () => {
    expect(errorToMessage(new ApiError(409, "보류로 바꾸세요"), "기본")).toBe("보류로 바꾸세요");
    expect(errorToMessage(new Error("Failed to fetch"), "기본")).toBe("기본");
    expect(errorToMessage("x", "기본")).toBe("기본");
  });
});

describe("t10 DB 행 → 화면 행", () => {
  it("기한·입금일·등록자를 함께 싣는다", () => {
    const row = {
      id: 7,
      project_id: 3,
      bu_code: "DEETZ",
      entry_scope: "internal_allocation",
      counterparty_bu_code: "REACT",
      kind: "expense",
      category: "촬영",
      name: "촬영비",
      amount: 0,
      occurred_at: "2026-09-01",
      due_date: null,
      status: "paid",
      paid_at: "2026-09-02T00:00:00+09:00",
      created_by: "u1",
    } as unknown as DbFinancialEntry;
    const v = toFinanceEntryView(row);
    expect(v).toMatchObject({
      id: "7",
      projectId: "3",
      bu: "DEETZ",
      counterparty_bu: "REACT",
      due_date: null,
      paid_at: "2026-09-02T00:00:00+09:00",
      created_by: "u1",
      status: "paid",
    });
  });
});
