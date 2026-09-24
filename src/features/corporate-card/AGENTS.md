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
  - `gowid/*` 라우트는 `getAuthContext()` → `requireAuth()`로 시작한다. 예외는 `gowid/mapping`(사용자 매핑)으로, 직접 `auth.getUser()`를 확인하고 admin만 허용한다.
  - `requireAuth`는 `Unauthorized` 예외를 던지고 catch에서 401로 바꾼다.
  - 새 라우트도 이 순서와 catch 처리를 그대로 따라야 한다. 빠뜨리면 로그인 없이 카드 내역이 열린다.
- **볼 수 있는 사람**(`canAccessCorporateCard`)
  - admin·leader: 전체
  - manager·member: `gowid_user_mapping`에 연결된 Gowid 사용자가 있을 때만
  - leader용 사업부 필터는 조건식이 항상 참이라, 현재 leader는 전체 내역을 본다.
- **프로젝트 연결 시 자동 생성되는 지출 행**
  - 필드: `kind='expense'`, `status='paid'`, `category='법인카드'`, 이름 `[법인카드] 가맹점명`, 금액 = 카드 결제액, 사업부 = 프로젝트 사업부
- **연결 변경·해제 시 동작**
  - 같은 프로젝트에 다시 연결하면 기존 행을 update한다.
  - 다른 프로젝트로 옮기면 기존 행을 지우고 새로 만든다.
  - 연결을 풀면 지운다.
  - 이 삭제는 회사 규칙(`paid` 매출·지출 삭제 금지)과 충돌한다. 이 동작을 고칠 때는 삭제 대신 이동(프로젝트·사업부 update)이나 취소 처리로 바꾸는 방향이어야 한다. 정확한 처리는 대표 확인 사항이다.
- **금액 기준**: 카드 결제액은 결제 총액이라, 과세 가맹점이면 부가세가 들어 있다. 공급가 기준 손익과 섞일 때 약 10% 차이가 난다. 금액을 공급가로 바꾸는 계산을 임의로 넣지 않는다(금액 기준 미확정).

## 테스트할 것
- 로그인 없이 `gowid/*` 호출 → 401.
- 매핑 없는 member → 403.
- 사용 내역을 프로젝트 A → B로 옮긴 뒤 ERP 지출 행이 정확히 1개인지, 사업부가 B인지.
- Gowid API 오류 시 화면에 오류가 보이고 ERP 행이 반쯤 만들어지지 않는지.
