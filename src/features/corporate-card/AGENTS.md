# src/features/corporate-card — 법인카드(Gowid)

## 맡는 것
- Gowid 법인카드 사용 내역 조회·필터(기간·카드·사용자·승인 상태)
- 용도·메모·참여자·댓글 입력, 일괄 승인·일괄 용도 지정
- 카드 별칭 관리(`CardAliasManager`)
- ERP 사용자 ↔ Gowid 사용자 매핑(`GowidUserMappingManager`, 테이블 `gowid_user_mapping`)
- 사용 내역 ↔ ERP 프로젝트 연결(`ExpenseProjectLinker`, 테이블 `gowid_expense_project_link`)
- 서버 쪽: `src/app/api/gowid/*`와 공용 모듈 `src/app/api/gowid/_lib/gowid-client.ts`

## 맡지 않는 것
- 카드 결제·한도·승인 원장. Gowid가 정본이고 ERP는 사본을 저장하지 않는다(별칭·매핑·프로젝트 연결만 저장).
- 카드 청구와 계좌 대사. Clobe의 일이다.

## 지켜야 할 것
- **인증 구조**
  - `gowid/*` 라우트는 `getAuthContext()` → `requireAuth()`로 시작한다. `getAuthContext`가 서버 공통 재직 가드(`requireActiveStaff`)를 부른다. 예외는 `gowid/mapping`(사용자 매핑)으로, 재직 가드를 직접 부르고 admin만 허용한다.
  - `requireAuth`는 세션·`app_users` 행이 없으면 `Unauthorized`, 재직 직원이 아니면(승인 대기·퇴사·사업부 없음) `Forbidden` 예외를 던진다. 라우트의 catch가 각각 401·403으로 바꾼다.
  - 새 라우트도 이 순서와 catch 처리를 그대로 따라야 한다. 빠뜨리면 로그인 없이 카드 내역이 열리거나 퇴사자에게 500이 나간다.
- **볼 수 있는 사람**(`canAccessCorporateCard`)
  - admin·leader: 전체
  - manager·member: `gowid_user_mapping`에 연결된 Gowid 사용자가 있을 때만
  - leader용 사업부 필터는 조건식이 항상 참이라, 현재 leader는 전체 내역을 본다.
- **프로젝트 연결 시 자동 생성되는 지출 행**
  - 필드: `kind='expense'`, `status='paid'`, `category='법인카드'`, 이름 `[법인카드] 가맹점명`, 금액 = 카드 결제액, 사업부 = 프로젝트 사업부
  - 권한: 법인카드 권한 + `canCreateFinance`(리더는 자기 사업부 프로젝트에만)
- **연결 변경·해제 시 동작** (`gowid/expenses/[expenseId]/project-link`)
  - 같은 프로젝트에 다시 연결하면 기존 지출 행 내용을 update한다(`canEditFinance`).
  - 다른 프로젝트로 옮기면 지출 행을 **지우지 않고** `project_id`·`bu_code`를 새 프로젝트 기준으로 update하고, 연결표 행의 `project_id`도 바꾼다.
  - 연결을 풀면 지출 행을 `canceled`로 바꾸고 연결표 행만 지운다.
  - 푼 뒤 다시 연결하면 새 지출 행과 새 연결표 행을 만든다. 취소된 옛 행은 그대로 둔다.
  - 이 라우트는 `financial_entries`에 delete를 부르지 않는다. 봉인 DB는 `paid`·`canceled` 삭제를 거부하므로, delete를 넣으면 운영에서 오류가 난다.
  - 이동·해제 권한: 그 행을 `canceled`로 바꿀 수 있는 사람(`canTransitionFinance(…, 'canceled')` = 등록자·행 사업부 리더·관리자). 이동은 추가로 옮길 프로젝트를 볼 수 있어야 하고(`canViewProject`), 사업부가 바뀌면 `canMoveFinanceBu`(관리자·원래 사업부 리더)를 통과해야 한다. 권한 부족은 403 `{ error: 'Forbidden' }`.
  - 지출 행 없이 남은 연결표 행의 해제는 법인카드 권한만 본다.
  - `ERP_AUDIT_V2`가 켜져 있으면 지출 행 update·insert에 `updated_by`를 넣는다. 빠뜨리면 변경 기록이 "외부"로 남는다.
  - 응답 모양: GET `{ data }`, POST `{ data: 연결표 행 }`, DELETE `{ success: true }`.
- **금액 기준**: 카드 결제액은 결제 총액이라, 과세 가맹점이면 부가세가 들어 있다. 공급가 기준 손익과 섞일 때 약 10% 차이가 난다. 금액을 공급가로 바꾸는 계산을 임의로 넣지 않는다(금액 기준 미확정).

## 테스트할 것
- 로그인 없이 `gowid/*` 호출 → 401.
- 매핑 없는 member → 403.
- 사용 내역을 프로젝트 A → B로 옮긴 뒤 ERP 지출 행이 정확히 1개인지(같은 id), 사업부가 B인지.
- 연결 해제 뒤 지출 행이 `canceled`로 남고 연결표 행만 없어지는지. 다시 연결하면 새 행이 생기고 옛 행은 `canceled` 그대로인지.
- 등록자·행 사업부 리더·관리자가 아닌 사람의 이동·해제 → 403, 행 변화 없음. 다른 사업부로의 이동은 원래 사업부 리더·관리자만.
- 승인 대기·퇴사 세션 → 403.
- Gowid API 오류 시 화면에 오류가 보이고 ERP 행이 반쯤 만들어지지 않는지.
