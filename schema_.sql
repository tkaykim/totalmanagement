-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activity_logs (
  id bigint NOT NULL DEFAULT nextval('activity_logs_id_seq'::regclass),
  user_id uuid,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_title text,
  metadata jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.app_users (
  id uuid NOT NULL,
  name text NOT NULL,
  email text UNIQUE,
  role USER-DEFINED NOT NULL DEFAULT 'member'::erp_role,
  bu_code USER-DEFINED,
  position text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  partner_id bigint,
  hire_date date,
  CONSTRAINT app_users_pkey PRIMARY KEY (id),
  CONSTRAINT app_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT app_users_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id)
);
CREATE TABLE public.attendance_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  check_in_at timestamp with time zone,
  check_out_at timestamp with time zone,
  check_in_ip inet,
  check_out_ip inet,
  status USER-DEFINED DEFAULT 'present'::attendance_type,
  is_modified boolean DEFAULT false,
  modification_reason text,
  is_verified_location boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_overtime boolean DEFAULT false,
  is_auto_checkout boolean DEFAULT false,
  user_confirmed boolean DEFAULT true,
  CONSTRAINT attendance_logs_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.bug_reports (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  reporter_id uuid,
  title text NOT NULL,
  situation text NOT NULL,
  description text,
  improvement_request text,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::bug_report_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bug_reports_pkey PRIMARY KEY (id),
  CONSTRAINT bug_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.business_units (
  id bigint NOT NULL DEFAULT nextval('business_units_id_seq'::regclass),
  code USER-DEFINED NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT business_units_pkey PRIMARY KEY (id)
);
CREATE TABLE public.channel_contents (
  id bigint NOT NULL DEFAULT nextval('channel_contents_id_seq'::regclass),
  channel_id bigint NOT NULL,
  title text NOT NULL,
  stage USER-DEFINED NOT NULL DEFAULT 'planning'::content_stage,
  assignee_id uuid,
  assignee_name text,
  upload_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT channel_contents_pkey PRIMARY KEY (id),
  CONSTRAINT channel_contents_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id),
  CONSTRAINT channel_contents_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.channels (
  id bigint NOT NULL DEFAULT nextval('channels_id_seq'::regclass),
  bu_code USER-DEFINED NOT NULL,
  name text NOT NULL,
  url text,
  subscribers_count text,
  total_views text,
  status USER-DEFINED NOT NULL DEFAULT 'active'::channel_status,
  manager_id uuid,
  manager_name text,
  next_upload_date date,
  recent_video text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  production_company text,
  ad_status text DEFAULT 'none'::text CHECK (ad_status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'none'::text])),
  upload_days ARRAY,
  CONSTRAINT channels_pkey PRIMARY KEY (id),
  CONSTRAINT channels_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code),
  CONSTRAINT channels_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.comment_attachments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  comment_id bigint NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comment_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT comment_attachments_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id)
);
CREATE TABLE public.comment_mentions_reads (
  id bigint NOT NULL DEFAULT nextval('comment_mentions_reads_id_seq'::regclass),
  comment_id bigint NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comment_mentions_reads_pkey PRIMARY KEY (id),
  CONSTRAINT comment_mentions_reads_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id),
  CONSTRAINT comment_mentions_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.comments (
  id bigint NOT NULL DEFAULT nextval('comments_id_seq'::regclass),
  entity_type text NOT NULL CHECK (entity_type = ANY (ARRAY['task'::text, 'project'::text, 'financial'::text])),
  entity_id bigint NOT NULL,
  content text NOT NULL,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  mentioned_user_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.compensatory_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  days numeric NOT NULL DEFAULT 1 CHECK (days > 0::numeric),
  reason text NOT NULL,
  work_date date,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::approval_status,
  approver_id uuid,
  rejection_reason text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT compensatory_requests_pkey PRIMARY KEY (id),
  CONSTRAINT compensatory_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.app_users(id),
  CONSTRAINT compensatory_requests_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.daily_work_logs (
  id bigint NOT NULL DEFAULT nextval('daily_work_logs_id_seq'::regclass),
  user_id uuid,
  log_date date NOT NULL,
  summary text,
  notes text,
  tomorrow_plan text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_work_logs_pkey PRIMARY KEY (id),
  CONSTRAINT daily_work_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.equipment (
  id bigint NOT NULL DEFAULT nextval('equipment_id_seq'::regclass),
  bu_code USER-DEFINED NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  serial_number text,
  status USER-DEFINED NOT NULL DEFAULT 'available'::equipment_status,
  location text,
  borrower_id uuid,
  borrower_name text,
  return_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  CONSTRAINT equipment_pkey PRIMARY KEY (id),
  CONSTRAINT equipment_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code),
  CONSTRAINT equipment_borrower_id_fkey FOREIGN KEY (borrower_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.financial_entries (
  id bigint NOT NULL DEFAULT nextval('financial_entries_id_seq'::regclass),
  project_id bigint NOT NULL,
  bu_code USER-DEFINED NOT NULL,
  kind USER-DEFINED NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  amount bigint NOT NULL CHECK (amount >= 0),
  occurred_at date NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'planned'::financial_status,
  memo text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  payment_method USER-DEFINED,
  actual_amount bigint,
  partner_id bigint,
  share_rate numeric DEFAULT NULL::numeric,
  CONSTRAINT financial_entries_pkey PRIMARY KEY (id),
  CONSTRAINT financial_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT financial_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id),
  CONSTRAINT financial_entries_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id)
);
CREATE TABLE public.leave_balances (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  leave_type USER-DEFINED NOT NULL,
  total_days numeric NOT NULL DEFAULT 0 CHECK (total_days >= 0::numeric),
  used_days numeric NOT NULL DEFAULT 0 CHECK (used_days >= 0::numeric),
  year integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT leave_balances_pkey PRIMARY KEY (id),
  CONSTRAINT leave_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.leave_grants (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  leave_type USER-DEFINED NOT NULL,
  days numeric NOT NULL CHECK (days > 0::numeric),
  grant_type USER-DEFINED NOT NULL,
  reason text,
  granted_by uuid,
  year integer NOT NULL,
  granted_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT leave_grants_pkey PRIMARY KEY (id),
  CONSTRAINT leave_grants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id),
  CONSTRAINT leave_grants_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.app_users(id)
);
CREATE TABLE public.leave_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  leave_type USER-DEFINED NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_used numeric NOT NULL CHECK (days_used > 0::numeric),
  reason text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::approval_status,
  approver_id uuid,
  rejection_reason text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT leave_requests_pkey PRIMARY KEY (id),
  CONSTRAINT leave_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.app_users(id),
  CONSTRAINT leave_requests_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.manuals (
  id bigint NOT NULL DEFAULT nextval('manuals_id_seq'::regclass),
  bu_code USER-DEFINED NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  author_id uuid,
  author_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT manuals_pkey PRIMARY KEY (id),
  CONSTRAINT manuals_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code),
  CONSTRAINT manuals_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.meeting_rooms (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  description text,
  capacity integer,
  location text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meeting_rooms_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id bigint NOT NULL DEFAULT nextval('notifications_id_seq'::regclass),
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
  data jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.office_ips (
  id integer NOT NULL DEFAULT nextval('office_ips_id_seq'::regclass),
  name text NOT NULL,
  ip_address inet NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT office_ips_pkey PRIMARY KEY (id)
);
CREATE TABLE public.org_units (
  id bigint NOT NULL DEFAULT nextval('org_units_id_seq'::regclass),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT org_units_pkey PRIMARY KEY (id)
);
CREATE TABLE public.partner_access_requests (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  partner_id bigint NOT NULL,
  requester_id uuid NOT NULL,
  requester_bu_code USER-DEFINED NOT NULL,
  requested_access_level text NOT NULL DEFAULT 'view'::text,
  reason text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text])),
  processed_by uuid,
  processed_at timestamp with time zone,
  rejection_reason text,
  valid_until date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT partner_access_requests_pkey PRIMARY KEY (id),
  CONSTRAINT partner_access_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.app_users(id),
  CONSTRAINT partner_access_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.app_users(id),
  CONSTRAINT partner_access_requests_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id)
);
CREATE TABLE public.partner_bu_access (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  partner_id bigint NOT NULL,
  bu_code USER-DEFINED NOT NULL,
  access_level text NOT NULL DEFAULT 'view'::text CHECK (access_level = ANY (ARRAY['owner'::text, 'full'::text, 'view'::text, 'basic'::text])),
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT partner_bu_access_pkey PRIMARY KEY (id),
  CONSTRAINT partner_bu_access_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  CONSTRAINT partner_bu_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.app_users(id)
);
CREATE TABLE public.partner_categories (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  name_ko text,
  entity_types ARRAY DEFAULT '{}'::partner_entity_type[],
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT partner_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.partner_category_mappings (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  partner_id bigint NOT NULL,
  category_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT partner_category_mappings_pkey PRIMARY KEY (id),
  CONSTRAINT partner_category_mappings_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  CONSTRAINT partner_category_mappings_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.partner_categories(id)
);
CREATE TABLE public.partner_relations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  parent_partner_id bigint NOT NULL,
  child_partner_id bigint NOT NULL,
  relation_type text NOT NULL DEFAULT 'member'::text,
  role_description text,
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT partner_relations_pkey PRIMARY KEY (id),
  CONSTRAINT partner_relations_parent_partner_id_fkey FOREIGN KEY (parent_partner_id) REFERENCES public.partners(id),
  CONSTRAINT partner_relations_child_partner_id_fkey FOREIGN KEY (child_partner_id) REFERENCES public.partners(id)
);
CREATE TABLE public.partner_settlement_projects (
  id bigint NOT NULL DEFAULT nextval('partner_settlement_projects_id_seq'::regclass),
  settlement_id bigint NOT NULL,
  project_id bigint NOT NULL,
  revenue bigint DEFAULT 0,
  expense bigint DEFAULT 0,
  net_profit bigint DEFAULT 0,
  share_rate numeric NOT NULL,
  partner_amount bigint DEFAULT 0,
  company_amount bigint DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT partner_settlement_projects_pkey PRIMARY KEY (id),
  CONSTRAINT partner_settlement_projects_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.partner_settlements(id),
  CONSTRAINT partner_settlement_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.partner_settlements (
  id bigint NOT NULL DEFAULT nextval('partner_settlements_id_seq'::regclass),
  partner_id bigint NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'paid'::text])),
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
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT partner_settlements_pkey PRIMARY KEY (id),
  CONSTRAINT partner_settlements_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  CONSTRAINT partner_settlements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.partner_user_access (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  partner_id bigint NOT NULL,
  user_id uuid NOT NULL,
  access_level text NOT NULL DEFAULT 'view'::text CHECK (access_level = ANY (ARRAY['full'::text, 'view'::text, 'basic'::text])),
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT now(),
  valid_until date,
  reason text,
  CONSTRAINT partner_user_access_pkey PRIMARY KEY (id),
  CONSTRAINT partner_user_access_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  CONSTRAINT partner_user_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id),
  CONSTRAINT partner_user_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.app_users(id)
);
CREATE TABLE public.partners (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  display_name text NOT NULL,
  name_ko text,
  name_en text,
  legal_name text,
  entity_type USER-DEFINED NOT NULL DEFAULT 'person'::partner_entity_type,
  nationality text,
  email text,
  phone text,
  website_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  owner_bu_code USER-DEFINED NOT NULL,
  security_level text NOT NULL DEFAULT 'internal'::text CHECK (security_level = ANY (ARRAY['public'::text, 'internal'::text, 'restricted'::text, 'confidential'::text])),
  sharing_policy text NOT NULL DEFAULT 'request_only'::text CHECK (sharing_policy = ANY (ARRAY['open'::text, 'bu_shared'::text, 'request_only'::text, 'owner_only'::text])),
  created_by uuid,
  is_active boolean DEFAULT true,
  tags ARRAY DEFAULT '{}'::text[],
  legacy_source text,
  legacy_id bigint,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT partners_pkey PRIMARY KEY (id),
  CONSTRAINT partners_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id)
);
CREATE TABLE public.project_tasks (
  id bigint NOT NULL DEFAULT nextval('project_tasks_id_seq'::regclass),
  project_id bigint NOT NULL,
  bu_code USER-DEFINED NOT NULL,
  title text NOT NULL,
  assignee_id uuid,
  assignee text,
  due_date date NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'todo'::task_status,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])),
  tag text,
  description text,
  manual_id bigint,
  CONSTRAINT project_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.app_users(id),
  CONSTRAINT project_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id),
  CONSTRAINT project_tasks_manual_id_fkey FOREIGN KEY (manual_id) REFERENCES public.manuals(id)
);
CREATE TABLE public.projects (
  id bigint NOT NULL DEFAULT nextval('projects_id_seq'::regclass),
  bu_code USER-DEFINED NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT '준비중'::project_status,
  start_date date,
  end_date date,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  participants jsonb DEFAULT '[]'::jsonb,
  description text,
  channel_id bigint,
  pm_id uuid,
  partner_id bigint,
  share_partner_id bigint,
  default_share_rate numeric DEFAULT NULL::numeric,
  share_rate numeric,
  visible_to_partner boolean DEFAULT false,
  artist_response text CHECK (artist_response = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])),
  artist_response_note text,
  artist_responded_at timestamp with time zone,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code),
  CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id),
  CONSTRAINT projects_share_partner_id_fkey FOREIGN KEY (share_partner_id) REFERENCES public.partners(id),
  CONSTRAINT projects_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id),
  CONSTRAINT fk_projects_pm_id FOREIGN KEY (pm_id) REFERENCES public.app_users(id),
  CONSTRAINT projects_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id)
);
CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform = ANY (ARRAY['android'::text, 'ios'::text, 'web'::text])),
  device_id text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.reservations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  resource_type USER-DEFINED NOT NULL,
  resource_id bigint NOT NULL,
  reserver_id uuid NOT NULL,
  project_id bigint,
  task_id bigint,
  title text NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  status USER-DEFINED DEFAULT 'active'::reservation_status,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  quantity integer NOT NULL DEFAULT 1,
  CONSTRAINT reservations_pkey PRIMARY KEY (id),
  CONSTRAINT reservations_reserver_id_fkey FOREIGN KEY (reserver_id) REFERENCES public.app_users(id),
  CONSTRAINT reservations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT reservations_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.project_tasks(id)
);
CREATE TABLE public.task_templates (
  id bigint NOT NULL DEFAULT nextval('task_templates_id_seq'::regclass),
  bu_code USER-DEFINED NOT NULL,
  name text NOT NULL,
  description text,
  template_type text NOT NULL,
  options_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  author_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_templates_pkey PRIMARY KEY (id),
  CONSTRAINT task_templates_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.user_work_status (
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'WORKING'::text CHECK (status = ANY (ARRAY['WORKING'::text, 'MEETING'::text, 'OUTSIDE'::text, 'BREAK'::text, 'OFF_WORK'::text])),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_work_status_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_work_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.vehicles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  license_plate text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vehicles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.work_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  approver_id uuid,
  request_type USER-DEFINED NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  reason text NOT NULL,
  status USER-DEFINED DEFAULT 'pending'::approval_status,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_requests_pkey PRIMARY KEY (id),
  CONSTRAINT work_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.app_users(id),
  CONSTRAINT work_requests_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.app_users(id)
);