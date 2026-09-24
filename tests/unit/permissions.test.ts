import { describe, expect, it } from "vitest";
import {
  canAccessArtistPage,
  canAccessExternalFeature,
  canAccessSettlement,
  canChangeUserRoleBuStatus,
  canManageUsers,
  canCreateFinance,
  canCreateProject,
  canCreateTask,
  canDeleteFinance,
  canDeleteProject,
  canDeleteTask,
  canEditFinance,
  canEditProject,
  canEditTask,
  canMoveFinanceBu,
  canTransitionFinance,
  canViewFinanceChanges,
  canViewFinanceEntry,
  canViewProject,
  canViewTask,
  canViewUserChanges,
  getVisibleMenus,
  isActiveStaff,
  isHeadAdmin,
  toPaidAtTimestamp,
  validateFinanceDates,
  validateFinanceScope,
  type AppUser,
  type BuCode,
  type FinancialEntry,
  type Project,
  type Role,
  type Task,
} from "@/lib/permissions";
import { checkFinancePermission } from "@/lib/financePermissions";

// ------------------------------------------------------------------
// 조합표 축
// ------------------------------------------------------------------
const STAFF_ROLES: Role[] = ["admin", "leader", "manager", "member"];
const STATUSES = ["active", "pending", "retired"] as const;
const RELATIONS = ["creator", "pm", "participant", "none"] as const;
type Relation = (typeof RELATIONS)[number];

const USER_BU: BuCode = "REACT";
const OTHER_BU: BuCode = "GRIGO";
const ME = "u-me";
const SOMEONE = "u-someone";

const NO_STATUS = Symbol("no-status");

/** status 인자에 NO_STATUS를 넘기면 status 칸이 없는 사용자(기존 호출부 모양)를 만든다. */
function user(role: Role, status: string | typeof NO_STATUS = "active", bu: BuCode | null = USER_BU, id = ME): AppUser {
  if (status === NO_STATUS) return { id, role, bu_code: bu };
  return { id, role, bu_code: bu, status: status as AppUser["status"] };
}

function project(projectBu: BuCode, rel: Relation, withPm = true): Project {
  return {
    id: 1,
    bu_code: projectBu,
    pm_id: rel === "pm" ? ME : withPm ? SOMEONE : null,
    participants: rel === "participant" ? [ME] : [],
    created_by: rel === "creator" ? ME : SOMEONE,
  };
}

function entry(rowBu: BuCode, createdBy: string | null, status: FinancialEntry["status"] = "planned"): FinancialEntry {
  return { id: 10, project_id: 1, bu_code: rowBu, created_by: createdBy, kind: "expense", status };
}

// ------------------------------------------------------------------
// spec에서 직접 옮긴 기대값(구현과 독립)
// ------------------------------------------------------------------
function specViewProject(role: Role, status: string, p: Project): boolean {
  if (status !== "active") return false;
  if (role === "admin" || role === "leader") return true; // R7
  if (p.created_by === ME || p.pm_id === ME || p.participants.includes(ME)) return true; // R8
  if (role === "manager" && !!p.pm_id && p.bu_code === USER_BU) return true; // R8 manager
  return false;
}

function specViewEntry(role: Role, status: string, p: Project, e: FinancialEntry): boolean {
  if (status !== "active") return false;
  if (role === "admin" || role === "leader") return true;
  if (e.created_by === ME) return true; // R9 본인 등록
  return specViewProject(role, status, p); // R9 볼 수 있는 프로젝트의 모든 행(행 사업부 무관)
}

function specEditEntry(role: Role, status: string, e: FinancialEntry): boolean {
  if (status !== "active") return false;
  if (role === "admin") return true;
  if (e.created_by === null) return false; // 등록자 없는 옛 행은 관리자만
  if (role === "leader") return e.bu_code === USER_BU; // R10: 행 사업부 기준, 다른 사업부는 보기만
  return e.created_by === ME;
}

