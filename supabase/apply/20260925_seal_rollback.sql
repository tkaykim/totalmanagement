-- =============================================================================
-- 20260925 봉인 되돌리기 (supabase/migrations/20260925000000_unified_ops_seal.sql 의 반대)
--
-- 정책·뷰 옵션·트리거·함수를 2026-09-24 기준선(supabase/baseline/20260924_prod_snapshot.sql)과
-- 같은 상태로 되돌린다. 정책 본문은 기준선에서 그대로 옮겼다.
--
-- 남겨 두는 것(추가만 한 객체, 감사 기록 보존):
-- - financial_entry_changes, app_user_changes 테이블과 그 행(RLS 켜짐, 정책 없음 = 서비스 권한만)
-- - financial_entries.updated_by, app_users.updated_by 칸(비어 있는 nullable 칸)
--
-- 데이터 보정을 함께 되돌릴 때는 20260925_data_fix_rollback.sql 을 먼저 실행한다
-- (그 파일이 app_user_changes 기록으로 대상을 찾는다).
-- 운영 적용은 대표 승인 뒤, 한 트랜잭션으로 실행한다.
-- =============================================================================

BEGIN;

-- 1. 뷰: 소유자 권한으로 복귀(기준선에는 security_invoker 옵션이 없다)
ALTER VIEW public.attendance_logs_with_user RESET (security_invoker);
ALTER VIEW public.project_pnl_reports_with_profit RESET (security_invoker);

-- 2. 새 정책 제거
DROP POLICY IF EXISTS "seal read app_users" ON public.app_users;
DROP POLICY IF EXISTS "seal read projects" ON public.projects;
DROP POLICY IF EXISTS "seal read project_tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "seal read financial_entries" ON public.financial_entries;
DROP POLICY IF EXISTS "seal read gowid_expense_project_link" ON public.gowid_expense_project_link;
DROP POLICY IF EXISTS "seal read financial_entry_changes" ON public.financial_entry_changes;
DROP POLICY IF EXISTS "seal read app_user_changes" ON public.app_user_changes;

-- 3. 기준선 정책 복원(본문은 기준선과 동일)
CREATE POLICY "erp authenticated full access" ON public.app_users AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "signup can insert app_users" ON public.app_users AS PERMISSIVE FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.financial_entries AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY authenticated_users_manage_expense_project_link ON public.gowid_expense_project_link AS PERMISSIVE FOR ALL TO public
    USING ((auth.uid() IS NOT NULL));

CREATE POLICY "erp authenticated full access" ON public.project_tasks AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.projects AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. 트리거 제거(기준선에서 이 5개 테이블의 트리거는 projects_set_bu_role_defaults 하나뿐이며 건드리지 않았다)
DROP TRIGGER IF EXISTS app_users_a_guard_self_change ON public.app_users;
DROP TRIGGER IF EXISTS app_users_b_log_changes ON public.app_users;
DROP TRIGGER IF EXISTS financial_entries_log_changes ON public.financial_entries;
DROP TRIGGER IF EXISTS financial_entries_guard_delete ON public.financial_entries;
DROP TRIGGER IF EXISTS projects_guard_delete ON public.projects;

-- 5. 함수 제거
DROP FUNCTION IF EXISTS public.app_users_guard_self_change();
DROP FUNCTION IF EXISTS public.app_users_log_changes();
DROP FUNCTION IF EXISTS public.financial_entries_log_changes();
DROP FUNCTION IF EXISTS public.financial_entries_guard_delete();
DROP FUNCTION IF EXISTS public.projects_guard_delete();
DROP FUNCTION IF EXISTS public.can_view_financial_entry_changes(bigint);
DROP FUNCTION IF EXISTS public.can_view_project(bigint);
DROP FUNCTION IF EXISTS public.is_staff_admin_or_leader();
DROP FUNCTION IF EXISTS public.is_staff_admin();
DROP FUNCTION IF EXISTS public.is_active_staff();

-- 6. 확인
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('app_users', 'projects', 'project_tasks', 'financial_entries', 'gowid_expense_project_link')
ORDER BY tablename, policyname;

COMMIT;
