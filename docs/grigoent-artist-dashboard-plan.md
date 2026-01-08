# 그리고엔터 소속 아티스트 개인 대시보드 계획

## 개요
그리고엔터(GRIGO) 소속 아티스트들이 자신의 프로필, 관련 프로젝트, 정산 상황을 한눈에 볼 수 있는 개인 대시보드 페이지를 구축합니다.

## 목표
- 아티스트/댄서가 본인의 프로필 정보를 확인할 수 있음
- 본인이 PM이거나 참여 중인 프로젝트를 한눈에 볼 수 있음
- 본인과 관련된 프로젝트의 정산 상황을 확인할 수 있음
- 모바일 친화적인 반응형 디자인

## 페이지 구조

### 경로 제안
- 옵션 1: `/grigoent/my-profile` (추천)
  - 명확하고 직관적
  - grigoent 내에서 개인 프로필 관리
  
- 옵션 2: `/grigoent/artists/me`
  - RESTful 구조
  - 향후 다른 아티스트 조회 기능 확장 가능

**최종 선택: `/grigoent/my-profile`** (간결하고 명확함)

### 페이지 레이아웃

```
┌─────────────────────────────────────┐
│  Header: 내 프로필                  │
├─────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │  프로필 카드                  │  │
│  │  - 이름, 사진                 │  │
│  │  - 기본 정보                  │  │
│  │  - 연락처 정보                │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  프로젝트 목록 (탭)           │  │
│  │  [전체] [진행중] [완료]       │  │
│  │  - 프로젝트 카드 그리드        │  │
│  │  - PM 표시, 상태 표시         │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  정산 현황                    │  │
│  │  - 기간별 필터                │  │
│  │  - 매출/지출 요약             │  │
│  │  - 정산 내역 테이블           │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 데이터 구조 및 API 설계

### 1. 아티스트/댄서 식별 방법

**현재 데이터베이스 구조:**
- `artists` 테이블: name, type, status 등
- `dancers` 테이블: name (nickname_ko), real_name, contact 등
- `app_users` 테이블: id, name, email 등
- `projects` 테이블: artist_id, pm_name, participants (JSONB)

**연결 방법:**
1. **이름 매칭 방식** (1차 선택)
   - `app_users.name`과 `artists.name` 또는 `dancers.name` 매칭
   - 장점: 구현 간단
   - 단점: 이름 중복 가능성

2. **participants.user_id 매칭** (2차 선택)
   - `projects.participants`에서 `user_id`로 매칭
   - 장점: 정확한 연결
   - 단점: 프로젝트가 없으면 연결 불가

3. **하이브리드 방식** (권장)
   - 이름 매칭 + participants.user_id 매칭
   - 둘 중 하나라도 매칭되면 해당 아티스트로 인식

### 2. API 엔드포인트

**새로 생성할 API: `/api/grigoent/my-profile`**

```typescript
GET /api/grigoent/my-profile