describe("isActiveStaff / isHeadAdmin (spec 2절)", () => {
  it("active + 사업부 있음만 재직 직원", () => {
    for (const role of STAFF_ROLES) {
      expect(isActiveStaff(user(role, "active"))).toBe(true);
      for (const s of ["pending", "rejected", "retired", "dormant"]) {
        expect(isActiveStaff(user(role, s))).toBe(false);
      }
      expect(isActiveStaff(user(role, "active", null))).toBe(false);
      expect(isActiveStaff(user(role, NO_STATUS))).toBe(false);
    }
  });
  it("비로그인·외부인 역할은 재직 직원이 아니다", () => {
    expect(isActiveStaff(null)).toBe(false);
    expect(isActiveStaff(undefined)).toBe(false);
    expect(isActiveStaff(user("artist"))).toBe(false);
    expect(isActiveStaff(user("viewer"))).toBe(false);
  });
  it("본사 관리자 = HEAD 소속 재직 관리자", () => {
    expect(isHeadAdmin(user("admin", "active", "HEAD"))).toBe(true);
    expect(isHeadAdmin(user("admin", "active", "REACT"))).toBe(false);
    expect(isHeadAdmin(user("leader", "active", "HEAD"))).toBe(false);
    expect(isHeadAdmin(user("admin", "retired", "HEAD"))).toBe(false);
    expect(isHeadAdmin(user("admin", "pending", "HEAD"))).toBe(false);
  });
});

describe("조합표: 역할 × 사업부 × 관계 × 상태 × 행 사업부", () => {
  for (const role of STAFF_ROLES) {
    for (const status of STATUSES) {
      for (const projectBu of [USER_BU, OTHER_BU]) {
        for (const rel of RELATIONS) {
          for (const withPm of [true, false]) {
            const p = project(projectBu, rel, withPm);
            const label = `${role}/${status}/project=${projectBu === USER_BU ? "same" : "other"}/${rel}/pm=${withPm}`;

            it(`canViewProject ${label}`, () => {
              expect(canViewProject(user(role, status), p)).toBe(specViewProject(role, status, p));
            });

            for (const rowBu of [USER_BU, OTHER_BU]) {
              for (const creator of [ME, SOMEONE, null] as const) {
                const e = entry(rowBu, creator);
                const rowLabel = `${label}/row=${rowBu === USER_BU ? "same" : "other"}${rowBu !== projectBu ? "(≠project)" : ""}/creator=${creator ?? "null"}`;

                it(`canViewFinanceEntry ${rowLabel}`, () => {
                  expect(canViewFinanceEntry(user(role, status), e, p)).toBe(specViewEntry(role, status, p, e));
                });
                it(`canEditFinance ${rowLabel}`, () => {
                  expect(canEditFinance(user(role, status), e, p)).toBe(specEditEntry(role, status, e));
                });
                it(`canDeleteFinance(planned) ${rowLabel}`, () => {
                  expect(canDeleteFinance(user(role, status), e, p)).toBe(specEditEntry(role, status, e));
                });
              }
            }
          }
        }
      }
    }
  }
});

describe("R9 교차 사업부 행", () => {
  it("참여자(PM 아님)는 행 사업부가 달라도 그 프로젝트의 모든 행을 본다", () => {
    const p = project("REACT", "participant");
    expect(canViewFinanceEntry(user("member"), entry("DEETZ", SOMEONE), p)).toBe(true);
    expect(canEditFinance(user("member"), entry("DEETZ", SOMEONE), p)).toBe(false);
  });
  it("볼 수 없는 프로젝트의 남의 행은 못 보고, 본인 등록 행은 본다", () => {
    const p = project("GRIGO", "none");
    expect(canViewFinanceEntry(user("member"), entry("GRIGO", SOMEONE), p)).toBe(false);
    expect(canViewFinanceEntry(user("member"), entry("GRIGO", ME), p)).toBe(true);
  });
  it("프로젝트 없는 행은 본인 등록분만(일반 직원)", () => {
    const e: FinancialEntry = { ...entry("REACT", SOMEONE), project_id: null };
    expect(canViewFinanceEntry(user("member"), e, null)).toBe(false);
    expect(canViewFinanceEntry(user("member"), { ...e, created_by: ME }, null)).toBe(true);
    expect(canViewFinanceEntry(user("leader"), e, null)).toBe(true);
  });
});

