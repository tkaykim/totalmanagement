# 보안 정책

## 지켜야 할 자산

| 자산 | 위치 | 새면 생기는 일 |
|---|---|---|
| 전사 매출·지출·거래처 | `financial_entries`, `partners`(452, 2026-09-24 기준), `clients`, `contracts` | 거래 단가·마진·거래처 연락처 외부 노출 |
| 직원 개인정보 | `app_users`(이메일·입사일·역할), 근태·휴가 기록 | 개인정보 유출 |
| 회사 서류 | Storage 버킷 `document-room`(사업자등록증·통장사본·소개서), `project-documents`, `comment-attachments` | 계좌·사업자 정보 악용 |
| 서비스 권한 키 | Vercel 환경변수 `SUPABASE_SERVICE_ROLE_KEY` | RLS를 무시하고 DB 전체를 읽고 쓸 수 있음 |
| 외부 API 키 | `GOWID_API_KEY`(법인카드), `FIREBASE_PRIVATE_KEY`, `GEMINI_API_KEY` | 카드 내역 조회, 푸시 사칭, 과금 |

## 공개 저장소

GitHub 저장소 `tkaykim/totalmanagement`는 **공개**이고, 대표 결정으로 공개를 유지한다.
따라서 커밋되는 모든 파일(코드·테스트·문서·예시 데이터·SQL·마이그레이션)은 누구나 읽을 수 있다고 보고 다룬다.

- 비밀번호, 실제 계정의 로그인 정보, API 키, 서비스 권한 키, 개인정보(이름+연락처, 주민번호, 계좌번호)를 커밋하면 안 된다.
- 예시·테스트에는 가짜 값이나 환경변수 이름만 쓴다.
- 한 번 커밋된 비밀은 파일에서 지워도 git 기록에 남는다. 그래서 커밋된 비밀은 **값 자체를 교체**해야 처리가 끝난다.
- `.env*`, `google-services.json`, `GoogleService-Info.plist`는 `.gitignore`로 막혀 있다. 이 규칙을 지우면 안 된다.

## 인증 흐름

1. 로그인 화면에서 Supabase Auth 이메일·비밀번호로 로그인한다. 세션은 쿠키에 저장된다.
   - 비밀번호가 틀리면 Supabase 오류를 화면에 보여 준다.
   - 비밀번호 재설정은 `/forgot-password` → 이메일 링크 → `/reset-password`로 한다.
2. 메인 화면이 `app_users`에서 본인 행을 읽는다.
   - `status=retired`면 화면에서 로그아웃시킨다. 서버와 DB는 이를 막지 않는다.
   - `bu_code`가 비어 있으면 `/login`으로 돌려보낸다. 가입 직후 계정은 사업부가 비어 있으므로, 화면만 놓고 보면 이것이 사실상의 승인 대기다.
   - `role=artist`면 `/artist`로 보낸다.
3. 서버 라우트는 쿠키 세션 클라이언트로 `auth.getUser()`를 확인한 뒤 `app_users`에서 역할·사업부를 읽는다.
   - 세션이 없으면 401을 돌려준다.
   - `app_users` 행이 없으면 대부분 401이다.
   - `status`(퇴사 여부)는 서버 라우트 대부분이 확인하지 않는다.
4. 가입(`/signup`):
   - **현재**: 누구나 이메일로 가입할 수 있다.
     - 브라우저가 `app_users`에 `role=member`, 사업부 없는 행을 직접 넣는다.
     - 메인 화면은 사업부가 없어서 막힌다.
     - 그러나 세션은 `authenticated`이므로, 서버 API와 PostgREST로 핵심 테이블 전체를 읽고 쓸 수 있다.
   - **목표(대표 확정)**: 가입은 받되, 관리자가 승인하기 전에는 어떤 데이터도 볼 수 없다.
5. 관리자는 `/api/users`로 계정을 직접 만들 수 있다. 관리자 확인이 있는 경로다.
6. Android/iOS 앱은 웹 세션을 그대로 쓴다. 앱만의 인증 단계는 없다.
7. 세션 만료
   - 토큰 갱신은 브라우저 Supabase 클라이언트의 자동 갱신에만 의존한다. 서버 쪽 세션 갱신 미들웨어는 없다.
   - 갱신에 실패해 세션이 없으면 메인 화면은 진입할 때 `/login`으로 보낸다.
   - 이미 열린 화면에서 부른 API는 401을 받는다. 화면은 이를 로그인 이동으로 바꾸지 않고 오류로 표시한다.
