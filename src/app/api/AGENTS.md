# src/app/api — 서버 라우트

## 맡는 것
- 화면과 Vercel 크론이 부르는 모든 HTTP 엔드포인트(`route.ts`)
- 재직 가드 호출, 역할·사업부 판정 호출, 입력 검증, DB 읽기·쓰기, 활동 기록(`activity_logs`)·알림 발송
- 라우트 묶음 전용 도우미
  - `financial-entries/_lib/finance-access.ts`: 매출·지출 보기 범위, 허용 칸, 1,000행 넘는 조회(`fetchAllRows`), `paid_at` 입력 정리
  - `projects/_lib/access.ts`: 프로젝트 보기·수정 판정용 조회
  - `users/signup-requests/_guard.ts`: 본사 관리자 가드(`requireHeadAdmin`)
  - `gowid/_lib/gowid-client.ts`: Gowid API 호출과 법인카드 인증(`getAuthContext` → `requireAuth`)

## 맡지 않는 것
- 권한 규칙의 정의. 규칙은 `src/lib/permissions.ts`에 있고, 라우트는 그것을 부르기만 한다. 라우트 안에 `role === ...` 조건을 새로 쓰지 않는다.
- 재직 판정. `src/lib/auth-guard.ts`의 `requireActiveStaff`가 한다.
- 사업부 목록. `src/lib/business-units.ts`의 `isBuCode`·`BU_CODES`를 쓴다.
- 화면 상태·캐시. `src/features/*`가 맡는다.
- 외부 공개 API. 이 라우트들은 이 앱 화면 전용이다. reactstudio.kr·워커·flowmaker는 라우트를 거치지 않고 DB를 직접 쓴다.

## 지켜야 할 것
- **첫 줄은 재직 가드**
  ```ts
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;
  ```
  - 가드는 세션 없음 401, `app_users` 행 없음 401, 조회 오류 500, 재직 아님 403을 돌려준다. 통과한 `appUser`에는 `status`가 항상 들어 있다.
  - 판정 함수에는 이 `appUser`를 넘긴다. 직접 만든 사용자 객체(`status` 없음)를 넘기면 재무·기록 판정은 모두 거부한다.
  - `createPureClient()`(서비스 권한 키)는 가드를 통과한 뒤에만 만든다.
- **가드 예외** (이 밖에는 없다)
  - 크론 5개(`attendance/auto-checkout`, `leave/auto-generate-monthly`·`-yearly`, `notifications/due-soon`·`overdue`): `src/lib/cron-auth.ts`의 `rejectUnauthorizedCron(request)`만 쓴다. `Authorization: Bearer <CRON_SECRET>`만 받고 비밀값이 없으면 401이다. Vercel 크론은 GET으로 부르므로 GET을 내보낸다.
  - `users/me/status`: `requireActiveStaff({ ownStatusOnly: true })`. 본인 `status`·이름만 돌려주고 다른 조회를 하지 않는다.
  - `auth/signup`: 로그인 없음. `pending` 행만 만들고, `app_users` 삽입이 실패하면 만든 인증 계정을 지운다.
  - `auth/logout`
  - `artist/*`, `partner-settlements*`: DB를 읽기 전에 `canAccessExternalFeature()`로 누구에게나 403. `projects/[id]/share-settings`는 가드 뒤 403.
