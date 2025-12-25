-- Allow NULL values for start_date and end_date in projects table
ALTER TABLE public.projects
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;