8. 잠금: 로그인 실패 횟수에 따른 계정 잠금 정책은 이 앱에 없다. Supabase Auth 기본 요청 제한만 적용된다.

## 권한 모델

역할은 `admin`, `leader`(사업부장), `manager`, `member`를 쓴다.
판정 함수는 `src/lib/permissions.ts`에 있지만, 모든 경로가 이 함수를 쓰지는 않는다.

### 매출·지출 (목표 규칙, 대표 확정 2026-09-24)

| 주체 | 보기 | 등록 | 수정·삭제 | `paid`→`planned` | `paid`·`canceled` 삭제 |
|---|---|---|---|---|---|
| admin | 전체 | 가능 | 전체 | 가능 | **불가** |
| 해당 사업부 leader | 전체 | 가능 | 자기 사업부 행 + 본인 등록 행 | 불가 | 불가 |
| manager·member | 전체 | 가능 | 본인 등록 행만 | 불가 | 불가 |
| 퇴사자·승인 대기 계정 | **불가** | 불가 | 불가 | 불가 | 불가 |
| 비로그인 | 불가 | 불가 | 불가 | 불가 | 불가 |

현재는 로그인한 사람이면 누구나(퇴사자 포함) 모든 행을 보고 고치고 지울 수 있다.
막히는 곳은 서버 라우트와 DB RLS 두 군데 모두 없다.

### 그 밖의 현재 권한 (코드로 강제되는 것)

| 대상 | 규칙 |
|---|---|
| 프로젝트 목록·수정·삭제 API | `permissions.ts` 판정(생성자·PM·같은 사업부 leader·admin). 수정은 허용 컬럼 목록만 받는다 |
| 할일 API | `permissions.ts` 판정. 담당자만인 경우 상태만 바꿀 수 있다. 판정을 통과하면 요청 본문 전체가 update에 들어간다 |
| 사용자 생성·수정 API | admin만 |
| 회의실·차량 자원 수정 | admin만. 요청 본문 전체가 update에 들어간다 |
| 근태 기록(RLS) | 본인, admin, 같은 사업부 manager·admin |
| 휴가 신청(RLS) | 본인 신청. 승인은 admin 전체, leader는 같은 사업부 |
| 법인카드 API | 자체 `requireAuth` 확인. admin·leader 전체, manager·member는 Gowid 사용자 매핑이 있을 때만 |
| 정산·리소스 현황 메뉴 | HEAD 사업부 admin·leader |
| AI 업무 지시 | 지정된 이메일 1개만 |

### DB(RLS) 현황

- RLS는 모든 public 테이블에 켜져 있다(2026-09-21 일괄 조치).
- 하지만 `projects`, `financial_entries`, `project_tasks`, `partners`, `contracts`, `app_users` 등 핵심 테이블의 정책은 "`authenticated`면 전부 허용"이다.
  - 로그인만 하면 브라우저에서 PostgREST로 직접 읽고 쓸 수 있다. 서버 라우트의 권한 판정을 우회한다.
  - `app_users`도 전부 허용이라 본인 `role`을 `admin`으로 바꿀 수 있다.
  - `app_users`는 비로그인(`anon`) INSERT를 역할 제한 없이 허용한다.
- 비로그인 읽기 허용은 reactstudio.kr을 위한 것으로, `portfolio_items` 전체, `projects` 중 '완료', `clients` 전체다.
- `react_*` 13개 테이블은 정책이 0개다. 서비스 권한 키로만 접근되고, reactstudio.kr이 그 방식으로 쓴다.
- 뷰 `attendance_logs_with_user`, `project_pnl_reports_with_profit`은 뷰 소유자 권한(SECURITY DEFINER)으로 실행돼 호출자의 RLS를 무시한다.

### 명시적으로 허용하지 않는 것

