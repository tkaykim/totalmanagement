# SOP 및 할일 템플릿 기능 구현 계획

## 📋 개요

프로젝트에서 사업부별로 주로 진행하는 일들을 템플릿화하여 할일을 자동 생성하고, 각 할일에 SOP(매뉴얼)를 연동하여 수행 방법을 제시하는 기능을 구현합니다.

## 🎯 주요 기능

### 1. SOP(매뉴얼) 기능
- SOP 생성, 수정, 삭제, 조회
- 사업부별 SOP 관리
- 카테고리별 분류
- 할일과 연동

### 2. 할일 템플릿 기능
- 사업부별 할일 템플릿 관리
- 템플릿 타입별 옵션 설정 (예: 대회, 배틀, 워크샵 등)
- 템플릿에서 할일 목록 자동 생성
- 날짜 역계산을 통한 마감기한 자동 설정

### 3. 프로젝트에서 할일 템플릿 사용
- 프로젝트에서 템플릿 선택
- 옵션 설정 (해외 게스트 유무, 대회 룰, 행사 날짜 등)
- 할일 목록 자동 생성

### 4. 할일-SOP 연동
- 할일 상세에서 연동된 SOP 조회
- SOP를 통한 할일 수행 방법 제시

---

## 🗄️ 데이터베이스 설계

### 1. Manuals 테이블 (기존 테이블 활용)

**기존 구조:**
- `id`: bigint (PK)
- `bu_code`: bu_code
- `title`: text
- `category`: text
- `content`: jsonb (기본값: '[]'::jsonb)
- `author_id`: uuid (nullable)
- `author_name`: text (nullable)
- `created_at`: timestamptz
- `updated_at`: timestamptz

**추가 필요:**
- `is_active`: boolean (기본값: true) - 활성화 여부

```sql
-- manuals 테이블에 is_active 컬럼 추가
ALTER TABLE public.manuals 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 기존 데이터는 모두 활성화 상태로 설정
UPDATE public.manuals SET is_active = true WHERE is_active IS NULL;
```

**필드 설명:**
- `bu_code`: 사업부 코드
- `title`: 매뉴얼 제목 (SOP 제목)
- `category`: 매뉴얼 카테고리 (예: '비자', '안무', '행사', '정산' 등)
- `content`: JSONB 형식의 매뉴얼 내용 (단계별 가이드, 체크리스트, 첨부파일 링크 등)
- `author_id`: 작성자 ID
- `author_name`: 작성자 이름 (기존 필드 유지)
- `is_active`: 활성화 여부 (새로 추가)

### 2. 할일 템플릿 테이블 (task_templates)

```sql
CREATE TABLE public.task_templates (
    id bigserial PRIMARY KEY,
    bu_code public.bu_code NOT NULL,
    name text NOT NULL,  -- '대회', '배틀', '워크샵', '비자 신규 발급', '안무 제작' 등
    description text,
    template_type text NOT NULL,  -- 'event', 'visa', 'choreography' 등
    options_schema jsonb NOT NULL,  -- 옵션 스키마 정의 (예: { "has_overseas_guest": boolean, "event_date": date, "battle_rules": string })
    tasks jsonb NOT NULL,  -- 할일 목록 정의 (예: [{ "title": "출연진 섭외", "days_before": 30, "manual_id": 1 }])
    author_id uuid REFERENCES public.app_users(id),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

**필드 설명:**
- `bu_code`: 사업부 코드
- `name`: 템플릿 이름
- `description`: 템플릿 설명
- `template_type`: 템플릿 타입
- `options_schema`: 옵션 스키마 정의 (JSON Schema 형식)
- `tasks`: 할일 목록 정의 배열
  - 각 할일: `{ title, days_before (기준일로부터 며칠 전), manual_id (연동할 매뉴얼), assignee_role (담당자 역할), priority }`
- `author_id`: 작성자
- `is_active`: 활성화 여부

### 3. project_tasks 테이블 수정

기존 `project_tasks` 테이블에 `manual_id` 컬럼 추가:

```sql
ALTER TABLE public.project_tasks 
ADD COLUMN IF NOT EXISTS manual_id bigint REFERENCES public.manuals(id) ON DELETE SET NULL;
```

**주의**: `sop_id`가 아닌 `manual_id`를 사용하여 기존 `manuals` 테이블과 연동

---

## 📁 디렉토리 구조

```
src/
├── features/
│   ├── manuals/ (또는 기존 feature 활용)
│   │   ├── api.ts                    # Manuals API 함수 (기존 /api/manuals 활용)
│   │   ├── types.ts                   # Manual 타입 정의 (기존 타입 확장)
│   │   ├── hooks.ts                   # React Query hooks
│   │   ├── components/
│   │   │   ├── ManualList.tsx         # Manual 목록 컴포넌트
│   │   │   ├── ManualDetail.tsx       # Manual 상세 컴포넌트
│   │   │   ├── ManualForm.tsx         # Manual 생성/수정 폼
│   │   │   └── ManualEditor.tsx       # Manual 내용 에디터
│   │   └── lib/
│   │       └── manual-content.ts      # Manual 내용 유틸리티
│   │
│   └── task-template/
│       ├── api.ts                     # 할일 템플릿 API 함수
│       ├── types.ts                   # 할일 템플릿 타입 정의
│       ├── hooks.ts                   # React Query hooks
│       ├── components/
│       │   ├── TaskTemplateList.tsx   # 템플릿 목록 컴포넌트
│       │   ├── TaskTemplateForm.tsx   # 템플릿 생성/수정 폼
│       │   ├── TaskTemplateSelector.tsx # 프로젝트에서 템플릿 선택 컴포넌트
│       │   ├── TemplateOptionsForm.tsx # 템플릿 옵션 입력 폼
│       │   └── TaskPreview.tsx        # 생성될 할일 미리보기
│       └── lib/
│           ├── task-generator.ts     # 할일 생성 로직
│           └── date-calculator.ts    # 날짜 역계산 유틸리티
│
└── app/
    └── api/
        ├── manuals/
        │   ├── route.ts               # Manuals CRUD API (기존 API 확장)
        │   └── [id]/
        │       └── route.ts           # Manual 단일 조회/수정/삭제 (기존 API 확장)
        └── task-templates/
            ├── route.ts               # 템플릿 CRUD API
            ├── [id]/
            │   └── route.ts           # 템플릿 단일 조회/수정/삭제
            └── generate/
                └── route.ts           # 템플릿으로 할일 생성 API
