# src/app/api — 서버 라우트

## 맡는 것
- 화면과 Vercel 크론이 부르는 모든 HTTP 엔드포인트(140개 `route.ts`)
- 세션 사용자 확인, 역할·사업부 권한 판정, DB 읽기·쓰기, 활동 기록(`activity_logs`)·알림 발송

## 맡지 않는 것
- 권한 규칙의 정의. 규칙은 `src/lib/permissions.ts`에 있고, 라우트는 그것을 부르기만 한다.
- 화면 상태·캐시. `src/features/*`가 맡는다.
- 외부 공개 API. 이 라우트들은 이 앱 화면 전용이다. reactstudio.kr·워커·flowmaker는 라우트를 거치지 않고 DB를 직접 쓴다.

## 지켜야 할 것
- **확인 순서**: 모든 라우트는 쿼리 전에 아래 순서로 확인한다.
  1. `createClient()`(쿠키 세션)로 `auth.getUser()`
  2. `createPureClient()`로 `app_users`에서 `role, bu_code, status`
  3. 재직 여부(`status='active'`)
  4. `permissions.ts` 판정
- **현재 상태**
  - 1·2까지만 하는 라우트가 대부분이다. 3은 거의 없다.
  - 1조차 없는 라우트 파일이 24개다(2026-09-24 기준)(channels, channel-contents, clients, client-workers, external-workers, events, manuals, org-members, business-units, upload, storage/signed-url, 프로젝트 문서·참여자, comments reads, unified-partners/categories).
  - 새 라우트는 이 상태를 따라 하지 않는다.
- **법인카드 라우트의 인증**: `gowid/*`는 `gowid/_lib/gowid-client.ts`의 `getAuthContext`·`requireAuth`로 확인한다. catch에서 `Unauthorized` 메시지를 401로 바꾸는 처리가 반드시 있어야 한다. `gowid/mapping`만 직접 `auth.getUser()` + admin 확인을 쓴다.
- **update 입력**
  - update에 `...body`를 넘기지 않는다. 기준 구현은 `projects/[id]`의 허용 컬럼 목록 방식이다.
  - 현재 `financial-entries/[id]`, `tasks/[id]`(권한 판정 뒤), `meeting-rooms/[id]`, `vehicles/[id]`가 본문을 통째로 넘긴다.
- **매출·지출 쓰기 규칙**(대표 확정, 현재 미구현)
  - 수정·삭제는 등록자·그 사업부 리더·관리자만 한다.
  - `paid`·`canceled` 삭제는 누구도 못 한다.
  - `paid`→`planned`는 관리자만 한다.
  - 금액·상태·사업부 변경은 기록한다.
  - `financial-entries/*` 말고도 매출·지출 행을 만들거나 지우는 라우트가 있다: `gowid/expenses/[expenseId]/project-link`(연결 변경·해제 시 `paid` 행 삭제), `projects/[id]` DELETE(DB가 딸린 매출·지출을 연쇄 삭제), `ai/execute-command`(재무 행 생성). 이 경로들에 규칙을 어떻게 적용할지는 봉인 작업에서 대표 확인을 받아 정한다.
- **할일 PATCH의 사업부**: 할일 PATCH는 `project_id`가 바뀌어도 옛 프로젝트의 `bu_code`를 넣는다. 고칠 때 새 프로젝트 기준으로 바꾼다.
- **크론 라우트**
  - 근태·휴가 크론 3개는 `Authorization: Bearer ${CRON_SECRET}`, 알림 크론 2개는 `?key=`로 확인한다. 둘 다 `CRON_SECRET`이 없으면 통과시킨다.
  - Vercel 크론은 GET으로 부르므로 크론 라우트는 GET을 내보내야 한다.
  - 알림 크론은 중복 발송 방지가 없다.
- **응답 형식**: 오류는 `{ error: string }` + 401·403·404·400·500. 목록은 배열, 삭제 성공은 `{ success: true }`. 화면 훅이 이 형태를 전제로 한다.
- **날짜**: "오늘"은 `src/lib/timezone.server.ts`·`timezone.ts`의 KST 헬퍼로 구한다.
- **대량 조회**: PostgREST 1,000행 절단에 주의한다. 알림·활동 기록·근태처럼 큰 테이블은 기간 조건이나 `range`를 붙인다.
- **알림**: 상태 변경 알림은 `src/lib/notification-sender.ts`를 부른다. DB를 SQL로 직접 바꾸면 알림이 나가지 않는다.

## 테스트할 것 (라우트마다)
- 세션 없음 → 401.
- 퇴사자 세션 → 401 또는 403(재직 확인 도입 후).
- 권한 없는 역할 → 403, DB 변화 없음.
- 허용 외 컬럼(`created_by`, `bu_code`, `status` 등)을 섞어 보냄 → 무시 또는 400.
