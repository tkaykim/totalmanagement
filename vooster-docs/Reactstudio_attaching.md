import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Clapperboard, 
  Camera, 
  Users, 
  Briefcase, 
  Receipt, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Settings, 
  Bell, 
  Search, 
  Plus, 
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertCircle,
  FileText,
  DollarSign,
  Clock,
  Menu,
  X,
  MapPin,
  Phone,
  Mail,
  MoreHorizontal,
  Filter,
  User,
  Star,
  BookOpen,
  Link as LinkIcon,
  CheckCircle2,
  Youtube,
  PlayCircle,
  BarChart2,
  Printer,
  Share2,
  Edit3,
  Download,
  FolderOpen
} from 'lucide-react';

// --- Mock Data (영상 제작사 실무 데이터 반영 - 최신화) ---

const MOCK_PROJECTS = [
  { id: 1, title: 'S 전자 하반기 TVC', client: 'S 전자', status: 'In Production', date: '2025-06-15', budget: 85000000, pm: '오동현' },
  { id: 2, title: 'K-Pop 그룹 "Starlight" MV', client: 'Star Ent', status: 'Pre-Production', date: '2025-07-01', budget: 120000000, pm: '홍철화' },
  { id: 3, title: '2025 스타트업 페스티벌 스케치', client: '창업진흥원', status: 'Post-Production', date: '2025-05-20', budget: 15000000, pm: '홍철화' },
  { id: 4, title: 'F사 패션 룩북', client: 'F 팩토리', status: 'Completed', date: '2025-05-10', budget: 8000000, pm: '오동현' },
  { id: 5, title: '공익광고협의회 캠페인', client: 'KOBACO', status: 'Planning', date: '2025-08-10', budget: 45000000, pm: '오동현' },
];

// 자체 채널 목업 데이터
const MOCK_CHANNELS = [
  { 
    id: 'yumeki', 
    name: '유메키 (Yumeki Takenaka)', 
    url: 'https://www.youtube.com/@yumekitakenaka',
    subscribers: '45.2K', 
    totalViews: '3.2M', 
    status: 'Active',
    manager: '홍철화',
    nextUpload: '2025-05-30',
    recentVideo: '1MILLION Dance Studio VLOG #12'
  },
  { 
    id: 'uwa', 
    name: '우와 (Uwa Kitadera)', 
    url: 'https://www.youtube.com/@uwakitadera',
    subscribers: '12.8K', 
    totalViews: '850K', 
    status: 'Growing',
    manager: '권혁준',
    nextUpload: '2025-06-02',
    recentVideo: 'K-POP Cover Dance Behind'
  }
];

// 자체 채널 콘텐츠 파이프라인 목업
const MOCK_CHANNEL_CONTENTS = [
  { id: 101, channelId: 'yumeki', title: '여름 댄스 워크샵 브이로그', stage: 'Editing', assignee: '신재민', dDay: 3, uploadDate: '2025-05-30' },
  { id: 102, channelId: 'yumeki', title: 'Q&A 답변 영상', stage: 'Planning', assignee: '홍철화', dDay: 10, uploadDate: '2025-06-06' },
  { id: 201, channelId: 'uwa', title: '홍대 길거리 게릴라 댄스', stage: 'Shooting', assignee: '권혁준', dDay: 5, uploadDate: '2025-06-02' },
  { id: 202, channelId: 'uwa', title: '숏폼 챌린지 모음.zip', stage: 'Uploaded', assignee: '신재민', dDay: -2, uploadDate: '2025-05-25' },
];

const MOCK_EQUIPMENT = [
  { id: 1, name: 'Sony FX6 Full-Frame', category: 'Camera', serial: 'SN-FX6-001', status: 'Rented', location: '현장 (MV)', borrower: '홍철화', returnDate: '2025-05-29' },
  { id: 2, name: 'Sony FX3', category: 'Camera', serial: 'SN-FX3-002', status: 'Available', location: '장비실 A-1', borrower: '-', returnDate: '-' },
  { id: 3, name: 'Aputure 600d Pro', category: 'Lighting', serial: 'SN-AP-600', status: 'Maintenance', location: '수리센터', borrower: '-', returnDate: '2025-06-01' },
  { id: 4, name: 'DJI Ronin RS3 Pro', category: 'Grip', serial: 'SN-DJI-003', status: 'Available', location: '장비실 B-2', borrower: '-', returnDate: '-' },
  { id: 5, name: 'Canon 24-70mm f2.8 II', category: 'Lens', serial: 'SN-CN-2470', status: 'Rented', location: '현장 (TVC)', borrower: '김동현', returnDate: '2025-05-30' }, 
];

