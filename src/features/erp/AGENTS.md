# src/features/erp — 프로젝트·할일·매출지출·조직

## 맡는 것
- 메인 대시보드(`DashboardView`, `BuTabs`)
- 프로젝트 목록·상세·생성·수정(`ProjectsView`, `ProjectDetail*`, `UnifiedProjectModal`, `ProjectModal`)
- 할일(`TasksView`, `UnifiedTaskModal`)
- 매출·지출 입력과 표시(`FinanceFormModals`, `FinanceRow`, `ProjectDetailFinance`, `OutstandingTab`)
- 프로젝트 손익 보고 모달(`ProjectPnlReportModal`, 운영 데이터 0건)
- 조직·사용자(`OrganizationView`, `OrgModals`, `UserModals`)
- 관리자 리소스 현황(`AdminResourceView`)
- 이 기능들의 fetch 래퍼(`api.ts`), react-query 훅(`hooks.ts`), DB 행 ↔ 화면 타입 변환(`utils.ts`)

## 맡지 않는 것
- 서버 권한 판정과 DB 쓰기. `src/app/api/*` 라우트가 한다. 이 폴더의 권한 검사는 버튼 표시용이고 보안 경계가 아니다.
- 근태·휴가·예약·법인카드·거래처 화면. 각자 자기 폴더에 있다.
- 파트너 정산 화면(`SettlementView`). 쓰이지 않는 기능이라 정리 대상이다. 손대지 말고 제거 작업 때만 건드린다.
- 지급 실행·계좌 정보. ERP 밖(deetz·grigo-artist)의 일이다.

## 지켜야 할 것
- **사업부 코드**
  - 운영 DB에는 `GRIGO, DEETZ, FLOW, REACT, MODOO, AST, HEAD` 7개가 있다.
  - 이 폴더와 `src/lib/permissions.ts`, `src/types/database.ts`의 목록은 DEETZ가 빠진 6개다.
  - 사업부 목록을 새로 하드코딩하지 말고, 목록을 고칠 때는 모든 하드코딩 위치를 한 커밋에서 맞춘다.
- **할일 상태 표기**: 화면은 `in-progress`·`on-hold`를 쓰고 DB는 `in_progress`·`on_hold`다. 새 화면에서 DB 값을 직접 쓰면 필터가 어긋난다. 변환은 `utils.ts`와 서버 라우트가 한다.
- **실지급액 계산**: `vat_included`=×1.1, `tax_free`=×1, `withholding`=×0.967, `actual_payment`=×1, 비어 있으면 계산하지 않는다. 입력 모달과 `app/page.tsx`의 `calculateActualAmount`가 같은 결과를 내야 한다.
- **손익 합계**
  - `canceled`를 빼고 `amount`로 더한다.
  - 운영 DB의 `entry_scope='internal_allocation'` 행은 전사 연결손익에서 빼야 하는데, 이 폴더는 아직 그 칸을 모른다.
  - 손익을 새로 계산하는 코드는 `entry_scope`를 읽어야 한다.
- **기존 금액의 뜻**: 기존 행 `amount`의 뜻(공급가인지 부가세 포함인지)은 확정되지 않았다. 기존 행에 부가세 역산·보정을 넣지 않는다.
- **매출·지출 수정 권한 목표 규칙**(대표 확정)
  - 보기: 재직 직원 전원
  - 수정·삭제: 등록자·그 사업부 리더·관리자
  - `paid`·`canceled` 삭제: 누구도 불가
  - `paid`→`planned`: 관리자만
- **현재 권한 판정 코드**
  - `lib/financePermissions.ts`는 viewer·artist만 막고 나머지는 전부 허용한다. 파일 머리 주석의 역할별 정책은 현재 동작이 아니다.
  - 권한 판정을 고칠 때는 `src/lib/permissions.ts` 한 곳에 목표 규칙을 넣고 이 파일은 그것을 부르게 바꾼다. 두 곳에 따로 규칙을 두지 않는다.
- **완료 처리**
  - 운영 원칙상 프로젝트를 '완료'로 닫기 전에 받을 돈이 매출 `planned` + `due_date`로 등록되어 있어야 한다. 현재 화면은 이를 확인하지 않는다.
  - '완료' 프로젝트는 reactstudio.kr에 비로그인으로 공개된다.
  - 프로젝트 상태에 '취소'는 없다. 취소된 건은 '보류'로 둔다.
- **삭제 버튼**: 프로젝트 삭제는 DB에서 딸린 매출·지출·할일·문서를 연쇄 삭제한다. 삭제 버튼을 새로 노출하거나 조건을 넓히지 않는다.
- **기한·입금일 입력칸 없음**: 매출·지출 입력 모달에는 `due_date`·`paid_at` 입력칸이 없고, `api.ts`의 `createFinancialEntry`도 이 칸을 보내지 않는다. 기한을 다루는 화면을 만들 때는 서버 POST의 허용 필드 목록에도 추가해야 한다(현재 목록에 없어 보내도 버려진다).
- **인건비 입력**: 개인 이름이 들어간 인건비 행을 만드는 입력 흐름을 추가하지 않는다. 인건비는 사업부별 월 합계 1행이다.

## 구현 방식
- 데이터 흐름: `hooks.ts`의 `useXxx` → `api.ts`의 fetch → `/api/<자원>`. 변이 후에는 해당 queryKey를 무효화한다.
- 이 폴더 코드에서 브라우저 Supabase 클라이언트로 `projects`·`financial_entries`·`project_tasks`·`app_users`에 직접 쓰지 않는다.
- 대형 파일(`UnifiedProjectModal.tsx` 2,000줄, `app/page.tsx` 2,800줄)에 기능을 더 얹지 말고, 하위 컴포넌트로 나눠 추가한다.

## 테스트할 것
- 역할별(admin, 같은 사업부 leader, 다른 사업부 leader, 등록자 member, 비등록 member) 매출·지출 수정·삭제 버튼 노출과 실제 API 결과가 일치하는가.
- `paid` 행 삭제 시도가 거부되는가(봉인 이후).
- DEETZ 프로젝트가 목록·탭·손익에 나타나는가(사업부 목록 정비 이후).
- 1,000건을 넘는 목록(프로젝트·재무)이 잘리지 않는가.
- 지급 방식별 실지급액과 반올림.
