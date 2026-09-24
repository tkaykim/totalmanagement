// T6 테스트 전용 가짜 Supabase(PostgREST 흉내). 운영 DB·네트워크에 닿지 않는다.
// - range 없이 select하면 1,000행에서 자른다(운영 PostgREST와 같다).
// - 모든 쓰기 호출을 `writes`에 남겨 DB 무변화·전송 칸을 확인한다.

type Row = Record<string, any>;
type Filter = (row: Row) => boolean;

export type WriteCall = { table: string; op: "insert" | "update" | "delete"; payload?: any; filters: string[] };

export class FakeDb {
  tables: Record<string, Row[]>;
  writes: WriteCall[] = [];
  selects: { table: string; range?: [number, number] }[] = [];
  private nextId = 10000;

  constructor(tables: Record<string, Row[]> = {}) {
    this.tables = {};
    for (const [k, v] of Object.entries(tables)) this.tables[k] = v.map((r) => ({ ...r }));
  }

  rows(table: string): Row[] {
    return (this.tables[table] ??= []);
  }

  from(table: string) {
    return new FakeQuery(this, table);
  }

  newId() {
    return this.nextId++;
  }
}

class FakeQuery implements PromiseLike<any> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private filters: Filter[] = [];
  private filterDesc: string[] = [];
  private rangeArg?: [number, number];
  private limitArg?: number;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private payload: any;
  private orderBy: { col: string; asc: boolean }[] = [];

  constructor(private db: FakeDb, private table: string) {}

  select(_cols?: string) {
    return this;
  }
  insert(payload: any) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: any) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  private add(desc: string, f: Filter) {
    this.filterDesc.push(desc);
    this.filters.push(f);
    return this;
  }
  eq(col: string, v: any) {
    return this.add(`eq:${col}=${v}`, (r) => String(r[col]) === String(v));
  }
  neq(col: string, v: any) {
    return this.add(`neq:${col}`, (r) => String(r[col]) !== String(v));
  }
  in(col: string, vs: any[]) {
    const set = new Set(vs.map(String));
    return this.add(`in:${col}`, (r) => set.has(String(r[col])));
  }
  gte(col: string, v: any) {
    return this.add(`gte:${col}`, (r) => r[col] >= v);
  }
  lte(col: string, v: any) {
    return this.add(`lte:${col}`, (r) => r[col] <= v);
  }
  is(col: string, v: any) {
    return this.add(`is:${col}`, (r) => (r[col] ?? null) === v);
  }
  ilike(col: string, pattern: string) {
    const needle = pattern.replace(/%/g, "").toLowerCase();
    return this.add(`ilike:${col}`, (r) => String(r[col] ?? "").toLowerCase().includes(needle));
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  range(from: number, to: number) {
    this.rangeArg = [from, to];
    return this;
  }
  limit(n: number) {
    this.limitArg = n;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }

  private match(r: Row) {
    return this.filters.every((f) => f(r));
  }

  private execute(): { data: any; error: any } {
    const rows = this.db.rows(this.table);
    let result: Row[];
    if (this.op === "insert") {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      this.db.writes.push({ table: this.table, op: "insert", payload: this.payload, filters: [] });
      result = items.map((it: Row) => {
        const row = { id: it.id ?? this.db.newId(), ...it };
        rows.push(row);
        return { ...row };
      });
    } else if (this.op === "update") {
      this.db.writes.push({ table: this.table, op: "update", payload: this.payload, filters: this.filterDesc });
      result = [];
      for (const r of rows) {
        if (this.match(r)) {
          Object.assign(r, this.payload);
          result.push({ ...r });
        }
      }
    } else if (this.op === "delete") {
      this.db.writes.push({ table: this.table, op: "delete", filters: this.filterDesc });
      result = rows.filter((r) => this.match(r)).map((r) => ({ ...r }));
      this.db.tables[this.table] = rows.filter((r) => !this.match(r));
    } else {
      this.db.selects.push({ table: this.table, range: this.rangeArg });
      result = rows.filter((r) => this.match(r)).map((r) => ({ ...r }));
      for (const o of [...this.orderBy].reverse()) {
        result.sort((a, b) => (a[o.col] === b[o.col] ? 0 : (a[o.col] > b[o.col] ? 1 : -1) * (o.asc ? 1 : -1)));
      }
      if (this.rangeArg) result = result.slice(this.rangeArg[0], this.rangeArg[1] + 1);
      else result = result.slice(0, 1000); // PostgREST 기본 상한
      if (this.limitArg !== undefined) result = result.slice(0, this.limitArg);
    }

    if (this.mode === "single") {
      if (result.length !== 1) return { data: null, error: { code: "PGRST116", message: "not single" } };
      return { data: result[0], error: null };
    }
    if (this.mode === "maybeSingle") return { data: result[0] ?? null, error: null };
    return { data: result, error: null };
  }

  then<T1 = any, T2 = never>(
    onfulfilled?: ((value: any) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onfulfilled, onrejected);
  }
}
