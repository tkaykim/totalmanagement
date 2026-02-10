-- Migration: Add is_active to manuals and create task_templates table
-- Created: 2026-01-29
-- Note: 기존 manuals 테이블을 활용 (sops 테이블 생성하지 않음)

-- 1. manuals 테이블에 is_active 컬럼 추가
ALTER TABLE public.manuals 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 기존 데이터는 모두 활성화 상태로 설정
UPDATE public.manuals SET is_active = true WHERE is_active IS NULL;

-- 2. 할일 템플릿 테이블 생성
CREATE TABLE IF NOT EXISTS public.task_templates (
    id bigserial PRIMARY KEY,
    bu_code public.bu_code NOT NULL,
    name text NOT NULL,  -- '대회', '배틀', '워크샵', '비자 신규 발급', '안무 제작' 등
    description text,
    template_type text NOT NULL,  -- 'event', 'visa', 'choreography' 등
    options_schema jsonb NOT NULL DEFAULT '{}'::jsonb,  -- 옵션 스키마 정의 (JSON Schema 형식)
    tasks jsonb NOT NULL DEFAULT '[]'::jsonb,  -- 할일 목록 정의 배열 (각 할일: { title, days_before, manual_id, assignee_role, priority })
    author_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. project_tasks 테이블에 manual_id 컬럼 추가
ALTER TABLE public.project_tasks 
ADD COLUMN IF NOT EXISTS manual_id bigint REFERENCES public.manuals(id) ON DELETE SET NULL;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_manuals_bu_code_is_active ON public.manuals(bu_code, is_active);
CREATE INDEX IF NOT EXISTS idx_manuals_category ON public.manuals(category);
CREATE INDEX IF NOT EXISTS idx_task_templates_bu_code ON public.task_templates(bu_code);
CREATE INDEX IF NOT EXISTS idx_task_templates_is_active ON public.task_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_task_templates_template_type ON public.task_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_project_tasks_manual_id ON public.project_tasks(manual_id);

-- updated_at 트리거 함수
CREATE OR REPLACE FUNCTION update_task_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS update_task_templates_updated_at_trigger ON public.task_templates;
CREATE TRIGGER update_task_templates_updated_at_trigger
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_task_templates_updated_at();

-- 테이블 코멘트
COMMENT ON COLUMN public.manuals.is_active IS '활성화 여부 - 비활성화된 매뉴얼은 조회 시 필터링됨';

COMMENT ON TABLE public.task_templates IS '할일 템플릿 테이블 - 사업부별로 구분되지만 모든 사용자가 열람 가능';
COMMENT ON COLUMN public.task_templates.bu_code IS '사업부 코드 - 해당 사업부의 템플릿';
COMMENT ON COLUMN public.task_templates.name IS '템플릿 이름';
COMMENT ON COLUMN public.task_templates.description IS '템플릿 설명';
COMMENT ON COLUMN public.task_templates.template_type IS '템플릿 타입 (event, visa, choreography 등)';
COMMENT ON COLUMN public.task_templates.options_schema IS '옵션 스키마 정의 (JSON Schema 형식)';
COMMENT ON COLUMN public.task_templates.tasks IS '할일 목록 정의 배열 - 각 할일: { title, days_before, manual_id, assignee_role, priority }';
COMMENT ON COLUMN public.task_templates.is_active IS '활성화 여부';

COMMENT ON COLUMN public.project_tasks.manual_id IS '연동된 매뉴얼 ID - 할일 수행 방법 참조용 (manuals 테이블 참조)';
