-- 아티스트 제안 수락/거절 응답 저장 (Phase 2)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS artist_response TEXT
    CHECK (artist_response IN ('pending', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS artist_response_note TEXT,
  ADD COLUMN IF NOT EXISTS artist_responded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.projects.artist_response IS '아티스트 제안 응답: pending(검토중), accepted(수락), rejected(거절)';
COMMENT ON COLUMN public.projects.artist_response_note IS '아티스트 응답 시 메모';
COMMENT ON COLUMN public.projects.artist_responded_at IS '아티스트 응답 일시';
