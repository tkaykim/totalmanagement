# src/features — 기타 기능

이 문서가 맡는 범위는 아래 표에 나온 폴더뿐이다.
`erp`, `attendance`, `leave`, `corporate-card`, `reservations`, `task-template`, `partners` 폴더는 이 문서의 범위가 아니다.

## 운영 중인 기능

| 폴더 | 맡는 것 | 지켜야 할 것 |
|---|---|---|
| `bug-reports` | 사내 버그리포트 칸반. 상태 `pending`·`on_hold`·`resolved`·`no_action` | 신고자 알림은 화면에서 `PATCH /api/bug-reports/[id]`로 `resolved`를 보낼 때만 나간다. 상태 enum을 추가하면 `BugReportsView`의 상태 목록·설정·빈 문구와 `types.ts` 라벨·색상을 같은 커밋에서 고친다 |
| `comments` | 프로젝트·할일 등에 다는 댓글, 첨부(`comment-attachments` 버킷), 멘션 읽음 표시 | 첨부는 비공개 버킷이다. 파일은 서명 URL로만 연다. 댓글 작성자(`app_users`) 행을 지우면 댓글이 연쇄 삭제된다 |
| `document-room` | 회사 공용 자료실(사업자등록증·통장사본·소개서 업로드·다운로드). 전 직원 메뉴 | 파일은 `document-room` 비공개 버킷에 있다. 서명 URL 발급 라우트(`/api/storage/signed-url`)는 현재 로그인 확인이 없다. 이 기능을 고칠 때 로그인한 재직 직원만 받게 한다 |
| `manuals` | 사업부 SOP 매뉴얼(리치 텍스트, 이미지). 할일 템플릿이 `manual_id`로 가리킨다 | 조회는 전원이 전 사업부 매뉴얼을 본다. 작성·수정은 admin 전체, leader·manager는 자기 사업부만(화면 판정). `manuals` 라우트는 로그인 확인이 없다 |
| `work-log` | 개인 업무일지(`daily_work_logs`), 관리자 열람(admin만) | 마지막 작성 2026-06-25. 작성자 행 삭제 시 연쇄 삭제된다 |
| `ai-work-insight` | 오늘 업무 요약 보고와 자연어 지시 해석(Gemini). 지시 실행은 `/api/ai/execute-command`가 프로젝트·할일·재무를 만든다 | 사용자는 `src/lib/ai/gemini.ts`의 지정 이메일 1명뿐이다. 이 제한을 역할 기준으로 넓히지 않는다. AI가 만든 재무 행도 매출·지출 권한·삭제 금지 규칙을 따른다. 사업부 목록이 6개로 하드코딩되어 DEETZ를 모른다 |
| `push-test` | 관리자용 푸시 발송 시험 화면 | admin 메뉴에만 있다. 실제 직원에게 푸시가 나가므로 대상 사용자를 본인으로 두고 시험한다 |
| `exclusive-artists` | GRIGO 전속 아티스트를 통합 명부(`partners`)에서 골라 보여 주고 편집하는 사내 화면 | 사용 권한은 GRIGO·HEAD의 admin·leader·manager, 수정은 admin·leader. 아티스트 로그인 기능이 아니다. 명부 행을 직접 고치므로 거래처 명부와 같은 규칙(새 행이면 `owner_bu_code`와 `partner_bu_access` owner 행을 함께 생성)을 따른다 |

## 쓰지 않으며 정리할 기능

회사 밖 사람은 ERP에 로그인하지 않는다(대표 확정). 전속 아티스트 정산은 grigo-artist가 맡는다.
아래 기능은 운영 데이터가 0건이다. 새 기능을 얹거나 고치지 않고, 정리 작업 때 화면·라우트·메뉴를 걷어낸다.
테이블 삭제는 별도 승인을 받는다.

| 폴더·경로 | 내용 |
|---|---|
| `artist-dashboard`, `src/app/artist`, `src/app/api/artist/*` | 아티스트 본인용 화면(프로젝트·제안 응답·정산·할일·알림) |
| `settlement`, `src/features/erp/components/SettlementView.tsx`, `src/app/api/partner-settlements/*` | 파트너 수익배분 정산. 순이익 × `share_rate`로 파트너 몫을 계산한다. `partner_settlements` 0건 |
| `src/app/api/projects/[id]/share-settings` | 프로젝트를 파트너·아티스트에게 공개(`visible_to_partner`, 0건) |

- 정리 전까지 이 기능을 살리는 방향의 수정(권한 확대, 메뉴 노출)을 하지 않는다.
- `artist`·`viewer` 역할 분기(`/artist` 리다이렉트, 메뉴 제외)는 사용자가 0명이다. 정리할 때 함께 걷어낸다.

## 공통으로 지켜야 할 것
- 각 기능의 서버 호출은 `api.ts` → `/api/*`를 거친다.
- 새 메뉴는 `src/lib/permissions.ts`의 `getVisibleMenus`에 넣어야 보인다. 메뉴 노출과 서버 권한 확인은 별개다.