describe("R10·R11 등록(canCreateFinance)", () => {
  it("관리자는 어디든 등록", () => {
    expect(canCreateFinance(user("admin"), project("GRIGO", "none"), "DEETZ")).toBe(true);
  });
  it("리더는 자기 사업부 행만 등록(프로젝트 사업부 무관)", () => {
    expect(canCreateFinance(user("leader"), project("REACT", "none"))).toBe(true);
    expect(canCreateFinance(user("leader"), project("GRIGO", "none"))).toBe(false);
    expect(canCreateFinance(user("leader"), project("GRIGO", "none"), "REACT")).toBe(true);
    expect(canCreateFinance(user("leader"), project("REACT", "none"), "GRIGO")).toBe(false);
  });
  it("일반 직원은 볼 수 있는 프로젝트에 등록", () => {
    for (const role of ["manager", "member"] as Role[]) {
      for (const rel of ["creator", "pm", "participant"] as Relation[]) {
        expect(canCreateFinance(user(role), project("GRIGO", rel))).toBe(true);
      }
      expect(canCreateFinance(user(role), project("GRIGO", "none"))).toBe(false);
    }
    // manager는 PM 있는 같은 사업부 프로젝트도 본다 → 등록 가능
    expect(canCreateFinance(user("manager"), project("REACT", "none", true))).toBe(true);
    expect(canCreateFinance(user("member"), project("REACT", "none", true))).toBe(false);
  });
  it("비재직은 등록 불가", () => {
    for (const s of ["pending", "retired", "rejected", "dormant"]) {
      expect(canCreateFinance(user("admin", s), project("REACT", "creator"))).toBe(false);
    }
  });
});

describe("R11 삭제: paid·canceled는 누구도 못 지운다", () => {
  for (const status of ["paid", "canceled"] as const) {
    it(`${status} 삭제 불가(관리자 포함)`, () => {
      for (const role of STAFF_ROLES) {
        expect(canDeleteFinance(user(role), entry("REACT", ME, status), project("REACT", "creator"))).toBe(false);
      }
    });
  }
  it("상태를 모르는 행은 삭제 불가", () => {
    const e: FinancialEntry = { ...entry("REACT", ME), status: undefined };
    expect(canDeleteFinance(user("admin"), e, null)).toBe(false);
  });
});

describe("R12 상태 전이(canTransitionFinance)", () => {
  const editorCases: Array<[string, AppUser, FinancialEntry]> = [
    ["관리자", user("admin"), entry("GRIGO", SOMEONE)],
    ["행 사업부 리더", user("leader"), entry("REACT", SOMEONE)],
    ["등록자", user("member"), entry("GRIGO", ME)],
  ];
  const outsiders: Array<[string, AppUser, FinancialEntry]> = [
    ["다른 사업부 리더", user("leader"), entry("GRIGO", SOMEONE)],
    ["등록자 아닌 직원", user("manager"), entry("REACT", SOMEONE)],
    ["등록자 없는 행의 리더", user("leader"), entry("REACT", null)],
    ["퇴사한 관리자", user("admin", "retired"), entry("REACT", SOMEONE)],
  ];

  for (const [from, to] of [["planned", "paid"], ["planned", "canceled"], ["paid", "canceled"]] as const) {
    it(`${from}→${to}: 수정 권한자만`, () => {
      for (const [, u, e] of editorCases) expect(canTransitionFinance(u, e, from, to)).toBe(true);
      for (const [, u, e] of outsiders) expect(canTransitionFinance(u, e, from, to)).toBe(false);
    });
  }

  for (const [from, to] of [["paid", "planned"], ["canceled", "planned"], ["canceled", "paid"]] as const) {
    it(`${from}→${to}: 관리자만`, () => {
      expect(canTransitionFinance(user("admin"), entry("GRIGO", null), from, to)).toBe(true);
      expect(canTransitionFinance(user("leader"), entry("REACT", ME), from, to)).toBe(false);
      expect(canTransitionFinance(user("member"), entry("REACT", ME), from, to)).toBe(false);
      expect(canTransitionFinance(user("admin", "pending"), entry("REACT", ME), from, to)).toBe(false);
    });
  }

  it("같은 상태 유지는 수정 권한과 같다", () => {
    expect(canTransitionFinance(user("member"), entry("REACT", ME, "paid"), "paid", "paid")).toBe(true);
    expect(canTransitionFinance(user("member"), entry("REACT", SOMEONE, "paid"), "paid", "paid")).toBe(false);
  });

  it("모르는 상태값은 거부", () => {
    expect(canTransitionFinance(user("admin"), entry("REACT", ME), "planned", "bogus" as never)).toBe(false);
  });
});

