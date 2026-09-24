# src/features/partners — 통합 거래처·인력 명부

## 맡는 것
- 사람·단체·팀·장소·브랜드를 한 테이블(`partners` 452행(2026-09-24 기준), `entity_type`: person·organization·team·venue·brand)로 관리하는 명부 화면(`PartnersView`, `UnifiedPartnerModal`, `PartnerDetailModal`)
- 분류(`partner_categories`, `partner_category_mappings`)와 소속 관계(`partner_relations`, 부모·자식)
- 사업부별 열람 권한(`partner_bu_access`: owner·full·view)
- 다른 사업부 거래처 상세를 직원이 요청·승인하는 흐름(`AccessRequestsPanel`, `partner_access_requests` → 승인 시 `partner_user_access`). 사내 기능이고 사용 0건이다.
- 서버 쪽: `src/app/api/unified-partners/*`

## 맡지 않는 것
- 외부인 로그인. 이 명부의 사람은 ERP 계정이 아니다. 외부인은 ERP에 로그인하지 않는다.
- 지급 계좌·주민번호 같은 지급 정보. 각 사업 앱(deetz·grigo-artist)에 있고 ERP에 두지 않는다.
- 동일인 판정. 같은 이름이라도 자동으로 합치지 않는다. 전사 동일인 연결표는 아직 없다.

## 지켜야 할 것
- **새 거래처 등록**: 등록자 사업부가 `owner_bu_code`가 되고, 그 사업부에 `partner_bu_access` owner 행이 함께 생긴다. 둘 중 하나만 만드는 코드는 권한 판정을 깨뜨린다.
- **상세 열람**: 아래 중 하나에 해당하면 볼 수 있다.
  - admin
  - 소유 사업부
  - 그 사업부에 owner·full·view 권한이 있음
  - FLOW leader가 `dancer` 분류를 볼 때
- **수정**: admin, 소유 사업부, owner·full 권한일 때만 할 수 있다.
- **권한 판정 위치**: 이 판정은 서버 라우트(`unified-partners`)가 응답에 붙인다. 그러나 `partners`의 RLS는 `authenticated` 전권이라, 브라우저 직접 조회로 우회된다. 명부의 연락처가 새지 않게 하려면 RLS까지 바꿔야 한다.
- **매출·지출과의 연결**: 매출·지출의 지급처(`financial_entries.partner_id`)가 이 명부를 가리킨다. 명부 API에는 삭제가 없다. 쓰지 않는 거래처는 `is_active=false`로 끄고, 목록 조회는 `deleted_at`이 빈 행만 읽는다. 행을 물리 삭제하는 경로를 새로 만들지 않는다. 이 행을 가리키는 매출·지출이 있으면 외래키 제약으로 삭제가 실패한다.
- **이름 구분**: 활동명과 법명이 같은 사람, 이름이 같은 다른 사람을 한 행으로 합치지 않는다.
- **전속 아티스트 화면**: `exclusive-artists` 기능이 이 명부의 GRIGO 아티스트를 따로 보여 준다(사용 권한: GRIGO·HEAD의 admin·leader·manager). 두 화면이 같은 행을 고친다.

## 테스트할 것
- 다른 사업부 member가 view 권한 없이 목록을 받으면 `legal_name`·`email`·`phone`·`metadata`가 비고 `access_status='request_required'`로 오는지.
- 새 거래처 등록 후 `partners.owner_bu_code`와 `partner_bu_access` owner 행이 함께 생겼는지.
- FLOW leader가 dancer 분류 인력의 상세를 볼 수 있는지.
