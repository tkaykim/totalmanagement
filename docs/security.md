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
2. 로그인 직후 화면이 본인 계정 상태 라우트(`GET /api/users/me/status`)로 `status`를 읽는다. 이 라우트는 세션과 `app_users` 행만 확인하고 재직 여부는 보지 않는다. 돌려주는 것은 본인 `status`와 이름뿐이다.
   - 실패하면(세션·`app_users` 행 없음) 로그아웃시키고 "계정 정보를 찾을 수 없습니다"를 보여 준다.
   - `pending`이면 "승인 대기 중", `rejected`면 "가입이 거절됨" 안내 화면만 보여 준다. 로그아웃 버튼 말고 다른 화면은 없다.
   - `retired`면 로그아웃시키고 "퇴사 처리된 계정" 문구를 보여 준다.
   - 그 밖에는 메인 화면으로 간다. 메인 화면도 같은 판정을 한 번 더 한다.
3. 서버 라우트는 비즈니스 로직 전에 공통 재직 가드를 거친다.
   - 순서: 세션(`auth.getUser()`) → `app_users` 행 조회(서비스 권한 키) → 재직 확인 → 역할·사업부 판정
   - 세션 없음·세션 오류 → 401
   - `app_users` 행 없음 → 401
   - `app_users` 조회 오류 → 500
   - 재직 직원이 아님(`status`가 `active`가 아님, 사업부 없음, `viewer`·`artist` 역할) → 403
   - 재직 직원 = `status='active'` + 7개 중 하나인 `bu_code` + `admin`·`leader`·`manager`·`member` 역할
4. 가입(`/signup`)
   - 화면이 서버 라우트 `POST /api/auth/signup`을 부른다. 브라우저가 `app_users`에 직접 넣는 경로는 없다.
   - 서버가 인증 계정을 이메일 확인 완료 상태로 만들고 `app_users`에 `pending` 행을 넣는다. 행 삽입이 실패하면 방금 만든 인증 계정을 지운다.
   - 가입 직후 계정은 로그인은 되지만 2번의 안내 화면만 보고, 모든 데이터 라우트에서 403을 받는다.
5. 승인
   - 본사 관리자(HEAD 소속 재직 관리자)만 ERP 조직 화면의 가입 신청 목록에서 승인·거절한다.
   - reactstudio.kr 관리자 화면도 같은 규칙으로 승인한다.
   - 승인 전까지 데이터 접근은 서버 가드가 막는다. DB는 봉인 SQL이 적용된 뒤부터 함께 막는다(아래 RLS 현황).
6. 관리자는 `/api/users`로 계정을 직접 만들 수 있다.
7. Android/iOS 앱은 웹 세션을 그대로 쓴다. 앱만의 인증 단계는 없다.
8. 세션 만료
   - 토큰 갱신은 브라우저 Supabase 클라이언트의 자동 갱신에만 의존한다. 서버 쪽 세션 갱신 미들웨어는 없다.
   - 갱신에 실패해 세션이 없으면 메인 화면은 진입할 때 `/login`으로 보낸다.
   - 이미 열린 화면에서 부른 API는 401을 받는다. 화면은 이를 로그인 이동으로 바꾸지 않고 오류로 표시한다.
9. 잠금: 로그인 실패 횟수에 따른 계정 잠금 정책은 이 앱에 없다. Supabase Auth 기본 요청 제한만 적용된다.
10. 퇴사: 퇴사자의 Auth 계정은 비활성화하지 않는다. 로그인은 되지만 3번 가드와 봉인 후 RLS가 데이터를 막는다.

## 권한 모델

역할은 `admin`, `leader`(사업부장), `manager`, `member`를 쓴다.
판정 함수는 `src/lib/permissions.ts` 한 곳에 있다. 서버 라우트와 화면 모두 이 함수를 부른다.
화면의 버튼 표시는 보안 경계가 아니다. 서버 가드·판정과 DB가 강제한다.

### 사람 구분

| 구분 | 조건 | 보기 범위 | 쓰기 범위 |
|---|---|---|---|
| 관리자 | 재직 + `admin` | 7개 사업부 전체 | 전체 |
| 본사 관리자 | 관리자 + `bu_code='HEAD'` | 관리자와 같음 | 관리자 권한 + 가입 승인·거절 |
| 사업부 리더 | 재직 + `leader` | 7개 사업부 전체(사업부 무관) | 자기 사업부 것만 |
| 일반 직원 | 재직 + `manager`·`member` | 생성자·PM·참여자인 프로젝트(manager는 PM이 지정된 같은 사업부 프로젝트 추가) | 아래 표 |
| 차단 대상 | 재직 아님, 사업부 없음, `viewer`·`artist`, 비로그인 | 없음 | 없음 |

