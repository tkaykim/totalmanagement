-- 0015_add_pm_name_to_projects.sql
-- 프로젝트에 PM(Project Manager) 이름 컬럼 추가
-- PM은 public.app_users.name 값을 그대로 저장하며, NULL 허용입니다.

-- 1) projects 테이블에 pm_name 컬럼 추가 (idempotent)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS pm_name text;

-- 2) pm_name 인덱스 추가 (있을 때는 생성하지 않음)
CREATE INDEX IF NOT EXISTS idx_projects_pm_name ON projects(pm_name);





