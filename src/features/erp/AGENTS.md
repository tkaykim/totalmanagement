# src/features/erp — 프로젝트·할일·매출지출·정산·조직

## 맡는 것
- 메인 대시보드(`DashboardView`, `BuTabs`)
- 프로젝트 목록·상세·생성·수정(`ProjectsView`, `ProjectDetail*`, `UnifiedProjectModal`, `ProjectModal`). 사업부 역할 칸 3개(`brand_bu_code`, `delivery_bu_code`, `artist_management_bu_code`) 입력·표시 포함
- 할일(`TasksView`, `UnifiedTaskModal`)
- 매출·지출 입력과 표시(`FinanceFormModals`, `FinanceRow`, `ProjectDetailFinance`, `OutstandingTab`)와 순수 도우미 `finance-ui.ts`(버튼 표시 판정, 상태 전이 버튼, 기한·입금일 입력 규칙과 보낼 값, 탭별 행·손익 합계, 서버 오류 문구)
- 정산 화면(`SettlementView`): 주 재무 화면이다. 개요(사업부별 매출·지출)와 미수금 탭을 관리자와 모든 리더가 쓴다. 파트너 하위 탭 2개(프로젝트별 분배, 정산서 관리)는 숨겨져 있다.
- 변경 기록 목록(`ChangeLogList`, 공용 도우미 `change-log.ts`): 매출·지출 수정 모달과 사용자 편집 모달에 붙는다
- 조직·사용자(`OrganizationView`, `OrgModals`, `UserModals`)와 가입 신청 목록·승인·거절(`SignupRequestsPanel`, 본사 관리자에게만 보임)
- 프로젝트 손익 보고 모달(`ProjectPnlReportModal`, 운영 데이터 0건)
- 관리자 리소스 현황(`AdminResourceView`)
- 이 기능들의 fetch 래퍼(`api.ts`), react-query 훅(`hooks.ts`), DB 행 ↔ 화면 타입 변환(`utils.ts`)

## 맡지 않는 것
- 권한 규칙. `src/lib/permissions.ts`에 있다. 이 폴더의 `lib/financePermissions.ts`는 `src/lib/financePermissions.ts`를 다시 내보낼 뿐이고, 그 파일도 화면 타입을 판정 타입으로 바꾸는 어댑터다. 여기에 역할 조건을 새로 쓰지 않는다.
- 서버 권한 판정과 DB 쓰기. `src/app/api/*` 라우트가 한다. 이 폴더의 권한 검사는 버튼 표시용이고 보안 경계가 아니다.
- 사업부 목록·표시명·색상. `src/lib/business-units.ts`의 `BU_CODES`·`BU_META`·`BU_SELECT_OPTIONS` 등을 가져다 쓴다. 이 폴더에 사업부 배열이나 라벨 맵을 만들지 않는다.
- 근태·휴가·예약·법인카드·거래처 화면. 각자 자기 폴더에 있다.
- 파트너 수익배분 정산(정산 화면의 숨긴 하위 탭, `partner_settlements`). 서버가 누구에게나 403을 준다. 다시 보이게 하지 않는다.
- 지급 실행·계좌 정보. ERP 밖(deetz·grigo-artist)의 일이다.

## 지켜야 할 것
- **할일 상태 표기**: 화면은 `in-progress`·`on-hold`를 쓰고 DB는 `in_progress`·`on_hold`다. 새 화면에서 DB 값을 직접 쓰면 필터가 어긋난다. 변환은 `utils.ts`와 서버 라우트가 한다.
- **할일 사업부**: 할일 입력 화면에 사업부 선택을 두지 않는다. 할일 사업부는 소속 프로젝트가 정하고 서버가 입력을 무시한다.
- **실지급액 계산**: `vat_included`=×1.1, `tax_free`=×1, `withholding`=×0.967, `actual_payment`=×1, 비어 있으면 계산하지 않는다. 입력 모달과 `app/page.tsx`의 `calculateActualAmount`가 같은 결과를 내야 한다.
- **손익 합계**(`finance-ui.ts`의 `summarizePnl`·`filterEntriesForTab`·`summarizeProjectPnl`)
  - `canceled`를 빼고 `amount`로 더한다.
  - 사업부 탭은 **행**의 `bu_code`가 그 사업부인 행을 모두 더한다(내부배부 포함, "내부" 표시). 프로젝트 사업부로 묶지 않는다.
  - '전체' 탭과 전사 합계는 `entry_scope='internal_allocation'`을 뺀 회사 손익이다.
  - 프로젝트 상세는 외부 손익과 내부배부 합계를 나눠 보여 준다.
  - 손익을 새로 계산하는 코드는 이 함수들을 쓴다. 따로 더하면 탭마다 숫자가 달라진다.
