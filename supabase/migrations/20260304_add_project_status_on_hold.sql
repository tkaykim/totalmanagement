-- projects.status용 project_status enum에 '보류' 값 추가
-- 프로젝트 생성/수정 시 상태를 '보류'로 선택해도 등록되도록 함
ALTER TYPE project_status ADD VALUE IF NOT EXISTS '보류';

COMMENT ON COLUMN public.projects.status IS '준비중, 기획중, 진행중, 운영중, 보류, 완료';