### 매출·지출

판정 기준은 **행의 사업부**다. 프로젝트 사업부가 아니다.

| 행동 | 관리자 | 행 사업부 리더 | 다른 사업부 리더 | 일반 직원 | 차단 대상 |
|---|---|---|---|---|---|
| 보기 | 전체 | 전체 | 전체 | 볼 수 있는 프로젝트의 모든 행 + 본인 등록 행 | 불가 |
| 등록 | 가능 | 자기 사업부 행만 | 불가 | 볼 수 있는 프로젝트에 | 불가 |
| 내용 수정 | 가능 | 등록자 있는 행 | 불가 | 본인 등록 행 | 불가 |
| `planned` 삭제 | 가능 | 등록자 있는 행 | 불가 | 본인 등록 행 | 불가 |
| `paid`·`canceled` 삭제 | **불가** | 불가 | 불가 | 불가 | 불가 |
| `paid`→`canceled` | 가능 | 등록자 있는 행 | 불가 | 본인 등록 행 | 불가 |
| `paid`→`planned`, `canceled`→`planned`·`paid` | 가능 | 불가 | 불가 | 불가 | 불가 |
| 행 사업부 이동 | 가능 | 원래 사업부 리더만 | 불가 | 불가 | 불가 |
| 변경 기록 보기 | 가능 | 가능 | 불가 | 본인 등록 행 | 불가 |

- 등록자가 비어 있는 옛 행은 관리자만 고친다.
- 볼 수 없는 행을 id로 요청하면 404다. 볼 수는 있지만 고칠 권한이 없는 행을 고치려 하면 403이다.
- 목록·합계 API(프로젝트 목록의 매출·지출 합계, 손익보고, 대시보드·정산 집계)도 같은 보기 범위로 계산한다.

### 그 밖의 권한

| 대상 | 규칙 |
|---|---|
| 프로젝트 보기 | 관리자·모든 리더는 전체, 일반 직원은 생성자·PM·참여자(+manager는 PM이 지정된 같은 사업부). 할일이 배정된 프로젝트는 제목·설명만 본다 |
| 프로젝트 생성·수정·삭제 | 관리자 전체, 리더는 자기 사업부 프로젝트만, 일반 직원은 생성자·PM. 재무 행이 붙은 프로젝트 삭제는 누구든 409 |
| 할일 | 관리자 전체, 리더는 소속 프로젝트가 자기 사업부일 때만 쓰기, 담당자만인 경우 상태만 바꾼다. 할일 사업부는 소속 프로젝트가 정한다 |
| 할일 템플릿 일괄 생성 | 할일 생성 규칙과 같다. 리더는 자기 사업부 프로젝트에만 |
| 사용자 생성·수정 | 관리자만. 역할·사업부·재직 상태는 본인 것은 관리자라도 불가. 새로 줄 수 있는 역할은 4개뿐 |
| 가입 신청 목록·승인·거절 | 본사 관리자만 |
| 직원 변경 기록 보기 | 관리자만 |
| 회의실·차량 자원 수정 | 관리자만. 허용 컬럼만 받는다 |
| 근태 기록(RLS) | 본인, admin, 같은 사업부 manager·admin. 봉인 뒤에는 모두 재직 직원일 때만 |
| 휴가 신청(RLS) | 본인 신청. 승인은 admin 전체, leader는 같은 사업부. 봉인 뒤에는 모두 재직 직원일 때만 |
| 법인카드 API | 재직 가드 + `canAccessCorporateCard`. admin·leader 전체, manager·member는 Gowid 사용자 매핑이 있을 때만. 프로젝트 연결의 이동·해제는 매출·지출 표의 `paid`→`canceled` 권한을 따른다 |
| 정산 메뉴(사업부별 매출·지출·미수금) | 관리자와 모든 리더 |
| 리소스 현황 메뉴 | HEAD 사업부 admin·leader |
| 푸시 발송·시험 | 관리자만 |
| AI 업무 지시 | 지정된 이메일 1개만. 만드는 재무 행에는 매출·지출 표와 기한·입금일 필수 규칙이 적용된다 |
| 아티스트·파트너 기능(`/artist`, `api/artist/*`, `api/partner-settlements*`, `projects/[id]/share-settings`) | 누구에게나 403. 메뉴도 없다 |

### DB(RLS) 현황

