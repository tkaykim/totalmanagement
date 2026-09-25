-- 운영 스키마 기준선 대조 쿼리 (읽기 전용 카탈로그 SELECT만 사용)
--
-- 용도: supabase/baseline/20260924_prod_snapshot.sql 이 운영과 같은지 확인한다.
-- 실행: 아래 두 쿼리를 하나씩 따로 실행한다(MCP execute_sql은 마지막 결과만 돌려준다).
--   1) 개수 대조: 결과를 check-baseline.mjs --prod '<json>' 에 넘기면 파일 쪽 개수와 비교한다.
--   2) 이름 목록: 결과를 파일의 객체 이름과 diff 할 때 쓴다.
-- 정의는 extract-baseline.sql 과 같게 맞춘다(확장 소속 함수 제외, 제약이 만든 인덱스 제외, 내부 트리거 제외).

-- 1) 개수 대조 --------------------------------------------------------------
SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')) AS tables,
  (SELECT count(*) FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND a.attnum > 0 AND NOT a.attisdropped) AS columns,
  (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e') AS enums,
  (SELECT count(*) FROM pg_constraint co JOIN pg_class c ON c.oid = co.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND co.contype IN ('p', 'u', 'x', 'c', 'f')) AS constraints,
  (SELECT count(*) FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      AND NOT EXISTS (SELECT 1 FROM pg_constraint co WHERE co.conindid = i.indexrelid AND co.contype IN ('p', 'u', 'x'))) AS indexes,
  (SELECT count(*) FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT tg.tgisinternal) AS triggers,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')) AS functions,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v') AS views,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') AS policies,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity) AS rls_enabled,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'S') AS sequences;

-- 2) 이름 목록 --------------------------------------------------------------
SELECT kind, name FROM (
  SELECT 'table' AS kind, c.relname::text AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  UNION ALL
  SELECT 'enum', t.typname::text FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
  UNION ALL
  SELECT 'constraint', c.relname || '.' || co.conname FROM pg_constraint co JOIN pg_class c ON c.oid = co.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND co.contype IN ('p', 'u', 'x', 'c', 'f')
  UNION ALL
  SELECT 'index', ic.relname::text FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    WHERE n.nspname = 'public'
      AND NOT EXISTS (SELECT 1 FROM pg_constraint co WHERE co.conindid = i.indexrelid AND co.contype IN ('p', 'u', 'x'))
  UNION ALL
  SELECT 'trigger', c.relname || '.' || tg.tgname FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT tg.tgisinternal
  UNION ALL
  SELECT 'function', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  UNION ALL
  SELECT 'view', c.relname::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v'
  UNION ALL
  SELECT 'policy', tablename || '.' || policyname FROM pg_policies WHERE schemaname = 'public'
) x
ORDER BY kind, name;
