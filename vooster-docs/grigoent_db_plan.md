# GRIGOENT DB 연동 계획서

## 현재 DB 스키마 분석

### ✅ 기존 테이블로 커버 가능한 기능

1. **대시보드** - `projects`, `project_tasks`, `financial_entries` 사용
2. **프로젝트 관리** - `projects` 테이블 사용
3. **업무 및 할일** - `project_tasks` 테이블 사용
4. **일정/캘린더** - `events` 테이블 사용
5. **거래처 관리** - `clients` 테이블 사용
6. **정산/회계** - `financial_entries` 테이블 사용
7. **매뉴얼/가이드** - `manuals` 테이블 사용
8. **외주 댄서 관리** - `external_workers` 테이블 사용

### ❌ 새로운 테이블이 필요한 기능

1. **전속 아티스트 관리** - 현재 DB에 전속 아티스트 전용 테이블이 없음

---

## 필요한 DB 스키마 수정/추가

### 1. 새로운 테이블: `artists` (전속 아티스트)

**목적**: GRIGO 전속 아티스트의 신상 정보, 계약, 비자 상태를 관리

**필요한 필드**:
- `id` (bigserial PRIMARY KEY)
- `bu_code` (bu_code) - 'GRIGO'만 사용
- `name` (text NOT NULL) - 아티스트 이름
- `nationality` (text) - 국적 (KOR, JPN, USA 등)
- `visa_type` (text) - 비자 타입 ('N/A (내국인)', 'E-6 (예술흥행)', 'F-2 (거주)', 'F-4 (재외동포)')
- `contract_start` (date) - 계약 시작일
- `contract_end` (date) - 계약 종료일
- `visa_start` (date) - 비자 시작일 (nullable, 내국인은 NULL)
- `visa_end` (date) - 비자 종료일 (nullable, 무기한은 '9999-12-31')
- `role` (text) - 역할 ('댄스팀 한야', '전속 안무가' 등)
- `status` (text) - 상태 ('Active', 'Inactive', 'Archived')
- `created_at` (timestamptz NOT NULL DEFAULT now())
- `updated_at` (timestamptz NOT NULL DEFAULT now())

**제약조건**:
- `bu_code`는 'GRIGO'만 허용 (CHECK 제약조건 또는 애플리케이션 레벨)
- `status`는 CHECK 제약조건으로 'Active', 'Inactive', 'Archived'만 허용

**인덱스**:
- `idx_artists_bu_code` ON artists (bu_code)
- `idx_artists_status` ON artists (status)
- `idx_artists_visa_end` ON artists (visa_end) - 비자 만료 알림용

---

### 2. 기존 테이블 수정 (선택사항)

#### `external_workers` 테이블
- 현재 구조로 외주 댄서 관리 가능
- `last_work_date` 필드가 없지만, `notes` 필드나 별도 이력 테이블로 관리 가능
- **추가 권장**: `last_work_date` (date) 필드 추가 (선택사항)

#### `project_tasks` 테이블
- 현재 구조로 업무 관리 가능
- `related_manual_title` 필드가 없지만, `tag` 필드 활용 가능
- **추가 권장**: `related_manual_id` (bigint) 필드 추가하여 `manuals` 테이블과 FK 연결 (선택사항)

#### `financial_entries` 테이블
- 현재 구조로 정산/회계 관리 가능
- 아티스트 수수료(70%)와 회사 순이익(30%)은 계산 로직으로 처리
- **추가 권장**: `dancer_fee` (bigint), `company_fee` (bigint) 필드 추가 (선택사항, 또는 memo 필드 활용)

---

## 마이그레이션 SQL 계획

### 필수 마이그레이션

