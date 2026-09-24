-- 운영 스키마 기준선 추출 쿼리 (읽기 전용 카탈로그 SELECT만 사용)
--
-- 용도: supabase/migrations/20260924000000_baseline_prod_snapshot.sql 을 다시 만들 때 쓴다.
-- 실행: Supabase MCP execute_sql 또는 SQL 편집기에서 이 파일 전체를 그대로 실행한다.
--       결과는 (ord, obj, ddl) 행이며 ord, obj 순으로 이어 붙이면 기준선 본문이 된다.
-- 주의: 데이터 행은 읽지 않는다. 카탈로그(pg_catalog)만 조회한다.
--       SET search_path 는 현재 세션에만 적용되며, 이름을 public. 으로 완전 수식하게 하려는 것이다.
--
-- ord 구간
--   100 enum 타입
--   200 독립 시퀀스(serial 컬럼용)
--   300 테이블(컬럼·타입·기본값·NOT NULL, identity 포함)
--   350 시퀀스 OWNED BY
--   400 제약(PK → UNIQUE → EXCLUDE → CHECK → FK 순)
--   500 인덱스(제약이 만든 인덱스 제외)
--   600 함수(pg_get_functiondef)
--   700 트리거
--   800 뷰(pg_get_viewdef, reloptions 포함)
--   900 RLS 켜기
--   950 RLS 정책(pg_policy)

SET search_path = pg_catalog;

