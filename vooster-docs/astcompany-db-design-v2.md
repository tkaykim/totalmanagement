# ASTCOMPANY ERP 데이터베이스 설계안 (수정본)

## 1. 피드백 반영 사항

### 1.1 외주인력 관리
- ❌ `freelancers` 테이블 제거
- ✅ `org_members` 테이블 활용
  - 외주인력도 조직 구성원의 일종으로 관리
  - `title` 필드로 역할 구분 (예: "외주 감독", "외주 편집자", "외주 카메라맨" 등)
  - `org_unit_id`가 null이거나 별도 org_unit로 구분 가능

### 1.2 프로젝트-크리에이터/외주인력 연결
- ❌ `project_creators`, `project_freelancers` 테이블 제거
- ✅ `projects` 테이블에 JSONB 필드 추가하여 관리

## 2. 최종 DB 구조

### 2.1 기존 테이블 활용 (변경 없음)
- `business_units`: AST BU 정보
- `app_users`: 사용자 관리
- `projects`: 프로젝트 관리
- `project_tasks`: 프로젝트 할일 관리
- `financial_entries`: 매출/지출 관리
- `clients`: 거래처(클라이언트) 관리
- `manuals`: 매뉴얼 관리
- `events`: 일정/이벤트 관리
- `org_members`: 조직 구성원 및 **외주인력** 관리
- `channels`: 채널 관리 (필드 확장 필요)

### 2.2 신규 테이블

#### `creators` 테이블 (크리에이터 관리)
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

### 2.3 기존 테이블 수정

#### `channels` 테이블 확장
```sql
ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS production_company text,
ADD COLUMN IF NOT EXISTS ad_status text CHECK (ad_status IN ('active', 'paused', 'completed', 'none')) DEFAULT 'none';
```

#### `projects` 테이블 확장
프로젝트별 크리에이터와 외주인력 정보를 JSONB로 저장

```sql
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS creators jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS freelancers jsonb DEFAULT '[]'::jsonb;
```

**JSONB 구조 예시:**

`creators` 필드:
```json
[
  {
    "creator_id": 1,
    "creator_name": "크리에이터명",
    "role": "main",
    "fee_amount": 5000000,
    "contract_date": "2024-01-15",
    "shoot_date": "2024-02-01",
    "upload_date": "2024-02-10",
    "payment_status": "pending",
    "payment_date": null,
    "notes": "메인 크리에이터"
  },
  {
    "creator_id": 2,
    "creator_name": "게스트 크리에이터",
    "role": "guest",
    "fee_amount": 2000000,
    "payment_status": "paid",
    "payment_date": "2024-01-20"
  }
]
```

`freelancers` 필드:
```json
[
  {
    "freelancer_id": 10,  -- org_members.id
    "freelancer_name": "외주인력명",
    "role": "director",
    "rate_type": "daily",
    "rate_amount": 500000,
    "days_worked": 3,
    "hours_worked": null,
    "total_amount": 1500000,
    "payment_status": "pending",
    "payment_date": null,
    "notes": "촬영 감독"
  },
  {
    "freelancer_id": 11,
    "freelancer_name": "편집자",
    "role": "editor",
    "rate_type": "hourly",
    "rate_amount": 50000,
    "hours_worked": 20,
    "days_worked": null,
    "total_amount": 1000000,
    "payment_status": "paid",
    "payment_date": "2024-01-25"
  }
]
```

## 3. 확인이 필요한 사항

### 3.1 외주인력 특화 정보
`org_members` 테이블에 외주인력 특화 필드가 필요한지 확인 필요:
- 시급/일급/프로젝트 단가 정보
- 계좌 정보 (정산용)
- 전문 분야

**옵션 1**: `org_members` 테이블에 추가 필드
```sql
ALTER TABLE org_members
ADD COLUMN IF NOT EXISTS member_type text CHECK (member_type IN ('internal', 'freelancer')) DEFAULT 'internal',
ADD COLUMN IF NOT EXISTS hourly_rate bigint,
ADD COLUMN IF NOT EXISTS daily_rate bigint,
ADD COLUMN IF NOT EXISTS project_rate bigint,
ADD COLUMN IF NOT EXISTS bank_account text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS account_holder text,
ADD COLUMN IF NOT EXISTS specialties text[];
```

