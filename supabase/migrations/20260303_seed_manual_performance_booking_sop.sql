-- 공연 섭외 시 확인사항 SOP 업무 매뉴얼 (manuals 테이블 시드)
-- 이미 동일 title/bu_code/category 조합이 있으면 삽입하지 않음
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'GRIGO',
  '공연 섭외 시 확인사항',
  'SOP',
  json_build_object('html', $html$
<h2>공연 섭외 시 확인사항 (업무 매뉴얼)</h2>
<p>공연 섭외 시 아래 항목을 반드시 확인하세요.</p>

<h3>1. 기본 정보</h3>
<ul>
  <li>☐ <strong>날짜</strong></li>
  <li>☐ <strong>장소</strong></li>
  <li>☐ <strong>주최자</strong></li>
  <li>☐ <strong>행사의 성격</strong> (기업, 지자체, 대학행사 등)</li>
</ul>

<h3>2. 공연 사양</h3>
<ul>
  <li>☐ <strong>러닝타임</strong></li>
  <li>☐ <strong>셋리스트 필수 포함 사항</strong> – 특정 곡 또는 특정 이벤트 등 공연구성 여부</li>
  <li>☐ <strong>실내 / 야외</strong> 여부</li>
  <li>☐ <strong>무대 크기</strong> (당장 알 수 없다면 스킵 가능)</li>
</ul>

<h3>3. 라인업 및 인원</h3>
<ul>
  <li>☐ 해당 행사 라인업에 <strong>다른 출연 예정 아티스트</strong>는 누구인지</li>
  <li>☐ <strong>예산에 맞춰 인원 변동</strong>이 가능한지</li>
  <li>☐ <strong>필수 출연 멤버</strong>가 있는지</li>
</ul>

<h3>4. 비용 및 진행 단계</h3>
<ul>
  <li>☐ <strong>단가(손금액)</strong> – 총비용이 아닌 <strong>우리가 실제로 입금받는 금액</strong>이 얼마인지 (대략적인 풀/범위 확인)</li>
  <li>☐ <strong>진행 단계</strong> – 비딩(제안) 단계인지, 거의 확정 단계에서 비용만 맞으면 진행 가능한 상황인지 확인</li>
</ul>

<blockquote class="warning">
  <p><strong>손금액</strong>: 아티스트에게 입금되는 금액이 아닌, 우리가 입금받는 금액을 의미합니다.</p>
</blockquote>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'GRIGO' AND title = '공연 섭외 시 확인사항' AND category = 'SOP'
);
