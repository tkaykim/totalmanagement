-- Create artists table for GRIGO entertainment
-- This table manages full-time artists (전속 아티스트) with contract and visa information

CREATE TABLE artists (
  id             bigserial PRIMARY KEY,
  bu_code        bu_code NOT NULL,
  name           text NOT NULL,
  nationality    text,
  visa_type      text,
  contract_start date NOT NULL,
  contract_end   date NOT NULL,
  visa_start     date,
  visa_end       date,
  role           text,
  status         text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artists_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES business_units(code)
);

-- Create indexes for performance
CREATE INDEX idx_artists_bu_code ON artists (bu_code);
CREATE INDEX idx_artists_status ON artists (status);
CREATE INDEX idx_artists_visa_end ON artists (visa_end) WHERE visa_end IS NOT NULL;

-- Enable RLS (Row Level Security)
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users to read/write)
CREATE POLICY "Artists are viewable by authenticated users"
  ON artists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Artists are insertable by authenticated users"
  ON artists FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Artists are updatable by authenticated users"
  ON artists FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Artists are deletable by authenticated users"
  ON artists FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE artists IS '전속 아티스트 관리 테이블 (GRIGO 전용)';
COMMENT ON COLUMN artists.visa_end IS '비자 종료일 (무기한은 9999-12-31)';

