-- =============================================================================
-- 20260925000000_unified_ops_seal
-- 핵심 5개 테이블 권한 봉인 + 변경 기록 + 삭제 방지 + 뷰 호출자 권한
--
-- 봉인 대상(정확히 5개): app_users, projects, project_tasks, financial_entries,
--                        gowid_expense_project_link
-- 그 밖의 테이블 정책(portfolio_items, clients, partners 등)은 건드리지 않는다.
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
