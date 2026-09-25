# totalmanagement — 그리고엔터테인먼트 그룹 전사 ERP

## 프로젝트 개요

그리고엔터테인먼트 그룹 7개 사업부(GRIGO·DEETZ·FLOW·REACT·MODOO·AST·HEAD)의 프로젝트·할일·매출지출·근태·휴가·사내 자원을 관리하는 사내 ERP다.
재직 직원 15명 안팎이 웹(`totalmanagement.vercel.app`)과 Capacitor 모바일 앱으로 쓴다.
Next.js 15 앱 하나와 Supabase(`wqtoahrekijirxxpbfqg`)로 되어 있다.
이 DB는 reactstudio.kr, 사내 워커, flowmaker와 함께 쓴다.

2026-09-24 대표 결정으로 이 ERP가 전사 프로젝트 키·재무 허브가 되었다. 그 전제인 권한 봉인(재직 가드, 관리자·리더 전사 보기, 가입 승인, 확정 건 보호, 변경 기록)은 작업 브랜치에 구현되어 있지만 운영에는 반영되지 않았다. 코드 배포(승인 ①)와 DB 봉인 SQL 적용(승인 ②)을 따로 받는다.
운영 배포본은 `main`(`d504793`, 2026-06-09)이고, 운영 DB는 그보다 앞서 있다(DEETZ·내부배부 칸).
자동 테스트는 `npm test`(단위 + 로컬 PGlite DB)와 미리보기 대상 `npm run test:api`가 있다. CI는 없다.

## 구조

```
totalmanagements/
├── AGENTS.md / CLAUDE.md          → 이 문서(같은 내용). 개요·절대 규칙·작업 전 확인·문제 보고
├── docs/
│   ├── architecture.md            → 구성 요소 연결, 같은 DB를 쓰는 외부 시스템, 대표 흐름, 크론
│   ├── business-rules.md          → 사업부·프로젝트·할일·매출지출(권한·상태 전이·기한)·가입 승인·세금·인건비·근태·휴가·예약 규칙
│   ├── security.md                → 공개 저장소, 인증 흐름, 권한 표, RLS 현황, 감사 대상, 비밀값
│   ├── standards.md               → 커밋·배포·DB 변경·라우트·사업부 목록 규칙
│   ├── engineering-notes.md       → 함정(DB와 코드 시점 차이, 연쇄 삭제, 재직 판정 두 가지, 변경자 전달, 적용 스크립트 사본, 1,000행 절단, KST 등)
│   ├── operations.md              → 설치·명령어·테스트·환경변수·배포·권한 봉인 반영 순서·DB 변경·기준선·모바일 빌드 절차
│   ├── contracts.md               → 워커·flowmaker·reactstudio가 기대하는 스키마, 크론, API 응답 형식, 가입·승인 계약
│   └── tracking/
│       ├── status.md              → 운영 중인 기능, 정리 대상, 남은 일, 대표 결정 대기
│       ├── findings.md            → 아직 못 고친 문제(치명·높음·보통)
│       └── decisions/
│           ├── index.md           → 결정 기록 목록
│           └── 0001~0011-*.md     → 허브화, 지급 분리, 급여, 일 합계, 내부배부, 외부 로그인, 공개 저장소, 재무 권한(0011로 대체), 빈 지급 방식 해석, MODOO 주문 단위, 보기 범위·확정 건 보호
├── src/
│   ├── app/api/AGENTS.md          → 서버 라우트: 재직 가드와 예외, 매출·지출 쓰기 경로, update 입력, 크론
│   ├── lib/AGENTS.md              → Supabase 클라이언트 2종, permissions·auth-guard·business-units·feature-flags·cron-auth, 알림·푸시, KST
│   └── features/
│       ├── AGENTS.md              → 버그리포트·댓글·자료실·매뉴얼·업무일지·AI·전속 아티스트, 정리 대상 기능
│       ├── erp/AGENTS.md          → 프로젝트·할일·매출지출·정산·조직·가입 승인 화면
│       ├── attendance/AGENTS.md   → 출퇴근·자동 퇴근·근무 요청
│       ├── leave/AGENTS.md        → 연차 부여·반차·승인
│       ├── corporate-card/AGENTS.md → Gowid 법인카드·프로젝트 연결
│       ├── reservations/AGENTS.md → 회의실·장비·차량 예약
│       ├── task-template/AGENTS.md → 할일 템플릿 일괄 생성
│       └── partners/AGENTS.md     → 통합 거래처·인력 명부
├── supabase/AGENTS.md             → 마이그레이션·봉인 SQL·기준선 스냅샷·운영 적용/되돌리기 스크립트·Edge Function send-push
├── android/AGENTS.md              → Android 껍데기
└── ios/AGENTS.md                  → iOS 껍데기
```

## 절대 규칙

