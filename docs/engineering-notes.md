# 실무 노트

## 운영 DB와 코드가 서로 다른 시점에 있다

- **증상**
  - 운영 배포본(`main` `d504793`, 2026-06-09)은 사업부 `DEETZ`, `entry_scope`·`counterparty_bu_code`, 사업부 역할 칸 3개를 모른다. 운영 DB에는 이 칸이 모두 있다.
  - 반대로 레포의 봉인 SQL(`updated_by`, 변경 기록 테이블, 트리거, 새 RLS)은 운영 DB에 아직 없다.
- **원인**
  - 2026-08-10에 운영 DB에 마이그레이션을 직접 적용했고, 그 화면 코드는 한동안 브랜치에만 있었다.
  - 봉인은 코드 배포(승인 ①)와 DB 적용(승인 ②)을 나눠 반영하도록 설계되어 있다.
- **대응**
  - 스키마를 판단할 때는 운영 DB를 직접 조회한다. `supabase/baseline/20260924_prod_snapshot.sql`은 2026-09-24 시점 사본이고, `supabase/migrations/`의 옛 31개 파일로는 운영 스키마를 재구성할 수 없다.
  - 봉인 SQL이 만든 칸·테이블에 의존하는 서버 코드는 반드시 `isAuditV2Enabled()` 뒤에 둔다. 스위치 없이 `updated_by`를 쓰면 봉인 전 DB에서 PostgREST가 "칸 없음" 오류를 내고 저장이 실패한다.
  - 확인 방법: `ERP_AUDIT_V2`를 끈 채 매출·지출 수정 API를 봉인 전 DB에 불러 200이 나오는지 본다.

## 프로젝트 삭제는 딸린 매출·지출을 같이 지운다

- **증상**: 봉인 SQL이 적용되지 않은 DB에서 프로젝트를 지우면 그 프로젝트의 매출·지출 행이 흔적 없이 사라진다. 할일, 프로젝트 문서, 법인카드 연결, 손익 보고도 함께 사라진다.
- **원인**: 외래키가 `ON DELETE CASCADE`다. 대상은 `financial_entries`, `project_tasks`, `project_documents`, `gowid_expense_project_link`, `project_pnl_reports`다.
- **대응**
  - ERP 서버의 프로젝트 삭제는 매출·지출이 한 건이라도 있으면 삭제 호출 전에 409를 준다. 하지만 reactstudio.kr이나 SQL로 지우는 경로는 봉인 전까지 막히지 않는다.
  - 봉인 SQL의 `projects_guard_delete`는 BEFORE DELETE 트리거라 외래키 연쇄 삭제보다 먼저 돈다. 그래서 연쇄 삭제가 시작되기 전에 전체 삭제가 거부된다. 외래키를 AFTER 트리거나 앱 코드로 흉내 내면 이 순서가 깨진다.
  - 실수로 만든 빈 프로젝트가 아니면 삭제하지 말고 '보류'로 바꾼다.
  - 확인 방법: 테스트 프로젝트에 금액 0 `paid` 행을 하나 붙이고 삭제를 호출한 뒤, 409와 함께 그 행이 남는지 조회한다.

## 사람 행은 지우지 않는다

- **증상**: `app_users` 행을 지우면 그 사람의 근태·휴가 잔여·휴가 신청·활동 기록·댓글·업무일지가 함께 지워진다.
- **원인**: `ON DELETE CASCADE`가 걸려 있다.
- **대응**: 퇴사는 `status='retired'`로만 처리한다.

## 서버는 막아도 DB 직접 조회는 봉인 전까지 열려 있다

- **증상**: 퇴사자·승인 대기 계정은 서버 API에서 403을 받는다. 그래도 같은 세션으로 PostgREST에서 `financial_entries`를 직접 조회하면 봉인 전 DB에서는 데이터가 나온다.
- **원인**: 운영 DB의 핵심 테이블 RLS가 `authenticated` 전권이다. 서버 가드는 서비스 권한 키 경로만 막는다.
- **대응**
  - 권한 작업을 할 때는 서버 라우트와 RLS 둘 다에서 막힌 것을 확인한다. RLS 규칙은 `tests/db`로, 서버 규칙은 `tests/unit`·`tests/api`로 검사한다.
  - 확인 방법: 퇴사 처리한 테스트 계정으로 API를 직접 호출해 403이 나오는지, 봉인 DB에서 같은 세션의 PostgREST 조회가 0행인지 본다.
  - 봉인 뒤에도 `portfolio_items`·`clients`·`partners`·`contracts` 등 봉인 5개 밖 테이블은 `authenticated` 전권으로 남는다.

