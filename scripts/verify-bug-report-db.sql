-- Supabase SQL Editor에서 실행하여 버그 리포트·할일 보류 관련 DB 상태 확인
-- (Supabase 대시보드 > SQL Editor > New query > 붙여넣기 후 Run)

-- 1. bug_report_status enum 값 확인 (pending, on_hold, resolved 있어야 함)
SELECT enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'bug_report_status'
ORDER BY enumsortorder;

-- 2. bug_reports 테이블 컬럼 및 status 기본값 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'bug_reports'
ORDER BY ordinal_position;

-- 3. project_tasks.status CHECK 제약 확인 (todo, in_progress, on_hold, done)
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.project_tasks'::regclass
  AND contype = 'c'
  AND conname LIKE '%status%';

-- 4. 적용된 마이그레이션 목록 (supabase_migrations 테이블이 있는 경우)
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;

-- 5. notifications 테이블에 bug_report 타입 알림 존재 여부 (샘플)
SELECT id, user_id, title, type, entity_type, entity_id, created_at
FROM public.notifications
WHERE entity_type = 'bug_report'
ORDER BY created_at DESC
LIMIT 5;