const MOCK_STAFF = [
  { id: 1, name: '오동현', role: '총괄 프로듀서', type: 'Internal', phone: '010-1234-5678', email: 'dh.oh@reactstudio.com', status: 'Active', notes: '전체 총괄 및 경영 지원' },
  { id: 2, name: '홍철화', role: '연출/감독', type: 'Internal', phone: '010-2345-6789', email: 'ch.hong@reactstudio.com', status: 'On Set', notes: '자회사 플로우메이커 대표이사 겸임' },
  { id: 3, name: '박조명', role: '조명감독', type: 'Freelance', phone: '010-9876-5432', email: 'light.park@gmail.com', status: 'Available', notes: '주말 촬영 선호, 야간 할증 있음' },
  { id: 4, name: '이편집', role: '2D 모션/편집', type: 'Freelance', phone: '010-5555-4444', email: 'edit.lee@gmail.com', status: 'Busy', notes: '현재 장기 프로젝트 참여 중 (6월 말 종료)' },
  { id: 6, name: '권혁준', role: 'PD (공연기획)', type: 'Internal', phone: '010-3333-1212', email: 'hj.kwon@reactstudio.com', status: 'Active', notes: '공연 및 행사 기획 전담' },
  { id: 7, name: '황여경', role: 'PD (공연기획)', type: 'Internal', phone: '010-4444-2323', email: 'yk.hwang@reactstudio.com', status: 'Active', notes: '현장 운영 및 아티스트 케어' },
  { id: 8, name: '신재민', role: '콘텐츠/인턴', type: 'Internal', phone: '010-5555-3434', email: 'jm.shin@reactstudio.com', status: 'Active', notes: '편집 보조 및 데이터 관리 (인턴)' },
  { id: 9, name: '김동현', role: 'ERP/단체복', type: 'Internal', phone: '010-6666-4545', email: 'dh.kim@reactstudio.com', status: 'Active', notes: '장비 관리 및 단체복 제작 핸들링' },
  { id: 10, name: '김민정', role: '회계/세무', type: 'Internal', phone: '010-7777-5656', email: 'mj.kim@reactstudio.com', status: 'Active', notes: '세금계산서 발행 및 정산 전담' },
];

const MOCK_FINANCE = [
  { id: 1, type: 'Income', category: '계약금', project: 'S 전자 하반기 TVC', amount: 42500000, date: '2025-05-01', status: 'Paid' },
  { id: 2, type: 'Expense', category: '로케이션 대관', project: 'S 전자 하반기 TVC', amount: 3500000, date: '2025-05-15', status: 'Approved' },
  { id: 3, type: 'Expense', category: '진행비(식대)', project: 'K-Pop MV', amount: 560000, date: '2025-05-22', status: 'Pending' },
  { id: 4, type: 'Income', category: '잔금', project: 'F사 패션 룩북', amount: 4000000, date: '2025-05-25', status: 'Overdue' },
];

const MOCK_TODOS = [
  { id: 1, task: 'S 전자 콘티 수정안 전달', deadline: 'Today', priority: 'High', assignee: '오동현', completed: false },
  { id: 2, task: '장비실 재고 조사 (분기별)', deadline: 'Tomorrow', priority: 'Medium', assignee: '김동현', completed: false },
  { id: 3, task: 'K-Pop MV 촬영 스케줄 픽스', deadline: '2025-05-28', priority: 'High', assignee: '홍철화', completed: true },
];

const MOCK_CLIENTS = [
  { id: 1, name: 'S 전자', industry: 'IT/가전', contact: '김철수 부장', phone: '02-1234-5678', email: 'cs.kim@samsung.com', projects: 3, totalSpent: 150000000, status: 'Active', address: '서울 서초구 서초대로 11', lastMeeting: '2025-05-10' },
  { id: 2, name: 'Star Ent', industry: '엔터테인먼트', contact: '이민지 실장', phone: '02-9876-5432', email: 'mj.lee@star.ent', projects: 1, totalSpent: 120000000, status: 'Active', address: '서울 강남구 압구정로 32', lastMeeting: '2025-05-18' },
  { id: 3, name: '창업진흥원', industry: '공공기관', contact: '박주무관', phone: '042-111-2222', email: 'park@kized.or.kr', projects: 5, totalSpent: 50000000, status: 'Active', address: '대전 서구 한밭대로 77', lastMeeting: '2025-04-20' },
  { id: 4, name: 'F 팩토리', industry: '패션', contact: '최디자이너', phone: '010-3333-4444', email: 'choi@factory.com', projects: 2, totalSpent: 16000000, status: 'Inactive', address: '서울 성동구 아차산로 15', lastMeeting: '2024-12-10' },
];

const MOCK_MANUALS = [
  { 
    id: 1, 
    title: '신규 입사자 온보딩 가이드 (종합)', 
    category: 'Onboarding', 
    updated: '2025-01-10', 
    author: '오동현',
    type: 'doc',
    content: [
      { type: 'header', text: '환영합니다!' },
      { type: 'text', text: 'React Studio의 가족이 되신 것을 환영합니다. 원활한 업무 적응을 위해 아래 단계를 완료해주세요.' },
      { type: 'check', text: '사내 메신저 및 인트라넷 초대 수락' },
      { type: 'check', text: '구글 워크스페이스 계정 생성 (IT팀 요청)' },
      { type: 'check', text: '근로계약서 및 보안서약서 작성' },
      { type: 'check', text: 'ERP 시스템 계정 발급 및 사용법 교육' }
    ]
  },
  { 
    id: 2, 
    title: '촬영 장비 대여/반납 검수 매뉴얼', 
    category: 'Tech', 
    updated: '2025-04-15', 
    author: '김동현',
    type: 'doc',
    content: [
      { type: 'header', text: '장비 반출 시 점검 사항' },
      { type: 'alert', text: '장비 파손 방지를 위해 반드시 케이스를 평평한 곳에 놓고 개방하세요.' },
      { type: 'check', text: '[바디] 센서 먼지 확인 및 스크래치 점검' },
      { type: 'check', text: '[렌즈] 앞/뒤 알 스크래치 및 곰팡이 확인' },
      { type: 'check', text: '[배터리] 완충 여부 및 개수 확인 (기본 3개)' },
      { type: 'check', text: '[메모리] 포맷 여부 확인 및 인식 테스트' },
      { type: 'text', text: '특이사항 발견 시 즉시 사진 촬영 후 ERP > 장비 > 코멘트에 업로드 바랍니다.' }
    ]
  },
  { 
    id: 3, 
    title: '로케이션 헌팅 및 섭외 가이드', 
    category: 'Production', 
    updated: '2024-12-05', 
    author: '홍철화',
    type: 'doc',
    content: [
      { type: 'header', text: '섭외 프로세스' },
      { type: 'step', text: '시나리오 기반 필요 공간 리스트업' },
      { type: 'step', text: '후보지 3곳 이상 답사 (채광 시간 체크 필수)' },
      { type: 'step', text: '소음, 주차 공간, 전기 용량(배전반) 확인' },
      { type: 'step', text: '대관료 협상 및 계약서 작성 (법인카드 사용)' }
    ]
  },
  { 
    id: 4, 
    title: '법인카드 사용 및 지출결의서 작성법', 
    category: 'Admin', 
    updated: '2025-02-20', 
    author: '김민정',
    type: 'doc',
    content: [
      { type: 'header', text: '지출 규정' },
      { type: 'text', text: '회계 투명성을 위해 아래 한도를 준수해주세요.' },
      { type: 'bullet', text: '식대: 1인 15,000원 한도 (야근 시 20,000원)' },
      { type: 'bullet', text: '영수증 필히 지참 (모바일 영수증 가능)' },
      { type: 'bullet', text: 'ERP > 정산 탭에서 사용 내역 입력' },
      { type: 'bullet', text: '프로젝트 코드 반드시 기입할 것' }
    ]
  },
];

