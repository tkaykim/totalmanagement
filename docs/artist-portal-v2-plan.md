# 아티스트 포털 v2 — 기능 계획서

> 작성일: 2026-02-20
> 대상: `/artist` 페이지 (기존 구현 기반 확장)

---

## 1. 현재 구현 상태

### 1-1. 이미 있는 것

| 항목 | 경로 | 상태 |
|------|------|------|
| 아티스트 대시보드 페이지 | `src/app/artist/page.tsx` | ✅ 완료 |
| 프로젝트 목록 섹션 | `ProjectsSection.tsx` | ✅ 완료 |
| 할일 목록 섹션 | `TasksSection.tsx` | ✅ 완료 |
| 정산 내역 섹션 | `SettlementSection.tsx` | ✅ 완료 |
| 프로젝트 API | `GET /api/artist/projects` | ✅ 완료 |
| 할일 API | `GET/PATCH /api/artist/tasks` | ✅ 완료 |
| 정산 API | `GET /api/artist/settlements` | ✅ 완료 |
| 권한 체크 | `canAccessArtistPage()` | ✅ 완료 |
| 할일 상태 변경 | TasksSection 내 인라인 | ✅ 완료 |

### 1-2. 코드에 명시된 TODO (미완성)

```
// artist/page.tsx
onProjectClick:    "TODO: 프로젝트 상세 모달 또는 페이지로 이동"
onTaskClick:       "TODO: 할일 상세 모달 열기"
onSettlementClick: "TODO: 정산 상세 모달 열기"
```

---

## 2. GAP 분석 — 아티스트 입장에서 빠진 것

### 2-1. 상호작용 부재
- 프로젝트/할일/정산 카드를 클릭해도 아무것도 일어나지 않음
- 제안(Proposal) 상태 프로젝트에 **수락/거절** 응답 불가

### 2-2. 프로필 정보 없음
- 본인이 어떤 아티스트 레코드와 연결되어 있는지 확인 불가
- 계약 기간, 비자 만료일 등 중요 날짜 확인 불가

### 2-3. 알림/공지 없음
- 새 제안, 정산 완료, 할일 마감 임박 등 알림 없음

### 2-4. 일정 뷰 없음
- 프로젝트 기간이 달력으로 보이지 않음
- 할일 마감일을 캘린더로 확인 불가

### 2-5. 수입 통계 없음
- 월별/연도별 정산 추이 차트 없음
- 프로젝트별 수입 비중 확인 불가

### 2-6. 세금/원천징수 정보 불투명
- 공급가 vs 실지급액 차이 이유(세금 유형) 확인이 어려움

---

## 3. 기능 계획 (우선순위별)

### Phase 1 — 빠진 인터랙션 완성 (기존 TODO 해결)

#### 1-A. 프로젝트 상세 모달
> 클릭하면 프로젝트 정보를 슬라이드 패널(Sheet)로 보여줌

**보여줄 정보:**
- 프로젝트명, 카테고리, 상태, 기간
- 담당 PM 이름
- 관련 할일 목록 (이 프로젝트의 내 할일)
- 관련 정산 내역 (이 프로젝트의 내 정산)
- 메모/설명

**구현 방식:**
- `shadcn/ui` Sheet 컴포넌트 활용
- `artist/page.tsx`의 `onProjectClick` 핸들러에 연결
- 기존 API 데이터를 project_id로 필터링 → 별도 API 불필요

---

#### 1-B. 할일 상세 모달
> 클릭하면 할일 세부 정보 및 상태 변경 UI 표시

**보여줄 정보:**
- 제목, 설명
- 마감일 (D-day 표시)
- 우선순위 (high/medium/low)
- 연결된 프로젝트명
- 상태 변경 버튼 (할일 → 진행중 → 완료)
- 태그

**구현 방식:**
- Dialog 컴포넌트 활용
- 기존 `useUpdateArtistTaskStatus` 뮤테이션 재사용

---

#### 1-C. 정산 상세 모달
> 클릭하면 세금/지급 정보를 명확하게 보여줌

**보여줄 정보:**
- 적요명, 프로젝트명
- 발생일, 지급 상태
- 세금 유형 설명 (면세 / 부가세 / 원천징수 3.3%)
- 공급가 → 세금 → 실지급액 계산식 표시
- 메모

**구현 방식:**
- Dialog 컴포넌트 활용
- 기존 SettlementSection의 인라인 확장 UI를 모달로 업그레이드

