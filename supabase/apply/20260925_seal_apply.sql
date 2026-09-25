-- =============================================================================
-- 20260925 봉인 운영 적용 스크립트 (한 트랜잭션)
--
-- 순서: BEGIN → 봉인 마이그레이션(migrations/20260925000000_unified_ops_seal.sql 전문)
--       → 데이터 보정(apply/20260925_data_fix.sql 전문) → 확인 SELECT → COMMIT
-- 아래 두 본문은 원본 파일과 글자 그대로 같아야 한다(tests/db/seal-apply-rollback.test.ts 가 확인한다).
-- 운영 적용은 대표 승인 뒤에 한다. 되돌리기: apply/20260925_data_fix_rollback.sql → apply/20260925_seal_rollback.sql
-- =============================================================================

BEGIN;

-- >>> BEGIN migrations/20260925000000_unified_ops_seal.sql
-- =============================================================================
-- 20260925000000_unified_ops_seal
-- 핵심 5개 테이블 권한 봉인 + 변경 기록 + 삭제 방지 + 뷰 호출자 권한
--
-- 봉인 대상(정확히 5개): app_users, projects, project_tasks, financial_entries,
--                        gowid_expense_project_link
-- 그 밖의 public 테이블(react_* 제외)은 로그인 계정 정책에 재직 직원 조건만 AND로 붙인다(7절).
-- 공개 읽기(anon) 정책과 service_role 정책은 건드리지 않는다.
--
-- - 추가만 한다. 기존 컬럼·enum 값은 지우거나 이름을 바꾸지 않는다.
-- - 5개 테이블의 authenticated 전권 정책, anon 가입 INSERT 정책, gowid 연결 전권 정책을 교체한다.
--   되돌리기: supabase/apply/20260925_seal_rollback.sql
-- - "service role full access" 정책과 "public read completed projects"(reactstudio.kr 공개)는 그대로 둔다.
-- - 쓰기(INSERT/UPDATE/DELETE)는 authenticated·anon 정책을 두지 않는다.
--   쓰기는 ERP 서버가 서비스 권한 키로 한다(서비스 권한은 RLS를 무시한다).
-- - due_date·paid_at 입력 강제는 DB에 넣지 않는다.
--
-- 판정 정의
-- - 재직 직원: app_users.status='active' AND bu_code IS NOT NULL
-- - admin: 재직 + role='admin' / leader: 재직 + role='leader'
-- - 그 밖(pending·rejected·retired·dormant, 사업부 없음, 비로그인)은 차단
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 칸·테이블 추가
-- -----------------------------------------------------------------------------

ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE TABLE IF NOT EXISTS public.financial_entry_changes (
    id bigserial PRIMARY KEY,
    entry_id bigint NOT NULL,
    action text NOT NULL CHECK (action IN ('insert', 'update')),
    field text NOT NULL,
    old_value text,
    new_value text,
    changed_by uuid,
    source text NOT NULL CHECK (source IN ('erp', 'external')),
    changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_financial_entry_changes_entry ON public.financial_entry_changes (entry_id, changed_at);

CREATE TABLE IF NOT EXISTS public.app_user_changes (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL,
    action text NOT NULL DEFAULT 'update' CHECK (action IN ('update')),
    field text NOT NULL,
    old_value text,
    new_value text,
    changed_by uuid,
    source text NOT NULL CHECK (source IN ('erp', 'external')),
    changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_user_changes_user ON public.app_user_changes (user_id, changed_at);

-- -----------------------------------------------------------------------------
-- 2. 판정 함수 (SECURITY DEFINER, search_path 고정)
--    소유자 권한으로 app_users를 읽으므로 app_users 정책이 자기 자신을 다시 부르지 않는다.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users u
    WHERE u.id = auth.uid()
      AND u.status = 'active'
      AND u.bu_code IS NOT NULL
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_staff_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users u
    WHERE u.id = auth.uid()
      AND u.status = 'active'
      AND u.bu_code IS NOT NULL
      AND u.role = 'admin'::public.erp_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_staff_admin_or_leader()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users u
    WHERE u.id = auth.uid()
      AND u.status = 'active'
      AND u.bu_code IS NOT NULL
      AND u.role IN ('admin'::public.erp_role, 'leader'::public.erp_role)
  );
$function$;

-- 프로젝트 보기
-- - admin·leader(전 사업부): 전체
-- - manager·member: 생성자(created_by), PM(pm_id), 참여자(projects.participants jsonb)
--   참여자 원소는 {"user_id": "<uuid>", ...} 객체(운영 데이터) 또는 "<uuid>" 문자열(옛 코드) 둘 다 인정
-- - manager: 같은 사업부 + PM이 지정된 프로젝트도 본다
CREATE OR REPLACE FUNCTION public.can_view_project(p_project_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users u
    JOIN public.projects p ON p.id = p_project_id
    WHERE u.id = auth.uid()
      AND u.status = 'active'
      AND u.bu_code IS NOT NULL
      AND (
        u.role IN ('admin'::public.erp_role, 'leader'::public.erp_role)
        OR (
          u.role IN ('manager'::public.erp_role, 'member'::public.erp_role)
          AND (
            p.created_by = u.id
            OR p.pm_id = u.id
            OR coalesce(p.participants, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('user_id', u.id::text))
            OR coalesce(p.participants, '[]'::jsonb) @> jsonb_build_array(to_jsonb(u.id::text))
            OR (u.role = 'manager'::public.erp_role AND p.pm_id IS NOT NULL AND p.bu_code = u.bu_code)
          )
        )
      )
  );
$function$;

-- 매출·지출 변경 기록 보기: admin, 그 행 사업부의 leader, 그 행 등록자
CREATE OR REPLACE FUNCTION public.can_view_financial_entry_changes(p_entry_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users u
    WHERE u.id = auth.uid()
      AND u.status = 'active'
      AND u.bu_code IS NOT NULL
      AND (
        u.role = 'admin'::public.erp_role
        OR EXISTS (
          SELECT 1 FROM public.financial_entries fe
          WHERE fe.id = p_entry_id
            AND (
              (u.role = 'leader'::public.erp_role AND fe.bu_code = u.bu_code)
              OR fe.created_by = u.id
            )
        )
      )
  );
$function$;

-- -----------------------------------------------------------------------------
-- 3. 트리거 함수
-- -----------------------------------------------------------------------------

-- 본인 역할·사업부·재직 상태 자체 변경 거부(서비스 권한 경로는 auth.uid()가 비어 있어 통과)
CREATE OR REPLACE FUNCTION public.app_users_guard_self_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND coalesce(auth.role(), '') <> 'service_role'
     AND (NEW.role IS DISTINCT FROM OLD.role
          OR NEW.bu_code IS DISTINCT FROM OLD.bu_code
          OR NEW.status IS DISTINCT FROM OLD.status)
  THEN
    RAISE EXCEPTION '본인의 역할·사업부·재직 상태는 직접 바꿀 수 없습니다.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

-- app_users 변경 기록: role, bu_code, status (UPDATE만 기록, updated_by는 항상 비운다)
CREATE OR REPLACE FUNCTION public.app_users_log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_source text;
  v_by uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.updated_by IS NULL OR NEW.updated_by IS NOT DISTINCT FROM OLD.updated_by THEN
      v_source := 'external';
      v_by := NULL;
    ELSE
      v_source := 'erp';
      v_by := NEW.updated_by;
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
      INSERT INTO public.app_user_changes (user_id, action, field, old_value, new_value, changed_by, source)
      VALUES (OLD.id, 'update', 'role', OLD.role::text, NEW.role::text, v_by, v_source);
    END IF;
    IF NEW.bu_code IS DISTINCT FROM OLD.bu_code THEN
      INSERT INTO public.app_user_changes (user_id, action, field, old_value, new_value, changed_by, source)
      VALUES (OLD.id, 'update', 'bu_code', OLD.bu_code::text, NEW.bu_code::text, v_by, v_source);
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.app_user_changes (user_id, action, field, old_value, new_value, changed_by, source)
      VALUES (OLD.id, 'update', 'status', OLD.status, NEW.status, v_by, v_source);
    END IF;
  END IF;

  NEW.updated_by := NULL;
  RETURN NEW;
END;
$function$;

-- financial_entries 변경 기록: amount, actual_amount, status, bu_code
-- INSERT는 field='*' 한 줄(요약). updated_by는 기록 후 항상 비운다(다음 변경에 재사용되지 않게).
CREATE OR REPLACE FUNCTION public.financial_entries_log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_source text;
  v_by uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.updated_by IS NOT NULL THEN
      v_source := 'erp';
      v_by := NEW.updated_by;
    ELSE
      v_source := 'external';
      v_by := NULL;
    END IF;
    INSERT INTO public.financial_entry_changes (entry_id, action, field, old_value, new_value, changed_by, source)
    VALUES (
      NEW.id, 'insert', '*', NULL,
      format('kind=%s status=%s bu_code=%s amount=%s actual_amount=%s',
             NEW.kind, NEW.status, NEW.bu_code, NEW.amount, coalesce(NEW.actual_amount::text, 'null')),
      v_by, v_source
    );
  ELSE
    IF NEW.updated_by IS NULL OR NEW.updated_by IS NOT DISTINCT FROM OLD.updated_by THEN
      v_source := 'external';
      v_by := NULL;
    ELSE
      v_source := 'erp';
      v_by := NEW.updated_by;
    END IF;

    IF NEW.amount IS DISTINCT FROM OLD.amount THEN
      INSERT INTO public.financial_entry_changes (entry_id, action, field, old_value, new_value, changed_by, source)
      VALUES (OLD.id, 'update', 'amount', OLD.amount::text, NEW.amount::text, v_by, v_source);
    END IF;
    IF NEW.actual_amount IS DISTINCT FROM OLD.actual_amount THEN
      INSERT INTO public.financial_entry_changes (entry_id, action, field, old_value, new_value, changed_by, source)
      VALUES (OLD.id, 'update', 'actual_amount', OLD.actual_amount::text, NEW.actual_amount::text, v_by, v_source);
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.financial_entry_changes (entry_id, action, field, old_value, new_value, changed_by, source)
      VALUES (OLD.id, 'update', 'status', OLD.status::text, NEW.status::text, v_by, v_source);
    END IF;
    IF NEW.bu_code IS DISTINCT FROM OLD.bu_code THEN
      INSERT INTO public.financial_entry_changes (entry_id, action, field, old_value, new_value, changed_by, source)
      VALUES (OLD.id, 'update', 'bu_code', OLD.bu_code::text, NEW.bu_code::text, v_by, v_source);
    END IF;
  END IF;

  NEW.updated_by := NULL;
  RETURN NEW;
END;
$function$;

-- paid·canceled 매출·지출 삭제 거부(서비스 권한 포함 전원)
CREATE OR REPLACE FUNCTION public.financial_entries_guard_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  IF OLD.status IN ('paid'::public.financial_status, 'canceled'::public.financial_status) THEN
    RAISE EXCEPTION '지급 완료(paid)·취소(canceled)된 매출·지출은 삭제할 수 없습니다. (id=%)', OLD.id
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$function$;

-- 재무 기록이 있는 프로젝트 삭제 거부.
-- BEFORE DELETE 트리거라 외래키 연쇄 삭제(financial_entries·project_tasks 등, ON DELETE CASCADE)보다 먼저 돈다.
CREATE OR REPLACE FUNCTION public.projects_guard_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.financial_entries fe WHERE fe.project_id = OLD.id) THEN
    RAISE EXCEPTION '재무 기록이 있는 프로젝트는 삭제할 수 없습니다. 보류로 바꾸세요. (project_id=%)', OLD.id
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 4. 트리거 (같은 시점 BEFORE 트리거는 이름 순서로 돈다: 가드 → 기록)
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS app_users_a_guard_self_change ON public.app_users;
CREATE TRIGGER app_users_a_guard_self_change BEFORE UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.app_users_guard_self_change();

