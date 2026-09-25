# supabase — 마이그레이션·기준선·운영 적용 스크립트·Edge Function

## 맡는 것
- `migrations/`: 이 레포의 SQL 변경 34개. 파일명은 `YYYYMMDD_설명.sql` 또는 `YYYYMMDDHHMMSS_설명.sql`이다.
  - 옛 31개(2025-03 ~ 2026-06). 고치지 않는다.
  - `20260810102059_add_deetz_bu_code.sql`, `20260810102123_add_cross_bu_accounting.sql`: 2026-08-10 운영에 직접 적용된 DEETZ·내부배부 변경의 사본. 운영에는 이미 있다.
  - `20260925000000_unified_ops_seal.sql`: 권한 봉인. **2026-09-25 운영 적용.** 추가만 하는 변경이다.
    - 칸 `financial_entries.updated_by`·`app_users.updated_by`, 변경 기록 테이블 `financial_entry_changes`·`app_user_changes`
    - 판정 함수 `is_active_staff`·`is_staff_admin`·`is_staff_admin_or_leader`·`can_view_project`·`can_view_financial_entry_changes`(SECURITY DEFINER, `search_path` 고정)
    - 트리거: 본인 역할·사업부·재직 변경 거부, 직원·매출지출 변경 기록, `paid`·`canceled` 삭제 거부, 재무 있는 프로젝트 삭제 거부
    - 봉인 5개 테이블(`app_users`, `projects`, `project_tasks`, `financial_entries`, `gowid_expense_project_link`)의 RLS 교체, 뷰 2개 `security_invoker=true`
  - `migrations/README.md`: 기준선의 뜻과 다시 뜨는 법
- `baseline/20260924_prod_snapshot.sql`: 2026-09-24 운영 `public` 스키마 사본(enum·테이블·제약·인덱스·함수·트리거·뷰·RLS 정책). 데이터·비밀값·GRANT는 없다. 로컬 PGlite 테스트가 이 파일을 적재한다.
- `apply/`: 운영 적용·되돌리기 스크립트
  - `20260925_seal_apply.sql`: 한 트랜잭션으로 봉인 마이그레이션 전문 + 데이터 보정 전문 + 확인 SELECT
  - `20260925_data_fix.sql`: 사업부 없는 `active` 계정을 `pending`으로(대상 2건 이상이면 중단)
  - `20260925_data_fix_rollback.sql`: 위 보정을 `app_user_changes` 기록으로 찾아 되돌린다
  - `20260925_seal_rollback.sql`: 정책(봉인 5개 + 봉인 밖 83개·RESTRICTIVE 2개)·뷰·트리거·함수를 기준선 상태로 되돌린다. 변경 기록 테이블과 `updated_by` 칸은 남긴다
- `functions/send-push/index.ts`: FCM HTTP v1 푸시 발송 Edge Function.
  - Supabase 쪽 비밀값으로 Firebase 서비스 계정을 받는다. `FIREBASE_PROJECT_ID`·`FIREBASE_CLIENT_EMAIL`·`FIREBASE_PRIVATE_KEY` 또는 `FIREBASE_SERVICE_ACCOUNT_JSON`을 쓴다.
  - 토큰은 서비스 권한 키로 `push_tokens`에서 읽는다.

## 맡지 않는 것
- 운영 스키마의 최신 정의. 운영 적용 이력은 128개(2026-09-24)이고 `migrations/`만으로는 재구성할 수 없다. 기준선도 추출일 시점 사본이다. 최신 사실은 운영 DB 직접 조회다. 루트 `schema_.sql`은 오래된 사본이다.
- `react_*` 테이블. reactstudio 레포가 주인이다.
- 봉인 5개 밖 테이블의 역할·사업부별 세부 정책 설계. 봉인 SQL 7절은 로그인 계정 정책에 재직 직원 조건(`is_active_staff()`)만 AND로 붙이고 기존 식은 그대로 둔다.

## 지켜야 할 것
- **운영 적용**: 대표 승인 뒤에만 한다. `apply/`의 트랜잭션 스크립트로 적용하고, 되돌리기 스크립트를 먼저 준비한다.
- **적용 순서**: 봉인 SQL은 ERP 코드(가입 서버 라우트, `ERP_AUDIT_V2` 꺼짐)와 reactstudio.kr 관리 화면의 서버 라우트 이전이 운영에 배포된 **뒤에** 적용한다. 먼저 적용하면 가입이 끊기고(비로그인 INSERT 정책 제거) reactstudio.kr 관리 화면이 멈춘다(세션 쓰기 정책 제거).
- **되돌리기 순서**: `data_fix_rollback` → `seal_rollback`. 검증된 순서는 이것뿐이다. 보정 되돌리기를 먼저 해야 그 변경도 트리거가 살아 있을 때 변경 기록에 남는다.
- **적용 스크립트 = 원본 사본**: `apply/20260925_seal_apply.sql` 안의 두 본문은 `migrations/20260925000000_unified_ops_seal.sql`, `apply/20260925_data_fix.sql`과 글자 그대로 같아야 한다. 원본을 고치면 같은 커밋에서 사본도 고친다. `tests/db`가 비교한다(줄바꿈은 LF로 맞춰 비교).
- **기준선**: 운영에서 **절대 실행하지 않는다**. 마이그레이션 이력에 등록하지 않는다. 이미 있는 객체와 충돌한다. 마이그레이션 도구가 읽지 않도록 `migrations/` 밖에 둔다.
- **추가만 한다**
  - 컬럼·테이블·enum 값은 추가만 한다.
  - 기존 컬럼 삭제·이름 변경·타입 변경과 enum 값 삭제·이름 변경은 하지 않는다.
  - 대상: `bu_code`, `financial_status`, `financial_kind`, `project_status`, `task_status`, `erp_role`, `entry_scope` 값.
  - 이유: 사내 워커·flowmaker·reactstudio가 이 값을 문자열로 비교해서, 바뀌면 조용히 0건이 된다.
  - `app_users.status`는 enum이 아닌 글자 칸이다. 쓰는 값은 `pending`·`rejected`·`active`·`dormant`·`retired`이고 새 값을 만들지 않는다.
