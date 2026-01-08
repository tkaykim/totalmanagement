-- 외래키 참조 업데이트

-- projects 테이블의 client_id 외래키를 partner_company로 변경
ALTER TABLE public.projects 
  DROP CONSTRAINT IF EXISTS fk_projects_client_company_id;

ALTER TABLE public.projects
  ADD CONSTRAINT fk_projects_partner_company_id 
  FOREIGN KEY (client_id) REFERENCES public.partner_company(id) ON DELETE SET NULL;

-- projects.participants JSONB 필드의 external_worker_id를 partner_worker_id로 업데이트
-- 참고: 이 작업은 애플리케이션 레벨에서도 처리해야 함
UPDATE public.projects
SET participants = (
  SELECT jsonb_agg(
    CASE 
      WHEN participant->>'external_worker_id' IS NOT NULL THEN
        jsonb_set(
          participant - 'external_worker_id',
          '{partner_worker_id}',
          participant->'external_worker_id'
        )
      ELSE participant
    END
  )
  FROM jsonb_array_elements(participants) AS participant
)
WHERE participants IS NOT NULL 
  AND jsonb_array_length(participants) > 0
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(participants) AS p
    WHERE p->>'external_worker_id' IS NOT NULL
  );