```

---

## 🔧 구현 단계

### Phase 1: 데이터베이스 스키마 생성

1. **마이그레이션 파일 생성**
   - `supabase/migrations/YYYYMMDD_add_manuals_is_active_and_task_templates.sql`
   - **기존 `manuals` 테이블 활용** (새 테이블 생성하지 않음)
   - `manuals` 테이블에 `is_active` 컬럼 추가
   - 할일 템플릿 테이블 생성 (`task_templates`)
   - `project_tasks` 테이블에 `manual_id` 컬럼 추가 (sop_id 대신)
   - 인덱스 및 RLS 정책 설정

2. **타입 정의**
   - `src/types/database.ts`의 기존 `Manual` 타입에 `is_active` 필드 추가
   - `TaskTemplate` 타입 추가
   - `ProjectTask` 타입에 `manual_id` 필드 추가

### Phase 2: Manuals (SOP) 기능 구현

1. **기존 API 확장**
   - `src/app/api/manuals/route.ts`: 기존 API에 권한 체크 추가
     - **GET**: `bu_code` 쿼리 파라미터는 선택적 (없으면 전체 조회)
     - 모든 사용자가 모든 사업부의 매뉴얼 조회 가능
     - `is_active` 필터 추가 (기본값: true만 조회)
     - **POST**: 현재 사용자의 사업부에만 매뉴얼 생성 가능 (admin/leader/manager 권한 체크)
   - `src/app/api/manuals/[id]/route.ts`: 기존 API에 권한 체크 추가
     - **GET**: 모든 사용자가 모든 사업부의 매뉴얼 조회 가능
     - **PATCH/DELETE**: 해당 매뉴얼의 `bu_code`와 현재 사용자의 `bu_code`가 일치하는 경우만 수정/삭제 가능 (admin/leader/manager 권한 체크)

2. **Feature 모듈 구현**
   - `src/features/manuals/api.ts`: API 호출 함수 (기존 `/api/manuals` 활용)
   - `src/features/manuals/types.ts`: 타입 정의 (기존 Manual 타입 확장)
   - `src/features/manuals/hooks.ts`: React Query hooks
   - `src/features/manuals/components/`: 컴포넌트들

3. **Manuals 관리 페이지** (선택사항 - 기존에 있을 수도 있음)
   - 매뉴얼 목록, 생성, 수정, 삭제 UI
   - 기존 페이지가 있다면 확장

### Phase 3: 할일 템플릿 기능 구현

1. **API 구현**
   - `src/app/api/task-templates/route.ts`: 템플릿 목록 조회, 생성
     - **GET**: `bu_code` 쿼리 파라미터는 선택적 (없으면 전체 조회)
     - 모든 사용자가 모든 사업부의 템플릿 조회 가능
     - **POST**: 현재 사용자의 사업부에만 템플릿 생성 가능 (admin/manager 권한 체크)
   - `src/app/api/task-templates/[id]/route.ts`: 템플릿 단일 조회, 수정, 삭제
     - **GET**: 모든 사용자가 모든 사업부의 템플릿 조회 가능
     - **PATCH/DELETE**: 해당 템플릿의 `bu_code`와 현재 사용자의 `bu_code`가 일치하는 경우만 수정/삭제 가능 (admin/manager 권한 체크)
   - `src/app/api/task-templates/generate/route.ts`: 템플릿으로 할일 생성
     - 모든 사용자가 모든 사업부의 템플릿을 사용하여 할일 생성 가능 (조회 권한이 있으므로)
     - 템플릿의 `tasks` 배열에서 `manual_id`를 읽어 `project_tasks.manual_id`에 연결

2. **Feature 모듈 구현**
   - `src/features/task-template/api.ts`: API 호출 함수
   - `src/features/task-template/types.ts`: 타입 정의
   - `src/features/task-template/hooks.ts`: React Query hooks
   - `src/features/task-template/lib/task-generator.ts`: 할일 생성 로직
   - `src/features/task-template/lib/date-calculator.ts`: 날짜 역계산 로직
   - `src/features/task-template/components/`: 컴포넌트들

3. **템플릿 관리 페이지**
   - `/task-templates` 페이지 생성
   - 템플릿 목록, 생성, 수정, 삭제 UI

### Phase 4: 프로젝트에서 템플릿 사용 기능 ✅

1. **프로젝트 상세 페이지 수정**
   - 할일 생성 시 템플릿 선택 옵션 추가
   - 템플릿 선택 → 옵션 입력 → 할일 미리보기 → 생성

2. **컴포넌트 구현**
   - `TaskTemplateSelector`: 템플릿 선택 (구현됨)
   - `TemplateOptionsForm`: 옵션 입력 폼 (동적 스키마 기반, TaskTemplateSelector 내 포함)
   - `TaskPreview`: 생성될 할일 미리보기 (TaskTemplateSelector 내 포함)

**구현 현황**: 프로젝트 상세(UnifiedProjectModal) 할일 섹션에 "할일 탬플릿" 버튼 추가. 클릭 시 TaskTemplateSelector 모달이 열리고, 사업부·템플릿·옵션(기준일 등) 입력 후 할일 일괄 생성. edit 모달에서 `onAddTaskFromTemplate`로 연동됨.

### Phase 5: 할일-SOP 연동 ✅

1. **할일 상세 페이지 수정**
   - 할일 상세에 SOP 연동 섹션 추가
   - SOP가 연동된 경우 SOP 내용 표시

2. **할일 생성 시 SOP 연동**
   - 템플릿에서 정의된 manual_id를 할일 생성 시 자동 연결

**구현 현황**: UnifiedTaskModal에 "매뉴얼(SOP) 연결" 필드 및 ManualDetailModal 연동 완료. 할일에 manual_id가 있으면 연동 SOP 제목 표시 후 "클릭하여 열람"으로 단계/체크리스트/첨부 자료 확인 가능. GET `/api/manuals/[id]` 추가됨.

### Phase 6: 테스트 및 검증

1. **Playwright 테스트**
   - SOP 생성/수정/삭제 테스트
   - 템플릿 생성 및 할일 생성 테스트
   - 할일-SOP 연동 테스트

2. **Supabase MCP 검증**
   - 데이터베이스 스키마 확인
   - 데이터 생성/조회 확인

---

## 📝 예시 데이터 구조

### Manual (SOP) 예시

```json
{
  "id": 1,
  "bu_code": "GRIGO",
  "title": "비자 신규 발급 절차",
  "category": "비자",
  "is_active": true,
  "author_id": "uuid...",
  "author_name": "홍길동",
  "content": {
    "steps": [
      {
        "order": 1,
        "title": "전속계약서 작성",
        "description": "아티스트와 전속계약서를 작성합니다.",
        "checklist": [
          "계약서 양식 다운로드",
          "아티스트 정보 입력",
          "법무팀 검토 요청"
        ]
      },
      {
        "order": 2,
        "title": "고용추천서 작성",
        "description": "고용추천서를 작성하고 서명을 받습니다.",
        "checklist": [
          "고용추천서 양식 다운로드",
          "아티스트 정보 입력",
          "대표 서명"
        ]
      }
    ],
    "attachments": [
      {
        "name": "전속계약서 양식",
        "url": "/files/contract-template.pdf"
      }
    ]
  }
}
```

### 할일 템플릿 예시 (플로우메이커 - 대회)

```json
{
  "id": 1,
  "bu_code": "FLOW",
  "name": "대회",
  "description": "플로우메이커 대회 프로젝트 템플릿",
  "template_type": "event",
  "options_schema": {
    "type": "object",
    "properties": {
      "has_overseas_guest": {
        "type": "boolean",
        "title": "해외 게스트 유무"
      },
      "battle_rules": {
        "type": "string",
        "title": "대회 룰",
        "enum": ["1대1", "2ON2", "3ON3", "크루배틀"]
      },
      "event_date": {
        "type": "string",
        "format": "date",
        "title": "행사 날짜"
      }
    },
    "required": ["event_date", "battle_rules"]
  },
  "tasks": [
    {
      "title": "출연진 섭외",
      "days_before": 30,
      "manual_id": 2,
      "assignee_role": "pm",
      "priority": "high"
    },
    {
      "title": "포스터 디자인",
      "days_before": 25,
      "manual_id": null,
      "assignee_role": "designer",
      "priority": "medium"
    },
    {
      "title": "상패 디자인",
      "days_before": 20,
      "manual_id": 3,
      "assignee_role": "designer",
      "priority": "medium"
    },
    {
      "title": "상패 발주",
      "days_before": 15,
      "manual_id": 4,
      "assignee_role": "pm",
      "priority": "high"
    },
    {
      "title": "홍보영상 릴리즈",
      "days_before": 7,
      "manual_id": 5,
      "assignee_role": "editor",
      "priority": "high"
    }
  ]
}
```

### 할일 템플릿 예시 (그리고엔터테인먼트 - 비자)

```json
{
  "id": 2,
  "bu_code": "GRIGO",
  "name": "비자 신규 발급",
  "description": "아티스트 비자 신규 발급 프로세스",
  "template_type": "visa",
  "options_schema": {
    "type": "object",
    "properties": {
      "artist_id": {
        "type": "number",
        "title": "아티스트"
      },
      "visa_type": {
        "type": "string",
        "title": "비자 유형",
        "enum": ["E-6", "F-6", "기타"]
      }
    },
    "required": ["artist_id", "visa_type"]
  },
  "tasks": [
    {
      "title": "전속계약서 작성",
      "days_before": 60,
      "manual_id": 1,
      "assignee_role": "pm",
      "priority": "high"
    },
    {
      "title": "고용추천서 작성",
      "days_before": 45,
      "manual_id": 1,
      "assignee_role": "pm",
      "priority": "high"
    },
    {
      "title": "사증발급 신청",
      "days_before": 30,
      "manual_id": 1,
      "assignee_role": "pm",
      "priority": "high"
    }
  ]
}
```

---

## 🎨 UI/UX 고려사항

1. **SOP 관리**
   - 리치 텍스트 에디터 사용 (단계별 가이드 작성)
   - 체크리스트 기능
   - 첨부파일 업로드

2. **템플릿 관리**
   - 옵션 스키마를 동적으로 렌더링하는 폼
   - 할일 목록 시각화 (타임라인 형태)
   - 날짜 역계산 결과 미리보기

3. **프로젝트에서 템플릿 사용**
   - 단계별 가이드 (템플릿 선택 → 옵션 입력 → 미리보기 → 생성)
   - 생성될 할일 목록 미리보기
   - 일괄 생성 확인 다이얼로그

4. **할일 상세에서 SOP 보기**
   - SOP 내용을 모달 또는 사이드 패널로 표시
   - 단계별 진행 상황 표시
   - 체크리스트 완료 표시

---

## 🔐 권한 관리

1. **Manuals (SOP) 관리**
   - **조회**: 모든 사용자 (모든 사업부의 매뉴얼 열람 가능)
     - `bu_code` 쿼리 파라미터는 선택적 (없으면 전체 조회)
     - `is_active` 필터 추가 (기본값: true만 조회)
     - 사업부별로 구분되어 저장되지만, 다른 사업부에서도 열람 가능
     - 예: FLOW 사업부 사용자가 GRIGO 사업부의 매뉴얼도 조회 가능
   - **생성**: 
     - 현재 사용자의 `bu_code`에만 매뉴얼 생성 가능
     - admin, leader, manager 권한 필요
   - **수정/삭제**: 
     - 해당 매뉴얼의 `bu_code`와 현재 사용자의 `bu_code`가 일치하는 경우만 가능
     - admin, leader, manager 권한 필요
     - 다른 사업부의 매뉴얼은 수정/삭제 불가 (조회만 가능)

2. **템플릿 관리**
   - **조회**: 모든 사용자 (모든 사업부의 템플릿 열람 가능)
     - `bu_code` 쿼리 파라미터는 선택적 (없으면 전체 조회)
     - 사업부별로 구분되어 저장되지만, 다른 사업부에서도 열람 가능
   - **생성**: 
     - 현재 사용자의 `bu_code`에만 템플릿 생성 가능
     - admin, leader, manager 권한 필요
   - **수정/삭제**: 
     - 해당 템플릿의 `bu_code`와 현재 사용자의 `bu_code`가 일치하는 경우만 가능
     - admin, leader, manager 권한 필요
     - 다른 사업부의 템플릿은 수정/삭제 불가 (조회만 가능)

3. **할일 생성**
   - 프로젝트 PM 또는 참여자만 가능 (기존 권한 체계 활용)
   - 템플릿 사용 시: 다른 사업부의 템플릿도 선택 가능 (조회 권한이 있으므로)
   - 템플릿으로 생성된 할일은 해당 프로젝트의 `bu_code`를 따름

### 권한 체크 함수 (src/lib/permissions.ts에 추가)

```typescript
// Manuals (SOP) 권한 체크 함수
export function canAccessManual(user: AppUser): boolean {
  // 모든 사용자가 매뉴얼 조회 가능
  return true;
}

