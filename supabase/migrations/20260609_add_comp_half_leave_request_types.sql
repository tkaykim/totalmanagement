-- 대체휴무 0.5일(반차) 사용 지원 (버그리포트 #21)
-- 기존: 대체휴무는 1일 단위로만 소진 가능 (0.5일은 연차 반차에만 적용)
-- 개선: 연차 half_am/half_pm 패턴을 미러링한 대체휴무 반차 타입 신설
ALTER TYPE leave_request_type ADD VALUE IF NOT EXISTS 'comp_half_am';
ALTER TYPE leave_request_type ADD VALUE IF NOT EXISTS 'comp_half_pm';