const MOCK_KANBAN = [
  { id: 'todo', title: 'To Do (기획/준비)', items: [
      { id: 1, title: 'KOBACO 기획안 작성', assignee: '오동현', tag: 'Planning', priority: 'High', manualId: null },
      { id: 2, title: '6월 장비 렌탈 견적 비교', assignee: '김동현', tag: 'Admin', priority: 'Medium', manualId: 2 } 
    ] 
  },
  { id: 'progress', title: 'In Progress (진행중)', items: [
      { id: 3, title: 'S 전자 2차 콘티 드로잉', assignee: '오동현', tag: 'Design', priority: 'High', manualId: null },
      { id: 4, title: 'MV 로케이션 헌팅 (파주)', assignee: '홍철화', tag: 'Pre-Prod', priority: 'High', manualId: 3 } 
    ] 
  },
  { id: 'review', title: 'Review (시사/피드백)', items: [
      { id: 5, title: '창업진흥원 가편집본 시사', assignee: '신재민', tag: 'Editing', priority: 'High', manualId: null } 
    ] 
  },
  { id: 'done', title: 'Done (완료)', items: [
      { id: 6, title: 'F사 룩북 납품 및 정산', assignee: '김민정', tag: 'Finance', priority: 'Low', manualId: 4 }
    ] 
  }
];

const MOCK_EVENTS = [
  { id: 1, title: 'S 전자 킥오프', date: 2, type: 'meeting', description: '하반기 광고 방향성 논의' },
  { id: 2, title: '어린이날', date: 5, type: 'holiday', description: '공휴일' },
  { id: 3, title: 'MV 촬영 Day 1', date: 12, type: 'shoot', description: '남양주 세트장 A' },
  { id: 4, title: 'MV 촬영 Day 2', date: 13, type: 'shoot', description: '야외 로케이션 (인천)' },
  { id: 5, title: '부처님오신날', date: 15, type: 'holiday', description: '공휴일' },
  { id: 6, title: '창업진흥원 납품', date: 20, type: 'deadline', description: '최종 마스터본 전달' },
  { id: 7, title: '전체 회식', date: 30, type: 'event', description: '5월 마감 회식' },
];

// --- Shared Components ---

const StatusBadge = ({ status }) => {
  const styles = {
    // Project Status
    'In Production': 'bg-blue-100 text-blue-800 border-blue-200',
    'Pre-Production': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Post-Production': 'bg-purple-100 text-purple-800 border-purple-200',
    'Completed': 'bg-gray-100 text-gray-800 border-gray-200',
    'Planning': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    // Equipment Status
    'Available': 'bg-green-100 text-green-800 border-green-200',
    'Rented': 'bg-red-100 text-red-800 border-red-200',
    'Maintenance': 'bg-orange-100 text-orange-800 border-orange-200',
    // Finance Status
    'Paid': 'bg-green-100 text-green-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Overdue': 'bg-red-100 text-red-800',
    'Approved': 'bg-blue-100 text-blue-800',
    // Staff/Client Status
    'Active': 'bg-green-100 text-green-800',
    'On Set': 'bg-red-100 text-red-800',
    'Busy': 'bg-orange-100 text-orange-800',
    'Inactive': 'bg-gray-100 text-gray-500',
    'Growing': 'bg-purple-100 text-purple-800 border-purple-200', // For Channels
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
};

const StatCard = ({ title, value, subtext, icon: Icon, trend }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-slate-50 rounded-lg">
        <Icon className="w-6 h-6 text-slate-700" />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {trend === 'up' ? '▲ 12%' : '▼ 5%'}
        </span>
      )}
    </div>
    <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
  </div>
);

// --- Module Views ---

