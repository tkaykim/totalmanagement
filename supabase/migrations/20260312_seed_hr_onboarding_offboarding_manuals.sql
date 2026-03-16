-- 입사·퇴사 처리 가이드 SOP 매뉴얼 시드 (manuals 테이블)
-- 동일 bu_code + title + category 조합이 있으면 삽입하지 않음 (idempotent)

-- 1. 입사처리 가이드
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '입사처리 가이드',
  '경영/관리',
  json_build_object('html', $html$
<h2>입사처리 가이드</h2>
<p>신규 입사자 처리 시 반드시 진행해야 할 절차입니다.</p>

<h3>1. 근로계약서 작성</h3>
<p>입사자와 <strong>근로계약서</strong>를 작성·체결합니다. 근로 조건(급여, 근로시간, 계약 기간 등)을 명확히 기재하고, 양측 서명·날인 후 보관합니다.</p>

<h3>2. 회계사 사무실 통보 및 사대보험 가입</h3>
<ul>
  <li>입사 사실을 <strong>회계사 사무실</strong>에 통보합니다.</li>
  <li><strong>사대보험</strong>(국민연금, 건강보험, 고용보험, 산재보험) 가입 절차를 진행합니다.</li>
  <li>필요 서류·기한을 회계사 사무실 안내에 따라 제출합니다.</li>
</ul>

<h3>3. 경력직 입사 시 필수 확보 서류</h3>
<blockquote class="warning">
  <p>경력직 입사 시 아래 서류를 <strong>반드시 확보</strong>해야 합니다.</p>
</blockquote>
<ul>
  <li><strong>전직장 경력인정 서류</strong>: 재직증명서, 경력증명서 등 전 직장 경력을 증명하는 서류</li>
  <li><strong>포트폴리오</strong>: 업무 성과·작품·실적을 보여줄 수 있는 자료</li>
</ul>
<p>위 서류는 인사 기록 및 평가에 활용되며, 미확보 시 이후 증빙에 어려움이 있을 수 있습니다.</p>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '입사처리 가이드' AND category = '경영/관리'
);

-- 2. 퇴사 처리 가이드
INSERT INTO manuals (bu_code, title, category, content, is_active)
SELECT
  'HEAD',
  '퇴사 처리 가이드',
  '경영/관리',
  json_build_object('html', $html$
<h2>퇴사 처리 가이드</h2>
<p>퇴사자 처리 시 반드시 진행해야 할 절차입니다.</p>

<h3>1. 사직서 작성</h3>
<p>퇴사 예정자로부터 <strong>사직서</strong>를 접수합니다. 퇴사 예정일, 사유 등을 기재하고, 본인 서명·날인 후 보관합니다.</p>

<h3>2. 회계사 사무실 통보 및 사대보험 종료</h3>
<ul>
  <li>퇴사 사실을 <strong>회계사 사무실</strong>에 통보합니다.</li>
  <li><strong>사대보험</strong>(국민연금, 건강보험, 고용보험, 산재보험) 종료 절차를 안내받고 진행합니다.</li>
  <li>퇴사일 기준으로 보험 자격 상실 신고 등 필요한 절차를 기한 내에 처리합니다.</li>
</ul>

<h3>3. 유의사항</h3>
<p>퇴사 예정일·최종 근무일을 명확히 하고, 미수금·반납 물품·권한 회수 등 사후 정리를 체크리스트로 관리하는 것을 권장합니다.</p>
$html$),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM manuals
  WHERE bu_code = 'HEAD' AND title = '퇴사 처리 가이드' AND category = '경영/관리'
);
