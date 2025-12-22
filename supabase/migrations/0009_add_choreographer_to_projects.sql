-- Add artist_id column to projects table
-- This column references artists.id to link projects with artists (choreographers, performers, etc.)

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS artist_id bigint REFERENCES artists(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_artist_id ON projects (artist_id);

-- Add comment
COMMENT ON COLUMN projects.artist_id IS '관련 아티스트 ID (artists 테이블 참조, null 가능) - 안무가, 공연자 등';

