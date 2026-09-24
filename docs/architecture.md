# 시스템 구성

## 전체 연결도

```
[직원 브라우저]──┐
[Android/iOS 앱]─┴─(WebView가 https://totalmanagement.vercel.app 을 그대로 로드)
        │
        ▼
[Next.js 앱 · Vercel 프로젝트 totalmanagement]
  ├─ 화면: `/`(메뉴 전환형 단일 대시보드) · /attendance · /leave · /login · /signup (/artist는 남아 있지만 서버가 403)
  ├─ /api/* 라우트 ── 공통 재직 가드(쿠키 세션 → app_users → 재직) → permissions.ts 판정 → 서비스 권한 키로 DB 접근
  └─ Vercel 크론 6개 ─────── /api/attendance/auto-checkout 등 (UTC 기준 스케줄)
        │                          │                 │              │
        ▼                          ▼                 ▼              ▼
[Supabase wqtoahrekijirxxpbfqg]  [Gowid API]   [Firebase FCM]   [Gemini API]
  Postgres · Auth · Storage        법인카드 사용   푸시 발송        AI 업무 요약·지시 해석
  Edge Function send-push          내역·승인
        ▲
        │ 같은 DB를 읽고 쓰는 다른 시스템
  ├─ reactstudio.kr: react_* 13개 테이블의 주인. 공개 페이지는 portfolio_items·projects(완료)·clients를 비로그인으로 읽고,
  │                  /admin은 projects·project_tasks·financial_entries(REACT 지출)·app_users에 직접 씀(가입 승인 포함)
  ├─ 사내 워커(tkay_personal/worker): projects·project_tasks·financial_entries·app_users를 읽어 디제스트·월 손익·과부하 탐지
  └─ flowmaker: app_users에서 FLOW 사업부 재직자 목록을 읽음
```

DB 하나를 ERP·reactstudio·워커·flowmaker가 함께 쓴다.
ERP 핵심 테이블에 쓰는 앱은 이 앱과 reactstudio.kr 관리자 화면 두 개다.
그래서 이 앱의 스키마·enum 값을 바꾸면 이 앱을 배포하지 않아도 다른 세 시스템의 동작이 바뀐다.

## 구성 요소와 의존 방향

| 구성 요소 | 역할 | 의존 방향 |
|---|---|---|
| `src/app/page.tsx` | 로그인 후 메인 셸. 승인 대기·거절 계정에는 안내 화면만 보여 주고, 재직 직원에게 권한별 사이드바 메뉴와 선택한 기능 화면을 한 페이지 안에서 바꿔 끼움 | → `src/features/*` 화면, `src/lib/permissions` |
| `src/features/<기능>` | 기능별 화면·react-query 훅·`api.ts`(fetch 래퍼) | → `/api/*`(HTTP), 일부는 브라우저 Supabase 클라이언트로 DB 직접 조회 |
| `src/app/api/<자원>` | 서버 라우트. 공통 재직 가드, 역할 판정, DB 읽기·쓰기, 활동 기록·알림 발송 | → `src/lib/auth-guard`, `src/lib/supabase/server`, `src/lib/permissions`, `src/lib/feature-flags`, `src/lib/notification-sender`, `src/lib/activity-logger` |
| `src/lib/auth-guard.ts` | 모든 라우트가 처음 부르는 재직 가드(세션 → `app_users` → 재직) | → `src/lib/supabase/server`, `src/lib/permissions` |
| `src/lib/business-units.ts` | 사업부 7개와 표시명·라벨·색상의 유일한 정의 | 의존 없음 |
| `src/lib/supabase` | `createClient`(쿠키 세션, 익명 키)와 `createPureClient`(서비스 권한 키, 쿠키 없음) 두 가지 서버 클라이언트, 브라우저 클라이언트 1개 | → Supabase |
| `src/lib/permissions.ts` | 역할 × 사업부 × 재직 × 등록자·PM·참여자 판정 함수(보기 범위, 쓰기, 상태 전이, 기한·입금일 검증, 메뉴). 서버와 화면이 같이 쓴다 | → `src/lib/business-units`(순수 함수) |
| `src/lib/notification-sender.ts` · `push-sender.ts` | `notifications` 행 생성 + 푸시. Firebase Admin 환경변수가 있으면 FCM 직접 발송, 없으면 Supabase Edge Function `send-push` 호출 | → Supabase, FCM |
| `supabase/` | 레포 마이그레이션(옛 31개, 2026-08-10 운영 직접 적용분 사본 2개, 봉인 SQL), 운영 스키마 기준선 사본(`baseline/`), 운영 적용·되돌리기 스크립트(`apply/`), Edge Function `send-push` | 마이그레이션 폴더만으로는 운영 스키마를 재구성할 수 없음. 기준선은 참고용 |
| `tests/` | 단위·PGlite DB 테스트(`npm test`), 미리보기 대상 API 테스트(`npm run test:api`) | → `src/lib`, `supabase/` SQL, 기준선 |
| `android/`, `ios/` | Capacitor 껍데기. 번들된 웹 자산 없이 운영 URL을 로드하고 푸시·위치·카메라 권한만 제공 | → 운영 웹앱 |

