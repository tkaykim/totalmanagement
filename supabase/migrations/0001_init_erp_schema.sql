-- ENUM Types
CREATE TYPE bu_code AS ENUM (
  'GRIGO',
  'FLOW',
  'REACT',
  'MODOO',
  'AST'
);

CREATE TYPE project_status AS ENUM (
  '준비중',
  '진행중',
  '운영중',
  '기획중',
  '완료'
);

CREATE TYPE task_status AS ENUM (
  'todo',
  'in_progress',
  'done'
);

CREATE TYPE financial_kind AS ENUM (
  'revenue',
  'expense'
);

CREATE TYPE financial_status AS ENUM (
  'planned',
  'paid',
  'canceled'
);

CREATE TYPE erp_role AS ENUM (
  'admin',
  'manager',
  'member',
  'viewer'
);

-- Business Units
CREATE TABLE business_units (
  id           bigserial PRIMARY KEY,
  code         bu_code UNIQUE NOT NULL,
  name         text NOT NULL,
  english_label text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO business_units (code, name, english_label) VALUES
('GRIGO', '그리고엔터테인먼트', 'GRIGO'),
('FLOW',  '플로우메이커', 'FLOWMAKER'),
('REACT', '리액트 스튜디오', 'REACT STUDIO'),
('MODOO', '모두굿즈', 'MODOO'),
('AST',   'AST COMPANY', 'AST');

-- App Users (ERP Profile)
CREATE TABLE app_users (
  id              uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text,
  role            erp_role NOT NULL DEFAULT 'member',
  bu_code         bu_code,
  position        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_users_bu_code ON app_users (bu_code);
CREATE INDEX idx_app_users_role ON app_users (role);

-- Projects
CREATE TABLE projects (
  id           bigserial PRIMARY KEY,
  bu_code      bu_code NOT NULL REFERENCES business_units(code),
  name         text NOT NULL,
  category     text NOT NULL,
  status       project_status NOT NULL DEFAULT '준비중',
  start_date   date NOT NULL,
  end_date     date NOT NULL,
  created_by   uuid REFERENCES app_users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_bu_code ON projects (bu_code);
CREATE INDEX idx_projects_period ON projects (start_date, end_date);

-- Project Tasks
CREATE TABLE project_tasks (
  id           bigserial PRIMARY KEY,
  project_id   bigint NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bu_code      bu_code NOT NULL,
  title        text NOT NULL,
  assignee_id  uuid REFERENCES app_users(id),
  assignee     text,
  due_date     date NOT NULL,
  status       task_status NOT NULL DEFAULT 'todo',
  created_by   uuid REFERENCES app_users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_project_id ON project_tasks (project_id);
CREATE INDEX idx_tasks_bu_code ON project_tasks (bu_code);
CREATE INDEX idx_tasks_due_date ON project_tasks (due_date);
CREATE INDEX idx_tasks_status ON project_tasks (status);

-- Financial Entries
CREATE TABLE financial_entries (
  id           bigserial PRIMARY KEY,
  project_id   bigint NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bu_code      bu_code NOT NULL,
  kind         financial_kind NOT NULL,
  category     text NOT NULL,
  name         text NOT NULL,
  amount       bigint NOT NULL CHECK (amount >= 0),
  occurred_at  date NOT NULL,
  status       financial_status NOT NULL DEFAULT 'planned',
  memo         text,
  created_by   uuid REFERENCES app_users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_project_id ON financial_entries (project_id);
CREATE INDEX idx_financial_bu_kind ON financial_entries (bu_code, kind);
CREATE INDEX idx_financial_occurred_at ON financial_entries (occurred_at);
CREATE INDEX idx_financial_status ON financial_entries (status);

-- Organization Units
CREATE TABLE org_units (
  id           bigserial PRIMARY KEY,
  name         text NOT NULL,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Organization Members
CREATE TABLE org_members (
  id           bigserial PRIMARY KEY,
  org_unit_id  bigint NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
  name         text NOT NULL,
  title        text NOT NULL,
  user_id      uuid REFERENCES app_users(id),
  is_leader    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_members_unit ON org_members (org_unit_id);

-- Initial Organization Data
INSERT INTO org_units (name, sort_order) VALUES
('그리고엔터테인먼트', 1),
('플로우메이커', 2),
('리액트 스튜디오', 3),
('모두굿즈', 4),
('AST COMPANY', 5);

-- Initial Members
INSERT INTO org_members (org_unit_id, name, title, is_leader)
SELECT id, '김현준', '대표', true FROM org_units WHERE name = '그리고엔터테인먼트';
INSERT INTO org_members (org_unit_id, name, title)
SELECT id, '오동현', '실장' FROM org_units WHERE name = '그리고엔터테인먼트';
INSERT INTO org_members (org_unit_id, name, title)
SELECT id, '장선우', '대리' FROM org_units WHERE name = '그리고엔터테인먼트';
INSERT INTO org_members (org_unit_id, name, title)
SELECT id, 'O유진', '인턴' FROM org_units WHERE name = '그리고엔터테인먼트';

INSERT INTO org_members (org_unit_id, name, title, is_leader)
SELECT id, '홍철화', '대표', true FROM org_units WHERE name = '플로우메이커';
INSERT INTO org_members (org_unit_id, name, title)
SELECT id, '권혁준', '대리' FROM org_units WHERE name = '플로우메이커';
INSERT INTO org_members (org_unit_id, name, title)
SELECT id, '황여경', '사원' FROM org_units WHERE name = '플로우메이커';
INSERT INTO org_members (org_unit_id, name, title)
SELECT id, '맹채원', '사원' FROM org_units WHERE name = '플로우메이커';

INSERT INTO org_members (org_unit_id, name, title, is_leader)
SELECT id, '김현준PD', 'PD', true FROM org_units WHERE name = '리액트 스튜디오';

INSERT INTO org_members (org_unit_id, name, title, is_leader)
SELECT id, '김동현', '사원', true FROM org_units WHERE name = '모두굿즈';
INSERT INTO org_members (org_unit_id, name, title)
SELECT id, '박여진', '인턴' FROM org_units WHERE name = '모두굿즈';

INSERT INTO org_members (org_unit_id, name, title, is_leader)
SELECT id, '조현욱', '대표', true FROM org_units WHERE name = 'AST COMPANY';
INSERT INTO org_members (org_unit_id, name, title)
SELECT id, '정현수', '이사' FROM org_units WHERE name = 'AST COMPANY';


