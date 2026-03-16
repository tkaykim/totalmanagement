-- ERP 사용 가이드 매뉴얼 시드 (manuals 테이블)
-- 동일 bu_code + title + category 조합이 있으면 삽입하지 않음 (idempotent)

-- 1. 프로젝트 생성 가이드
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '프로젝트 생성 가이드',
  '경영/관리',
  json_build_object('html', $html$
<h2>프로젝트 생성 가이드</h2>
<p>ERP에서 새 프로젝트를 등록하고 PM, 참여자, 할일을 설정하는 방법입니다.</p>

<h3>1. 기본 정보 입력</h3>
<ul>
  <li><strong>프로젝트명</strong>: 업무에서 식별하기 쉬운 이름을 입력합니다.</li>
  <li><strong>카테고리</strong>: 프로젝트 유형(행사, 촬영, 영상 제작 등)을 선택합니다.</li>
  <li><strong>사업부</strong>: 담당 사업부(그리고 엔터, 리액트 스튜디오 등)를 선택합니다.</li>
</ul>

<h3>2. PM(프로젝트 매니저) 지정</h3>
<p>PM은 프로젝트의 총괄 책임자입니다. 프로젝트 상세에서 PM을 지정하면 해당 프로젝트의 일정·예산·할일을 관리할 권한이 부여됩니다.</p>

<h3>3. 참여자 추가</h3>
<p>내부 직원, 외주 담당자(파트너 워커), 외주 업체(파트너 회사)를 참여자로 추가할 수 있습니다. 각 참여자에게 역할(예: 연출, 촬영, 편집)을 부여합니다.</p>

<h3>4. 할일 배정</h3>
<ul>
  <li>할일 템플릿을 적용하거나, 수동으로 할일을 추가합니다.</li>
  <li>각 할일에 담당자(assignee)를 지정하고, 마감일을 설정합니다.</li>
  <li>필요 시 할일에 매뉴얼(SOP)을 연결하여 수행 방법을 안내할 수 있습니다.</li>
</ul>

<h3>5. 프로젝트 기간</h3>
<p>시작일과 종료일은 <strong>기획 회의 시작 시점</strong>부터 <strong>행사·촬영 등 본 일정</strong>, 그리고 <strong>영상 편집·업로드 등 후처리</strong>까지 모두 포함하여 설정합니다. 자세한 원칙은 「프로젝트 기간 설정 원칙」 매뉴얼을 참고하세요.</p>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '프로젝트 생성 가이드' AND category = '경영/관리'
);

-- 2. 프로젝트 기간 설정 원칙
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '프로젝트 기간 설정 원칙',
  '경영/관리',
  json_build_object('html', $html$
<h2>프로젝트 기간 설정 원칙</h2>
<p>프로젝트의 시작일과 종료일을 설정할 때 반드시 지켜야 할 원칙입니다.</p>

<h3>포함해야 하는 구간</h3>
<ol>
  <li><strong>기획 단계</strong>: 기획 회의가 시작된 시점을 프로젝트 시작일로 설정합니다.</li>
  <li><strong>본 일정</strong>: 행사 당일, 촬영일, 공연일 등 실제 메인 일정이 포함됩니다.</li>
  <li><strong>후처리</strong>: 영상 편집, 업로드, 결과물 전달, 정산 마감 등이 모두 끝나는 시점을 종료일로 설정합니다.</li>
</ol>

<blockquote class="warning">
  <p>종료일은 「본 일정만」이 아니라, 관련 영상·자료 업로드 및 정산 등 후처리가 완료되는 시점까지 감안하여 설정해야 합니다.</p>
</blockquote>

<h3>설정 시 유의사항</h3>
<ul>
  <li>기간이 짧게 설정되면 대시보드·정산에서 프로젝트가 조기에 「완료」로 보일 수 있습니다.</li>
  <li>실제 업무 종료 시점에 맞춰 종료일을 입력하면 정산·리포트에 정확히 반영됩니다.</li>
</ul>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '프로젝트 기간 설정 원칙' AND category = '경영/관리'
);

