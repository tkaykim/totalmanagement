-- =============================================================================
-- 20260925 봉인 되돌리기 (supabase/migrations/20260925000000_unified_ops_seal.sql 의 반대)
--
-- 정책·뷰 옵션·트리거·함수를 2026-09-24 기준선(supabase/baseline/20260924_prod_snapshot.sql)과
-- 같은 상태로 되돌린다. 정책 본문은 기준선에서 그대로 옮겼다.
-- 봉인 5개 테이블(3절)과 봉인 밖 47개 테이블의 정책 83개·RESTRICTIVE 정책 2개(3-2절)를 모두 되돌린다.
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

-- 3-2. 봉인 밖 테이블 정책 복원(마이그레이션 7절의 반대). 본문은 기준선과 동일.
--      판정 함수를 지우기(5절) 전에 해야 한다(정책이 is_active_staff()에 의존한다).
DROP POLICY IF EXISTS "seal active staff only" ON public.clients;
DROP POLICY IF EXISTS "seal active staff only" ON public.company_documents;

DROP POLICY IF EXISTS "erp authenticated full access" ON public.activity_logs;
CREATE POLICY "erp authenticated full access" ON public.activity_logs AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.agreements;
CREATE POLICY "erp authenticated full access" ON public.agreements AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update all attendance logs" ON public.attendance_logs;
CREATE POLICY "Admins can update all attendance logs" ON public.attendance_logs AS PERMISSIVE FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

DROP POLICY IF EXISTS "Admins can view all attendance logs" ON public.attendance_logs;
CREATE POLICY "Admins can view all attendance logs" ON public.attendance_logs AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

DROP POLICY IF EXISTS "Managers can update team member attendance logs" ON public.attendance_logs;
CREATE POLICY "Managers can update team member attendance logs" ON public.attendance_logs AS PERMISSIVE FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['manager'::public.erp_role, 'admin'::public.erp_role])) AND (au.bu_code = ( SELECT app_users.bu_code
           FROM public.app_users
          WHERE (app_users.id = attendance_logs.user_id)))))));

DROP POLICY IF EXISTS "Managers can view team member attendance logs" ON public.attendance_logs;
CREATE POLICY "Managers can view team member attendance logs" ON public.attendance_logs AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['manager'::public.erp_role, 'admin'::public.erp_role])) AND (au.bu_code = ( SELECT app_users.bu_code
           FROM public.app_users
          WHERE (app_users.id = attendance_logs.user_id)))))));

DROP POLICY IF EXISTS "Users can create and update their own attendance logs" ON public.attendance_logs;
CREATE POLICY "Users can create and update their own attendance logs" ON public.attendance_logs AS PERMISSIVE FOR ALL TO public
    USING ((auth.uid() = user_id))
    WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can view their own attendance logs" ON public.attendance_logs;
CREATE POLICY "Users can view their own attendance logs" ON public.attendance_logs AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.bug_reports;
CREATE POLICY "erp authenticated full access" ON public.bug_reports AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.business_signals;
CREATE POLICY "erp authenticated full access" ON public.business_signals AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.business_units;
CREATE POLICY "erp authenticated full access" ON public.business_units AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.channel_contents;
CREATE POLICY "erp authenticated full access" ON public.channel_contents AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.channels;
CREATE POLICY "erp authenticated full access" ON public.channels AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.clients;
CREATE POLICY "Allow authenticated delete" ON public.clients AS PERMISSIVE FOR DELETE TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.clients;
CREATE POLICY "Allow authenticated insert" ON public.clients AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update" ON public.clients;
CREATE POLICY "Allow authenticated update" ON public.clients AS PERMISSIVE FOR UPDATE TO authenticated
    USING (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.comment_attachments;
CREATE POLICY "erp authenticated full access" ON public.comment_attachments AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.comment_mentions_reads;
CREATE POLICY "erp authenticated full access" ON public.comment_mentions_reads AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.comments;
CREATE POLICY "erp authenticated full access" ON public.comments AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all compensatory requests" ON public.compensatory_requests;
CREATE POLICY "Admins can view all compensatory requests" ON public.compensatory_requests AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = ANY (ARRAY['admin'::public.erp_role, 'leader'::public.erp_role]))))));

DROP POLICY IF EXISTS "HEAD Admins can update compensatory requests" ON public.compensatory_requests;
CREATE POLICY "HEAD Admins can update compensatory requests" ON public.compensatory_requests AS PERMISSIVE FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role) AND (app_users.bu_code = 'HEAD'::public.bu_code)))));

DROP POLICY IF EXISTS "Users can create own compensatory requests" ON public.compensatory_requests;
CREATE POLICY "Users can create own compensatory requests" ON public.compensatory_requests AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((auth.uid() = requester_id));