DROP TRIGGER IF EXISTS app_users_b_log_changes ON public.app_users;
CREATE TRIGGER app_users_b_log_changes BEFORE INSERT OR UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.app_users_log_changes();

DROP TRIGGER IF EXISTS financial_entries_log_changes ON public.financial_entries;
CREATE TRIGGER financial_entries_log_changes BEFORE INSERT OR UPDATE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.financial_entries_log_changes();

DROP TRIGGER IF EXISTS financial_entries_guard_delete ON public.financial_entries;
CREATE TRIGGER financial_entries_guard_delete BEFORE DELETE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.financial_entries_guard_delete();

DROP TRIGGER IF EXISTS projects_guard_delete ON public.projects;
CREATE TRIGGER projects_guard_delete BEFORE DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_guard_delete();

-- -----------------------------------------------------------------------------
-- 5. RLS 정책 교체 (봉인 5개 테이블)
-- -----------------------------------------------------------------------------

-- app_users
DROP POLICY IF EXISTS "erp authenticated full access" ON public.app_users;
DROP POLICY IF EXISTS "signup can insert app_users" ON public.app_users;
DROP POLICY IF EXISTS "seal read app_users" ON public.app_users;
CREATE POLICY "seal read app_users" ON public.app_users AS PERMISSIVE FOR SELECT TO authenticated
    USING ((public.is_active_staff() OR (id = auth.uid())));

