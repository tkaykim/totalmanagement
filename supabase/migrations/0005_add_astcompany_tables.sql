-- Migration: Add ASTCOMPANY ERP tables
-- This migration adds creators table and extends channels/projects tables for ASTCOMPANY

-- ============================================
-- 1. Create creators table (크리에이터 관리)
-- ============================================

CREATE TABLE creators (
  id              bigserial PRIMARY KEY,
  bu_code         bu_code NOT NULL REFERENCES business_units(code),
  name            text NOT NULL,
  type            text NOT NULL CHECK (type IN ('creator', 'celebrity', 'influencer')),
  platform        text, -- 'youtube', 'instagram', 'tiktok', 'etc'
  channel_id      bigint REFERENCES channels(id) ON DELETE SET NULL,
  subscribers_count text,
  engagement_rate text,
  contact_person  text,
  phone           text,
  email           text,
  agency          text, -- 소속 에이전시
  fee_range       text, -- 출연료 범위
  specialties     text[], -- 전문 분야 배열
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  notes           text,
  created_by      uuid REFERENCES app_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_creators_bu_code ON creators (bu_code);
CREATE INDEX idx_creators_status ON creators (status);
CREATE INDEX idx_creators_channel_id ON creators (channel_id);
CREATE INDEX idx_creators_type ON creators (type);

-- ============================================
-- 2. Extend channels table
-- ============================================

ALTER TABLE channels
ADD COLUMN IF NOT EXISTS production_company text,
ADD COLUMN IF NOT EXISTS ad_status text CHECK (ad_status IN ('active', 'paused', 'completed', 'none')) DEFAULT 'none';

CREATE INDEX IF NOT EXISTS idx_channels_ad_status ON channels (ad_status);

-- ============================================
-- 3. Extend projects table
-- ============================================

-- Add JSONB fields for creators and freelancers
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS creators jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS freelancers jsonb DEFAULT '[]'::jsonb;

-- Create GIN indexes for JSONB fields for efficient querying
CREATE INDEX IF NOT EXISTS idx_projects_creators ON projects USING GIN (creators);
CREATE INDEX IF NOT EXISTS idx_projects_freelancers ON projects USING GIN (freelancers);

-- ============================================
-- 4. Add comments for documentation
-- ============================================

COMMENT ON TABLE creators IS '크리에이터/셀럽 관리 - ASTCOMPANY 전용';
COMMENT ON COLUMN creators.type IS '크리에이터 타입: creator(크리에이터), celebrity(셀럽), influencer(인플루언서)';
COMMENT ON COLUMN creators.platform IS '주요 플랫폼: youtube, instagram, tiktok, etc';
COMMENT ON COLUMN creators.channel_id IS '연결된 채널 ID (optional)';
COMMENT ON COLUMN creators.fee_range IS '출연료 범위 (예: "500만원~1000만원")';
COMMENT ON COLUMN creators.specialties IS '전문 분야 배열 (예: ["요리", "여행", "라이프스타일"])';

COMMENT ON COLUMN channels.production_company IS '제작사 정보';
COMMENT ON COLUMN channels.ad_status IS '광고 현황: active(진행중), paused(일시정지), completed(완료), none(없음)';

COMMENT ON COLUMN projects.creators IS '프로젝트에 할당된 크리에이터 정보 (JSONB 배열)';
COMMENT ON COLUMN projects.freelancers IS '프로젝트에 할당된 외주인력 정보 (JSONB 배열, org_members.id 참조)';

