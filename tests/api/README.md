# API 권한 회귀 테스트 (`tests/api`)

실제 배포(Vercel 미리보기) 주소의 ERP API를 역할별 테스트 계정으로 불러 권한 규칙을 확인한다.
근거는 spec V1·R1~R24·15절, plan T15다.
단위 테스트(`tests/unit`)·DB 테스트(`tests/db`)와 달리 네트워크와 실제 DB를 쓴다.

## 실행

```bash
ERP_TEST_BASE_URL=https://<미리보기 주소> \
ERP_TEST_SUPABASE_URL=https://<ref>.supabase.co \
ERP_TEST_SUPABASE_ANON_KEY=<익명 키> \
ERP_TEST_ADMIN_EMAIL=... ERP_TEST_ADMIN_PASSWORD=... \
ERP_TEST_LEADER_EMAIL=... ERP_TEST_LEADER_PASSWORD=... \
ERP_TEST_MEMBER_EMAIL=... ERP_TEST_MEMBER_PASSWORD=... \
ERP_TEST_PENDING_EMAIL=... ERP_TEST_PENDING_PASSWORD=... \
ERP_TEST_RETIRED_EMAIL=... ERP_TEST_RETIRED_PASSWORD=... \
npm run test:api
```

환경변수가 하나도 없으면 모든 스위트가 건너뛰고 종료 코드 0으로 끝난다.
일부만 있으면 필요한 변수가 채워진 스위트만 돈다.
건너뛴 스위트는 빠진 변수 이름을 경고로 출력한다.

## 한 번에 실행 (`npm run e2e:all`)

계정 준비부터 보고서까지 한 명령으로 돈다.
`.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`·`SUPABASE_SERVICE_ROLE_KEY`가 있어야 한다.

```bash
npm run e2e:all
```

1. `scripts/e2e/setup-accounts.mjs`: `e2e-*@example.com` 계정 5개(관리자 HEAD·FLOW 리더·REACT 멤버·승인 대기·퇴사)를 만들거나 맞춘다. 비밀번호는 매번 새로 만들어 `.env.e2e.local`에만 쓴다(커밋 안 됨).
2. 이 폴더의 API 테스트를 운영 주소(`ERP_TEST_BASE_URL`, 기본 `https://totalmanagement.vercel.app`)로 돌린다. `ERP_TEST_AUDIT_V2=1`이 기본이다(운영이 켜짐).
3. `scripts/e2e/ui-e2e.mjs`: 역할별로 로그인 화면에서 로그인해 메뉴 화면을 차례로 열고 5xx·예외·재직 계정의 401/403·오류 문구·스크린샷을 모은다. 쓰기 버튼은 누르지 않는다.
4. 테스트 계정 5개를 퇴사로 돌린다(`--keep-accounts`로 건너뜀). 다음 실행 때 1단계가 다시 맞춘다.
5. 결과: `e2e-report/report.md`, `vitest.json`, `ui-results.json`, `shots/` (커밋 안 됨).

## 환경변수

값은 셸이나 CI 비밀값으로만 넣는다.
저장소가 공개이므로 코드·문서·커밋에 실제 값을 적지 않는다.

| 변수 | 내용 |
|---|---|
| `ERP_TEST_BASE_URL` | 테스트할 ERP 주소(미리보기 배포). 끝의 `/`는 없어도 된다 |
| `ERP_TEST_SUPABASE_URL` | 그 배포가 쓰는 Supabase 주소. 배포의 `NEXT_PUBLIC_SUPABASE_URL`과 같아야 한다(쿠키 이름 `sb-<ref>-auth-token`이 여기서 정해진다) |
| `ERP_TEST_SUPABASE_ANON_KEY` | 같은 프로젝트의 익명 키. 로그인 토큰 발급에만 쓴다 |
| `ERP_TEST_ADMIN_EMAIL` / `_PASSWORD` | 재직 관리자(`role='admin'`) |
| `ERP_TEST_LEADER_EMAIL` / `_PASSWORD` | 재직 FLOW 리더(`role='leader'`, `bu_code='FLOW'`) |
| `ERP_TEST_MEMBER_EMAIL` / `_PASSWORD` | 재직 REACT 일반 직원(`role='member'`, `bu_code='REACT'`) |
| `ERP_TEST_PENDING_EMAIL` / `_PASSWORD` | 승인 대기 계정(`status='pending'`) |
| `ERP_TEST_RETIRED_EMAIL` / `_PASSWORD` | 퇴사 계정(`status='retired'`) |
| `ERP_TEST_VERCEL_BYPASS` | 선택. 미리보기 배포 보호가 켜져 있으면 "Protection Bypass for Automation" 값을 넣는다. `x-vercel-protection-bypass` 헤더로 보낸다 |