-- 3. 프로젝트 운영 필수 절차
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '프로젝트 운영 필수 절차',
  '경영/관리',
  json_build_object('html', $html$
<h2>프로젝트 운영 필수 절차</h2>
<p>프로젝트 진행 시 재무·계약 관련하여 반드시 준수해야 할 단계입니다.</p>

<h3>필수 준수 순서</h3>
<ol>
  <li><strong>견적서 작성</strong>: 클라이언트 또는 거래처에게 견적을 제시하기 전에 견적서를 작성·확인합니다.</li>
  <li><strong>계약서 작성</strong>: 견적 확정 후 계약서를 작성하고, 필요한 경우 전자·서면 서명을 진행합니다.</li>
  <li><strong>계산서 발행</strong>: 세금계산서·영수증 등 계산서를 발행하고, 발행 일자·금액을 ERP에 등록합니다.</li>
  <li><strong>결제 확인</strong>: 입금·지급이 완료되면 ERP에서 해당 매출·지출 건의 상태를 「지급완료」 등으로 반영하고, 결제 확인을 완료합니다.</li>
</ol>

<blockquote class="warning">
  <p>위 순서(견적서 → 계약서 → 계산서 발행 → 결제 확인)를 건너뛰지 않고 진행해야 합니다. 미준수 시 정산 오류 및 법적·세무 리스크가 발생할 수 있습니다.</p>
</blockquote>

<h3>ERP 반영</h3>
<p>매출·지출은 반드시 해당 프로젝트와 연결하여 등록하고, 계산서 발행·입금 시점에 맞춰 상태(지급예정/지급완료)를 업데이트하세요.</p>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '프로젝트 운영 필수 절차' AND category = '경영/관리'
);

-- 4. 매출·지출 등록 가이드
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '매출·지출 등록 가이드',
  '경영/관리',
  json_build_object('html', $html$
<h2>매출·지출 등록 가이드</h2>
<p>정산 화면에서 매출과 지출을 등록·관리하는 방법입니다.</p>

<h3>1. 매출 등록</h3>
<p>클라이언트로부터 수주한 금액, 행사·촬영 대가 등 수입을 매출로 등록합니다. 반드시 <strong>프로젝트</strong>와 연결하고, 거래처(파트너)가 있으면 선택합니다.</p>

<h3>2. 지출 등록</h3>
<p>외주비, 인건비, 장비·차량 비용 등 지급 내역을 지출로 등록합니다. 역시 <strong>프로젝트</strong>와 <strong>거래처 또는 담당자</strong>를 연결합니다.</p>

<h3>3. 세금·증빙 유형</h3>
<ul>
  <li><strong>세금계산서(VAT 10%)</strong>: 공급가 입력 시 세액·합계가 자동 계산됩니다.</li>
  <li><strong>면세 계산서</strong>: 세액 0원으로 등록합니다.</li>
  <li><strong>원천징수(3.3%)</strong>: 지급 총액 입력 시 세액 역산, 실지급액이 자동 계산됩니다.</li>
  <li><strong>법인카드</strong>: 카드 사용 내역을 실지급 기준으로 등록합니다.</li>
</ul>

<h3>4. 상태 관리</h3>
<p>각 건은 <strong>지급예정</strong> → <strong>지급완료</strong>로 변경하며, 취소 시 <strong>취소</strong>로 표시합니다. 결제 확인 후 반드시 상태를 업데이트하세요.</p>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '매출·지출 등록 가이드' AND category = '경영/관리'
);

-- 5. 회의실 예약 방법
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '회의실 예약 방법',
  '경영/관리',
  json_build_object('html', $html$
<h2>회의실 예약 방법</h2>
<p>자원 예약 메뉴에서 회의실을 예약하는 절차입니다.</p>

<h3>1. 예약 절차</h3>
<ol>
  <li>회의실 예약(또는 자원 예약) 화면으로 이동합니다.</li>
  <li>예약할 날짜와 시간대를 선택합니다.</li>
  <li>사용할 회의실을 선택하고, 시작·종료 시간을 입력합니다.</li>
  <li><strong>사용 목적</strong>을 반드시 입력합니다. 가능한 경우 해당 <strong>프로젝트</strong> 또는 <strong>할일</strong>과 연결합니다.</li>
  <li>예약을 저장합니다.</li>
</ol>

<h3>2. 유의사항</h3>
<ul>
  <li>동일 회의실·동일 시간대 중복 예약은 불가합니다. 이미 예약된 구간은 선택할 수 없습니다.</li>
  <li>사용 목적·프로젝트 연결은 나중에 일정 추적과 비용 배분에 활용됩니다.</li>
  <li>예약 변경·취소가 필요하면 해당 예약을 선택한 뒤 수정 또는 취소합니다.</li>
</ul>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '회의실 예약 방법' AND category = '경영/관리'
);

