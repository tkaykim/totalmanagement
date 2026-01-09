-- 1. 기존 트리거와 함수 삭제 (CASCADE)
DROP TRIGGER IF EXISTS trigger_attendance_correction_approval ON work_requests;
DROP TRIGGER IF EXISTS attendance_correction_approval_trigger ON work_requests;
DROP FUNCTION IF EXISTS handle_attendance_correction_approval() CASCADE;

-- 2. attendance_logs에 (user_id, work_date)에 대한 unique index가 있는지 확인하고 없으면 생성
-- 이미 있을 수 있으므로 IF NOT EXISTS 사용
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_logs_user_date ON attendance_logs(user_id, work_date)
WHERE check_out_at IS NOT NULL OR is_overtime = false;

-- 참고: 위 조건부 인덱스 대신 단순한 접근 방식 사용 - 트리거에서 직접 처리
