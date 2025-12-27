-- 0019_add_participants_to_projects.sql
-- 프로젝트에 참여자 정보를 JSONB 컬럼으로 추가
-- PM 외에도 app_users나 external_workers에서 참여자를 추가할 수 있음

-- 1) projects 테이블에 participants JSONB 컬럼 추가
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS participants jsonb DEFAULT '[]'::jsonb;

-- 2) participants JSONB 인덱스 추가 (GIN 인덱스로 배열 내부 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_projects_participants ON projects USING GIN (participants);

-- 참고: participants JSONB 구조 예시
-- [
--   {
--     "user_id": "uuid-string" (app_users.id),
--     "external_worker_id": null,
--     "role": "participant",
--     "is_pm": false
--   },
--   {
--     "user_id": null,
--     "external_worker_id": 123 (external_workers.id),
--     "role": "participant",
--     "is_pm": false
--   }
-- ]


