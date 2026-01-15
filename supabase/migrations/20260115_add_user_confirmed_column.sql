-- 자동 퇴근 처리 기록에 대해 사용자 확인 여부를 추적하는 컬럼 추가
-- 사용자가 전일 퇴근 시간을 입력하거나 확인하면 true로 변경됨

ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS user_confirmed BOOLEAN DEFAULT true;

-- 기존의 자동 퇴근 처리된 기록들은 user_confirmed를 false로 설정
-- (사용자가 아직 실제 퇴근 시간을 입력하지 않은 것으로 간주)
UPDATE attendance_logs 
SET user_confirmed = false 
WHERE is_auto_checkout = true 
  AND user_confirmed IS NULL;

-- user_confirmed 컬럼에 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_attendance_logs_pending_confirm 
ON attendance_logs (user_id, is_auto_checkout, user_confirmed) 
WHERE is_auto_checkout = true AND user_confirmed = false;

-- 코멘트 추가
COMMENT ON COLUMN attendance_logs.user_confirmed IS '자동 퇴근 처리 후 사용자가 실제 퇴근 시간을 확인/입력했는지 여부';
