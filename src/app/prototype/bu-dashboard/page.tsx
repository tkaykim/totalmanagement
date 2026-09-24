'use client';

/**
 * PROTOTYPE — 사업부 프로젝트 관리 대시보드
 * claude.ai/design "사업부 대시보드.dc.html" 를 totalmanagements 스택(React)으로 1:1 재구현한 평가용 프로토타입.
 * 샘플데이터는 디자인 원본 그대로(deetz). 실제 데이터 연결 전 디자인/인터랙션 검증 목적.
 * 안전: 읽기 전용 더미. 라우트 = /prototype/bu-dashboard. 평가 후 삭제 가능.
 */

import { useEffect, useState } from 'react';

type Health = '정상' | '주의' | '위험' | '완료' | '예정';
type Flow = '백로그' | '진행중' | '리뷰' | '완료';

const HEALTH: Record<Health, { c: string; bg: string }> = {
  정상: { c: '#1C8A55', bg: '#E8F3EC' },
  주의: { c: '#B07D12', bg: '#F7EFD9' },
  위험: { c: '#C0473A', bg: '#F6E6E2' },
  완료: { c: '#3A6FB0', bg: '#E7EEF7' },
  예정: { c: '#8A8F98', bg: '#EFF0F2' },
};
const FLOW: Record<Flow, { c: string; bg: string }> = {
  백로그: { c: '#8A8F98', bg: '#EFF0F2' },
  진행중: { c: '#5A54D1', bg: '#ECEBFB' },
  리뷰: { c: '#B07D12', bg: '#F7EFD9' },
  완료: { c: '#1C8A55', bg: '#E8F3EC' },
};
const AVA = [
  { bg: '#EBE9FB', c: '#5A54D1' }, { bg: '#D7E3F4', c: '#3A6FB0' },
  { bg: '#F4E0D7', c: '#B0633A' }, { bg: '#E0F0E4', c: '#3A8A5B' },
  { bg: '#F4E8D7', c: '#9A7A2A' }, { bg: '#F0D7E8', c: '#A03A6F' },
];

const DIVISION = 'deetz';
const VISION = '2027년, 활성 댄서 2만 명과 거래액 50억 — 댄서가 춤으로 먹고사는 가장 빠른 길';

const KPIS = [
  { key: 'mem', label: '댄서 회원 수', val: 70, unit: '%', sub: '8,420 / 12,000명', trend: '+12%p', st: '주의' as Health },
  { key: 'prof', label: '프로필 완성도', val: 63, unit: '%', sub: '평균 63 / 목표 80점', trend: '+5%p', st: '주의' as Health },
  { key: 'gig', label: '진행 구인 공고', val: 84, unit: '%', sub: '126 / 150건', trend: '+9%p', st: '정상' as Health },
  { key: 'gmv', label: '거래액(GMV)', val: 58, unit: '%', sub: '5.8억 / 10억', trend: '+14%p', st: '주의' as Health },
  { key: 'match', label: '매칭 성사율', val: 76, unit: '%', sub: '342 / 450건 매칭', trend: '+6%p', st: '정상' as Health },
  { key: 'active', label: '활성 댄서(MAU)', val: 81, unit: '%', sub: '3,210 / 3,950명', trend: '+3%p', st: '정상' as Health },
];

const ROAD = [
  { q: "'25 Q4", ms: '웹 플랫폼 정식 오픈', st: 'done' },
  { q: "'26 Q1", ms: '매거진·유튜브 런칭', st: 'done' },
  { q: "'26 Q2", ms: '댄서 큐레이션 1.0', st: 'done' },
  { q: "'26 Q3", ms: '구인·매칭 시스템', st: 'now' },
  { q: "'26 Q4", ms: 'PWA 출시', st: 'future' },
  { q: "'27 Q1", ms: '결제·정산 자동화', st: 'future' },
  { q: "'27 Q2", ms: '네이티브 앱 출시', st: 'future' },
  { q: "'27 Q3", ms: '', st: 'future' },
  { q: "'27 Q4", ms: '거래액 50억·커리어 인프라', st: 'future' },
];

const GOALS = [
  { id: 'g1', q: 'Q1', title: '콘텐츠로 인지도 확보', target: '회원 4,000명', pct: 100, st: '완료' as Health, proj: '3개 완료', summary: '유튜브·매거진·SEO로 댄서 유입 기반 마련 (콘텐츠·마케팅)', cur: false },
  { id: 'g2', q: 'Q2', title: '댄서 풀 & 프로필 품질', target: '프로필 60점', pct: 100, st: '완료' as Health, proj: '4개 완료', summary: '큐레이션·프로필 도구로 공급의 질 향상 (운영·디자인)', cur: false },
  { id: 'g3', q: 'Q3', title: '구인 매칭 & 거래액 본격화', target: '거래액 6억', pct: 72, st: '주의' as Health, proj: '6개 진행', summary: '프로젝트 유치·매칭률·정산으로 수익화 시작 (BD·개발·그로스)', cur: true },
  { id: 'g4', q: 'Q4', title: 'PWA & 리텐션', target: 'MAU 4,500명', pct: 8, st: '예정' as Health, proj: '5개 예정', summary: '앱화·재방문·평판으로 락인 강화 (개발·프로덕트)', cur: false },
];