-- 6. 장비 대여 방법
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '장비 대여 방법',
  '경영/관리',
  json_build_object('html', $html$
<h2>장비 대여 방법</h2>
<p>촬영 장비, 카메라, 녹음 장비 등 사내 장비를 예약·대여하는 방법입니다.</p>

<h3>1. 장비 예약 절차</h3>
<ol>
  <li>자원 예약 메뉴에서 「장비」를 선택합니다.</li>
  <li>대여할 장비와 사용 날짜·시간대를 선택합니다.</li>
  <li>사용 목적과 연결 프로젝트(또는 할일)를 입력합니다.</li>
  <li>예약을 저장합니다.</li>
</ol>

<h3>2. 반납 확인</h3>
<ul>
  <li>장비 사용 후 반납했는지 반드시 확인합니다.</li>
  <li>미반납 시 시스템에서 담당자에게 알림이 갈 수 있으므로, 반납 후 예약 상태를 정리합니다.</li>
</ul>

<h3>3. 유의사항</h3>
<p>동일 장비에 대해 같은 시간대 중복 예약은 불가합니다. 다른 팀 사용 여부를 캘린더에서 확인한 뒤 예약하세요.</p>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '장비 대여 방법' AND category = '경영/관리'
);

-- 7. 차량 대여 방법
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '차량 대여 방법',
  '경영/관리',
  json_build_object('html', $html$
<h2>차량 대여 방법</h2>
<p>법인 차량을 예약하고 사용·반납하는 방법입니다.</p>

<h3>1. 차량 예약 절차</h3>
<ol>
  <li>자원 예약 메뉴에서 「차량」을 선택합니다.</li>
  <li>사용할 차량과 이용 날짜·시간대를 선택합니다.</li>
  <li>사용 목적(출장, 촬영 이동 등)과 연결 프로젝트를 입력합니다.</li>
  <li>예약을 저장합니다.</li>
</ol>

<h3>2. 사용 및 반납</h3>
<ul>
  <li>예약된 시간에 차량을 인수한 뒤 사용합니다.</li>
  <li>사용 후 반납 시점을 확인하고, 필요 시 예약 종료 시간을 반납 시점에 맞춰 수정합니다.</li>
</ul>

<h3>3. 유의사항</h3>
<p>동일 차량·동일 시간대 중복 예약은 불가합니다. 다른 예약 현황을 확인한 뒤 예약하세요.</p>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '차량 대여 방법' AND category = '경영/관리'
);

-- 8. 연차 신청 및 소진·내역 확인
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '연차 신청 및 소진·내역 확인',
  '경영/관리',
  json_build_object('html', $html$
<h2>연차 신청 및 소진·내역 확인</h2>
<p>연차(휴가) 신청, 잔여 일수 확인, 사용 내역을 조회하는 방법입니다.</p>

<h3>1. 연차 신청</h3>
<ol>
  <li>연차(휴가) 메뉴에서 신청하기 또는 새 연차 신청을 선택합니다.</li>
  <li>휴가 시작일·종료일(또는 사용 일수)을 입력합니다.</li>
  <li>필요 시 사유를 입력하고 신청합니다.</li>
  <li>결정권자(관리자)가 승인하면 연차가 사용 처리됩니다.</li>
</ol>

<h3>2. 소진·잔여 일수 확인</h3>
<p>연차 메뉴에서 본인의 부여 연차, 사용 일수, 잔여 일수를 확인할 수 있습니다. (관리자는 팀별·사업부별 통계도 조회 가능합니다.)</p>

<h3>3. 내역 확인</h3>
<p>신청한 연차 목록, 승인·반려 상태, 사용 완료된 연차 내역을 기간별·상태별로 조회할 수 있습니다. 관리자는 팀원별 부여·사용 이력과 생성/사용 로그를 확인할 수 있습니다.</p>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '연차 신청 및 소진·내역 확인' AND category = '경영/관리'
);

-- 9. 거래처(파트너) 등록 및 관리
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '거래처(파트너) 등록 및 관리',
  '경영/관리',
  json_build_object('html', $html$
<h2>거래처(파트너) 등록 및 관리</h2>
<p>외주 업체·외주 담당자 등 파트너를 등록하고 접근 권한을 관리하는 방법입니다.</p>

<h3>1. 거래처(회사) 등록</h3>
<p>파트너 메뉴에서 「회사/조직」 형태의 거래처를 등록합니다. 회사명, 사업자 정보, 연락처 등을 입력하고, 필요 시 사업자 등록증·세금계산서 발행 이메일 등을 메모에 기록합니다.</p>

<h3>2. 담당자(파트너 워커) 등록</h3>
<p>해당 회사 소속 담당자(개인)를 「담당자」로 등록합니다. 이름, 연락처, 역할 등을 입력하고, 소속 회사와 연결합니다.</p>

<h3>3. 접근 권한</h3>
<p>파트너에게 프로젝트·문서 조회 권한을 부여할 수 있습니다. 접근 요청이 있으면 관리자가 승인·거절하며, 승인 시 해당 파트너는 지정된 프로젝트나 문서만 조회할 수 있습니다.</p>

<h3>4. 정산 연동</h3>
<p>매출·지출 등록 시 거래처(파트너)를 선택하면 정산·미수금 관리에서 해당 파트너별 내역을 조회할 수 있습니다.</p>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '거래처(파트너) 등록 및 관리' AND category = '경영/관리'
);

