-- 데이터 마이그레이션: client_company, client_worker, external_workers → partner_company, partner_worker

-- 1. client_company 데이터를 partner_company로 마이그레이션
INSERT INTO public.partner_company (
  id, bu_code, company_name_en, company_name_ko, industry, 
  business_registration_number, representative_name, partner_type, 
  status, last_meeting_date, business_registration_file, 
  created_at, updated_at
)
SELECT 
  id, bu_code, company_name_en, company_name_ko, industry,
  business_registration_number, representative_name, 'client'::text as partner_type,
  status, last_meeting_date, business_registration_file,
  created_at, updated_at
FROM public.client_company
ON CONFLICT (id) DO NOTHING;

-- 2. external_workers에서 company_name이 있는 경우 partner_company 생성
INSERT INTO public.partner_company (
  bu_code, company_name_ko, partner_type, status, created_at, updated_at
)
SELECT DISTINCT
  bu_code,
  company_name as company_name_ko,
  CASE 
    WHEN worker_type = 'company' THEN 'vendor'::text
    WHEN worker_type = 'contractor' THEN 'contractor'::text
    ELSE 'vendor'::text
  END as partner_type,
  CASE 
    WHEN is_active = true THEN 'active'::client_status
    ELSE 'inactive'::client_status
  END as status,
  MIN(created_at) as created_at,
  MAX(updated_at) as updated_at
FROM public.external_workers
WHERE company_name IS NOT NULL 
  AND company_name != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.partner_company 
    WHERE partner_company.company_name_ko = external_workers.company_name
      AND partner_company.bu_code = external_workers.bu_code
  )
GROUP BY bu_code, company_name, worker_type, is_active
ON CONFLICT DO NOTHING;

-- 3. client_worker를 partner_worker로 마이그레이션
INSERT INTO public.partner_worker (
  partner_company_id, bu_code, name_en, name_ko, worker_type,
  phone, email, business_card_file, is_active, created_at, updated_at
)
SELECT 
  client_company_id as partner_company_id,
  (SELECT bu_code FROM public.client_company WHERE id = client_worker.client_company_id) as bu_code,
  name_en, name_ko, 'employee'::text as worker_type,
  phone, email, business_card_file, true as is_active,
  created_at, updated_at
FROM public.client_worker
ON CONFLICT DO NOTHING;

-- 4. external_workers를 partner_worker로 마이그레이션
INSERT INTO public.partner_worker (
  partner_company_id, bu_code, name, worker_type,
  phone, email, specialties, notes, is_active, created_at, updated_at
)
SELECT 
  CASE 
    WHEN ew.company_name IS NOT NULL AND ew.company_name != '' THEN
      (SELECT id FROM public.partner_company 
       WHERE company_name_ko = ew.company_name 
         AND bu_code = ew.bu_code 
       LIMIT 1)
    ELSE NULL
  END as partner_company_id,
  ew.bu_code,
  ew.name,
  CASE 
    WHEN ew.worker_type = 'company' THEN 'contractor'::text
    ELSE ew.worker_type
  END as worker_type,
  ew.phone,
  ew.email,
  ew.specialties,
  ew.notes,
  ew.is_active,
  ew.created_at,
  ew.updated_at
FROM public.external_workers ew
ON CONFLICT DO NOTHING;

