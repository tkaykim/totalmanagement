-- Migration: Create Attendance Management System
-- Date: 2025-01-XX
-- Description:
--   1. Create ENUM types for attendance system
--   2. Create office_ips table (for future IP validation - not used initially)
--   3. Create work_requests table for work requests and corrections
--   4. Create attendance_logs table for check-in/check-out records
--   5. Set up indexes, constraints, and RLS policies
--   6. Create trigger function for automatic attendance_logs update on correction approval

BEGIN;

-- ============================================
-- 1. ENUM 타입 정의
-- ============================================

-- 근태 상태
DO $$ BEGIN
    CREATE TYPE public.attendance_type AS ENUM (
        'present',      -- 정상 출근
        'late',         -- 지각
        'early_leave',  -- 조퇴
        'absent',       -- 결근
        'vacation',     -- 휴가
        'remote',       -- 재택
        'external'      -- 외근
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 결재 상태
DO $$ BEGIN
    CREATE TYPE public.approval_status AS ENUM (
        'pending',   -- 대기중
        'approved',  -- 승인됨
        'rejected'   -- 반려됨
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 근무/수정 신청 유형
DO $$ BEGIN
    CREATE TYPE public.work_request_type AS ENUM (
        'external_work',        -- 외근 신청
        'remote_work',          -- 재택 신청
        'overtime',             -- 연장/야근 신청
        'attendance_correction' -- 근태 정정 신청 (출퇴근 누락/오류 수정)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. 테이블 생성
-- ============================================

-- 사내 네트워크 IP 화이트리스트 (초기에는 사용하지 않음)
CREATE TABLE IF NOT EXISTS public.office_ips (
    id SERIAL PRIMARY KEY,
    name text NOT NULL,
    ip_address inet NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.office_ips IS '사내 네트워크 IP 화이트리스트 (Phase 3에서 사용 예정)';

-- 근무 및 정정 신청/결재 테이블
CREATE TABLE IF NOT EXISTS public.work_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    approver_id uuid REFERENCES public.app_users(id),
    
    request_type public.work_request_type NOT NULL,
    
    start_date date NOT NULL,
    end_date date NOT NULL,
    
    start_time time,
    end_time time,
    
    reason text NOT NULL,
    status public.approval_status DEFAULT 'pending'::public.approval_status,
    rejection_reason text,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.work_requests IS '근무 신청 및 정정 신청 테이블';
COMMENT ON COLUMN public.work_requests.start_time IS '외근/연장 근무 시: 예정된 시작 시간, 정정 신청 시: 정정하고자 하는 출근 시간';
COMMENT ON COLUMN public.work_requests.end_time IS '외근/연장 근무 시: 예정된 종료 시간, 정정 신청 시: 정정하고자 하는 퇴근 시간';

-- 출퇴근 기록 테이블
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    work_date date NOT NULL DEFAULT CURRENT_DATE,
    
    check_in_at timestamp with time zone,
    check_out_at timestamp with time zone,
    
    check_in_ip inet,
    check_out_ip inet,
    
    status public.attendance_type DEFAULT 'present'::public.attendance_type,
    
    is_modified boolean DEFAULT false,
    modification_reason text,
    
    is_verified_location boolean DEFAULT false,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT uniq_user_date UNIQUE (user_id, work_date)
);

COMMENT ON TABLE public.attendance_logs IS '출퇴근 기록 테이블';
COMMENT ON COLUMN public.attendance_logs.is_modified IS '시스템에 의해 자동 생성된 기록인지, 관리자/승인에 의해 수정된 기록인지 추적';
COMMENT ON COLUMN public.attendance_logs.modification_reason IS '예: "정정 신청 승인(Req ID: ...)"';
COMMENT ON COLUMN public.attendance_logs.is_verified_location IS '위치 검증 여부 (Phase 3에서 사용 예정)';

-- ============================================
-- 3. 인덱스 생성
-- ============================================

CREATE INDEX IF NOT EXISTS idx_work_requests_requester ON public.work_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_work_requests_status ON public.work_requests(status);
CREATE INDEX IF NOT EXISTS idx_work_requests_approver ON public.work_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_work_requests_dates ON public.work_requests(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance_logs(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_work_date ON public.attendance_logs(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_logs(status);

-- ============================================
-- 4. updated_at 자동 업데이트 트리거 함수
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- work_requests 테이블에 트리거 적용
DROP TRIGGER IF EXISTS update_work_requests_updated_at ON public.work_requests;
CREATE TRIGGER update_work_requests_updated_at
    BEFORE UPDATE ON public.work_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- attendance_logs 테이블에 트리거 적용
DROP TRIGGER IF EXISTS update_attendance_logs_updated_at ON public.attendance_logs;
CREATE TRIGGER update_attendance_logs_updated_at
    BEFORE UPDATE ON public.attendance_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. 정정 신청 승인 시 attendance_logs 자동 업데이트 트리거
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_attendance_correction_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_start_datetime timestamp with time zone;
    v_end_datetime timestamp with time zone;
BEGIN
    -- 정정 신청이 승인된 경우에만 처리
    IF NEW.status = 'approved'::public.approval_status 
       AND OLD.status != 'approved'::public.approval_status
       AND NEW.request_type = 'attendance_correction'::public.work_request_type THEN
        
        -- 날짜와 시간을 결합하여 timestamp 생성
        v_start_datetime := (NEW.start_date + NEW.start_time)::timestamp with time zone;
        v_end_datetime := (NEW.start_date + NEW.end_time)::timestamp with time zone;
        
        -- attendance_logs 업데이트 또는 삽입
        INSERT INTO public.attendance_logs (
            user_id,
            work_date,
            check_in_at,
            check_out_at,
            is_modified,
            modification_reason,
            status,
            updated_at
        )
        VALUES (
            NEW.requester_id,
            NEW.start_date,
            v_start_datetime,
            v_end_datetime,
            true,
            '정정 신청 승인(Req ID: ' || NEW.id::text || ')',
            'present'::public.attendance_type,
            now()
        )
        ON CONFLICT (user_id, work_date)
        DO UPDATE SET
            check_in_at = EXCLUDED.check_in_at,
            check_out_at = EXCLUDED.check_out_at,
            is_modified = true,
            modification_reason = EXCLUDED.modification_reason,
            updated_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_attendance_correction_approval ON public.work_requests;
CREATE TRIGGER trigger_attendance_correction_approval
    AFTER UPDATE ON public.work_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_attendance_correction_approval();

-- ============================================
-- 6. RLS (Row Level Security) 정책 설정
-- ============================================

-- work_requests 테이블 RLS 활성화
ALTER TABLE public.work_requests ENABLE ROW LEVEL SECURITY;

-- work_requests: 모든 사용자는 본인의 신청 조회 가능
CREATE POLICY "Users can view their own work requests"
    ON public.work_requests
    FOR SELECT
    USING (auth.uid() = requester_id);

-- work_requests: Manager는 본인 팀원(bu_code 일치)의 신청 조회 가능
CREATE POLICY "Managers can view team member work requests"
    ON public.work_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users au
            WHERE au.id = auth.uid()
            AND au.role IN ('manager', 'admin')
            AND au.bu_code = (
                SELECT bu_code FROM public.app_users
                WHERE id = work_requests.requester_id
            )
        )
    );

-- work_requests: Admin은 모든 신청 조회 가능
CREATE POLICY "Admins can view all work requests"
    ON public.work_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- work_requests: 모든 사용자는 본인의 신청 생성 가능
CREATE POLICY "Users can create their own work requests"
    ON public.work_requests
    FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

-- work_requests: Manager는 본인 팀원의 신청 승인/반려 가능
CREATE POLICY "Managers can update team member work requests"
    ON public.work_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users au
            WHERE au.id = auth.uid()
            AND au.role IN ('manager', 'admin')
            AND au.bu_code = (
                SELECT bu_code FROM public.app_users
                WHERE id = work_requests.requester_id
            )
        )
    );

-- work_requests: Admin은 모든 신청 승인/반려 가능
CREATE POLICY "Admins can update all work requests"
    ON public.work_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- attendance_logs 테이블 RLS 활성화
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- attendance_logs: 모든 사용자는 본인의 기록 조회 가능
CREATE POLICY "Users can view their own attendance logs"
    ON public.attendance_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- attendance_logs: Manager는 본인 팀원의 기록 조회 가능
CREATE POLICY "Managers can view team member attendance logs"
    ON public.attendance_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users au
            WHERE au.id = auth.uid()
            AND au.role IN ('manager', 'admin')
            AND au.bu_code = (
                SELECT bu_code FROM public.app_users
                WHERE id = attendance_logs.user_id
            )
        )
    );

-- attendance_logs: Admin은 모든 기록 조회 가능
CREATE POLICY "Admins can view all attendance logs"
    ON public.attendance_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- attendance_logs: 모든 사용자는 본인의 출퇴근 기록 생성/수정 가능
CREATE POLICY "Users can create and update their own attendance logs"
    ON public.attendance_logs
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- attendance_logs: Manager는 본인 팀원의 기록 수정 가능
CREATE POLICY "Managers can update team member attendance logs"
    ON public.attendance_logs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users au
            WHERE au.id = auth.uid()
            AND au.role IN ('manager', 'admin')
            AND au.bu_code = (
                SELECT bu_code FROM public.app_users
                WHERE id = attendance_logs.user_id
            )
        )
    );

-- attendance_logs: Admin은 모든 기록 수정 가능
CREATE POLICY "Admins can update all attendance logs"
    ON public.attendance_logs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- office_ips 테이블 RLS 활성화 (Phase 3에서 사용)
ALTER TABLE public.office_ips ENABLE ROW LEVEL SECURITY;

-- office_ips: Admin만 조회/수정 가능
CREATE POLICY "Admins can manage office IPs"
    ON public.office_ips
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

COMMIT;