---

### Phase 2 — 제안 응답 기능

#### 2-A. 프로젝트 제안 수락/거절

**배경:**
- `ProjectsSection`의 "제안/조율 중" 탭이 존재하지만 단순 확인만 가능
- 아티스트가 직접 수락/거절 의사를 전달할 방법이 없음

**신규 기능:**
- 프로젝트 상태가 `준비중` 또는 `기획중`일 때 → 상세 모달에 **수락 / 거절 / 검토중** 버튼 표시
- 응답 결과는 `project_proposals` 테이블(신규) 또는 프로젝트 메타데이터에 저장
- 담당 PM에게 푸시 알림 발송 (기존 Firebase 인프라 활용)

**API:**
```
POST /api/artist/proposals
Body: { project_id, response: 'accept' | 'reject' | 'pending', message? }
```

**DB 변경 (최소):**
```sql
-- projects 테이블에 컬럼 추가 (또는 별도 테이블)
ALTER TABLE projects ADD COLUMN artist_response TEXT
  CHECK (artist_response IN ('pending', 'accepted', 'rejected'));
ALTER TABLE projects ADD COLUMN artist_response_note TEXT;
ALTER TABLE projects ADD COLUMN artist_responded_at TIMESTAMPTZ;
```

---

### Phase 3 — 프로필 카드

#### 3-A. 내 아티스트 프로필 조회

**보여줄 정보:**
- 예명 / 실명
- 소속사 (partner_company)
- 계약 기간 (contract_start ~ contract_end, D-day 표시)
- 비자 정보 (외국인 아티스트: visa_type, 만료일)
- 분류 (DANCER, INFLUENCER 등 job_titles)
- 사진 (있는 경우)

**위치:** 대시보드 최상단에 프로필 카드 섹션 추가 (현재는 이름만 표시)

**API:**
```
GET /api/artist/profile
→ exclusive_artists 테이블에서 본인 레코드 조회
→ partner_id로 연결 (app_users.partner_id → exclusive_artists.id 매핑)
```

**주의:** `exclusive_artists.metadata`에 계좌번호 등 민감정보 포함 → **계좌/주민번호는 표시 안 함**

---

### Phase 4 — 알림 센터

#### 4-A. 인앱 알림 뱃지

**알림 트리거:**
| 이벤트 | 알림 내용 |
|--------|-----------|
| 새 프로젝트 제안 | "XXX 프로젝트에 참여 제안이 왔습니다" |
| 정산 확정 | "YYY 프로젝트 정산이 확정되었습니다 (₩XX)" |
| 정산 완료 | "YYY 프로젝트 정산이 지급되었습니다 (₩XX)" |
| 할일 마감 D-1 | "ZZZ 마감이 내일입니다" |
| 할일 배정 | "새 할일이 배정되었습니다: ZZZ" |

**구현 방식:**
- `notifications` 테이블 (신규) 또는 기존 푸시 인프라(Firebase) 활용
- 헤더 벨 아이콘에 뱃지 카운트
- 알림 목록 드롭다운

---

### Phase 5 — 일정 캘린더 뷰 (선택)

#### 5-A. 미니 캘린더

**표시 내용:**
- 이번 달 프로젝트 기간 (바 형태)
- 할일 마감일 (점 표시)
- 정산 예정일

**구현 방식:**
- 별도 탭 `캘린더` 추가
- `react-calendar` 또는 커스텀 구현
- 기존 projects/tasks 데이터 재활용

---

### Phase 6 — 수입 통계 차트 (선택)

#### 6-A. 정산 추이 차트

**표시 내용:**
- 월별 정산 수령액 바 차트 (최근 12개월)
- 프로젝트별 수입 파이 차트
- 연간 합계 / 이번 달 합계

**구현 방식:**
- `recharts` 또는 `@nivo` 라이브러리 (미설치 시 추가 필요)
- 기존 `/api/artist/settlements` 응답 데이터 집계

---

## 4. 아티스트 포털 전체 구조 (목표 상태)