describe("R13 사업부 이동(canMoveFinanceBu)", () => {
  it("관리자와 원래 사업부 리더만", () => {
    expect(canMoveFinanceBu(user("admin"), entry("GRIGO", SOMEONE), "DEETZ")).toBe(true);
    expect(canMoveFinanceBu(user("leader"), entry("REACT", SOMEONE), "DEETZ")).toBe(true);
    expect(canMoveFinanceBu(user("leader"), entry("GRIGO", SOMEONE), "REACT")).toBe(false);
    expect(canMoveFinanceBu(user("member"), entry("REACT", ME), "GRIGO")).toBe(false);
    expect(canMoveFinanceBu(user("manager"), entry("REACT", ME), "GRIGO")).toBe(false);
    expect(canMoveFinanceBu(user("admin", "retired"), entry("REACT", ME), "GRIGO")).toBe(false);
  });
  it("사업부 값이 7개에 없으면 거부", () => {
    expect(canMoveFinanceBu(user("admin"), entry("REACT", ME), "NOPE" as BuCode)).toBe(false);
  });
  it("같은 사업부로의 '이동'은 이동이 아니므로 수정 권한과 같다", () => {
    expect(canMoveFinanceBu(user("member"), entry("REACT", ME), "REACT")).toBe(true);
    expect(canMoveFinanceBu(user("member"), entry("REACT", SOMEONE), "REACT")).toBe(false);
  });
});

describe("R13 내부배부 검증(validateFinanceScope)", () => {
  it("외부 거래는 상대 사업부 없어도 된다", () => {
    expect(validateFinanceScope({ entry_scope: "external", bu_code: "REACT" })).toBeNull();
    expect(validateFinanceScope({ bu_code: "REACT" })).toBeNull();
  });
  it("내부배부는 상대 사업부 필수·행 사업부와 달라야 한다", () => {
    expect(validateFinanceScope({ entry_scope: "internal_allocation", bu_code: "REACT" })).toMatch(/상대 사업부/);
    expect(validateFinanceScope({ entry_scope: "internal_allocation", bu_code: "REACT", counterparty_bu_code: "REACT" })).toMatch(/달라야/);
    expect(validateFinanceScope({ entry_scope: "internal_allocation", bu_code: "REACT", counterparty_bu_code: "NOPE" as BuCode })).toMatch(/사업부/);
    expect(validateFinanceScope({ entry_scope: "internal_allocation", bu_code: "REACT", counterparty_bu_code: "DEETZ" })).toBeNull();
  });
  it("모르는 범위 값은 거부", () => {
    expect(validateFinanceScope({ entry_scope: "weird" as never, bu_code: "REACT" })).toMatch(/거래 범위/);
  });
});