type Proj = {
  id: string; goalId: string; title: string; flow: Flow; health: Health; progress: number;
  owner: string; role: string; contrib: string; ms: string; team: number; tdone: number; ttotal: number; desc: string;
};
const PROJECTS: Proj[] = [
  { id: 'p1', goalId: 'g3', title: '브랜드 구인 프로젝트 유치', flow: '진행중', health: '주의', progress: 64, owner: '이도현', role: 'BD', contrib: '거래액 +2.4억', ms: "'26 Q3", team: 5, tdone: 6, ttotal: 14, desc: 'CF·뮤직비디오·브랜드 행사 구인 프로젝트를 직접 영업·유치해 거래액을 만듭니다.' },
  { id: 'p2', goalId: 'g3', title: '매칭 추천 시스템 고도화', flow: '진행중', health: '위험', progress: 48, owner: '정우성', role: '개발', contrib: '매칭률 +9%p', ms: "'26 Q3", team: 6, tdone: 4, ttotal: 11, desc: '구인 요건과 댄서 프로필을 자동 매칭·추천해 성사율과 매칭 속도를 끌어올립니다.' },
  { id: 'p3', goalId: 'g3', title: '정산·결제 자동화', flow: '리뷰', health: '정상', progress: 82, owner: '한지민', role: '개발', contrib: '정산 -5일', ms: "'26 Q3", team: 3, tdone: 9, ttotal: 12, desc: '계약·결제·정산·세금 처리를 자동화해 거래 신뢰와 운영 효율을 확보합니다.' },
  { id: 'p4', goalId: 'g3', title: '댄서 가입 전환 캠페인', flow: '진행중', health: '정상', progress: 55, owner: '김하나', role: '그로스', contrib: '회원 +1,200', ms: "'26 Q3", team: 4, tdone: 7, ttotal: 13, desc: '랜딩·리퍼럴·추천으로 방문자를 댄서 회원 가입으로 전환합니다.' },
  { id: 'p5', goalId: 'g3', title: '프로필 완성 유도 플로우', flow: '백로그', health: '정상', progress: 8, owner: '최유라', role: '디자인', contrib: '프로필 +12%p', ms: "'26 Q4", team: 3, tdone: 1, ttotal: 9, desc: '온보딩·체크리스트·뱃지로 댄서가 프로필을 끝까지 완성하게 유도합니다.' },
  { id: 'p6', goalId: 'g3', title: '마케팅 소재·성과 분석', flow: '완료', health: '완료', progress: 100, owner: '박서진', role: '마케팅', contrib: 'CAC -18%', ms: "'26 Q3", team: 2, tdone: 8, ttotal: 8, desc: '채널별 소재 성과와 가입 퍼널을 분석해 마케팅 효율을 끌어올렸습니다.' },
  { id: 'p7', goalId: 'g1', title: '유튜브 채널 런칭', flow: '완료', health: '완료', progress: 100, owner: '윤소희', role: '콘텐츠', contrib: '구독 +8,000', ms: "'26 Q1", team: 4, tdone: 12, ttotal: 12, desc: '댄서 초대 인터뷰 콘텐츠로 채널을 키웠습니다.' },
  { id: 'p8', goalId: 'g1', title: '댄서 매거진 창간', flow: '완료', health: '완료', progress: 100, owner: '윤소희', role: '콘텐츠', contrib: '월 방문 +40K', ms: "'26 Q1", team: 3, tdone: 9, ttotal: 9, desc: '댄스 씬 매거진으로 브랜드 인지도를 확보했습니다.' },
  { id: 'p9', goalId: 'g1', title: '인스타·SEO 그로스', flow: '완료', health: '완료', progress: 100, owner: '김하나', role: '그로스', contrib: '회원 +2,300', ms: "'26 Q1", team: 2, tdone: 7, ttotal: 7, desc: '오가닉 유입 채널을 구축했습니다.' },
  { id: 'p10', goalId: 'g2', title: '댄서 큐레이션 시스템', flow: '완료', health: '완료', progress: 100, owner: '강민재', role: '운영', contrib: '큐레이션 320명', ms: "'26 Q2", team: 5, tdone: 14, ttotal: 14, desc: '검증·추천 댄서 큐레이션 파이프라인을 구축했습니다.' },
  { id: 'p11', goalId: 'g2', title: '프로필 에디터 1.0', flow: '완료', health: '완료', progress: 100, owner: '최유라', role: '디자인', contrib: '완성도 +22%p', ms: "'26 Q2", team: 4, tdone: 11, ttotal: 11, desc: '포트폴리오·영상 중심의 댄서 프로필 에디터.' },
  { id: 'p12', goalId: 'g2', title: '추천 댄서 뱃지·랭킹', flow: '완료', health: '완료', progress: 100, owner: '강민재', role: '운영', contrib: '재방문 +14%', ms: "'26 Q2", team: 3, tdone: 8, ttotal: 8, desc: '신뢰 신호로 매칭 전환을 강화했습니다.' },
  { id: 'p13', goalId: 'g2', title: '댄서 인터뷰 시리즈', flow: '완료', health: '완료', progress: 100, owner: '윤소희', role: '콘텐츠', contrib: '구독 +5,000', ms: "'26 Q2", team: 3, tdone: 9, ttotal: 9, desc: '댄서 스토리 영상 시리즈로 팬덤을 만들었습니다.' },
  { id: 'p14', goalId: 'g4', title: 'PWA 셸 구축', flow: '백로그', health: '예정', progress: 5, owner: '정우성', role: '개발', contrib: '앱 전환 기반', ms: "'26 Q4", team: 6, tdone: 1, ttotal: 16, desc: '설치형 PWA로 앱 경험 제공, 네이티브 앱 전 단계.' },
  { id: 'p15', goalId: 'g4', title: '푸시·리텐션 CRM', flow: '백로그', health: '예정', progress: 0, owner: '박서진', role: '마케팅', contrib: 'D30 +8%p', ms: "'26 Q4", team: 3, tdone: 0, ttotal: 10, desc: '세그먼트 푸시·알림으로 재방문을 유도합니다.' },
  { id: 'p16', goalId: 'g4', title: '댄서 포트폴리오 v2', flow: '백로그', health: '예정', progress: 0, owner: '최유라', role: '디자인', contrib: '완성도 +15%p', ms: "'26 Q4", team: 4, tdone: 0, ttotal: 12, desc: '영상·이력·평판을 통합한 포트폴리오 페이지.' },
  { id: 'p17', goalId: 'g4', title: '클라이언트 셀프 구인', flow: '백로그', health: '예정', progress: 0, owner: '이도현', role: 'BD', contrib: '구인 +40건', ms: "'26 Q4", team: 3, tdone: 0, ttotal: 8, desc: '기업이 직접 구인 공고를 등록·관리하는 셀프서브 플로우.' },
  { id: 'p18', goalId: 'g4', title: '리뷰·평판 시스템', flow: '백로그', health: '예정', progress: 0, owner: '강민재', role: '운영', contrib: '신뢰도 지표', ms: "'26 Q4", team: 3, tdone: 0, ttotal: 9, desc: '프로젝트 종료 후 상호 리뷰로 매칭 신뢰를 강화합니다.' },
];

