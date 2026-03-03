-- bug_reports.status에 'on_hold'(보류) 값 추가
ALTER TYPE public.bug_report_status ADD VALUE IF NOT EXISTS 'on_hold';

COMMENT ON COLUMN public.bug_reports.status IS 'pending: 접수됨, on_hold: 보류, resolved: 처리완료';