describe("R14 기한·입금일(validateFinanceDates)", () => {
  it("planned 새 행은 due_date 필수", () => {
    const r = validateFinanceDates({ status: "planned" });
    expect(r.ok).toBe(false);
    expect(validateFinanceDates({ status: "planned", due_date: "" }).ok).toBe(false);
    expect(validateFinanceDates({ status: "planned", due_date: null }).ok).toBe(false);
    const ok = validateFinanceDates({ status: "planned", due_date: "2026-10-01" });
    expect(ok).toEqual({ ok: true, due_date: "2026-10-01", paid_at: undefined });
  });
  it("planned 기존 행은 저장된 due_date가 있으면 통과, 비우면 400", () => {
    expect(validateFinanceDates({ status: "planned" }, { status: "planned", due_date: "2026-10-01" }).ok).toBe(true);
    expect(validateFinanceDates({ status: "planned", due_date: null }, { status: "planned", due_date: "2026-10-01" }).ok).toBe(false);
    // paid → planned 되돌리기인데 기한 없으면 거부
    expect(validateFinanceDates({ status: "planned" }, { status: "paid", due_date: null }).ok).toBe(false);
  });
  it("paid 새 행·paid로 바꿀 때 paid_at 필수, KST 자정 timestamptz로 저장", () => {
    expect(validateFinanceDates({ status: "paid" }).ok).toBe(false);
    expect(validateFinanceDates({ status: "paid" }, { status: "planned", due_date: "2026-09-01" }).ok).toBe(false);
    const r = validateFinanceDates({ status: "paid", paid_at: "2026-09-24" }, { status: "planned", due_date: "2026-09-01" });
    expect(r).toEqual({ ok: true, due_date: undefined, paid_at: "2026-09-24T00:00:00+09:00" });
    // 취소 행을 paid로 되살릴 때도 필수
    expect(validateFinanceDates({ status: "paid" }, { status: "canceled" }).ok).toBe(false);
  });
  it("paid·canceled 기존 행은 due_date·paid_at 없이도 수정 가능(옛 157건)", () => {
    expect(validateFinanceDates({ status: "paid" }, { status: "paid", due_date: null, paid_at: null }).ok).toBe(true);
    expect(validateFinanceDates({ status: "canceled" }, { status: "planned", due_date: null }).ok).toBe(true);
    expect(validateFinanceDates({ status: "canceled" }).ok).toBe(true);
  });
  it("paid 행의 paid_at을 명시적으로 비우면 거부", () => {
    expect(validateFinanceDates({ status: "paid", paid_at: null }, { status: "paid", paid_at: "2026-09-01T00:00:00+09:00" }).ok).toBe(false);
    expect(validateFinanceDates({ status: "paid", paid_at: "" }, { status: "paid", paid_at: null }).ok).toBe(false);
  });
  it("paid 기존 행에 저장된 paid_at이 있으면 새 값 없이 통과", () => {
    expect(validateFinanceDates({ status: "paid" }, { status: "paid", paid_at: "2026-09-01T00:00:00+09:00" })).toEqual({
      ok: true,
      due_date: undefined,
      paid_at: undefined,
    });
  });
  it("날짜 형식은 YYYY-MM-DD, 실제 달력 날짜만", () => {
    for (const bad of ["2026/09/24", "20260924", "2026-9-24", "2026-02-30", "2026-13-01", "2026-09-24T00:00:00Z", "abc"]) {
      expect(validateFinanceDates({ status: "planned", due_date: bad }).ok).toBe(false);
      expect(validateFinanceDates({ status: "paid", paid_at: bad }).ok).toBe(false);
    }
    expect(validateFinanceDates({ status: "planned", due_date: "2028-02-29" }).ok).toBe(true);
  });
  it("비워 보낸 due_date는 null로 저장(paid·canceled)", () => {
    expect(validateFinanceDates({ status: "canceled", due_date: "" })).toEqual({ ok: true, due_date: null, paid_at: undefined });
  });
  it("모르는 상태값은 거부", () => {
    expect(validateFinanceDates({ status: "bogus" as never, due_date: "2026-01-01" }).ok).toBe(false);
  });
  it("toPaidAtTimestamp", () => {
    expect(toPaidAtTimestamp("2026-01-31")).toBe("2026-01-31T00:00:00+09:00");
  });
});

