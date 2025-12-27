# ASTCOMPANY ERP 데이터베이스 설계안

## 1. 개요

ASTCOMPANY는 광고대행 업무(유튜브 채널, 크리에이터 광고, 오프라인 행사 광고 등)를 주업으로 하는 ERP 시스템입니다.
본사 전체 관리툴의 산하 툴로, AST BU의 데이터만 관리합니다.

## 2. 기존 DB 활용 계획

### 2.1 그대로 활용할 테이블
- `business_units`: AST BU 정보 (이미 존재)
- `app_users`: 사용자 관리 (이미 존재)
- `projects`: 프로젝트 관리 (이미 존재)
- `project_tasks`: 프로젝트 할일 관리 (이미 존재)
- `financial_entries`: 매출/지출 관리 (이미 존재)
- `clients`: 거래처(클라이언트) 관리 (이미 존재)
- `manuals`: 매뉴얼 관리 (이미 존재)
- `events`: 일정/이벤트 관리 (이미 존재)

### 2.2 수정/확장이 필요한 테이블
- `channels`: 채널 관리
  - 현재 필드: id, bu_code, name, url, subscribers_count, total_views, status, manager_id, manager_name, next_upload_date, recent_video
  - **추가 필요**: `production_company` (제작사), `ad_status` (광고현황) 필드

## 3. 신규 테이블 설계

### 3.1 `creators` 테이블 (크리에이터 관리)
광고대행 업무를 위한 크리에이터 및 셀럽 관리

```sql
CREATE TABLE public.creators (
  id bigint NOT NULL DEFAULT nextval('creators_id_seq'::regclass),
  bu_code bu_code NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('creator', 'celebrity', 'influencer')),
  platform text, -- 'youtube', 'instagram', 'tiktok', 'etc'
  channel_id bigint, -- 연결된 채널 (optional)
  subscribers_count text,
  engagement_rate text,
  contact_person text,
  phone text,
  email text,
  agency text, -- 소속 에이전시
  fee_range text, -- 출연료 범위
  specialties text[], -- 전문 분야 배열
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT creators_pkey PRIMARY KEY (id),
  CONSTRAINT creators_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code),
  CONSTRAINT creators_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id),
  CONSTRAINT creators_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id)
);
```

### 3.2 `freelancers` 테이블 (외주인력 관리)
프로젝트별 외주인력 관리

```sql
CREATE TABLE public.freelancers (
  id bigint NOT NULL DEFAULT nextval('freelancers_id_seq'::regclass),
  bu_code bu_code NOT NULL,
  name text NOT NULL,
  role text NOT NULL, -- 'director', 'editor', 'cameraman', 'designer', 'writer', 'etc'
  phone text,
  email text,
  bank_account text,
  bank_name text,
  account_holder text,
  hourly_rate bigint, -- 시급
  daily_rate bigint, -- 일급
  project_rate bigint, -- 프로젝트 단가
  specialties text[], -- 전문 분야
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT freelancers_pkey PRIMARY KEY (id),
  CONSTRAINT freelancers_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES public.business_units(code),
  CONSTRAINT freelancers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id)
);
```

### 3.3 `project_freelancers` 테이블 (프로젝트-외주인력 연결)
프로젝트별 외주인력 할당 및 정산 관리

```sql
CREATE TABLE public.project_freelancers (
  id bigint NOT NULL DEFAULT nextval('project_freelancers_id_seq'::regclass),
  project_id bigint NOT NULL,
  freelancer_id bigint NOT NULL,
  role text NOT NULL,
  rate_type text NOT NULL CHECK (rate_type IN ('hourly', 'daily', 'project', 'fixed')),
  rate_amount bigint NOT NULL,
  hours_worked numeric(10,2), -- 시간제인 경우
  days_worked integer, -- 일급제인 경우
  total_amount bigint NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  payment_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT project_freelancers_pkey PRIMARY KEY (id),
  CONSTRAINT project_freelancers_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_freelancers_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.freelancers(id)
);
```

### 3.4 `project_creators` 테이블 (프로젝트-크리에이터 연결)
프로젝트별 크리에이터 할당 및 계약 관리

