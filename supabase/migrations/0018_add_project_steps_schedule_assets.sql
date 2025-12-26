-- 0018_add_project_steps_schedule_assets.sql
-- 프로젝트에 단계 관리, 일정 관리, 자산 관리 필드 추가

-- 1) active_steps: 활성화된 단계 배열 (JSONB)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS active_steps jsonb DEFAULT '[]'::jsonb;

-- 2) 일정 관련 날짜 필드들 추가
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS plan_date date,
  ADD COLUMN IF NOT EXISTS script_date date,
  ADD COLUMN IF NOT EXISTS shoot_date date,
  ADD COLUMN IF NOT EXISTS edit1_date date,
  ADD COLUMN IF NOT EXISTS edit_final_date date,
  ADD COLUMN IF NOT EXISTS release_date date;

-- 3) assets: 제작 자산 정보 (JSONB)
-- 구조: {"script": {"status": "completed|in-progress|pending|none", "version": "v1.0", "link": "..."}, "video": {...}, "thumbnail": {...}}
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS assets jsonb DEFAULT '{}'::jsonb;

-- 4) 인덱스 추가 (release_date는 자주 필터링될 수 있음)
CREATE INDEX IF NOT EXISTS idx_projects_release_date ON projects(release_date) WHERE release_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_shoot_date ON projects(shoot_date) WHERE shoot_date IS NOT NULL;


