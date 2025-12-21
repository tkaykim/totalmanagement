-- Add upload_days column to channels table
-- This stores the days of the week when content is uploaded (e.g., ['monday', 'wednesday', 'friday'])
ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS upload_days text[] DEFAULT NULL;

COMMENT ON COLUMN public.channels.upload_days IS '매주 업로드되는 요일 배열 (예: ["monday", "wednesday", "friday"])';


