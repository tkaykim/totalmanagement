-- =============================================================================
-- 운영 스키마 기준선 스냅샷 (public 스키마, 스키마만)
-- 운영 DB: Supabase wqtoahrekijirxxpbfqg (PostgreSQL 17)
-- 추출일: 2026-09-24
--
-- 운영에는 이미 적용된 상태를 기록한 참고용이며 운영에서 실행하지 않는다.
-- 마이그레이션 이력에 등록하지 않는다.
--
-- - 이 파일은 supabase/migrations/ 밖에 둔다. 마이그레이션 도구가 읽지 않게 하려는 것이다.
-- - 데이터 행·비밀값·개인정보는 없다. 카탈로그 읽기 전용 SELECT로만 만들었다.
-- - 추출 쿼리: scripts/schema/extract-baseline.sql
--   조립: scripts/schema/build-baseline.mjs
--   대조 쿼리: scripts/schema/verify-baseline.sql
--   개수 대조·파싱 점검: scripts/schema/check-baseline.mjs
-- - auth.users, auth.uid(), auth.jwt() 등 Supabase 전용 객체를 참조한다.
--   Supabase 밖(PGlite 등)에 올릴 때는 그 객체를 먼저 만들어야 한다(check-baseline.mjs 참고).
-- - react_* 테이블은 reactstudio 레포가 주인이다. 여기에는 스키마만 기록한다.
-- - 권한(GRANT)과 주석(COMMENT)은 담지 않았다.
-- - 뷰 2개는 추출 시점에 security_invoker 옵션이 없다(소유자 권한, RLS 우회). 운영 그대로 기록했다.
-- - 시퀀스의 현재 값(setval)은 담지 않았다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. enum 타입 (22)
-- -----------------------------------------------------------------------------

CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.attendance_type AS ENUM ('present', 'late', 'early_leave', 'absent', 'vacation', 'remote', 'external');
CREATE TYPE public.bu_code AS ENUM ('GRIGO', 'DEETZ', 'FLOW', 'REACT', 'MODOO', 'AST', 'HEAD');
CREATE TYPE public.bug_report_status AS ENUM ('pending', 'resolved', 'on_hold', 'no_action');
CREATE TYPE public.channel_status AS ENUM ('active', 'growing', 'inactive', 'archived');
CREATE TYPE public.client_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE public.content_stage AS ENUM ('planning', 'shooting', 'editing', 'uploaded');
CREATE TYPE public.equipment_status AS ENUM ('available', 'rented', 'maintenance', 'lost');
CREATE TYPE public.erp_role AS ENUM ('admin', 'leader', 'manager', 'member', 'viewer', 'artist');
CREATE TYPE public.event_type AS ENUM ('meeting', 'shoot', 'deadline', 'holiday', 'event');
CREATE TYPE public.financial_kind AS ENUM ('revenue', 'expense');
CREATE TYPE public.financial_status AS ENUM ('planned', 'paid', 'canceled');
CREATE TYPE public.leave_grant_type AS ENUM ('auto_monthly', 'auto_yearly', 'manual', 'compensatory_approved');
CREATE TYPE public.leave_request_type AS ENUM ('annual', 'half_am', 'half_pm', 'compensatory', 'special', 'comp_half_am', 'comp_half_pm');
CREATE TYPE public.leave_type AS ENUM ('annual', 'compensatory', 'special');
CREATE TYPE public.partner_entity_type AS ENUM ('person', 'organization', 'team', 'venue', 'brand');
CREATE TYPE public.payment_method AS ENUM ('vat_included', 'tax_free', 'withholding', 'actual_payment');
CREATE TYPE public.project_status AS ENUM ('준비중', '진행중', '운영중', '기획중', '완료', '보류');
CREATE TYPE public.reservation_resource_type AS ENUM ('meeting_room', 'equipment', 'vehicle');
CREATE TYPE public.reservation_status AS ENUM ('active', 'cancelled');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'on_hold', 'done');
CREATE TYPE public.work_request_type AS ENUM ('external_work', 'remote_work', 'overtime', 'attendance_correction');

-- -----------------------------------------------------------------------------
-- 2. 독립 시퀀스(serial 컬럼용) (22)
-- -----------------------------------------------------------------------------

CREATE SEQUENCE public.activity_logs_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.agreements_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.business_units_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.channel_contents_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.channels_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.comment_mentions_reads_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.comments_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.company_documents_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.daily_work_logs_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.equipment_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.financial_entries_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.manuals_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.notifications_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.office_ips_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE public.org_units_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.partner_settlement_projects_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.partner_settlements_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.project_documents_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.project_pnl_reports_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.project_tasks_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.projects_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE public.task_templates_id_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;

-- -----------------------------------------------------------------------------
-- 3. 테이블(컬럼·타입·기본값·NOT NULL·identity) (66)
-- -----------------------------------------------------------------------------

