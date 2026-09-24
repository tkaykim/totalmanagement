# 실무 노트

## 운영 DB와 코드가 서로 다른 시점에 있다

- **증상**
  - 운영 DB에는 사업부 `DEETZ`, `financial_entries.entry_scope`·`counterparty_bu_code`, `projects.brand_bu_code`·`delivery_bu_code`·`artist_management_bu_code`가 있다.
  - 그런데 코드 어디에도 이 칸을 쓰는 곳이 없다.
  - 운영 배포본은 `main`의 `d504793`(2026-06-09)이다.
- **원인**
  - 2026-08-10에 운영 DB에 마이그레이션을 직접 적용했다.
  - 그 화면 코드는 로컬 브랜치 `wip/deetz-crossbu-accounting-ui-20260924`(push 안 됨, 검증 안 됨)에만 있다.
- **대응**
  - 스키마를 판단할 때는 레포 SQL이 아니라 운영 DB를 직접 조회한다.
  - 레포 `supabase/migrations/`는 31개뿐이고 운영 적용 이력은 약 130개다. 레포 파일로 운영 스키마를 재구성하면 틀린다.
  - `src/types/database.ts`도 운영 스키마보다 뒤처져 있다.

## 프로젝트 삭제는 딸린 매출·지출을 같이 지운다

- **증상**: 프로젝트를 지우면 그 프로젝트의 매출·지출 행이 흔적 없이 사라진다. 할일, 프로젝트 문서, 법인카드 연결, 손익 보고도 함께 사라진다.
- **원인**: 외래키가 `ON DELETE CASCADE`다. 대상은 `financial_entries`, `project_tasks`, `project_documents`, `gowid_expense_project_link`, `project_pnl_reports`다.
- **대응**
  - 실수로 만든 빈 프로젝트가 아니면 삭제하지 말고 '보류'로 바꾼다.
  - `paid`·`canceled` 매출·지출은 삭제 금지(대표 확정)다. 프로젝트 삭제가 이 행들을 함께 지운다는 점을 삭제 기능 작업 때 반드시 고려한다.
  - 확인 방법: 테스트 프로젝트에 `paid` 행을 하나 붙이고 삭제를 호출한 뒤, 그 행이 남는지 조회한다.

## 사람 행은 지우지 않는다

- **증상**: `app_users` 행을 지우면 그 사람의 근태·휴가 잔여·휴가 신청·활동 기록·댓글·업무일지가 함께 지워진다.
- **원인**: `ON DELETE CASCADE`가 걸려 있다.
- **대응**: 퇴사는 `status='retired'`로만 처리한다.

## 화면은 막아도 데이터는 열려 있다

- **증상**: 퇴사자나 사업부 없는 가입자는 메인 화면에서 쫓겨난다. 그래도 같은 세션으로 `/api/financial-entries`를 부르거나 PostgREST로 `financial_entries`를 직접 조회하면 데이터가 나온다.
- **원인**: 퇴사·사업부 확인은 `app/page.tsx`의 클라이언트 코드에만 있다. RLS 정책은 `authenticated`면 전부 허용한다.
- **대응**
  - 권한 작업을 할 때는 화면 조건이 아니라 서버 라우트와 RLS 둘 다에서 막힌 것을 확인한다.
  - 확인 방법: 퇴사 처리한 테스트 계정으로 API를 직접 호출해 401·403이 나오는지 본다.

## Gowid 라우트는 인증 검사가 파일 밖에 있다

- `gowid/*` 라우트 파일에는 `auth.getUser`가 보이지 않는다.
- 로그인 확인은 `gowid/_lib/gowid-client.ts`의 `getAuthContext` → `requireAuth`에서 한다.
- `requireAuth`는 로그인이 안 되어 있으면 예외를 던지고, 라우트의 catch가 401로 바꾼다.
- 그래서 "인증 없는 라우트"를 grep으로 찾을 때 gowid는 빼고 센다.
- 리더용 필터 코드는 조건이 항상 참이라, 리더는 사실상 전체 카드 내역을 본다.

## 할일 수정에서 사업부가 옛 프로젝트 기준으로 들어간다

- **증상**: 할일을 다른 사업부 프로젝트로 옮겨도 할일의 `bu_code`가 원래 프로젝트 값으로 남는다.
- **원인**: `PATCH /api/tasks/[id]`는 수정 전 할일이 속한 프로젝트를 읽는다. 요청에 `project_id`나 `bu_code`가 있으면 그 옛 프로젝트의 `bu_code`로 덮어쓴다.
- **대응**
  - 프로젝트 이동을 고칠 때는 새 `project_id`의 프로젝트를 읽어 `bu_code`를 맞춘다.
  - 확인 방법: 이동 후 `project_tasks.bu_code`가 새 프로젝트의 `bu_code`와 같은지 조회한다.

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
- `.in('id', [...])`에 id를 수백 개 넣으면 URL 길이를 넘어 실패한다. 조인이나 RPC로 바꾼다.

## 커밋된 오래된 설정 도구

- `.ruler/ruler.toml`이 남아 있다.
- `ruler apply`를 실행하면 `.ruler/` 안의 내용으로 루트 `AGENTS.md`·`CLAUDE.md`를 덮어쓴다. 실행하지 않는다.
- `.vooster/`, `components.json`의 EasyNext 흔적은 현재 동작과 관계없다.

## 로컬 개발

- 빌드가 곧 타입 검사다. 로컬에 `node_modules`가 없으면 `npm install` 뒤 `npx tsc --noEmit`으로 먼저 확인한다. 그래야 Vercel 빌드 실패를 피한다.
- 로컬도 운영 DB를 쓴다(`.env.local`이 운영 URL을 가리킨다). 로컬에서 화면으로 저장하면 운영 데이터가 바뀐다.