type Task = { title: string; who: string; init: string; st: Flow; due: string };
const TASKS_BY_PROJECT: Record<string, Task[]> = {
  p1: [
    { title: '타깃 브랜드·에이전시 리스트업', who: '이도현', init: '이', st: '완료', due: '08-12' },
    { title: '구인 상품·요율표 설계', who: '이도현', init: '이', st: '완료', due: '08-20' },
    { title: '레퍼런스 댄서 포트폴리오 패키지', who: '윤소희', init: '윤', st: '완료', due: '08-25' },
    { title: '콜드 아웃리치 메일 시퀀스', who: '박서진', init: '박', st: '완료', due: '08-30' },
    { title: '첫 브랜드 미팅 5건 진행', who: '이도현', init: '이', st: '완료', due: '09-02' },
    { title: '계약서·정산 템플릿 정비', who: '한지민', init: '한', st: '완료', due: '09-05' },
    { title: '진행 딜 파이프라인 관리', who: '이도현', init: '이', st: '진행중', due: '09-18' },
    { title: '뮤직비디오 구인 2건 클로징', who: '이도현', init: '이', st: '진행중', due: '09-24' },
    { title: '구인 성사 사례 케이스화', who: '윤소희', init: '윤', st: '리뷰', due: '09-16' },
    { title: '에이전시 제휴 채널 확보', who: '이도현', init: '이', st: '백로그', due: '10-02' },
    { title: '구인 단가 벤치마크 조사', who: '박서진', init: '박', st: '백로그', due: '10-08' },
    { title: '리퍼럴 인센티브 설계', who: '김하나', init: '김', st: '백로그', due: '10-12' },
    { title: '반복 구인 클라이언트 온보딩', who: '강민재', init: '강', st: '백로그', due: '10-18' },
    { title: '구인 셀프등록 베타 기획', who: '최유라', init: '최', st: '백로그', due: '10-24' },
  ],
  p2: [
    { title: '구인 요건 태깅 스키마 설계', who: '정우성', init: '정', st: '완료', due: '07-30' },
    { title: '댄서 프로필 피처 추출', who: '한지민', init: '한', st: '완료', due: '08-18' },
    { title: '룰베이스 1차 매칭 로직', who: '정우성', init: '정', st: '완료', due: '08-28' },
    { title: '매칭 로그·이벤트 수집', who: '한지민', init: '한', st: '완료', due: '09-05' },
    { title: '추천 스코어링 모델', who: '정우성', init: '정', st: '진행중', due: '09-22' },
    { title: '실시간 추천 API', who: '한지민', init: '한', st: '진행중', due: '09-25' },
    { title: '매칭 결과 A/B 셋업', who: '박서진', init: '박', st: '진행중', due: '09-28' },
    { title: '추천 위젯 UI 연동', who: '최유라', init: '최', st: '리뷰', due: '09-19' },
    { title: '콜드스타트(신규 댄서) 대응', who: '정우성', init: '정', st: '백로그', due: '10-08' },
    { title: '스타일·장르 임베딩', who: '한지민', init: '한', st: '백로그', due: '10-14' },
    { title: '매칭 사유 설명 기능', who: '최유라', init: '최', st: '백로그', due: '10-20' },
  ],
  p3: [
    { title: '결제 PG 연동', who: '한지민', init: '한', st: '완료', due: '08-10' },
    { title: '계약 전자서명 연동', who: '한지민', init: '한', st: '완료', due: '08-18' },
    { title: '에스크로 정산 플로우', who: '정우성', init: '정', st: '완료', due: '08-26' },
    { title: '세금계산서 자동발행', who: '한지민', init: '한', st: '완료', due: '09-01' },
    { title: '수수료(Take rate) 정책 적용', who: '박서진', init: '박', st: '완료', due: '09-04' },
    { title: '정산 스케줄러', who: '정우성', init: '정', st: '완료', due: '09-08' },
    { title: '환불·분쟁 처리 플로우', who: '강민재', init: '강', st: '완료', due: '09-10' },
    { title: '정산 내역 대시보드', who: '최유라', init: '최', st: '완료', due: '09-12' },
    { title: 'PG 보안 점검', who: '한지민', init: '한', st: '완료', due: '09-14' },
    { title: '정산 리드타임 검증', who: '정우성', init: '정', st: '리뷰', due: '09-17' },
    { title: '운영 알림·모니터링', who: '한지민', init: '한', st: '리뷰', due: '09-18' },
    { title: '해외 송금 대응', who: '정우성', init: '정', st: '백로그', due: '09-28' },
  ],
};

