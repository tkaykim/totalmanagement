-- Add type column to artists table
-- This column distinguishes between individual artists and teams

ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'team'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_artists_type ON artists (type);

-- Add comment
COMMENT ON COLUMN artists.type IS '아티스트 타입: individual(개인) 또는 team(팀)';