CREATE TABLE public.activity_logs (
    id bigint DEFAULT nextval('public.activity_logs_id_seq'::regclass) NOT NULL,
    user_id uuid,
    action_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    entity_title text,
    metadata jsonb DEFAULT '{}'::jsonb,
    occurred_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.agreements (
    id bigint DEFAULT nextval('public.agreements_id_seq'::regclass) NOT NULL,
    bu_code text DEFAULT 'REACT'::text NOT NULL,
    inquiry_id bigint,
    quote_id bigint,
    title text NOT NULL,
    client_company text DEFAULT ''::text NOT NULL,
    client_address text DEFAULT ''::text,
    client_representative text DEFAULT ''::text,
    client_email text DEFAULT ''::text,
    client_phone text DEFAULT ''::text,
    task_description text DEFAULT ''::text,
    deliverables text DEFAULT '편집이 완료된 최종 마스터 파일 1종'::text,
    shooting_date date,
    delivery_date date,
    release_date date,
    total_amount numeric DEFAULT 0 NOT NULL,
    vat_type text DEFAULT 'exclusive'::text NOT NULL,
    deposit_rate integer DEFAULT 20 NOT NULL,
    deposit_amount numeric DEFAULT 0 NOT NULL,
    balance_rate integer DEFAULT 80 NOT NULL,
    balance_amount numeric DEFAULT 0 NOT NULL,
    deposit_condition text DEFAULT '계약 체결 후 7일 이내 지급'::text,
    balance_condition text DEFAULT '릴리즈 예정일로부터 30일 이내 지급'::text,
    free_revision_count integer DEFAULT 2 NOT NULL,
    penalty_rates jsonb DEFAULT '[{"rate": 30, "label": "계약 체결 후 ~ 촬영 7일 전"}, {"rate": 50, "label": "촬영 예정일 기준 7일 이내"}, {"rate": 100, "label": "촬영 완료 이후"}]'::jsonb NOT NULL,
    contract_date date,
    status text DEFAULT 'draft'::text NOT NULL,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.app_users (
    id uuid NOT NULL,
    name text NOT NULL,
    email text,
    role public.erp_role DEFAULT 'member'::public.erp_role NOT NULL,
    bu_code public.bu_code,
    "position" text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    partner_id bigint,
    hire_date date,
    status text DEFAULT 'active'::text NOT NULL,
    requested_bu_code public.bu_code,
    signup_message text,
    signup_requested_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone
);

CREATE TABLE public.attendance_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    work_date date DEFAULT CURRENT_DATE NOT NULL,
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
    is_overtime boolean DEFAULT false,
    is_auto_checkout boolean DEFAULT false,
    user_confirmed boolean DEFAULT true
);

CREATE TABLE public.bug_reports (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.bug_reports_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    reporter_id uuid,
    title text NOT NULL,
    situation text NOT NULL,
    description text,
    improvement_request text,
    status public.bug_report_status DEFAULT 'pending'::public.bug_report_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.business_signals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text NOT NULL,
    metric_key text NOT NULL,
    metric_label text,
    value text NOT NULL,
    color text NOT NULL,
    trend text,
    note text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.business_units (
    id bigint DEFAULT nextval('public.business_units_id_seq'::regclass) NOT NULL,
    code public.bu_code NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.channel_contents (
    id bigint DEFAULT nextval('public.channel_contents_id_seq'::regclass) NOT NULL,
    channel_id bigint NOT NULL,
    title text NOT NULL,
    stage public.content_stage DEFAULT 'planning'::public.content_stage NOT NULL,
    assignee_id uuid,
    assignee_name text,
    upload_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.channels (
    id bigint DEFAULT nextval('public.channels_id_seq'::regclass) NOT NULL,
    bu_code public.bu_code NOT NULL,
    name text NOT NULL,
    url text,
    subscribers_count text,
    total_views text,
    status public.channel_status DEFAULT 'active'::public.channel_status NOT NULL,
    manager_id uuid,
    manager_name text,
    next_upload_date date,
    recent_video text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    production_company text,
    ad_status text DEFAULT 'none'::text,
    upload_days text[]
);

CREATE TABLE public.clients (
    id bigint GENERATED ALWAYS AS IDENTITY (SEQUENCE NAME public.clients_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    bu_code text DEFAULT 'REACT'::text NOT NULL,
    name text NOT NULL,
    logo_url text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.comment_attachments (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.comment_attachments_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    comment_id bigint NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text NOT NULL,
    file_size bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.comment_mentions_reads (
    id bigint DEFAULT nextval('public.comment_mentions_reads_id_seq'::regclass) NOT NULL,
    comment_id bigint NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.comments (
    id bigint DEFAULT nextval('public.comments_id_seq'::regclass) NOT NULL,
    entity_type text NOT NULL,
    entity_id bigint NOT NULL,
    content text NOT NULL,
    author_id uuid NOT NULL,
    author_name text NOT NULL,
    mentioned_user_ids jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.company_documents (
    id bigint DEFAULT nextval('public.company_documents_id_seq'::regclass) NOT NULL,
    kind text NOT NULL,
    filename text NOT NULL,
    storage_path text NOT NULL,
    public_url text NOT NULL,
    mime_type text NOT NULL,
    size integer DEFAULT 0 NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.compensatory_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_id uuid NOT NULL,
    days numeric(5,1) DEFAULT 1 NOT NULL,
    reason text NOT NULL,
    work_date date,
    status public.approval_status DEFAULT 'pending'::public.approval_status NOT NULL,
    approver_id uuid,
    rejection_reason text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.contracts (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.contracts_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    bu_code public.bu_code DEFAULT 'REACT'::public.bu_code NOT NULL,
    inquiry_id bigint,
    quote_id bigint,
    project_id bigint,
    title text NOT NULL,
    contract_type text DEFAULT 'service'::text NOT NULL,
    client_name text NOT NULL,
    client_email text NOT NULL,
    client_phone text,
    client_company text,
    items jsonb DEFAULT '[]'::jsonb,
    total_amount bigint DEFAULT 0,
    deposit_amount bigint DEFAULT 0,
    deposit_due_date date,
    balance_amount bigint DEFAULT 0,
    balance_due_date date,
    start_date date,
    end_date date,
    terms text,
    status text DEFAULT 'draft'::text NOT NULL,
    sign_token uuid DEFAULT gen_random_uuid(),
    client_signature_data text,
    client_signed_at timestamp with time zone,
    company_signature_data text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    supply_amount bigint DEFAULT 0,
    vat bigint DEFAULT 0
);

CREATE TABLE public.daily_work_logs (
    id bigint DEFAULT nextval('public.daily_work_logs_id_seq'::regclass) NOT NULL,
    user_id uuid,
    log_date date NOT NULL,
    summary text,
    notes text,
    tomorrow_plan text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.document_room_files (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.document_room_files_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    category text NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint DEFAULT 0 NOT NULL,
    mime_type text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.equipment (
    id bigint DEFAULT nextval('public.equipment_id_seq'::regclass) NOT NULL,
    bu_code public.bu_code NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    serial_number text,
    status public.equipment_status DEFAULT 'available'::public.equipment_status NOT NULL,
    location text,
    borrower_id uuid,
    borrower_name text,
    return_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    quantity integer DEFAULT 1 NOT NULL
);

CREATE TABLE public.financial_entries (
    id bigint DEFAULT nextval('public.financial_entries_id_seq'::regclass) NOT NULL,
    project_id bigint,
    bu_code public.bu_code NOT NULL,
    kind public.financial_kind NOT NULL,
    category text,
    name text NOT NULL,
    amount bigint NOT NULL,
    occurred_at date NOT NULL,
    status public.financial_status DEFAULT 'planned'::public.financial_status NOT NULL,
    memo text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_method public.payment_method,
    actual_amount bigint,
    partner_id bigint,
    share_rate numeric(5,2) DEFAULT NULL::numeric,
    due_date date,
    paid_at timestamp with time zone,
    payee_app_user_id uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    payment_ref text,
    contract_id bigint,
    client_name text,
    entry_scope text DEFAULT 'external'::text NOT NULL,
    counterparty_bu_code public.bu_code
);

CREATE TABLE public.gowid_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gowid_alias text NOT NULL,
    short_card_number text,
    card_number text,
    card_user_name text,
    card_name text,
    card_type text,
    erp_alias text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.gowid_expense_project_link (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gowid_expense_id bigint NOT NULL,
    project_id bigint NOT NULL,
    linked_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    financial_entry_id bigint,
    expense_amount bigint,
    expense_store_name text,
    expense_date date
);

CREATE TABLE public.gowid_user_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    erp_user_id uuid NOT NULL,
    gowid_user_id bigint NOT NULL,
    gowid_user_name text NOT NULL,
    gowid_email text,
    gowid_card_alias text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.inquiries (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.inquiries_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    bu_code public.bu_code DEFAULT 'REACT'::public.bu_code NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    company text,
    services text[] DEFAULT '{}'::text[],
    project_scale text,
    deadline text,
    budget_range text,
    reference_url text,
    message text,
    status text DEFAULT 'new'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    client_token uuid DEFAULT gen_random_uuid(),
    project_id bigint,
    description text,
    reference_urls jsonb DEFAULT '[]'::jsonb,
    project_title text,
    intake_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    partner_id bigint
);

CREATE TABLE public.leave_balances (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.leave_balances_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    user_id uuid NOT NULL,
    leave_type public.leave_type NOT NULL,
    total_days numeric(5,1) DEFAULT 0 NOT NULL,
    used_days numeric(5,1) DEFAULT 0 NOT NULL,
    year integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.leave_grants (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.leave_grants_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    user_id uuid NOT NULL,
    leave_type public.leave_type NOT NULL,
    days numeric(5,1) NOT NULL,
    grant_type public.leave_grant_type NOT NULL,
    reason text,
    granted_by uuid,
    year integer NOT NULL,
    granted_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_id uuid NOT NULL,
    leave_type public.leave_request_type NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days_used numeric(5,1) NOT NULL,
    reason text NOT NULL,
    status public.approval_status DEFAULT 'pending'::public.approval_status NOT NULL,
    approver_id uuid,
    rejection_reason text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.manuals (
    id bigint DEFAULT nextval('public.manuals_id_seq'::regclass) NOT NULL,
    bu_code public.bu_code NOT NULL,
    title text NOT NULL,
    category text NOT NULL,
    content jsonb DEFAULT '[]'::jsonb NOT NULL,
    author_id uuid,
    author_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true
);

CREATE TABLE public.meeting_rooms (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.meeting_rooms_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    name text NOT NULL,
    description text,
    capacity integer,
    location text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.notifications (
    id bigint DEFAULT nextval('public.notifications_id_seq'::regclass) NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    entity_type text,
    entity_id text,
    action_url text,
    push_sent boolean DEFAULT false,
    push_sent_at timestamp with time zone,
    data jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE public.office_ips (
    id integer DEFAULT nextval('public.office_ips_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    ip_address inet NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.org_units (
    id bigint DEFAULT nextval('public.org_units_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.partner_access_requests (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.partner_access_requests_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    partner_id bigint NOT NULL,
    requester_id uuid NOT NULL,
    requester_bu_code public.bu_code NOT NULL,
    requested_access_level text DEFAULT 'view'::text NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    processed_by uuid,
    processed_at timestamp with time zone,
    rejection_reason text,
    valid_until date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.partner_bu_access (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.partner_bu_access_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    partner_id bigint NOT NULL,
    bu_code public.bu_code NOT NULL,
    access_level text DEFAULT 'view'::text NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.partner_categories (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.partner_categories_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    name text NOT NULL,
    name_ko text,
    entity_types public.partner_entity_type[] DEFAULT '{}'::public.partner_entity_type[],
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.partner_category_mappings (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.partner_category_mappings_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    partner_id bigint NOT NULL,
    category_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.partner_relations (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.partner_relations_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    parent_partner_id bigint NOT NULL,
    child_partner_id bigint NOT NULL,
    relation_type text DEFAULT 'member'::text NOT NULL,
    role_description text,
    start_date date,
    end_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.partner_settlement_projects (
    id bigint DEFAULT nextval('public.partner_settlement_projects_id_seq'::regclass) NOT NULL,
    settlement_id bigint NOT NULL,
    project_id bigint NOT NULL,
    revenue bigint DEFAULT 0,
    expense bigint DEFAULT 0,
    net_profit bigint DEFAULT 0,
    share_rate numeric(5,2) NOT NULL,
    partner_amount bigint DEFAULT 0,
    company_amount bigint DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.partner_settlements (
    id bigint DEFAULT nextval('public.partner_settlements_id_seq'::regclass) NOT NULL,
    partner_id bigint NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    total_revenue bigint DEFAULT 0,
    total_expense bigint DEFAULT 0,
    net_profit bigint DEFAULT 0,
    partner_amount bigint DEFAULT 0,
    company_amount bigint DEFAULT 0,
    memo text,
    created_by uuid,
    confirmed_at timestamp with time zone,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.partner_user_access (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.partner_user_access_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    partner_id bigint NOT NULL,
    user_id uuid NOT NULL,
    access_level text DEFAULT 'view'::text NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now(),
    valid_until date,
    reason text
);

CREATE TABLE public.partners (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.partners_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    display_name text NOT NULL,
    name_ko text,
    name_en text,
    legal_name text,
    entity_type public.partner_entity_type DEFAULT 'person'::public.partner_entity_type NOT NULL,
    nationality text,
    email text,
    phone text,
    website_url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    owner_bu_code public.bu_code NOT NULL,
    security_level text DEFAULT 'internal'::text NOT NULL,
    sharing_policy text DEFAULT 'request_only'::text NOT NULL,
    created_by uuid,
    is_active boolean DEFAULT true,
    tags text[] DEFAULT '{}'::text[],
    legacy_source text,
    legacy_id bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE public.portfolio_items (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.portfolio_items_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    bu_code public.bu_code DEFAULT 'REACT'::public.bu_code NOT NULL,
    youtube_video_id text,
    youtube_playlist_id text,
    title text NOT NULL,
    thumbnail_url text,
    category text,
    display_order integer DEFAULT 0,
    is_visible boolean DEFAULT true,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    client text,
    credits text,
    youtube_view_count bigint DEFAULT 0 NOT NULL,
    featured_priority integer DEFAULT 0 NOT NULL,
    song_title text,
    artist text,
    dancers text,
    sns_allowed boolean
);

CREATE TABLE public.project_documents (
    id bigint DEFAULT nextval('public.project_documents_id_seq'::regclass) NOT NULL,
    project_id bigint NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text,
    file_size bigint DEFAULT 0,
    mime_type text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.project_pnl_reports (
    id bigint DEFAULT nextval('public.project_pnl_reports_id_seq'::regclass) NOT NULL,
    project_id bigint NOT NULL,
    bu_code public.bu_code NOT NULL,
    target_revenue numeric(14,2) DEFAULT 0 NOT NULL,
    target_expense numeric(14,2) DEFAULT 0 NOT NULL,
    actual_revenue numeric(14,2) DEFAULT 0 NOT NULL,
    actual_expense numeric(14,2) DEFAULT 0 NOT NULL,
    highlights text,
    improvements text,
    additional_notes text,
    status text DEFAULT 'draft'::text NOT NULL,
    finalized_at timestamp with time zone,
    author_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.project_tasks (
    id bigint DEFAULT nextval('public.project_tasks_id_seq'::regclass) NOT NULL,
    project_id bigint NOT NULL,
    bu_code public.bu_code NOT NULL,
    title text NOT NULL,
    assignee_id uuid,
    assignee text,
    due_date date NOT NULL,
    status public.task_status DEFAULT 'todo'::public.task_status NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    priority text DEFAULT 'medium'::text,
    tag text,
    description text,
    manual_id bigint
);

CREATE TABLE public.projects (
    id bigint DEFAULT nextval('public.projects_id_seq'::regclass) NOT NULL,
    bu_code public.bu_code NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    status public.project_status DEFAULT '준비중'::public.project_status NOT NULL,
    start_date date,
    end_date date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    participants jsonb DEFAULT '[]'::jsonb,
    description text,
    channel_id bigint,
    pm_id uuid,
    partner_id bigint,
    share_partner_id bigint,
    default_share_rate numeric(5,2) DEFAULT NULL::numeric,
    share_rate numeric(5,2),
    visible_to_partner boolean DEFAULT false,
    artist_response text,
    artist_response_note text,
    artist_responded_at timestamp with time zone,
    brand_bu_code public.bu_code NOT NULL,
    delivery_bu_code public.bu_code NOT NULL,
    artist_management_bu_code public.bu_code
);

CREATE TABLE public.push_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    platform text NOT NULL,
    device_id text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.quotes (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.quotes_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    bu_code public.bu_code DEFAULT 'REACT'::public.bu_code NOT NULL,
    inquiry_id bigint NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    supply_amount bigint DEFAULT 0,
    vat bigint DEFAULT 0,
    total_amount bigint DEFAULT 0,
    valid_until date,
    notes text,
    status text DEFAULT 'draft'::text NOT NULL,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    view_token uuid DEFAULT gen_random_uuid(),
    client_response text,
    client_response_at timestamp with time zone,
    client_response_note text,
    contract_id bigint,
    "references" jsonb DEFAULT '[]'::jsonb NOT NULL,
    ai_generated boolean DEFAULT false NOT NULL,
    ai_meta jsonb
);

CREATE TABLE public.react_review_annotations (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.react_review_annotations_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    room_id bigint NOT NULL,
    video_id bigint,
    body text NOT NULL,
    time_sec numeric(10,3) DEFAULT 0 NOT NULL,
    x_pct numeric(6,3),
    y_pct numeric(6,3),
    w_pct numeric(6,3),
    h_pct numeric(6,3),
    shape text DEFAULT 'time'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    author_name text NOT NULL,
    author_email text,
    author_role text DEFAULT 'client'::text NOT NULL,
    created_by uuid,
    assigned_to uuid,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    end_time_sec numeric,
    thumbnail_id bigint
);

CREATE TABLE public.react_review_events (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.react_review_events_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    room_id bigint NOT NULL,
    video_id bigint,
    annotation_id bigint,
    event_type text NOT NULL,
    actor_name text,
    actor_role text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.react_review_replies (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.react_review_replies_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    annotation_id bigint NOT NULL,
    body text NOT NULL,
    author_name text NOT NULL,
    author_email text,
    author_role text DEFAULT 'client'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.react_review_rooms (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.react_review_rooms_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    bu_code public.bu_code DEFAULT 'REACT'::public.bu_code NOT NULL,
    project_id bigint,
    title text NOT NULL,
    client_name text,
    description text,
    share_token text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    default_privacy text DEFAULT 'unlisted'::text NOT NULL,
    expires_at timestamp with time zone,
    last_viewed_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.react_review_thumbnails (
    id bigint GENERATED ALWAYS AS IDENTITY (SEQUENCE NAME public.react_review_thumbnails_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    room_id bigint NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    image_url text NOT NULL,
    storage_path text,
    size_bytes bigint,
    status text DEFAULT 'proposed'::text NOT NULL,
    author_name text DEFAULT ''::text NOT NULL,
    author_role text DEFAULT 'internal'::text NOT NULL,
    selected_at timestamp with time zone,
    selected_by text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.react_review_videos (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.react_review_videos_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    room_id bigint NOT NULL,
    version_label text DEFAULT 'v1'::text NOT NULL,
    title text NOT NULL,
    description text,
    youtube_video_id text,
    youtube_url text,
    thumbnail_url text,
    file_name text,
    mime_type text,
    size_bytes bigint,
    upload_status text DEFAULT 'queued'::text NOT NULL,
    youtube_response jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_current boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.react_staff_applications (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.react_staff_applications_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    bu_code public.bu_code DEFAULT 'REACT'::public.bu_code NOT NULL,
    applicant_type text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    display_name text NOT NULL,
    legal_name text,
    company_name text,
    representative_name text,
    contact_name text,
    phone text NOT NULL,
    email text NOT NULL,
    birth_date date,
    business_registration_number text,
    opened_on date,
    region text,
    website_url text,
    social_links jsonb DEFAULT '[]'::jsonb NOT NULL,
    portfolio_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    summary text,
    availability text,
    preferred_project_types text[] DEFAULT '{}'::text[] NOT NULL,
    equipment text[] DEFAULT '{}'::text[] NOT NULL,
    tools text[] DEFAULT '{}'::text[] NOT NULL,
    ai_tools text[] DEFAULT '{}'::text[] NOT NULL,
    capability_tags text[] DEFAULT '{}'::text[] NOT NULL,
    raw_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    admin_rating integer,
    partner_id bigint,
    created_partner_at timestamp with time zone,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    equipment_detail text
);

CREATE TABLE public.react_staff_availability_polls (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.react_staff_availability_polls_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    bu_code public.bu_code DEFAULT 'REACT'::public.bu_code NOT NULL,
    application_id bigint,
    token text NOT NULL,
    mailbox text,
    source_uid text,
    source_message_id text,
    source_subject text,
    invitee_name text,
    invitee_email text,
    invitee_phone text,
    project_key text DEFAULT 'mid_dance_school_weekly'::text NOT NULL,
    project_title text DEFAULT '이대역 댄스학원 정기 영상 촬영·편집'::text NOT NULL,
    candidate_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    age_signal text DEFAULT 'unknown'::text NOT NULL,
    age_estimate integer,
    age_evidence text,
    response_status text DEFAULT 'pending'::text NOT NULL,
    available_days text[] DEFAULT '{}'::text[] NOT NULL,
    preferred_time text,
    rate_note text,
    equipment_note text,
    message text,
    submitted_at timestamp with time zone,
    last_viewed_at timestamp with time zone,
    user_agent text,
    ip_hint text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.react_staff_capabilities (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.react_staff_capabilities_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    application_id bigint NOT NULL,
    category text NOT NULL,
    proficiency text,
    role_detail text,
    portfolio_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    tools text[] DEFAULT '{}'::text[] NOT NULL,
    equipment text[] DEFAULT '{}'::text[] NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.react_staff_files (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.react_staff_files_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    application_id bigint NOT NULL,
    document_type text NOT NULL,
    bucket text DEFAULT 'react-staff-files'::text NOT NULL,
    object_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text,
    size_bytes bigint,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.react_staff_notes (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.react_staff_notes_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    application_id bigint NOT NULL,
    note text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.react_staff_rate_cards (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.react_staff_rate_cards_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    application_id bigint NOT NULL,
    skill_group text NOT NULL,
    skill_name text,
    rate_unit text DEFAULT 'per_day'::text NOT NULL,
    currency text DEFAULT 'KRW'::text NOT NULL,
    min_amount numeric,
    max_amount numeric,
    is_negotiable boolean DEFAULT true NOT NULL,
    includes_equipment boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.react_staff_skill_entries (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.react_staff_skill_entries_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    application_id bigint NOT NULL,
    skill_group text NOT NULL,
    skill_name text NOT NULL,
    experience_level text,
    years_experience numeric(4,1),
    role_detail text,
    representative_work_url text,
    tools text[] DEFAULT '{}'::text[] NOT NULL,
    equipment text[] DEFAULT '{}'::text[] NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.reservations (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.reservations_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    resource_type public.reservation_resource_type NOT NULL,
    resource_id bigint NOT NULL,
    reserver_id uuid NOT NULL,
    project_id bigint,
    task_id bigint,
    title text NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status public.reservation_status DEFAULT 'active'::public.reservation_status,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    quantity integer DEFAULT 1 NOT NULL
);

CREATE TABLE public.task_templates (
    id bigint DEFAULT nextval('public.task_templates_id_seq'::regclass) NOT NULL,
    bu_code public.bu_code NOT NULL,
    name text NOT NULL,
    description text,
    template_type text NOT NULL,
    options_schema jsonb DEFAULT '{}'::jsonb NOT NULL,
    tasks jsonb DEFAULT '[]'::jsonb NOT NULL,
    author_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_work_status (
    user_id uuid NOT NULL,
    status text DEFAULT 'WORKING'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.vehicles (
    id bigint GENERATED BY DEFAULT AS IDENTITY (SEQUENCE NAME public.vehicles_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1),
    name text NOT NULL,
    license_plate text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.work_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_id uuid NOT NULL,
    approver_id uuid,
    request_type public.work_request_type NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    reason text NOT NULL,
    status public.approval_status DEFAULT 'pending'::public.approval_status,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. 시퀀스 소유 컬럼 (22)
-- -----------------------------------------------------------------------------

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;
ALTER SEQUENCE public.agreements_id_seq OWNED BY public.agreements.id;
ALTER SEQUENCE public.business_units_id_seq OWNED BY public.business_units.id;
ALTER SEQUENCE public.channel_contents_id_seq OWNED BY public.channel_contents.id;
ALTER SEQUENCE public.channels_id_seq OWNED BY public.channels.id;
ALTER SEQUENCE public.comment_mentions_reads_id_seq OWNED BY public.comment_mentions_reads.id;
ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;
ALTER SEQUENCE public.company_documents_id_seq OWNED BY public.company_documents.id;
ALTER SEQUENCE public.daily_work_logs_id_seq OWNED BY public.daily_work_logs.id;
ALTER SEQUENCE public.equipment_id_seq OWNED BY public.equipment.id;
ALTER SEQUENCE public.financial_entries_id_seq OWNED BY public.financial_entries.id;
ALTER SEQUENCE public.manuals_id_seq OWNED BY public.manuals.id;
ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;
ALTER SEQUENCE public.office_ips_id_seq OWNED BY public.office_ips.id;
ALTER SEQUENCE public.org_units_id_seq OWNED BY public.org_units.id;
ALTER SEQUENCE public.partner_settlement_projects_id_seq OWNED BY public.partner_settlement_projects.id;
ALTER SEQUENCE public.partner_settlements_id_seq OWNED BY public.partner_settlements.id;
ALTER SEQUENCE public.project_documents_id_seq OWNED BY public.project_documents.id;
ALTER SEQUENCE public.project_pnl_reports_id_seq OWNED BY public.project_pnl_reports.id;
ALTER SEQUENCE public.project_tasks_id_seq OWNED BY public.project_tasks.id;
ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;
ALTER SEQUENCE public.task_templates_id_seq OWNED BY public.task_templates.id;

-- -----------------------------------------------------------------------------
-- 5. 제약(PK → UNIQUE → CHECK → FK) (258)
-- -----------------------------------------------------------------------------

ALTER TABLE ONLY public.activity_logs ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.agreements ADD CONSTRAINT agreements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.app_users ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attendance_logs ADD CONSTRAINT attendance_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.bug_reports ADD CONSTRAINT bug_reports_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.business_signals ADD CONSTRAINT business_signals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.business_units ADD CONSTRAINT business_units_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.channel_contents ADD CONSTRAINT channel_contents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.channels ADD CONSTRAINT channels_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clients ADD CONSTRAINT clients_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.comment_attachments ADD CONSTRAINT comment_attachments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.comment_mentions_reads ADD CONSTRAINT comment_mentions_reads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.comments ADD CONSTRAINT comments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.company_documents ADD CONSTRAINT company_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.compensatory_requests ADD CONSTRAINT compensatory_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.contracts ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.daily_work_logs ADD CONSTRAINT daily_work_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.document_room_files ADD CONSTRAINT document_room_files_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.equipment ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.financial_entries ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.gowid_cards ADD CONSTRAINT gowid_cards_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.gowid_expense_project_link ADD CONSTRAINT gowid_expense_project_link_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.gowid_user_mapping ADD CONSTRAINT gowid_user_mapping_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inquiries ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.leave_balances ADD CONSTRAINT leave_balances_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.leave_grants ADD CONSTRAINT leave_grants_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.manuals ADD CONSTRAINT manuals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.meeting_rooms ADD CONSTRAINT meeting_rooms_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.office_ips ADD CONSTRAINT office_ips_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.org_units ADD CONSTRAINT org_units_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.partner_access_requests ADD CONSTRAINT partner_access_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.partner_bu_access ADD CONSTRAINT partner_bu_access_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.partner_categories ADD CONSTRAINT partner_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.partner_category_mappings ADD CONSTRAINT partner_category_mappings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.partner_relations ADD CONSTRAINT partner_relations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.partner_settlement_projects ADD CONSTRAINT partner_settlement_projects_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.partner_settlements ADD CONSTRAINT partner_settlements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.partner_user_access ADD CONSTRAINT partner_user_access_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.partners ADD CONSTRAINT partners_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.portfolio_items ADD CONSTRAINT portfolio_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.project_documents ADD CONSTRAINT project_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.project_pnl_reports ADD CONSTRAINT project_pnl_reports_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.project_tasks ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.push_tokens ADD CONSTRAINT push_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quotes ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.react_review_annotations ADD CONSTRAINT react_review_annotations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.react_review_events ADD CONSTRAINT react_review_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.react_review_replies ADD CONSTRAINT react_review_replies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.react_review_rooms ADD CONSTRAINT react_review_rooms_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.react_review_thumbnails ADD CONSTRAINT react_review_thumbnails_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.react_review_videos ADD CONSTRAINT react_review_videos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.react_staff_applications ADD CONSTRAINT react_staff_applications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.react_staff_availability_polls ADD CONSTRAINT react_staff_availability_polls_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.react_staff_capabilities ADD CONSTRAINT react_staff_capabilities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.react_staff_files ADD CONSTRAINT react_staff_files_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.react_staff_notes ADD CONSTRAINT react_staff_notes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.react_staff_rate_cards ADD CONSTRAINT react_staff_rate_cards_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.react_staff_skill_entries ADD CONSTRAINT react_staff_skill_entries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reservations ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.task_templates ADD CONSTRAINT task_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_work_status ADD CONSTRAINT user_work_status_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY public.vehicles ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.work_requests ADD CONSTRAINT work_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.app_users ADD CONSTRAINT app_users_email_key UNIQUE (email);
ALTER TABLE ONLY public.business_signals ADD CONSTRAINT business_signals_scope_metric_key_key UNIQUE (scope, metric_key);
ALTER TABLE ONLY public.business_units ADD CONSTRAINT business_units_code_key UNIQUE (code);
ALTER TABLE ONLY public.comment_mentions_reads ADD CONSTRAINT comment_mentions_reads_unique UNIQUE (comment_id, user_id);
ALTER TABLE ONLY public.company_documents ADD CONSTRAINT company_documents_kind_key UNIQUE (kind);
ALTER TABLE ONLY public.contracts ADD CONSTRAINT contracts_sign_token_key UNIQUE (sign_token);
ALTER TABLE ONLY public.daily_work_logs ADD CONSTRAINT daily_work_logs_user_id_log_date_key UNIQUE (user_id, log_date);
ALTER TABLE ONLY public.gowid_cards ADD CONSTRAINT gowid_cards_gowid_alias_key UNIQUE (gowid_alias);
ALTER TABLE ONLY public.gowid_expense_project_link ADD CONSTRAINT gowid_expense_project_link_gowid_expense_id_key UNIQUE (gowid_expense_id);
ALTER TABLE ONLY public.gowid_user_mapping ADD CONSTRAINT gowid_user_mapping_erp_user_id_key UNIQUE (erp_user_id);
ALTER TABLE ONLY public.gowid_user_mapping ADD CONSTRAINT gowid_user_mapping_gowid_user_id_key UNIQUE (gowid_user_id);
ALTER TABLE ONLY public.inquiries ADD CONSTRAINT inquiries_client_token_key UNIQUE (client_token);
ALTER TABLE ONLY public.leave_balances ADD CONSTRAINT leave_balances_user_id_leave_type_year_key UNIQUE (user_id, leave_type, year);
ALTER TABLE ONLY public.partner_bu_access ADD CONSTRAINT partner_bu_access_partner_id_bu_code_key UNIQUE (partner_id, bu_code);
ALTER TABLE ONLY public.partner_categories ADD CONSTRAINT partner_categories_name_key UNIQUE (name);
ALTER TABLE ONLY public.partner_category_mappings ADD CONSTRAINT partner_category_mappings_partner_id_category_id_key UNIQUE (partner_id, category_id);
ALTER TABLE ONLY public.partner_relations ADD CONSTRAINT partner_relations_parent_partner_id_child_partner_id_relati_key UNIQUE (parent_partner_id, child_partner_id, relation_type);
ALTER TABLE ONLY public.partner_settlement_projects ADD CONSTRAINT partner_settlement_projects_settlement_id_project_id_key UNIQUE (settlement_id, project_id);
ALTER TABLE ONLY public.partner_user_access ADD CONSTRAINT partner_user_access_partner_id_user_id_key UNIQUE (partner_id, user_id);
ALTER TABLE ONLY public.project_pnl_reports ADD CONSTRAINT project_pnl_reports_project_id_unique UNIQUE (project_id);
ALTER TABLE ONLY public.push_tokens ADD CONSTRAINT push_tokens_user_id_token_key UNIQUE (user_id, token);
ALTER TABLE ONLY public.quotes ADD CONSTRAINT quotes_view_token_key UNIQUE (view_token);
ALTER TABLE ONLY public.react_review_rooms ADD CONSTRAINT react_review_rooms_share_token_key UNIQUE (share_token);
ALTER TABLE ONLY public.react_staff_availability_polls ADD CONSTRAINT react_staff_availability_polls_token_key UNIQUE (token);
ALTER TABLE ONLY public.react_staff_files ADD CONSTRAINT react_staff_files_bucket_object_path_key UNIQUE (bucket, object_path);
ALTER TABLE ONLY public.vehicles ADD CONSTRAINT vehicles_license_plate_key UNIQUE (license_plate);
ALTER TABLE ONLY public.app_users ADD CONSTRAINT app_users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'dormant'::text, 'retired'::text, 'pending'::text, 'rejected'::text])));
ALTER TABLE ONLY public.business_signals ADD CONSTRAINT business_signals_color_check CHECK ((color = ANY (ARRAY['green'::text, 'yellow'::text, 'red'::text])));
ALTER TABLE ONLY public.business_signals ADD CONSTRAINT business_signals_trend_check CHECK ((trend = ANY (ARRAY['up'::text, 'down'::text, 'flat'::text])));
ALTER TABLE ONLY public.channels ADD CONSTRAINT channels_ad_status_check CHECK ((ad_status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'none'::text])));
ALTER TABLE ONLY public.comments ADD CONSTRAINT comments_entity_type_check CHECK ((entity_type = ANY (ARRAY['task'::text, 'project'::text, 'financial'::text])));
ALTER TABLE ONLY public.company_documents ADD CONSTRAINT company_documents_kind_check CHECK ((kind = ANY (ARRAY['business_registration'::text, 'bank_account'::text])));
ALTER TABLE ONLY public.compensatory_requests ADD CONSTRAINT positive_comp_days CHECK ((days > (0)::numeric));
ALTER TABLE ONLY public.contracts ADD CONSTRAINT contracts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'viewed'::text, 'signed'::text, 'completed'::text, 'cancelled'::text])));
ALTER TABLE ONLY public.document_room_files ADD CONSTRAINT document_room_files_category_check CHECK ((category = ANY (ARRAY['business_registration'::text, 'bank_copy'::text, 'introduction'::text, 'other'::text])));
ALTER TABLE ONLY public.equipment ADD CONSTRAINT equipment_quantity_check CHECK ((quantity >= 1));
ALTER TABLE ONLY public.financial_entries ADD CONSTRAINT financial_entries_amount_check CHECK ((amount >= 0));
ALTER TABLE ONLY public.financial_entries ADD CONSTRAINT financial_entries_entry_scope_check CHECK ((((entry_scope = 'external'::text) AND (counterparty_bu_code IS NULL)) OR ((entry_scope = 'internal_allocation'::text) AND (counterparty_bu_code IS NOT NULL) AND (counterparty_bu_code <> bu_code))));
ALTER TABLE ONLY public.inquiries ADD CONSTRAINT inquiries_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'done'::text])));
ALTER TABLE ONLY public.leave_balances ADD CONSTRAINT positive_total_days CHECK ((total_days >= (0)::numeric));
ALTER TABLE ONLY public.leave_balances ADD CONSTRAINT positive_used_days CHECK ((used_days >= (0)::numeric));
ALTER TABLE ONLY public.leave_balances ADD CONSTRAINT used_not_exceed_total CHECK ((used_days <= total_days));
ALTER TABLE ONLY public.leave_grants ADD CONSTRAINT positive_grant_days CHECK ((days > (0)::numeric));
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT positive_days_used CHECK ((days_used > (0)::numeric));
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT valid_date_range CHECK ((end_date >= start_date));
ALTER TABLE ONLY public.partner_access_requests ADD CONSTRAINT chk_request_status CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text])));
ALTER TABLE ONLY public.partner_bu_access ADD CONSTRAINT chk_access_level CHECK ((access_level = ANY (ARRAY['owner'::text, 'full'::text, 'view'::text, 'basic'::text])));
ALTER TABLE ONLY public.partner_relations ADD CONSTRAINT chk_no_self_reference CHECK ((parent_partner_id <> child_partner_id));
ALTER TABLE ONLY public.partner_settlements ADD CONSTRAINT partner_settlements_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'paid'::text])));
ALTER TABLE ONLY public.partner_user_access ADD CONSTRAINT chk_user_access_level CHECK ((access_level = ANY (ARRAY['full'::text, 'view'::text, 'basic'::text])));
ALTER TABLE ONLY public.partners ADD CONSTRAINT chk_security_level CHECK ((security_level = ANY (ARRAY['public'::text, 'internal'::text, 'restricted'::text, 'confidential'::text])));
ALTER TABLE ONLY public.partners ADD CONSTRAINT chk_sharing_policy CHECK ((sharing_policy = ANY (ARRAY['open'::text, 'bu_shared'::text, 'request_only'::text, 'owner_only'::text])));
ALTER TABLE ONLY public.project_pnl_reports ADD CONSTRAINT project_pnl_reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'finalized'::text])));
ALTER TABLE ONLY public.project_tasks ADD CONSTRAINT project_tasks_priority_check CHECK ((priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])));
ALTER TABLE ONLY public.projects ADD CONSTRAINT projects_artist_response_check CHECK ((artist_response = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])));
ALTER TABLE ONLY public.push_tokens ADD CONSTRAINT push_tokens_platform_check CHECK ((platform = ANY (ARRAY['android'::text, 'ios'::text, 'web'::text])));
ALTER TABLE ONLY public.quotes ADD CONSTRAINT quotes_client_response_check CHECK ((client_response = ANY (ARRAY['pending'::text, 'approved'::text, 'revision_requested'::text, 'rejected'::text])));
ALTER TABLE ONLY public.quotes ADD CONSTRAINT quotes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text])));
ALTER TABLE ONLY public.react_review_annotations ADD CONSTRAINT react_review_annotations_author_role_check CHECK ((author_role = ANY (ARRAY['internal'::text, 'client'::text, 'channel_owner'::text, 'editor'::text, 'director'::text, 'viewer'::text])));
ALTER TABLE ONLY public.react_review_annotations ADD CONSTRAINT react_review_annotations_priority_check CHECK ((priority = ANY (ARRAY['normal'::text, 'high'::text])));
ALTER TABLE ONLY public.react_review_annotations ADD CONSTRAINT react_review_annotations_shape_check CHECK ((shape = ANY (ARRAY['time'::text, 'range'::text, 'pin'::text, 'box'::text])));
ALTER TABLE ONLY public.react_review_annotations ADD CONSTRAINT react_review_annotations_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'rejected'::text, 'approved'::text])));
ALTER TABLE ONLY public.react_review_replies ADD CONSTRAINT react_review_replies_author_role_check CHECK ((author_role = ANY (ARRAY['internal'::text, 'client'::text, 'channel_owner'::text, 'editor'::text, 'director'::text, 'viewer'::text])));
ALTER TABLE ONLY public.react_review_rooms ADD CONSTRAINT react_review_rooms_default_privacy_check CHECK ((default_privacy = ANY (ARRAY['private'::text, 'unlisted'::text])));
ALTER TABLE ONLY public.react_review_rooms ADD CONSTRAINT react_review_rooms_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'uploading'::text, 'processing'::text, 'open'::text, 'in_review'::text, 'approved'::text, 'archived'::text])));
ALTER TABLE ONLY public.react_review_thumbnails ADD CONSTRAINT react_review_thumbnails_author_role_check CHECK ((author_role = ANY (ARRAY['internal'::text, 'client'::text, 'channel_owner'::text, 'editor'::text, 'director'::text, 'viewer'::text])));
ALTER TABLE ONLY public.react_review_thumbnails ADD CONSTRAINT react_review_thumbnails_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'selected'::text, 'archived'::text])));
ALTER TABLE ONLY public.react_review_videos ADD CONSTRAINT react_review_videos_upload_status_check CHECK ((upload_status = ANY (ARRAY['queued'::text, 'uploading'::text, 'processing'::text, 'ready'::text, 'failed'::text])));
ALTER TABLE ONLY public.react_staff_applications ADD CONSTRAINT react_staff_applications_admin_rating_check CHECK (((admin_rating IS NULL) OR ((admin_rating >= 1) AND (admin_rating <= 5))));
ALTER TABLE ONLY public.react_staff_applications ADD CONSTRAINT react_staff_applications_applicant_type_check CHECK ((applicant_type = ANY (ARRAY['company'::text, 'team'::text, 'individual'::text])));
ALTER TABLE ONLY public.react_staff_applications ADD CONSTRAINT react_staff_applications_status_check CHECK ((status = ANY (ARRAY['new'::text, 'reviewing'::text, 'shortlisted'::text, 'approved'::text, 'archived'::text, 'rejected'::text])));
ALTER TABLE ONLY public.react_staff_availability_polls ADD CONSTRAINT react_staff_availability_polls_age_estimate_check CHECK (((age_estimate IS NULL) OR ((age_estimate >= 14) AND (age_estimate <= 80))));
ALTER TABLE ONLY public.react_staff_availability_polls ADD CONSTRAINT react_staff_availability_polls_age_signal_check CHECK ((age_signal = ANY (ARRAY['target'::text, 'maybe'::text, 'unknown'::text, 'out_of_range'::text])));
ALTER TABLE ONLY public.react_staff_availability_polls ADD CONSTRAINT react_staff_availability_polls_response_status_check CHECK ((response_status = ANY (ARRAY['pending'::text, 'available'::text, 'maybe'::text, 'unavailable'::text])));
ALTER TABLE ONLY public.react_staff_capabilities ADD CONSTRAINT react_staff_capabilities_proficiency_check CHECK (((proficiency IS NULL) OR (proficiency = ANY (ARRAY['assist'::text, 'working'::text, 'lead'::text, 'specialist'::text]))));
ALTER TABLE ONLY public.react_staff_rate_cards ADD CONSTRAINT react_staff_rate_cards_rate_unit_check CHECK ((rate_unit = ANY (ARRAY['per_day'::text, 'per_half_day'::text, 'per_project'::text, 'per_video'::text, 'per_hour'::text, 'monthly'::text, 'negotiable'::text])));
ALTER TABLE ONLY public.react_staff_skill_entries ADD CONSTRAINT react_staff_skill_entries_experience_level_check CHECK (((experience_level IS NULL) OR (experience_level = ANY (ARRAY['junior'::text, 'mid'::text, 'senior'::text, 'lead'::text, 'specialist'::text]))));
ALTER TABLE ONLY public.reservations ADD CONSTRAINT check_end_after_start CHECK ((end_time > start_time));
ALTER TABLE ONLY public.user_work_status ADD CONSTRAINT user_work_status_status_check CHECK ((status = ANY (ARRAY['WORKING'::text, 'MEETING'::text, 'OUTSIDE'::text, 'BREAK'::text, 'OFF_WORK'::text])));
ALTER TABLE ONLY public.activity_logs ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.app_users ADD CONSTRAINT app_users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.app_users ADD CONSTRAINT app_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.app_users ADD CONSTRAINT app_users_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id);
ALTER TABLE ONLY public.attendance_logs ADD CONSTRAINT attendance_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.bug_reports ADD CONSTRAINT bug_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.channel_contents ADD CONSTRAINT channel_contents_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.channel_contents ADD CONSTRAINT channel_contents_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.channels ADD CONSTRAINT channels_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code);
ALTER TABLE ONLY public.channels ADD CONSTRAINT channels_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.comment_attachments ADD CONSTRAINT comment_attachments_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.comment_mentions_reads ADD CONSTRAINT comment_mentions_reads_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.comment_mentions_reads ADD CONSTRAINT comment_mentions_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.comments ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.compensatory_requests ADD CONSTRAINT compensatory_requests_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.compensatory_requests ADD CONSTRAINT compensatory_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.contracts ADD CONSTRAINT contracts_inquiry_id_fkey FOREIGN KEY (inquiry_id) REFERENCES public.inquiries(id);
ALTER TABLE ONLY public.contracts ADD CONSTRAINT contracts_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id);
ALTER TABLE ONLY public.daily_work_logs ADD CONSTRAINT daily_work_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.document_room_files ADD CONSTRAINT document_room_files_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.equipment ADD CONSTRAINT equipment_borrower_id_fkey FOREIGN KEY (borrower_id) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.equipment ADD CONSTRAINT equipment_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code);
ALTER TABLE ONLY public.financial_entries ADD CONSTRAINT financial_entries_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.financial_entries ADD CONSTRAINT financial_entries_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.financial_entries ADD CONSTRAINT financial_entries_counterparty_bu_code_fkey FOREIGN KEY (counterparty_bu_code) REFERENCES public.business_units(code);
ALTER TABLE ONLY public.financial_entries ADD CONSTRAINT financial_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.financial_entries ADD CONSTRAINT financial_entries_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id);
ALTER TABLE ONLY public.financial_entries ADD CONSTRAINT financial_entries_payee_app_user_id_fkey FOREIGN KEY (payee_app_user_id) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.financial_entries ADD CONSTRAINT financial_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.gowid_cards ADD CONSTRAINT gowid_cards_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.gowid_expense_project_link ADD CONSTRAINT gowid_expense_project_link_financial_entry_id_fkey FOREIGN KEY (financial_entry_id) REFERENCES public.financial_entries(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.gowid_expense_project_link ADD CONSTRAINT gowid_expense_project_link_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.gowid_expense_project_link ADD CONSTRAINT gowid_expense_project_link_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.gowid_user_mapping ADD CONSTRAINT gowid_user_mapping_erp_user_id_fkey FOREIGN KEY (erp_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.inquiries ADD CONSTRAINT inquiries_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.leave_balances ADD CONSTRAINT leave_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.leave_grants ADD CONSTRAINT leave_grants_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.leave_grants ADD CONSTRAINT leave_grants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT leave_requests_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT leave_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.manuals ADD CONSTRAINT manuals_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.manuals ADD CONSTRAINT manuals_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.partner_access_requests ADD CONSTRAINT partner_access_requests_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.partner_access_requests ADD CONSTRAINT partner_access_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.partner_access_requests ADD CONSTRAINT partner_access_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.partner_bu_access ADD CONSTRAINT partner_bu_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.partner_bu_access ADD CONSTRAINT partner_bu_access_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.partner_category_mappings ADD CONSTRAINT partner_category_mappings_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.partner_categories(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.partner_category_mappings ADD CONSTRAINT partner_category_mappings_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.partner_relations ADD CONSTRAINT partner_relations_child_partner_id_fkey FOREIGN KEY (child_partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.partner_relations ADD CONSTRAINT partner_relations_parent_partner_id_fkey FOREIGN KEY (parent_partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.partner_settlement_projects ADD CONSTRAINT partner_settlement_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE ONLY public.partner_settlement_projects ADD CONSTRAINT partner_settlement_projects_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.partner_settlements(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.partner_settlements ADD CONSTRAINT partner_settlements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.partner_settlements ADD CONSTRAINT partner_settlements_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id);
ALTER TABLE ONLY public.partner_user_access ADD CONSTRAINT partner_user_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.partner_user_access ADD CONSTRAINT partner_user_access_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.partner_user_access ADD CONSTRAINT partner_user_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.partners ADD CONSTRAINT partners_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.project_documents ADD CONSTRAINT project_documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_documents ADD CONSTRAINT project_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.project_pnl_reports ADD CONSTRAINT project_pnl_reports_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.project_pnl_reports ADD CONSTRAINT project_pnl_reports_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_tasks ADD CONSTRAINT project_tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.project_tasks ADD CONSTRAINT project_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.project_tasks ADD CONSTRAINT project_tasks_manual_id_fkey FOREIGN KEY (manual_id) REFERENCES public.manuals(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.project_tasks ADD CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.projects ADD CONSTRAINT fk_projects_pm_id FOREIGN KEY (pm_id) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.projects ADD CONSTRAINT projects_artist_management_bu_code_fkey FOREIGN KEY (artist_management_bu_code) REFERENCES public.business_units(code);
ALTER TABLE ONLY public.projects ADD CONSTRAINT projects_brand_bu_code_fkey FOREIGN KEY (brand_bu_code) REFERENCES public.business_units(code);
ALTER TABLE ONLY public.projects ADD CONSTRAINT projects_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code);
ALTER TABLE ONLY public.projects ADD CONSTRAINT projects_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.projects ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.projects ADD CONSTRAINT projects_delivery_bu_code_fkey FOREIGN KEY (delivery_bu_code) REFERENCES public.business_units(code);
ALTER TABLE ONLY public.projects ADD CONSTRAINT projects_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id);
ALTER TABLE ONLY public.projects ADD CONSTRAINT projects_share_partner_id_fkey FOREIGN KEY (share_partner_id) REFERENCES public.partners(id);
ALTER TABLE ONLY public.push_tokens ADD CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.quotes ADD CONSTRAINT quotes_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.quotes ADD CONSTRAINT quotes_inquiry_id_fkey FOREIGN KEY (inquiry_id) REFERENCES public.inquiries(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_review_annotations ADD CONSTRAINT react_review_annotations_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.react_review_annotations ADD CONSTRAINT react_review_annotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.react_review_annotations ADD CONSTRAINT react_review_annotations_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.react_review_annotations ADD CONSTRAINT react_review_annotations_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.react_review_rooms(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_review_annotations ADD CONSTRAINT react_review_annotations_thumbnail_id_fkey FOREIGN KEY (thumbnail_id) REFERENCES public.react_review_thumbnails(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_review_annotations ADD CONSTRAINT react_review_annotations_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.react_review_videos(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_review_events ADD CONSTRAINT react_review_events_annotation_id_fkey FOREIGN KEY (annotation_id) REFERENCES public.react_review_annotations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_review_events ADD CONSTRAINT react_review_events_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.react_review_rooms(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_review_events ADD CONSTRAINT react_review_events_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.react_review_videos(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_review_replies ADD CONSTRAINT react_review_replies_annotation_id_fkey FOREIGN KEY (annotation_id) REFERENCES public.react_review_annotations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_review_replies ADD CONSTRAINT react_review_replies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.react_review_rooms ADD CONSTRAINT react_review_rooms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.react_review_rooms ADD CONSTRAINT react_review_rooms_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.react_review_thumbnails ADD CONSTRAINT react_review_thumbnails_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.react_review_thumbnails ADD CONSTRAINT react_review_thumbnails_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.react_review_rooms(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_review_videos ADD CONSTRAINT react_review_videos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.react_review_videos ADD CONSTRAINT react_review_videos_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.react_review_rooms(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_staff_applications ADD CONSTRAINT react_staff_applications_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.react_staff_applications ADD CONSTRAINT react_staff_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.react_staff_availability_polls ADD CONSTRAINT react_staff_availability_polls_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.react_staff_applications(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.react_staff_capabilities ADD CONSTRAINT react_staff_capabilities_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.react_staff_applications(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_staff_files ADD CONSTRAINT react_staff_files_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.react_staff_applications(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_staff_notes ADD CONSTRAINT react_staff_notes_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.react_staff_applications(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_staff_notes ADD CONSTRAINT react_staff_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.react_staff_rate_cards ADD CONSTRAINT react_staff_rate_cards_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.react_staff_applications(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.react_staff_skill_entries ADD CONSTRAINT react_staff_skill_entries_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.react_staff_applications(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reservations ADD CONSTRAINT reservations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.reservations ADD CONSTRAINT reservations_reserver_id_fkey FOREIGN KEY (reserver_id) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.reservations ADD CONSTRAINT reservations_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.project_tasks(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.task_templates ADD CONSTRAINT task_templates_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.app_users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.user_work_status ADD CONSTRAINT user_work_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.work_requests ADD CONSTRAINT work_requests_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.app_users(id);
ALTER TABLE ONLY public.work_requests ADD CONSTRAINT work_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- 6. 인덱스(제약이 만든 인덱스 제외) (174)
-- -----------------------------------------------------------------------------

CREATE INDEX contracts_inquiry_created_idx ON public.contracts USING btree (inquiry_id, created_at DESC);
CREATE INDEX financial_entries_contract_idx ON public.financial_entries USING btree (contract_id) WHERE (contract_id IS NOT NULL);
CREATE UNIQUE INDEX financial_entries_contract_installment_uq ON public.financial_entries USING btree (contract_id, category) WHERE ((kind = 'revenue'::public.financial_kind) AND (contract_id IS NOT NULL) AND (status <> 'canceled'::public.financial_status) AND (category = ANY (ARRAY['deposit'::text, 'balance'::text])));
CREATE INDEX financial_entries_kind_bu_due_idx ON public.financial_entries USING btree (kind, bu_code, due_date);
CREATE INDEX idx_access_requests_owner_bu ON public.partner_access_requests USING btree (requester_bu_code);
CREATE INDEX idx_access_requests_partner ON public.partner_access_requests USING btree (partner_id);
CREATE INDEX idx_access_requests_requester ON public.partner_access_requests USING btree (requester_id);
CREATE INDEX idx_access_requests_status ON public.partner_access_requests USING btree (status);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs USING btree (entity_type, entity_id);
CREATE INDEX idx_activity_logs_user_date ON public.activity_logs USING btree (user_id, occurred_at);
CREATE INDEX idx_app_users_bu_code ON public.app_users USING btree (bu_code);
CREATE INDEX idx_app_users_pending ON public.app_users USING btree (status) WHERE (status = 'pending'::text);
CREATE INDEX idx_app_users_role ON public.app_users USING btree (role);
CREATE INDEX idx_attendance_logs_pending_confirm ON public.attendance_logs USING btree (user_id, is_auto_checkout, user_confirmed) WHERE ((is_auto_checkout = true) AND (user_confirmed = false));
CREATE INDEX idx_attendance_logs_user_date ON public.attendance_logs USING btree (user_id, work_date);
CREATE INDEX idx_attendance_status ON public.attendance_logs USING btree (status);
CREATE INDEX idx_attendance_user_date ON public.attendance_logs USING btree (user_id, work_date);
CREATE INDEX idx_attendance_work_date ON public.attendance_logs USING btree (work_date);
CREATE INDEX idx_channel_contents_channel_id ON public.channel_contents USING btree (channel_id);
CREATE INDEX idx_channel_contents_stage ON public.channel_contents USING btree (stage);
CREATE INDEX idx_channel_contents_upload_date ON public.channel_contents USING btree (upload_date);
CREATE INDEX idx_channels_ad_status ON public.channels USING btree (ad_status);
CREATE INDEX idx_channels_bu_code ON public.channels USING btree (bu_code);
CREATE INDEX idx_channels_manager ON public.channels USING btree (manager_id);
CREATE INDEX idx_channels_status ON public.channels USING btree (status);
CREATE INDEX idx_comment_attachments_comment_id ON public.comment_attachments USING btree (comment_id);
CREATE INDEX idx_comment_mentions_reads_comment_id ON public.comment_mentions_reads USING btree (comment_id);
CREATE INDEX idx_comment_mentions_reads_read_at ON public.comment_mentions_reads USING btree (read_at DESC);
CREATE INDEX idx_comment_mentions_reads_user_id ON public.comment_mentions_reads USING btree (user_id);
CREATE INDEX idx_comments_author_id ON public.comments USING btree (author_id);
CREATE INDEX idx_comments_created_at ON public.comments USING btree (created_at DESC);
CREATE INDEX idx_comments_entity ON public.comments USING btree (entity_type, entity_id);
CREATE INDEX idx_compensatory_requests_requester ON public.compensatory_requests USING btree (requester_id);
CREATE INDEX idx_compensatory_requests_status ON public.compensatory_requests USING btree (status);
CREATE INDEX idx_contracts_bu_code ON public.contracts USING btree (bu_code);
CREATE INDEX idx_contracts_inquiry_id ON public.contracts USING btree (inquiry_id);
CREATE INDEX idx_contracts_sign_token ON public.contracts USING btree (sign_token);
CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);
CREATE INDEX idx_daily_work_logs_user_date ON public.daily_work_logs USING btree (user_id, log_date);
CREATE INDEX idx_document_room_files_category ON public.document_room_files USING btree (category);
CREATE INDEX idx_document_room_files_created_at ON public.document_room_files USING btree (created_at DESC);
CREATE INDEX idx_equipment_borrower ON public.equipment USING btree (borrower_id);
CREATE INDEX idx_equipment_bu_code ON public.equipment USING btree (bu_code);
CREATE INDEX idx_equipment_category ON public.equipment USING btree (category);
CREATE INDEX idx_equipment_status ON public.equipment USING btree (status);
CREATE INDEX idx_fe_due_date ON public.financial_entries USING btree (due_date) WHERE (kind = 'expense'::public.financial_kind);
CREATE INDEX idx_fe_payee_app_user ON public.financial_entries USING btree (payee_app_user_id) WHERE (payee_app_user_id IS NOT NULL);
CREATE INDEX idx_financial_bu_kind ON public.financial_entries USING btree (bu_code, kind);
CREATE INDEX idx_financial_entries_internal_counterparty ON public.financial_entries USING btree (counterparty_bu_code, occurred_at) WHERE (entry_scope = 'internal_allocation'::text);
CREATE INDEX idx_financial_entries_partner_id ON public.financial_entries USING btree (partner_id);
CREATE INDEX idx_financial_occurred_at ON public.financial_entries USING btree (occurred_at);
CREATE INDEX idx_financial_project_id ON public.financial_entries USING btree (project_id);
CREATE INDEX idx_financial_status ON public.financial_entries USING btree (status);
CREATE INDEX idx_inquiries_bu_code ON public.inquiries USING btree (bu_code);
CREATE INDEX idx_inquiries_client_token ON public.inquiries USING btree (client_token);
CREATE INDEX idx_inquiries_created_at ON public.inquiries USING btree (created_at DESC);
CREATE INDEX idx_inquiries_status ON public.inquiries USING btree (status);
CREATE INDEX idx_leave_balances_user_year ON public.leave_balances USING btree (user_id, year);
CREATE INDEX idx_leave_grants_user_year ON public.leave_grants USING btree (user_id, year);
CREATE INDEX idx_leave_requests_dates ON public.leave_requests USING btree (start_date, end_date);
CREATE INDEX idx_leave_requests_requester ON public.leave_requests USING btree (requester_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests USING btree (status);
CREATE INDEX idx_manuals_author ON public.manuals USING btree (author_id);
CREATE INDEX idx_manuals_bu_code ON public.manuals USING btree (bu_code);
CREATE INDEX idx_manuals_bu_code_is_active ON public.manuals USING btree (bu_code, is_active);
CREATE INDEX idx_manuals_category ON public.manuals USING btree (category);
CREATE INDEX idx_meeting_rooms_active ON public.meeting_rooms USING btree (is_active);
CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications USING btree (user_id, read);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, read);
CREATE INDEX idx_notifications_user_read_created ON public.notifications USING btree (user_id, read, created_at DESC);
CREATE INDEX idx_partner_bu_access_bu ON public.partner_bu_access USING btree (bu_code);
CREATE INDEX idx_partner_bu_access_level ON public.partner_bu_access USING btree (access_level);
CREATE INDEX idx_partner_bu_access_partner ON public.partner_bu_access USING btree (partner_id);
CREATE INDEX idx_partner_category_mappings_category ON public.partner_category_mappings USING btree (category_id);
CREATE INDEX idx_partner_category_mappings_partner ON public.partner_category_mappings USING btree (partner_id);
CREATE INDEX idx_partner_relations_child ON public.partner_relations USING btree (child_partner_id);
CREATE INDEX idx_partner_relations_parent ON public.partner_relations USING btree (parent_partner_id);
CREATE INDEX idx_partner_relations_type ON public.partner_relations USING btree (relation_type);
CREATE INDEX idx_partner_settlement_projects_settlement ON public.partner_settlement_projects USING btree (settlement_id);
CREATE INDEX idx_partner_settlements_partner ON public.partner_settlements USING btree (partner_id);
CREATE INDEX idx_partner_settlements_status ON public.partner_settlements USING btree (status);
CREATE INDEX idx_partner_user_access_partner ON public.partner_user_access USING btree (partner_id);
CREATE INDEX idx_partner_user_access_user ON public.partner_user_access USING btree (user_id);
CREATE INDEX idx_partners_display_name ON public.partners USING btree (display_name);
CREATE UNIQUE INDEX idx_partners_email ON public.partners USING btree (email) WHERE ((email IS NOT NULL) AND (deleted_at IS NULL));
CREATE INDEX idx_partners_entity_type ON public.partners USING btree (entity_type);
CREATE INDEX idx_partners_metadata ON public.partners USING gin (metadata);
CREATE INDEX idx_partners_name_en ON public.partners USING btree (name_en);
CREATE INDEX idx_partners_name_ko ON public.partners USING btree (name_ko);
CREATE INDEX idx_partners_owner_bu ON public.partners USING btree (owner_bu_code);
CREATE UNIQUE INDEX idx_partners_phone ON public.partners USING btree (phone) WHERE ((phone IS NOT NULL) AND (deleted_at IS NULL));
CREATE INDEX idx_portfolio_items_bu_code ON public.portfolio_items USING btree (bu_code);
CREATE INDEX idx_portfolio_items_category ON public.portfolio_items USING btree (category);
CREATE INDEX idx_portfolio_items_visible ON public.portfolio_items USING btree (is_visible) WHERE (is_visible = true);
CREATE INDEX idx_project_documents_project_id ON public.project_documents USING btree (project_id);
CREATE INDEX idx_project_pnl_reports_bu_code ON public.project_pnl_reports USING btree (bu_code);
CREATE INDEX idx_project_pnl_reports_project_id ON public.project_pnl_reports USING btree (project_id);
CREATE INDEX idx_project_pnl_reports_status ON public.project_pnl_reports USING btree (status);
CREATE INDEX idx_project_tasks_manual_id ON public.project_tasks USING btree (manual_id);
CREATE INDEX idx_projects_artist_management_bu_code ON public.projects USING btree (artist_management_bu_code) WHERE (artist_management_bu_code IS NOT NULL);
CREATE INDEX idx_projects_brand_bu_code ON public.projects USING btree (brand_bu_code);
CREATE INDEX idx_projects_bu_code ON public.projects USING btree (bu_code);
CREATE INDEX idx_projects_channel_id ON public.projects USING btree (channel_id);
CREATE INDEX idx_projects_delivery_bu_code ON public.projects USING btree (delivery_bu_code);
CREATE INDEX idx_projects_participants ON public.projects USING gin (participants);
CREATE INDEX idx_projects_partner_id ON public.projects USING btree (partner_id);
CREATE INDEX idx_projects_period ON public.projects USING btree (start_date, end_date);
CREATE INDEX idx_projects_pm_id ON public.projects USING btree (pm_id);
CREATE INDEX idx_projects_share_partner ON public.projects USING btree (share_partner_id) WHERE (share_partner_id IS NOT NULL);
CREATE INDEX idx_projects_share_partner_id ON public.projects USING btree (share_partner_id) WHERE (share_partner_id IS NOT NULL);
CREATE INDEX idx_push_tokens_active ON public.push_tokens USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_push_tokens_platform ON public.push_tokens USING btree (platform);
CREATE INDEX idx_push_tokens_user_id ON public.push_tokens USING btree (user_id);
CREATE INDEX idx_quotes_bu_code ON public.quotes USING btree (bu_code);
CREATE INDEX idx_quotes_inquiry_id ON public.quotes USING btree (inquiry_id);
CREATE INDEX idx_quotes_status ON public.quotes USING btree (status);
CREATE INDEX idx_quotes_view_token ON public.quotes USING btree (view_token);
CREATE INDEX idx_reservations_reserver ON public.reservations USING btree (reserver_id);
CREATE INDEX idx_reservations_resource ON public.reservations USING btree (resource_type, resource_id);
CREATE INDEX idx_reservations_status ON public.reservations USING btree (status);
CREATE INDEX idx_reservations_time ON public.reservations USING btree (start_time, end_time);
CREATE INDEX idx_task_templates_bu_code ON public.task_templates USING btree (bu_code);
CREATE INDEX idx_task_templates_is_active ON public.task_templates USING btree (is_active);
CREATE INDEX idx_task_templates_template_type ON public.task_templates USING btree (template_type);
CREATE INDEX idx_tasks_bu_code ON public.project_tasks USING btree (bu_code);
CREATE INDEX idx_tasks_due_date ON public.project_tasks USING btree (due_date);
CREATE INDEX idx_tasks_priority ON public.project_tasks USING btree (priority);
CREATE INDEX idx_tasks_project_id ON public.project_tasks USING btree (project_id);
CREATE INDEX idx_tasks_status ON public.project_tasks USING btree (status);
CREATE INDEX idx_user_work_status_status ON public.user_work_status USING btree (status);
CREATE INDEX idx_vehicles_active ON public.vehicles USING btree (is_active);
CREATE INDEX idx_work_requests_approver ON public.work_requests USING btree (approver_id);
CREATE INDEX idx_work_requests_dates ON public.work_requests USING btree (start_date, end_date);
CREATE INDEX idx_work_requests_requester ON public.work_requests USING btree (requester_id);
CREATE INDEX idx_work_requests_status ON public.work_requests USING btree (status);
CREATE INDEX inquiries_partner_id_idx ON public.inquiries USING btree (partner_id) WHERE (partner_id IS NOT NULL);
CREATE INDEX portfolio_items_react_display_sort_idx ON public.portfolio_items USING btree (bu_code, is_visible, published_at DESC, youtube_view_count DESC);
CREATE INDEX portfolio_items_react_featured_priority_idx ON public.portfolio_items USING btree (bu_code, is_visible, featured_priority DESC);
CREATE INDEX quotes_ai_generated_status_idx ON public.quotes USING btree (ai_generated, status) WHERE (ai_generated = true);
CREATE INDEX quotes_contract_id_idx ON public.quotes USING btree (contract_id) WHERE (contract_id IS NOT NULL);
CREATE INDEX quotes_inquiry_created_idx ON public.quotes USING btree (inquiry_id, created_at DESC);
CREATE INDEX react_review_annotations_room_status_idx ON public.react_review_annotations USING btree (room_id, status, created_at DESC);
CREATE INDEX react_review_annotations_thumbnail_idx ON public.react_review_annotations USING btree (thumbnail_id);
CREATE INDEX react_review_annotations_video_time_idx ON public.react_review_annotations USING btree (video_id, time_sec);
CREATE INDEX react_review_events_room_idx ON public.react_review_events USING btree (room_id, created_at DESC);
CREATE INDEX react_review_replies_annotation_idx ON public.react_review_replies USING btree (annotation_id, created_at);
CREATE INDEX react_review_rooms_bu_status_idx ON public.react_review_rooms USING btree (bu_code, status, created_at DESC);
CREATE INDEX react_review_rooms_project_idx ON public.react_review_rooms USING btree (project_id, created_at DESC);
CREATE INDEX react_review_thumbnails_room_idx ON public.react_review_thumbnails USING btree (room_id);
CREATE UNIQUE INDEX react_review_videos_one_current_idx ON public.react_review_videos USING btree (room_id) WHERE is_current;
CREATE INDEX react_review_videos_room_idx ON public.react_review_videos USING btree (room_id, created_at DESC);
CREATE INDEX react_review_videos_youtube_idx ON public.react_review_videos USING btree (youtube_video_id) WHERE (youtube_video_id IS NOT NULL);
CREATE INDEX react_staff_applications_bu_status_idx ON public.react_staff_applications USING btree (bu_code, status, created_at DESC);
CREATE INDEX react_staff_applications_capability_tags_idx ON public.react_staff_applications USING gin (capability_tags);
CREATE INDEX react_staff_applications_equipment_idx ON public.react_staff_applications USING gin (equipment);
CREATE INDEX react_staff_applications_tools_idx ON public.react_staff_applications USING gin (tools);
CREATE INDEX react_staff_applications_type_idx ON public.react_staff_applications USING btree (applicant_type);
CREATE INDEX react_staff_availability_polls_application_idx ON public.react_staff_availability_polls USING btree (application_id, created_at DESC);
CREATE INDEX react_staff_availability_polls_email_idx ON public.react_staff_availability_polls USING btree (lower(invitee_email));
CREATE INDEX react_staff_availability_polls_project_status_idx ON public.react_staff_availability_polls USING btree (project_key, response_status, created_at DESC);
CREATE UNIQUE INDEX react_staff_availability_polls_source_uid_key ON public.react_staff_availability_polls USING btree (mailbox, source_uid) WHERE ((mailbox IS NOT NULL) AND (source_uid IS NOT NULL));
CREATE INDEX react_staff_capabilities_application_idx ON public.react_staff_capabilities USING btree (application_id);
CREATE INDEX react_staff_capabilities_category_idx ON public.react_staff_capabilities USING btree (category);
CREATE INDEX react_staff_files_application_idx ON public.react_staff_files USING btree (application_id);
CREATE INDEX react_staff_notes_application_idx ON public.react_staff_notes USING btree (application_id, created_at DESC);
CREATE INDEX react_staff_rate_cards_amount_idx ON public.react_staff_rate_cards USING btree (min_amount, max_amount);
CREATE INDEX react_staff_rate_cards_application_idx ON public.react_staff_rate_cards USING btree (application_id);
CREATE INDEX react_staff_rate_cards_group_idx ON public.react_staff_rate_cards USING btree (skill_group, rate_unit);
CREATE INDEX react_staff_skill_entries_application_idx ON public.react_staff_skill_entries USING btree (application_id);
CREATE INDEX react_staff_skill_entries_equipment_idx ON public.react_staff_skill_entries USING gin (equipment);
CREATE INDEX react_staff_skill_entries_group_skill_idx ON public.react_staff_skill_entries USING btree (skill_group, skill_name);
CREATE INDEX react_staff_skill_entries_tools_idx ON public.react_staff_skill_entries USING gin (tools);

-- -----------------------------------------------------------------------------
-- 7. 함수 (14)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_reservation_overlap()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_reserved integer;
    equipment_total integer;
BEGIN
    -- 취소된 예약은 확인하지 않음
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- equipment 타입인 경우: 수량 기반 체크
    IF NEW.resource_type = 'equipment' THEN
        -- 장비의 총 수량 가져오기
        SELECT COALESCE(quantity, 1) INTO equipment_total
        FROM equipment
        WHERE id = NEW.resource_id;

        -- 해당 시간대에 이미 예약된 수량 합계 계산
        SELECT COALESCE(SUM(quantity), 0) INTO total_reserved
        FROM reservations
        WHERE resource_type = NEW.resource_type
        AND resource_id = NEW.resource_id
        AND status = 'active'
        AND id != COALESCE(NEW.id, 0)
        AND (
            (NEW.start_time >= start_time AND NEW.start_time < end_time)
            OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
            OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
        );

        -- 예약하려는 수량 + 이미 예약된 수량이 총 수량 초과시 거부
        IF (total_reserved + COALESCE(NEW.quantity, 1)) > equipment_total THEN
            RAISE EXCEPTION '해당 시간에 대여 가능한 수량을 초과합니다. (가능: %, 요청: %)', 
                (equipment_total - total_reserved), NEW.quantity;
        END IF;
    ELSE
        -- meeting_room, vehicle: 기존 로직 (겹치면 무조건 거부)
        IF EXISTS (
            SELECT 1 FROM reservations
            WHERE resource_type = NEW.resource_type
            AND resource_id = NEW.resource_id
            AND status = 'active'
            AND id != COALESCE(NEW.id, 0)
            AND (
                (NEW.start_time >= start_time AND NEW.start_time < end_time)
                OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
                OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
            )
        ) THEN
            RAISE EXCEPTION '해당 시간에 이미 예약이 존재합니다. 중복 예약은 불가능합니다.';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_reserver_bu_code()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 예약자의 bu_code가 NULL이 아닌지 확인
    IF NOT EXISTS (
        SELECT 1 FROM app_users
        WHERE id = NEW.reserver_id
        AND bu_code IS NOT NULL
    ) THEN
        RAISE EXCEPTION '소속 사업부(bu_code)가 지정된 사용자만 예약할 수 있습니다.';
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.react_review_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.react_staff_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_project_bu_role_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.brand_bu_code := coalesce(new.brand_bu_code, new.bu_code);
  new.delivery_bu_code := coalesce(new.delivery_bu_code, new.bu_code);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_comment_attachments_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_document_room_files_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_partner_access_requests_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_partners_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_project_pnl_reports_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_push_tokens_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_task_templates_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 8. 트리거 (21)
-- -----------------------------------------------------------------------------

CREATE TRIGGER update_attendance_logs_updated_at BEFORE UPDATE ON public.attendance_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comment_attachments_updated_at_trigger BEFORE UPDATE ON public.comment_attachments FOR EACH ROW EXECUTE FUNCTION public.update_comment_attachments_updated_at();
CREATE TRIGGER update_compensatory_requests_updated_at BEFORE UPDATE ON public.compensatory_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_document_room_files_updated_at_trigger BEFORE UPDATE ON public.document_room_files FOR EACH ROW EXECUTE FUNCTION public.update_document_room_files_updated_at();
CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON public.leave_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_notifications_updated_at();
CREATE TRIGGER trigger_partner_access_requests_updated_at BEFORE UPDATE ON public.partner_access_requests FOR EACH ROW EXECUTE FUNCTION public.update_partner_access_requests_updated_at();
CREATE TRIGGER trigger_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.update_partners_updated_at();
CREATE TRIGGER update_project_pnl_reports_updated_at_trigger BEFORE UPDATE ON public.project_pnl_reports FOR EACH ROW EXECUTE FUNCTION public.update_project_pnl_reports_updated_at();
CREATE TRIGGER projects_set_bu_role_defaults BEFORE INSERT OR UPDATE OF bu_code, brand_bu_code, delivery_bu_code ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_project_bu_role_defaults();
CREATE TRIGGER trigger_push_tokens_updated_at BEFORE UPDATE ON public.push_tokens FOR EACH ROW EXECUTE FUNCTION public.update_push_tokens_updated_at();
CREATE TRIGGER react_review_annotations_touch_updated_at BEFORE UPDATE ON public.react_review_annotations FOR EACH ROW EXECUTE FUNCTION public.react_review_touch_updated_at();
CREATE TRIGGER react_review_rooms_touch_updated_at BEFORE UPDATE ON public.react_review_rooms FOR EACH ROW EXECUTE FUNCTION public.react_review_touch_updated_at();
CREATE TRIGGER react_review_videos_touch_updated_at BEFORE UPDATE ON public.react_review_videos FOR EACH ROW EXECUTE FUNCTION public.react_review_touch_updated_at();
CREATE TRIGGER react_staff_applications_touch_updated_at BEFORE UPDATE ON public.react_staff_applications FOR EACH ROW EXECUTE FUNCTION public.react_staff_touch_updated_at();
CREATE TRIGGER react_staff_availability_polls_touch_updated_at BEFORE UPDATE ON public.react_staff_availability_polls FOR EACH ROW EXECUTE FUNCTION public.react_staff_touch_updated_at();
CREATE TRIGGER check_reserver_authorization BEFORE INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.check_reserver_bu_code();
CREATE TRIGGER prevent_reservation_overlap BEFORE INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.check_reservation_overlap();
CREATE TRIGGER update_task_templates_updated_at_trigger BEFORE UPDATE ON public.task_templates FOR EACH ROW EXECUTE FUNCTION public.update_task_templates_updated_at();
CREATE TRIGGER update_work_requests_updated_at BEFORE UPDATE ON public.work_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 9. 뷰 (2)
-- -----------------------------------------------------------------------------

CREATE VIEW public.attendance_logs_with_user AS
 SELECT al.id,
    al.user_id,
    au.name AS user_name,
    au.email AS user_email,
    au.bu_code,
    au."position",
    al.work_date,
    (al.check_in_at AT TIME ZONE 'Asia/Seoul'::text)::time without time zone AS check_in_time_kst,
    (al.check_out_at AT TIME ZONE 'Asia/Seoul'::text)::time without time zone AS check_out_time_kst,
    al.check_in_at AS check_in_utc,
    al.check_out_at AS check_out_utc,
        CASE
            WHEN al.check_out_at IS NOT NULL AND al.check_in_at IS NOT NULL THEN ((round(EXTRACT(epoch FROM al.check_out_at - al.check_in_at) / 60::numeric)::integer || '분 ('::text) || round(EXTRACT(epoch FROM al.check_out_at - al.check_in_at) / 3600::numeric, 1)) || '시간)'::text
            ELSE '근무중'::text
        END AS work_duration,
    al.status,
    al.is_overtime,
    al.is_modified,
    al.modification_reason,
    al.created_at
   FROM public.attendance_logs al
     JOIN public.app_users au ON al.user_id = au.id
  ORDER BY al.work_date DESC, al.check_in_at DESC;

CREATE VIEW public.project_pnl_reports_with_profit AS
 SELECT id,
    project_id,
    bu_code,
    target_revenue,
    target_expense,
    actual_revenue,
    actual_expense,
    highlights,
    improvements,
    additional_notes,
    status,
    finalized_at,
    author_id,
    created_at,
    updated_at,
    actual_revenue - actual_expense AS actual_net_profit,
    target_revenue - target_expense AS target_net_profit,
        CASE
            WHEN target_revenue > 0::numeric THEN round((actual_revenue - target_revenue) / target_revenue * 100::numeric, 2)
            ELSE NULL::numeric
        END AS revenue_achievement_rate,
        CASE
            WHEN target_expense > 0::numeric THEN round((actual_expense - target_expense) / target_expense * 100::numeric, 2)
            ELSE NULL::numeric
        END AS expense_variance_rate
   FROM public.project_pnl_reports r;

-- -----------------------------------------------------------------------------
-- 10. RLS 켜기 (66)
-- -----------------------------------------------------------------------------

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_mentions_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compensatory_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_room_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gowid_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gowid_expense_project_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gowid_user_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_bu_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_settlement_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_user_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_pnl_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.react_review_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.react_review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.react_review_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.react_review_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.react_review_thumbnails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.react_review_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.react_staff_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.react_staff_availability_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.react_staff_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.react_staff_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.react_staff_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.react_staff_rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.react_staff_skill_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_work_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_requests ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 11. RLS 정책 (132)
-- -----------------------------------------------------------------------------

CREATE POLICY "erp authenticated full access" ON public.activity_logs AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.activity_logs AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.agreements AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.agreements AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.app_users AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.app_users AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "signup can insert app_users" ON public.app_users AS PERMISSIVE FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Admins can update all attendance logs" ON public.attendance_logs AS PERMISSIVE FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

CREATE POLICY "Admins can view all attendance logs" ON public.attendance_logs AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

CREATE POLICY "Managers can update team member attendance logs" ON public.attendance_logs AS PERMISSIVE FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['manager'::public.erp_role, 'admin'::public.erp_role])) AND (au.bu_code = ( SELECT app_users.bu_code
           FROM public.app_users
          WHERE (app_users.id = attendance_logs.user_id)))))));

CREATE POLICY "Managers can view team member attendance logs" ON public.attendance_logs AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['manager'::public.erp_role, 'admin'::public.erp_role])) AND (au.bu_code = ( SELECT app_users.bu_code
           FROM public.app_users
          WHERE (app_users.id = attendance_logs.user_id)))))));

CREATE POLICY "Users can create and update their own attendance logs" ON public.attendance_logs AS PERMISSIVE FOR ALL TO public
    USING ((auth.uid() = user_id))
    WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own attendance logs" ON public.attendance_logs AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = user_id));

CREATE POLICY "erp authenticated full access" ON public.bug_reports AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.bug_reports AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.business_signals AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.business_signals AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.business_units AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.business_units AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.channel_contents AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.channel_contents AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.channels AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.channels AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete" ON public.clients AS PERMISSIVE FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert" ON public.clients AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON public.clients AS PERMISSIVE FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "Allow public read access" ON public.clients AS PERMISSIVE FOR SELECT TO public
    USING (true);

CREATE POLICY "erp authenticated full access" ON public.comment_attachments AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.comment_attachments AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.comment_mentions_reads AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.comment_mentions_reads AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.comments AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.comments AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "company_documents read all" ON public.company_documents AS PERMISSIVE FOR SELECT TO public
    USING (true);

CREATE POLICY "company_documents service write" ON public.company_documents AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins can view all compensatory requests" ON public.compensatory_requests AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = ANY (ARRAY['admin'::public.erp_role, 'leader'::public.erp_role]))))));

CREATE POLICY "HEAD Admins can update compensatory requests" ON public.compensatory_requests AS PERMISSIVE FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role) AND (app_users.bu_code = 'HEAD'::public.bu_code)))));

CREATE POLICY "Users can create own compensatory requests" ON public.compensatory_requests AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((auth.uid() = requester_id));

CREATE POLICY "Users can view own compensatory requests" ON public.compensatory_requests AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = requester_id));