## 재직 판정이 두 가지다

- **증상**: 같은 사용자 객체로 `canViewFinanceEntry`는 거부하는데 `canEditProject`는 허용할 수 있다.
- **원인**: `permissions.ts`의 새 판정 함수(재무·변경 기록·사람 판정, `canView*`)는 `status==='active'`를 요구하고 `status`가 없으면 거부한다. 기존 이름의 프로젝트·할일·메뉴 판정은 `status`를 넘기지 않는 기존 화면 호출부 때문에 `status`가 **명시적으로** `active`가 아닐 때만 거부한다.
- **대응**
  - 서버에서는 `requireActiveStaff()`가 돌려준 `appUser`(항상 `status` 포함)를 판정 함수에 넘긴다. 직접 만든 `{ id, role, bu_code }` 객체를 넘기면 새 함수는 모두 거부한다.
  - 화면 어댑터(`src/lib/financePermissions.ts`)는 `status`가 없는 화면 사용자를 재직으로 보고 판정한다. 화면 판정은 보안 경계가 아니다.

## 변경 기록의 변경자는 `updated_by` 한 칸으로 전달된다

- **증상**: ERP 화면에서 고친 매출·지출인데 변경 기록에 변경자 없이 "외부"로 남는다.
- **원인**
  - 서버는 서비스 권한 키로 쓰므로 트리거가 로그인 사용자를 모른다. 서버가 `updated_by`에 사용자를 넣어야 트리거가 `erp`로 기록한다.
  - 트리거는 기록한 뒤 `updated_by`를 비운다. `NEW.updated_by`가 비었거나 `OLD.updated_by`와 같으면 `external`로 본다.
  - `ERP_AUDIT_V2`가 꺼져 있으면 서버가 `updated_by`를 쓰지 않는다.
- **대응**
  - 서버의 모든 매출·지출·직원 쓰기(법인카드 연결 이동·해제, 가입 승인·거절 포함)에 `isAuditV2Enabled()`일 때 `updated_by`를 넣는다. 한 경로라도 빠지면 그 경로의 변경은 "외부"로 남는다.
  - 봉인 SQL 적용부터 `ERP_AUDIT_V2=1` 재배포까지의 변경은 모두 "외부"로 남는다. 적용 직후 바로 켠다.

## 운영 적용 스크립트는 원본 SQL의 복사본이다

- **증상**: 봉인 마이그레이션만 고쳤는데 `npm test`의 DB 테스트가 실패한다.
- **원인**: `supabase/apply/20260925_seal_apply.sql`은 봉인 마이그레이션과 데이터 보정 SQL을 글자 그대로 품고 있고, 테스트가 두 본문이 같은지 비교한다. Windows 체크아웃은 줄바꿈이 CRLF로 바뀔 수 있어 테스트가 비교 전에 LF로 맞춘다.
- **대응**: 원본 SQL을 고치면 적용 스크립트 안의 해당 본문도 같은 커밋에서 고친다. 되돌리기 스크립트도 함께 확인한다.

## PGlite DB 테스트는 Supabase 흉내 객체에 기댄다

- **증상**: 기준선이나 봉인 SQL을 PGlite에 올릴 때 `auth.uid()`·역할 `authenticated` 없음 오류가 난다.
- **원인**: PGlite는 순수 Postgres라 Supabase가 만드는 `auth` 스키마 함수와 역할이 없다.
- **대응**: `scripts/schema/pglite-stubs.sql`이 `auth.users`, `auth.uid()`·`auth.jwt()`·`auth.role()`, 역할 `anon`·`authenticated`·`service_role`과 grant를 만든다. SQL이 새 Supabase 전용 객체를 쓰면 이 파일에 흉내를 추가한다. 흉내가 운영과 다르게 동작하면 테스트가 통과해도 운영에서 틀릴 수 있다.

## Gowid 라우트는 인증 검사가 파일 밖에 있다

