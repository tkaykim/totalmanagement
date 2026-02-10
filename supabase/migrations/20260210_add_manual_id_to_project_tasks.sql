-- project_tasks 테이블에 manual_id 컬럼 추가 (manuals 테이블 참조)
ALTER TABLE project_tasks
  ADD COLUMN IF NOT EXISTS manual_id bigint REFERENCES manuals(id) ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_project_tasks_manual_id ON project_tasks(manual_id);
