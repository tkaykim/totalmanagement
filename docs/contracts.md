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
- 관리자 화면(reactstudio.kr `/admin`)은 ERP 핵심 테이블을 읽고 쓴다. 이 앱의 서버 라우트를 거치지 않는다.
  - `projects`: 수정·삭제
  - `project_tasks`: 생성·수정·삭제
  - `financial_entries`: REACT 지출(`kind='expense'`, `bu_code='REACT'`) 생성·수정·지급 처리·삭제, 재무 조회
  - `app_users`: 가입 행 생성, 가입 승인·거절
  - 그 밖에 `portfolio_items`, `quotes`, `inquiries`, `contracts`, `agreements`, `partners`, `clients`, `company_documents`
  - 이 중 `clients`·`portfolio_items`·`inquiries`·`partners`(명단)·`agreements`·`quotes` 일부는 로그인 세션(익명 키 + 쿠키)으로 직접 읽고 쓴다. 봉인 SQL 7절 뒤에도 재직 직원(`status='active'` + 사업부 있음)은 그대로 쓸 수 있다. reactstudio.kr 관리자 조건(REACT·HEAD 재직 admin·leader·manager)은 이를 만족한다. 재직 직원이 아닌 계정은 이 세션 경로에서 0건·쓰기 거부가 된다.
  - 공개 페이지(`clients`·`portfolio_items`)도 쿠키 세션 클라이언트로 읽는다. 비로그인은 전과 같고, 재직 직원이 아닌 계정으로 로그인한 채 보면 목록이 빈다.
- 지금 운영 중인 reactstudio.kr 관리 화면 일부는 로그인 세션(익명 키 + 쿠키)으로 `projects`·`project_tasks`·`financial_entries`를 직접 읽고 쓴다.
  - 봉인 SQL을 적용하면 세션의 쓰기 정책이 없어져 이 경로가 멈춘다.
  - 그 저장소의 봉인 대비 커밋(`0465a9e`)이 이 경로를 서비스 권한 키 서버 라우트로 옮겼다(2026-09-25 운영 배포, 봉인 SQL보다 먼저 배포됨).
  - 옮긴 뒤 권한: 재직 중이고 사업부가 있는 직원만 쓴다. 프로젝트·할일은 admin·REACT 리더·생성자·PM·참여자. 재무 조회는 admin·REACT 리더가 REACT 전체, 그 외는 접근 가능한 프로젝트의 행과 본인 등록 행. 재무 기록이 있는 프로젝트 삭제는 409로 거부한다.
- 봉인 SQL 적용 뒤 이 쓰기에 걸리는 DB 규칙
  - `paid`·`canceled` 매출·지출 삭제는 DB 오류로 거부된다. 잘못 확정한 건은 `canceled`로 바꿔야 한다.
  - 매출·지출이 붙은 프로젝트 삭제는 DB 오류로 거부된다.
  - 매출·지출의 금액·상태·사업부 변경과 새 행은 `financial_entry_changes`에 출처 `external`, 변경자 없음으로 기록된다. `app_users`의 역할·사업부·상태 변경(승인·거절)은 `app_user_changes`에 같은 방식으로 기록된다.
  - `updated_by` 칸은 ERP 서버 전용이다. 다른 시스템이 이 칸을 채우면 그 값이 변경자로 기록된다.
  - 기한·입금일 필수 입력과 관리자 전용 되돌리기·되살리기는 DB가 강제하지 않는다. 이 시스템 쓰기에는 걸리지 않는다.
- 가입·승인 규칙은 ERP와 같아야 한다(아래 5절). 같은 커밋이 사업부 7개·역할 4개·본사 관리자만 승인으로 맞췄다(2026-09-25 운영 배포).
- `projects.status` 값 '완료'가 바뀌면 공개 히스토리 페이지가 비어 버린다.

### 이 앱이 추가한 DB 객체 (봉인 SQL, 2026-09-25 운영 적용)

| 객체 | 모양 | 다른 시스템이 알아야 할 것 |
|---|---|---|
| `financial_entries.updated_by`, `app_users.updated_by` | uuid, 비워도 됨 | ERP 서버만 쓴다. 트리거가 기록 뒤 항상 비운다 |
| `financial_entry_changes` | `entry_id`, `action`(`insert`/`update`), `field`(insert는 `*`), `old_value`·`new_value`(text), `changed_by`, `source`(`erp`/`external`), `changed_at` | 트리거만 쓴다. `authenticated`·`anon`은 쓰기·삭제 불가 |
| `app_user_changes` | `user_id`, `action`(`update`), 나머지는 위와 같음 | 같음. 읽기는 관리자만 |