Response:
{
  artist: Artist | Dancer | null,  // 아티스트 또는 댄서 정보
  artistType: 'artist' | 'dancer' | null,
  projects: Project[],              // 관련 프로젝트 목록
  financialSummary: {
    totalRevenue: number,
    totalExpense: number,
    totalProfit: number,
    byProject: Array<{
      projectId: number,
      projectName: string,
      revenue: number,
      expense: number,
      profit: number
    }>
  },
  financialEntries: FinancialEntry[] // 상세 정산 내역
}
```

**프로젝트 필터링 로직:**
```sql
-- 아티스트/댄서와 관련된 프로젝트 조회
WHERE (
  -- 1. artist_id로 직접 연결
  projects.artist_id = {artist_id}
  OR
  -- 2. pm_name으로 연결
  projects.pm_name = {artist_name}
  OR
  -- 3. participants에서 dancer_id로 연결
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(projects.participants) AS p
    WHERE (p->>'dancer_id')::int = {dancer_id}
  )
  OR
  -- 4. participants에서 user_id로 연결 (app_users와 연결된 경우)
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(projects.participants) AS p
    WHERE p->>'user_id' = {user_id}
  )
)
AND projects.bu_code = 'GRIGO'
```

### 3. 기존 API 활용
- `/api/projects?bu=GRIGO` - 프로젝트 목록 (필터링 필요)
- `/api/financial-entries?bu=GRIGO` - 정산 내역 (필터링 필요)
- `/api/artists` - 아티스트 목록
- `/api/dancers` - 댄서 목록

## UI/UX 설계

### 주요 섹션

#### 1. 프로필 카드
- 아티스트/댄서 이름 (큰 글씨)
- 프로필 사진 (있는 경우)
- 기본 정보:
  - 타입 (아티스트/댄서)
  - 팀명/회사명
  - 국적
  - 상태 (Active/Inactive)
- 연락처 정보:
  - 연락처
  - 이메일 (있는 경우)

#### 2. 프로젝트 목록
- 탭: 전체 / 진행중 / 완료
- 프로젝트 카드:
  - 프로젝트명
  - 카테고리
  - 상태 배지
  - 기간 (시작일 ~ 종료일)
  - PM 표시 (본인이 PM인 경우 강조)
  - 역할 표시 (PM, 참여자 등)
- 클릭 시 프로젝트 상세 모달 (기존 ProjectModal 활용 가능)

#### 3. 정산 현황
- 기간 필터: 전체 / 올해 / 이번 달 / 직접 입력
- 요약 카드:
  - 총 매출 (파란색)
  - 총 지출 (빨간색)
  - 순이익 (초록색)
- 정산 내역 테이블:
  - 프로젝트명
  - 구분 (매출/지출)
  - 카테고리
  - 금액
  - 발생일
  - 상태 (paid/planned)
- 프로젝트별 그룹화 옵션

### 반응형 디자인
- 모바일: 세로 스택 레이아웃, 카드 형태
- 태블릿: 2열 그리드
- 데스크톱: 3열 그리드, 사이드바 고려

## 구현 단계

### Phase 1: 기본 구조 및 API (1-2일)
1. `/api/grigoent/my-profile` API 엔드포인트 생성
   - 아티스트/댄서 식별 로직 구현
   - 관련 프로젝트 조회 로직 구현
   - 정산 정보 집계 로직 구현

2. 페이지 라우트 생성 (`/grigoent/my-profile`)
   - 기본 레이아웃 구성
   - 인증 및 권한 체크

### Phase 2: 프로필 섹션 (1일)
1. 프로필 카드 컴포넌트 구현
2. 아티스트/댄서 정보 표시
3. 사진 표시 (있는 경우)

### Phase 3: 프로젝트 목록 (1-2일)
1. 프로젝트 목록 컴포넌트 구현
2. 탭 필터링 기능
3. 프로젝트 카드 디자인
4. 프로젝트 상세 모달 연결

### Phase 4: 정산 현황 (1-2일)
1. 정산 요약 컴포넌트
2. 기간 필터 기능
3. 정산 내역 테이블
4. 프로젝트별 그룹화

### Phase 5: 스타일링 및 최적화 (1일)
1. 반응형 디자인 적용
2. 다크모드 지원
3. 로딩 상태 및 에러 처리
4. 성능 최적화

## 기술 스택
- **프레임워크**: Next.js 15 (App Router)
- **스타일링**: Tailwind CSS
- **UI 컴포넌트**: shadcn-ui
- **상태 관리**: @tanstack/react-query
- **아이콘**: lucide-react
- **날짜 처리**: date-fns
- **백엔드**: Supabase

## 파일 구조

```
src/
├── app/
│   └── grigoent/
│       └── my-profile/
│           └── page.tsx                    # 메인 페이지
├── app/api/
│   └── grigoent/
│       └── my-profile/
│           └── route.ts                    # API 엔드포인트
└── features/
    └── grigoent/
        ├── components/
        │   ├── ArtistProfileCard.tsx       # 프로필 카드
        │   ├── ArtistProjectsList.tsx      # 프로젝트 목록
        │   └── ArtistSettlementView.tsx    # 정산 현황
        └── hooks/
            └── useMyArtistProfile.ts       # 프로필 데이터 훅
```

## 고려사항

### 1. 아티스트 식별 정확도
- 이름 매칭만으로는 중복 가능성이 있음
- 향후 `app_users` 테이블에 `artist_id` 또는 `dancer_id` 컬럼 추가 고려
- 또는 `artists`/`dancers` 테이블에 `user_id` 컬럼 추가 고려

### 2. 권한 관리
- GRIGO BU 소속 사용자만 접근 가능
- 본인 정보만 조회 가능 (다른 아티스트 정보 조회 불가)

### 3. 데이터 정합성
- 아티스트/댄서 정보와 프로젝트 정보의 일관성 유지
- participants JSONB 구조의 안정성 확보

### 4. 성능
- 대량의 프로젝트가 있을 경우 페이지네이션 고려
- 정산 정보 집계 쿼리 최적화

## 향후 확장 가능성
- 아티스트별 통계 대시보드
- 프로젝트별 상세 정산 내역
- 정산 내역 다운로드 (CSV/Excel)
- 알림 기능 (새로운 프로젝트, 정산 완료 등)
- 프로필 수정 기능

## 참고
- 기존 `/my-works` 페이지 구조 참고
- 기존 `GrigoEntDashboard` 컴포넌트 구조 참고
- 기존 `ProjectModal` 컴포넌트 재활용 가능







