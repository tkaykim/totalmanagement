/**
 * T5 테스트용 메모리 Supabase 흉내. 운영 DB·네트워크에 닿지 않는다.
 * - from(table)의 select/insert/update/delete와 eq·neq·in·is·not·gte·lte·order·range·limit·single·maybeSingle를 흉내 낸다.
 * - PostgREST처럼 range 없는 select는 1,000행에서 자른다(절단 회귀 확인용).
 * - 모든 쓰기는 `writes`에 남는다.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';

type Row = Record<string, any>;
type Filter = (row: Row) => boolean;

export type Write = { table: string; op: 'insert' | 'update' | 'delete'; values?: any; matched?: Row[] };

export class FakeDb {
  tables: Record<string, Row[]> = {};
  writes: Write[] = [];
  selects: { table: string; columns: string; ranged: boolean }[] = [];
  private nextId = 100000;

  constructor(seed: Record<string, Row[]> = {}) {
    for (const [k, v] of Object.entries(seed)) this.tables[k] = v.map((r) => ({ ...r }));
  }

  table(name: string): Row[] {
    if (!this.tables[name]) this.tables[name] = [];
    return this.tables[name];
  }

  genId() {
    return this.nextId++;
  }

  client() {
    return {
      from: (table: string) => new Builder(this, table),
      storage: {
        from: () => ({
          createSignedUrl: async () => ({ data: { signedUrl: 'signed' }, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: 'public' } }),
          upload: async () => ({ data: {}, error: null }),
          remove: async () => ({ data: {}, error: null }),
        }),
      },
    };
  }

  writesTo(table: string, op?: Write['op']) {
    return this.writes.filter((w) => w.table === table && (!op || w.op === op));
  }
}

function eqish(a: any, b: any) {
  if (a === null || a === undefined || b === null || b === undefined) return a === b;
  return String(a) === String(b);
}

class Builder {
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private columns = '*';
  private filters: Filter[] = [];
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private limitN: number | null = null;
  private singleMode: 'single' | 'maybe' | null = null;
  private payload: any = null;
  private returning = false;
  private orderBy: { col: string; asc: boolean } | null = null;
  private headCount = false;

  constructor(private db: FakeDb, private tableName: string) {}

  select(columns = '*', opts?: { count?: string; head?: boolean }) {
    if (this.op === 'select') this.columns = columns;
    else this.returning = true;
    if (opts?.head) this.headCount = true;
    return this;
  }
  insert(values: any) {
    this.op = 'insert';
    this.payload = values;
    return this;
  }
  update(values: any) {
    this.op = 'update';
    this.payload = values;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  eq(col: string, v: any) {
    this.filters.push((r) => eqish(r[col], v));
    return this;
  }
  neq(col: string, v: any) {
    this.filters.push((r) => !eqish(r[col], v));
    return this;
  }
  in(col: string, vs: any[]) {
    this.filters.push((r) => vs.some((v) => eqish(r[col], v)));
    return this;
  }
  is(col: string, v: any) {
    this.filters.push((r) => (v === null ? r[col] === null || r[col] === undefined : r[col] === v));
    return this;
  }
  not(col: string, operator: string, v: any) {
    if (operator === 'is' && v === null) this.filters.push((r) => r[col] !== null && r[col] !== undefined);
    else this.filters.push((r) => !eqish(r[col], v));
    return this;
  }
  gte(col: string, v: any) {
    this.filters.push((r) => r[col] != null && String(r[col]) >= String(v));
    return this;
  }
  lte(col: string, v: any) {
    this.filters.push((r) => r[col] != null && String(r[col]) <= String(v));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, asc: opts?.ascending !== false };
    return this;
  }
  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.singleMode = 'single';
    return this;
  }
  maybeSingle() {
    this.singleMode = 'maybe';
    return this;
  }

  then(resolve: (v: any) => any, reject?: (e: any) => any) {
    try {
      return Promise.resolve(this.exec()).then(resolve, reject);
    } catch (e) {
      return Promise.reject(e).then(resolve, reject);
    }
  }

  private matching(): Row[] {
    return this.db.table(this.tableName).filter((r) => this.filters.every((f) => f(r)));
  }

  private shape(rows: Row[]) {
    if (this.singleMode) {
      if (rows.length === 0) {
        return this.singleMode === 'maybe'
          ? { data: null, error: null }
          : { data: null, error: { message: 'no rows', code: 'PGRST116' } };
      }
      return { data: { ...rows[0] }, error: null };
    }
    return { data: rows.map((r) => ({ ...r })), error: null };
  }

  private exec() {
    const tbl = this.db.table(this.tableName);
    if (this.op === 'select') {
      let rows = this.matching();
      if (this.orderBy) {
        const { col, asc } = this.orderBy;
        rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1));
      }
      const ranged = this.rangeFrom !== null;
      this.db.selects.push({ table: this.tableName, columns: this.columns, ranged });
      if (this.headCount) return { data: null, count: rows.length, error: null };
      if (ranged) rows = rows.slice(this.rangeFrom!, this.rangeTo! + 1);
      else rows = rows.slice(0, 1000); // PostgREST 기본 절단
      if (this.limitN !== null) rows = rows.slice(0, this.limitN);
      return this.shape(rows);
    }
    if (this.op === 'insert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = list.map((v: Row) => ({ id: v.id ?? this.db.genId(), ...v }));
      tbl.push(...inserted);
      this.db.writes.push({ table: this.tableName, op: 'insert', values: this.payload });
      if (!this.returning && !this.singleMode) return { data: null, error: null };
      return this.shape(inserted);
    }
    if (this.op === 'update') {
      const matched = this.matching();
      matched.forEach((r) => Object.assign(r, this.payload));
      this.db.writes.push({ table: this.tableName, op: 'update', values: this.payload, matched: matched.map((r) => ({ ...r })) });
      if (!this.returning && !this.singleMode) return { data: null, error: null };
      return this.shape(matched);
    }
    // delete
    const matched = this.matching();
    this.db.tables[this.tableName] = tbl.filter((r) => !matched.includes(r));
    this.db.writes.push({ table: this.tableName, op: 'delete', matched: matched.map((r) => ({ ...r })) });
    return { data: null, error: null };
  }
}

export const IDS = {
  admin: '00000000-0000-0000-0000-00000000000a',
  flowLeader: '00000000-0000-0000-0000-0000000000f1',
  reactLeader: '00000000-0000-0000-0000-0000000000e1',
  member: '00000000-0000-0000-0000-0000000000b1',
  manager: '00000000-0000-0000-0000-0000000000c1',
  other: '00000000-0000-0000-0000-0000000000d1',
};

export function staff(kind: 'admin' | 'flowLeader' | 'reactLeader' | 'member' | 'manager') {
  const base = { status: 'active', name: kind, email: `${kind}@example.test` };
  switch (kind) {
    case 'admin':
      return { id: IDS.admin, role: 'admin', bu_code: 'HEAD', ...base };
    case 'flowLeader':
      return { id: IDS.flowLeader, role: 'leader', bu_code: 'FLOW', ...base };
    case 'reactLeader':
      return { id: IDS.reactLeader, role: 'leader', bu_code: 'REACT', ...base };
    case 'member':
      return { id: IDS.member, role: 'member', bu_code: 'FLOW', ...base };
    case 'manager':
      return { id: IDS.manager, role: 'manager', bu_code: 'FLOW', ...base };
  }
}

export function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function params<T extends Record<string, string>>(p: T) {
  return { params: Promise.resolve(p) };
}