describe("R10 프로젝트·할일 쓰기", () => {
  it("리더는 자기 사업부 프로젝트만 수정·삭제(생성자·PM이어도 다른 사업부는 불가)", () => {
    for (const rel of RELATIONS) {
      expect(canEditProject(user("leader"), project("REACT", rel))).toBe(true);
      expect(canEditProject(user("leader"), project("GRIGO", rel))).toBe(false);
      expect(canDeleteProject(user("leader"), project("GRIGO", rel))).toBe(false);
    }
  });
  it("관리자 전부, 일반 직원은 생성자·PM(기존 규칙)", () => {
    expect(canEditProject(user("admin"), project("GRIGO", "none"))).toBe(true);
    for (const role of ["manager", "member"] as Role[]) {
      expect(canEditProject(user(role), project("GRIGO", "creator"))).toBe(true);
      expect(canEditProject(user(role), project("GRIGO", "pm"))).toBe(true);
      expect(canEditProject(user(role), project("REACT", "participant"))).toBe(false);
      expect(canEditProject(user(role), project("REACT", "none"))).toBe(false);
    }
  });
  it("리더는 자기 사업부에만 프로젝트 생성", () => {
    expect(canCreateProject(user("leader"))).toBe(true);
    expect(canCreateProject(user("leader"), "REACT")).toBe(true);
    expect(canCreateProject(user("leader"), "GRIGO")).toBe(false);
    expect(canCreateProject(user("member"), "GRIGO")).toBe(true);
    expect(canCreateProject(user("admin"), "GRIGO")).toBe(true);
    expect(canCreateProject(user("artist"))).toBe(false);
  });
  it("리더 할일 쓰기는 소속 프로젝트 사업부 기준", () => {
    const task = (assignee: string | null): Task => ({ id: 1, project_id: 1, bu_code: "GRIGO", assignee_id: assignee });
    expect(canEditTask(user("leader"), task(ME), project("GRIGO", "pm"))).toBe(false);
    expect(canEditTask(user("leader"), task(null), project("REACT", "none"))).toBe(true);
    expect(canCreateTask(user("leader"), project("GRIGO", "pm"))).toBe(false);
    expect(canCreateTask(user("leader"), project("REACT", "none"))).toBe(true);
    expect(canDeleteTask(user("leader"), task(null), project("GRIGO", "pm"))).toBe(false);
    // 일반 직원 기존 규칙 유지
    expect(canEditTask(user("member"), task(ME), project("GRIGO", "none"))).toBe(true);
    expect(canEditTask(user("member"), task(null), project("GRIGO", "pm"))).toBe(true);
    expect(canEditTask(user("member"), task(null), project("GRIGO", "participant"))).toBe(false);
  });
  it("R8 할일 보기: 볼 수 있는 프로젝트의 할일 + 본인 배정", () => {
    const task = (assignee: string | null): Task => ({ id: 1, project_id: 1, bu_code: "GRIGO", assignee_id: assignee });
    expect(canViewTask(user("leader"), task(null), project("GRIGO", "none"))).toBe(true);
    expect(canViewTask(user("member"), task(null), project("GRIGO", "participant"))).toBe(true);
    expect(canViewTask(user("member"), task(ME), project("GRIGO", "none"))).toBe(true);
    expect(canViewTask(user("member"), task(null), project("GRIGO", "none"))).toBe(false);
    expect(canViewTask(user("member", "retired"), task(ME), project("GRIGO", "none"))).toBe(false);
  });
  it("기존 함수: status 없는 호출(기존 라우트)은 그대로, 명시적 비재직은 거부", () => {
    expect(canEditProject(user("member", NO_STATUS), project("GRIGO", "creator"))).toBe(true);
    expect(canEditProject(user("member", "retired"), project("GRIGO", "creator"))).toBe(false);
    expect(canEditProject(user("admin", "pending"), project("GRIGO", "none"))).toBe(false);
    expect(canEditTask(user("admin", "retired"), { id: 1, project_id: 1, bu_code: "GRIGO", assignee_id: null }, project("GRIGO", "none"))).toBe(false);
  });
});

