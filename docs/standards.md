# 개발 규칙

아래 규칙은 어기면 빌드가 실패하거나, 운영 데이터가 망가지거나, 같은 DB를 쓰는 다른 시스템이 조용히 틀린 값을 내는 것들이다.

## 커밋·비밀값

- 저장소는 공개다. 비밀번호·API 키·서비스 권한 키·실제 계정 로그인 정보·개인정보가 들어간 파일을 커밋하면 안 된다. 코드, 테스트, 문서, SQL, 예시 데이터 모두 해당한다.
  - 위반 판정: `git grep -n -i -E "password|passwd|service_role|eyJhbGciOi|sk-"`를 돌려 실제 값이 나오면 위반이다.
  - 예외: 환경변수 이름, `.env.example` 형태의 가짜 값, 공개용 Firebase 웹 설정.
- `.env*`와 Firebase 네이티브 설정 파일은 커밋 금지다(`.gitignore` 유지).
- 커밋 메시지는 `feat:`, `fix(범위):`, `perf:` 같은 접두어를 붙이고 한국어로 쓴다. 버그리포트로 시작한 작업이면 번호(`#38`)를 적는다.

## 배포 게이트

- `main`에 push하면 Vercel이 바로 운영 배포한다. 따라서 `main`에 올리는 커밋은 곧 운영 반영이다.
- 대표나 담당자의 승인 없이 `main`에 push하지 않는다.
- 배포 전 `npm run build`가 통과해야 한다.
  - TypeScript 오류는 빌드를 실패시킨다.
  - ESLint는 빌드에서 무시되므로(`next.config.ts`의 `ignoreDuringBuilds: true`) 린트 통과가 배포 조건은 아니다.
- `npm test`(단위 테스트 `tests/unit/**` + 로컬 PGlite DB 테스트 `tests/db/**`)가 통과해야 한다. CI는 없으므로 머지 전에 직접 돌린다.
- 권한 판정(`src/lib/permissions.ts`), 공통 가드, 서버 라우트의 권한·입력 규칙을 바꾸면 그 규칙의 테스트를 같은 변경에 추가하거나 고친다.
- DB 정책·트리거 SQL을 바꾸면 `tests/db/**`가 그 SQL을 PGlite에 적용해 검사한다. 테스트가 통과하지 않은 SQL을 운영에 적용하지 않는다.
- `npm run test:api`는 미리보기 배포를 대상으로 하는 통합 테스트다. 권한이 걸린 라우트를 바꿨으면 운영 반영 전에 미리보기에서 돌린다.
- 바뀐 화면은 로컬이나 미리보기 배포에서 역할별 계정으로 실제로 조작해 확인한 뒤 올린다.

## 운영 DB 변경

- 운영 DB(`wqtoahrekijirxxpbfqg`)에 쓰는 모든 작업은 대표 승인을 받은 뒤 한다. 스키마 변경과 데이터 일괄 수정 모두 해당한다. 읽기(SELECT)는 자유다.
- 스키마는 **추가만** 한다. 기존 컬럼의 삭제·이름 변경·타입 변경을 하지 않는다. 기존 enum 값도 삭제·이름 변경하지 않는다.
  - 대상 enum: `bu_code`, `financial_status`, `financial_kind`, `project_status`, `task_status`, `entry_scope` 값, `erp_role`.
  - 이유: 사내 워커·flowmaker·reactstudio가 이 값을 문자열로 비교한다. 바뀌면 이 앱을 배포하지 않아도 그쪽 집계가 조용히 0이 된다.