**운영 DB의 현재 상태(2026-09-25 기준, 봉인 SQL 미적용)**
- RLS는 모든 public 테이블에 켜져 있다(2026-09-21 일괄 조치).
- 하지만 `projects`, `financial_entries`, `project_tasks`, `partners`, `contracts`, `app_users` 등 핵심 테이블의 정책은 "`authenticated`면 전부 허용"이다.
  - 로그인만 하면(승인 대기·퇴사자 포함) 브라우저에서 PostgREST로 직접 읽고 쓸 수 있다. 서버 가드를 우회한다.
  - `app_users`도 전부 허용이라 본인 `role`을 `admin`으로 바꿀 수 있다.
  - `app_users`는 비로그인(`anon`) INSERT를 역할 제한 없이 허용한다.
- 뷰 `attendance_logs_with_user`, `project_pnl_reports_with_profit`은 뷰 소유자 권한으로 실행돼 호출자의 RLS를 무시한다.
- `paid`·`canceled` 삭제 금지, 재무 있는 프로젝트 삭제 차단, 변경 기록 트리거가 없다. 프로젝트를 지우면 딸린 매출·지출이 외래키 연쇄 삭제로 사라진다.

**봉인 SQL(`supabase/migrations/20260925000000_unified_ops_seal.sql`, 준비됨·운영 미적용) 적용 후**
- 봉인 대상은 정확히 5개 테이블이다: `app_users`, `projects`, `project_tasks`, `financial_entries`, `gowid_expense_project_link`.
  - `authenticated`·`anon` 쓰기 정책이 없다. 쓰기는 ERP 서버의 서비스 권한 키로만 한다.
  - `projects`·`project_tasks`·`financial_entries` SELECT는 위 보기 범위와 같다. 할일은 볼 수 있는 프로젝트의 할일 + 본인 배정 할일이다.
  - `projects`의 '완료' 행은 로그인 여부와 무관하게 읽힌다(비로그인 공개 정책과 같은 범위).
  - `gowid_expense_project_link`는 재직 직원만 읽는다.
  - `app_users`는 재직 직원이 전체를 읽고, 그 밖의 로그인 계정은 본인 행만 읽는다. 비로그인 INSERT 정책은 없어진다.
- 본인의 역할·사업부·재직 상태 변경은 트리거가 거부한다. 서비스 권한 경로(`auth.uid()` 없음)는 통과한다.
- `paid`·`canceled` 매출·지출 삭제와 재무 행이 붙은 프로젝트 삭제는 트리거가 거부한다. 서비스 권한 키를 포함한 모든 경로(reactstudio.kr·워커·SQL)에 걸린다. 프로젝트 삭제 거부는 외래키 연쇄 삭제보다 먼저 돈다.
- 뷰 2개는 호출자 권한(`security_invoker=true`)으로 바뀐다.
- 판정 함수(`is_active_staff`, `is_staff_admin`, `is_staff_admin_or_leader`, `can_view_project`, `can_view_financial_entry_changes`)는 소유자 권한으로 `app_users`를 읽는다. 정책이 `app_users` 정책을 다시 부르는 순환을 피하기 위해서다.
- 봉인 5개 밖의 public 테이블(47개, `react_*` 제외)은 로그인 계정 정책에 재직 직원 조건을 붙인다(봉인 SQL 7절).
  - `authenticated` 정책과 역할 지정 없는(PUBLIC) 정책 83개의 USING·WITH CHECK를 `((SELECT public.is_active_staff()) AND <기존 식>)`으로 바꾼다. 이름·명령·역할·기존 식은 그대로다.
  - 재직 직원에게는 기존 규칙(`partners`·`contracts`·`comments` 등의 전권, 근태·휴가의 본인·역할·사업부 규칙)이 그대로 적용된다.
  - 승인 대기·거절·퇴사·휴면·사업부 없는 로그인 계정은 이 테이블들에서 0건이고 쓰기가 거부된다. 본인 근태·휴가·알림·푸시 토큰도 마찬가지다.
  - `clients`·`company_documents`에는 로그인 계정에만 걸리는 RESTRICTIVE 정책 "seal active staff only"를 더한다. 두 테이블의 공개 읽기 정책이 PUBLIC이라 그 정책을 바꾸지 않고 로그인 계정만 막기 위해서다.
  - 바꾸지 않는 것: `service_role` 정책, anon 정책(`portfolio_items` 공개 읽기), `clients` "Allow public read access", `company_documents` "company_documents read all", `push_tokens` "Service role can manage all push tokens".
  - anon 결과는 전과 같다. 예외는 `notifications` INSERT다. 전에는 PUBLIC `WITH CHECK (true)`라 비로그인도 알림을 넣을 수 있었고, 이제는 서버(서비스 권한)만 넣는다.