-- projects ("public read completed projects"·"service role full access"는 유지)
DROP POLICY IF EXISTS "erp authenticated full access" ON public.projects;
DROP POLICY IF EXISTS "seal read projects" ON public.projects;
CREATE POLICY "seal read projects" ON public.projects AS PERMISSIVE FOR SELECT TO authenticated
    USING (public.can_view_project(id) OR ((status)::text = '완료'::text));
-- 완료 프로젝트는 비로그인 공개 정책("public read completed projects")과 같은 범위다.
-- 로그인한 직원이 reactstudio.kr 공개 페이지(/history)를 볼 때도 목록이 비지 않게 한다.

-- project_tasks
DROP POLICY IF EXISTS "erp authenticated full access" ON public.project_tasks;
DROP POLICY IF EXISTS "seal read project_tasks" ON public.project_tasks;
CREATE POLICY "seal read project_tasks" ON public.project_tasks AS PERMISSIVE FOR SELECT TO authenticated
    USING ((public.can_view_project(project_id) OR (public.is_active_staff() AND (assignee_id = auth.uid()))));

-- financial_entries
DROP POLICY IF EXISTS "erp authenticated full access" ON public.financial_entries;
DROP POLICY IF EXISTS "seal read financial_entries" ON public.financial_entries;
CREATE POLICY "seal read financial_entries" ON public.financial_entries AS PERMISSIVE FOR SELECT TO authenticated
    USING ((public.is_staff_admin_or_leader()
            OR (public.is_active_staff() AND ((created_by = auth.uid()) OR ((project_id IS NOT NULL) AND public.can_view_project(project_id))))));