```
/artist
├── 헤더 (이름, 로그아웃)
│
├── [Section] 프로필 카드 ← Phase 3 신규
│   ├── 예명/이름
│   ├── 계약 D-day
│   └── 비자 만료 D-day (해당 시)
│
├── [Section] 요약 카드 3개 ← ✅ 기존
│   ├── 진행 중 프로젝트 수
│   ├── 미완료 할일 수
│   └── 정산 확정/지급 금액
│
├── [Section] 알림 배너 ← Phase 4 신규
│   └── 최신 알림 N건 표시
│
├── [Grid 2열]
│   ├── 프로젝트 목록 (탭: 제안/진행/완료) ← ✅ 기존
│   │   └── 클릭 → 프로젝트 상세 Sheet ← Phase 1-A 신규
│   │       ├── 수락/거절 버튼 (제안 상태만) ← Phase 2 신규
│   │       ├── 관련 할일 미니 목록
│   │       └── 관련 정산 미니 목록
│   │
│   └── 할일 목록 (탭: 전체/할일/진행/완료) ← ✅ 기존
│       └── 클릭 → 할일 상세 Dialog ← Phase 1-B 신규
│
├── [Section] 정산 내역 ← ✅ 기존
│   └── 클릭 → 정산 상세 Dialog ← Phase 1-C 신규
│       └── 세금 유형 및 계산식 표시
│
└── [Section] 수입 통계 차트 ← Phase 6 선택
    ├── 월별 바 차트
    └── 프로젝트별 파이 차트
```

---

## 5. 구현 순서 및 예상 작업량

| Phase | 기능 | 신규 파일 | 예상 규모 |
|-------|------|-----------|-----------|
| 1-A | 프로젝트 상세 Sheet | `ProjectDetailSheet.tsx` | 소 |
| 1-B | 할일 상세 Dialog | `TaskDetailDialog.tsx` | 소 |
| 1-C | 정산 상세 Dialog | `SettlementDetailDialog.tsx` | 소 |
| 2 | 제안 수락/거절 | `ProposalResponseButtons.tsx` + API | 중 |
| 3 | 프로필 카드 | `ArtistProfileCard.tsx` + API | 중 |
| 4 | 알림 센터 | `NotificationBadge.tsx` + DB | 대 |
| 5 | 캘린더 뷰 | `ScheduleCalendar.tsx` | 중 |
| 6 | 수입 차트 | `IncomeChart.tsx` | 중 |

---

## 6. 기술 결정 사항

### 6-1. 컴포넌트 패턴
- 모달/시트: `shadcn/ui` Dialog, Sheet 사용 (이미 설치됨)
- 상태 관리: 기존 `useArtistDashboard` hook 확장
- 서버 통신: 기존 패턴 (`fetch` + React Query)

### 6-2. 권한 체계 (변경 없음)
```typescript
canAccessArtistPage() → role === 'artist' || (role === 'leader'|'admin' && bu_code === 'HEAD')
```

### 6-3. 민감정보 보호
- 정산 상세에서 계좌번호, 주민번호 **절대 표시 금지**
- `exclusive_artists.details` (jsonb) 서버에서 필터링 후 전송
- API에서 화이트리스트 방식으로 필드 선택

### 6-4. 알림 인프라
- 단기: Supabase Realtime subscription으로 인앱 알림
- 장기: 기존 Firebase FCM 인프라로 푸시 알림

---

## 7. DB 변경 최소화 원칙

Phase 1~3은 **DB 변경 없이** 기존 테이블 조합으로 구현 가능.

Phase 2 (제안 응답)만 변경 필요:
```sql
-- 최소 변경: projects 테이블에 컬럼 3개 추가
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS artist_response TEXT
    CHECK (artist_response IN ('pending', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS artist_response_note TEXT,
  ADD COLUMN IF NOT EXISTS artist_responded_at TIMESTAMPTZ;
```

Phase 4 (알림)은 별도 `notifications` 테이블 필요:
```sql
CREATE TABLE public.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,        -- 'proposal', 'settlement_confirmed', 'task_assigned', ...
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',   -- { project_id, task_id, settlement_id }
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON public.notifications(user_id, is_read, created_at DESC);
```

---

## 8. 참고 파일

- 기존 대시보드: `src/features/artist-dashboard/components/ArtistDashboard.tsx`
- 기존 타입: `src/features/artist-dashboard/types.ts`
- 기존 API: `src/features/artist-dashboard/api.ts`
- 기존 훅: `src/features/artist-dashboard/hooks.ts`
- 권한: `src/lib/permissions.ts` → `canAccessArtistPage()`
- 구 계획서 (GRIGO 특화): `docs/grigoent-artist-dashboard-plan.md`
