# 운영 절차

## 준비물

- Node.js와 npm. `package.json`에 `engines` 지정과 `.nvmrc`가 없으므로, Vercel 프로젝트 설정(Settings → General → Node.js Version)의 버전에 맞춘다.
- Vercel 계정의 `grigoents-projects/totalmanagement` 프로젝트 접근 권한(환경변수 받기용)
- 모바일 빌드를 할 때만: Android Studio(내장 JBR), Xcode(macOS)

## 처음 설치

```bash
git clone https://github.com/tkaykim/totalmanagement.git totalmanagements
cd totalmanagements
npm install
npx vercel link            # 팀 grigoents-projects, 프로젝트 totalmanagement 선택
npx vercel env pull .env.local
npm run dev                # http://localhost:3000
```

- `vercel env pull`은 `vercel link`가 끝나야 동작한다.
- `.env.local`이 없으면 `npm run dev`는 뜨지만, 로그인 순간 Supabase URL이 없어 실패한다.
- **로컬 개발 서버는 운영 DB에 붙는다.** 스테이징 DB는 없다. 로컬에서 저장·삭제한 것은 운영 데이터다. 운영 직원 데이터 대신 테스트 프로젝트를 만들어 확인하고, 끝나면 '보류'로 돌린다.

## 명령어

| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버(Turbopack) |
| `npx tsc --noEmit` | 타입 검사. Vercel 빌드 실패 원인의 대부분을 미리 잡는다 |
| `npm run build` | 운영 빌드. 배포 전에 반드시 통과해야 한다 |
| `npm test` | 단위 테스트(`tests/unit/**`)와 로컬 PGlite DB 테스트(`tests/db/**`). 운영 DB·네트워크를 쓰지 않는다. 배포 전에 반드시 통과해야 한다 |
| `npm run test:api` | 미리보기 배포를 대상으로 하는 API 통합 테스트(`tests/api/**`). 아래 테스트 환경변수가 필요하다 |
| `npm run lint` | ESLint. 빌드 게이트는 아니다 |
| `npm run cap:sync` | 네이티브 프로젝트 동기화 |
| `npm run cap:android` / `cap:ios` | Android Studio / Xcode 열기 |

- `npm test`의 DB 테스트는 `supabase/baseline/`의 기준선 DDL과 Supabase 흉내 객체(`scripts/schema/pglite-stubs.sql`)를 PGlite에 올린 뒤 봉인 SQL을 적용해 검사한다. `npm install`만 하면 돌고, Docker·Supabase CLI가 필요 없다.
- `npm run test:api`는 환경변수로 대상과 계정을 받는다. 값은 커밋되지 않는 `.env*`나 셸에서 넣는다. 운영 주소를 넣지 않는다.
  - `ERP_TEST_BASE_URL`: 미리보기 배포 주소
  - `ERP_TEST_SUPABASE_URL`·`ERP_TEST_SUPABASE_ANON_KEY`: 그 배포가 쓰는 Supabase 주소와 익명 키(로그인 토큰 발급용). 주소가 배포의 `NEXT_PUBLIC_SUPABASE_URL`과 다르면 세션 쿠키 이름이 어긋나 모든 요청이 401이 된다
  - 역할별 계정 `ERP_TEST_<ADMIN|LEADER|MEMBER|PENDING|RETIRED>_EMAIL`·`_PASSWORD`: 관리자, FLOW 리더, REACT 일반 직원, 승인 대기, 퇴사자. 이메일은 `e2e-` 접두
  - `ERP_TEST_VERCEL_BYPASS`(선택): 미리보기 배포 보호를 넘는 값
  - 변수가 비어 있는 스위트는 건너뛰고 종료 코드 0으로 끝난다. 통과로 착각하지 않도록 경고 출력을 확인한다.
  - 운영 DB에 금액 0 지출 행을 "[E2E] 권한 회귀 테스트" HEAD 프로젝트에만 만들고, 끝나면 `planned` 행을 취소하고 프로젝트를 '보류'로 둔다.

루트의 `test-*.js`는 Playwright로 로컬 화면을 눌러 보는 일회성 스크립트다. 자동 테스트가 아니다.
로그인 정보는 환경변수로만 받는다: `ERP_TEST_EMAIL`·`ERP_TEST_PASSWORD`(일반 테스트 계정), `ERP_TEST_ADMIN_EMAIL`·`ERP_TEST_ADMIN_PASSWORD`(`test-admin-worklog.js`의 관리자 계정).
값은 커밋되지 않는 `.env*` 파일이나 셸에서 넣는다. 예: `ERP_TEST_EMAIL=... ERP_TEST_PASSWORD=... node test-manual-editor.js`.
값이 비어 있으면 로그인 입력에서 Playwright가 오류를 낸다.

## 환경변수