-- gowid_expense_project_link
DROP POLICY IF EXISTS authenticated_users_manage_expense_project_link ON public.gowid_expense_project_link;
DROP POLICY IF EXISTS "seal read gowid_expense_project_link" ON public.gowid_expense_project_link;
CREATE POLICY "seal read gowid_expense_project_link" ON public.gowid_expense_project_link AS PERMISSIVE FOR SELECT TO authenticated
    USING (public.is_active_staff());

-- 변경 기록 테이블: 읽기만, 쓰기는 트리거(소유자 권한)만
ALTER TABLE public.financial_entry_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seal read financial_entry_changes" ON public.financial_entry_changes;
CREATE POLICY "seal read financial_entry_changes" ON public.financial_entry_changes AS PERMISSIVE FOR SELECT TO authenticated
    USING (public.can_view_financial_entry_changes(entry_id));

DROP POLICY IF EXISTS "seal read app_user_changes" ON public.app_user_changes;
CREATE POLICY "seal read app_user_changes" ON public.app_user_changes AS PERMISSIVE FOR SELECT TO authenticated
    USING (public.is_staff_admin());

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.financial_entry_changes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.app_user_changes FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. 뷰: 호출자 권한으로 실행(RLS 우회 차단)
-- -----------------------------------------------------------------------------

ALTER VIEW public.attendance_logs_with_user SET (security_invoker = true);
ALTER VIEW public.project_pnl_reports_with_profit SET (security_invoker = true);

-- -----------------------------------------------------------------------------
-- 7. 봉인 밖 테이블: 로그인 계정 정책에 재직 직원 조건을 AND로 붙인다
--    대상: public 테이블 중 봉인 5개·react_*·변경 기록 2개를 뺀 전부(47개 테이블, 정책 83개)
--    - authenticated 정책과 PUBLIC(역할 지정 없음) 정책의 USING·WITH CHECK를
--      ((SELECT public.is_active_staff()) AND <기준선 식>)으로 바꾼다. 기준선 식·이름·명령·역할은 그대로다.
--      재직 직원에게는 기존 역할·사업부 규칙이 그대로 적용되고, 그 밖의 로그인 계정은 0건·쓰기 거부가 된다.
--    - 바꾸지 않는 것
--      - service_role 정책, anon 정책("public read portfolio_items")
--      - clients "Allow public read access", company_documents "company_documents read all"
--        (PUBLIC이지만 비로그인 공개 읽기 목적이라 anon 결과를 바꾸지 않기 위해 유지)
--      - push_tokens "Service role can manage all push tokens"(jwt role=service_role 조건, 서비스 권한 목적)
--    - 위 두 공개 읽기 정책 때문에 clients·company_documents는 로그인 계정에만 걸리는
--      RESTRICTIVE 정책 "seal active staff only"를 더한다(anon에는 걸리지 않는다).
--    - PUBLIC 정책은 anon에도 적용되지만, 바꾼 PUBLIC 정책은 모두 auth.uid() 또는 app_users 조회에 기대므로
--      anon 결과는 전과 같다. 예외: notifications "Service role can insert notifications"(WITH CHECK true)는
--      이제 anon INSERT도 받지 않는다(알림은 서버가 서비스 권한으로만 넣는다).
--    - 로그인 직후 안내 화면(승인 대기·거절)은 본인 app_users 행만 읽는다(5절 "seal read app_users").
--    - 정책 본문은 supabase/baseline/20260924_prod_snapshot.sql 에서 기계적으로 옮겼다. 적용 시점에 동적 SQL을 쓰지 않는다.
--    되돌리기: supabase/apply/20260925_seal_rollback.sql 3-2절(기준선 본문 그대로 복원)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "erp authenticated full access" ON public.activity_logs;
CREATE POLICY "erp authenticated full access" ON public.activity_logs AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.agreements;
CREATE POLICY "erp authenticated full access" ON public.agreements AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Admins can update all attendance logs" ON public.attendance_logs;
CREATE POLICY "Admins can update all attendance logs" ON public.attendance_logs AS PERMISSIVE FOR UPDATE TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role))))));