- 로그인 직후 안내 화면(승인 대기·거절)은 본인 `app_users` 행만 읽으므로 이 변경의 영향을 받지 않는다.
- 되돌리기는 `supabase/apply/20260925_seal_rollback.sql`이다. 봉인 밖 정책 83개도 기준선 본문으로 되돌리고 RESTRICTIVE 정책 2개를 지운다. 변경 기록 테이블과 `updated_by` 칸은 되돌린 뒤에도 남는다.

**봉인 뒤에도 남는 공개 범위**
- 비로그인 읽기 허용은 reactstudio.kr을 위한 것으로, `portfolio_items` 전체, `projects` 중 '완료', `clients` 전체다.
- `company_documents`는 비로그인도 전체를 읽는다(PUBLIC 읽기 정책). 이 표에는 통장사본·사업자등록증의 공개 URL이 있고 버킷 `company-docs`가 공개다. 미해결 문제로 따로 적었다(`docs/tracking/findings.md`).
- 로그인했지만 재직 직원이 아닌 계정으로 reactstudio.kr 공개 페이지를 보면 `portfolio_items`·`clients` 목록이 비어 보인다(그 페이지는 쿠키 세션으로 읽는다). reactstudio.kr은 비재직 계정의 관리 화면 로그인을 로그아웃시키므로 드문 경우다.
- `react_*` 13개 테이블은 정책이 0개다. 서비스 권한 키로만 접근되고, reactstudio.kr이 그 방식으로 쓴다.

### 명시적으로 허용하지 않는 것

- 회사 밖 사람(아티스트·파트너·거래처)의 ERP 로그인과 외부인 기능 사용. `artist`·`viewer` 역할을 새로 주지 않는다.
- 퇴사자·휴면·승인 대기·거절 계정과 사업부 없는 계정의 모든 읽기·쓰기.
- 관리자를 포함한 누구든 본인 역할·사업부·재직 상태를 바꾸는 것.
- 누구든 `paid`·`canceled` 매출·지출 행을 지우는 것.
- 리더가 다른 사업부의 프로젝트·할일·매출·지출을 만들거나 고치는 것.
- 관리자 아닌 사람의 되돌리기(`paid`→`planned`)와 되살리기(`canceled`→`planned`·`paid`).
- 서버 라우트가 요청 본문을 통째로 update에 넘기는 것. 허용 외 칸(`created_by`, `id`, `created_at`, `updated_by` 등)은 무시된다.

## 서버 권한 키 사용 원칙

`createPureClient()`는 RLS를 무시한다.
그래서 이 클라이언트를 쓰는 라우트는 DB 쿼리 **전에** 공통 재직 가드(`requireActiveStaff`)를 통과해야 하고, 그 뒤 `permissions.ts`로 역할·사업부를 판정한다.
- 공통 가드는 아래 예외를 뺀 모든 `/api/*` 라우트의 첫 줄이다.
- 가드 예외
  - 크론 라우트 5개: `CRON_SECRET` Bearer 확인
  - 본인 계정 상태 조회(`users/me/status`): 세션·`app_users` 행만 확인
  - 가입(`auth/signup`): 로그인 없이 부른다. `pending` 행만 만든다
  - 로그아웃
- 회사 서류 서명 URL은 재직 가드를 거친 `document-room` 라우트만 발급한다. 로그인 없이 서명 URL을 주던 `GET /api/storage/signed-url`은 삭제되었다.

## 크론 경로

- 크론 5개(자동 퇴근, 월·연 연차 부여, 마감 임박 알림, 기한 초과 알림)는 `Authorization: Bearer <CRON_SECRET>` 헤더만 받는다. Vercel 크론이 이 헤더를 자동으로 붙인다.
- 비교는 걸린 시간으로 값을 추측할 수 없는 방식(`timingSafeEqual`)으로 한다.
- `CRON_SECRET`이 비어 있으면 항상 401이다. 비밀값이 없을 때 통과시키지 않는다.
- 알림 크론의 `?key=` 쿼리 방식은 없어졌다. 쿼리로 비밀값을 보내도 통과하지 않는다.
- 운영 Vercel에 `CRON_SECRET`이 없는 채로 이 코드를 배포하면 크론 5개가 모두 401로 멈춘다. 설정과 배포를 같은 시점에 한다.

