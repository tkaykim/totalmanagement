# KST 시간대 처리 전면 수정 문서

## 수정일: 2026-01-09

## 1. 문제점

### 1.1 기존 문제
- 서버(Vercel)는 UTC 시간대를 사용
- `new Date()` 또는 `format(new Date(), 'yyyy-MM-dd')`는 서버 시간대(UTC) 기준으로 날짜 생성
- 한국 시간 자정~오전 9시 사이에 날짜가 하루 전으로 저장됨
- `attendance_logs.work_date`와 `check_in_at`의 날짜가 불일치할 수 있음

### 1.2 영향받는 테이블 (Supabase 조사 결과)

| 테이블 | 컬럼 | 타입 | 설명 |
|--------|------|------|------|
| `attendance_logs` | `work_date` | `date` | 근무일 |
| `attendance_logs` | `check_in_at`, `check_out_at` | `timestamptz` | 출퇴근 시각 |
| `work_requests` | `start_date`, `end_date` | `date` | 신청 기간 |
| `work_requests` | `start_time`, `end_time` | `time without time zone` | 신청 시간 |
| `projects` | `start_date`, `end_date` | `date` | 프로젝트 기간 |
| `project_tasks` | `due_date` | `date` | 마감일 |
| `financial_entries` | `occurred_at` | `date` | 발생일 |
| `artists` | `contract_start`, `contract_end`, `visa_start`, `visa_end` | `date` | 계약/비자 날짜 |
| `dancers` | `contract_start`, `contract_end`, `visa_start`, `visa_end` | `date` | 계약/비자 날짜 |
| `channels` | `next_upload_date` | `date` | 다음 업로드 예정일 |
| `channel_contents` | `upload_date` | `date` | 업로드 예정일 |
| `equipment` | `return_date` | `date` | 반납일 |
| `partner_company` | `last_meeting_date` | `date` | 최근 미팅일 |

---

## 2. 해결책

### 2.1 새로 생성한 유틸리티 파일

#### `src/lib/timezone.server.ts` (서버용)
```typescript
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const KST_TIMEZONE = 'Asia/Seoul';

// 현재 KST 날짜를 YYYY-MM-DD 형식으로 반환
export function getTodayKST(): string;

// 현재 KST 시간을 HH:mm:ss 형식으로 반환
export function getCurrentTimeKST(): string;

// 현재 KST 날짜+시간을 ISO 형식으로 반환 (타임존 오프셋 포함)
export function getNowKSTISO(): string;

// 날짜+시간을 KST 기준 ISO 문자열로 변환
export function toKSTISOString(date: string, time: string): string;

// UTC timestamp를 KST 날짜/시간 문자열로 변환
export function utcToKSTDate(utcTimestamp: string | Date): string;
export function utcToKSTTime(utcTimestamp: string | Date): string;
export function utcToKSTDateTime(utcTimestamp: string | Date): string;

// 주어진 날짜를 KST 기준으로 포맷팅
export function formatKST(date: Date | string, formatStr: string): string;
```

#### `src/lib/timezone.ts` (클라이언트용)
동일한 함수들을 `'use client'` 지시문과 함께 제공

### 2.2 핵심 변경 원칙

```typescript
// ❌ 변경 전 (서버 시간대 의존)
const today = format(new Date(), 'yyyy-MM-dd');
const today = new Date().toISOString().split('T')[0];
const now = new Date().toISOString();

// ✅ 변경 후 (KST 명시)
import { getTodayKST, getNowKSTISO } from '@/lib/timezone.server'; // 서버
import { getTodayKST } from '@/lib/timezone'; // 클라이언트

const today = getTodayKST();
const now = getNowKSTISO();
```

---

## 3. 수정된 파일 목록

### 3.1 API 파일 (서버)