1. **저장소는 공개다.** 비밀번호·API 키·서비스 권한 키·실제 계정 정보·개인정보를 어떤 파일(코드·테스트·문서·SQL)에도 커밋하지 않는다.
2. **운영 DB에 쓰기 전에 대표 승인을 받는다.** 로컬 개발 서버도 운영 DB에 붙어 있다. 스키마는 추가만 하고, 기존 컬럼·enum 값을 지우거나 이름·의미를 바꾸지 않는다. 워커·flowmaker·reactstudio가 조용히 깨진다.
3. **`main`에 push하면 바로 운영 배포된다.** 승인 없이 `main`에 올리지 않는다. `npm test`와 `npm run build`(타입 오류 = 실패)가 통과해야 한다.
4. **모든 서버 라우트는 첫 줄에서 공통 재직 가드(`requireActiveStaff`)를 거치고, 권한 판정은 `src/lib/permissions.ts`만 쓴다.** 라우트·화면에 역할 조건을 새로 짜지 않고, update에 요청 본문을 통째로 넘기지 않는다.
5. **`paid`·`canceled` 매출·지출은 어떤 경로로도 지우지 않는다.** 직접 삭제·프로젝트 삭제·법인카드 연결 변경 모두 해당한다. 잘못 확정한 건은 `canceled`로 바꾼다. 개인 급여를 ERP에 넣지 않는다(사업부별 월 합계 1행만).

## 작업 전 확인

- 항상 `docs/standards.md`, `docs/engineering-notes.md`, 그리고 손댈 폴더의 `AGENTS.md`를 먼저 읽는다.
- **권한·로그인·API 라우트를 건드릴 때**: `docs/security.md`의 권한 표와 RLS 현황, `src/app/api/AGENTS.md`의 가드와 예외, `src/lib/AGENTS.md`의 재직 판정 두 가지. 봉인 SQL이 운영에 적용되기 전까지 PostgREST 직접 조회는 서버 가드와 무관하게 열려 있다. 봉인 뒤에는 모든 public 테이블(`react_*` 제외)이 재직 직원만 읽고 쓰지만, 봉인 5개 밖 테이블은 재직 직원에게 여전히 `authenticated` 전권인 곳이 많다. 판정을 바꾸면 `tests/unit`의 조합 표 테스트를 같이 고친다.
- **매출·지출·손익 코드를 건드릴 때**: `docs/business-rules.md`의 2-4~2-7절(상태 전이, 기한·입금일 필수, 행 사업부 기준 권한, 내부배부 손익, 금액 뜻, 인건비). 매출·지출을 쓰는 모든 경로(`financial-entries`, 법인카드 연결, AI 지시, 프로젝트 삭제)가 같은 판정을 부르는지 본다. 기존 행 금액을 보정하는 계산을 넣지 않는다.
- **스키마·enum·RLS·트리거를 바꿀 때**: `docs/contracts.md`의 외부 사용자 표, `supabase/AGENTS.md`, `docs/engineering-notes.md`의 "운영 DB와 코드가 서로 다른 시점"·"운영 적용 스크립트는 원본 SQL의 복사본" 항목, `docs/operations.md`의 봉인 반영 순서. 스키마는 운영 DB를 직접 조회해 확인하고, SQL은 `tests/db`(PGlite)로 검사한다. 새 DB 칸에 의존하는 서버 코드는 `ERP_AUDIT_V2` 스위치 뒤에 둔다.
- **사업부 목록·DEETZ를 다룰 때**: 목록·표시명·색상은 `src/lib/business-units.ts` 한 곳뿐이다. 다른 파일에 사업부 배열이나 라벨 맵을 만들지 않는다.
- **날짜·크론을 다룰 때**: KST 헬퍼와 UTC 크론 스케줄. 크론 인증은 `Authorization: Bearer <CRON_SECRET>`만이고, 비밀값이 없으면 크론이 멈춘다.
- **대량 조회·집계**: 1,000행 절단.
- **아티스트·파트너 포털, 파트너 정산을 건드릴 때**: 서버가 누구에게나 403을 주는 정리 대상이다. 살리는 방향으로 고치지 않는다. 정산 화면(`SettlementView`)의 개요·미수금 탭은 주 재무 화면이라 정리 대상이 아니다.

## 문제를 발견하면

즉시 사용자(대표)에게 알릴 것:
- 비밀값·실제 비밀번호·개인정보가 커밋되었거나 커밋되려 한다.
- 권한 우회: 로그인 없이, 또는 퇴사자·승인 전 계정·다른 사업부 직원이 재무·거래처·직원 정보를 읽거나 쓸 수 있는 새 경로를 확인했다.
- 운영 매출·지출 행이 사라졌거나(`paid`·`canceled` 삭제, 프로젝트 연쇄 삭제) 금액·상태·사업부가 기록 없이 바뀌었다.
- 봉인 SQL을 반영 순서(ERP 코드 배포 → reactstudio.kr 배포 → DB 적용)와 다르게 적용했거나, 적용 뒤 가입·reactstudio.kr 관리 화면·크론이 멈췄다.
- 운영 스키마·enum 변경으로 워커 디제스트·월 손익, flowmaker 명단, reactstudio.kr 공개 페이지가 깨졌거나 깨질 수 있다.
- 운영 배포가 실패했거나, 배포 후 로그인·출퇴근·푸시가 동작하지 않는다.

그 밖의 문제는 `docs/tracking/findings.md`에 조건·증상·영향·못 고친 이유·접근 방향으로 적는다.
