-- 기존 테이블 삭제 (client_company, client_worker, external_workers)
-- 모든 데이터가 partner_company, partner_worker로 마이그레이션되었으므로 안전하게 삭제 가능

-- 1. 외래키 제약조건 제거
ALTER TABLE public.client_worker 
  DROP CONSTRAINT IF EXISTS client_worker_client_company_id_fkey;

-- 2. 테이블 삭제 (순서 중요: 자식 테이블 먼저)
DROP TABLE IF EXISTS public.client_worker CASCADE;
DROP TABLE IF EXISTS public.client_company CASCADE;
DROP TABLE IF EXISTS public.external_workers CASCADE;

-- 3. 시퀀스 삭제
DROP SEQUENCE IF EXISTS public.client_company_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.client_worker_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.external_workers_id_seq CASCADE;