| 파일 경로 | 변경 내용 |
|----------|----------|
| `src/app/api/attendance/check-in/route.ts` | `format(new Date())` → `getTodayKST()`, `new Date().toISOString()` → `getNowKSTISO()` |
| `src/app/api/attendance/check-out/route.ts` | 동일 |
| `src/app/api/attendance/status/route.ts` | `format(new Date())` → `getTodayKST()` |
| `src/app/api/attendance/admin/overview/route.ts` | `format(new Date())` → `getTodayKST()` |
| `src/app/api/attendance/work-requests/[id]/approve/route.ts` | `toKSTISOString()` 사용하여 정정 신청 승인 시 KST 시간 변환 |

### 3.2 프론트엔드 컴포넌트

| 파일 경로 | 변경 내용 |
|----------|----------|
| `src/app/page.tsx` | 정산 생성 시 날짜 기본값 KST 적용 |
| `src/app/my-works/page.tsx` | 할일 생성/오늘 판단 시 KST 적용 |
| `src/features/attendance/components/WorkRequestModal.tsx` | 신청 폼 기본 날짜 KST 적용 |
| `src/features/attendance/components/AttendanceAdminView.tsx` | 날짜 선택/오늘 판단 KST 적용 |
| `src/features/erp/utils.ts` | 프로젝트/할일/정산 변환 함수에서 KST 적용 |
| `src/features/erp/components/FinanceModal.tsx` | 정산 생성 시 날짜 기본값 KST 적용 |
| `src/features/modoogoods/components/ModooGoodsDashboard.tsx` | 할일/정산 생성 시 KST 적용 |
| `src/features/flowmaker/components/FlowMakerDashboard.tsx` | 정산 생성 시 KST 적용 |
| `src/features/reactstudio/components/ReactStudioDashboard.tsx` | 정산 생성 시 KST 적용 |
| `src/features/grigoent/components/GrigoEntDashboard.tsx` | 정산 생성 시 KST 적용 |
| `src/features/astcompany/components/ASTCompanyDashboard.tsx` | 정산 생성 시 KST 적용 |
| `src/features/grigoent/components/ProjectDetailModal.tsx` | 정산 생성 시 KST 적용 |

---

## 4. 패키지 추가

```bash
npm install date-fns-tz
```

`date-fns-tz`는 시간대 처리를 위한 공식 date-fns 확장 패키지입니다.

---

## 5. 시간 저장 방식 정리

### 5.1 `timestamptz` 컬럼 (check_in_at, check_out_at 등)
- KST 오프셋을 명시하여 저장: `'2026-01-10T09:30:00+09:00'`
- PostgreSQL이 내부적으로 UTC로 변환하여 저장
- 조회 시 `AT TIME ZONE 'Asia/Seoul'`로 KST 변환 가능

### 5.2 `date` 컬럼 (work_date, due_date 등)
- 시간대 정보 없는 순수 날짜
- **KST 기준으로 생성**: `getTodayKST()` 사용
- 컨벤션: 모든 date 컬럼은 KST 기준

### 5.3 `time` 컬럼 (start_time, end_time)
- 시간대 정보 없는 순수 시간
- 사용자가 입력한 그대로 저장 (KST로 간주)
- 승인 시 `toKSTISOString(date, time)`으로 timestamptz 변환

---

## 6. 테스트 체크리스트

- [ ] 한국 시간 00:00~09:00 사이에 출근 버튼 클릭 시 올바른 날짜로 저장되는지 확인
- [ ] 정정 신청 승인 시 check_in_at, check_out_at이 KST 기준으로 저장되는지 확인
- [ ] 프로젝트/할일/정산 생성 시 날짜 기본값이 KST 오늘인지 확인
- [ ] 관리자 근무현황 페이지에서 오늘 날짜가 KST 기준인지 확인

---

## 7. 향후 개선사항

1. **DB 서버 시간대 설정**: Supabase 프로젝트 설정에서 기본 시간대를 `Asia/Seoul`로 설정하면 `now()` 함수도 KST 기준으로 작동
2. **타임스탬프 표시 유틸리티**: 프론트엔드에서 UTC 타임스탬프를 KST로 표시하는 공통 컴포넌트 추가 고려

---

## 8. 관련 문서

- [date-fns-tz 공식 문서](https://date-fns.org/docs/Time-Zones)
- [PostgreSQL 시간대 처리](https://www.postgresql.org/docs/current/datatype-datetime.html)
