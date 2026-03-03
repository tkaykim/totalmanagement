-- project_tasks.status용 task_status enum에 'on_hold'(보류) 값 추가
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'on_hold' AFTER 'in_progress';

COMMENT ON COLUMN public.project_tasks.status IS 'todo: 할 일, in_progress: 진행중, on_hold: 보류, done: 완료';
