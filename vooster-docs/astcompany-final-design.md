# ASTCOMPANY ERP 최종 설계안

## 1. 최종 확정 사항

### 1.1 외주인력 관리
- ✅ `org_members` 테이블 활용
- 외주인력 특화 정보(시급, 계좌 등)는 기입하지 않음
- `title` 필드로 역할 구분 (예: "외주 감독", "외주 편집자")

### 1.2 프로젝트-크리에이터/외주인력 연결
- ✅ `projects` 테이블에 JSONB 필드로 관리
- `projects.creators`: 크리에이터 정보 (JSONB 배열)
- `projects.freelancers`: 외주인력 정보 (JSONB 배열, org_members.id 참조)

### 1.3 정산 정보 관리
- ✅ `financial_entries`와 연계
- `projects` JSONB: 프로젝트 할당 정보 및 계약 정보
- `financial_entries`: 실제 정산 내역 (매출/지출)
- `financial_entries.category`: "크리에이터 출연료", "외주인력 비용" 등

## 2. 최종 DB 구조

### 2.1 신규 테이블

#### `creators` 테이블
- 크리에이터/셀럽 관리
- 필드: id, bu_code, name, type, platform, channel_id, subscribers_count, engagement_rate, contact_person, phone, email, agency, fee_range, specialties, status, notes, created_by, created_at, updated_at

### 2.2 기존 테이블 확장

#### `channels` 테이블
- `production_company` (text): 제작사 정보
- `ad_status` (text): 광고 현황 ('active', 'paused', 'completed', 'none')

#### `projects` 테이블
- `creators` (jsonb): 크리에이터 정보 배열
- `freelancers` (jsonb): 외주인력 정보 배열

### 2.3 기존 테이블 활용 (변경 없음)
- `org_members`: 외주인력 관리 (기존 구조 그대로)
- `financial_entries`: 정산 내역 관리
- 기타 모든 기존 테이블

## 3. JSONB 구조

### 3.1 `projects.creators` 구조
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
  }
]
```

### 3.2 `projects.freelancers` 구조
```json
[
  {
    "freelancer_id": 10,
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
  }
]
```

## 4. 데이터 흐름

### 4.1 크리에이터 관리
1. `creators` 테이블에 크리에이터 등록
2. 프로젝트 생성/수정 시 `projects.creators` JSONB에 크리에이터 정보 추가
3. 정산 시 `financial_entries`에 지출 항목으로 등록
   - `kind`: 'expense'
   - `category`: '크리에이터 출연료'
   - `name`: 크리에이터명
   - `amount`: 출연료 금액

### 4.2 외주인력 관리
1. `org_members` 테이블에 외주인력 등록 (title에 "외주" 포함)
2. 프로젝트 생성/수정 시 `projects.freelancers` JSONB에 외주인력 정보 추가
3. 정산 시 `financial_entries`에 지출 항목으로 등록
   - `kind`: 'expense'
   - `category`: '외주인력 비용'
   - `name`: 외주인력명
   - `amount`: 정산 금액

### 4.3 프로젝트별 매출/지출/순수익
- `financial_entries` 테이블의 `kind` 필드로 'revenue'/'expense' 구분
- `project_id`로 프로젝트별 집계
- 프로젝트별 순수익 = 매출 합계 - 지출 합계

## 5. 마이그레이션 파일

- 파일명: `supabase/migrations/0005_add_astcompany_tables.sql`
- 내용:
  - `creators` 테이블 생성
  - `channels` 테이블 확장 (production_company, ad_status)
  - `projects` 테이블 확장 (creators, freelancers JSONB)
  - 인덱스 생성

## 6. TypeScript 타입 정의

### 6.1 신규 타입
- `CreatorType`: 'creator' | 'celebrity' | 'influencer'
- `CreatorStatus`: 'active' | 'inactive' | 'archived'
- `AdStatus`: 'active' | 'paused' | 'completed' | 'none'

### 6.2 신규 인터페이스
- `Creator`: 크리에이터 정보
- `ProjectCreator`: 프로젝트-크리에이터 연결 정보
- `ProjectFreelancer`: 프로젝트-외주인력 연결 정보

### 6.3 수정된 인터페이스
- `Project`: creators, freelancers 필드 추가
- `Channel`: production_company, ad_status 필드 추가

## 7. 다음 단계

1. ✅ 마이그레이션 파일 생성 완료
2. ✅ TypeScript 타입 정의 완료
3. ⏳ API 엔드포인트 생성
4. ⏳ React 컴포넌트 및 대시보드 구현












