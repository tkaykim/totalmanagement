# src/features — 기타 기능

이 문서가 맡는 범위는 아래 표에 나온 폴더뿐이다.
`erp`, `attendance`, `leave`, `corporate-card`, `reservations`, `task-template`, `partners` 폴더는 이 문서의 범위가 아니다.

## 운영 중인 기능

| 폴더 | 맡는 것 | 지켜야 할 것 |
|---|---|---|
| `bug-reports` | 사내 버그리포트 칸반. 상태 `pending`·`on_hold`·`resolved`·`no_action` | 신고자 알림은 화면에서 `PATCH /api/bug-reports/[id]`로 `resolved`를 보낼 때만 나간다. 상태 enum을 추가하면 `BugReportsView`의 상태 목록·설정·빈 문구와 `types.ts` 라벨·색상을 같은 커밋에서 고친다 |
| `comments` | 프로젝트·할일 등에 다는 댓글, 첨부(`comment-attachments` 버킷), 멘션 읽음 표시 | 첨부는 비공개 버킷이다. 파일은 서명 URL로만 연다. 댓글 작성자(`app_users`) 행을 지우면 댓글이 연쇄 삭제된다 |
| `document-room` | 회사 공용 자료실(사업자등록증·통장사본·소개서 업로드·다운로드). 전 직원 메뉴 | 파일은 `document-room` 비공개 버킷에 있다. 서명 URL은 재직 가드를 거친 `document-room` 라우트만 발급한다. 로그인 없이 서명 URL을 주던 `/api/storage/signed-url`은 삭제되었다. 서명 URL을 발급하는 새 경로를 만들지 않는다 |
| `manuals` | 사업부 SOP 매뉴얼(리치 텍스트, 이미지). 할일 템플릿이 `manual_id`로 가리킨다 | 조회는 재직 직원 전원이 전 사업부 매뉴얼을 본다. 작성·수정은 admin 전체, leader·manager는 자기 사업부만(화면 판정). `manuals` 라우트는 재직 가드를 거친다 |
| `work-log` | 개인 업무일지(`daily_work_logs`), 관리자 열람(admin만) | 마지막 작성 2026-06-25. 작성자 행 삭제 시 연쇄 삭제된다 |
| `ai-work-insight` | 오늘 업무 요약 보고와 자연어 지시 해석(Gemini). 지시 실행은 `/api/ai/execute-command`가 프로젝트·할일·재무를 만든다 | 사용자는 `src/lib/ai/gemini.ts`의 지정 이메일 1명뿐이다. 이 제한을 역할 기준으로 넓히지 않는다. AI가 만든 재무 행도 매출·지출 권한(행 사업부 기준)과 기한·입금일 필수 규칙을 서버에서 똑같이 따른다. 사업부 목록은 `src/lib/business-units.ts`를 쓴다 |
| `push-test` | 관리자용 푸시 발송 시험 화면 | admin 메뉴에만 있다. 실제 직원에게 푸시가 나가므로 대상 사용자를 본인으로 두고 시험한다 |
| `exclusive-artists` | GRIGO 전속 아티스트를 통합 명부(`partners`)에서 골라 보여 주고 편집하는 사내 화면 | 사용 권한은 GRIGO·HEAD의 admin·leader·manager, 수정은 admin·leader. 아티스트 로그인 기능이 아니다. 명부 행을 직접 고치므로 거래처 명부와 같은 규칙(새 행이면 `owner_bu_code`와 `partner_bu_access` owner 행을 함께 생성)을 따른다 |

## 쓰지 않으며 정리할 기능

회사 밖 사람은 ERP에 로그인하지 않는다(대표 확정). 전속 아티스트 정산은 grigo-artist가 맡는다.
아래 기능은 운영 데이터가 0건이다. 서버는 누구에게나 403을 주고 메뉴에서 빠져 있다. 코드는 남아 있다. 새 기능을 얹거나 고치지 않고, 정리 작업 때 화면·라우트 코드를 걷어낸다.
테이블 삭제는 별도 승인을 받는다.

| 폴더·경로 | 내용 |
|---|---|
| `artist-dashboard`, `src/app/artist`, `src/app/api/artist/*` | 아티스트 본인용 화면(프로젝트·제안 응답·정산·할일·알림) |
| `settlement`, `src/app/api/partner-settlements/*`, 정산 화면(`SettlementView`)의 파트너 하위 탭 2개 | 파트너 수익배분 정산. 순이익 × `share_rate`로 파트너 몫을 계산한다. `partner_settlements` 0건. `SettlementView` 자체는 주 재무 화면(개요·미수금)이라 정리 대상이 아니다 |
| `src/app/api/projects/[id]/share-settings` | 프로젝트를 파트너·아티스트에게 공개(`visible_to_partner`, 0건) |

- 정리 전까지 이 기능을 살리는 방향의 수정(권한 확대, 메뉴 노출, 403 해제)을 하지 않는다.
- `artist`·`viewer` 역할 분기(`/artist` 리다이렉트, 메뉴 제외)는 사용자가 0명이다. 정리할 때 함께 걷어낸다.

## 공통으로 지켜야 할 것
- 각 기능의 서버 호출은 `api.ts` → `/api/*`를 거친다. 모든 라우트가 재직 가드를 거치므로 승인 대기·퇴사 계정은 403을 받는다.
- 사업부 선택지·라벨·색상은 `src/lib/business-units.ts`에서 가져온다. 폴더 안에 사업부 목록을 만들지 않는다.
- 새 메뉴는 `src/lib/permissions.ts`의 `getVisibleMenus`에 넣어야 보인다. 메뉴 노출과 서버 권한 확인은 별개다.