DROP POLICY IF EXISTS "Users can view own compensatory requests" ON public.compensatory_requests;
CREATE POLICY "Users can view own compensatory requests" ON public.compensatory_requests AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = requester_id));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.contracts;
CREATE POLICY "erp authenticated full access" ON public.contracts AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.daily_work_logs;
CREATE POLICY "erp authenticated full access" ON public.daily_work_logs AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.document_room_files;
CREATE POLICY "erp authenticated full access" ON public.document_room_files AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.equipment;
CREATE POLICY "erp authenticated full access" ON public.equipment AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS admin_manage_gowid_cards ON public.gowid_cards;
CREATE POLICY admin_manage_gowid_cards ON public.gowid_cards AS PERMISSIVE FOR ALL TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

DROP POLICY IF EXISTS authenticated_users_read_gowid_cards ON public.gowid_cards;
CREATE POLICY authenticated_users_read_gowid_cards ON public.gowid_cards AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL));

DROP POLICY IF EXISTS admin_manage_gowid_mapping ON public.gowid_user_mapping;
CREATE POLICY admin_manage_gowid_mapping ON public.gowid_user_mapping AS PERMISSIVE FOR ALL TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

DROP POLICY IF EXISTS users_view_own_gowid_mapping ON public.gowid_user_mapping;
CREATE POLICY users_view_own_gowid_mapping ON public.gowid_user_mapping AS PERMISSIVE FOR SELECT TO public
    USING ((erp_user_id = auth.uid()));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.inquiries;
CREATE POLICY "erp authenticated full access" ON public.inquiries AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage leave balances" ON public.leave_balances;
CREATE POLICY "Admins can manage leave balances" ON public.leave_balances AS PERMISSIVE FOR ALL TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role) AND (app_users.bu_code = 'HEAD'::public.bu_code)))));

DROP POLICY IF EXISTS "Admins can view all leave balances" ON public.leave_balances;
CREATE POLICY "Admins can view all leave balances" ON public.leave_balances AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = ANY (ARRAY['admin'::public.erp_role, 'leader'::public.erp_role]))))));

DROP POLICY IF EXISTS "Users can view own leave balances" ON public.leave_balances;
CREATE POLICY "Users can view own leave balances" ON public.leave_balances AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Admins can view all leave grants" ON public.leave_grants;
CREATE POLICY "Admins can view all leave grants" ON public.leave_grants AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = ANY (ARRAY['admin'::public.erp_role, 'leader'::public.erp_role]))))));

DROP POLICY IF EXISTS "HEAD Admins can manage leave grants" ON public.leave_grants;
CREATE POLICY "HEAD Admins can manage leave grants" ON public.leave_grants AS PERMISSIVE FOR ALL TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role) AND (app_users.bu_code = 'HEAD'::public.bu_code)))));

DROP POLICY IF EXISTS "Users can view own leave grants" ON public.leave_grants;
CREATE POLICY "Users can view own leave grants" ON public.leave_grants AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Admins can create leave requests for any user" ON public.leave_requests;
CREATE POLICY "Admins can create leave requests for any user" ON public.leave_requests AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

DROP POLICY IF EXISTS "Admins can view all leave requests" ON public.leave_requests;
CREATE POLICY "Admins can view all leave requests" ON public.leave_requests AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

DROP POLICY IF EXISTS "Leaders and Admins can update leave requests" ON public.leave_requests;
CREATE POLICY "Leaders and Admins can update leave requests" ON public.leave_requests AS PERMISSIVE FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = ANY (ARRAY['admin'::public.erp_role, 'leader'::public.erp_role]))))));

DROP POLICY IF EXISTS "Leaders can view BU leave requests" ON public.leave_requests;
CREATE POLICY "Leaders can view BU leave requests" ON public.leave_requests AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM (public.app_users au
     JOIN public.app_users req ON ((req.id = leave_requests.requester_id)))
  WHERE ((au.id = auth.uid()) AND (au.role = 'leader'::public.erp_role) AND (au.bu_code = req.bu_code)))));

DROP POLICY IF EXISTS "Users can create own leave requests" ON public.leave_requests;
CREATE POLICY "Users can create own leave requests" ON public.leave_requests AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((auth.uid() = requester_id));

DROP POLICY IF EXISTS "Users can view own leave requests" ON public.leave_requests;
CREATE POLICY "Users can view own leave requests" ON public.leave_requests AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = requester_id));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.manuals;
CREATE POLICY "erp authenticated full access" ON public.manuals AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.meeting_rooms;
CREATE POLICY "erp authenticated full access" ON public.meeting_rooms AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications" ON public.notifications AS PERMISSIVE FOR INSERT TO public
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO public
    USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Admins can manage office IPs" ON public.office_ips;