| 이름 | 공개 범위 | 역할 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저 | Supabase 프로젝트 주소 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저 | 익명 키. RLS를 받는다 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 | RLS를 무시하는 키. `createPureClient`와 푸시 Edge Function 호출에 쓴다 |
| `GOWID_API_KEY` | 서버 전용 | 법인카드 API |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | 서버 전용 | AI 업무 요약·지시 해석. 모델 기본값은 코드에 있다 |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | 서버 전용 | FCM 직접 발송. 없으면 Edge Function `send-push`로 우회한다 |
| `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_VAPID_KEY` | 브라우저 | 웹 푸시 토큰 발급 |
| `CRON_SECRET` | 서버 전용 | 크론 라우트 보호. **필수.** 비어 있으면 크론 5개가 모두 401로 멈춘다. Vercel 크론이 `Authorization: Bearer` 헤더로 자동 전달한다 |
| `ERP_AUDIT_V2` | 서버 전용 | `1`일 때만 서버가 `updated_by`를 쓰고 변경 기록을 조회한다. 봉인 SQL을 적용하기 전 DB에서 `1`로 켜면 매출·지출·직원 수정이 DB 오류로 실패한다. 기본값(비어 있음)은 꺼짐 |

- 환경변수를 바꾸면 Vercel에서 재배포해야 반영된다.
- 서버 전용 값에 `NEXT_PUBLIC_`을 붙이면 브라우저 번들에 들어간다.

## 배포

1. 기능 브랜치에서 작업한 뒤 `npx tsc --noEmit`, `npm test`, `npm run build`를 통과시킨다.
2. 변경한 화면을 로컬이나 미리보기에서 직접 조작해 확인한다. 권한이 걸린 기능은 해당 역할 계정으로 확인하고, 권한 라우트를 바꿨으면 미리보기에서 `npm run test:api`를 돌린다.
3. 승인을 받은 뒤 `main`에 머지하고 push한다. Vercel이 자동으로 운영 배포한다(`totalmanagement.vercel.app`).
4. Vercel 배포 상태가 READY인지 확인한다. 실패하면 대개 타입 오류이니 빌드 로그를 보고 고친다.
5. 되돌릴 때는 Vercel에서 직전 운영 배포를 다시 승격(rollback)한다. DB 변경은 되돌려지지 않는다.

## 권한 봉인 반영 순서 (두 번의 대표 승인)

코드와 DB 봉인은 따로 승인받고, 이 순서를 바꾸지 않는다.
1. 미리보기(현재 운영 DB, `ERP_AUDIT_V2` 꺼짐)에서 역할별 `e2e-` 계정(관리자·리더·일반 직원·승인 대기·퇴사자)으로 확인하고 `npm run test:api`를 돌린다.
   - 테스트 재무 행은 금액 0으로, "[E2E]" 접두 HEAD 프로젝트에만 만든다. 지우지 않고 끝나면 그 프로젝트를 '보류'로 바꾼다.
   - 워커 디제스트·월 손익·기한 초과 경보가 달라지지 않았는지 확인한다.
2. **승인 ①**: 코드를 `main`에 반영한다(`ERP_AUDIT_V2` 꺼짐). 같은 시점에 운영 Vercel에 `CRON_SECRET`을 설정한다. 다음 크론 실행이 성공했는지 Vercel Cron Jobs에서 확인한다.
   - 이 코드는 봉인 전 DB에서 동작한다. 가입의 서버 경로 전환이 DB의 비로그인 INSERT 차단보다 먼저여야 가입이 끊기지 않는다.
3. reactstudio.kr 저장소의 봉인 대비 변경(가입 승인 정렬 + 관리 화면의 ERP 테이블 접근을 서버 라우트로 이전)이 운영에 배포되었는지 확인한다. 안 됐으면 4로 가지 않는다. 봉인 뒤 그 관리 화면이 멈춘다.
4. **승인 ②**
   - Supabase SQL 편집기(또는 MCP `execute_sql`)에서 `supabase/apply/20260925_seal_apply.sql`을 한 번에 실행한다. 한 트랜잭션으로 봉인 마이그레이션과 데이터 보정(사업부 없는 `active` 계정을 `pending`으로)을 적용하고, 끝에 확인 SELECT를 돌린다.
   - 데이터 보정은 대상이 2건 이상이면 스스로 중단한다(트랜잭션 전체 취소).
   - 확인 SELECT: 봉인 5개 테이블에 `authenticated` 쓰기 정책·`anon` INSERT가 없는지, 뷰 2개가 호출자 권한인지, 새 트리거가 있는지, 사업부 없는 재직 계정 0건, 외부 사용자 대표 조회 건수(완료 프로젝트, FLOW 재직자, 취소 아닌 재무 행)가 적용 전과 같은지.
   - 기준선 스냅샷은 실행하지 않는다.
   - 곧바로 Vercel에 `ERP_AUDIT_V2=1`을 설정하고 재배포한다. 적용부터 재배포 완료까지 ERP 화면의 변경은 "외부"로 기록되므로 그 시간대를 운영 보고에 적는다.
