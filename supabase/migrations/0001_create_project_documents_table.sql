-- 프로젝트 문서 테이블 생성
CREATE TABLE IF NOT EXISTS public.project_documents (
  id bigint NOT NULL DEFAULT nextval('project_documents_id_seq'::regclass),
  project_id bigint NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  mime_type text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT project_documents_pkey PRIMARY KEY (id),
  CONSTRAINT project_documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT project_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.app_users(id)
);

-- 시퀀스 생성 (없는 경우)
CREATE SEQUENCE IF NOT EXISTS public.project_documents_id_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER SEQUENCE public.project_documents_id_seq OWNED BY public.project_documents.id;
ALTER TABLE public.project_documents ALTER COLUMN id SET DEFAULT nextval('public.project_documents_id_seq'::regclass);

-- updated_at 자동 업데이트 트리거 함수 (이미 존재할 수 있으므로 IF NOT EXISTS 사용 불가)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- updated_at 트리거 생성
DROP TRIGGER IF EXISTS update_project_documents_updated_at ON public.project_documents;
CREATE TRIGGER update_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON public.project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_by ON public.project_documents(uploaded_by);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 인증된 사용자가 조회 가능
CREATE POLICY IF NOT EXISTS "Allow authenticated users to view project documents"
  ON public.project_documents
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS 정책: 모든 인증된 사용자가 문서 업로드 가능
CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert project documents"
  ON public.project_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS 정책: 모든 인증된 사용자가 문서 삭제 가능
CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete project documents"
  ON public.project_documents
  FOR DELETE
  TO authenticated
  USING (true);

-- 주석 추가
COMMENT ON TABLE public.project_documents IS '프로젝트 관련 문서 파일 정보';
COMMENT ON COLUMN public.project_documents.project_id IS '프로젝트 ID';
COMMENT ON COLUMN public.project_documents.file_name IS '원본 파일명';
COMMENT ON COLUMN public.project_documents.file_path IS 'Supabase Storage 경로';
COMMENT ON COLUMN public.project_documents.file_type IS '문서 유형 (계약서, 계산서 등)';
COMMENT ON COLUMN public.project_documents.file_size IS '파일 크기 (bytes)';
COMMENT ON COLUMN public.project_documents.mime_type IS 'MIME 타입';
COMMENT ON COLUMN public.project_documents.uploaded_by IS '업로드한 사용자 ID';

-- 중요: Supabase Storage 버킷 생성 필요
-- 이 마이그레이션을 실행한 후, Supabase 대시보드에서 다음 버킷을 생성해야 합니다:
-- 1. 버킷 이름: 'project-documents'
-- 2. Public 버킷으로 설정 (공개 읽기 허용)
-- 3. 파일 크기 제한: 필요에 따라 설정 (기본값 사용 가능)
-- 4. 허용된 MIME 타입: 모든 파일 타입 허용 또는 필요한 타입만 지정
--
-- Storage 정책 설정:
-- - SELECT: 인증된 사용자 모두 허용
-- - INSERT: 인증된 사용자 모두 허용
-- - UPDATE: 인증된 사용자 모두 허용
-- - DELETE: 인증된 사용자 모두 허용