DROP POLICY IF EXISTS "Admins can view all attendance logs" ON public.attendance_logs;
CREATE POLICY "Admins can view all attendance logs" ON public.attendance_logs AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role))))));

DROP POLICY IF EXISTS "Managers can update team member attendance logs" ON public.attendance_logs;
CREATE POLICY "Managers can update team member attendance logs" ON public.attendance_logs AS PERMISSIVE FOR UPDATE TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['manager'::public.erp_role, 'admin'::public.erp_role])) AND (au.bu_code = ( SELECT app_users.bu_code
           FROM public.app_users
          WHERE (app_users.id = attendance_logs.user_id))))))));

DROP POLICY IF EXISTS "Managers can view team member attendance logs" ON public.attendance_logs;
CREATE POLICY "Managers can view team member attendance logs" ON public.attendance_logs AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['manager'::public.erp_role, 'admin'::public.erp_role])) AND (au.bu_code = ( SELECT app_users.bu_code
           FROM public.app_users
          WHERE (app_users.id = attendance_logs.user_id))))))));

DROP POLICY IF EXISTS "Users can create and update their own attendance logs" ON public.attendance_logs;
CREATE POLICY "Users can create and update their own attendance logs" ON public.attendance_logs AS PERMISSIVE FOR ALL TO public
    USING ((SELECT public.is_active_staff()) AND ((auth.uid() = user_id)))
    WITH CHECK ((SELECT public.is_active_staff()) AND ((auth.uid() = user_id)));

DROP POLICY IF EXISTS "Users can view their own attendance logs" ON public.attendance_logs;
CREATE POLICY "Users can view their own attendance logs" ON public.attendance_logs AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((auth.uid() = user_id)));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.bug_reports;
CREATE POLICY "erp authenticated full access" ON public.bug_reports AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.business_signals;
CREATE POLICY "erp authenticated full access" ON public.business_signals AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.business_units;
CREATE POLICY "erp authenticated full access" ON public.business_units AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.channel_contents;
CREATE POLICY "erp authenticated full access" ON public.channel_contents AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.channels;
CREATE POLICY "erp authenticated full access" ON public.channels AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.clients;
CREATE POLICY "Allow authenticated delete" ON public.clients AS PERMISSIVE FOR DELETE TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.clients;
CREATE POLICY "Allow authenticated insert" ON public.clients AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Allow authenticated update" ON public.clients;
CREATE POLICY "Allow authenticated update" ON public.clients AS PERMISSIVE FOR UPDATE TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.comment_attachments;
CREATE POLICY "erp authenticated full access" ON public.comment_attachments AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.comment_mentions_reads;
CREATE POLICY "erp authenticated full access" ON public.comment_mentions_reads AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.comments;
CREATE POLICY "erp authenticated full access" ON public.comments AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Admins can view all compensatory requests" ON public.compensatory_requests;
CREATE POLICY "Admins can view all compensatory requests" ON public.compensatory_requests AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = ANY (ARRAY['admin'::public.erp_role, 'leader'::public.erp_role])))))));

DROP POLICY IF EXISTS "HEAD Admins can update compensatory requests" ON public.compensatory_requests;
CREATE POLICY "HEAD Admins can update compensatory requests" ON public.compensatory_requests AS PERMISSIVE FOR UPDATE TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role) AND (app_users.bu_code = 'HEAD'::public.bu_code))))));

DROP POLICY IF EXISTS "Users can create own compensatory requests" ON public.compensatory_requests;
CREATE POLICY "Users can create own compensatory requests" ON public.compensatory_requests AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((SELECT public.is_active_staff()) AND ((auth.uid() = requester_id)));

DROP POLICY IF EXISTS "Users can view own compensatory requests" ON public.compensatory_requests;
CREATE POLICY "Users can view own compensatory requests" ON public.compensatory_requests AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((auth.uid() = requester_id)));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.contracts;
CREATE POLICY "erp authenticated full access" ON public.contracts AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.daily_work_logs;
CREATE POLICY "erp authenticated full access" ON public.daily_work_logs AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.document_room_files;
CREATE POLICY "erp authenticated full access" ON public.document_room_files AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.equipment;
CREATE POLICY "erp authenticated full access" ON public.equipment AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS admin_manage_gowid_cards ON public.gowid_cards;
CREATE POLICY admin_manage_gowid_cards ON public.gowid_cards AS PERMISSIVE FOR ALL TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role))))));

DROP POLICY IF EXISTS authenticated_users_read_gowid_cards ON public.gowid_cards;
CREATE POLICY authenticated_users_read_gowid_cards ON public.gowid_cards AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((auth.uid() IS NOT NULL)));