CREATE POLICY "erp authenticated full access" ON public.contracts AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.contracts AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.daily_work_logs AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.daily_work_logs AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.document_room_files AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.document_room_files AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.equipment AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.equipment AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.financial_entries AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.financial_entries AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY admin_manage_gowid_cards ON public.gowid_cards AS PERMISSIVE FOR ALL TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

CREATE POLICY authenticated_users_read_gowid_cards ON public.gowid_cards AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() IS NOT NULL));

CREATE POLICY authenticated_users_manage_expense_project_link ON public.gowid_expense_project_link AS PERMISSIVE FOR ALL TO public
    USING ((auth.uid() IS NOT NULL));

CREATE POLICY admin_manage_gowid_mapping ON public.gowid_user_mapping AS PERMISSIVE FOR ALL TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

CREATE POLICY users_view_own_gowid_mapping ON public.gowid_user_mapping AS PERMISSIVE FOR SELECT TO public
    USING ((erp_user_id = auth.uid()));

CREATE POLICY "erp authenticated full access" ON public.inquiries AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.inquiries AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins can manage leave balances" ON public.leave_balances AS PERMISSIVE FOR ALL TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role) AND (app_users.bu_code = 'HEAD'::public.bu_code)))));

CREATE POLICY "Admins can view all leave balances" ON public.leave_balances AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = ANY (ARRAY['admin'::public.erp_role, 'leader'::public.erp_role]))))));