const FLOW_ORDER: Flow[] = ['백로그', '진행중', '리뷰', '완료'];

function ava(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVA[h % AVA.length];
}
function genTasks(p: Proj): Task[] {
  if (TASKS_BY_PROJECT[p.id]) return TASKS_BY_PROJECT[p.id];
  const pool = ['요구사항 정의', '기술 설계 리뷰', '핵심 로직 구현', '연동 API 개발', 'UI 구현', 'QA 시나리오 작성', '성능·부하 테스트', '보안 점검', '배포 파이프라인 구성', '운영 문서화', '이해관계자 리뷰', '모니터링 대시보드'];
  const who = ['김서연', '이지훈', '박준호', '정유진', '최민수', '한가람'];
  const arr: Task[] = [];
  for (let i = 0; i < p.ttotal; i++) {
    const st: Flow = i < p.tdone ? '완료' : (i < p.tdone + 2 ? '진행중' : (i === p.tdone + 2 ? '리뷰' : '백로그'));
    const wn = who[i % who.length];
    arr.push({ title: pool[i % pool.length], who: wn, init: wn[0], st, due: '' });
  }
  return arr;
}

const STYLE_CSS = `
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
.dcp * { box-sizing: border-box; }
.dcp { font-family: 'Pretendard', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.dcp ::-webkit-scrollbar { width: 10px; height: 10px; }
.dcp ::-webkit-scrollbar-thumb { background: #D9DBDF; border-radius: 8px; border: 3px solid transparent; background-clip: content-box; }
.dcp ::-webkit-scrollbar-thumb:hover { background: #C4C7CC; background-clip: content-box; }
@keyframes dcpScreenIn { from { transform: scale(0.992) translateY(10px); opacity:.6 } to { transform: none; opacity:1 } }
@keyframes dcpScreenBack { from { transform: scale(1.008) translateY(-6px); opacity:.6 } to { transform: none; opacity:1 } }
@keyframes dcpFadeUp { from { transform: translateY(8px); opacity:0 } to { transform: none; opacity:1 } }
.dcp-mono { font-family: 'JetBrains Mono', monospace; }
.dcp-nav { transition: background .15s; }
.dcp-nav:hover { background: #F4F5F6; }
.dcp-period:hover { background: #F4F5F6; }
.dcp-crumb:hover { color: #23262C !important; }
.dcp-kpi { transition: border-color .15s; }
.dcp-kpi:hover { border-color: #D6D8DC; }
.dcp-goal { transition: transform .15s, border-color .15s, box-shadow .15s; }
.dcp-goal:hover { border-color: #5A54D1; transform: translateY(-2px); box-shadow: 0 4px 16px -8px rgba(90,84,209,0.4); }
.dcp-pcard { transition: transform .15s, border-color .15s, box-shadow .15s; }
.dcp-pcard:hover { border-color: #C9CBCF; transform: translateY(-2px); box-shadow: 0 6px 18px -10px rgba(0,0,0,0.25); }
.dcp-tcard { transition: border-color .15s; }
.dcp-tcard:hover { border-color: #D6D8DC; }
`;