DROP POLICY IF EXISTS admin_manage_gowid_mapping ON public.gowid_user_mapping;
CREATE POLICY admin_manage_gowid_mapping ON public.gowid_user_mapping AS PERMISSIVE FOR ALL TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role))))));

DROP POLICY IF EXISTS users_view_own_gowid_mapping ON public.gowid_user_mapping;
CREATE POLICY users_view_own_gowid_mapping ON public.gowid_user_mapping AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((erp_user_id = auth.uid())));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.inquiries;
CREATE POLICY "erp authenticated full access" ON public.inquiries AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Admins can manage leave balances" ON public.leave_balances;
CREATE POLICY "Admins can manage leave balances" ON public.leave_balances AS PERMISSIVE FOR ALL TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role) AND (app_users.bu_code = 'HEAD'::public.bu_code))))));

DROP POLICY IF EXISTS "Admins can view all leave balances" ON public.leave_balances;
CREATE POLICY "Admins can view all leave balances" ON public.leave_balances AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = ANY (ARRAY['admin'::public.erp_role, 'leader'::public.erp_role])))))));

DROP POLICY IF EXISTS "Users can view own leave balances" ON public.leave_balances;
CREATE POLICY "Users can view own leave balances" ON public.leave_balances AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((auth.uid() = user_id)));

DROP POLICY IF EXISTS "Admins can view all leave grants" ON public.leave_grants;
CREATE POLICY "Admins can view all leave grants" ON public.leave_grants AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = ANY (ARRAY['admin'::public.erp_role, 'leader'::public.erp_role])))))));

DROP POLICY IF EXISTS "HEAD Admins can manage leave grants" ON public.leave_grants;
CREATE POLICY "HEAD Admins can manage leave grants" ON public.leave_grants AS PERMISSIVE FOR ALL TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role) AND (app_users.bu_code = 'HEAD'::public.bu_code))))));

DROP POLICY IF EXISTS "Users can view own leave grants" ON public.leave_grants;
CREATE POLICY "Users can view own leave grants" ON public.leave_grants AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((auth.uid() = user_id)));

DROP POLICY IF EXISTS "Admins can create leave requests for any user" ON public.leave_requests;
CREATE POLICY "Admins can create leave requests for any user" ON public.leave_requests AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role))))));

DROP POLICY IF EXISTS "Admins can view all leave requests" ON public.leave_requests;
CREATE POLICY "Admins can view all leave requests" ON public.leave_requests AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role))))));

DROP POLICY IF EXISTS "Leaders and Admins can update leave requests" ON public.leave_requests;
CREATE POLICY "Leaders and Admins can update leave requests" ON public.leave_requests AS PERMISSIVE FOR UPDATE TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = ANY (ARRAY['admin'::public.erp_role, 'leader'::public.erp_role])))))));

DROP POLICY IF EXISTS "Leaders can view BU leave requests" ON public.leave_requests;
CREATE POLICY "Leaders can view BU leave requests" ON public.leave_requests AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM (public.app_users au
     JOIN public.app_users req ON ((req.id = leave_requests.requester_id)))
  WHERE ((au.id = auth.uid()) AND (au.role = 'leader'::public.erp_role) AND (au.bu_code = req.bu_code))))));

DROP POLICY IF EXISTS "Users can create own leave requests" ON public.leave_requests;
CREATE POLICY "Users can create own leave requests" ON public.leave_requests AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((SELECT public.is_active_staff()) AND ((auth.uid() = requester_id)));

DROP POLICY IF EXISTS "Users can view own leave requests" ON public.leave_requests;
CREATE POLICY "Users can view own leave requests" ON public.leave_requests AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((auth.uid() = requester_id)));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.manuals;
CREATE POLICY "erp authenticated full access" ON public.manuals AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.meeting_rooms;
CREATE POLICY "erp authenticated full access" ON public.meeting_rooms AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications" ON public.notifications AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO public
    USING ((SELECT public.is_active_staff()) AND ((auth.uid() = user_id)));

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((auth.uid() = user_id)));