WITH
tbl AS (
  SELECT c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
),
enums AS (
  SELECT 100 AS ord, t.typname::text AS obj,
         format('CREATE TYPE public.%I AS ENUM (%s);', t.typname,
                (SELECT string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder)
                 FROM pg_enum e WHERE e.enumtypid = t.oid)) AS ddl
  FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typtype = 'e'
),
serial_seqs AS (
  SELECT s.oid, s.relname, d.refobjid AS tbl_oid, d.refobjsubid AS attnum, sq.*
  FROM pg_class s
  JOIN pg_namespace n ON n.oid = s.relnamespace
  JOIN pg_sequence sq ON sq.seqrelid = s.oid
  LEFT JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass
                        AND d.refclassid = 'pg_class'::regclass AND d.deptype = 'a'
  WHERE n.nspname = 'public' AND s.relkind = 'S'
    AND NOT EXISTS (SELECT 1 FROM pg_depend di WHERE di.objid = s.oid
                    AND di.classid = 'pg_class'::regclass AND di.deptype = 'i')
),
seqs AS (
  SELECT 200 AS ord, relname::text AS obj,
         format('CREATE SEQUENCE public.%I AS %s START WITH %s INCREMENT BY %s MINVALUE %s MAXVALUE %s CACHE %s%s;',
                relname, format_type(seqtypid, NULL), seqstart, seqincrement, seqmin, seqmax, seqcache,
                CASE WHEN seqcycle THEN ' CYCLE' ELSE '' END) AS ddl
  FROM serial_seqs
),
seq_owned AS (
  SELECT 350 AS ord, s.relname::text AS obj,
         format('ALTER SEQUENCE public.%I OWNED BY public.%I.%I;', s.relname, c.relname, a.attname) AS ddl
  FROM serial_seqs s
  JOIN pg_class c ON c.oid = s.tbl_oid
  JOIN pg_attribute a ON a.attrelid = s.tbl_oid AND a.attnum = s.attnum
),
cols AS (
  SELECT t.oid AS tbl_oid, t.relname, a.attnum,
         format('    %I %s', a.attname, format_type(a.atttypid, a.atttypmod))
         || CASE WHEN a.attidentity <> '' THEN
              (SELECT format(' GENERATED %s AS IDENTITY (SEQUENCE NAME public.%I START WITH %s INCREMENT BY %s MINVALUE %s MAXVALUE %s CACHE %s%s)',
                             CASE a.attidentity WHEN 'a' THEN 'ALWAYS' ELSE 'BY DEFAULT' END,
                             s.relname, sq.seqstart, sq.seqincrement, sq.seqmin, sq.seqmax, sq.seqcache,
                             CASE WHEN sq.seqcycle THEN ' CYCLE' ELSE '' END)
               FROM pg_depend d JOIN pg_class s ON s.oid = d.objid JOIN pg_sequence sq ON sq.seqrelid = s.oid
               WHERE d.refobjid = t.oid AND d.refobjsubid = a.attnum AND d.deptype = 'i'
                 AND d.classid = 'pg_class'::regclass LIMIT 1)
            ELSE '' END
         || CASE WHEN a.attgenerated = 's' THEN ' GENERATED ALWAYS AS (' || pg_get_expr(ad.adbin, ad.adrelid) || ') STORED'
                 WHEN ad.adbin IS NOT NULL THEN ' DEFAULT ' || pg_get_expr(ad.adbin, ad.adrelid)
                 ELSE '' END
         || CASE WHEN a.attnotnull AND a.attidentity = '' THEN ' NOT NULL' ELSE '' END AS coldef
  FROM tbl t
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef ad ON ad.adrelid = t.oid AND ad.adnum = a.attnum
),
tables AS (
  SELECT 300 AS ord, t.relname::text AS obj,
         format(E'CREATE TABLE public.%I (\n%s\n);', t.relname,
                (SELECT string_agg(c.coldef, E',\n' ORDER BY c.attnum) FROM cols c WHERE c.tbl_oid = t.oid)) AS ddl
  FROM tbl t
),
cons AS (
  SELECT 400 + CASE co.contype WHEN 'p' THEN 0 WHEN 'u' THEN 1 WHEN 'x' THEN 2 WHEN 'c' THEN 3 WHEN 'f' THEN 9 END AS ord,
         t.relname || '.' || co.conname AS obj,
         format('ALTER TABLE ONLY public.%I ADD CONSTRAINT %I %s;', t.relname, co.conname, pg_get_constraintdef(co.oid)) AS ddl
  FROM pg_constraint co JOIN tbl t ON t.oid = co.conrelid
  WHERE co.contype IN ('p', 'u', 'x', 'c', 'f')
),
idx AS (
  SELECT 500 AS ord, ic.relname::text AS obj, pg_get_indexdef(i.indexrelid) || ';' AS ddl
  FROM pg_index i
  JOIN pg_class ic ON ic.oid = i.indexrelid
  JOIN tbl t ON t.oid = i.indrelid
  WHERE NOT EXISTS (SELECT 1 FROM pg_constraint co WHERE co.conindid = i.indexrelid AND co.contype IN ('p', 'u', 'x'))
),
funcs AS (
  SELECT 600 AS ord, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS obj,
         rtrim(pg_get_functiondef(p.oid), E'\n') || ';' AS ddl
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
),
trigs AS (
  SELECT 700 AS ord, t.relname || '.' || tg.tgname AS obj, pg_get_triggerdef(tg.oid, false) || ';' AS ddl
  FROM pg_trigger tg JOIN tbl t ON t.oid = tg.tgrelid
  WHERE NOT tg.tgisinternal
),
views AS (
  SELECT 800 AS ord, c.relname::text AS obj,
         format(E'CREATE VIEW public.%I%s AS\n%s', c.relname,
                CASE WHEN c.reloptions IS NOT NULL THEN ' WITH (' || array_to_string(c.reloptions, ', ') || ')' ELSE '' END,
                rtrim(pg_get_viewdef(c.oid, true), E';\n ')) || ';' AS ddl
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'v'
),
rls AS (
  SELECT 900 AS ord, relname::text AS obj,
         format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', relname)
         || CASE WHEN relforcerowsecurity THEN format(E'\nALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', relname) ELSE '' END AS ddl
  FROM tbl WHERE relrowsecurity
),
pols AS (
  SELECT 950 AS ord, t.relname || '.' || pol.polname AS obj,
         format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s;',
                pol.polname, t.relname,
                CASE WHEN pol.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                CASE pol.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,
                CASE WHEN pol.polroles = '{0}' THEN 'public'
                     ELSE (SELECT string_agg(quote_ident(r.rolname), ', ' ORDER BY r.rolname)
                           FROM pg_roles r WHERE r.oid = ANY (pol.polroles)) END,
                CASE WHEN pol.polqual IS NOT NULL THEN E'\n    USING (' || pg_get_expr(pol.polqual, pol.polrelid) || ')' ELSE '' END,
                CASE WHEN pol.polwithcheck IS NOT NULL THEN E'\n    WITH CHECK (' || pg_get_expr(pol.polwithcheck, pol.polrelid) || ')' ELSE '' END) AS ddl
  FROM pg_policy pol JOIN tbl t ON t.oid = pol.polrelid
)
SELECT ord, obj, ddl FROM (
  SELECT * FROM enums UNION ALL SELECT * FROM seqs UNION ALL SELECT * FROM tables
  UNION ALL SELECT * FROM seq_owned UNION ALL SELECT * FROM cons UNION ALL SELECT * FROM idx
  UNION ALL SELECT * FROM funcs UNION ALL SELECT * FROM trigs UNION ALL SELECT * FROM views
  UNION ALL SELECT * FROM rls UNION ALL SELECT * FROM pols
) all_objs
ORDER BY ord, obj;
