# src/lib — 공용 서버·클라이언트 유틸

## 맡는 것
- `supabase/server.ts`
  - `createClient()`: 쿠키 세션·익명 키. RLS를 받는다. 사용자 확인용.
  - `createPureClient()`: 서비스 권한 키, 쿠키 없음. RLS를 무시한다.
- `supabase/client.ts`: 브라우저 클라이언트(익명 키 + 세션).
- `permissions.ts`: 역할·사업부 판정 함수와 사이드바 메뉴(`getVisibleMenus`).
- `notification-sender.ts`: `notifications` 행 생성 + 푸시 호출. 할일 배정·마감 임박·기한 초과·자동 퇴근·버그 처리 등 알림 문구를 만든다.
- `push-sender.ts`: FCM 발송. Firebase Admin 환경변수가 없으면 Supabase Edge Function `send-push`로 대신 보낸다. 무효 토큰은 `push_tokens`에서 정리한다.
- `firebase-admin.ts`, `firebase-web.ts`, `web-push.ts`: Firebase 초기화와 웹 푸시 토큰 발급.
- `activity-logger.ts`: `activity_logs` 기록 헬퍼.
- `timezone.ts`, `timezone.server.ts`: KST 날짜·시각 헬퍼.
- `ai/gemini.ts`: Gemini 호출과 AI 기능 사용자 제한(지정 이메일 1개).
- `capacitor/*`: 네이티브 앱에서 위치·카메라·푸시 플러그인 호출.

## 맡지 않는 것
- 화면 컴포넌트, 기능별 fetch 래퍼(`src/features/*`).
- 라우트별 입력 검증(`src/app/api/*`).

## 지켜야 할 것
- **서버 전용 모듈**
  - `supabase/server.ts`는 `server-only`를 import한다. 브라우저 코드에서 import하면 빌드가 실패한다. 이 가드를 지우지 않는다.
  - 서비스 권한 키를 쓰는 모듈(`push-sender`, `notification-sender`, `activity-logger`, `firebase-admin`)도 서버 코드에서만 부른다.
- **`createPureClient()` 사용 조건**: 이 클라이언트를 받은 코드는 RLS가 없다고 보고 권한을 직접 확인해야 한다. 사용자 요청을 처리하는 곳에서 세션 확인 없이 이 클라이언트를 쓰지 않는다.
- **`permissions.ts`의 현재 모습**
  - 이 파일이 역할 판정의 한 곳 정의다. 라우트·화면에 역할 조건을 따로 쓰지 말고 여기에 함수를 추가한다.
  - `BuCode` 타입이 DEETZ가 빠진 6개다. 운영 DB는 7개다.
  - 재무 판정 함수(`canEditFinance` 등)가 있지만 재무 라우트는 쓰지 않는다. 재무 목표 규칙(보기 전원, 수정·삭제 등록자·그 사업부 리더·관리자, `paid`·`canceled` 삭제 금지, `paid`→`planned` 관리자만)을 넣을 곳이 이 파일이다.
  - 재직 여부(`status`)를 받는 판정이 없다. 퇴사자 차단을 넣을 때 `AppUser`에 `status`를 추가한다.
  - `artist`·`viewer` 관련 판정은 사용자 0명이고 정리 대상이다.
- **알림은 두 단계**: `createNotification`은 먼저 `notifications` 행을 만들고 그다음 푸시를 보낸다. 인앱 알림함은 이 행을 읽으므로, 푸시 토큰이 없는 사용자도 알림을 본다. 이 순서를 뒤집지 않는다.
- **KST**: 서버에서 날짜 문자열을 만들 때는 `timezone.server.ts`를 쓴다. `format(new Date(), 'yyyy-MM-dd')`는 서버에서 UTC 날짜가 된다(알림 크론 일부가 이렇게 되어 있다).
- **AI 사용자 제한**: `ai/gemini.ts`의 사용자 제한은 이메일 한 개 비교다. 지시 실행이 프로젝트·할일·재무를 만들기 때문에, 대상 범위를 넓히려면 권한 규칙을 먼저 정해야 한다.

## 테스트할 것
- `permissions.ts` 함수별 역할 × 사업부 × 등록자·PM·참여자 조합 표(순수 함수라 단위 테스트가 쉽다).
- Firebase 환경변수가 없을 때 푸시가 Edge Function 경로로 나가는지.
- KST 자정 직후(UTC 15:00–24:00)의 "오늘" 계산.
