-- Migration: Seed standard SOP tasks into all active REACT video projects
-- Created: 2026-04-26
-- Source template: task_templates id=3 ("촬영 의뢰건")
-- Target: projects WHERE bu_code='REACT' AND status IN ('진행중','준비중','기획중')
-- Rules:
--   - 조건부 task (condition_key 있음)는 자동 등록 대상에서 제외 (각 PM이 옵션 따라 개별 추가)
--   - 동일 title이 이미 있는 프로젝트는 해당 task만 skip (중복 방지)
--   - end_date가 NULL인 프로젝트는 today + 14일을 기준일로 사용
-- Idempotent: NOT EXISTS 가드로 재실행해도 중복 INSERT 발생하지 않음

INSERT INTO public.project_tasks
  (project_id, bu_code, title, due_date, status, priority, manual_id, created_at, updated_at)
SELECT
  p.id AS project_id,
  p.bu_code,
  tt.title,
  (COALESCE(p.end_date, (CURRENT_DATE + INTERVAL '14 days')::date)
     - (tt.days_before || ' days')::interval)::date AS due_date,
  'todo'::public.task_status,
  COALESCE(tt.priority, 'medium') AS priority,
  tt.manual_id,
  now(),
  now()
FROM public.projects p
CROSS JOIN LATERAL (
  SELECT
    t->>'title' AS title,
    (t->>'days_before')::int AS days_before,
    t->>'priority' AS priority,
    NULLIF(t->>'manual_id', '')::bigint AS manual_id,
    t->>'condition_key' AS condition_key
  FROM public.task_templates tpl, jsonb_array_elements(tpl.tasks) AS t
  WHERE tpl.id = 3
) AS tt
WHERE p.bu_code = 'REACT'
  AND p.status IN ('진행중', '준비중', '기획중')
  AND tt.condition_key IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.project_tasks pt
    WHERE pt.project_id = p.id
      AND pt.title = tt.title
  );
