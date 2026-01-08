-- Migration: Refactor projects table - PM and Partner changes
-- Date: 2025-01-XX
-- Description:
--   1. Change pm_ids (JSONB array) to pm_id (single UUID FK)
--   2. Remove unnecessary columns: pm_name, active_steps, plan_date, script_date, 
--      shoot_date, edit1_date, edit_final_date, release_date, assets, freelancers, creators
--   3. Rename client_id to partner_company_id
--   4. Add partner_worker_id column (nullable FK)

-- 1. pm_id 컬럼 추가 (nullable)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS pm_id uuid;

-- 2. pm_ids JSONB에서 첫 번째 값을 pm_id로 마이그레이션 (기존 데이터 보존)
UPDATE public.projects
SET pm_id = (pm_ids->>0)::uuid
WHERE pm_ids IS NOT NULL 
  AND jsonb_array_length(pm_ids) > 0
  AND pm_id IS NULL;

-- 3. FK 제약조건 추가
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS fk_projects_pm_id;
ALTER TABLE public.projects
ADD CONSTRAINT fk_projects_pm_id
FOREIGN KEY (pm_id) 
REFERENCES public.app_users(id) 
ON DELETE SET NULL;

-- 4. client_id를 partner_company_id로 변경
-- 기존 FK 제약조건 삭제
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS fk_projects_partner_company_id;

-- 컬럼명 변경
ALTER TABLE public.projects
RENAME COLUMN client_id TO partner_company_id;

-- FK 제약조건 재생성
ALTER TABLE public.projects
ADD CONSTRAINT fk_projects_partner_company_id
FOREIGN KEY (partner_company_id) 
REFERENCES public.partner_company(id) 
ON DELETE SET NULL;

-- 5. partner_worker_id 컬럼 추가
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS partner_worker_id bigint;

-- FK 제약조건 추가
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS fk_projects_partner_worker_id;
ALTER TABLE public.projects
ADD CONSTRAINT fk_projects_partner_worker_id
FOREIGN KEY (partner_worker_id) 
REFERENCES public.partner_worker(id) 
ON DELETE SET NULL;

-- 6. 불필요한 컬럼들 삭제
ALTER TABLE public.projects
DROP COLUMN IF EXISTS pm_name,
DROP COLUMN IF EXISTS active_steps,
DROP COLUMN IF EXISTS plan_date,
DROP COLUMN IF EXISTS script_date,
DROP COLUMN IF EXISTS shoot_date,
DROP COLUMN IF EXISTS edit1_date,
DROP COLUMN IF EXISTS edit_final_date,
DROP COLUMN IF EXISTS release_date,
DROP COLUMN IF EXISTS assets,
DROP COLUMN IF EXISTS freelancers,
DROP COLUMN IF EXISTS creators,
DROP COLUMN IF EXISTS pm_ids;

-- 7. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_projects_pm_id ON public.projects(pm_id);
CREATE INDEX IF NOT EXISTS idx_projects_partner_company_id ON public.projects(partner_company_id);
CREATE INDEX IF NOT EXISTS idx_projects_partner_worker_id ON public.projects(partner_worker_id);

