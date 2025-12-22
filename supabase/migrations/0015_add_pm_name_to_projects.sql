-- 0015_add_pm_name_to_projects.sql
-- 프로젝트에 PM(Project Manager) 필드 추가

-- projects 테이블에 pm_name 컬럼 추가 (app_users.name 참조)
ALTER TABLE projects
  ADD COLUMN pm_name text;

-- pm_name 인덱스 생성 (검색 성능 향상)
CREATE INDEX idx_projects_pm_name ON projects(pm_name);

