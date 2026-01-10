-- 파트너 분배 정산 시스템
-- 프로젝트별 파트너 분배 설정 및 정산서 관리

-- 프로젝트 분배 설정 컬럼
ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_partner_id bigint REFERENCES partners(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_rate numeric(5,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS visible_to_partner boolean DEFAULT false;

COMMENT ON COLUMN projects.share_partner_id IS '분배 대상 파트너';
COMMENT ON COLUMN projects.share_rate IS '파트너 분배비율 (순수익의 N%)';
COMMENT ON COLUMN projects.visible_to_partner IS '파트너에게 프로젝트 공개 여부';

-- 파트너 정산 테이블
CREATE TABLE IF NOT EXISTS partner_settlements (
  id bigserial PRIMARY KEY,
  partner_id bigint NOT NULL REFERENCES partners(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid')),
  total_revenue bigint DEFAULT 0,
  total_expense bigint DEFAULT 0,
  net_profit bigint DEFAULT 0,
  partner_amount bigint DEFAULT 0,
  company_amount bigint DEFAULT 0,
  memo text,
  created_by uuid REFERENCES auth.users(id),
  confirmed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 정산에 포함된 프로젝트
CREATE TABLE IF NOT EXISTS partner_settlement_projects (
  id bigserial PRIMARY KEY,
  settlement_id bigint NOT NULL REFERENCES partner_settlements(id) ON DELETE CASCADE,
  project_id bigint NOT NULL REFERENCES projects(id),
  revenue bigint DEFAULT 0,
  expense bigint DEFAULT 0,
  net_profit bigint DEFAULT 0,
  share_rate numeric(5,2) NOT NULL,
  partner_amount bigint DEFAULT 0,
  company_amount bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(settlement_id, project_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_projects_share_partner ON projects(share_partner_id) WHERE share_partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_settlements_partner ON partner_settlements(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_settlements_status ON partner_settlements(status);
CREATE INDEX IF NOT EXISTS idx_partner_settlement_projects_settlement ON partner_settlement_projects(settlement_id);
