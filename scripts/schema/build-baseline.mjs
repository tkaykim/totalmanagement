// extract-baseline.sql 결과(ord, obj, ddl 행)를 기준선 SQL 파일로 조립한다.
//
// 사용법:
//   node scripts/schema/build-baseline.mjs <결과.json> [출력.sql]
//   <결과.json>은 행 배열 JSON이거나, Supabase MCP execute_sql 응답을 그대로 저장한 파일이다.
//   출력 기본값: supabase/baseline/20260924_prod_snapshot.sql
//
// 이 스크립트는 DB에 접속하지 않는다. 파일만 읽고 쓴다.
import fs from 'node:fs';
import path from 'node:path';

const [, , input, outArg] = process.argv;
if (!input) {
  console.error('usage: node scripts/schema/build-baseline.mjs <rows.json> [out.sql]');
  process.exit(2);
}
const out = outArg ?? 'supabase/baseline/20260924_prod_snapshot.sql';

function loadRows(file) {
  const text = fs.readFileSync(file, 'utf8');
  let data = JSON.parse(text);
  if (Array.isArray(data)) return data;
  // MCP 응답 형태: {"result": "...<untrusted-data-...>\n[...]\n</untrusted-data-...>..."}
  const m = String(data.result ?? '').match(/<untrusted-data-[^>]+>\n([\s\S]*)\n<\/untrusted-data/);
  if (!m) throw new Error('행 배열을 찾지 못했다');
  return JSON.parse(m[1]);
}

const rows = loadRows(input);

const SECTIONS = [
  [100, 100, '1. enum 타입'],
  [200, 200, '2. 독립 시퀀스(serial 컬럼용)'],
  [300, 300, '3. 테이블(컬럼·타입·기본값·NOT NULL·identity)'],
  [350, 350, '4. 시퀀스 소유 컬럼'],
  [400, 409, '5. 제약(PK → UNIQUE → CHECK → FK)'],
  [500, 500, '6. 인덱스(제약이 만든 인덱스 제외)'],
  [600, 600, '7. 함수'],
  [700, 700, '8. 트리거'],
  [800, 800, '9. 뷰'],
  [900, 900, '10. RLS 켜기'],
  [950, 950, '11. RLS 정책'],
];

const header = `-- =============================================================================
-- 운영 스키마 기준선 스냅샷 (public 스키마, 스키마만)
-- 운영 DB: Supabase wqtoahrekijirxxpbfqg (PostgreSQL 17)
-- 추출일: 2026-09-24
--
-- 운영에는 이미 적용된 상태를 기록한 참고용이며 운영에서 실행하지 않는다.
-- 마이그레이션 이력에 등록하지 않는다.
--
-- - 이 파일은 supabase/migrations/ 밖에 둔다. 마이그레이션 도구가 읽지 않게 하려는 것이다.
-- - 데이터 행·비밀값·개인정보는 없다. 카탈로그 읽기 전용 SELECT로만 만들었다.
-- - 추출 쿼리: scripts/schema/extract-baseline.sql
--   조립: scripts/schema/build-baseline.mjs
--   대조 쿼리: scripts/schema/verify-baseline.sql
--   개수 대조·파싱 점검: scripts/schema/check-baseline.mjs
-- - auth.users, auth.uid(), auth.jwt() 등 Supabase 전용 객체를 참조한다.
--   Supabase 밖(PGlite 등)에 올릴 때는 그 객체를 먼저 만들어야 한다(check-baseline.mjs 참고).
-- - react_* 테이블은 reactstudio 레포가 주인이다. 여기에는 스키마만 기록한다.
-- - 권한(GRANT)과 주석(COMMENT)은 담지 않았다.
-- - 뷰 2개는 추출 시점에 security_invoker 옵션이 없다(소유자 권한, RLS 우회). 운영 그대로 기록했다.
-- - 시퀀스의 현재 값(setval)은 담지 않았다.
-- =============================================================================
`;

let body = header;
for (const [lo, hi, title] of SECTIONS) {
  const part = rows.filter((r) => r.ord >= lo && r.ord <= hi);
  body += `\n-- -----------------------------------------------------------------------------\n-- ${title} (${part.length})\n-- -----------------------------------------------------------------------------\n\n`;
  body += part.map((r) => r.ddl).join(lo === 300 || lo === 600 || lo === 800 || lo === 950 ? '\n\n' : '\n');
  body += '\n';
}
const unknown = rows.filter((r) => !SECTIONS.some(([lo, hi]) => r.ord >= lo && r.ord <= hi));
if (unknown.length) throw new Error(`알 수 없는 ord: ${unknown.map((r) => r.ord).join(',')}`);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, body.replace(/\r\n/g, '\n'));
console.log(`wrote ${out} (${rows.length} objects, ${body.length} chars)`);
