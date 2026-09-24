# src/lib — 공용 서버·클라이언트 유틸

## 맡는 것
- `supabase/server.ts`
  - `createClient()`: 쿠키 세션·익명 키. RLS를 받는다. 사용자 확인용.
  - `createPureClient()`: 서비스 권한 키, 쿠키 없음. RLS를 무시한다.
- `supabase/client.ts`: 브라우저 클라이언트(익명 키 + 세션).
- `permissions.ts`: 역할·사업부·재직 판정 함수와 사이드바 메뉴(`getVisibleMenus`). 보기 범위, 매출·지출 등록·수정·삭제·상태 전이·사업부 이동, 거래 범위·기한·입금일 검증, 변경 기록 보기, 사용자 역할 변경, 외부인 기능 차단까지 모든 권한 규칙이 여기 있다.
- `auth-guard.ts`: 서버 라우트 공통 재직 가드 `requireActiveStaff()`와 `isGuardFailure()`. 세션 → `app_users`(서비스 권한 키) → 재직 확인.
- `business-units.ts`: 사업부 7개(`BU_CODES`)와 표시명·짧은 라벨·영문 라벨·색상(`BU_META`), 거기서 만든 맵·선택지, `isBuCode`. 사업부 목록의 유일한 정의다.
- `feature-flags.ts`: `isAuditV2Enabled()` — 서버 환경변수 `ERP_AUDIT_V2`가 정확히 `'1'`일 때만 참.
- `cron-auth.ts`: 크론 인증 `rejectUnauthorizedCron(request)` — `Authorization: Bearer <CRON_SECRET>`만 받는다.
- `financePermissions.ts`: 화면 타입을 `permissions.ts` 판정 타입으로 바꾸는 재무 화면용 어댑터. 규칙은 없다.
- `notification-sender.ts`: `notifications` 행 생성 + 푸시 호출. 할일 배정·마감 임박·기한 초과·자동 퇴근·버그 처리 등 알림 문구를 만든다.
- `push-sender.ts`: FCM 발송. Firebase Admin 환경변수가 없으면 Supabase Edge Function `send-push`로 대신 보낸다. 무효 토큰은 `push_tokens`에서 정리한다.
- `firebase-admin.ts`, `firebase-web.ts`, `web-push.ts`: Firebase 초기화와 웹 푸시 토큰 발급.
- `activity-logger.ts`: `activity_logs` 기록 헬퍼.
- `timezone.ts`, `timezone.server.ts`: KST 날짜·시각 헬퍼.
- `ai/gemini.ts`: Gemini 호출과 AI 기능 사용자 제한(지정 이메일 1개).
- `capacitor/*`: 네이티브 앱에서 위치·카메라·푸시 플러그인 호출.

## 맡지 않는 것
- 화면 컴포넌트, 기능별 fetch 래퍼(`src/features/*`).
- 라우트별 입력 검증과 DB 조회(`src/app/api/*`). 이 폴더의 판정 함수는 DB를 읽지 않는 순수 함수다(`auth-guard.ts` 제외).

## 지켜야 할 것
- **서버 전용 모듈**
  - `supabase/server.ts`는 `server-only`를 import한다. 브라우저 코드에서 import하면 빌드가 실패한다. 이 가드를 지우지 않는다.
  - 서비스 권한 키를 쓰는 모듈(`push-sender`, `notification-sender`, `activity-logger`, `firebase-admin`)도 서버 코드에서만 부른다.
- **`createPureClient()` 사용 조건**: 이 클라이언트를 받은 코드는 RLS가 없다고 보고 권한을 직접 확인해야 한다. 사용자 요청을 처리하는 곳에서 세션 확인 없이 이 클라이언트를 쓰지 않는다.
- **`permissions.ts`가 권한 규칙의 한 곳 정의다.** 라우트·화면에 역할 조건을 따로 쓰지 말고 여기에 함수를 추가하고 단위 테스트를 붙인다.
  - 매출·지출 권한은 **행**의 `bu_code`로 판정한다. 프로젝트 사업부로 바꾸면 교차 사업부 행의 책임이 뒤집힌다.
  - 관리자와 모든 리더는 전사를 본다(`canViewProject`, `canViewFinanceEntry`, `canViewTask`). 리더의 쓰기는 자기 사업부만이다.
  - `canAccessProject`·`canAccessTask`는 일반 직원 기준의 옛 판정이다. 리더 전사 보기가 필요한 곳에서는 `canView*`를 쓴다.
  - 되돌리기(`paid`→`planned`)·되살리기(`canceled`→`planned`·`paid`)는 `canTransitionFinance`에서 관리자만 통과한다.
  - `validateFinanceDates`는 `planned` 행의 `due_date`, `paid` 전환의 `paid_at`을 요구하고, `paid_at`을 한국 자정 timestamptz로 바꿔 돌려준다. 이미 `paid`·`canceled`인 옛 행에는 기한을 요구하지 않는다.
  - `canAccessExternalFeature()`는 항상 거짓이다. 아티스트·파트너 기능을 다시 열지 않는다.