- **enum 추가 시 코드 동시 반영**: enum에 값을 추가하면 그 값을 쓰는 화면 목록·라벨 맵을 같은 변경에서 코드에 반영한다. 사업부는 `src/lib/business-units.ts` 한 곳이다. enum 추가는 트랜잭션 안에서 바로 쓸 수 없으니 추가와 사용을 별도 문장으로 나눈다.
- **RLS**
  - 새 테이블에는 RLS를 켜고 정책을 명시한다. 정책 없이 RLS만 켜면 서비스 권한 키 외에는 아무도 못 읽는다.
  - `authenticated` 전권(`using (true)`) 정책을 새로 만들지 않는다. 재직 판정은 `public.is_active_staff()`를 쓴다.
  - 정책 안에서 `app_users`를 직접 서브쿼리로 읽지 않는다. `app_users` 정책이 다시 불려 순환한다. SECURITY DEFINER 판정 함수를 거친다.
  - 핵심 테이블의 쓰기 정책은 `authenticated`·`anon`에 두지 않는다. 쓰기는 ERP 서버의 서비스 권한 키로만 한다.
  - reactstudio.kr 공개 페이지의 비로그인 읽기(`portfolio_items` 전체, `projects` '완료', `clients`)를 유지한다.
- **뷰 권한**: 뷰는 `security_invoker=true`로 만든다.
- **삭제 보호**
  - `projects` 삭제는 `financial_entries`·`project_tasks`·`project_documents`·`gowid_expense_project_link`·`project_pnl_reports`를 연쇄 삭제한다. 봉인 SQL의 `projects_guard_delete`(BEFORE DELETE)가 재무 행이 있으면 연쇄 삭제 전에 거부한다.
  - `financial_entries_guard_delete`는 `paid`·`canceled` 삭제를 서비스 권한 키를 포함해 누구에게나 거부한다. 운영 데이터 정리 SQL도 이 트리거에 걸린다. 트리거를 끄는 SQL을 쓰지 않는다.
  - `app_users` 삭제는 근태·휴가·활동 기록·댓글·업무일지를 지운다. 사람 행은 지우지 않는다.
- **변경 기록 트리거**: `updated_by`는 기록한 뒤 항상 비운다. 이 동작을 바꾸면 다음 외부 쓰기가 옛 ERP 사용자 이름으로 기록된다. 변경 기록 테이블의 쓰기 권한을 `authenticated`·`anon`에 주지 않는다.
- **대량 수정**: 데이터 일괄 수정 SQL은 되돌리기 SQL을 먼저 남긴다. 대상은 조건으로 고르고 사람 id·이메일을 파일에 적지 않는다(공개 저장소). 버그리포트·할일 상태를 SQL로 바꾸면 사용자 알림이 나가지 않는다.
- **Edge Function 보조 경로**: `send-push`는 Vercel에 Firebase Admin 값이 없을 때 쓰이는 보조 경로다. Firebase 서비스 계정을 바꾸면 Vercel 환경변수와 Supabase Function 비밀값을 둘 다 바꿔야 한다. 하나만 바꾸면 한쪽 경로의 푸시만 끊긴다.

## 테스트할 것
- 새 SQL은 `tests/db`에서 PGlite(기준선 + `scripts/schema/pglite-stubs.sql` + 이 SQL)로 검사한다.
  - `paid`·`canceled` 삭제 거부, 재무 있는 프로젝트 삭제 거부
  - 변경 기록의 `erp`/`external` 판정, `updated_by` 비우기, insert 기록
  - 역할별 보기 범위: 관리자, 다른 사업부 리더(보기만·쓰기 불가), 매니저, 참여 멤버, 승인 대기·퇴사 차단, 비로그인은 공개 3종만
  - 적용 스크립트가 한 번에 적용되는지, 두 되돌리기 뒤 정책·트리거·뷰·함수가 기준선과 같은지, 워커·flowmaker·reactstudio.kr이 쓰는 조회 결과가 적용 전후 같은지
- 운영 적용 후 워커 디제스트·월 손익, flowmaker 명단, reactstudio.kr `/portfolio`·`/history`와 관리 화면이 같은 결과를 내는지.