## 2. 크론 호출 (Vercel → 이 앱)

| 경로 | 메서드 | 인증 | 성공 응답 | 실패 |
|---|---|---|---|---|
| `/api/attendance/auto-checkout` | GET(POST도 가능) | `Authorization: Bearer <CRON_SECRET>` | `{ message, processed, ... }` | 401 `{ error }`, 500 `{ error }` |
| `/api/leave/auto-generate-monthly` | GET·POST | 위와 같음 | 처리 건수 JSON | 401, 500 |
| `/api/leave/auto-generate-yearly` | GET·POST | 위와 같음 | 처리 건수 JSON | 401, 500 |
| `/api/notifications/due-soon?days=N` | GET | 위와 같음 | 발송 건수 JSON | 401, 500 |
| `/api/notifications/overdue` | GET | 위와 같음 | 발송 건수 JSON | 401, 500 |

- 인증은 Bearer 헤더 하나뿐이다. `?key=` 쿼리는 받지 않는다.
- `CRON_SECRET`이 설정되지 않은 환경에서는 모든 크론 호출이 401이다.
- Vercel 크론은 `CRON_SECRET`이 설정되어 있으면 이 헤더를 자동으로 붙인다. 수동 호출도 같은 헤더를 붙여야 한다.
- 크론은 같은 날 두 번 불려도 안전해야 한다.
  - 자동 퇴근은 이미 퇴근 처리된 행을 다시 고르지 않는다.
  - 연차 자동 부여는 같은 날·같은 해 중복을 확인한다.
  - 알림 크론은 중복 확인이 없어서 두 번 부르면 알림이 두 번 간다.

## 3. 앱 내부 HTTP API 공통 규칙 (화면 ↔ 서버)

화면만 부르는 내부 API지만, 모바일 앱이 같은 웹을 쓰므로 응답 형태를 바꾸면 앱도 같이 바뀐다.

- 인증: 브라우저 쿠키의 Supabase 세션. 별도 토큰은 없다.
- 성공: 자원 JSON 그대로(목록은 배열, 단건은 객체, 삭제는 `{ success: true }`). 아래 4·5절의 라우트는 예외로 적힌 모양을 쓴다.
- 실패 본문: `{ "error": "<메시지>" }`

| 상태 코드 | 뜻 |
|---|---|
| 401 | 세션 없음 또는 `app_users` 행 없음 |
| 403 | 재직 직원이 아님(승인 대기·거절·퇴사·휴면·사업부 없음·외부인 역할), 또는 역할·사업부 권한 없음. 아티스트·파트너 기능은 누구에게나 403 |
| 404 | 대상 없음, 또는 볼 권한이 없는 대상(존재 여부를 숨긴다) |
| 400 | 입력 오류: 필수 칸 누락, 잘못된 사업부·상태·구분 값, 기한·입금일 누락, 내부배부 상대 사업부 오류 |
| 409 | 규칙상 거부: `paid`·`canceled` 매출·지출 삭제, 매출·지출이 붙은 프로젝트 삭제("보류로 바꾸세요" 안내), 이미 있는 가입 이메일 |
| 500 | DB 오류 등 그 밖의 모든 오류. 일부 라우트는 메시지에 DB 오류 문자열이 그대로 들어간다 |

- 수정 라우트는 허용된 칸만 받는다. 허용 외 칸(`created_by`, `id`, `created_at`, `updated_by` 등)은 오류 없이 무시된다.
- `GET /api/auth/me`도 재직 가드를 거친다. 승인 대기·거절·퇴사 계정은 403을 받는다.
- 재무·할일의 상태값은 DB enum 그대로 주고받는다.
  - 예외: 할일 화면은 `in-progress`·`on-hold`(하이픈)를 쓰고, 서버가 `in_progress`·`on_hold`로 바꿔 저장한다.
- 매출·지출 날짜: `due_date`·`paid_at`은 `YYYY-MM-DD`로 보낸다. `paid_at`에 저장된 timestamptz 값을 그대로 돌려보내도 한국 날짜로 바꿔 받는다.