describe("R18·R19·R22 변경 기록 보기·사람 값 변경", () => {
  it("매출·지출 변경 기록: 관리자, 행 사업부 리더, 등록자", () => {
    expect(canViewFinanceChanges(user("admin"), entry("GRIGO", SOMEONE))).toBe(true);
    expect(canViewFinanceChanges(user("leader"), entry("REACT", SOMEONE))).toBe(true);
    expect(canViewFinanceChanges(user("leader"), entry("GRIGO", SOMEONE))).toBe(false);
    expect(canViewFinanceChanges(user("member"), entry("GRIGO", ME))).toBe(true);
    expect(canViewFinanceChanges(user("manager"), entry("REACT", SOMEONE))).toBe(false);
    expect(canViewFinanceChanges(user("admin", "retired"), entry("REACT", ME))).toBe(false);
  });
  it("직원 변경 기록: 관리자만", () => {
    expect(canViewUserChanges(user("admin"))).toBe(true);
    for (const role of ["leader", "manager", "member"] as Role[]) expect(canViewUserChanges(user(role))).toBe(false);
    expect(canViewUserChanges(user("admin", "pending"))).toBe(false);
  });
  it("직원 등록·수정: 재직 관리자만", () => {
    expect(canManageUsers(user("admin"))).toBe(true);
    for (const role of ["leader", "manager", "member", "viewer", "artist"] as Role[]) expect(canManageUsers(user(role))).toBe(false);
    for (const st of ["pending", "retired", "dormant", "rejected"] as const) expect(canManageUsers(user("admin", st))).toBe(false);
    expect(canManageUsers({ id: ME, role: "admin", bu_code: "HEAD" })).toBe(false); // status 없음
    expect(canManageUsers({ id: ME, role: "admin", bu_code: null, status: "active" })).toBe(false); // 사업부 없음
    expect(canManageUsers(null)).toBe(false);
    expect(canManageUsers(undefined)).toBe(false);
  });
  it("역할·사업부·재직 변경: 관리자만, 본인은 불가", () => {
    expect(canChangeUserRoleBuStatus(user("admin"), SOMEONE)).toBe(true);
    expect(canChangeUserRoleBuStatus(user("admin"), ME)).toBe(false);
    expect(canChangeUserRoleBuStatus(user("leader"), SOMEONE)).toBe(false);
    expect(canChangeUserRoleBuStatus(user("member"), ME)).toBe(false);
    expect(canChangeUserRoleBuStatus(user("admin", "retired"), SOMEONE)).toBe(false);
  });
});

describe("R7·R27 메뉴와 외부인 기능", () => {
  it("정산 메뉴: 관리자와 모든 리더(사업부 무관)", () => {
    expect(getVisibleMenus(user("admin", "active", "REACT"))).toContain("settlement");
    for (const bu of ["FLOW", "REACT", "HEAD", "DEETZ"] as BuCode[]) {
      expect(getVisibleMenus(user("leader", "active", bu))).toContain("settlement");
      expect(canAccessSettlement(user("leader", "active", bu))).toBe(true);
    }
    expect(getVisibleMenus(user("manager"))).not.toContain("settlement");
    expect(getVisibleMenus(user("member"))).not.toContain("settlement");
    expect(canAccessSettlement(user("manager"))).toBe(false);
  });
  it("status 없이 불러도(기존 화면) 메뉴는 그대로 나온다", () => {
    expect(getVisibleMenus(user("leader", NO_STATUS, "FLOW"))).toContain("settlement");
    expect(getVisibleMenus(user("member", NO_STATUS))).toContain("projects");
  });
  it("외부인(artist·viewer)과 비재직에게는 메뉴가 없다", () => {
    expect(getVisibleMenus(user("artist"))).toEqual([]);
    expect(getVisibleMenus(user("viewer"))).toEqual([]);
    expect(getVisibleMenus(user("admin", "retired"))).toEqual([]);
    expect(getVisibleMenus(user("member", "pending"))).toEqual([]);
  });
  it("외부인용 메뉴 키는 누구에게도 나오지 않는다", () => {
    for (const role of STAFF_ROLES) {
      const menus = getVisibleMenus(user(role, "active", "HEAD"));
      for (const key of ["artist", "artistPortal", "partnerSettlements", "partnerSettlement", "shareSettings"]) {
        expect(menus).not.toContain(key);
      }
    }
  });
  it("/artist·파트너 정산·공유 설정은 누구에게나 막힌다", () => {
    for (const role of [...STAFF_ROLES, "artist", "viewer"] as Role[]) {
      expect(canAccessArtistPage(user(role, "active", "HEAD"))).toBe(false);
      expect(canAccessExternalFeature(user(role, "active", "HEAD"))).toBe(false);
    }
  });
});

