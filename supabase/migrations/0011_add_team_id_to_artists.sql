-- Add team_id column to artists table
-- This column references artists.id to link individual artists with their team
-- Only individual artists can have a team_id (type = 'individual')

ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS team_id bigint REFERENCES artists(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_artists_team_id ON artists (team_id);

-- Add comment
COMMENT ON COLUMN artists.team_id IS '소속 팀 ID (artists 테이블 참조, null 가능) - 개인 아티스트(type=individual)만 팀에 소속 가능';

-- Add check constraint to ensure only individual artists can have a team_id
-- Note: This constraint checks that if team_id is set, type must be 'individual'
ALTER TABLE artists
  ADD CONSTRAINT artists_team_id_check 
  CHECK (team_id IS NULL OR type = 'individual');

