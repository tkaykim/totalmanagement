-- 0016_create_comments_table.sql
-- 할일(task)과 프로젝트(project)에 댓글을 남기는 기능을 위한 comments 테이블 생성

-- 1) comments 테이블 생성 (BIGSERIAL은 자동으로 시퀀스를 생성함)
CREATE TABLE IF NOT EXISTS public.comments (
  id BIGSERIAL NOT NULL,
  entity_type text NOT NULL CHECK (entity_type = ANY (ARRAY['task'::text, 'project'::text])),
  entity_id bigint NOT NULL,
  content text NOT NULL,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  mentioned_user_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.app_users(id) ON DELETE CASCADE
);

-- 3) 인덱스 생성 (entity_type과 entity_id로 빠른 조회)
CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.comments(entity_type, entity_id);

-- 4) author_id 인덱스 생성 (작성자별 조회용)
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);

-- 5) created_at 인덱스 생성 (최신순 정렬용)
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