CREATE POLICY "Admins can manage office IPs" ON public.office_ips AS PERMISSIVE FOR ALL TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.org_units;
CREATE POLICY "erp authenticated full access" ON public.org_units AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_access_requests;
CREATE POLICY "erp authenticated full access" ON public.partner_access_requests AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_bu_access;
CREATE POLICY "erp authenticated full access" ON public.partner_bu_access AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_categories;
CREATE POLICY "erp authenticated full access" ON public.partner_categories AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_category_mappings;
CREATE POLICY "erp authenticated full access" ON public.partner_category_mappings AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_relations;
CREATE POLICY "erp authenticated full access" ON public.partner_relations AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_settlement_projects;
CREATE POLICY "erp authenticated full access" ON public.partner_settlement_projects AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_settlements;
CREATE POLICY "erp authenticated full access" ON public.partner_settlements AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_user_access;
CREATE POLICY "erp authenticated full access" ON public.partner_user_access AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partners;
CREATE POLICY "erp authenticated full access" ON public.partners AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.portfolio_items;
CREATE POLICY "erp authenticated full access" ON public.portfolio_items AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.project_documents;
CREATE POLICY "erp authenticated full access" ON public.project_documents AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete pnl reports" ON public.project_pnl_reports;
CREATE POLICY "Authenticated users can delete pnl reports" ON public.project_pnl_reports AS PERMISSIVE FOR DELETE TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert pnl reports" ON public.project_pnl_reports;
CREATE POLICY "Authenticated users can insert pnl reports" ON public.project_pnl_reports AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read pnl reports" ON public.project_pnl_reports;
CREATE POLICY "Authenticated users can read pnl reports" ON public.project_pnl_reports AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can update pnl reports" ON public.project_pnl_reports;
CREATE POLICY "Authenticated users can update pnl reports" ON public.project_pnl_reports AS PERMISSIVE FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can delete their own push tokens" ON public.push_tokens AS PERMISSIVE FOR DELETE TO public
    USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can insert their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can insert their own push tokens" ON public.push_tokens AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can update their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can update their own push tokens" ON public.push_tokens AS PERMISSIVE FOR UPDATE TO public
    USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can view their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can view their own push tokens" ON public.push_tokens AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.quotes;
CREATE POLICY "erp authenticated full access" ON public.quotes AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.reservations;
CREATE POLICY "erp authenticated full access" ON public.reservations AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "erp authenticated full access" ON public.task_templates;
CREATE POLICY "erp authenticated full access" ON public.task_templates AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage all work status" ON public.user_work_status;
CREATE POLICY "Admins can manage all work status" ON public.user_work_status AS PERMISSIVE FOR ALL TO authenticated
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

DROP POLICY IF EXISTS "Allow authenticated users to view work status" ON public.user_work_status;
CREATE POLICY "Allow authenticated users to view work status" ON public.user_work_status AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update their own status" ON public.user_work_status;
CREATE POLICY "Users can update their own status" ON public.user_work_status AS PERMISSIVE FOR ALL TO authenticated
    USING ((user_id = auth.uid()))
    WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.vehicles;
CREATE POLICY "erp authenticated full access" ON public.vehicles AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update all work requests" ON public.work_requests;
CREATE POLICY "Admins can update all work requests" ON public.work_requests AS PERMISSIVE FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

DROP POLICY IF EXISTS "Admins can view all work requests" ON public.work_requests;
CREATE POLICY "Admins can view all work requests" ON public.work_requests AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

DROP POLICY IF EXISTS "Managers can update team member work requests" ON public.work_requests;
CREATE POLICY "Managers can update team member work requests" ON public.work_requests AS PERMISSIVE FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['manager'::public.erp_role, 'admin'::public.erp_role])) AND (au.bu_code = ( SELECT app_users.bu_code
           FROM public.app_users
          WHERE (app_users.id = work_requests.requester_id)))))));

DROP POLICY IF EXISTS "Managers can view team member work requests" ON public.work_requests;
CREATE POLICY "Managers can view team member work requests" ON public.work_requests AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['manager'::public.erp_role, 'admin'::public.erp_role])) AND (au.bu_code = ( SELECT app_users.bu_code
           FROM public.app_users
          WHERE (app_users.id = work_requests.requester_id)))))));

DROP POLICY IF EXISTS "Users can create their own work requests" ON public.work_requests;
CREATE POLICY "Users can create their own work requests" ON public.work_requests AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((auth.uid() = requester_id));

DROP POLICY IF EXISTS "Users can view their own work requests" ON public.work_requests;
CREATE POLICY "Users can view their own work requests" ON public.work_requests AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = requester_id));

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