- **재직 판정 두 가지**
  - 새 판정 함수(재무·변경 기록·사용자 판정, `canView*`)는 `isActiveStaff`를 거친다: `status==='active'` + 사업부 7개 중 하나 + `STAFF_ROLES`. `status`가 없으면 거부한다.
  - 기존 이름의 프로젝트·할일·메뉴 판정은 `status`를 넘기지 않는 기존 화면 호출부 때문에 `status`가 **명시적으로** `active`가 아닐 때만 거부한다(`isExplicitlyBlocked`).
  - 서버는 `requireActiveStaff()`가 준 `appUser`를 넘기므로 두 판정이 같은 결과를 낸다. 화면에서 직접 만든 사용자 객체는 새 판정에서 거부될 수 있다.
- **`auth-guard.ts`**
  - `server-only`를 import한다. 화면 코드에서 부르지 않는다.
  - `ownStatusOnly` 옵션은 본인 계정 상태 조회 라우트 전용이다. 다른 라우트에 쓰면 승인 대기·퇴사 계정이 데이터를 받는다.
  - `app_users` 조회 실패는 500이다. 401(없음)과 섞지 않는다.
- **`business-units.ts`**
  - 다른 파일에 사업부 배열·라벨 맵·`BuCode` 타입을 새로 만들지 않는다. `permissions.ts`의 `BuCode`도 여기서 가져온다.
  - 코드를 추가하면 `BU_CODES`와 `BU_META`를 함께 고친다. `BU_META`가 `Record<BuCode, ...>`라 빠뜨리면 타입 검사가 실패한다.
  - 특정 사업부만 허용하는 규칙(예: 전속 아티스트 GRIGO·HEAD)은 목록이 아니므로 이 파일에 넣지 않는다.
- **`feature-flags.ts`**: `ERP_AUDIT_V2`는 서버 전용이다. `NEXT_PUBLIC_`을 붙이지 않는다. 화면은 API 응답의 `enabled`로 판단한다.
- `artist`·`viewer` 역할은 enum에만 남아 있다. `STAFF_ROLES`에 넣지 않는다.
- **알림은 두 단계**: `createNotification`은 먼저 `notifications` 행을 만들고 그다음 푸시를 보낸다. 인앱 알림함은 이 행을 읽으므로, 푸시 토큰이 없는 사용자도 알림을 본다. 이 순서를 뒤집지 않는다.
- **KST**: 서버에서 날짜 문자열을 만들 때는 `timezone.server.ts`를 쓴다. `format(new Date(), 'yyyy-MM-dd')`는 서버에서 UTC 날짜가 된다(알림 크론 일부가 이렇게 되어 있다).
- **AI 사용자 제한**: `ai/gemini.ts`의 사용자 제한은 이메일 한 개 비교다. 지시 실행이 프로젝트·할일·재무를 만들기 때문에, 대상 범위를 넓히려면 권한 규칙을 먼저 정해야 한다.

## 테스트할 것
- `permissions.ts` 함수별 역할 × 사업부 × 등록자·PM·참여자 × 재직 상태 × 재무 상태 조합 표. 판정을 바꾸면 조합 표 테스트를 같이 고친다.
- `auth-guard.ts`: 세션 없음 401, 행 없음 401, 조회 오류 500, 비재직·사업부 없음·외부인 역할 403, `ownStatusOnly`는 비재직도 통과.
- `cron-auth.ts`: 비밀값 없음·헤더 없음·값 다름·길이 다름 모두 401.
- `business-units.ts`: 7개 모두 `BU_META`가 있고 순서가 탭 표시 순서와 같은지.
- Firebase 환경변수가 없을 때 푸시가 Edge Function 경로로 나가는지.
- KST 자정 직후(UTC 15:00–24:00)의 "오늘" 계산.