const DashboardView = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="진행 중 프로젝트" value="5 건" subtext="Pre: 2 / Prod: 1 / Post: 2" icon={Clapperboard} trend="up" />
        <StatCard title="이번 달 매출 예상" value="₩ 2.1억" subtext="지난달 대비 +15%" icon={DollarSign} trend="up" />
        <StatCard title="운영 채널 구독자" value="58K" subtext="유메키 + 우와 (통합)" icon={Youtube} />
        <StatCard title="미결제 청구서" value="3 건" subtext="총 1,200만원 (독촉 필요)" icon={AlertCircle} trend="down" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">이번 주 주요 일정</h3>
            <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">전체 달력 보기</button>
          </div>
          <div className="space-y-4">
            {[
              { day: '오늘', date: '5.27 (화)', event: 'S 전자 TVC 로케이션 헌팅', time: '14:00', type: 'meeting' },
              { day: '내일', date: '5.28 (수)', event: 'K-Pop MV 촬영 1일차', time: '06:00', type: 'shoot' },
              { day: '모레', date: '5.29 (목)', event: '창업진흥원 1차 시사', time: '16:00', type: 'deadline' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0">
                <div className="w-20 text-center mr-4">
                  <div className="text-xs text-gray-500 font-medium">{item.day}</div>
                  <div className="text-sm font-bold text-gray-800">{item.date}</div>
                </div>
                <div className={`w-1 h-10 rounded-full mr-4 ${item.type === 'shoot' ? 'bg-red-500' : item.type === 'meeting' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 text-sm">{item.event}</h4>
                  <p className="text-xs text-gray-500 flex items-center mt-1"><Clock className="w-3 h-3 mr-1" /> {item.time}</p>
                </div>
                <button className="p-2 text-gray-400 hover:text-indigo-600"><ChevronRight className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">긴급 할 일</h3>
            <button className="p-1 rounded-full hover:bg-gray-100"><Plus className="w-4 h-4 text-gray-600" /></button>
          </div>
          <div className="space-y-3">
            {MOCK_TODOS.filter(t => !t.completed).map(todo => (
              <div key={todo.id} className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-100">
                <input type="checkbox" className="mt-1 mr-3 rounded text-indigo-600 focus:ring-indigo-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{todo.task}</p>
                  <div className="flex items-center mt-2 space-x-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${todo.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{todo.priority}</span>
                    <span className="text-xs text-gray-400">{todo.assignee}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectListView = () => {
  const [viewMode, setViewMode] = useState('client'); // 'client' or 'channel'

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Tab Switcher */}
      <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit mb-2">
        <button 
          onClick={() => setViewMode('client')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'client' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Client Work (외주)
        </button>
        <button 
          onClick={() => setViewMode('channel')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'channel' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Channel Ops (자체 채널)
        </button>
      </div>

      {viewMode === 'client' ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm gap-4">
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" placeholder="프로젝트 검색..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64" />
            </div>
            <button className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm w-full md:w-auto justify-center">
              <Plus className="w-4 h-4 mr-2" /> 새 프로젝트
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">프로젝트명</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">클라이언트</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">PM / 감독</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">예산</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">마감일</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_PROJECTS.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{project.title}</div>
                      <div className="text-xs text-gray-400 mt-1">CODE: 250{project.id}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{project.client}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 flex items-center">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 mr-2 border border-slate-200">
                        {project.pm.charAt(0)}
                      </div>
                      {project.pm}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">₩ {project.budget.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{project.date}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-4 h-4 ml-auto" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Channel Ops View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {MOCK_CHANNELS.map((channel) => (
            <div key={channel.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-red-50 rounded-lg mr-3">
                      <Youtube className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">{channel.name}</h3>
                      <a href={channel.url} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-indigo-600 flex items-center mt-1">
                        채널 바로가기 <LinkIcon className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  </div>
                  <StatusBadge status={channel.status} />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">구독자 수</p>
                    <p className="text-lg font-bold text-gray-800">{channel.subscribers}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">총 조회수</p>
                    <p className="text-lg font-bold text-gray-800">{channel.totalViews}</p>
                  </div>
                </div>

                <div className="text-sm text-gray-600 flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    담당: {channel.manager}
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                    다음 업로드: <span className="font-bold text-indigo-600 ml-1">{channel.nextUpload}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-gray-50 p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
                  <Clapperboard className="w-3 h-3 mr-1" /> 콘텐츠 제작 파이프라인
                </h4>
                <div className="space-y-2">
                  {MOCK_CHANNEL_CONTENTS.filter(c => c.channelId === channel.id).map(content => (
                    <div key={content.id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded mr-2 border
                            ${content.stage === 'Uploaded' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                              content.stage === 'Editing' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                              content.stage === 'Shooting' ? 'bg-red-50 text-red-600 border-red-100' :
                              'bg-yellow-50 text-yellow-600 border-yellow-100'}`}>
                            {content.stage}
                          </span>
                          <span className="text-sm font-medium text-gray-800 truncate">{content.title}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-400">
                          <span className="mr-2">{content.assignee}</span>
                          {content.dDay > 0 ? (
                            <span className="text-red-500 font-bold">D-{content.dDay}</span>
                          ) : (
                            <span>{content.uploadDate}</span>
                          )}
                        </div>
                      </div>
                      <button className="text-gray-300 hover:text-indigo-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-indigo-600 transition-colors">
                    + 새 콘텐츠 기획 추가
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EquipmentView = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">가용 장비</p>
            <p className="text-xl font-bold text-green-600">65%</p>
          </div>
          <CheckSquare className="w-8 h-8 text-green-100" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">대여 중 (현장)</p>
            <p className="text-xl font-bold text-indigo-600">30%</p>
          </div>
          <Camera className="w-8 h-8 text-indigo-100" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">수리 / 분실</p>
            <p className="text-xl font-bold text-red-600">5%</p>
          </div>
          <Settings className="w-8 h-8 text-red-100" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <h3 className="font-bold text-gray-800">장비 전체 리스트</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center">
              <span className="mr-1">📷</span> 바코드 스캔
            </button>
            <button className="flex-1 sm:flex-none px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">대여 등록</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">장비명</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">분류</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">시리얼 넘버</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">현재 위치</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">반납 예정일</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK_EQUIPMENT.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-500">{item.serial}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{item.location}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.returnDate}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const FinanceView = () => {
  return (
    <div className="space-y-4 animate-fade-in">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
           <div className="flex justify-between items-start">
             <div>
               <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">5월 총 매출</h3>
               <p className="text-3xl font-bold text-gray-900">₩ 142,000,000</p>
             </div>
             <div className="p-2 bg-blue-50 rounded-lg">
               <TrendingUp className="w-5 h-5 text-blue-600" />
             </div>
           </div>
           <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500 w-[70%]"></div>
           </div>
           <p className="text-xs text-gray-400 mt-2">목표 달성률 70% (전년 대비 +5%)</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
           <div className="flex justify-between items-start">
             <div>
               <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">5월 총 지출 (인건비/제작비)</h3>
               <p className="text-3xl font-bold text-gray-900">₩ 68,500,000</p>
             </div>
             <div className="p-2 bg-red-50 rounded-lg">
               <Receipt className="w-5 h-5 text-red-600" />
             </div>
           </div>
           <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-red-400 w-[45%]"></div>
           </div>
           <p className="text-xs text-gray-400 mt-2">예산 대비 45% 사용</p>
        </div>
       </div>

       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">최근 입출금 내역</h3>
            <button className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition-colors">영수증 등록</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">날짜</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">구분</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">항목</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">관련 프로젝트</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">금액</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK_FINANCE.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">{item.date}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold ${item.type === 'Income' ? 'text-blue-600' : 'text-red-600'}`}>
                      {item.type === 'Income' ? '입금' : '출금'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">{item.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.project}</td>
                  <td className={`px-6 py-4 font-mono font-medium ${item.type === 'Income' ? 'text-blue-600' : 'text-red-600'}`}>
                    {item.type === 'Income' ? '+' : '-'} {item.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                     <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
       </div>
    </div>
  );
};

const StaffView = () => {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
     <div className="space-y-4 animate-fade-in">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
           <h3 className="font-bold text-gray-800">인력 풀 (Internal & Freelance)</h3>
           <button className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center">
             <Plus className="w-4 h-4 mr-1"/> 스태프 등록
           </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header Row for Large Screens */}
          <div className="hidden md:flex bg-gray-50 border-b border-gray-200 px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
             <div className="flex-1">이름 / 역할</div>
             <div className="w-32">소속</div>
             <div className="w-40">연락처</div>
             <div className="w-24">상태</div>
             <div className="w-10"></div>
          </div>

          <div className="divide-y divide-gray-100">
            {MOCK_STAFF.map((staff) => (
              <div key={staff.id} className="group">
                {/* Summary Row */}
                <div 
                  onClick={() => toggleExpand(staff.id)}
                  className={`px-6 py-4 flex flex-col md:flex-row md:items-center cursor-pointer hover:bg-gray-50 transition-colors ${expandedId === staff.id ? 'bg-gray-50' : ''}`}
                >
                  <div className="flex-1 flex items-center">
                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 mr-3 border border-slate-200">
                       {staff.name.charAt(0)}
                     </div>
                     <div>
                       <div className="font-medium text-gray-900">{staff.name}</div>
                       <div className="text-sm text-gray-500">{staff.role}</div>
                     </div>
                  </div>
                  
                  <div className="mt-2 md:mt-0 w-full md:w-32 flex items-center">
                    <span className={`px-2 py-1 rounded text-xs ${staff.type === 'Internal' ? 'bg-slate-100 text-slate-700' : 'bg-orange-50 text-orange-700'}`}>
                      {staff.type === 'Internal' ? '정규직' : '프리랜서'}
                    </span>
                  </div>

                  <div className="mt-2 md:mt-0 w-full md:w-40 text-sm text-gray-600 flex items-center">
                     <Phone className="w-3 h-3 mr-1 text-gray-400" /> {staff.phone}
                  </div>

                  <div className="mt-2 md:mt-0 w-full md:w-24">
                     <StatusBadge status={staff.status} />
                  </div>

                  <div className="hidden md:flex w-10 justify-end">
                     {expandedId === staff.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === staff.id && (
                  <div className="px-6 pb-6 pt-2 bg-gray-50 border-t border-gray-100 animate-fade-in">
                     <div className="ml-0 md:ml-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <div className="flex items-center text-sm text-gray-700">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" /> {staff.email}
                           </div>
                           <div className="flex items-start text-sm text-gray-700">
                              <FileText className="w-4 h-4 mr-2 text-gray-400 mt-0.5" /> 
                              <span className="text-gray-500">메모: {staff.notes}</span>
                           </div>
                        </div>
                        <div className="flex items-end justify-start md:justify-end gap-2 mt-4 md:mt-0">
                           <button className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100">프로필 수정</button>
                           <button className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">급여/정산 내역</button>
                        </div>
                     </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
     </div>
  );
};

const ScheduleView = () => {
  // Simple Mock Calendar for May 2025 (Starts Thursday)
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const emptyStart = Array.from({ length: 4 }, (_, i) => i); // Thu is 4th day index if Sun is 0

  // 이달의 주요 일정 (날짜순 정렬)
  const upcomingEvents = [...MOCK_EVENTS].sort((a, b) => a.date - b.date);

  return (
    <div className="space-y-4 animate-fade-in h-full flex flex-col">
       <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-800">2025년 5월</h2>
            <div className="flex space-x-2">
               <button className="p-1 rounded-full hover:bg-gray-100 text-gray-500"><ChevronLeft className="w-5 h-5" /></button>
               <button className="p-1 rounded-full hover:bg-gray-100 text-gray-500"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex space-x-2">
             <button className="px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">월간</button>
             <button className="px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">주간</button>
             <button className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">일정 추가</button>
          </div>
       </div>

       <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
          {/* Calendar Grid */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4 overflow-hidden flex flex-col">
              <div className="grid grid-cols-7 mb-2 border-b border-gray-200 pb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                  <div key={day} className={`text-center text-sm font-semibold ${i === 0 ? 'text-red-500' : 'text-gray-500'}`}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-1 h-full overflow-y-auto">
                {emptyStart.map((_, i) => <div key={`empty-${i}`} className="bg-gray-50/50 rounded-lg"></div>)}
                {days.map((day) => {
                  const dayEvents = MOCK_EVENTS.filter(e => e.date === day);
                  return (
                    <div key={day} className="border border-gray-100 rounded-lg p-2 hover:bg-gray-50 transition-colors min-h-[80px] relative group flex flex-col">
                        <span className={`text-sm font-semibold ${day === 27 ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0' : 'text-gray-700 flex-shrink-0'}`}>{day}</span>
                        <div className="mt-1 space-y-1 overflow-y-auto custom-scrollbar flex-1">
                          {dayEvents.map(event => (
                            <div key={event.id} className={`text-[10px] px-1.5 py-1 rounded truncate font-medium
                              ${event.type === 'shoot' ? 'bg-red-100 text-red-700 border border-red-200' : 
                                event.type === 'deadline' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                event.type === 'holiday' ? 'bg-red-50 text-red-500' :
                                'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                              {event.title}
                            </div>
                          ))}
                        </div>
                        {day === 27 && (
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100"><Plus className="w-3 h-3" /></button>
                          </div>
                        )}
                    </div>
                  )
                })}
              </div>
          </div>

          {/* Side Panel: Major Events */}
          <div className="w-full lg:w-80 bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col overflow-hidden">
             <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                   <Star className="w-5 h-5 text-yellow-500 mr-2 fill-yellow-500" />
                   이달의 주요 일정
                </h3>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                {upcomingEvents.map(event => (
                   <div key={event.id} className="p-3 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors bg-gray-50 group">
                      <div className="flex justify-between items-start mb-1">
                         <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 
                               ${event.type === 'shoot' ? 'bg-red-500' : 
                                 event.type === 'deadline' ? 'bg-purple-500' :
                                 event.type === 'holiday' ? 'bg-red-400' :
                                 'bg-blue-500'}`}>
                            </div>
                            <span className="text-xs font-bold text-gray-500">5월 {event.date}일</span>
                         </div>
                         <span className={`text-[10px] px-1.5 py-0.5 rounded border 
                            ${event.type === 'shoot' ? 'text-red-600 border-red-100 bg-red-50' : 
                              event.type === 'deadline' ? 'text-purple-600 border-purple-100 bg-purple-50' :
                              event.type === 'holiday' ? 'text-red-500 border-red-100 bg-red-50' :
                              'text-blue-600 border-blue-100 bg-blue-50'}`}>
                            {event.type === 'shoot' ? '촬영' : 
                             event.type === 'deadline' ? '마감' : 
                             event.type === 'holiday' ? '휴일' : '미팅'}
                         </span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-800 mb-1">{event.title}</h4>
                      {event.description && (
                         <p className="text-xs text-gray-500 line-clamp-2">{event.description}</p>
                      )}
                   </div>
                ))}
             </div>
             
             <button className="w-full mt-4 py-2 text-sm text-indigo-600 font-medium border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex-shrink-0">
                일정 전체 다운로드
             </button>
          </div>
       </div>
    </div>
  )
}

const ClientView = () => {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4 animate-fade-in">
       <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="클라이언트 검색..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64" />
         </div>
         <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center">
            <Plus className="w-4 h-4 mr-2" /> 클라이언트 등록
         </button>
       </div>

       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header Row */}
          <div className="hidden md:flex bg-gray-50 border-b border-gray-200 px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
             <div className="flex-1">클라이언트 / 업종</div>
             <div className="w-40">담당자</div>
             <div className="w-32">상태</div>
             <div className="w-10"></div>
          </div>

          <div className="divide-y divide-gray-100">
            {MOCK_CLIENTS.map(client => (
               <div key={client.id} className="group">
                  {/* Summary */}
                  <div 
                    onClick={() => toggleExpand(client.id)}
                    className={`px-6 py-4 flex flex-col md:flex-row md:items-center cursor-pointer hover:bg-gray-50 transition-colors ${expandedId === client.id ? 'bg-gray-50' : ''}`}
                  >
                     <div className="flex-1 flex items-center">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-lg font-bold text-indigo-600 border border-indigo-100 mr-4">
                           {client.name.substring(0, 1)}
                        </div>
                        <div>
                           <h3 className="font-bold text-gray-900">{client.name}</h3>
                           <p className="text-xs text-gray-500">{client.industry}</p>
                        </div>
                     </div>

                     <div className="mt-2 md:mt-0 w-full md:w-40 text-sm text-gray-600 flex items-center">
                        <User className="w-3 h-3 mr-2 text-gray-400" /> {client.contact}
                     </div>

                     <div className="mt-2 md:mt-0 w-full md:w-32">
                        <StatusBadge status={client.status} />
                     </div>

                     <div className="hidden md:flex w-10 justify-end">
                        {expandedId === client.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                     </div>
                  </div>

                  {/* Expanded Detail */}
                  {expandedId === client.id && (
                     <div className="px-6 pb-6 pt-2 bg-gray-50 border-t border-gray-100 animate-fade-in">
                        <div className="ml-0 md:ml-14 grid grid-cols-1 md:grid-cols-3 gap-6">
                           
                           {/* Contact Info */}
                           <div className="space-y-2">
                              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">연락처 정보</h4>
                              <div className="flex items-center text-sm text-gray-700">
                                 <Phone className="w-4 h-4 mr-2 text-gray-400" /> {client.phone}
                              </div>
                              <div className="flex items-center text-sm text-gray-700">
                                 <Mail className="w-4 h-4 mr-2 text-gray-400" /> {client.email}
                              </div>
                              <div className="flex items-center text-sm text-gray-700">
                                 <MapPin className="w-4 h-4 mr-2 text-gray-400" /> {client.address}
                              </div>
                           </div>

                           {/* Stats */}
                           <div className="space-y-2">
                              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">거래 현황</h4>
                              <div className="flex justify-between text-sm">
                                 <span className="text-gray-500">진행 프로젝트</span>
                                 <span className="font-bold">{client.projects} 건</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                 <span className="text-gray-500">총 매출액</span>
                                 <span className="font-bold text-indigo-600">₩ {(client.totalSpent / 1000000).toLocaleString()}M</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                 <span className="text-gray-500">최근 미팅</span>
                                 <span>{client.lastMeeting}</span>
                              </div>
                           </div>

                           {/* Actions */}
                           <div className="flex flex-col justify-end items-start md:items-end gap-2">
                              <button className="w-full md:w-auto px-4 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors text-gray-700">정보 수정</button>
                              <button className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors shadow-sm">프로젝트 생성</button>
                           </div>

                        </div>
                     </div>
                  )}
               </div>
            ))}
          </div>
       </div>
    </div>
  )
}

const ManualView = () => {
   const [selectedManualId, setSelectedManualId] = useState(1);
   const [activeCategory, setActiveCategory] = useState('All');

   const categories = ['All', 'Onboarding', 'Tech', 'Production', 'Admin'];

   const filteredManuals = activeCategory === 'All' 
      ? MOCK_MANUALS 
      : MOCK_MANUALS.filter(m => m.category === activeCategory);

   const selectedManual = MOCK_MANUALS.find(m => m.id === selectedManualId) || MOCK_MANUALS[0];

   return (
      <div className="h-full flex flex-col md:flex-row gap-6 animate-fade-in overflow-hidden">
         {/* Sidebar: Navigation & List */}
         <div className="w-full md:w-72 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col shrink-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
               <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" placeholder="문서 검색..." className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
               </div>
               <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {categories.map(cat => (
                     <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                           activeCategory === cat 
                           ? 'bg-indigo-600 text-white' 
                           : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                     >
                        {cat === 'All' ? '전체' : 
                         cat === 'Onboarding' ? '온보딩' :
                         cat === 'Tech' ? '장비' :
                         cat === 'Production' ? '제작' : '행정'}
                     </button>
                  ))}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
               {filteredManuals.map(manual => (
                  <div 
                     key={manual.id}
                     onClick={() => setSelectedManualId(manual.id)}
                     className={`p-4 border-b border-gray-50 cursor-pointer transition-colors ${selectedManualId === manual.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
                  >
                     <h4 className={`text-sm font-semibold mb-1 ${selectedManualId === manual.id ? 'text-indigo-900' : 'text-gray-800'}`}>
                        {manual.title}
                     </h4>
                     <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{manual.category}</span>
                        <span>{manual.updated}</span>
                     </div>
                  </div>
               ))}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50">
               <button className="w-full flex items-center justify-center py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                  <Plus className="w-4 h-4 mr-2" /> 새 문서 작성
               </button>
            </div>
         </div>

         {/* Main Content: Document Viewer */}
         <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            {/* Doc Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-white">
               <div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 mb-3">
                     <FolderOpen className="w-3 h-3" />
                     <span>Wiki</span>
                     <ChevronRight className="w-3 h-3" />
                     <span>{selectedManual.category}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedManual.title}</h1>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                     <div className="flex items-center">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 mr-2">
                           {selectedManual.author.charAt(0)}
                        </div>
                        작성자: {selectedManual.author}
                     </div>
                     <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        최종 수정: {selectedManual.updated}
                     </div>
                  </div>
               </div>
               <div className="flex space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="공유">
                     <Share2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="인쇄">
                     <Printer className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="수정">
                     <Edit3 className="w-4 h-4" />
                  </button>
               </div>
            </div>

            {/* Doc Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-white">
               <div className="max-w-3xl mx-auto space-y-6">
                  {selectedManual.content.map((block, idx) => {
                     switch (block.type) {
                        case 'header':
                           return <h2 key={idx} className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mt-6 mb-3">{block.text}</h2>;
                        case 'text':
                           return <p key={idx} className="text-gray-600 leading-relaxed text-sm">{block.text}</p>;
                        case 'bullet':
                           return (
                              <div key={idx} className="flex items-start text-sm text-gray-600 pl-2">
                                 <span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-gray-400 rounded-full shrink-0"></span>
                                 <span>{block.text}</span>
                              </div>
                           );
                        case 'check':
                           return (
                              <div key={idx} className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-100">
                                 <div className="mt-0.5 mr-3 text-indigo-500">
                                    <CheckCircle2 className="w-4 h-4" />
                                 </div>
                                 <span className="text-sm text-gray-700 font-medium">{block.text}</span>
                              </div>
                           );
                        case 'alert':
                           return (
                              <div key={idx} className="flex items-start p-4 bg-red-50 rounded-lg border border-red-100 text-red-700 text-sm">
                                 <AlertCircle className="w-4 h-4 mr-3 mt-0.5 shrink-0" />
                                 {block.text}
                              </div>
                           );
                        case 'step':
                           return (
                              <div key={idx} className="flex items-center text-sm text-gray-600 pl-2">
                                 <span className="mr-3 font-bold text-indigo-200 text-lg">{idx}</span>
                                 <span className="font-medium text-gray-800">{block.text}</span>
                              </div>
                           );
                        default:
                           return <div key={idx}>{block.text}</div>;
                     }
                  })}
               </div>
               
               {/* Doc Footer */}
               <div className="max-w-3xl mx-auto mt-12 pt-6 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">관련 첨부파일</h4>
                  <div className="flex gap-3">
                     <button className="flex items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-100">
                        <FileText className="w-3 h-3 mr-2 text-gray-400" /> 가이드라인_v1.2.pdf
                     </button>
                     <button className="flex items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-100">
                        <Download className="w-3 h-3 mr-2 text-gray-400" /> 체크리스트_서식.xlsx
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}

const TaskView = () => {
   return (
      <div className="h-full flex flex-col space-y-4 animate-fade-in overflow-hidden">
         <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
            <h2 className="text-lg font-bold text-gray-800">업무 현황 (Kanban)</h2>
            <div className="flex space-x-2">
               <button className="flex items-center px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                  <Filter className="w-4 h-4 mr-2" /> 내 업무만 보기
               </button>
               <button className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <Plus className="w-4 h-4 inline mr-1" /> 새 업무
               </button>
            </div>
         </div>
         
         <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full space-x-4 min-w-[1000px] pb-4">
               {MOCK_KANBAN.map(column => (
                  <div key={column.id} className="flex-1 flex flex-col bg-slate-100 rounded-xl max-w-xs sm:max-w-sm shrink-0">
                     <div className="p-3 font-semibold text-gray-700 flex justify-between items-center border-b border-slate-200/50">
                        {column.title}
                        <span className="bg-slate-200 text-xs px-2 py-0.5 rounded-full text-slate-600">{column.items.length}</span>
                     </div>
                     <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                        {column.items.map(item => (
                           <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
                              <div className="flex justify-between items-start mb-2">
                                 <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border
                                    ${item.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' : 
                                      item.priority === 'Medium' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                                      'bg-green-50 text-green-600 border-green-100'}`}>
                                    {item.priority}
                                 </span>
                                 <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal className="w-4 h-4" /></button>
                              </div>
                              <h4 className="text-sm font-semibold text-gray-800 mb-3 leading-snug">{item.title}</h4>
                              
                              {/* Manual Link Indicator */}
                              {item.manualId && (
                                 <div className="mb-3">
                                    <button className="flex items-center text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors w-full">
                                       <BookOpen className="w-3 h-3 mr-1.5" />
                                       관련 가이드 확인하기
                                    </button>
                                 </div>
                              )}

                              <div className="flex justify-between items-center">
                                 <div className="flex items-center space-x-1.5">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700">
                                       {item.assignee.charAt(0)}
                                    </div>
                                    <span className="text-xs text-gray-500">{item.assignee}</span>
                                 </div>
                                 <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{item.tag}</span>
                              </div>
                           </div>
                        ))}
                        <button className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-slate-200/50 rounded-lg dashed border border-transparent hover:border-slate-300 transition-all flex items-center justify-center">
                           <Plus className="w-3 h-3 mr-1" /> 카드 추가
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
   )
}

// --- Main App Shell ---

export default function ReactStudioERP() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Mobile sidebar state and toggle logic removed as requested.

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'projects', label: '프로젝트 관리', icon: Clapperboard },
    { id: 'schedule', label: '일정/캘린더', icon: CalendarIcon },
    { id: 'equipment', label: '장비 관리', icon: Camera },
    { id: 'hr', label: '스태프/외주', icon: Users },
    { id: 'clients', label: '클라이언트', icon: Briefcase },
    { id: 'finance', label: '정산/회계', icon: Receipt },
    { id: 'tasks', label: '업무/할일', icon: CheckSquare },
    { id: 'manuals', label: '매뉴얼/가이드', icon: BookOpen }, // New Menu Item
  ];

  const ActiveComponent = useMemo(() => {
    switch (activeTab) {
      case 'dashboard': return DashboardView;
      case 'projects': return ProjectListView;
      case 'equipment': return EquipmentView;
      case 'finance': return FinanceView;
      case 'hr': return StaffView;
      case 'schedule': return ScheduleView;
      case 'clients': return ClientView;
      case 'tasks': return TaskView;
      case 'manuals': return ManualView; // New View
      default: return () => (
        <div className="flex flex-col items-center justify-center h-96 text-gray-400 animate-fade-in">
          <Settings className="w-16 h-16 mb-4 opacity-20" />
          <h3 className="text-xl font-bold text-gray-300">개발 중인 모듈입니다</h3>
          <p className="text-sm mt-2 text-gray-400">({activeTab} module placeholder)</p>
          <button className="mt-6 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">기능 요청하기</button>
        </div>
      );
    }
  }, [activeTab]);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      
      {/* Sidebar: Always visible, fixed width, no responsive hiding */}
      <aside 
        className="w-64 bg-slate-900 text-white flex flex-col shadow-xl flex-shrink-0 z-20"
      >
        <div className="p-6 flex items-center space-x-2 border-b border-slate-800 h-16">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="font-bold text-white">R</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">React Studio</h1>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0 mr-3" />
              <span className="text-sm font-medium whitespace-nowrap">
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8 shadow-sm z-10">
          <div className="flex items-center">
            {/* Menu toggle button removed */}
            <h2 className="text-xl font-bold text-gray-800 capitalize hidden sm:block">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center space-x-4 lg:space-x-6">
            <div className="relative hidden sm:block">
              <Search className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
            </div>
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </div>
            <div className="h-8 w-[1px] bg-gray-200 hidden sm:block"></div>
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-gray-900">오동현</p>
                <p className="text-xs text-gray-500">총괄 프로듀서</p>
              </div>
              <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center border border-indigo-200 text-indigo-700 font-bold shadow-sm">
                DH
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic View Area */}
        <main className="flex-1 overflow-auto bg-gray-50 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
             <ActiveComponent />
          </div>
        </main>
      </div>
    </div>
  );
}