## 4. 계정 상태·변경 기록 API

| 라우트 | 입력 | 성공 | 실패 |
|---|---|---|---|
| `GET /api/users/me/status` | 쿠키 세션 | 200 `{ status, name }`. 재직 여부와 무관하게 본인 것만 | 401(세션·`app_users` 행 없음) |
| `GET /api/financial-entries/[id]/changes` | 쿠키 세션 | 200 `{ changes: [...], enabled: true }`, 최신순. 각 항목 `{ id, action, field, old_value, new_value, changed_by, changed_by_name, source, changed_at }` | 401, 403(비재직, 또는 관리자·행 사업부 리더·등록자 아님), 404(없거나 볼 수 없는 행) |
| `GET /api/users/[id]/changes` | 쿠키 세션 | 위와 같은 모양 | 401, 403(비재직·관리자 아님), 404(없는 직원) |

- 서버 환경변수 `ERP_AUDIT_V2`가 `1`이 아니면 두 변경 기록 라우트는 권한 확인 전에 200 `{ changes: [], enabled: false }`를 돌려준다(재직 가드는 먼저 거친다). 화면은 `enabled: false`면 기록 영역을 숨긴다.

## 5. 가입·승인 API (reactstudio.kr과 같은 계약)

ERP와 reactstudio.kr 두 곳이 같은 `app_users` 칸과 같은 규칙으로 가입을 받고 승인한다.
한쪽 계약을 바꾸면 다른 쪽도 같이 바꾼다.

| ERP 라우트 | reactstudio.kr 라우트 | 입력 | 성공 |
|---|---|---|---|
| `POST /api/auth/signup`(로그인 없음) | `POST /api/admin/signup` | `{ name, email, password, requested_bu_code, signup_message? }` | 200 `{ ok: true }` |
| `GET /api/users/signup-requests` | `GET /api/admin/signup-requests` | 없음 | 200 `{ requests: [...] }`. `pending`·`rejected`, 신청 시각 최신순 |
| `POST /api/users/signup-requests/[id]/approve` | `POST /api/admin/signup-requests/[id]/approve` | `{ bu_code, role }` | 200 `{ user }` |
| `POST /api/users/signup-requests/[id]/reject` | `POST /api/admin/signup-requests/[id]/reject` | 없음 | 200 `{ user }` |

- 가입 오류
  - 이름·이메일·비밀번호 누락 400, 비밀번호 8자 미만 400, `requested_bu_code`가 7개 사업부가 아니면 400
  - 이미 있는 이메일 409. 대기 중이면 "이미 신청된 이메일", 아니면 "이미 가입된 이메일"
  - 성공하면 `app_users`에 `status='pending'`, `role='member'`, `bu_code` 비움, `requested_bu_code`·`signup_message`·`signup_requested_at`이 채워진 행이 생긴다. 인증 계정은 이메일 확인 완료 상태다.
- 승인·거절 오류: 로그인 없음 401, 본사 관리자(HEAD 소속 재직 관리자) 아님 403, 사업부·역할 값 오류 400, `pending`이 아니거나 없는 신청 404
- `bu_code`는 7개 사업부 중 하나, `role`은 `admin`·`leader`·`manager`·`member` 중 하나다. `viewer`·`artist`는 400이다.
- 승인하면 `status='active'`, `bu_code`, `role`, `approved_by`, `approved_at`이 채워진다. 거절하면 `status='rejected'`, `approved_by`, `approved_at`이 채워진다.
- 오류 본문은 모두 `{ error }`다.

## 6. 외부 API (이 앱 → 외부)

| 대상 | 인증 | 쓰는 곳 | 실패 시 |
|---|---|---|---|
| Gowid | `GOWID_API_KEY` | `/api/gowid/*` — 카드·사용 내역·승인·용도·메모 | 오류 JSON을 화면에 그대로 전달 |
| Firebase FCM | 서비스 계정 3개 값 | `lib/push-sender.ts` | 무효 토큰은 `push_tokens`에서 정리 |
| Supabase Edge Function `send-push` | 서비스 권한 키 | Firebase 값이 없을 때 대체 발송 | 로그만 남김 |
| Google Gemini | `GEMINI_API_KEY` | `/api/ai/*` | 오류 메시지 반환 |