```sql
CREATE TABLE public.project_creators (
  id bigint NOT NULL DEFAULT nextval('project_creators_id_seq'::regclass),
  project_id bigint NOT NULL,
  creator_id bigint NOT NULL,
  role text NOT NULL, -- 'main', 'support', 'guest', etc
  fee_amount bigint NOT NULL,
  contract_date date,
  shoot_date date,
  upload_date date,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  payment_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT project_creators_pkey PRIMARY KEY (id),
  CONSTRAINT project_creators_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_creators_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id)
);
```

## 4. `channels` 테이블 확장

기존 channels 테이블에 다음 필드 추가:

```sql
ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS production_company text,
ADD COLUMN IF NOT EXISTS ad_status text CHECK (ad_status IN ('active', 'paused', 'completed', 'none')) DEFAULT 'none';
```

## 5. ENUM 타입 추가 (필요시)

```sql
-- 크리에이터 타입 (테이블에서 CHECK 제약으로 처리)
-- 외주인력 역할 (테이블에서 text로 처리, 확장성 고려)
-- 프로젝트 크리에이터 역할 (테이블에서 text로 처리)
```

## 6. 인덱스 추가

```sql
CREATE INDEX idx_creators_bu_code ON creators(bu_code);
CREATE INDEX idx_creators_status ON creators(status);
CREATE INDEX idx_creators_channel_id ON creators(channel_id);
CREATE INDEX idx_freelancers_bu_code ON freelancers(bu_code);
CREATE INDEX idx_freelancers_status ON freelancers(status);
CREATE INDEX idx_project_freelancers_project_id ON project_freelancers(project_id);
CREATE INDEX idx_project_freelancers_freelancer_id ON project_freelancers(freelancer_id);
CREATE INDEX idx_project_creators_project_id ON project_creators(project_id);
CREATE INDEX idx_project_creators_creator_id ON project_creators(creator_id);
```

## 7. 데이터 관계도

```
business_units (AST)
  ├── projects
  │   ├── project_tasks
  │   ├── financial_entries
  │   ├── project_freelancers → freelancers
  │   └── project_creators → creators
  ├── channels
  │   ├── channel_contents
  │   └── creators (optional link)
  ├── creators
  ├── freelancers
  ├── clients
  ├── events
  └── manuals
```

## 8. 마이그레이션 파일 구조

```
supabase/migrations/
  ├── XXXX_add_astcompany_tables.sql
  │   ├── creators 테이블 생성
  │   ├── freelancers 테이블 생성
  │   ├── project_freelancers 테이블 생성
  │   ├── project_creators 테이블 생성
  │   ├── channels 테이블 확장
  │   └── 인덱스 생성
```

## 9. 주요 기능별 데이터 흐름

### 9.1 프로젝트별 매출/지출/순수익
- `financial_entries` 테이블의 `kind` 필드로 'revenue'/'expense' 구분
- `project_id`로 프로젝트별 집계
- 프로젝트별 순수익 = 매출 합계 - 지출 합계

### 9.2 크리에이터 광고 프로젝트
- `projects` 테이블에 프로젝트 생성
- `project_creators` 테이블에 크리에이터 할당
- `financial_entries`에 크리에이터 출연료 지출 등록
- `financial_entries`에 클라이언트로부터 받는 매출 등록

### 9.3 채널 광고 프로젝트
- `channels` 테이블의 채널 정보 활용
- `channel_contents` 테이블로 콘텐츠 일정 관리
- `projects`와 연결하여 프로젝트별 채널 광고 관리

### 9.4 외주인력 정산
- `project_freelancers` 테이블에 외주인력 할당 및 작업량 기록
- `financial_entries`에 외주인력 비용 지출 등록
- `project_freelancers.payment_status`로 정산 상태 관리

## 10. 보안 및 접근 제어

- 모든 테이블에 `bu_code` 필드로 AST BU 데이터만 접근
- RLS (Row Level Security) 정책으로 BU별 데이터 격리
- AST BU 사용자만 AST 데이터 조회/수정 가능






