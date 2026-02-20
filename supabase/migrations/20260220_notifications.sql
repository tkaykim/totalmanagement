-- 인앱 알림 테이블 (Phase 4)
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications(user_id, is_read, created_at DESC);

COMMENT ON TABLE public.notifications IS '아티스트/사용자 인앱 알림';
COMMENT ON COLUMN public.notifications.type IS 'proposal, settlement_confirmed, settlement_paid, task_assigned, task_due_reminder 등';
COMMENT ON COLUMN public.notifications.data IS 'project_id, task_id, settlement_id 등 링크용 데이터';