DROP POLICY IF EXISTS "Admins can manage office IPs" ON public.office_ips;
CREATE POLICY "Admins can manage office IPs" ON public.office_ips AS PERMISSIVE FOR ALL TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role))))));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.org_units;
CREATE POLICY "erp authenticated full access" ON public.org_units AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_access_requests;
CREATE POLICY "erp authenticated full access" ON public.partner_access_requests AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_bu_access;
CREATE POLICY "erp authenticated full access" ON public.partner_bu_access AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_categories;
CREATE POLICY "erp authenticated full access" ON public.partner_categories AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_category_mappings;
CREATE POLICY "erp authenticated full access" ON public.partner_category_mappings AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_relations;
CREATE POLICY "erp authenticated full access" ON public.partner_relations AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_settlement_projects;
CREATE POLICY "erp authenticated full access" ON public.partner_settlement_projects AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_settlements;
CREATE POLICY "erp authenticated full access" ON public.partner_settlements AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partner_user_access;
CREATE POLICY "erp authenticated full access" ON public.partner_user_access AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.partners;
CREATE POLICY "erp authenticated full access" ON public.partners AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.portfolio_items;
CREATE POLICY "erp authenticated full access" ON public.portfolio_items AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.project_documents;
CREATE POLICY "erp authenticated full access" ON public.project_documents AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Authenticated users can delete pnl reports" ON public.project_pnl_reports;
CREATE POLICY "Authenticated users can delete pnl reports" ON public.project_pnl_reports AS PERMISSIVE FOR DELETE TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Authenticated users can insert pnl reports" ON public.project_pnl_reports;
CREATE POLICY "Authenticated users can insert pnl reports" ON public.project_pnl_reports AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Authenticated users can read pnl reports" ON public.project_pnl_reports;
CREATE POLICY "Authenticated users can read pnl reports" ON public.project_pnl_reports AS PERMISSIVE FOR SELECT TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Authenticated users can update pnl reports" ON public.project_pnl_reports;
CREATE POLICY "Authenticated users can update pnl reports" ON public.project_pnl_reports AS PERMISSIVE FOR UPDATE TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Users can delete their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can delete their own push tokens" ON public.push_tokens AS PERMISSIVE FOR DELETE TO public
    USING ((SELECT public.is_active_staff()) AND ((auth.uid() = user_id)));

DROP POLICY IF EXISTS "Users can insert their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can insert their own push tokens" ON public.push_tokens AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((SELECT public.is_active_staff()) AND ((auth.uid() = user_id)));

DROP POLICY IF EXISTS "Users can update their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can update their own push tokens" ON public.push_tokens AS PERMISSIVE FOR UPDATE TO public
    USING ((SELECT public.is_active_staff()) AND ((auth.uid() = user_id)));

DROP POLICY IF EXISTS "Users can view their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can view their own push tokens" ON public.push_tokens AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((auth.uid() = user_id)));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.quotes;
CREATE POLICY "erp authenticated full access" ON public.quotes AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.reservations;
CREATE POLICY "erp authenticated full access" ON public.reservations AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.task_templates;
CREATE POLICY "erp authenticated full access" ON public.task_templates AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Admins can manage all work status" ON public.user_work_status;
CREATE POLICY "Admins can manage all work status" ON public.user_work_status AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role))))))
    WITH CHECK ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role))))));

DROP POLICY IF EXISTS "Allow authenticated users to view work status" ON public.user_work_status;
CREATE POLICY "Allow authenticated users to view work status" ON public.user_work_status AS PERMISSIVE FOR SELECT TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Users can update their own status" ON public.user_work_status;
CREATE POLICY "Users can update their own status" ON public.user_work_status AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND ((user_id = auth.uid())))
    WITH CHECK ((SELECT public.is_active_staff()) AND ((user_id = auth.uid())));

DROP POLICY IF EXISTS "erp authenticated full access" ON public.vehicles;
CREATE POLICY "erp authenticated full access" ON public.vehicles AS PERMISSIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()) AND (true))
    WITH CHECK ((SELECT public.is_active_staff()) AND (true));

DROP POLICY IF EXISTS "Admins can update all work requests" ON public.work_requests;
CREATE POLICY "Admins can update all work requests" ON public.work_requests AS PERMISSIVE FOR UPDATE TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role))))));

DROP POLICY IF EXISTS "Admins can view all work requests" ON public.work_requests;
CREATE POLICY "Admins can view all work requests" ON public.work_requests AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role))))));

DROP POLICY IF EXISTS "Managers can update team member work requests" ON public.work_requests;
CREATE POLICY "Managers can update team member work requests" ON public.work_requests AS PERMISSIVE FOR UPDATE TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['manager'::public.erp_role, 'admin'::public.erp_role])) AND (au.bu_code = ( SELECT app_users.bu_code
           FROM public.app_users
          WHERE (app_users.id = work_requests.requester_id))))))));

DROP POLICY IF EXISTS "Managers can view team member work requests" ON public.work_requests;
CREATE POLICY "Managers can view team member work requests" ON public.work_requests AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((EXISTS ( SELECT 1
   FROM public.app_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['manager'::public.erp_role, 'admin'::public.erp_role])) AND (au.bu_code = ( SELECT app_users.bu_code
           FROM public.app_users
          WHERE (app_users.id = work_requests.requester_id))))))));

DROP POLICY IF EXISTS "Users can create their own work requests" ON public.work_requests;
CREATE POLICY "Users can create their own work requests" ON public.work_requests AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((SELECT public.is_active_staff()) AND ((auth.uid() = requester_id)));

