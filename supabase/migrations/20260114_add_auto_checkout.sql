-- 강제 퇴근 처리를 위한 is_auto_checkout 필드 추가
-- 밤 11시 59분까지 퇴근 기록이 없으면 오후 6시로 강제 퇴근 처리됨을 표시

ALTER TABLE attendance_logs
ADD COLUMN IF NOT EXISTS is_auto_checkout BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN attendance_logs.is_auto_checkout IS '시스템에 의한 강제 퇴근 여부 (당일 23:59까지 퇴근하지 않으면 18:00으로 자동 처리)';
