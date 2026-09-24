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
- 자동 테스트와 CI는 없다. 바뀐 화면은 로컬이나 미리보기 배포에서 실제로 조작해 확인한 뒤 올린다.

## 운영 DB 변경

- 운영 DB(`wqtoahrekijirxxpbfqg`)에 쓰는 모든 작업은 대표 승인을 받은 뒤 한다. 스키마 변경과 데이터 일괄 수정 모두 해당한다. 읽기(SELECT)는 자유다.
- 스키마는 **추가만** 한다. 기존 컬럼의 삭제·이름 변경·타입 변경을 하지 않는다. 기존 enum 값도 삭제·이름 변경하지 않는다.
  - 대상 enum: `bu_code`, `financial_status`, `financial_kind`, `project_status`, `task_status`, `entry_scope` 값, `erp_role`.
  - 이유: 사내 워커·flowmaker·reactstudio가 이 값을 문자열로 비교한다. 바뀌면 이 앱을 배포하지 않아도 그쪽 집계가 조용히 0이 된다.
- 운영에 적용한 마이그레이션은 같은 날짜 접두(`YYYYMMDD_설명.sql`) 파일로 `supabase/migrations/`에도 남긴다.
- `react_*` 테이블은 reactstudio 소유다. 이 레포에서 만들거나 바꾸지 않는다.
- `projects`와 `portfolio_items`의 비로그인 읽기 정책은 reactstudio.kr 공개 페이지가 쓴다. 정책을 바꾸기 전에 reactstudio.kr `/portfolio`·`/history`가 계속 열리는지 확인한다.

## 사업부 목록

- 사업부 목록을 코드에 새로 하드코딩하지 않는다. 한 곳에서 정의한 목록을 쓴다.
- enum에 사업부가 추가되면, 기존에 하드코딩된 목록(`BuCode` 타입, `BU_CODES` 배열, 탭·필터·라벨 맵 등 30여 곳)을 같은 커밋에서 전부 맞춘다.
- 새 enum 값을 추가할 때는 그 값을 보여 주는 라벨·색상·빈 상태 문구 맵을 같은 커밋에서 추가한다. 맵에 없는 값은 화면에서 깨지거나 빠진다.

## 서버 라우트

아래 규칙은 새로 만들거나 수정하는 라우트에 적용한다. 기존 라우트 중 세션 확인이 없는 약 24개와 요청 본문을 통째로 update에 넘기는 PATCH 4개(`financial-entries/[id]`, `tasks/[id]`, `meeting-rooms/[id]`, `vehicles/[id]`)는 알려진 결함이며, 손대는 김에 이 규칙에 맞춘다.

- 모든 `/api/*` 라우트는 비즈니스 로직 전에 세션 사용자를 확인한다.
  - 크론 라우트만 예외다. 크론 라우트는 `CRON_SECRET`으로 막는다.
  - 로그인 없이 부를 수 있는 새 라우트는 만들지 않는다.
- `createPureClient()`(서비스 권한 키)를 쓰는 라우트는 쿼리 전에 역할·사업부·재직 상태를 확인해야 한다. 판정은 `src/lib/permissions.ts`의 함수를 쓴다. 라우트 안에 역할 조건을 새로 짜지 않는다.
- update에 요청 본문을 통째로 넘기지(`...body`) 않는다. 허용 컬럼 목록으로 걸러서 넘긴다. 프로젝트 수정 라우트(`projects/[id]`)가 기준 구현이다.
- `app_users.role`·`bu_code`·`status`는 관리자 라우트(`/api/users/[id]`)로만 바꾼다.
- 응답 오류는 `{ error: string }`에 401(로그인 없음)·403(권한 없음)·404(대상 없음)·500(그 외)을 쓴다.

## 화면·폴더 구조

- 기능은 `src/features/<기능>/` 아래 `components/`, `api.ts`(fetch 래퍼), `hooks.ts`(react-query), `types.ts`로 나눈다.
- 서버 호출은 `api.ts` → `/api/*`를 거친다. 브라우저 Supabase 클라이언트로 핵심 테이블(`projects`, `financial_entries`, `project_tasks`, `app_users`)을 직접 쓰는 코드를 새로 만들지 않는다.
- 메뉴는 `src/lib/permissions.ts`의 `getVisibleMenus`에 등록해야 사이드바에 나온다. 메뉴를 숨긴다고 권한이 막히는 것은 아니다. 서버 확인은 따로 해야 한다.
- 파일이 길어지면 나눈다. `app/page.tsx`(2,800줄)와 `UnifiedProjectModal.tsx`(2,000줄)에 기능을 더 얹지 않는다.

## 날짜·시간

- 날짜 비교와 "오늘" 계산은 한국 시간(KST) 기준 헬퍼(`src/lib/timezone.ts`의 `getTodayKST` 등)를 쓴다. 서버의 `new Date()`를 그대로 날짜 문자열로 바꾸면 UTC 날짜가 된다.
- DB에 날짜(`date`)를 넣을 때는 `YYYY-MM-DD` 문자열로 명시한다.

## 모바일 앱

- Android/iOS 앱은 운영 URL을 불러온다. 웹을 배포하면 앱에도 바로 반영된다.
- 앱 재배포가 필요한 경우는 네이티브 설정(`capacitor.config.ts`, 권한, 플러그인, 아이콘)을 바꿨을 때뿐이다.
- `capacitor.config.ts`의 `server.url`을 로컬 주소로 바꾼 채 커밋하면 안 된다.
