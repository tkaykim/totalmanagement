-- 0017_create_comment_mentions_reads_table.sql
-- 댓글 멘션 읽음 처리 테이블 생성

-- 1) comment_mentions_reads 테이블 생성
CREATE TABLE IF NOT EXISTS public.comment_mentions_reads (
  id BIGSERIAL NOT NULL,
  comment_id bigint NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comment_mentions_reads_pkey PRIMARY KEY (id),
  CONSTRAINT comment_mentions_reads_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE,
  CONSTRAINT comment_mentions_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE,
  CONSTRAINT comment_mentions_reads_unique UNIQUE (comment_id, user_id)
);

-- 2) 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_comment_mentions_reads_user_id ON public.comment_mentions_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_reads_comment_id ON public.comment_mentions_reads(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_reads_read_at ON public.comment_mentions_reads(read_at DESC);

