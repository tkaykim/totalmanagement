-- Migration: Add ReactStudio and multi-BU support tables
-- This migration adds tables that can be used by all business units, not just ReactStudio

-- ============================================
-- 1. Extend existing tables
-- ============================================

-- Add priority and tag fields to project_tasks for Kanban functionality
ALTER TABLE project_tasks
ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS tag text;

CREATE INDEX IF NOT EXISTS idx_tasks_priority ON project_tasks (priority);

-- Add client_id to projects for client relationship
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS client_id bigint;

-- ============================================
-- 2. Create new ENUM types
-- ============================================

CREATE TYPE equipment_status AS ENUM (
  'available',
  'rented',
  'maintenance',
  'lost'
);

CREATE TYPE channel_status AS ENUM (
  'active',
  'growing',
  'inactive',
  'archived'
);

CREATE TYPE content_stage AS ENUM (
  'planning',
  'shooting',
  'editing',
  'uploaded'
);

CREATE TYPE event_type AS ENUM (
  'meeting',
  'shoot',
  'deadline',
  'holiday',
  'event'
);

CREATE TYPE client_status AS ENUM (
  'active',
  'inactive',
  'archived'
);

-- ============================================
-- 3. Create new tables
-- ============================================

-- Clients table (거래처/클라이언트 관리)
CREATE TABLE clients (
  id              bigserial PRIMARY KEY,
  bu_code         bu_code NOT NULL REFERENCES business_units(code),
  name            text NOT NULL,
  industry        text,
  contact_person  text,
  phone           text,
  email           text,
  address         text,
  status          client_status NOT NULL DEFAULT 'active',
  last_meeting_date date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_bu_code ON clients (bu_code);
CREATE INDEX idx_clients_status ON clients (status);
CREATE INDEX idx_clients_name ON clients (name);

-- Add foreign key constraint for projects.client_id
ALTER TABLE projects
ADD CONSTRAINT fk_projects_client_id FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Equipment table (장비 관리)
CREATE TABLE equipment (
  id              bigserial PRIMARY KEY,
  bu_code         bu_code NOT NULL REFERENCES business_units(code),
  name            text NOT NULL,
  category        text NOT NULL,
  serial_number   text,
  status          equipment_status NOT NULL DEFAULT 'available',
  location        text,
  borrower_id     uuid REFERENCES app_users(id),
  borrower_name   text,
  return_date     date,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_bu_code ON equipment (bu_code);
CREATE INDEX idx_equipment_status ON equipment (status);
CREATE INDEX idx_equipment_category ON equipment (category);
CREATE INDEX idx_equipment_borrower ON equipment (borrower_id);

-- Channels table (자체 채널 관리)
CREATE TABLE channels (
  id              bigserial PRIMARY KEY,
  bu_code         bu_code NOT NULL REFERENCES business_units(code),
  name            text NOT NULL,
  url             text,
  subscribers_count text,
  total_views     text,
  status          channel_status NOT NULL DEFAULT 'active',
  manager_id      uuid REFERENCES app_users(id),
  manager_name    text,
  next_upload_date date,
  recent_video    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_channels_bu_code ON channels (bu_code);
CREATE INDEX idx_channels_status ON channels (status);
CREATE INDEX idx_channels_manager ON channels (manager_id);

-- Channel Contents table (채널 콘텐츠 파이프라인)
CREATE TABLE channel_contents (
  id              bigserial PRIMARY KEY,
  channel_id      bigint NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title           text NOT NULL,
  stage           content_stage NOT NULL DEFAULT 'planning',
  assignee_id     uuid REFERENCES app_users(id),
  assignee_name   text,
  upload_date     date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_channel_contents_channel_id ON channel_contents (channel_id);
CREATE INDEX idx_channel_contents_stage ON channel_contents (stage);
CREATE INDEX idx_channel_contents_upload_date ON channel_contents (upload_date);

-- Events table (일정/캘린더)
CREATE TABLE events (
  id              bigserial PRIMARY KEY,
  bu_code         bu_code NOT NULL REFERENCES business_units(code),
  title           text NOT NULL,
  event_date      date NOT NULL,
  event_type      event_type NOT NULL DEFAULT 'event',
  description     text,
  project_id      bigint REFERENCES projects(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES app_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_bu_code ON events (bu_code);
CREATE INDEX idx_events_event_date ON events (event_date);
CREATE INDEX idx_events_event_type ON events (event_type);
CREATE INDEX idx_events_project_id ON events (project_id);

-- Manuals table (매뉴얼/가이드)
CREATE TABLE manuals (
  id              bigserial PRIMARY KEY,
  bu_code         bu_code NOT NULL REFERENCES business_units(code),
  title           text NOT NULL,
  category        text NOT NULL,
  content         jsonb NOT NULL DEFAULT '[]'::jsonb,
  author_id       uuid REFERENCES app_users(id),
  author_name     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_manuals_bu_code ON manuals (bu_code);
CREATE INDEX idx_manuals_category ON manuals (category);
CREATE INDEX idx_manuals_author ON manuals (author_id);

-- ============================================
-- 4. Add comments for documentation
-- ============================================

COMMENT ON TABLE clients IS '거래처/클라이언트 관리 - 모든 사업부에서 사용 가능';
COMMENT ON TABLE equipment IS '장비 관리 - 모든 사업부에서 사용 가능';
COMMENT ON TABLE channels IS '자체 채널 관리 - 모든 사업부에서 사용 가능';
COMMENT ON TABLE channel_contents IS '채널 콘텐츠 파이프라인 - 채널이 있는 사업부에서 사용';
COMMENT ON TABLE events IS '일정/캘린더 - 모든 사업부에서 공통 사용';
COMMENT ON TABLE manuals IS '매뉴얼/가이드 - 모든 사업부에서 공통 사용';

COMMENT ON COLUMN project_tasks.priority IS '할일 우선순위 (high/medium/low)';
COMMENT ON COLUMN project_tasks.tag IS '할일 태그 (카테고리 분류용)';
COMMENT ON COLUMN projects.client_id IS '연결된 클라이언트 ID (nullable)';