- 회사 밖 사람(아티스트·파트너·거래처)의 ERP 로그인. `artist`·`viewer` 역할, `/artist` 화면, 프로젝트의 아티스트·파트너 공개 설정은 쓰지 않으며 정리 대상이다.
- 퇴사자의 모든 읽기·쓰기.
- 승인 전 가입 계정의 모든 읽기·쓰기.
- 본인 역할·사업부·재직 상태의 자체 변경.
- 누구든 `paid`·`canceled` 매출·지출 행의 삭제.

## 서버 권한 키 사용 원칙

`createPureClient()`는 RLS를 무시한다.
그래서 이 클라이언트를 쓰는 라우트는 DB 쿼리 **전에** 반드시 세 가지를 확인해야 한다.
1. 세션 사용자
2. 재직 상태
3. 역할·사업부 권한

서버 라우트 140개 중 77개가 이 클라이언트를 쓴다(2026-09-24 기준).
로그인 확인조차 없는 라우트 파일은 `[id]` 경로를 포함해 24개다(2026-09-24 기준, 로그아웃·법인카드 제외). 자원 기준으로는 다음과 같다: `channels`, `channel-contents`, `clients`, `client-workers`, `external-workers`, `events`, `manuals`, `org-members`, `business-units`, `upload`, `storage/signed-url`, `projects/[id]/documents/[documentId]`, `projects/[id]/participants/[participantId]`, `comments/[id]/reads`, `unified-partners/categories`.
이 중 `storage/signed-url`은 경로만 알면 비로그인으로 `document-room` 파일의 서명 URL을 받을 수 있다.

법인카드(`gowid/*`) 라우트는 파일마다 로그인 확인 코드가 보이지 않는다. 대신 `gowid/_lib/gowid-client.ts`의 `requireAuth`·`canAccessCorporateCard`로 확인한다.

## 크론 경로

- 크론 라우트는 `CRON_SECRET`이 설정되어 있으면 비밀값을 확인한다.
  - 근태·휴가 크론: `Authorization: Bearer` 헤더
  - 알림 크론: `?key=` 쿼리
- 설정되어 있지 않으면 누구나 호출할 수 있다. 로컬 `.env.local`에는 이 값이 없다.
- 알림 크론을 쿼리 키로 막으면 `vercel.json`의 경로에 키가 없어서 Vercel 크론 자체가 401로 실패한다.

## 기록해야 하는 사건 (감사 대상)

| 사건 | 현재 기록 | 목표 |
|---|---|---|
| 매출·지출 등록 | `activity_logs` `financial_created` | 유지 |
| 매출·지출의 금액·상태·사업부 변경 | 없음 | 변경 전 값·변경 후 값·변경자·시각 기록 (대표 확정) |
| `paid` → `planned` 되돌리기 | 없음 | 관리자만 가능, 기록 필수 |
| 매출·지출 삭제 시도(`paid`·`canceled`) | 없음 | 거부 |
| 프로젝트 생성·상태 변경 | 기록함 | 유지 |
| 할일 상태·담당자 변경 | 기록함 | 유지 |
| 시스템 강제 퇴근 | 기록함 | 유지 |
| 사용자 역할·사업부·재직 상태 변경 | 없음 | 기록 권장(대표 미확정) |

## 비밀값 관리

- 모든 키는 Vercel 프로젝트 환경변수와 로컬 `.env.local`(커밋 금지)에만 둔다.
- `NEXT_PUBLIC_` 접두 변수는 브라우저로 나간다. 익명 키·Firebase 웹 설정·VAPID 공개키만 여기에 둔다. 서비스 권한 키·Gowid·Gemini·Firebase Admin 키는 절대 이 접두를 붙이지 않는다.
- `public/firebase-messaging-sw.js`에 들어 있는 Firebase 웹 API 키는 공개용 설정값이다. 비밀이 아니다.
- 키가 노출되면 발급처(Supabase·Gowid·Firebase·Google AI)에서 재발급하고 Vercel 환경변수를 바꾼 뒤 재배포한다.

## 민감 데이터 처리

- 급여·주민번호·계좌번호를 ERP 재무 행이나 메모에 넣지 않는다. 재직 직원 전원이 읽을 수 있는 자리다.
- 할일·메모·댓글에 비밀번호를 적지 않는다.
- 자료실(`document-room`)의 통장사본·사업자등록증은 서명 URL로만 내보낸다. 서명 URL은 로그인한 재직 직원에게만 발급해야 한다.
