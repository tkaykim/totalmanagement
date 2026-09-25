// 기준선 SQL 점검: (1) 파일 속 객체 개수 세기·운영 개수와 대조 (2) PGlite에 한 문장씩 올려 파싱·적재 확인.
//
// 사용법:
//   node scripts/schema/check-baseline.mjs [--file <sql>] [--prod '<verify-baseline.sql 1번 결과 JSON>']
//   --prod 를 주면 파일 개수와 다르면 종료 코드 1.
//   PGlite 적재에서 실패한 문장이 하나라도 있으면 종료 코드 1.
//
// 운영 DB에 접속하지 않는다. 메모리 PGlite만 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = opt('--file') ?? path.join(here, '../../supabase/baseline/20260924_prod_snapshot.sql');
const prodArg = opt('--prod');
const sql = fs.readFileSync(file, 'utf8');

// 문장 나누기: 작은따옴표 문자열, 큰따옴표 식별자, $tag$ 본문, -- 주석을 건너뛴다.
export function splitStatements(text) {
  const out = [];
  let buf = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '-' && text[i + 1] === '-') {
      const end = text.indexOf('\n', i);
      const stop = end < 0 ? text.length : end + 1;
      if (buf.trim()) buf += text.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === ch) {
          if (text[j + 1] === ch) { j += 2; continue; }
          break;
        }
        j++;
      }
      buf += text.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === '$') {
      const m = text.slice(i).match(/^\$[A-Za-z_]*\$/);
      if (m) {
        const tag = m[0];
        const end = text.indexOf(tag, i + tag.length);
        const stop = end < 0 ? text.length : end + tag.length;
        buf += text.slice(i, stop);
        i = stop;
        continue;
      }
    }
    if (ch === ';') {
      if (buf.trim()) out.push(buf.trim() + ';');
      buf = '';
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const stmts = splitStatements(sql);

// (1) 개수 세기
const count = (re) => stmts.filter((s) => re.test(s)).length;
let columns = 0;
for (const s of stmts) {
  if (!/^CREATE TABLE /.test(s)) continue;
  const inner = s.slice(s.indexOf('(') + 1, s.lastIndexOf(')'));
  columns += inner.split('\n').filter((l) => /^ {4}\S/.test(l)).length;
}
const fileCounts = {
  tables: count(/^CREATE TABLE /),
  columns,
  enums: count(/^CREATE TYPE \S+ AS ENUM/),
  constraints: count(/^ALTER TABLE ONLY \S+ ADD CONSTRAINT /),
  indexes: count(/^CREATE (UNIQUE )?INDEX /),
  triggers: count(/^CREATE (CONSTRAINT )?TRIGGER /),
  functions: count(/^CREATE (OR REPLACE )?FUNCTION /),
  views: count(/^CREATE (OR REPLACE )?VIEW /),
  policies: count(/^CREATE POLICY /),
  rls_enabled: count(/ENABLE ROW LEVEL SECURITY;$/),
  sequences: count(/^CREATE SEQUENCE /) + (sql.match(/AS IDENTITY \(SEQUENCE NAME /g) ?? []).length,
};
console.log('file counts:', JSON.stringify(fileCounts));

let failed = false;
if (prodArg) {
  const prod = JSON.parse(prodArg);
  const p = Array.isArray(prod) ? prod[0] : prod;
  for (const k of Object.keys(fileCounts)) {
    const pv = Number(p[k]);
    const ok = pv === fileCounts[k];
    console.log(`  ${ok ? 'OK  ' : 'DIFF'} ${k}: prod=${pv} file=${fileCounts[k]}`);
    if (!ok) failed = true;
  }
}

// (2) PGlite 적재
const db = new PGlite();
await db.exec(fs.readFileSync(path.join(here, 'pglite-stubs.sql'), 'utf8'));
const failures = [];
for (const s of stmts) {
  try {
    await db.exec(s);
  } catch (e) {
    failures.push({ stmt: s.split('\n')[0].slice(0, 140), error: e.message });
  }
}
console.log(`pglite: ${stmts.length - failures.length}/${stmts.length} statements loaded`);
for (const f of failures) console.log(`  FAIL ${f.stmt}\n       -> ${f.error}`);
if (failures.length) failed = true;

// 적재 후 카탈로그 개수(파일이 실제로 만든 객체 수)
const { rows } = await db.query(`
  SELECT
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p'))::int AS tables,
    (SELECT count(*) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped)::int AS columns,
    (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e')::int AS enums,
    (SELECT count(*) FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND co.contype IN ('p','u','x','c','f'))::int AS constraints,
    (SELECT count(*) FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT EXISTS (SELECT 1 FROM pg_constraint co WHERE co.conindid=i.indexrelid AND co.contype IN ('p','u','x')))::int AS indexes,
    (SELECT count(*) FROM pg_trigger tg JOIN pg_class c ON c.oid=tg.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT tg.tgisinternal)::int AS triggers,
    (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public')::int AS functions,
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v')::int AS views,
    (SELECT count(*) FROM pg_policies WHERE schemaname='public')::int AS policies,
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity)::int AS rls_enabled,
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='S')::int AS sequences
`);
console.log('pglite catalog counts:', JSON.stringify(rows[0]));
for (const k of Object.keys(fileCounts)) {
  if (rows[0][k] !== fileCounts[k]) {
    console.log(`  DIFF pglite vs file ${k}: pglite=${rows[0][k]} file=${fileCounts[k]}`);
    failed = true;
  }
}
await db.close();
process.exit(failed ? 1 : 0);
