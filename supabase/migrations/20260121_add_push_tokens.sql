-- Push Notification 토큰 저장 테이블
-- Capacitor 앱에서 FCM/APNs 토큰을 저장하고 관리

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  device_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- RLS 활성화
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 푸시 토큰만 관리 가능
CREATE POLICY "Users can view their own push tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- 서비스 역할은 모든 토큰 접근 가능 (푸시 발송용)
CREATE POLICY "Service role can manage all push tokens"
  ON push_tokens FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();

-- 코멘트
COMMENT ON TABLE push_tokens IS '모바일 앱 푸시 알림 토큰 저장 테이블';
COMMENT ON COLUMN push_tokens.token IS 'FCM 또는 APNs 디바이스 토큰';
COMMENT ON COLUMN push_tokens.platform IS '플랫폼 종류 (android, ios, web)';
COMMENT ON COLUMN push_tokens.device_id IS '디바이스 고유 식별자 (선택적)';
COMMENT ON COLUMN push_tokens.is_active IS '토큰 활성화 상태';
