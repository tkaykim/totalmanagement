-- 근태(연차) 관련 SOP 매뉴얼 시드 (manuals 테이블)
-- 동일 bu_code + title + category 조합이 있으면 삽입하지 않음 (idempotent)

INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '근태 및 연차 신청 가이드',
  '경영/관리',
  json_build_object('html', $html$
<h2>근태 및 연차 신청 가이드</h2>
<p>연차(휴가) 신청 시 반드시 지켜야 할 기준과 긴급 연차 사용 규정입니다.</p>

<h3>1. 연차 신청 기한</h3>
<blockquote class="warning">
  <p>연차는 <strong>최소 5영업일 전</strong>에 신청해야 합니다.</p>
</blockquote>
<p>휴가 예정일 기준 5영업일 이전까지 ERP에서 연차 신청을 완료하고, 결재권자의 승인을 받아야 합니다. 기한 미준수 시 업무 배치·대체 인력 조치에 어려움이 있으므로 반드시 준수합니다.</p>

<h3>2. 긴급 연차</h3>
<p>갑작스러운 병가, 사고, 비보(사망 등) 등 부득이한 사유로 사전 신청이 어려운 경우 <strong>긴급 연차</strong>로 처리할 수 있습니다.</p>
<ul>
  <li><strong>사용 한도</strong>: 긴급 연차는 <strong>월 1회</strong>로 한정합니다.</li>
  <li>해당 월에 이미 긴급 연차를 사용한 경우, 추가 사용 시 사전 협의 또는 별도 절차가 필요할 수 있습니다.</li>
</ul>

<h3>3. 긴급 연차 사용 시 증빙</h3>
<blockquote class="warning">
  <p>긴급 연차 사용 시 <strong>증빙 서류 확인이 필수</strong>입니다.</p>
</blockquote>
<ul>
  <li><strong>인증 사진</strong>: 현장·상황 확인용 (해당 시)</li>
  <li><strong>진료 확인서</strong>: 병원 방문 사실 확인</li>
  <li><strong>진단서</strong>: 의사의 진단·휴업 권고 내용</li>
  <li>기타: 사고 확인서, 비보 관련 서류 등 사유에 맞는 증빙</li>
</ul>
<p>증빙 서류는 연차 신청·승인 시 제출하고, 담당자가 꼭 확인 후 보관합니다. 미제출·미확인 시 긴급 연차 인정이 보류될 수 있습니다.</p>

<h3>4. 정리</h3>
<p>일반 연차는 5영업일 전 신청, 긴급 연차는 월 1회 한도 내 사용 시 증빙 서류를 반드시 확인·보관하는 것을 원칙으로 합니다.</p>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '근태 및 연차 신청 가이드' AND category = '경영/관리'
);
