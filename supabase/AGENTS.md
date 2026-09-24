# supabase — 마이그레이션과 Edge Function

## 맡는 것
- `migrations/`: 이 레포에서 만든 SQL 변경 31개(2025-03 ~ 2026-06). 파일명은 `YYYYMMDD_설명.sql`이다.
- `functions/send-push/index.ts`: FCM HTTP v1 푸시 발송 Edge Function.
  - Supabase 쪽 비밀값으로 Firebase 서비스 계정을 받는다. `FIREBASE_PROJECT_ID`·`FIREBASE_CLIENT_EMAIL`·`FIREBASE_PRIVATE_KEY` 또는 `FIREBASE_SERVICE_ACCOUNT_JSON`을 쓴다.
  - 토큰은 서비스 권한 키로 `push_tokens`에서 읽는다.

## 맡지 않는 것
- 운영 스키마의 전체 정의
  - 운영 DB(`wqtoahrekijirxxpbfqg`)에는 약 130개 변경이 적용되어 있고 이 폴더에는 31개만 있다.
  - DEETZ 사업부, `entry_scope`, 사업부 역할 칸, RLS 일괄 조치(2026-09-21) 등은 이 폴더에 없다.
  - 루트 `schema_.sql`도 오래된 스냅샷이다.
- `react_*` 테이블. reactstudio 레포가 주인이다.

## 지켜야 할 것
- **운영 적용**: 운영 DB 적용은 대표 승인 뒤에 한다. 적용한 SQL은 같은 날 이 폴더에 같은 내용으로 남긴다.
- **추가만 한다**
  - 컬럼·테이블·enum 값은 추가만 한다.
  - 기존 컬럼 삭제·이름 변경·타입 변경과 enum 값 삭제·이름 변경은 하지 않는다.
  - 대상: `bu_code`, `financial_status`, `financial_kind`, `project_status`, `task_status`, `erp_role`, `entry_scope` 값.
  - 이유: 사내 워커·flowmaker·reactstudio가 이 값을 문자열로 비교해서, 바뀌면 조용히 0건이 된다.
- **enum 추가 시 코드 동시 반영**: enum에 값을 추가하면 그 값을 쓰는 화면 목록·라벨 맵을 같은 변경에서 코드에 반영한다. enum 추가는 트랜잭션 안에서 바로 쓸 수 없으니 추가와 사용을 별도 문장으로 나눈다.
- **RLS**
  - 새 테이블에는 RLS를 켜고 정책을 명시한다. 정책 없이 RLS만 켜면 서비스 권한 키 외에는 아무도 못 읽는다.
  - `authenticated` 전권(`using (true)`) 정책을 새로 만들지 않는다.
  - 운영 핵심 테이블에 이미 있는 전권 정책은 바꿔야 할 결함이다. 바꿀 때는 reactstudio.kr 공개 페이지(`portfolio_items`, `projects` 완료, `clients`)의 비로그인 읽기를 유지한다.
- **뷰 권한**: 뷰는 `security_invoker=true`로 만든다. 현재 `attendance_logs_with_user`, `project_pnl_reports_with_profit`가 소유자 권한이라 RLS를 우회한다.
- **연쇄 삭제**
  - `projects` 삭제는 `financial_entries`·`project_tasks`·`project_documents`·`gowid_expense_project_link`·`project_pnl_reports`를 지운다.
  - `app_users` 삭제는 근태·휴가·활동 기록·댓글·업무일지를 지운다.
  - 외래키 삭제 동작을 CASCADE로 새로 만들 때는 확정된 돈 행(`paid`·`canceled` 매출·지출 삭제 금지, 대표 확정)이 딸려 지워지지 않는지 확인한다.
- **대량 수정**: 데이터 일괄 수정 SQL은 되돌리기 SQL과 대상 id 목록을 먼저 남긴다. 버그리포트·할일 상태를 SQL로 바꾸면 사용자 알림이 나가지 않는다.
- **Edge Function 보조 경로**: `send-push`는 Vercel에 Firebase Admin 값이 없을 때 쓰이는 보조 경로다. Firebase 서비스 계정을 바꾸면 Vercel 환경변수와 Supabase Function 비밀값을 둘 다 바꿔야 한다. 하나만 바꾸면 한쪽 경로의 푸시만 끊긴다.

## 테스트할 것
- 마이그레이션을 브랜치 DB에 적용한 뒤 워커 디제스트·월 손익 쿼리, flowmaker 명단 쿼리, reactstudio.kr `/portfolio`가 같은 결과를 내는지.
- 새 정책 적용 후 로그인 재직자·퇴사자·비로그인 각각으로 핵심 테이블 조회 결과가 목표대로 나오는지.
