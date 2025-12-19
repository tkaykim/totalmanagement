-- Add new fields to org_members table
ALTER TABLE org_members
  ADD COLUMN IF NOT EXISTS bu_code bu_code,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create index for bu_code
CREATE INDEX IF NOT EXISTS idx_org_members_bu_code ON org_members (bu_code);

-- Create index for is_active
CREATE INDEX IF NOT EXISTS idx_org_members_is_active ON org_members (is_active);

