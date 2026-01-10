-- Migration: Create activity_logs and daily_work_logs tables for 업무일지 feature
-- Created: 2026-01-10

-- activity_logs: 자동 수집되는 활동 로그
CREATE TABLE public.activity_logs (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE,
    action_type text NOT NULL,  -- 'project_created', 'task_assigned', 'task_status_changed', 'task_completed', 'financial_created', 'check_in', 'check_out' 등
    entity_type text NOT NULL,  -- 'project', 'task', 'financial_entry', 'attendance'
    entity_id text NOT NULL,
    entity_title text,          -- 빠른 조회용 (프로젝트명, 할일명 등)
    metadata jsonb DEFAULT '{}'::jsonb, -- 상세 정보 (이전 상태, 변경된 필드 등)
    occurred_at timestamptz DEFAULT now()
);

-- 인덱스: 사용자별 날짜 조회 최적화
CREATE INDEX idx_activity_logs_user_date ON public.activity_logs(user_id, occurred_at);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- 테이블 코멘트
COMMENT ON TABLE public.activity_logs IS '사용자 활동 로그 - 프로젝트/할일/재무/근태 등의 생성/수정 이벤트를 자동으로 추적';
COMMENT ON COLUMN public.activity_logs.action_type IS '활동 유형: project_created, task_assigned, task_status_changed, task_completed, financial_created, check_in, check_out 등';
COMMENT ON COLUMN public.activity_logs.entity_type IS '엔티티 유형: project, task, financial_entry, attendance';
COMMENT ON COLUMN public.activity_logs.entity_title IS '빠른 조회용 엔티티 제목 (프로젝트명, 할일명 등)';
COMMENT ON COLUMN public.activity_logs.metadata IS '상세 정보 JSON (이전 상태, 변경된 필드 등)';

-- daily_work_logs: 사용자가 직접 작성하는 일일 업무 일지
CREATE TABLE public.daily_work_logs (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE,
    log_date date NOT NULL,
    summary text,           -- 오늘 업무 요약
    notes text,             -- 특이사항/메모
    tomorrow_plan text,     -- 내일 할 일
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, log_date)
);

-- 인덱스: 사용자별 날짜 조회 최적화
CREATE INDEX idx_daily_work_logs_user_date ON public.daily_work_logs(user_id, log_date);

-- 테이블 코멘트
COMMENT ON TABLE public.daily_work_logs IS '일일 업무 일지 - 사용자가 직접 작성하는 업무 요약, 특이사항, 내일 할 일';
COMMENT ON COLUMN public.daily_work_logs.summary IS '오늘 업무 요약';
COMMENT ON COLUMN public.daily_work_logs.notes IS '특이사항/메모';
COMMENT ON COLUMN public.daily_work_logs.tomorrow_plan IS '내일 할 일';

-- RLS 정책 설정 (선택적 - 본인의 데이터만 접근 가능)
-- ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.daily_work_logs ENABLE ROW LEVEL SECURITY;