describe("financePermissions(화면)는 permissions.ts에 위임한다", () => {
  const dbUser = (role: Role, bu: BuCode = "REACT", status?: string) =>
    ({ id: ME, name: "x", role, bu_code: bu, status, created_at: "", updated_at: "" }) as never;
  const dbProject = (bu: BuCode, participants: string[] = [], pm: string | null = null) =>
    ({ id: 1, bu_code: bu, pm_id: pm, participants: participants.map((id) => ({ user_id: id, role: "x", is_pm: false })), created_by: SOMEONE }) as never;

  it("로그인 없음 → 전부 불가", () => {
    expect(checkFinancePermission({ currentUser: null })).toMatchObject({ canRead: false, canCreate: false, canUpdate: false, canDelete: false });
  });
  it("외부인·비재직 → 전부 불가", () => {
    expect(checkFinancePermission({ currentUser: dbUser("artist"), project: dbProject("REACT") }).canRead).toBe(false);
    expect(checkFinancePermission({ currentUser: dbUser("admin", "REACT", "retired"), project: dbProject("REACT") }).canRead).toBe(false);
  });
  it("리더: 다른 사업부 프로젝트는 보기만", () => {
    const p = checkFinancePermission({ currentUser: dbUser("leader"), project: dbProject("GRIGO"), targetBu: "GRIGO" });
    expect(p).toMatchObject({ canRead: true, canCreate: false, canUpdate: false });
    const own = checkFinancePermission({ currentUser: dbUser("leader"), project: dbProject("REACT"), targetBu: "REACT" });
    expect(own).toMatchObject({ canRead: true, canCreate: true });
  });
  it("일반 직원: 참여 프로젝트는 보고 등록, 무관 프로젝트는 못 본다", () => {
    expect(checkFinancePermission({ currentUser: dbUser("member"), project: dbProject("GRIGO", [ME]) })).toMatchObject({ canRead: true, canCreate: true });
    expect(checkFinancePermission({ currentUser: dbUser("member"), project: dbProject("GRIGO") })).toMatchObject({ canRead: false, canCreate: false });
  });
  it("행이 주어지면 행 기준 수정·삭제(paid 삭제 불가)", () => {
    const e = { id: 1, project_id: 1, bu_code: "REACT", created_by: ME, kind: "expense", status: "paid" } as never;
    const r = checkFinancePermission({ currentUser: dbUser("member"), project: dbProject("GRIGO", [ME]), entry: e });
    expect(r).toMatchObject({ canRead: true, canUpdate: true, canDelete: false });
  });
  it("프로젝트 없이(새 프로젝트 작성 중) → 재직자는 등록 가능, 리더는 자기 사업부만", () => {
    expect(checkFinancePermission({ currentUser: dbUser("member"), targetBu: "GRIGO" })).toMatchObject({ canRead: true, canCreate: true });
    expect(checkFinancePermission({ currentUser: dbUser("leader"), targetBu: "GRIGO" })).toMatchObject({ canRead: true, canCreate: false });
  });
});