DROP POLICY IF EXISTS "Users can view their own work requests" ON public.work_requests;
CREATE POLICY "Users can view their own work requests" ON public.work_requests AS PERMISSIVE FOR SELECT TO public
    USING ((SELECT public.is_active_staff()) AND ((auth.uid() = requester_id)));

DROP POLICY IF EXISTS "seal active staff only" ON public.clients;
CREATE POLICY "seal active staff only" ON public.clients AS RESTRICTIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()))
    WITH CHECK ((SELECT public.is_active_staff()));

DROP POLICY IF EXISTS "seal active staff only" ON public.company_documents;
CREATE POLICY "seal active staff only" ON public.company_documents AS RESTRICTIVE FOR ALL TO authenticated
    USING ((SELECT public.is_active_staff()))
    WITH CHECK ((SELECT public.is_active_staff()));
-- <<< END migrations/20260925000000_unified_ops_seal.sql

-- >>> BEGIN apply/20260925_data_fix.sql
-- =============================================================================
-- 20260925 데이터 보정: 사업부 없는 재직(active) 계정 1건을 승인 대기(pending)로 바꾼다
--
-- - 대상은 조건으로 고른다: status='active' AND bu_code IS NULL. id·이메일을 적지 않는다(공개 저장소).
-- - 2026-09-24 조회 기준 대상은 정확히 1건이다. 2건 이상이면 중단한다(0건이면 아무것도 하지 않는다).
-- - 봉인 마이그레이션(20260925000000_unified_ops_seal.sql) 뒤에 실행한다.
--   app_users 변경 기록 트리거가 app_user_changes 에 status active→pending (source=external)을 남기고,
--   되돌리기(20260925_data_fix_rollback.sql)는 그 기록으로 대상을 찾는다.
-- - 운영 적용은 대표 승인 뒤, 20260925_seal_apply.sql 트랜잭션 안에서 실행한다.
-- =============================================================================

DO $data_fix$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.app_users
  WHERE status = 'active' AND bu_code IS NULL;

  IF v_count > 1 THEN
    RAISE EXCEPTION '데이터 보정 중단: 사업부 없는 재직 계정이 %건입니다(예상 1건).', v_count;
  END IF;

  UPDATE public.app_users
  SET status = 'pending'
  WHERE status = 'active' AND bu_code IS NULL;

  RAISE NOTICE '데이터 보정: %건을 pending 으로 변경', v_count;
END
$data_fix$;
-- <<< END apply/20260925_data_fix.sql

-- 확인 1: 봉인 5개 테이블 정책 (authenticated 쓰기 정책·anon INSERT가 없어야 한다)
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('app_users', 'projects', 'project_tasks', 'financial_entries', 'gowid_expense_project_link',
                    'financial_entry_changes', 'app_user_changes')
ORDER BY tablename, policyname;

-- 확인 2: 뷰 호출자 권한
SELECT c.relname, c.reloptions
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('attendance_logs_with_user', 'project_pnl_reports_with_profit');

-- 확인 3: 새 트리거
SELECT tgrelid::regclass AS table_name, tgname
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgrelid::regclass::text IN ('app_users', 'projects', 'financial_entries')
ORDER BY 1, 2;

-- 확인 4: 사업부 없는 재직 계정 0건, 데이터 보정 기록
SELECT count(*) AS active_without_bu FROM public.app_users WHERE status = 'active' AND bu_code IS NULL;
SELECT field, old_value, new_value, source FROM public.app_user_changes ORDER BY id;

-- 확인 6: 봉인 밖 테이블에서 재직 직원 조건 없이 로그인 계정에 열린 정책 (의도한 3개만 나와야 한다:
--         clients "Allow public read access", company_documents "company_documents read all",
--         push_tokens "Service role can manage all push tokens")
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'react_%'
  AND tablename NOT IN ('app_users', 'projects', 'project_tasks', 'financial_entries', 'gowid_expense_project_link',
                        'financial_entry_changes', 'app_user_changes')
  AND ('authenticated' = ANY (roles) OR 'public' = ANY (roles))
  AND coalesce(qual, '') NOT LIKE '%is_active_staff()%'
  AND coalesce(with_check, '') NOT LIKE '%is_active_staff()%'
ORDER BY tablename, policyname;

-- 확인 5: 외부 사용자 대표 조회 건수(적용 전 값과 같아야 한다)
SELECT count(*) AS projects_completed FROM public.projects WHERE status = '완료';
SELECT count(*) AS flow_active FROM public.app_users WHERE bu_code = 'FLOW' AND status = 'active';
SELECT count(*) AS fe_not_canceled FROM public.financial_entries WHERE status <> 'canceled';

COMMIT;