**옵션 2**: `org_members`에 JSONB 필드로 확장 정보 저장
```sql
ALTER TABLE org_members
ADD COLUMN IF NOT EXISTS member_type text CHECK (member_type IN ('internal', 'freelancer')) DEFAULT 'internal',
ADD COLUMN IF NOT EXISTS extra_info jsonb DEFAULT '{}'::jsonb;
```

**옵션 3**: 기존 필드만 활용 (`title`로 역할 구분, 정산 정보는 `projects.freelancers` JSONB에만 저장)

### 3.2 정산 정보 관리
프로젝트별 크리에이터/외주인력 정산 정보를 어떻게 관리할지:

**옵션 A**: `projects` JSONB에만 저장
- 장점: 간단함, 프로젝트별로 모든 정보가 한 곳에
- 단점: 정산 상태 변경 시 projects 테이블 업데이트 필요

**옵션 B**: `financial_entries`와 연계
- `projects` JSONB에는 참조 정보만
- 실제 정산은 `financial_entries`에 별도 기록
- `financial_entries.category`에 "크리에이터 출연료", "외주인력 비용" 등으로 구분
- 장점: 정산 내역이 재무 시스템과 통합
- 단점: 두 곳에서 정보 관리 필요

## 4. 추천 구조 (제안)

### 4.1 외주인력 관리
**옵션 3 추천**: 기존 `org_members` 필드만 활용
- `title`: 역할 구분 (예: "외주 감독", "외주 편집자")
- `bu_code`: AST로 필터링
- `is_active`: 활성 상태
- 정산 관련 정보는 `projects.freelancers` JSONB에 저장

### 4.2 정산 정보 관리
**옵션 B 추천**: `financial_entries`와 연계
- `projects.creators`, `projects.freelancers` JSONB: 프로젝트 할당 정보 및 계약 정보
- `financial_entries`: 실제 정산 내역 (매출/지출)
- `financial_entries.category`: "크리에이터 출연료", "외주인력 비용" 등
- `financial_entries.name`: 크리에이터명 또는 외주인력명

## 5. 인덱스 추가

```sql
CREATE INDEX idx_creators_bu_code ON creators(bu_code);
CREATE INDEX idx_creators_status ON creators(status);
CREATE INDEX idx_creators_channel_id ON creators(channel_id);
CREATE INDEX idx_projects_creators ON projects USING GIN (creators);
CREATE INDEX idx_projects_freelancers ON projects USING GIN (freelancers);
```

## 6. 데이터 관계도

```
business_units (AST)
  ├── projects
  │   ├── project_tasks
  │   ├── financial_entries
  │   ├── creators (JSONB 배열)
  │   └── freelancers (JSONB 배열 → org_members 참조)
  ├── channels
  │   ├── channel_contents
  │   └── creators (optional link)
  ├── creators (신규)
  ├── org_members (외주인력 포함)
  ├── clients
  ├── events
  └── manuals
```

## 7. 마이그레이션 파일 구조

```
supabase/migrations/
  ├── XXXX_add_astcompany_creators.sql
  │   ├── creators 테이블 생성
  │   ├── channels 테이블 확장
  │   ├── projects 테이블 확장 (creators, freelancers JSONB)
  │   └── 인덱스 생성
```

## 8. 주요 기능별 데이터 흐름

### 8.1 프로젝트별 크리에이터 관리
1. `creators` 테이블에 크리에이터 등록
2. 프로젝트 생성 시 `projects.creators` JSONB에 크리에이터 정보 추가
3. 정산 시 `financial_entries`에 지출 항목으로 등록
   - `kind`: 'expense'
   - `category`: '크리에이터 출연료'
   - `name`: 크리에이터명
   - `amount`: 출연료 금액

### 8.2 프로젝트별 외주인력 관리
1. `org_members` 테이블에 외주인력 등록 (title에 "외주" 포함)
2. 프로젝트 생성 시 `projects.freelancers` JSONB에 외주인력 정보 추가
3. 정산 시 `financial_entries`에 지출 항목으로 등록
   - `kind`: 'expense'
   - `category`: '외주인력 비용'
   - `name`: 외주인력명
   - `amount`: 정산 금액

### 8.3 프로젝트별 매출/지출/순수익
- `financial_entries` 테이블의 `kind` 필드로 'revenue'/'expense' 구분
- `project_id`로 프로젝트별 집계
- 프로젝트별 순수익 = 매출 합계 - 지출 합계