- 운영에 적용한 마이그레이션은 같은 날짜 접두(`YYYYMMDD_설명.sql` 또는 `YYYYMMDDHHMMSS_설명.sql`) 파일로 `supabase/migrations/`에도 남긴다.
- 운영 적용은 한 트랜잭션 스크립트(`supabase/apply/`)로 하고, 되돌리기 스크립트를 같은 커밋에 둔다. 적용 스크립트 안의 SQL 본문은 원본 마이그레이션·보정 파일과 글자 그대로 같아야 한다(`tests/db`가 비교한다).
- `supabase/baseline/`의 기준선 스냅샷은 운영에서 실행하지 않고, 마이그레이션 이력에 등록하지 않는다. 이미 있는 객체와 충돌한다.
- 데이터 보정 SQL에 사람 id·이메일을 적지 않는다. 대상은 조건으로 고른다(공개 저장소).
- `react_*` 테이블은 reactstudio 소유다. 이 레포에서 만들거나 바꾸지 않는다.
- `projects`와 `portfolio_items`의 비로그인 읽기 정책은 reactstudio.kr 공개 페이지가 쓴다. 정책을 바꾸기 전에 reactstudio.kr `/portfolio`·`/history`가 계속 열리는지 확인한다.

## 사업부 목록

- 사업부 목록·표시명·짧은 라벨·색상은 `src/lib/business-units.ts`(`BU_CODES`, `BU_META`와 거기서 만든 맵·선택지) 한 곳에만 정의한다. 다른 파일에 사업부 배열·라벨 맵·`BuCode` 타입을 새로 만들지 않는다.
  - 위반 판정: `src/lib/business-units.ts` 밖에서 7개 코드 중 여럿을 나열한 배열이나 객체 리터럴이 나오면 위반이다.
  - 예외: 특정 사업부만 허용하는 업무 규칙(예: 전속 아티스트는 GRIGO·HEAD)은 목록이 아니므로 각자 자리에 둔다.
- enum에 사업부를 추가하면 `business-units.ts`의 `BU_CODES`와 `BU_META`에 같은 커밋에서 추가한다. `BU_META`는 모든 코드를 요구하므로 빠뜨리면 타입 검사가 실패한다.
- 새 enum 값을 추가할 때는 그 값을 보여 주는 라벨·색상·빈 상태 문구 맵을 같은 커밋에서 추가한다. 맵에 없는 값은 화면에서 깨지거나 빠진다.

## 서버 라우트

- 모든 `/api/*` 라우트의 첫 동작은 공통 재직 가드 `requireActiveStaff()`(`src/lib/auth-guard.ts`)다. 가드 실패 응답을 그대로 돌려주고, 통과한 `appUser`로 판정한다.
  - 위반 판정: 아래 예외가 아닌 `route.ts`의 각 핸들러가 DB·외부 API를 부르기 전에 `requireActiveStaff`(또는 그것을 감싼 가드)를 거치지 않으면 위반이다.
  - 감싼 가드: 법인카드 `gowid/*`는 `gowid/_lib/gowid-client.ts`의 `getAuthContext` → `requireAuth`가 공통 가드를 부른다. 가입 신청 라우트는 `users/signup-requests/_guard.ts`의 `requireHeadAdmin`이 공통 가드를 부른다.
  - 예외: 크론 라우트 5개(`rejectUnauthorizedCron`으로 `CRON_SECRET` Bearer 확인), 본인 상태 조회(`users/me/status`, `ownStatusOnly` 옵션), 가입(`auth/signup`), 로그아웃, 그리고 누구에게나 403을 먼저 돌려주는 아티스트·파트너 라우트(`artist/*`, `partner-settlements*`).
  - 로그인 없이 부를 수 있는 새 라우트는 만들지 않는다.