## 대표 흐름 — 매출·지출 한 건 등록

1. 직원이 프로젝트 상세에서 재무 입력 모달(`FinanceFormModals`)에 금액·지급 방식·지급처·기한(또는 입금일)·거래 범위를 넣는다. 화면은 지급 방식에 따라 실지급액을 미리 계산해 보여 주고, 권한 없는 버튼은 숨긴다.
2. react-query 변이 훅이 `POST /api/financial-entries`를 호출한다.
3. 라우트가 공통 재직 가드를 거친다: 쿠키 세션 클라이언트로 `auth.getUser()` → 서비스 권한 클라이언트로 `app_users` 행 → 재직 확인. 실패하면 401·403으로 끝난다.
4. 허용된 칸만 골라내고, 프로젝트를 읽어 `permissions.ts`로 등록 권한(행 사업부 기준)·거래 범위·기한·입금일을 판정한다. 볼 수 없는 프로젝트면 404, 권한 없으면 403, 입력 오류면 400이다.
5. `financial_entries`에 넣고 `created_by`를 세션 사용자로 채운다. `ERP_AUDIT_V2`가 켜져 있으면 `updated_by`도 채운다.
6. 봉인 SQL이 적용된 DB에서는 트리거가 `financial_entry_changes`에 insert 기록을 남기고 `updated_by`를 비운다.
7. `activity_logs`에 `financial_created`를 남기고 새 행을 돌려준다. 화면은 react-query 캐시를 무효화해 목록을 다시 읽는다.

수정(`PATCH /api/financial-entries/[id]`)은 3번까지 같고, 행을 볼 수 있는지(404) → 수정 권한(403) → 상태 전이·사업부 이동·기한 검증(403·400) 순으로 판정한 뒤 허용 칸만 update한다.
삭제는 `planned` 행만 되고 `paid`·`canceled`는 409다. 봉인 DB에서는 트리거도 거부한다.

## 대표 흐름 — 크론

Vercel 크론이 GET으로 호출하고 `Authorization: Bearer <CRON_SECRET>` 헤더를 붙인다(스케줄은 UTC). 라우트는 이 헤더만 확인한다.

| 경로 | UTC 스케줄 | 한국 시각 | 하는 일 |
|---|---|---|---|
| `/api/attendance/auto-checkout` | 매일 14:59 | 23:59 | 퇴근 미기록 출근 기록을 강제 퇴근 처리하고 본인에게 알림 |
| `/api/leave/auto-generate-monthly` | 매일 00:00 | 09:00 | 입사 1년 미만 직원에게 입사일 기준 월 1일 연차 부여 |
| `/api/leave/auto-generate-yearly` | 1월 1일 00:00 | 1월 1일 09:00 | 1년 이상 근속자 연차 일괄 부여 |
| `/api/notifications/due-soon?days=1` · `?days=3` | 매일 00:00 | 09:00 | 마감 임박 할일 담당자 알림 |
| `/api/notifications/overdue` | 매일 01:00 | 10:00 | 기한 지난 할일 알림 |

## 경계 — 무엇이 넘나들고 무엇이 넘나들지 않는가

- 지급 실행(이체 파일·계좌 검증)은 이 시스템 밖(deetz·grigo-artist·원샷크루 앱)에 있다. ERP는 그 결과를 읽고 연결해서 보여 주는 쪽이다.
- Clobe(계좌·카드·세금계산서 증빙)는 이 앱과 코드로 연결되어 있지 않다. 증빙 연결은 `financial_entries.payment_ref`에 거래 ID를 적는 방식이고, 현재 거의 비어 있다.
- 모두의 유니폼 주문 상세는 modoo 자체 DB에 있고 ERP로 자동 동기화되지 않는다. ERP의 MODOO 프로젝트는 사람이 손으로 만든 것이다.
- 전사 재무 통제 콘솔은 별도 브랜치(`feat/unified-finance-control-dev`)의 DEV 구현만 있고 운영 배포되지 않았다.
- 가입 승인 창구는 ERP 조직 화면과 reactstudio.kr 관리자 화면 두 곳이다. 둘 다 같은 `app_users` 칸에 쓰고, 같은 규칙(사업부 7개, 역할 4개, 본사 관리자만)을 따른다.