- **기존 금액의 뜻**: 기존 행에 부가세 역산·보정을 넣지 않는다.
- **버튼 표시 = 서버 규칙**: 수정·삭제·상태 버튼은 `getFinanceEntryActions`·`getAvailableTransitions`(내부에서 `permissions.ts` 판정)로 정한다.
  - 삭제 버튼은 `planned` 행에만 보인다. `paid`·`canceled`는 누구에게도 삭제 버튼이 없다. 잘못 확정한 건은 "취소" 전이 버튼으로 처리한다.
  - 되돌리기(`paid`→`planned`)·되살리기(`canceled`→`planned`·`paid`) 버튼은 관리자에게만 보인다.
  - 리더에게 다른 사업부 행은 보기 전용이다.
- **기한·입금일 입력**
  - `planned`로 저장할 때 `due_date` 입력이 필수다. `paid`로 저장·전환할 때 입금일이 필수이고 기본값은 오늘(한국 날짜)이다.
  - 기한 없는 옛 `paid`·`canceled` 행은 기한 없이 저장할 수 있어야 한다. `buildFinanceDateFields`는 수정 때 바뀐 날짜 칸만 보낸다. 모든 칸을 항상 보내게 바꾸면 옛 행 저장이 400으로 막힌다.
  - 날짜는 `YYYY-MM-DD`로 보낸다. 화면 표시는 `paidAtToKstDate`로 한국 날짜로 바꾼다.
- **거래 범위 입력**: 내부배부를 고르면 상대 사업부가 필수이고 행 사업부와 달라야 한다. 외부 거래는 상대 사업부를 비워 보낸다.
- **서버 오류 문구**: 409(확정 건 삭제, 재무 있는 프로젝트 삭제)·403·400 응답의 `{ error }`는 `apiErrorMessage`·`errorToMessage`로 사용자 문구로 바꿔 보여 준다. 프로젝트 삭제 409는 "보류로 바꾸세요" 문구를 그대로 보여 준다.
- **변경 기록 표시**: `ChangeLogList`는 API 응답 `enabled`가 거짓이면 아무것도 그리지 않는다. 브라우저 환경변수로 스위치를 판단하지 않는다.
- **완료 처리**
  - 운영 원칙상 프로젝트를 '완료'로 닫기 전에 받을 돈이 매출 `planned` + `due_date`로 등록되어 있어야 한다. 현재 화면은 이를 확인하지 않는다.
  - '완료' 프로젝트는 reactstudio.kr에 비로그인으로 공개된다.
  - 프로젝트 상태에 '취소'는 없다. 취소된 건은 '보류'로 둔다.
- **가입 신청 목록**: 본사 관리자(HEAD 소속 관리자)에게만 보인다. 승인 때 사업부 7개·역할 4개(`admin`·`leader`·`manager`·`member`)만 고를 수 있다. `viewer`·`artist`를 선택지에 넣지 않는다.
- **사용자 편집**: 본인 계정의 역할·사업부·재직 상태 칸은 서버가 403으로 거부한다. 화면에서 본인 값을 바꾸는 흐름을 만들지 않는다.
- **인건비 입력**: 개인 이름이 들어간 인건비 행을 만드는 입력 흐름을 추가하지 않는다. 인건비는 사업부별 월 합계 1행이다.

## 구현 방식
- 데이터 흐름: `hooks.ts`의 `useXxx` → `api.ts`의 fetch → `/api/<자원>`. 변이 후에는 해당 queryKey를 무효화한다.
- 이 폴더 코드에서 브라우저 Supabase 클라이언트로 `projects`·`financial_entries`·`project_tasks`·`app_users`에 쓰지 않는다. 봉인 뒤 DB가 이 쓰기를 거부한다.
- 대형 파일(`UnifiedProjectModal.tsx` 약 2,200줄, `app/page.tsx` 약 2,900줄)에 기능을 더 얹지 말고, 하위 컴포넌트나 `finance-ui.ts` 같은 순수 모듈로 나눠 추가한다.

## 테스트할 것
- 역할별(관리자, 같은 사업부 리더, 다른 사업부 리더, 등록자 member, 비등록 member) 매출·지출 버튼 노출과 실제 API 결과가 일치하는가.
- `paid` 행에 삭제 버튼이 없고, 취소 전이가 등록자·행 사업부 리더·관리자에게만 보이는가.
- 기한 없는 옛 `paid` 행을 고쳐 저장할 수 있는가.
- DEETZ 프로젝트가 목록·탭·손익에 나타나는가.
- 사업부 탭 손익(내부배부 포함)과 '전체' 손익(내부배부 제외)이 규칙대로 나오는가.
- 1,000건을 넘는 목록(프로젝트·재무)이 잘리지 않는가.
- 지급 방식별 실지급액과 반올림.
- 화면 도우미는 `tests/unit/`에서 React 없이 검사한다.
