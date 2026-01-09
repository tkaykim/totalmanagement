-- 실시간 사용자 근무 상태 테이블 (휴식, 미팅, 외근 등 추적)
CREATE TABLE IF NOT EXISTS user_work_status (
  user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'WORKING' CHECK (status IN ('WORKING', 'MEETING', 'OUTSIDE', 'BREAK', 'OFF_WORK')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_work_status_status ON user_work_status(status);

-- RLS 활성화
ALTER TABLE user_work_status ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 인증된 사용자가 조회 가능
CREATE POLICY "Allow authenticated users to view work status" ON user_work_status
  FOR SELECT TO authenticated USING (true);

-- 정책: 본인만 수정 가능
CREATE POLICY "Users can update their own status" ON user_work_status
  FOR ALL TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 정책: 관리자는 모든 상태 조회/수정 가능
CREATE POLICY "Admins can manage all work status" ON user_work_status
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE user_work_status IS '실시간 사용자 근무 상태 추적 테이블';
COMMENT ON COLUMN user_work_status.status IS 'WORKING(근무중), MEETING(미팅), OUTSIDE(외근), BREAK(휴식), OFF_WORK(미출근/퇴근)';
