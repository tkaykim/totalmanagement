# supabase/migrations

## 이 폴더의 파일
- 이 레포의 SQL 변경 34개가 있다: 옛 31개(2025-03 ~ 2026-06), 2026-08-10 운영 직접 적용분 사본 2개, 권한 봉인 1개(`20260925000000_unified_ops_seal.sql`, 운영 미적용).
- 운영 DB(`wqtoahrekijirxxpbfqg`)의 적용 이력은 128개다(2026-09-24 조회, 마지막 `20260921081613`).
- 그래서 이 폴더 파일만으로 운영 스키마를 다시 만들면 틀린다.
- 옛 31개 파일은 고치지 않는다.

## 운영 스키마 기준선
- 파일: [`supabase/baseline/20260924_prod_snapshot.sql`](../baseline/20260924_prod_snapshot.sql)
- 2026-09-24 운영 `public` 스키마를 카탈로그 읽기 전용 조회로 떠 놓은 것이다.
- 담은 것: enum, 시퀀스, 테이블(컬럼·타입·기본값·NOT NULL), 제약(PK·UNIQUE·CHECK·FK), 인덱스, 함수, 트리거, 뷰, RLS 켜기, RLS 정책.
- 데이터 행·비밀값·개인정보·권한(GRANT)은 담지 않았다.
- 옛 31개 파일보다 **나중 상태**다. DEETZ 사업부, `entry_scope`, 사업부 역할 칸, 2026-09-21 RLS 일괄 조치가 들어 있다.

## 기준선은 참고용이다
- 운영에는 이미 적용된 상태를 기록한 참고용이며 운영에서 실행하지 않는다.
- 마이그레이션 이력에 등록하지 않는다.
- 마이그레이션 도구가 읽지 않도록 이 폴더가 아니라 `supabase/baseline/`에 둔다.
- 쓰는 곳: 스키마 판단 시 참고, 로컬 PGlite 테스트용 스키마 적재.
- 스키마를 판단할 때 최신 사실은 여전히 운영 DB 직접 조회다. 기준선은 추출일 시점의 사본이다.

## 다시 뜨는 법
1. `scripts/schema/extract-baseline.sql`을 Supabase MCP `execute_sql`(읽기 전용)로 실행하고 결과 JSON을 저장한다.
2. `node scripts/schema/build-baseline.mjs <결과.json>`으로 기준선 파일을 만든다.
3. `scripts/schema/verify-baseline.sql`의 1번 쿼리로 운영 개수를 받는다.
4. `node scripts/schema/check-baseline.mjs --prod '<1번 결과 JSON>'`으로 개수를 대조하고 PGlite 적재를 확인한다.
   - Supabase 전용 객체(`auth.users`, `auth.uid()`, `auth.jwt()`, `auth.role()`, 역할 `anon`·`authenticated`·`service_role`)는 `scripts/schema/pglite-stubs.sql`이 대신 만든다.