- 대부분의 `gowid/*` 라우트 파일에는 `requireActiveStaff`가 보이지 않는다.
- 확인은 `gowid/_lib/gowid-client.ts`의 `getAuthContext` → `requireAuth`에서 한다. `getAuthContext`가 공통 재직 가드를 부른다.
  - 세션·`app_users` 행이 없으면 `requireAuth`가 `Unauthorized`를 던지고, 라우트의 catch가 401로 바꾼다.
  - 재직 직원이 아니면 `Forbidden`을 던지고 catch가 403으로 바꾼다. 새 gowid 라우트의 catch가 이 두 메시지를 모두 처리하지 않으면 500이 나간다.
- 그래서 "가드 없는 라우트"를 grep으로 찾을 때 gowid는 따로 본다.
- 리더용 필터 코드는 조건이 항상 참이라, 리더는 사실상 전체 카드 내역을 본다(리더 전사 보기 규칙과 결과는 같다).

## UTC와 KST

- **증상**
  - 자정~오전 9시 사이에 서버에서 "오늘"을 계산하면 전날이 된다.
  - DB `current_date`로 기한을 비교하면 한국 날짜보다 하루 늦게 연체로 잡힌다.
- **원인**: Vercel 서버와 Postgres는 UTC다.
- **대응**
  - `src/lib/timezone.ts`(브라우저)와 `timezone.server.ts`(서버)의 KST 헬퍼를 쓴다.
  - 크론 스케줄은 UTC로 적는다. 예: 23:59 KST = `59 14 * * *`.

## 버그리포트를 SQL로 닫으면 알림이 안 간다

- 신고자 알림(푸시·인앱)은 화면에서 `PATCH /api/bug-reports/[id]`로 `status='resolved'`를 보낼 때만 발송된다.
- 여러 건을 SQL로 한꺼번에 닫으면 알림이 가지 않는다. 대량 정리는 SQL로, 개별 통지가 필요한 건은 화면으로 처리한다.
- `bug_report_status`에 값을 추가하면 `BugReportsView`의 상태 목록·설정·빈 문구와 `types.ts`의 라벨·색상 맵을 같이 고친다.

## 푸시는 두 경로 중 하나로 나간다

- 서버에 `FIREBASE_PROJECT_ID`·`FIREBASE_CLIENT_EMAIL`·`FIREBASE_PRIVATE_KEY`가 있으면 Firebase Admin으로 직접 FCM 발송한다.
- 없으면 Supabase Edge Function `send-push`를 호출한다.
- 푸시가 안 올 때 확인 순서
  1. `notifications` 행이 생겼는지 본다.
  2. `push_tokens`에 그 사용자 토큰이 있는지 본다.
  3. 둘 중 어느 경로로 나갔는지 서버 로그의 `[Push]` 줄로 확인한다.
- iOS는 홈 화면에 추가한 PWA이거나 네이티브 앱이어야 웹 푸시를 받는다.

## 한 번의 조회는 최대 1,000행

- Supabase/PostgREST는 `range` 없이 `select`하면 1,000행에서 조용히 자른다.
- 2026-09-24 기준 재무 665행, 프로젝트 812행, 알림 14,216행이다. 이미 1,000행을 넘었거나 곧 넘는다. 집계 쿼리는 페이지를 돌거나 DB 쪽 집계를 쓴다.
- 매출·지출 라우트는 `financial-entries/_lib/finance-access.ts`의 `fetchAllRows`로 `range`를 돌며 끝까지 읽는다. 일반 직원의 보기 범위는 전 프로젝트를 페이지로 읽어 판정한 id 집합으로 거른다.
- `.in('id', [...])`에 id를 수백 개 넣으면 URL 길이를 넘어 실패한다. 조인이나 RPC로 바꾼다.

## 커밋된 오래된 설정 도구

- `.ruler/ruler.toml`이 남아 있다.
- `ruler apply`를 실행하면 `.ruler/` 안의 내용으로 루트 `AGENTS.md`·`CLAUDE.md`를 덮어쓴다. 실행하지 않는다.
- `.vooster/`, `components.json`의 EasyNext 흔적은 현재 동작과 관계없다.

## 로컬 개발

- 빌드가 곧 타입 검사다. 로컬에 `node_modules`가 없으면 `npm install` 뒤 `npx tsc --noEmit`으로 먼저 확인한다. 그래야 Vercel 빌드 실패를 피한다.
- 로컬도 운영 DB를 쓴다(`.env.local`이 운영 URL을 가리킨다). 로컬에서 화면으로 저장하면 운영 데이터가 바뀐다.