export default function BuDashboardPrototype() {
  const [view, setView] = useState<'overview' | 'board' | 'project'>('overview');
  const [layout, setLayout] = useState<'A' | 'B' | 'C'>('A');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dir, setDir] = useState<'in' | 'out'>('in');
  const [w, setW] = useState(1320);

  useEffect(() => {
    const r = () => setW(window.innerWidth);
    r();
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  const isMobile = w < 900;
  const isTablet = w < 1240;

  const openGoal = (id: string) => { setGoalId(id); setView('board'); setDir('in'); };
  const openProject = (id: string) => { setProjectId(id); setView('project'); setDir('in'); };
  const goOverview = () => { setView('overview'); setDir('out'); setGoalId(null); setProjectId(null); };
  const goBoard = () => { setView('board'); setDir('out'); setProjectId(null); };

  // ---- view models ----
  const goalsVM = GOALS.map((g) => {
    const h = HEALTH[g.st];
    return { ...g, hc: h.c, hbg: h.bg, deg: Math.round(g.pct * 3.6), border: g.cur ? '#D6D3F5' : '#E9EAEC', cardBg: g.cur ? '#FBFBFE' : '#fff' };
  });

  const projVM = (p: Proj) => {
    const h = HEALTH[p.health], f = FLOW[p.flow], a = ava(p.owner);
    return { ...p, hc: h.c, hbg: h.bg, fc: f.c, fbg: f.bg, avBg: a.bg, avC: a.c, init: p.owner[0] };
  };

  const curGoalRaw = GOALS.find((g) => g.id === goalId) || GOALS[2];
  const curGoal = { ...curGoalRaw, hc: HEALTH[curGoalRaw.st].c, hbg: HEALTH[curGoalRaw.st].bg };
  const boardProjects = PROJECTS.filter((p) => p.goalId === curGoalRaw.id).map(projVM);
  const boardCols = FLOW_ORDER.map((fl) => {
    const items = boardProjects.filter((p) => p.flow === fl);
    return { label: fl, c: FLOW[fl].c, count: items.length, items, empty: items.length === 0 };
  });
  const doneN = boardProjects.filter((p) => p.flow === '완료').length;
  const avgP = boardProjects.length ? Math.round(boardProjects.reduce((s, p) => s + p.progress, 0) / boardProjects.length) : 0;
  const boardStats = [
    { label: '평균 진척', val: avgP + '%', c: '#23262C' },
    { label: '완료', val: doneN + '/' + boardProjects.length, c: '#1C8A55' },
    { label: '목표 달성률', val: curGoalRaw.pct + '%', c: curGoal.hc },
  ];

  const curProjectRaw = PROJECTS.find((p) => p.id === projectId) || PROJECTS[0];
  const aP = ava(curProjectRaw.owner);
  const curProject = { ...curProjectRaw, fc: FLOW[curProjectRaw.flow].c, fbg: FLOW[curProjectRaw.flow].bg, hc: HEALTH[curProjectRaw.health].c, hbg: HEALTH[curProjectRaw.health].bg, avBg: aP.bg, avC: aP.c, init: curProjectRaw.owner[0] };
  const tasks = genTasks(curProjectRaw);
  const taskCols = FLOW_ORDER.map((fl) => {
    const items = tasks.filter((t) => t.st === fl).map((t) => ({ ...t, tc: fl === '완료' ? '#9AA0A6' : '#2E3138', due: t.due || '—' }));
    return { label: fl, c: FLOW[fl].c, count: items.length, items, empty: items.length === 0 };
  });
  const projStats = [
    { label: '진척률', val: curProjectRaw.progress + '%', c: curProject.hc },
    { label: '태스크', val: curProjectRaw.tdone + '/' + curProjectRaw.ttotal, c: '#23262C' },
    { label: '핵심 기여', val: curProjectRaw.contrib, c: '#1C8A55' },
    { label: '마일스톤', val: curProjectRaw.ms, c: '#23262C' },
  ];

  const crumbs: { label: string; sep: boolean; color: string; onClick: () => void }[] = [];
  crumbs.push({ label: DIVISION, sep: false, color: view === 'overview' ? '#23262C' : '#9AA0A6', onClick: goOverview });
  if (view === 'board' || view === 'project') {
    crumbs.push({ label: curGoalRaw.q + ' · ' + curGoalRaw.title, sep: true, color: view === 'board' ? '#23262C' : '#9AA0A6', onClick: goBoard });
  }
  if (view === 'project') {
    crumbs.push({ label: curProjectRaw.title, sep: true, color: '#23262C', onClick: () => {} });
  }

  const navDef = [
    { k: 'overview', label: '개요', go: goOverview },
    { k: 'board', label: '프로젝트 보드', go: () => openGoal('g3') },
    { k: 'roadmap', label: '로드맵', go: goOverview },
    { k: 'reports', label: '리포트', go: goOverview },
  ];
  const navItems = navDef.map((n) => {
    const active = (n.k === 'overview' && view === 'overview') || (n.k === 'board' && (view === 'board' || view === 'project'));
    return { label: n.label, go: n.go, color: active ? '#23262C' : '#6B7077', weight: active ? 600 : 500, bg: active ? '#F2F2F7' : 'transparent' };
  });

  const periodItems = [
    { label: '2026 1분기', pct: '100%', c: '#1C8A55' },
    { label: '2026 2분기', pct: '100%', c: '#1C8A55' },
    { label: '2026 3분기', pct: '72%', c: '#B07D12' },
    { label: '2026 4분기', pct: '8%', c: '#8A8F98' },
  ];

  const layoutDefs = [{ k: 'A', label: 'A 지표' }, { k: 'B', label: 'B 로드맵' }, { k: 'C', label: 'C 비전' }] as const;

  const roadVM = ROAD.map((r, i) => {
    const done = r.st === 'done', now = r.st === 'now';
    return {
      q: r.q, ms: r.ms,
      qc: now ? '#5A54D1' : (done ? '#6B7077' : '#A4A9AF'),
      dot: now ? '16px' : '12px',
      fill: done ? '#1C8A55' : (now ? '#5A54D1' : '#fff'),
      border: done ? 'none' : (now ? '3px solid #fff' : '1.5px solid #C8CBD0'),
      glow: now ? '0 0 0 4px #ECEBFB' : 'none',
      line: i >= ROAD.length - 1 ? 'transparent' : (done || (now && i < 3) ? '#1C8A55' : (now ? '#D6D3F5' : '#ECEDEF')),
      tc: now ? '#23262C' : (done ? '#4B4F56' : '#A4A9AF'),
      tw: (now || done) ? 600 : 500,
    };
  });

  const pagePad = isMobile ? '20px 16px 60px' : '26px 30px 60px';
  const visionSize = isMobile ? '19px' : '24px';
  const roadPad = isMobile ? '18px 16px' : '22px 24px';
  const kpiCols = isMobile ? 'repeat(1,1fr)' : (isTablet ? 'repeat(2,1fr)' : 'repeat(3,1fr)');
  const goalCols = isMobile ? 'repeat(1,1fr)' : (isTablet ? 'repeat(2,1fr)' : 'repeat(4,1fr)');
  const statCols = isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)';
  const screenAnim = dir === 'in' ? 'dcpScreenIn' : 'dcpScreenBack';

  const kpisVM = KPIS.map((k) => ({ ...k, hc: HEALTH[k.st].c, hbg: HEALTH[k.st].bg }));

  return (
    <div className="dcp" style={{ display: 'flex', height: '100vh', width: '100%', background: '#FAFAFB', color: '#23262C', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: STYLE_CSS }} />

      {!isMobile && (
        <aside style={{ width: 248, flexShrink: 0, background: '#fff', borderRight: '1px solid #ECEDEF', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid #F0F1F3' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#23262C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>d</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{DIVISION}</div>
                <div style={{ fontSize: 11, color: '#9AA0A6', marginTop: 1 }}>FY2026 · 3분기</div>
              </div>
            </div>
          </div>
          <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            {navItems.map((n, i) => (
              <div key={i} className="dcp-nav" onClick={n.go} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: n.weight, color: n.color, background: n.bg }}>
                <span style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${n.color}`, flexShrink: 0, display: 'inline-block' }} />
                <span>{n.label}</span>
              </div>
            ))}
            <div style={{ height: 1, background: '#F0F1F3', margin: '12px 6px' }} />
            <div style={{ padding: '4px 10px 8px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: '#B4B8BE' }}>시기 필터</div>
            {periodItems.map((p, i) => (
              <div key={i} className="dcp-period" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, color: '#6B7077' }}>
                <span>{p.label}</span>
                <span className="dcp-mono" style={{ fontSize: 11, color: p.c, fontWeight: 600 }}>{p.pct}</span>
              </div>
            ))}
          </nav>
          <div style={{ padding: '14px 16px', borderTop: '1px solid #F0F1F3', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#EBE9FB', color: '#5A54D1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>다</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>정다은 · 대표</div>
              <div style={{ fontSize: 10.5, color: '#9AA0A6' }}>founder &amp; team</div>
            </div>
          </div>
        </aside>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        <header style={{ height: 56, flexShrink: 0, borderBottom: '1px solid #ECEDEF', background: '#FAFAFBdd', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {c.sep && <span style={{ color: '#C8CBD0', fontSize: 14, flexShrink: 0 }}>›</span>}
                <span className="dcp-crumb" onClick={c.onClick} style={{ fontSize: 14, fontWeight: 600, color: c.color, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>{c.label}</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {view === 'overview' && (
              <div style={{ display: 'flex', background: '#F0F1F3', borderRadius: 9, padding: 3 }}>
                {layoutDefs.map((t) => (
                  <span key={t.k} onClick={() => setLayout(t.k)} style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 11px', borderRadius: 7, cursor: 'pointer', color: layout === t.k ? '#23262C' : '#8A8F98', background: layout === t.k ? '#fff' : 'transparent', boxShadow: layout === t.k ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', whiteSpace: 'nowrap' }}>{t.label}</span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 27, height: 27, borderRadius: '50%', background: '#D7E3F4', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: '#3A6FB0' }}>도</div>
              <div style={{ width: 27, height: 27, borderRadius: '50%', background: '#F4E0D7', border: '2px solid #fff', marginLeft: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: '#B0633A' }}>우</div>
              <div style={{ width: 27, height: 27, borderRadius: '50%', background: '#E0F0E4', border: '2px solid #fff', marginLeft: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: '#3A8A5B' }}>하</div>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <div key={view + dir} style={{ padding: pagePad, animation: `${screenAnim} .32s ease both` }}>

            {/* ============ OVERVIEW ============ */}
            {view === 'overview' && (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 22, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#5A54D1', marginBottom: 7 }}>2027 비전</div>
                    <div style={{ fontSize: visionSize, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.32, maxWidth: 680 }}>{VISION}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div className="dcp-mono" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>5.8억</div>
                      <div style={{ fontSize: 11, color: '#9AA0A6', marginTop: 2 }}>누적 거래액 (YTD)</div>
                    </div>
                    <div style={{ width: 1, background: '#ECEDEF', margin: '2px 4px' }} />
                    <div style={{ textAlign: 'right' }}>
                      <div className="dcp-mono" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', color: '#5A54D1' }}>8,420<span style={{ fontSize: 15 }}>명</span></div>
                      <div style={{ fontSize: 11, color: '#9AA0A6', marginTop: 2 }}>누적 댄서 회원</div>
                    </div>
                  </div>
                </div>

                {/* LAYOUT A: 지표 우선 */}
                {layout === 'A' && (
                  <div style={{ display: 'grid', gridTemplateColumns: kpiCols, gap: 12, marginBottom: 22 }}>
                    {kpisVM.map((k) => (
                      <div key={k.key} className="dcp-kpi" style={{ background: '#fff', border: '1px solid #E9EAEC', borderRadius: 14, padding: '17px 17px 15px', display: 'flex', flexDirection: 'column', gap: 9, animation: 'dcpFadeUp .4s ease both' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12.5, color: '#6B7077', fontWeight: 500 }}>{k.label}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: k.hc, background: k.hbg }}>{k.st}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                          <span className="dcp-mono" style={{ fontSize: 29, fontWeight: 600, letterSpacing: '-1px', color: '#1E2127' }}>{k.val}</span>
                          <span style={{ fontSize: 13, color: '#9AA0A6', fontWeight: 600 }}>{k.unit}</span>
                        </div>
                        <div style={{ height: 5, background: '#F0F1F3', borderRadius: 6, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 6, width: `${k.val}%`, background: k.hc }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="dcp-mono" style={{ fontSize: 11, color: '#8A8F98' }}>{k.sub}</span>
                          <span style={{ fontSize: 11, color: '#6B7077', fontWeight: 600 }}>{k.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* LAYOUT B: 로드맵 우선 - compact kpi rail */}
                {layout === 'B' && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 18, overflowX: 'auto', paddingBottom: 2 }}>
                    {kpisVM.map((k) => (
                      <div key={k.key} style={{ flex: 1, minWidth: 138, background: '#fff', border: '1px solid #E9EAEC', borderRadius: 12, padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: k.hc }} />
                          <span style={{ fontSize: 11.5, color: '#6B7077', fontWeight: 500, whiteSpace: 'nowrap' }}>{k.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                          <span className="dcp-mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px' }}>{k.val}</span>
                          <span style={{ fontSize: 11, color: '#A4A9AF', fontWeight: 600 }}>{k.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ROADMAP */}
                <div style={{ background: '#fff', border: '1px solid #E9EAEC', borderRadius: 16, padding: roadPad, marginBottom: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>장기 로드맵</div>
                      <div style={{ fontSize: 11.5, color: '#9AA0A6', marginTop: 2 }}>2025 — 2027 · 비전까지의 마일스톤</div>
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#8A8F98' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1C8A55' }} />완료</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5A54D1' }} />진행</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #C8CBD0' }} />예정</span>
                    </div>
                  </div>
                  <div style={{ position: 'relative', overflowX: 'auto', paddingBottom: 4 }}>
                    <div style={{ display: 'flex', minWidth: 760 }}>
                      {roadVM.map((r, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                          <div className="dcp-mono" style={{ fontSize: 11, fontWeight: 600, color: r.qc, marginBottom: 11 }}>{r.q}</div>
                          <div style={{ height: 2, width: '100%', background: r.line, position: 'absolute', top: 38, left: '50%' }} />
                          <div style={{ width: r.dot, height: r.dot, borderRadius: '50%', background: r.fill, border: r.border, zIndex: 1, boxShadow: r.glow }} />
                          <div style={{ marginTop: 13, fontSize: 11, lineHeight: 1.35, textAlign: 'center', color: r.tc, fontWeight: r.tw, maxWidth: 96, minHeight: 30 }}>{r.ms}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* GOALS */}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 13 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>시기별 목표 <span style={{ color: '#A4A9AF', fontWeight: 500 }}>· 2026</span></div>
                  <span style={{ fontSize: 11.5, color: '#9AA0A6' }}>목표를 클릭해 프로젝트로 이동 →</span>
                </div>

                {/* LAYOUT C: 비전 포커스 - rings */}
                {layout === 'C' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: goalCols, gap: 12 }}>
                    {goalsVM.map((g) => (
                      <div key={g.id} className="dcp-goal" onClick={() => openGoal(g.id)} style={{ background: g.cardBg, border: `1px solid ${g.border}`, borderRadius: 16, padding: '20px 18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 13 }}>
                        <div style={{ position: 'relative', width: 84, height: 84 }}>
                          <div style={{ width: 84, height: 84, borderRadius: '50%', background: `conic-gradient(${g.hc} ${g.deg}deg, #ECEDEF 0deg)` }} />
                          <div style={{ position: 'absolute', inset: 9, borderRadius: '50%', background: g.cardBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="dcp-mono" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.5px' }}>{g.pct}</span>
                            <span style={{ fontSize: 9, color: '#A4A9AF', fontWeight: 600 }}>{g.q}</span>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{g.title}</div>
                          <div className="dcp-mono" style={{ fontSize: 11.5, color: '#8A8F98' }}>{g.target}</div>
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: g.hc, background: g.hbg }}>{g.st} · {g.proj}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: goalCols, gap: 12 }}>
                    {goalsVM.map((g) => (
                      <div key={g.id} className="dcp-goal" onClick={() => openGoal(g.id)} style={{ background: g.cardBg, border: `1px solid ${g.border}`, borderRadius: 14, padding: 17, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span className="dcp-mono" style={{ fontSize: 12, fontWeight: 700, color: g.hc, padding: '2px 8px', borderRadius: 6, background: g.hbg }}>{g.q}</span>
                          {g.cur && <span style={{ fontSize: 10, fontWeight: 700, color: '#5A54D1' }}>● 현재</span>}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5, lineHeight: 1.3 }}>{g.title}</div>
                          <div className="dcp-mono" style={{ fontSize: 11.5, color: '#8A8F98' }}>목표 {g.target}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: 11, color: '#9AA0A6' }}>달성률</span>
                            <span className="dcp-mono" style={{ fontSize: 14, fontWeight: 700, color: g.hc }}>{g.pct}%</span>
                          </div>
                          <div style={{ height: 6, background: '#F0F1F3', borderRadius: 6, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 6, width: `${g.pct}%`, background: g.hc }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F0F1F3', paddingTop: 11 }}>
                          <span style={{ fontSize: 11.5, color: '#6B7077', fontWeight: 500 }}>{g.proj}</span>
                          <span style={{ fontSize: 12, color: '#5A54D1', fontWeight: 600 }}>보기 →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ============ BOARD ============ */}
            {view === 'board' && (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span className="dcp-mono" style={{ fontSize: 12, fontWeight: 700, color: curGoal.hc, padding: '3px 9px', borderRadius: 7, background: curGoal.hbg }}>{curGoal.q}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: curGoal.hc, background: curGoal.hbg }}>{curGoal.st}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}>{curGoal.title}</div>
                    <div style={{ fontSize: 12.5, color: '#8A8F98', marginTop: 5 }}>목표 {curGoal.target} · {curGoal.summary}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                    {boardStats.map((s, i) => (
                      <div key={i} style={{ background: '#fff', border: '1px solid #E9EAEC', borderRadius: 12, padding: '11px 16px', minWidth: 96 }}>
                        <div className="dcp-mono" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', color: s.c }}>{s.val}</div>
                        <div style={{ fontSize: 11, color: '#9AA0A6', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
                  {boardCols.map((col) => (
                    <div key={col.label} style={{ flex: 1, minWidth: 262, display: 'flex', flexDirection: 'column', gap: 11 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 9, height: 9, borderRadius: 3, background: col.c }} />
                          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{col.label}</span>
                          <span className="dcp-mono" style={{ fontSize: 11, color: '#A4A9AF' }}>{col.count}</span>
                        </div>
                      </div>
                      {col.items.map((p) => (
                        <div key={p.id} className="dcp-pcard" onClick={() => openProject(p.id)} style={{ background: '#fff', border: '1px solid #E9EAEC', borderRadius: 13, padding: 15, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, animation: 'dcpFadeUp .4s ease both' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.32 }}>{p.title}</span>
                            <span title={p.health} style={{ width: 8, height: 8, borderRadius: '50%', background: p.hc, flexShrink: 0, marginTop: 5 }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: 10.5, color: '#9AA0A6' }}>진척</span>
                              <span className="dcp-mono" style={{ fontSize: 12, fontWeight: 700, color: p.hc }}>{p.progress}%</span>
                            </div>
                            <div style={{ height: 5, background: '#F0F1F3', borderRadius: 6, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 6, width: `${p.progress}%`, background: p.hc }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className="dcp-mono" style={{ fontSize: 10.5, fontWeight: 600, color: '#3A8A5B', background: '#E8F3EC', padding: '2px 8px', borderRadius: 6 }}>{p.contrib}</span>
                            <span style={{ fontSize: 10.5, color: '#8A8F98', background: '#F4F5F6', padding: '2px 8px', borderRadius: 6 }}>{p.ms}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F4F5F6', paddingTop: 11 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ width: 21, height: 21, borderRadius: '50%', background: p.avBg, color: p.avC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{p.init}</span>
                              <span style={{ fontSize: 11.5, color: '#6B7077' }}>{p.owner} <span style={{ color: '#A4A9AF' }}>· {p.role}</span></span>
                            </div>
                            <span className="dcp-mono" style={{ fontSize: 10.5, color: '#A4A9AF' }}>✓ {p.tdone}/{p.ttotal}</span>
                          </div>
                        </div>
                      ))}
                      {col.empty && <div style={{ border: '1.5px dashed #E3E5E8', borderRadius: 13, padding: 22, textAlign: 'center', fontSize: 11.5, color: '#B4B8BE' }}>비어 있음</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ============ PROJECT DETAIL ============ */}
            {view === 'project' && (
              <>
                <div style={{ background: '#fff', border: '1px solid #E9EAEC', borderRadius: 16, padding: 22, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: curProject.fc, background: curProject.fbg }}>{curProject.flow}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: curProject.hc, background: curProject.hbg }}>● {curProject.health}</span>
                      </div>
                      <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: '-0.4px' }}>{curProject.title}</div>
                      <div style={{ fontSize: 12.5, color: '#8A8F98', marginTop: 6, maxWidth: 560, lineHeight: 1.5 }}>{curProject.desc}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                      <span style={{ width: 30, height: 30, borderRadius: '50%', background: curProject.avBg, color: curProject.avC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{curProject.init}</span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{curProject.owner}</div>
                        <div style={{ fontSize: 10.5, color: '#9AA0A6' }}>{curProject.role} 리드 · {curProject.team}명 팀</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: statCols, gap: 1, background: '#F0F1F3', borderRadius: 12, overflow: 'hidden', marginTop: 20 }}>
                    {projStats.map((s, i) => (
                      <div key={i} style={{ background: '#fff', padding: '14px 16px' }}>
                        <div style={{ fontSize: 11, color: '#9AA0A6', marginBottom: 5 }}>{s.label}</div>
                        <div className="dcp-mono" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px', color: s.c }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 13 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>태스크 <span className="dcp-mono" style={{ color: '#A4A9AF', fontWeight: 500 }}>· {curProject.tdone}/{curProject.ttotal}</span></div>
                  <span style={{ fontSize: 11.5, color: '#9AA0A6' }}>완료된 태스크가 프로젝트 진척을 끌어올립니다</span>
                </div>
                <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
                  {taskCols.map((col) => (
                    <div key={col.label} style={{ flex: 1, minWidth: 248, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: col.c }} />
                        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{col.label}</span>
                        <span className="dcp-mono" style={{ fontSize: 11, color: '#A4A9AF' }}>{col.count}</span>
                      </div>
                      {col.items.map((t, i) => (
                        <div key={i} className="dcp-tcard" style={{ background: '#fff', border: '1px solid #E9EAEC', borderRadius: 11, padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 10, animation: 'dcpFadeUp .4s ease both' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: t.tc }}>{t.title}</span>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 19, height: 19, borderRadius: '50%', background: '#F0F1F3', color: '#6B7077', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700 }}>{t.init}</span>
                              <span style={{ fontSize: 11, color: '#8A8F98' }}>{t.who}</span>
                            </div>
                            <span className="dcp-mono" style={{ fontSize: 10, color: '#B4B8BE' }}>{t.due}</span>
                          </div>
                        </div>
                      ))}
                      {col.empty && <div style={{ border: '1.5px dashed #E3E5E8', borderRadius: 11, padding: 18, textAlign: 'center', fontSize: 11, color: '#B4B8BE' }}>없음</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
