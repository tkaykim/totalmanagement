# 외부 계약

이 시스템의 외부 사용자는 둘로 나뉜다.
하나는 **HTTP API를 부르는 쪽**이다. 이 앱의 화면과 Vercel 크론뿐이다.
다른 하나는 **같은 DB를 직접 읽거나 쓰는 쪽**이다. 사내 워커·flowmaker는 읽기만 하고, reactstudio.kr은 읽고 쓴다.
공개 HTTP API는 없다. DB 스키마와 값 자체가 계약이다.

## 1. DB 직접 사용자 (스키마 계약)

세 곳 모두 Supabase 프로젝트 `wqtoahrekijirxxpbfqg`에 서비스 권한 키로 접속한다. reactstudio.kr 공개 페이지만 익명 키를 쓴다.
아래 칸·값을 지우거나 이름·의미를 바꾸면 해당 사용자가 오류 없이 틀린 결과를 낸다.

### 사내 워커 (`tkay_personal/worker/src`)

| 파일 | 읽는 것 | 기대하는 값 |
|---|---|---|
| `digest.ts` | `projects`, `project_tasks`, `financial_entries` | 프로젝트 상태 `진행중`·`준비중`·`운영중`, 할일 `todo`·`in_progress`, 재무 `kind` `revenue`/`expense`, `status='planned'`, `due_date` null 여부, `bu_code` `GRIGO`·`REACT` |
| `monthly-pnl.ts` | `financial_entries`의 `bu_code, kind, status, amount, actual_amount, occurred_at, entry_scope, counterparty_bu_code` | `status <> 'canceled'`, `entry_scope='internal_allocation'`은 연결손익에서 제외 |
| `overload-detector.ts` | `project_tasks`의 `bu_code, assignee` | `status in ('todo','in_progress')`, `due_date` not null. 결과로 신호등(`business_signals`)만 갱신한다. 할일 과부하·기한 초과로 결정 카드를 만들지 않는다(2026-09-24 회사 결정, 환경변수 `OVERLOAD_DECISION_CARDS=1`이면 다시 만든다) |
| `dashboard-server.ts` | `projects`(`id, bu_code, name, category, status, end_date, pm_id`), `project_tasks`(`id, project_id, bu_code, title, assignee, status, due_date`), `app_users`(`id, name`) | `bu_code` 대문자 |

워커는 쓰지 않고 읽기만 한다.

### flowmaker (`flowmaker/src/lib/supabase/erp.ts`)

- 읽는 것: `app_users`의 `id, name, bu_code, role, position, status, hire_date`
- 조건: `bu_code='FLOW'`, `status='active'`
- 이 조건으로 FLOW 재직자 명단을 만든다. `status` 값이나 FLOW 코드가 바뀌면 명단이 비어 버린다.

### reactstudio.kr (`Unite/reactstudio`)

- 소유 테이블: `react_review_*` 6개, `react_staff_*` 7개. 이 앱은 읽지도 쓰지도 않는다.
- 비로그인으로 읽는 것
  - `portfolio_items` 전체
  - `projects` 중 `status='완료'`
  - `clients`
- 관리자 화면(reactstudio.kr `/admin`)은 서비스 권한 키로 ERP 핵심 테이블에 **직접 쓴다**. 이 앱의 권한 규칙을 거치지 않는다.
  - `projects`: 수정·삭제
  - `project_tasks`: 생성·수정·삭제
  - `financial_entries`: REACT 지출(`kind='expense'`, `bu_code='REACT'`) 생성·수정·지급 처리·삭제
  - `app_users`: 가입 행 생성
  - 그 밖에 `portfolio_items`, `quotes`, `inquiries`, `contracts`, `agreements`, `partners`, `clients`, `company_documents`
- 매출·지출의 수정·삭제 목표 규칙(본인·사업부 리더·관리자만, `paid`·`canceled` 삭제 금지, 변경 기록)은 현재 reactstudio 관리 API에 적용되어 있지 않다. 이 경로에 어떻게 적용할지는 봉인 작업에서 정한다.
- `projects.status` 값 '완료'가 바뀌면 공개 히스토리 페이지가 비어 버린다.

## 2. 크론 호출 (Vercel → 이 앱)

| 경로 | 메서드 | 인증 | 성공 응답 | 실패 |
|---|---|---|---|---|
| `/api/attendance/auto-checkout` | GET(POST도 가능) | `CRON_SECRET`이 있으면 `Authorization: Bearer <값>` | `{ message, processed, ... }` | 401, 500 `{ error }` |
| `/api/leave/auto-generate-monthly` | GET·POST | 위와 같음 | 처리 건수 JSON | 401, 500 |
| `/api/leave/auto-generate-yearly` | GET·POST | 위와 같음 | 처리 건수 JSON | 401, 500 |
| `/api/notifications/due-soon?days=N` | GET | `CRON_SECRET`이 있으면 `?key=<값>` | 발송 건수 JSON | 401, 500 |
| `/api/notifications/overdue` | GET | 위와 같음 | 발송 건수 JSON | 401, 500 |

- 크론은 같은 날 두 번 불려도 안전해야 한다.
  - 자동 퇴근은 이미 퇴근 처리된 행을 다시 고르지 않는다.
  - 연차 자동 부여는 같은 날·같은 해 중복을 확인한다.
  - 알림 크론은 중복 확인이 없어서 두 번 부르면 알림이 두 번 간다.

## 3. 앱 내부 HTTP API 공통 규칙 (화면 ↔ 서버)

화면만 부르는 내부 API지만, 모바일 앱이 같은 웹을 쓰므로 응답 형태를 바꾸면 앱도 같이 바뀐다.

- 인증: 브라우저 쿠키의 Supabase 세션. 별도 토큰은 없다.
- 성공: 자원 JSON 그대로(목록은 배열, 단건은 객체, 삭제는 `{ success: true }`).
- 실패 본문: `{ "error": "<메시지>" }`

| 상태 코드 | 뜻 |
|---|---|
| 401 | 세션 없음 또는 `app_users` 행 없음 |
| 403 | 역할·사업부 권한 없음 |
| 404 | 대상 없음 |
| 400 | 입력 누락(일부 라우트) |
| 500 | DB 오류 등 그 밖의 모든 오류. 메시지에 DB 오류 문자열이 그대로 들어간다 |

- 재무·할일의 상태값은 DB enum 그대로 주고받는다.
  - 예외: 할일 화면은 `in-progress`·`on-hold`(하이픈)를 쓰고, 서버가 `in_progress`·`on_hold`로 바꿔 저장한다.

## 4. 외부 API (이 앱 → 외부)

| 대상 | 인증 | 쓰는 곳 | 실패 시 |
|---|---|---|---|
| Gowid | `GOWID_API_KEY` | `/api/gowid/*` — 카드·사용 내역·승인·용도·메모 | 오류 JSON을 화면에 그대로 전달 |
| Firebase FCM | 서비스 계정 3개 값 | `lib/push-sender.ts` | 무효 토큰은 `push_tokens`에서 정리 |
| Supabase Edge Function `send-push` | 서비스 권한 키 | Firebase 값이 없을 때 대체 발송 | 로그만 남김 |
| Google Gemini | `GEMINI_API_KEY` | `/api/ai/*` | 오류 메시지 반환 |