CREATE POLICY "Users can view own leave balances" ON public.leave_balances AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = user_id));

CREATE POLICY "Admins can view all leave grants" ON public.leave_grants AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = ANY (ARRAY['admin'::public.erp_role, 'leader'::public.erp_role]))))));

CREATE POLICY "HEAD Admins can manage leave grants" ON public.leave_grants AS PERMISSIVE FOR ALL TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role) AND (app_users.bu_code = 'HEAD'::public.bu_code)))));

CREATE POLICY "Users can view own leave grants" ON public.leave_grants AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = user_id));

CREATE POLICY "Admins can create leave requests for any user" ON public.leave_requests AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

CREATE POLICY "Admins can view all leave requests" ON public.leave_requests AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

CREATE POLICY "Leaders and Admins can update leave requests" ON public.leave_requests AS PERMISSIVE FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = ANY (ARRAY['admin'::public.erp_role, 'leader'::public.erp_role]))))));

CREATE POLICY "Leaders can view BU leave requests" ON public.leave_requests AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM (public.app_users au
     JOIN public.app_users req ON ((req.id = leave_requests.requester_id)))
  WHERE ((au.id = auth.uid()) AND (au.role = 'leader'::public.erp_role) AND (au.bu_code = req.bu_code)))));

CREATE POLICY "Users can create own leave requests" ON public.leave_requests AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((auth.uid() = requester_id));

