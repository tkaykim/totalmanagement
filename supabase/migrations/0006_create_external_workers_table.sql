-- Migration: Create external_workers table for managing freelancers and external contractors
-- This migration separates external workers from org_members (internal employees only)

-- ============================================
-- 1. Create external_workers table
-- ============================================

CREATE TABLE external_workers (
  id              bigserial PRIMARY KEY,
  bu_code         bu_code NOT NULL REFERENCES business_units(code),
  name            text NOT NULL,
  company_name    text, -- 외주회사명 (회사 소속인 경우)
  worker_type     text NOT NULL CHECK (worker_type IN ('freelancer', 'company', 'contractor')) DEFAULT 'freelancer',
  phone           text,
  email           text,
  specialties     text[], -- 전문 분야 배열
  notes           text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_external_workers_bu_code ON external_workers (bu_code);
CREATE INDEX idx_external_workers_worker_type ON external_workers (worker_type);
CREATE INDEX idx_external_workers_is_active ON external_workers (is_active);
CREATE INDEX idx_external_workers_name ON external_workers (name);

-- ============================================
-- 2. Add comments for documentation
-- ============================================

COMMENT ON TABLE external_workers IS '외주 인력 관리 - 프리랜서, 외주회사, 계약직 등 내부직원이 아닌 외부 인력';
COMMENT ON COLUMN external_workers.worker_type IS '인력 타입: freelancer(프리랜서), company(외주회사), contractor(계약직)';
COMMENT ON COLUMN external_workers.company_name IS '외주회사명 (worker_type이 company인 경우 필수)';
COMMENT ON COLUMN external_workers.specialties IS '전문 분야 배열 (예: ["영상편집", "디자인", "개발"])';