- **법인카드 라우트**: `gowid/*`는 `getAuthContext()` → `requireAuth()`로 시작한다. `getAuthContext`가 재직 가드를 부른다. catch에서 `Unauthorized`는 401, `Forbidden`은 403으로 바꾸는 처리가 반드시 있어야 한다. 빠뜨리면 500이 나간다. `gowid/mapping`만 `requireActiveStaff`를 직접 부르고 admin 여부를 라우트 안에서 본다.
- **update 입력**: 요청 본문을 통째로 update에 넘기지 않는다. 허용 칸 목록으로 고르고, 허용 외 칸(`created_by`, `id`, `created_at`, `updated_by`, `payment_ref` 등)은 오류 없이 무시한다. 매출·지출은 `FINANCE_WRITABLE_COLUMNS`, 프로젝트·할일·회의실·차량은 각 라우트의 허용 목록이 기준이다.
- **매출·지출 쓰기 경로는 모두 같은 판정을 부른다**: `financial-entries/*`, `gowid/expenses/[expenseId]/project-link`, `ai/execute-command`, 프로젝트 삭제.
  - 등록 `canCreateFinance`(행 사업부 기준), 수정 `canEditFinance`, 삭제 `canDeleteFinance`, 상태 전이 `canTransitionFinance`, 사업부 이동 `canMoveFinanceBu`, 거래 범위 `validateFinanceScope`, 기한·입금일 `validateFinanceDates`.
  - 볼 수 없는 행·프로젝트는 404(존재를 숨긴다), 권한 없음 403, 입력 오류 400.
  - `financial_entries` delete는 `status='planned'` 조건을 같이 건다. `paid`·`canceled` 삭제 요청은 409.
  - 법인카드 연결 이동은 지출 행을 update(프로젝트·사업부)하고, 해제는 `canceled`로 바꾼 뒤 연결표 행만 지운다. 이 라우트는 `financial_entries`에 delete를 부르지 않는다.
- **프로젝트 삭제**: 매출·지출이 한 건이라도 있으면 삭제 호출 전에 409와 "보류로 바꾸세요" 문구를 준다. DB 트리거도 거부하지만, 트리거에 기대지 말고 먼저 확인한다(봉인 전 DB에서는 연쇄 삭제된다).
- **할일 사업부**: 할일의 `bu_code`는 입력으로 받지 않는다. `project_id`가 바뀌면 새 프로젝트의 `bu_code`를 넣는다.
- **변경자 전달**: 매출·지출·`app_users` 쓰기에는 `isAuditV2Enabled()`가 참일 때만 `updated_by = appUser.id`를 넣는다. 스위치가 꺼졌는데 넣으면 봉인 전 DB에서 칸이 없어 저장이 실패한다. 변경 기록 조회 라우트(`financial-entries/[id]/changes`, `users/[id]/changes`)는 가드 다음에 스위치를 보고, 꺼져 있으면 200 `{ changes: [], enabled: false }`를 준다.
- **사용자 변경**: `users/[id]`는 관리자만, 역할·사업부·재직 상태는 `canChangeUserRoleBuStatus`(본인은 불가). 새 역할은 `STAFF_ROLES` 4개만. 사람 행을 지우는 라우트를 만들지 않는다.
- **응답 형식**: 오류는 `{ error: string }`. 목록은 배열, 삭제 성공은 `{ success: true }`. 가입·승인은 `{ ok: true }`·`{ requests }`·`{ user }`, 변경 기록은 `{ changes, enabled }`. 화면 훅과 reactstudio.kr 계약이 이 형태를 전제로 한다.
- **날짜**: "오늘"은 `src/lib/timezone.server.ts`·`timezone.ts`의 KST 헬퍼로 구한다. `paid_at`은 `validateFinanceDates`가 돌려준 값(한국 자정 timestamptz)을 그대로 저장한다.
- **대량 조회**: 목록·합계는 `range`로 끝까지 읽는다. `.in('id', [...수백 개])`는 URL 길이를 넘으므로 쓰지 않는다.
- **알림**: 상태 변경 알림은 `src/lib/notification-sender.ts`를 부른다. DB를 SQL로 직접 바꾸면 알림이 나가지 않는다.

## 테스트할 것 (라우트마다)
- 세션 없음 → 401. 승인 대기·퇴사 세션 → 403.
- 권한 없는 역할 → 403, DB 변화 없음. 다른 사업부 리더의 쓰기 → 403.
- 볼 수 없는 대상의 id 직접 요청 → 404.
- 허용 외 칸을 섞어 보냄 → 무시하고 나머지만 저장.
- 매출·지출: `paid` 삭제 409, 되돌리기·되살리기는 관리자만, `planned` 기한 누락 400, `paid` 전환 시 입금일 누락 400.
- 재무 행 있는 프로젝트 삭제 → 409, 재무 행 그대로.
- 스위치 꺼진 상태에서 수정 라우트가 `updated_by`를 보내지 않는지.
- 서버 라우트 단위 테스트는 `tests/unit/`의 가짜 Supabase 클라이언트로, 미리보기 대상 통합 테스트는 `tests/api/`로 한다.
