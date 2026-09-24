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
| `npm run lint` | ESLint. 빌드 게이트는 아니다 |
| `npm run cap:sync` | 네이티브 프로젝트 동기화 |
| `npm run cap:android` / `cap:ios` | Android Studio / Xcode 열기 |

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
| `CRON_SECRET` | 서버 전용 | 크론 라우트 보호. 없으면 크론 라우트가 공개 호출된다 |

- 환경변수를 바꾸면 Vercel에서 재배포해야 반영된다.
- 서버 전용 값에 `NEXT_PUBLIC_`을 붙이면 브라우저 번들에 들어간다.

## 배포

1. 기능 브랜치에서 작업한 뒤 `npx tsc --noEmit`과 `npm run build`를 통과시킨다.
2. 변경한 화면을 로컬에서 직접 조작해 확인한다. 권한이 걸린 기능은 해당 역할 계정으로 확인한다.
3. 승인을 받은 뒤 `main`에 머지하고 push한다. Vercel이 자동으로 운영 배포한다(`totalmanagement.vercel.app`).
4. Vercel 배포 상태가 READY인지 확인한다. 실패하면 대개 타입 오류이니 빌드 로그를 보고 고친다.
5. 되돌릴 때는 Vercel에서 직전 운영 배포를 다시 승격(rollback)한다. DB 변경은 되돌려지지 않는다.

## 운영 DB 변경

1. 운영 스키마를 먼저 조회한다. 레포의 `supabase/migrations/`와 `schema_.sql`은 운영과 다르다.
2. 추가만 하는 SQL을 `supabase/migrations/YYYYMMDD_설명.sql`로 작성한다.
3. 대표 승인 뒤 운영에 적용한다.
4. 적용 후 같은 DB를 읽는 쪽이 계속 동작하는지 확인한다.
   - 사내 워커의 디제스트·월 손익
   - flowmaker 인력 목록
   - reactstudio.kr `/portfolio`
5. 대량 데이터 수정 전에는 되돌리기 SQL과 대상 id 목록을 먼저 저장해 둔다.

## 크론

`vercel.json`에 6개가 있다. 시각은 UTC다.
Vercel 대시보드의 Cron Jobs에서 실행 이력을 본다.
수동 실행이 필요하면 해당 경로를 GET으로 호출한다(`CRON_SECRET`이 있으면 헤더나 쿼리 키를 붙인다).

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

- 계정 생성·역할·사업부·퇴사 처리는 관리자의 사용자 편집 모달(`UserModals`)에서 한다. 이 화면은 `/api/users`를 거친다.
- 퇴사자는 `status`를 `retired`로 바꾼다. 계정 삭제는 하지 않는다.
- Supabase Auth 계정 비밀번호 초기화는 사용자가 `/forgot-password`에서 한다.