5. 적용 후 확인: 워커 디제스트·월 손익, flowmaker 명단, reactstudio.kr `/portfolio`·`/history`와 관리 화면(프로젝트·할일·재무), ERP 로그인·출퇴근·푸시·변경 기록 표시.
6. 문제가 생기면 `supabase/apply/20260925_data_fix_rollback.sql` → `supabase/apply/20260925_seal_rollback.sql` 순서로 실행한다. 데이터 보정 되돌리기는 봉인이 남긴 변경 기록으로 대상을 찾는다. 검증된 순서는 이것뿐이다. 되돌린 뒤 `ERP_AUDIT_V2`를 끄고 재배포한다.
7. 운영에 만든 `e2e-` 계정을 `retired`로 바꾼다.

## 운영 DB 변경

1. 운영 스키마를 먼저 조회한다. 레포의 `supabase/migrations/`와 `schema_.sql`은 운영과 다르다. `supabase/baseline/20260924_prod_snapshot.sql`은 2026-09-24 시점 사본이라 참고만 한다.
2. 추가만 하는 SQL을 `supabase/migrations/YYYYMMDD[HHMMSS]_설명.sql`로 작성한다.
3. `npm test`의 DB 테스트에 그 SQL을 검사하는 테스트를 넣는다. PGlite는 기준선 DDL 위에 SQL을 적용하므로 운영과 같은 정책·트리거 조합을 검사할 수 있다.
4. 운영 적용용 트랜잭션 스크립트와 되돌리기 스크립트를 `supabase/apply/`에 만든다. 적용 스크립트 안의 본문은 원본 SQL과 글자 그대로 같아야 한다.
5. 대표 승인 뒤 운영에 적용한다.
6. 적용 후 같은 DB를 읽는 쪽이 계속 동작하는지 확인한다.
   - 사내 워커의 디제스트·월 손익
   - flowmaker 인력 목록
   - reactstudio.kr `/portfolio`·`/history`와 관리 화면
7. 대량 데이터 수정 전에는 되돌리기 SQL과 대상 조건을 먼저 저장해 둔다. 공개 저장소이므로 사람 id·이메일을 파일에 적지 않는다.

## 기준선 스냅샷 다시 뜨기

운영 스키마가 크게 바뀌었을 때만 한다. 모두 읽기 전용 조회이고 운영에 쓰지 않는다.
1. `scripts/schema/extract-baseline.sql`을 Supabase MCP `execute_sql`로 실행하고 결과 JSON을 파일로 저장한다.
2. `node scripts/schema/build-baseline.mjs <결과.json>`으로 `supabase/baseline/` 파일을 만든다.
3. `scripts/schema/verify-baseline.sql`의 1번 쿼리로 운영 객체 개수를 받는다.
4. `node scripts/schema/check-baseline.mjs --prod '<1번 결과 JSON>'`으로 개수를 대조하고 PGlite 적재를 확인한다.
5. `npm test`를 돌려 DB 테스트가 새 기준선에서도 통과하는지 확인한다.

## 크론

`vercel.json`에 6개가 있다. 시각은 UTC다.
Vercel 대시보드의 Cron Jobs에서 실행 이력을 본다.
수동 실행이 필요하면 해당 경로를 GET으로 호출하고 `Authorization: Bearer <CRON_SECRET>` 헤더를 붙인다. 쿼리 키(`?key=`)는 받지 않는다.

## 모바일 앱

- 앱은 `https://totalmanagement.vercel.app`을 로드한다. 웹 배포만으로 앱 화면이 바뀐다.
- 네이티브 설정을 바꿨을 때만 다시 빌드한다.
  ```powershell
  npm run cap:sync
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
  cd android; .\gradlew.bat assembleDebug
  ```
  - 결과물: `android/app/build/outputs/apk/debug/app-debug.apk`
- 사용자 폴더 경로에 한글이 있으면 `$env:USERPROFILE`로 경로를 만들어야 깨지지 않는다.
- `android/app/google-services.json`과 `GoogleService-Info.plist`는 Firebase 콘솔에서 받아 로컬에만 둔다(커밋 금지).
- 앱 ID는 `com.grigo.totalmanagements`다.

## 사용자 관리

- 새 직원은 `/signup`으로 가입 신청하고, 본사 관리자가 조직 화면의 가입 신청 목록에서 사업부·역할을 정해 승인한다. reactstudio.kr 관리자 화면에서도 같은 규칙으로 승인할 수 있다.
- 계정 생성·역할·사업부·퇴사 처리는 관리자의 사용자 편집 모달(`UserModals`)에서 한다. 이 화면은 `/api/users`를 거친다. 본인 역할·사업부·재직 상태는 바꿀 수 없으므로 다른 관리자가 처리한다.
- 퇴사자는 `status`를 `retired`로 바꾼다. 계정 삭제는 하지 않는다.
- Supabase Auth 계정 비밀번호 초기화는 사용자가 `/forgot-password`에서 한다.
