-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.app_users (
  id uuid NOT NULL,
  name text NOT NULL,
  email text UNIQUE,
  role USER-DEFINED NOT NULL DEFAULT 'member'::erp_role,
  bu_code USER-DEFINED,
  position text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_users_pkey PRIMARY KEY (id),
  CONSTRAINT app_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.artists (
  id bigint NOT NULL DEFAULT nextval('artists_id_seq'::regclass),
  bu_code USER-DEFINED NOT NULL,
  name text NOT NULL,
  nationality text,
  visa_type text,
  contract_start date NOT NULL,
  contract_end date NOT NULL,
  visa_start date,
  visa_end date,
  role text,
  status text NOT NULL DEFAULT 'Active'::text CHECK (status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'Archived'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT artists_pkey PRIMARY KEY (id),
  CONSTRAINT artists_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code)
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
CREATE TABLE public.clients (
  id bigint NOT NULL DEFAULT nextval('clients_id_seq'::regclass),
  bu_code USER-DEFINED NOT NULL,
  name text NOT NULL,
  industry text,
  contact_person text,
  phone text,
  email text,
  address text,
  status USER-DEFINED NOT NULL DEFAULT 'active'::client_status,
  last_meeting_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code)
);
CREATE TABLE public.creators (
  id bigint NOT NULL DEFAULT nextval('creators_id_seq'::regclass),
  bu_code USER-DEFINED NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['creator'::text, 'celebrity'::text, 'influencer'::text])),
  platform text,
  channel_id bigint,
  subscribers_count text,
  engagement_rate text,
  contact_person text,
  phone text,
  email text,
  agency text,
  fee_range text,
  specialties ARRAY,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])),
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT creators_pkey PRIMARY KEY (id),
  CONSTRAINT creators_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code),
  CONSTRAINT creators_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id),
  CONSTRAINT creators_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id)
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
  CONSTRAINT equipment_pkey PRIMARY KEY (id),
  CONSTRAINT equipment_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code),
  CONSTRAINT equipment_borrower_id_fkey FOREIGN KEY (borrower_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.events (
  id bigint NOT NULL DEFAULT nextval('events_id_seq'::regclass),
  bu_code USER-DEFINED NOT NULL,
  title text NOT NULL,
  event_date date NOT NULL,
  event_type USER-DEFINED NOT NULL DEFAULT 'event'::event_type,
  description text,
  project_id bigint,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code),
  CONSTRAINT events_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id)
);
CREATE TABLE public.external_workers (
  id bigint NOT NULL DEFAULT nextval('external_workers_id_seq'::regclass),
  bu_code USER-DEFINED NOT NULL,
  name text NOT NULL,
  company_name text,
  worker_type text NOT NULL DEFAULT 'freelancer'::text CHECK (worker_type = ANY (ARRAY['freelancer'::text, 'company'::text, 'contractor'::text])),
  phone text,
  email text,
  specialties ARRAY,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT external_workers_pkey PRIMARY KEY (id),
  CONSTRAINT external_workers_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code)
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
  CONSTRAINT financial_entries_pkey PRIMARY KEY (id),
  CONSTRAINT financial_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT financial_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id)
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
  CONSTRAINT manuals_pkey PRIMARY KEY (id),
  CONSTRAINT manuals_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code),
  CONSTRAINT manuals_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.org_members (
  id bigint NOT NULL DEFAULT nextval('org_members_id_seq'::regclass),
  org_unit_id bigint,
  name text NOT NULL,
  title text,
  user_id uuid,
  is_leader boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  bu_code USER-DEFINED,
  phone text,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT org_members_pkey PRIMARY KEY (id),
  CONSTRAINT org_members_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id),
  CONSTRAINT org_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id)
);
CREATE TABLE public.org_units (
  id bigint NOT NULL DEFAULT nextval('org_units_id_seq'::regclass),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT org_units_pkey PRIMARY KEY (id)
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
  CONSTRAINT project_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.app_users(id),
  CONSTRAINT project_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id)
);
CREATE TABLE public.projects (
  id bigint NOT NULL DEFAULT nextval('projects_id_seq'::regclass),
  bu_code USER-DEFINED NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT '준비중'::project_status,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  client_id bigint,
  creators jsonb DEFAULT '[]'::jsonb,
  freelancers jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code),
  CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id),
  CONSTRAINT fk_projects_client_id FOREIGN KEY (client_id) REFERENCES public.clients(id)
);