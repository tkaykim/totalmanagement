-- 파트너 통합 마이그레이션
-- client_company, client_worker, external_workers를 partner_company, partner_worker로 통합

-- 시퀀스 생성 (테이블보다 먼저)
CREATE SEQUENCE IF NOT EXISTS public.partner_company_id_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.partner_worker_id_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- partner_company 테이블 생성
CREATE TABLE IF NOT EXISTS public.partner_company (
  id bigint NOT NULL DEFAULT nextval('partner_company_id_seq'::regclass),
  bu_code bu_code NOT NULL,
  company_name_en text,
  company_name_ko text,
  industry text,
  business_registration_number text,
  representative_name text,
  partner_type text NOT NULL DEFAULT 'client'::text 
    CHECK (partner_type IN ('client', 'vendor', 'contractor')),
  status client_status NOT NULL DEFAULT 'active'::client_status,
  last_meeting_date date,
  business_registration_file text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT partner_company_pkey PRIMARY KEY (id),
  CONSTRAINT partner_company_bu_code_fkey FOREIGN KEY (bu_code) 
    REFERENCES public.business_units(code)
);

ALTER SEQUENCE public.partner_company_id_seq OWNED BY public.partner_company.id;

-- partner_worker 테이블 생성
CREATE TABLE IF NOT EXISTS public.partner_worker (
  id bigint NOT NULL DEFAULT nextval('partner_worker_id_seq'::regclass),
  partner_company_id bigint,
  bu_code bu_code NOT NULL,
  name_en text,
  name_ko text,
  name text,
  worker_type text NOT NULL DEFAULT 'employee'::text 
    CHECK (worker_type IN ('employee', 'freelancer', 'contractor')),
  phone text,
  email text,
  specialties text[],
  notes text,
  business_card_file text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT partner_worker_pkey PRIMARY KEY (id),
  CONSTRAINT partner_worker_partner_company_id_fkey 
    FOREIGN KEY (partner_company_id) REFERENCES public.partner_company(id) ON DELETE SET NULL,
  CONSTRAINT partner_worker_bu_code_fkey 
    FOREIGN KEY (bu_code) REFERENCES public.business_units(code)
);

ALTER SEQUENCE public.partner_worker_id_seq OWNED BY public.partner_worker.id;

-- updated_at 트리거 함수 생성 (이미 존재하면 교체)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 생성
DROP TRIGGER IF EXISTS update_partner_company_updated_at ON public.partner_company;
CREATE TRIGGER update_partner_company_updated_at
  BEFORE UPDATE ON public.partner_company
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_worker_updated_at ON public.partner_worker;
CREATE TRIGGER update_partner_worker_updated_at
  BEFORE UPDATE ON public.partner_worker
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_partner_company_bu_code ON public.partner_company(bu_code);
CREATE INDEX IF NOT EXISTS idx_partner_company_partner_type ON public.partner_company(partner_type);
CREATE INDEX IF NOT EXISTS idx_partner_company_status ON public.partner_company(status);
CREATE INDEX IF NOT EXISTS idx_partner_worker_partner_company_id ON public.partner_worker(partner_company_id);
CREATE INDEX IF NOT EXISTS idx_partner_worker_bu_code ON public.partner_worker(bu_code);
CREATE INDEX IF NOT EXISTS idx_partner_worker_worker_type ON public.partner_worker(worker_type);
CREATE INDEX IF NOT EXISTS idx_partner_worker_is_active ON public.partner_worker(is_active);

-- 주석 추가
COMMENT ON TABLE public.partner_company IS '파트너 회사 관리 (클라이언트, 벤더, 계약업체 통합)';
COMMENT ON COLUMN public.partner_company.partner_type IS '파트너 타입: client(클라이언트), vendor(벤더), contractor(계약업체)';
COMMENT ON TABLE public.partner_worker IS '파트너 직원/인력 관리 (클라이언트 직원, 외주 인력 통합)';
COMMENT ON COLUMN public.partner_worker.partner_company_id IS '소속 파트너 회사 ID (NULL인 경우 개인 프리랜서)';
COMMENT ON COLUMN public.partner_worker.worker_type IS '인력 타입: employee(직원), freelancer(프리랜서), contractor(계약직)';
COMMENT ON COLUMN public.partner_worker.name IS '이름 (name_en 또는 name_ko가 없을 경우 사용)';



