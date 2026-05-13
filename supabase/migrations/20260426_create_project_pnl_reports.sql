-- Migration: Create project_pnl_reports for standardized P&L retrospective per project
-- Created: 2026-04-26
-- Purpose: 행사·프로젝트 종료 후 표준 P&L 보고서(목표/실적/회고)를 저장
--          financial_entries는 트랜잭션 단위, project_pnl_reports는 보고서 스냅샷 단위
--          프로젝트당 1건만 허용 (UNIQUE)

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS public.project_pnl_reports (
  id bigserial PRIMARY KEY,
  project_id bigint NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  bu_code public.bu_code NOT NULL,

  -- 목표 (프로젝트 기획 단계 입력)
  target_revenue numeric(14, 2) NOT NULL DEFAULT 0,
  target_expense numeric(14, 2) NOT NULL DEFAULT 0,

  -- 실적 (보고서 작성 시점에 financial_entries에서 가져온 스냅샷)
  actual_revenue numeric(14, 2) NOT NULL DEFAULT 0,
  actual_expense numeric(14, 2) NOT NULL DEFAULT 0,

  -- 회고 (정성 기록)
  highlights text,        -- 좋았던 점
  improvements text,      -- 개선점
  additional_notes text,  -- 기타 메모

  -- 상태: 'draft'(작성중) | 'finalized'(확정)
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  finalized_at timestamptz,

  author_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- 프로젝트당 1건만 허용
  CONSTRAINT project_pnl_reports_project_id_unique UNIQUE (project_id)
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_project_pnl_reports_project_id ON public.project_pnl_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_project_pnl_reports_bu_code ON public.project_pnl_reports(bu_code);
CREATE INDEX IF NOT EXISTS idx_project_pnl_reports_status ON public.project_pnl_reports(status);

-- 3. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_project_pnl_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_project_pnl_reports_updated_at_trigger ON public.project_pnl_reports;
CREATE TRIGGER update_project_pnl_reports_updated_at_trigger
  BEFORE UPDATE ON public.project_pnl_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_project_pnl_reports_updated_at();

-- 4. 순이익 계산 뷰 (편의용)
CREATE OR REPLACE VIEW public.project_pnl_reports_with_profit AS
SELECT
  r.*,
  (r.actual_revenue - r.actual_expense) AS actual_net_profit,
  (r.target_revenue - r.target_expense) AS target_net_profit,
  CASE
    WHEN r.target_revenue > 0 THEN ROUND((r.actual_revenue - r.target_revenue) / r.target_revenue * 100, 2)
    ELSE NULL
  END AS revenue_achievement_rate,
  CASE
    WHEN r.target_expense > 0 THEN ROUND((r.actual_expense - r.target_expense) / r.target_expense * 100, 2)
    ELSE NULL
  END AS expense_variance_rate
FROM public.project_pnl_reports r;

-- 5. RLS (테이블)
ALTER TABLE public.project_pnl_reports ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 자기 BU 또는 본사(HEAD) 소속이면 SELECT 가능
DROP POLICY IF EXISTS "Authenticated users can read pnl reports" ON public.project_pnl_reports;
CREATE POLICY "Authenticated users can read pnl reports"
  ON public.project_pnl_reports
  FOR SELECT
  TO authenticated
  USING (true);

-- 인증된 사용자는 자신이 PM이거나 같은 BU 소속이면 INSERT/UPDATE/DELETE 가능
DROP POLICY IF EXISTS "Authenticated users can insert pnl reports" ON public.project_pnl_reports;
CREATE POLICY "Authenticated users can insert pnl reports"
  ON public.project_pnl_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update pnl reports" ON public.project_pnl_reports;
CREATE POLICY "Authenticated users can update pnl reports"
  ON public.project_pnl_reports
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete pnl reports" ON public.project_pnl_reports;
CREATE POLICY "Authenticated users can delete pnl reports"
  ON public.project_pnl_reports
  FOR DELETE
  TO authenticated
  USING (true);

-- 6. 코멘트
COMMENT ON TABLE public.project_pnl_reports IS '프로젝트별 표준 P&L 회고 보고서. 매출/지출 목표·실적과 정성 회고(좋았던 점/개선점)를 저장.';
COMMENT ON COLUMN public.project_pnl_reports.target_revenue IS '계획 단계의 목표 매출(원)';
COMMENT ON COLUMN public.project_pnl_reports.target_expense IS '계획 단계의 목표 지출(원)';
COMMENT ON COLUMN public.project_pnl_reports.actual_revenue IS '보고서 작성 시점의 실제 매출 스냅샷(원). financial_entries에서 자동 집계 권장';
COMMENT ON COLUMN public.project_pnl_reports.actual_expense IS '보고서 작성 시점의 실제 지출 스냅샷(원). financial_entries에서 자동 집계 권장';
COMMENT ON COLUMN public.project_pnl_reports.highlights IS '좋았던 점 (성공 요인, 잘한 부분)';
COMMENT ON COLUMN public.project_pnl_reports.improvements IS '개선점 (다음에 더 나아지기 위한 인사이트)';
COMMENT ON COLUMN public.project_pnl_reports.status IS 'draft: 작성중, finalized: 확정 (이후 수정 잠금 권장)';