CREATE POLICY "Users can view own leave requests" ON public.leave_requests AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = requester_id));

CREATE POLICY "erp authenticated full access" ON public.manuals AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.manuals AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.meeting_rooms AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.meeting_rooms AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can insert notifications" ON public.notifications AS PERMISSIVE FOR INSERT TO public
    WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO public
    USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = user_id));

CREATE POLICY "Admins can manage office IPs" ON public.office_ips AS PERMISSIVE FOR ALL TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

CREATE POLICY "erp authenticated full access" ON public.org_units AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.org_units AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.partner_access_requests AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.partner_access_requests AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.partner_bu_access AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.partner_bu_access AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.partner_categories AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.partner_categories AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.partner_category_mappings AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.partner_category_mappings AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.partner_relations AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.partner_relations AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.partner_settlement_projects AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.partner_settlement_projects AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.partner_settlements AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.partner_settlements AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.partner_user_access AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.partner_user_access AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.partners AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.partners AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.portfolio_items AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "public read portfolio_items" ON public.portfolio_items AS PERMISSIVE FOR SELECT TO anon
    USING (true);

CREATE POLICY "service role full access" ON public.portfolio_items AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.project_documents AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.project_documents AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete pnl reports" ON public.project_pnl_reports AS PERMISSIVE FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert pnl reports" ON public.project_pnl_reports AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read pnl reports" ON public.project_pnl_reports AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can update pnl reports" ON public.project_pnl_reports AS PERMISSIVE FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.project_tasks AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.project_tasks AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.projects AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "public read completed projects" ON public.projects AS PERMISSIVE FOR SELECT TO anon
    USING (((status)::text = '완료'::text));