```sql
-- 1. artists 테이블 생성
CREATE TABLE artists (
  id           bigserial PRIMARY KEY,
  bu_code      bu_code NOT NULL,
  name         text NOT NULL,
  nationality  text,
  visa_type    text,
  contract_start date NOT NULL,
  contract_end   date NOT NULL,
  visa_start     date,
  visa_end       date,
  role         text,
  status       text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artists_bu_code_fkey FOREIGN KEY (bu_code) REFERENCES business_units(code)
);

-- 인덱스 생성
CREATE INDEX idx_artists_bu_code ON artists (bu_code);
CREATE INDEX idx_artists_status ON artists (status);
CREATE INDEX idx_artists_visa_end ON artists (visa_end);

-- RLS 정책 (필요시)
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
```

### 선택적 마이그레이션 (향후 확장용)

```sql
-- external_workers에 last_work_date 추가
ALTER TABLE external_workers ADD COLUMN last_work_date date;

-- project_tasks에 related_manual_id 추가
ALTER TABLE project_tasks ADD COLUMN related_manual_id bigint;
ALTER TABLE project_tasks ADD CONSTRAINT project_tasks_related_manual_id_fkey 
  FOREIGN KEY (related_manual_id) REFERENCES manuals(id);
```

---

## API 엔드포인트 계획

### 필수 API

1. **Artists API**
   - `GET /api/artists?bu=GRIGO` - 아티스트 목록 조회
   - `POST /api/artists` - 아티스트 생성
   - `PATCH /api/artists/[id]` - 아티스트 수정
   - `DELETE /api/artists/[id]` - 아티스트 삭제

### 기존 API 활용

- Projects: `/api/projects?bu=GRIGO`
- Tasks: `/api/tasks?bu=GRIGO`
- Financial Entries: `/api/financial-entries?bu=GRIGO`
- Clients: `/api/clients?bu=GRIGO`
- Events: `/api/events?bu=GRIGO`
- Manuals: `/api/manuals?bu=GRIGO`
- External Workers: `/api/external-workers?bu=GRIGO`

---

## 프론트엔드 구현 계획

### 1. Hooks 추가 (`src/features/erp/hooks.ts`)
- `useArtists(bu?: BU)` - 아티스트 목록 조회
- `useCreateArtist()` - 아티스트 생성
- `useUpdateArtist()` - 아티스트 수정
- `useDeleteArtist()` - 아티스트 삭제

### 2. API 함수 추가 (`src/features/erp/api.ts`)
- `fetchArtists(bu?: BU)`
- `createArtist(data)`
- `updateArtist(id, data)`
- `deleteArtist(id)`

### 3. 타입 정의 추가 (`src/types/database.ts`)
- `Artist` 인터페이스
- `ArtistStatus` 타입

### 4. 유틸리티 함수 추가 (`src/features/erp/utils.ts`)
- `dbArtistToFrontend()` - DB → 프론트엔드 변환
- `frontendArtistToDb()` - 프론트엔드 → DB 변환

### 5. 컴포넌트 수정 (`src/features/grigoent/components/GrigoEntDashboard.tsx`)
- 정적 데이터를 API 호출로 교체
- CRUD 기능 구현

---

## 작업 순서

1. ✅ **DB 스키마 계획 수립** (현재 단계)
2. ⏳ **마이그레이션 SQL 작성 및 승인**
3. ⏳ **타입 정의 추가** (`src/types/database.ts`)
4. ⏳ **API 엔드포인트 구현** (`src/app/api/artists/`)
5. ⏳ **API 함수 추가** (`src/features/erp/api.ts`)
6. ⏳ **Hooks 추가** (`src/features/erp/hooks.ts`)
7. ⏳ **유틸리티 함수 추가** (`src/features/erp/utils.ts`)
8. ⏳ **컴포넌트 수정** (`GrigoEntDashboard.tsx`)

---

## 승인 요청 사항

1. **`artists` 테이블 생성** - 필수
2. **`external_workers.last_work_date` 필드 추가** - 선택사항
3. **`project_tasks.related_manual_id` 필드 추가** - 선택사항

선택사항은 향후 확장을 위해 제안한 것이며, 현재는 필수 항목만으로도 구현 가능합니다.