-- 10. 할일(Task) 관리 및 매뉴얼 연결
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '할일(Task) 관리 및 매뉴얼 연결',
  '경영/관리',
  json_build_object('html', $html$
<h2>할일(Task) 관리 및 매뉴얼 연결</h2>
<p>프로젝트 내 할일을 생성·배정하고, 매뉴얼(SOP)을 연결하여 수행 방법을 안내하는 방법입니다.</p>

<h3>1. 할일 생성·편집</h3>
<p>프로젝트 상세에서 할일을 추가하거나, 할일 템플릿을 적용해 일괄 생성할 수 있습니다. 각 할일에 제목, 설명, 마감일, 우선순위를 설정합니다.</p>

<h3>2. 담당자 지정</h3>
<p>할일마다 담당자(assignee)를 지정합니다. 타 부서 직원이나 파트너 워커도 지정 가능하며, 지정 시 해당 담당자에게 알림이 갈 수 있습니다.</p>

<h3>3. 상태 관리</h3>
<p>할일 상태는 대기 → 진행중 → 보류 → 완료 등으로 변경합니다. 칸반 보드나 목록에서 드래그·드롭 또는 버튼으로 상태를 업데이트할 수 있습니다.</p>

<h3>4. 매뉴얼(SOP) 연결</h3>
<p>할일 편집 시 「매뉴얼(SOP) 연결」에서 해당 업무에 맞는 매뉴얼을 선택할 수 있습니다. 연결하면 담당자가 할일을 볼 때 매뉴얼 내용을 참고하여 수행할 수 있습니다.</p>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '할일(Task) 관리 및 매뉴얼 연결' AND category = '경영/관리'
);

-- 11. 정산 조회 및 미수금 관리
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '정산 조회 및 미수금 관리',
  '경영/관리',
  json_build_object('html', $html$
<h2>정산 조회 및 미수금 관리</h2>
<p>정산 화면에서 매출·지출을 조회하고, 미수금을 확인·관리하는 방법입니다.</p>

<h3>1. 정산 화면 활용</h3>
<ul>
  <li><strong>개요</strong>: 기간별 매출·지출 합계, 영업이익(순이익)을 한눈에 볼 수 있습니다.</li>
  <li><strong>프로젝트별 정산</strong>: 프로젝트 단위로 매출·지출 내역을 조회할 수 있습니다.</li>
  <li><strong>미수금(Outstanding)</strong>: 아직 입금·지급이 완료되지 않은 건을 별도 탭에서 확인할 수 있습니다.</li>
</ul>

<h3>2. 미수금 확인</h3>
<p>발행된 계산서 중 아직 입금되지 않은 매출 건, 또는 지급 예정인 지출 건을 목록에서 확인합니다. 필요 시 입금 요청 메일 등을 별도로 발송할 수 있습니다.</p>

<h3>3. 상태 업데이트</h3>
<p>입금·지급이 완료되면 해당 건의 상태를 「지급완료」로 변경하여 미수금 목록에서 제외하고, 결제 확인 이력을 남깁니다.</p>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '정산 조회 및 미수금 관리' AND category = '경영/관리'
);

-- 12. 프로젝트 파일함(문서) 활용
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '프로젝트 파일함(문서) 활용',
  '경영/관리',
  json_build_object('html', $html$
<h2>프로젝트 파일함(문서) 활용</h2>
<p>프로젝트에 계약서, 기획안, 결과물 등을 첨부하고 폴더링하여 관리하는 방법입니다.</p>

<h3>1. 문서 첨부</h3>
<p>프로젝트 상세 화면의 파일함(문서/첨부) 영역에서 파일을 업로드합니다. 계약서, 기획안, 큐시트, 최종 결과물 링크 등을 한 곳에서 관리할 수 있습니다.</p>

<h3>2. 폴더링·정리</h3>
<p>가능한 경우 폴더별로 구분하여 보관합니다. (예: 계약/기획안/결과물) 버전이 여러 개인 경우 파일명에 버전(예: 기획안_v1.pdf, 기획안_final.pdf)을 넣어 이력을 남깁니다.</p>

<h3>3. 공유</h3>
<p>프로젝트 참여자나 권한이 있는 파트너는 해당 프로젝트의 파일함을 조회할 수 있습니다. 외부 전달이 필요한 문서는 별도 공유 링크나 전달 절차를 따릅니다.</p>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '프로젝트 파일함(문서) 활용' AND category = '경영/관리'
);