- 역할·사업부 판정은 `src/lib/permissions.ts`의 함수를 쓴다. 라우트나 화면 안에 역할 조건을 새로 짜지 않는다. 필요한 판정이 없으면 이 파일에 함수를 추가하고 단위 테스트를 붙인다.
- 새 권한 판정 함수는 `status==='active'`를 요구하는 `isActiveStaff`를 거친다. `status`가 없는 사용자 객체를 재직으로 보지 않는다.
- update에 요청 본문을 통째로 넘기지(`...body`) 않는다. 허용 컬럼 목록으로 걸러서 넘긴다. 허용 외 칸은 오류 없이 무시한다.
- 매출·지출 행을 만들거나 고치거나 지우는 모든 라우트(`financial-entries/*`, 법인카드 `project-link`, `ai/execute-command`, 프로젝트 삭제)는 같은 권한·전이·기한 판정 함수를 부른다. 한 경로만 다른 규칙을 쓰면 안 된다.
- `financial_entries`에 delete를 부르는 코드는 `status='planned'` 조건을 같이 건다. 법인카드 연결 변경은 지출 행을 지우지 않는다.
- `updated_by`와 변경 기록 테이블을 읽고 쓰는 코드는 `isAuditV2Enabled()`가 참일 때만 동작한다. 꺼진 상태에서 이 칸을 쓰면 봉인 SQL 적용 전 DB에서 오류가 난다.
- `app_users.role`·`bu_code`·`status`는 관리자 라우트(`/api/users/[id]`)와 가입 승인·거절 라우트로만 바꾼다.
- 목록·합계 조회는 `range`로 페이지를 돌아 1,000행에서 잘리지 않게 한다.
- 오류 응답은 `{ error: string }`이다.
- 크론 라우트는 `src/lib/cron-auth.ts`의 `rejectUnauthorizedCron`으로만 인증한다. 쿼리 키 인증과 "비밀값이 없으면 통과"를 다시 넣지 않는다.

## 화면·폴더 구조

- 기능은 `src/features/<기능>/` 아래 `components/`, `api.ts`(fetch 래퍼), `hooks.ts`(react-query), `types.ts`로 나눈다.
- 서버 호출은 `api.ts` → `/api/*`를 거친다. 브라우저 Supabase 클라이언트로 핵심 테이블(`projects`, `financial_entries`, `project_tasks`, `app_users`)을 직접 쓰는 코드를 새로 만들지 않는다.
- 메뉴는 `src/lib/permissions.ts`의 `getVisibleMenus`에 등록해야 사이드바에 나온다. 메뉴를 숨긴다고 권한이 막히는 것은 아니다. 서버 확인은 따로 해야 한다.
- 브라우저 Supabase 클라이언트로 `app_users`를 읽는 코드는 본인 행만 읽는다. 봉인 뒤 비재직 계정은 본인 행 말고는 0행을 받는다.
- 파일이 길어지면 나눈다. `app/page.tsx`(2,800줄)와 `UnifiedProjectModal.tsx`(2,000줄)에 기능을 더 얹지 않는다.

## 테스트

- 테스트 계정 정보(이메일·비밀번호·키)는 `ERP_TEST_*` 환경변수로만 받는다. 테스트 파일·설정 파일에 값을 쓰지 않는다.
- 운영 DB에 쓰는 테스트는 만들지 않는다. DB 규칙은 PGlite로 검사한다. 미리보기 통합 테스트가 운영 DB에 만드는 재무 행은 금액 0, "[E2E]" 접두 HEAD 프로젝트에만 붙이고 지우지 않는다.

## 날짜·시간

- 날짜 비교와 "오늘" 계산은 한국 시간(KST) 기준 헬퍼(`src/lib/timezone.ts`의 `getTodayKST` 등)를 쓴다. 서버의 `new Date()`를 그대로 날짜 문자열로 바꾸면 UTC 날짜가 된다.
- DB에 날짜(`date`)를 넣을 때는 `YYYY-MM-DD` 문자열로 명시한다.

## 모바일 앱

- Android/iOS 앱은 운영 URL을 불러온다. 웹을 배포하면 앱에도 바로 반영된다.
- 앱 재배포가 필요한 경우는 네이티브 설정(`capacitor.config.ts`, 권한, 플러그인, 아이콘)을 바꿨을 때뿐이다.
- `capacitor.config.ts`의 `server.url`을 로컬 주소로 바꾼 채 커밋하면 안 된다.
