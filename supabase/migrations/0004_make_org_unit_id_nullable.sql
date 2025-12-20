-- Make org_unit_id and title nullable in org_members table
-- This allows staff members to be registered without an organization unit or title

ALTER TABLE org_members
  ALTER COLUMN org_unit_id DROP NOT NULL,
  ALTER COLUMN title DROP NOT NULL;

