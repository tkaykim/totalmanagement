/**
 * T8 테스트용 가짜 Supabase 클라이언트. 운영 DB·네트워크에 닿지 않는다.
 *
 * 쿼리 빌더 체인을 기록하고, 끝(await / maybeSingle / single)에서 테스트가 준 `resolve`로 결과를 정한다.
 */
import { vi } from "vitest";

export type QueryState = {
  table: string;
  op: "select" | "insert" | "update" | "delete";
  payload?: unknown;
  columns?: string;
  filters: Array<[string, string, unknown]>;
  orders: Array<[string, unknown]>;
  terminal: "await" | "maybeSingle" | "single";
};

export type QueryResult = { data: unknown; error: unknown };

export function makeFakeAdmin(resolve: (q: QueryState) => QueryResult) {
  const queries: QueryState[] = [];

  function builder(table: string) {
    const state: QueryState = { table, op: "select", filters: [], orders: [], terminal: "await" };
    const run = (terminal: QueryState["terminal"]) => {
      state.terminal = terminal;
      queries.push({ ...state, filters: [...state.filters], orders: [...state.orders] });
      return Promise.resolve(resolve(state));
    };
    const b: Record<string, unknown> = {
      select(columns?: string) {
        if (state.op === "select") state.columns = columns;
        return b;
      },
      insert(payload: unknown) {
        state.op = "insert";
        state.payload = payload;
        return b;
      },
      update(payload: unknown) {
        state.op = "update";
        state.payload = payload;
        return b;
      },
      delete() {
        state.op = "delete";
        return b;
      },
      eq(col: string, val: unknown) {
        state.filters.push(["eq", col, val]);
        return b;
      },
      in(col: string, val: unknown) {
        state.filters.push(["in", col, val]);
        return b;
      },
      ilike(col: string, val: unknown) {
        state.filters.push(["ilike", col, val]);
        return b;
      },
      order(col: string, opts: unknown) {
        state.orders.push([col, opts]);
        return b;
      },
      limit() {
        return b;
      },
      maybeSingle: () => run("maybeSingle"),
      single: () => run("single"),
      then(onFulfilled: (v: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) {
        return run("await").then(onFulfilled, onRejected);
      },
    };
    return b;
  }

  const auth = {
    admin: {
      createUser: vi.fn(),
      deleteUser: vi.fn(async () => ({ data: null, error: null })),
    },
  };

  return {
    client: { from: vi.fn((table: string) => builder(table)), auth },
    queries,
    auth,
  };
}

/** 가드가 부르는 본인 app_users 조회(`id` eq + maybeSingle)인지 */
export function isGuardLookup(q: QueryState, userId: string): boolean {
  return (
    q.table === "app_users" &&
    q.op === "select" &&
    q.terminal === "maybeSingle" &&
    q.filters.some(([k, c, v]) => k === "eq" && c === "id" && v === userId) &&
    q.columns === "id, role, bu_code, status, name, email, position"
  );
}

export async function readJson(res: Response): Promise<{ status: number; body: any }> {
  return { status: res.status, body: await res.json() };
}
