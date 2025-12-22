-- Insert HEAD business unit
-- id: 6, code: HEAD, name: 본사
-- This migration runs after 0012 which adds 'HEAD' to the bu_code enum
INSERT INTO public.business_units (id, code, name)
VALUES (6, 'HEAD', '본사')
ON CONFLICT (id) DO NOTHING;