CREATE POLICY "service role full access" ON public.projects AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage all push tokens" ON public.push_tokens AS PERMISSIVE FOR ALL TO public
    USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));

CREATE POLICY "Users can delete their own push tokens" ON public.push_tokens AS PERMISSIVE FOR DELETE TO public
    USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own push tokens" ON public.push_tokens AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own push tokens" ON public.push_tokens AS PERMISSIVE FOR UPDATE TO public
    USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own push tokens" ON public.push_tokens AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = user_id));

CREATE POLICY "erp authenticated full access" ON public.quotes AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.quotes AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.reservations AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.reservations AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "erp authenticated full access" ON public.task_templates AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.task_templates AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins can manage all work status" ON public.user_work_status AS PERMISSIVE FOR ALL TO authenticated
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

CREATE POLICY "Allow authenticated users to view work status" ON public.user_work_status AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can update their own status" ON public.user_work_status AS PERMISSIVE FOR ALL TO authenticated
    USING ((user_id = auth.uid()))
    WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "erp authenticated full access" ON public.vehicles AS PERMISSIVE FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service role full access" ON public.vehicles AS PERMISSIVE FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins can update all work requests" ON public.work_requests AS PERMISSIVE FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

CREATE POLICY "Admins can view all work requests" ON public.work_requests AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users
  WHERE ((app_users.id = auth.uid()) AND (app_users.role = 'admin'::public.erp_role)))));

CREATE POLICY "Managers can update team member work requests" ON public.work_requests AS PERMISSIVE FOR UPDATE TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['manager'::public.erp_role, 'admin'::public.erp_role])) AND (au.bu_code = ( SELECT app_users.bu_code
           FROM public.app_users
          WHERE (app_users.id = work_requests.requester_id)))))));

CREATE POLICY "Managers can view team member work requests" ON public.work_requests AS PERMISSIVE FOR SELECT TO public
    USING ((EXISTS ( SELECT 1
   FROM public.app_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['manager'::public.erp_role, 'admin'::public.erp_role])) AND (au.bu_code = ( SELECT app_users.bu_code
           FROM public.app_users
          WHERE (app_users.id = work_requests.requester_id)))))));

CREATE POLICY "Users can create their own work requests" ON public.work_requests AS PERMISSIVE FOR INSERT TO public
    WITH CHECK ((auth.uid() = requester_id));

CREATE POLICY "Users can view their own work requests" ON public.work_requests AS PERMISSIVE FOR SELECT TO public
    USING ((auth.uid() = requester_id));