## 기록해야 하는 사건 (감사 대상)

| 사건 | 기록 위치 | 기록 내용 | 보는 사람 |
|---|---|---|---|
| 매출·지출 등록 | `activity_logs` `financial_created` + `financial_entry_changes`(`action='insert'`, 칸 `*`) | 변경 후 값 요약, 변경자, 출처 | 관리자, 행 사업부 리더, 등록자 |
| 매출·지출의 `amount`·`actual_amount`·`status`·`bu_code` 변경(취소·되돌리기·되살리기·카드 연결 이동 포함) | `financial_entry_changes`(`action='update'`, 칸마다 한 행) | 변경 전·후 값(글자), 변경자, 출처(`erp`/`external`), 시각 | 같음 |
| 직원 `role`·`bu_code`·`status` 변경(가입 승인·거절 포함) | `app_user_changes`(`action='update'`) | 같음 | 관리자만 |
| `paid`·`canceled` 삭제 시도 | 기록 없음 | 서버 409, DB 트리거 오류로 거부 | — |
| 재무 행 있는 프로젝트 삭제 시도 | 기록 없음 | 서버 409, DB 트리거 오류로 거부 | — |
| 프로젝트 생성·상태 변경 | `activity_logs` | 기존과 같음 | — |
| 할일 상태·담당자 변경 | `activity_logs` | 기존과 같음 | — |
| 시스템 강제 퇴근 | 근태 행 표시 + 알림 | 기존과 같음 | — |

- 변경 기록은 DB 트리거(BEFORE INSERT/UPDATE)가 남긴다. 그래서 reactstudio.kr의 서비스 권한 키 쓰기도 기록된다.
- 변경자 판정
  - ERP 서버는 쓰기마다 `updated_by`에 로그인 사용자를 넣는다.
  - update에서 `NEW.updated_by`가 비었거나 `OLD.updated_by`와 같으면 출처 `external`, 변경자 없음으로 기록한다.
  - insert는 `NEW.updated_by`만 본다. 있으면 `erp`, 없으면 `external`이다. `created_by`는 판정에 쓰지 않는다.
  - 기록한 뒤 트리거가 `updated_by`를 비운다. 다음 외부 쓰기가 옛 변경자를 물려받지 않게 하기 위해서다.
- 변경 기록 테이블은 `authenticated`·`anon`이 쓰거나 지울 수 없다. 트리거만 쓴다.
- 서버가 `updated_by`를 쓰고 기록을 조회하는 것은 서버 환경변수 `ERP_AUDIT_V2=1`일 때만이다. 꺼져 있으면 기록 조회 API는 빈 목록과 `enabled: false`를 돌려주고 화면은 기록 영역을 숨긴다.
- 봉인 SQL을 적용한 뒤 `ERP_AUDIT_V2=1`로 재배포하기 전까지 ERP 화면에서 한 변경은 `external`, 변경자 없음으로 기록된다. 이 시간대는 운영 보고에 적는다.

## 비밀값 관리

- 모든 키는 Vercel 프로젝트 환경변수와 로컬 `.env.local`(커밋 금지)에만 둔다.
- `NEXT_PUBLIC_` 접두 변수는 브라우저로 나간다. 익명 키·Firebase 웹 설정·VAPID 공개키만 여기에 둔다. 서비스 권한 키·Gowid·Gemini·Firebase Admin 키·`CRON_SECRET`·`ERP_AUDIT_V2`에는 절대 이 접두를 붙이지 않는다.
- `public/firebase-messaging-sw.js`에 들어 있는 Firebase 웹 API 키는 공개용 설정값이다. 비밀이 아니다.
- 키가 노출되면 발급처(Supabase·Gowid·Firebase·Google AI)에서 재발급하고 Vercel 환경변수를 바꾼 뒤 재배포한다. `CRON_SECRET`은 Vercel 값만 바꾸고 재배포하면 된다.
- 테스트 계정 정보는 `ERP_TEST_*` 환경변수로만 넣는다. 테스트 파일에 값을 쓰지 않는다.

## 민감 데이터 처리

- 급여·주민번호·계좌번호를 ERP 재무 행이나 메모에 넣지 않는다. 관리자·모든 리더와 그 프로젝트 참여자가 읽는 자리다.
- 할일·메모·댓글에 비밀번호를 적지 않는다.
- 자료실(`document-room`)의 통장사본·사업자등록증은 서명 URL로만 내보낸다. 서명 URL은 재직 가드를 거친 `document-room` 라우트만 발급한다.