테스트 계정 이메일은 `e2e-` 접두를 쓴다.
운영에 만든 테스트 계정은 작업이 끝나면 퇴사 처리한다.

## 로그인 방식

Supabase REST `POST /auth/v1/token?grant_type=password`로 세션을 받는다.
서버(`src/lib/supabase/server.ts`, `@supabase/ssr`)가 읽는 쿠키 `sb-<ref>-auth-token`에 세션을 넣어 보낸다.
쿠키 값은 `base64-` + base64url(세션 JSON)이고, 3,180자를 넘으면 `.0`, `.1` 조각 쿠키로 나눈다.
구현은 `_support/http.ts`다.

## 테스트 데이터 규칙 (반드시 지킨다)

- 재무 테스트 행은 금액 0인 지출(`expense`) 행만 만든다.
- 재무 행은 HEAD 사업부의 "[E2E]" 전용 프로젝트(`[E2E] 권한 회귀 테스트`)에만 붙인다.
- 그 프로젝트가 없으면 관리자 계정으로 API를 통해 만들고, 있으면 다시 쓴다.
- `planned` 행의 기한은 `2099-12-31`로 둔다. 기한 초과·마감 임박 경보에 걸리지 않게 하기 위해서다.
- `paid`·`canceled` 행은 지우지 않는다. 삭제 요청은 409가 나오는지 확인할 때만 보낸다.
- 프로젝트 삭제 요청은 재무 행이 붙어 있음을 먼저 확인한 뒤에만 보낸다. 409가 나와야 한다.
- 끝나면 남은 `planned` 테스트 행을 `canceled`로 바꾸고, 참여자를 비우고, 프로젝트를 '보류'로 바꾼다. 프로젝트는 지우지 않는다.
- "[E2E]"가 아닌 데이터는 읽기만 한다. 쓰기 직전에 `_support/e2e-data.ts`의 안전장치가 대상을 확인한다.
- 가입 테스트는 400 경우와, 이미 있는 테스트 계정 이메일의 409만 확인한다. 새 가입 계정은 만들지 않는다.
- 크론은 비밀값 없이·틀린 비밀값으로만 부른다. 올바른 비밀값으로는 부르지 않는다.
- 한 번 실행할 때마다 금액 0 행이 4개(관리자 `planned`→`canceled` 1, 관리자 `paid` 1, 멤버 `paid` 1, 멤버 `canceled` 1) 쌓인다.

## 스위트

| 파일 | 확인 내용 | 필요한 변수 |
|---|---|---|
| `auth-gates.test.ts` | 비로그인 401, 승인 대기·퇴사 403(projects·financial-entries·tasks·users·attendance/status·leave/requests), 본인 상태 조회 예외 | 주소 + PENDING·RETIRED |
| `e2e-project-finance.test.ts` | 리더의 전사 보기와 다른 사업부 수정·삭제 403, 비참여 멤버 404, 허용 외 칸 무시, 기한·입금일 400, `paid`·`canceled` 삭제 409, 되돌리기·되살리기 관리자만, 재무 있는 프로젝트 삭제 409(보류 안내), 스위치 끔 상태 수정 정상, 변경 기록 API `{changes:[], enabled:false}` | 주소 + ADMIN·LEADER·MEMBER |
| `signup-contract.test.ts` | 가입 400(누락·8자 미만·사업부 오류), 기존 이메일 409, 가입 신청 목록 비로그인 401·본사 관리자 아님 403 | 주소 (+ PENDING·RETIRED·LEADER·MEMBER) |
| `cron-auth.test.ts` | `GET /api/notifications/overdue` Bearer 없음·틀림·옛 `?key=` → 401 | 주소 |

변경 기록 확인은 `ERP_TEST_AUDIT_V2`로 배포의 스위치 값을 알려 준다. `1`이면 켜짐 검증 3건(ERP 기록, 다른 사업부 리더 403, 직원 기록 배열)을, 비우면 꺼짐 검증 2건을 돈다.