export function canCreateManual(user: AppUser, buCode: BuCode): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'leader' && user.bu_code === buCode) return true;
  if (user.role === 'manager' && user.bu_code === buCode) return true;
  return false;
}

export function canEditManual(user: AppUser, manual: { bu_code: BuCode }): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'leader' && user.bu_code === manual.bu_code) return true;
  if (user.role === 'manager' && user.bu_code === manual.bu_code) return true;
  return false;
}

export function canDeleteManual(user: AppUser, manual: { bu_code: BuCode }): boolean {
  return canEditManual(user, manual);
}

// 템플릿 권한 체크 함수 (Manuals와 동일한 로직)
export function canAccessTaskTemplate(user: AppUser): boolean {
  return true;
}

export function canCreateTaskTemplate(user: AppUser, buCode: BuCode): boolean {
  return canCreateManual(user, buCode);
}

export function canEditTaskTemplate(user: AppUser, template: { bu_code: BuCode }): boolean {
  return canEditManual(user, template);
}

export function canDeleteTaskTemplate(user: AppUser, template: { bu_code: BuCode }): boolean {
  return canEditTaskTemplate(user, template);
}
```

---

## 📊 성능 고려사항

1. **인덱스**
   - `manuals(bu_code, is_active)` - 기존 인덱스 확인 후 필요시 추가
   - `task_templates(bu_code, is_active)`
   - `project_tasks(manual_id)`

2. **캐싱**
   - 템플릿 목록은 자주 변경되지 않으므로 React Query 캐싱 활용

3. **배치 처리**
   - 템플릿으로 여러 할일 생성 시 트랜잭션 처리

---

## 🚀 향후 확장 가능성

1. **템플릿 버전 관리**
   - 템플릿 변경 이력 추적
   - 이전 버전 템플릿으로 생성된 할일과의 호환성

2. **SOP 통계**
   - SOP 조회 수, 완료율 등 통계

3. **템플릿 공유**
   - 사업부 간 템플릿 공유 기능

4. **자동화**
   - 특정 조건에서 자동으로 할일 생성

---

## ✅ 체크리스트

### 데이터베이스
- [x] Manuals 테이블 확인 (기존 테이블 활용)
- [ ] Manuals 테이블에 is_active 컬럼 추가
- [ ] 할일 템플릿 테이블 생성
- [ ] project_tasks 테이블에 manual_id 컬럼 추가
- [ ] 인덱스 생성
- [ ] RLS 정책 설정

### API
- [x] Manuals CRUD API 확인 (기존 API 확장 필요)
- [ ] Manuals API에 권한 체크 추가
- [ ] 템플릿 CRUD API
- [ ] 템플릿으로 할일 생성 API

### Feature 모듈
- [ ] Manuals feature 모듈 (기존 Manual 타입 확장)
- [ ] 템플릿 feature 모듈
- [ ] 할일 생성 로직
- [ ] 날짜 역계산 로직

### UI
- [ ] Manuals 관리 페이지 (기존 페이지 확인 후 확장)
- [ ] 템플릿 관리 페이지
- [ ] 프로젝트에서 템플릿 사용 UI
- [ ] 할일 상세에서 Manual 표시

### 테스트
- [ ] Playwright 테스트
- [ ] Supabase MCP 검증
